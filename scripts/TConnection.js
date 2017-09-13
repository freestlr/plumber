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
		// this.point  = new THREE.Vector3
		// this.normal = new THREE.Vector3
		// this.up     = new THREE.Vector3
		// this.matrix = new THREE.Matrix4
		this.object = new THREE.Object3D

		this.joint = joint.clone()

		this.depth = parseFloat(this.joint.depth) || 0
		this.screw = this.joint.extra === 'screw'

		this.makeTween()

		this.marker = new UI.Marker({
			connection: this
		})

		this.objectInner = new THREE.Object3D
		this.objectOuter = new THREE.Object3D

		this.node.object.add(this.objectInner)
		this.node.object.add(this.objectOuter)

		this.updatePosition()
	},

	updatePosition: function() {
		this.objectInner.position.copy(this.joint.point)
		this.objectOuter.position.copy(this.joint.normal).setLength(this.depth).add(this.joint.point)
	},

	makeTween: function() {
		this.tween = new TWEEN.Tween({ connected: 0 })
			.to({ connected: 1 }, 1000)
			.easing(TWEEN.Easing.Linear.None)
			.onStart(this.onTweenStart, this)
			.onUpdate(this.onTweenUpdate, this)
			.onComplete(this.onTweenComplete, this)
	},

	onTweenStart: function() {

	},

	onTweenUpdate: function(t, values) {
		this.transitionProgress(values.connected)
	},

	onTweenComplete: function() {
		this.animating = false
		this.events.emit('connect_end', this)
	},



	transitionStageDuration: {
		approachDelay: 100,
		approachTime: 1200,
		screwDelay: 100,
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


		var d0 = this.depth
		,   d1 = this.connected.depth

		var depth = d0 && d1 ? Math.min(d0, d1) : d0 + d1
		var depth = d0 + d1
		,   screw = this.screw || this.connected.screw ? Math.PI * 2 : 0
		,   distance = (this.node.sample.boxLength + this.connected.node.sample.boxLength) /4


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
			.copy(this.joint.normal)
			.setLength(par_distance)

		this.object.quaternion.setFromAxisAngle(this.joint.normal, par_screw)
	},

	playConnection: function(state, timeScale) {
		if(!this.connected || !this.master) return

		this.animating = true
		this.events.emit('connect_start', this)

		var duration = this.getTransitionStages().reduce(f.sum)
		if(!isNaN(timeScale)) {
			duration *= timeScale
		}

		if(state == null) {
			this.tween.target.connected = 1

		} else {
			this.tween.source.connected = +!state
			this.tween.target.connected = + state
		}

		this.tween.duration(duration).start()
	},



	getPosition: function(target) {
		if(!target) target = new THREE.Vector3

		target.setFromMatrixPosition(this.objectOuter.matrixWorld)
		return target
	},

	getInnerPosition: function(target) {
		if(!target) target = new THREE.Vector3

		target.setFromMatrixPosition(this.objectInner.matrixWorld)
		return target
	},


	canConnect: function(con) {
		return this.joint.canConnect(con.joint)
	},

	canConnectList: function(list) {
		return list.filter(this.canConnect, this)
	},

	/**             |--- d ----|
	 *
	 * node --- master --||-- slave  -
	 *                      \    \    \ d
	 *                       r -  \    \
	 *                           node  -
	 *
	 */
	connect: function(node) {
		var normal = new THREE.Vector3

		var master = this
		,   slave = node




		normal.copy(slave.joint.normal).negate()




		master.node.object.add(master.object)

		master.object.position.copy(master.joint.point)
		master.object.add(slave.object)

		slave.object.position.set(0, 0, 0)
		slave.object.quaternion.setFromUnitVectors(normal, master.joint.normal)
		slave.object.rotateOnAxis(normal, -master.joint.up.angleTo(slave.joint.up))
		slave.object.add(slave.node.object)

		slave.node.object.position.copy(slave.joint.point).negate()




		master.connected = slave
		master.target = slave.node
		master.master = true

		// master.master = master
		// master.slave = slave

		// slave.master = master
		// slave.slave = slave

		slave.connected = master
		slave.target = master.node
		slave.master = false

		master.events.emit('connect', [master, slave])
		slave.events.emit('connect', [slave, master])
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

	rotate: function(angle) {
		if(!this.connected) return

		if(this.master) {
			this.connected.rotate(angle)

		} else {
			this.object.rotateOnAxis(this.joint.normal, angle)
		}
	},

	getRotation: function() {
		// TODO
	},

	destroy: function() {
		this.marker.destroy()
	},



	attachControl: function(control) {
		if(!control) return

		this.control = control
		this.controlObject = new THREE.Object3D

		this.joint.matrix.decompose(
			this.controlObject.position,
			this.controlObject.rotation,
			this.controlObject.scale)


		this.node.object.add(this.controlObject)

		control.attach(this.controlObject)
	},

	updateControl: function() {
		if(!this.controlObject) return

		this.joint.setFromMatrix(this.controlObject.matrix)
		this.updatePosition()


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
