TConnection = f.unit({
	unitName: 'TConnection',

	init: function(node, joint, index) {
		this.node   = node
		this.index  = index
		this.target = null
		this.master = null
		this.connected = null

		this.events = new EventEmitter
		this.point  = new THREE.Vector3
		this.normal = new THREE.Vector3
		this.matrix = new THREE.Matrix4
		this.object = new THREE.Object3D

		this.data = joint

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

	onTweenUpdate: function(t) {
		if(!this.connected || !this.master) return

		var values = this.tween.source

		this.connected.object.position
			.copy(this.normal)
			.setLength(values.distance * (1 - t))
	},

	onTweenComplete: function() {
		this.events.emit('connect_end', this)
	},

	playConnection: function() {
		this.tween
			.from({ distance: 100 })
			.to({ distance: 0 })
			.delay(300)
			.duration(1000)
			.start()

		this.onTweenUpdate(0)
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
			if(this.master) {
				target.setFromMatrixPosition(this.object.matrixWorld)

			} else {
				target.setFromMatrixPosition(this.node.object.matrixWorld)
			}

		} else {
			// target.setFromMatrixPosition(this.object.matrixWorld)
			target.setFromMatrixPosition(this.node.object.matrixWorld).add(this.point)
		}

		return target
	},

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
