TConnection = f.unit({
	unitName: 'TConnection',

	init: function(node, joint, index) {
		this.node   = node
		this.index  = index
		this.target = null
		this.master = null
		this.connected = null

		this.point  = new THREE.Vector3
		this.normal = new THREE.Vector3
		this.matrix = new THREE.Matrix4
		this.object = new THREE.Object3D

		this.data = joint

		this.setPosition(joint.object.matrix)
	},

	setPosition: function(matrix) {
		this.matrix.copy(matrix)
		this.point.setFromMatrixPosition(matrix)
		this.normal.set(1, 0, 0).applyMatrix4(matrix).sub(this.point)
	},

	getPosition: function(target) {
		if(!target) target = new THREE.Vector3

		if(this.connected) {
			if(this.master) {
				target.setFromMatrixPosition(this.object.matrixWorld)

			} else {
				target.setFromMatrixPosition(this.object.matrixWorld)
			}

		} else target.copy(this.point)

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

		slave.object.quaternion.copy(quat)
		slave.object.add(slave.node.object)

		slave.node.object.position.copy(slave.point).negate()



		this.connected = slave
		this.target = slave.node
		this.master = true

		slave.connected = this
		slave.target = this.node
		slave.master = false
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
