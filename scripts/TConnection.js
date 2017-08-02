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
			.easing(TWEEN.Easing.Cubic.InOut)
			.onStart(this.onTweenStart, this)
			.onUpdate(this.onTweenUpdate, this)
			.onComplete(this.onTweenComplete, this)
	},

	onTweenStart: function() {
		this.events.emit('connect_start', this)
	},

	onTweenUpdate: function() {
		if(!this.connected || !this.master) return

		var values = this.tween.source

		if('distance' in values) {
			this.connected.object.position
				.copy(this.normal)
				.setLength(values.distance)
		}

		if('screw' in values) {
			this.connected.object.rotateOnAxis(this.connected.normal, this.tween.delta.screw)
		}
	},

	onTweenComplete: function() {
		if(!this.playNextStage()) {
			this.events.emit('connect_end', this)
		}
	},

	playNextStage: function() {
		if(!this.connected || !this.master) return false

		this.stage++

		var depth = this.depth + this.connected.depth
		,   screw = this.screw || this.connected.screw ? Math.PI * 2 : 0
		,   distance = this.connected.node.boxLength / 2

		var more = true
		switch(this.stage) {
			case 0:
				this.tween
					.from({ distance: depth + distance })
					.to({ distance: depth })
					.delay(400)
					.duration(1200)

				this.onTweenUpdate()
			break

			case 1:
				if(!depth) {
					more = false
					break
				}

				this.tween
					.from({ distance: depth, screw: -screw })
					.to({ distance: 0, screw: 0 })
					.delay(200)
					.duration(1200)
			break

			default:
				more = false
			break
		}

		if(more) {
			setTimeout(f.binds(this.tween.start, this.tween), 0)
		}

		return more
	},

	playConnection: function() {
		this.stage = -1
		this.playNextStage()
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
		['FP', 'MP'],
		['female', 'male'],
		['uniform', 'uniform'],
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
		quat.setFromUnitVectors(this.normal, normal)


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
