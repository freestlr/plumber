TConnection = f.unit({
	unitName: 'TConnection',

	init: function(node, joint, index) {
		this.node   = node
		this.index  = index
		this.target = null
		this.master = null
		this.connected = null

		this.selected = false
		this.inactive = new Gate(Gate.AND, false)

		this.events = new EventEmitter
		this.point  = new THREE.Vector3
		this.normal = new THREE.Vector3
		this.matrix = new THREE.Matrix4
		this.object = new THREE.Object3D

		this.data = joint

		this.depth = parseFloat(this.data.depth) || 0
		this.screw = this.data.extra === 'screw'

		this.makeTween()

		// this.node.object.add(this.object)
		this.setPosition(joint.object.matrix)
	},

	makeTween: function() {
		this.tween = new TWEEN.Tween()
			.easing(TWEEN.Easing.Linear.None)
			.onStart(this.onTweenStart, this)
			.onUpdate(this.onTweenUpdate, this)
			.onComplete(this.onTweenComplete, this)
	},

	onTweenStart: function() {

	},

	onTweenUpdate: function(t) {
		this.transitionProgress(t)
	},

	onTweenComplete: function() {
		this.animating = false
		this.events.emit('connect_end', this)
	},



	transitionStageDuration: {
		approachDelay: 400,
		approachTime: 1200,
		screwDelay: 200,
		screwTime: 1200
	},

	getTransitionStages: function() {
		if(!this.connected || !this.master) return [0]

		var depth = this.depth + this.connected.depth
		var dur = this.transitionStageDuration

		if(depth > 0) {
			return [dur.approachDelay, dur.approachTime, dur.screwDelay, dur.screwTime]

		} else {
			return [dur.approachDelay, dur.approachTime]
		}
	},

	transitionProgress: function(progress) {
		if(!this.connected || !this.master) return

		var stages = this.getTransitionStages()
		,   stageIndex = -1
		,   stageProgress = 0

		var timeTotal = stages.reduce(f.sum)
		,   timeNow = Math.max(0, Math.min(1, progress)) * timeTotal

		if(!timeTotal) return

		var easing = TWEEN.Easing.Cubic.InOut
		for(var i = 0; i < stages.length; i++) {
			var stageTime = stages[i]

			if(timeNow <= stageTime) {
				stageIndex = i
				stageProgress = easing(timeNow / stageTime)
				break
			}

			timeNow -= stageTime
		}



		var depth = this.depth + this.connected.depth
		,   screw = this.screw || this.connected.screw ? Math.PI * 2 : 0
		,   distance = this.connected.node.sample.length / 2


		var par_distance = 0
		,   par_screw = 0
		switch(stageIndex) {
			case -1: return

			case 0:
				par_distance = depth + distance
				par_screw = screw
			break

			case 1:
				par_distance = depth + distance * (1 - stageProgress)
				par_screw = screw
			break

			case 2:
				par_distance = depth
				par_screw = screw
			break

			case 3:
				par_distance = depth * (1 - stageProgress)
				par_screw = screw * (1 - stageProgress)
			break
		}


		this.connected.object.position
			.copy(this.normal)
			.setLength(par_distance)

		this.object.quaternion.setFromAxisAngle(this.normal, par_screw)
	},

	playConnection: function() {
		if(!this.connected || !this.master) return

		this.animating = true
		this.events.emit('connect_start', this)

		var duration = this.getTransitionStages().reduce(f.sum)
		this.tween.duration(duration).start()
	},


	setPosition: function(matrix) {
		this.matrix.copy(matrix)
		this.point.setFromMatrixPosition(matrix)
		this.normal.set(1, 0, 0).applyMatrix4(matrix).sub(this.point)

		if(!this.connected) {
			// this.object.position.copy(this.point)
		}
	},

	getPosition: function(target) {
		if(!target) target = new THREE.Vector3

		if(this.connected) {
			target.setFromMatrixPosition(this.object.matrixWorld)

		} else {
			target.copy(this.normal).setLength(this.depth).add(this.point)
				.applyMatrix4(this.node.object.matrixWorld)
		}

		return target
	},

	getInnerPosition: function(target) {
		if(!target) target = new THREE.Vector3

		target.copy(this.point).applyMatrix4(this.node.object.matrixWorld)
		return target
	},


	paramPairsAllow: [
		['f', 'm'],
		['u', 'u'],
		['u', 'f'],
		['u', 'm'],
		['FP', 'MP'],
		['female', 'male'],
		['uniform', 'uniform'],
		['uniform', 'female'],
		['uniform', 'male'],
		['in', 'out'],
		['inner', 'outer'],
		['internal', 'external']
	],

	paramPairsEqual: function(pair) {
		return f.seq(pair, this)
	},

	canConnect: function(con) {
		if(this.data.id !== con.data.id) return false

		return this.paramPairsAllow.some(this.paramPairsEqual, [this.data.param, con.data.param])
	},

	canConnectList: function(list) {
		return list.filter(this.canConnect, this)
	},

	/**
	 *
	 * node --- master --||-- slave
	 *                           \
	 *                            \
	 *                           node
	 *
	 */
	connect: function(slave) {
		var normal = new THREE.Vector3
		,   quat   = new THREE.Quaternion

		normal.copy(slave.normal).negate()
		quat.setFromUnitVectors(normal, this.normal)


		this.node.object.add(this.object)
		this.object.position.copy(this.point)
		this.object.add(slave.object)

		slave.object.position.set(0, 0, 0)
		slave.object.quaternion.copy(quat)
		slave.object.add(slave.node.object)

		slave.node.object.position.copy(slave.point).negate()



		this.connected = slave
		this.target = slave.node
		this.master = true

		slave.connected = this
		slave.target = this.node
		slave.master = false

		this.events.emit('connect', [this, slave])
		slave.events.emit('connect', [slave, this])
	},

	disconnect: function() {
		if(!this.connected) return

		var master = this.master ? this : this.connected
		,   slave = this.master ? this.connected : this

		master.object.remove(slave.object)

		master.connected = null
		master.target = null
		master.master = null

		slave.connected = null
		slave.target = null
		slave.master = null

		master.events.emit('disconnect', [master, slave])
		slave.events.emit('disconnect', [slave, master])
	},



	attachControl: function(control) {
		if(!control) return

		this.control = control
		this.controlObject = new THREE.Object3D

		this.matrix.decompose(
			this.controlObject.position,
			this.controlObject.rotation,
			this.controlObject.scale)

		this.node.object.add(this.controlObject)

		control.attach(this.controlObject)
	},

	updateControl: function() {
		if(!this.controlObject) return

		this.setPosition(this.controlObject.matrix)


		var con = this.connected
		if(con) {
			if(this.master) this.connect(con)
			else con.connect(this)
		}
	},

	detachControl: function() {
		if(!this.control) return

		this.control.detach()
		this.node.object.remove(this.controlObject)

		delete this.controlObject
		delete this.control
	}
})
