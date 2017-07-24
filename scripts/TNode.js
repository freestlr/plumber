TNode = f.unit({
	unitName: 'TNode',

	init: function(sample) {
		this.box       = new THREE.Box3
		this.boxCenter = new THREE.Vector3
		this.boxSize   = new THREE.Vector3

		this.connections = []

		if(sample) this.setSample(sample)
	},

	setSample: function(sample) {
		this.sample = sample
		this.object = sample.clone()

		this.connections = []
		sample.joints.forEach(this.addConnection, this)

		this.updateBox()
	},

	addConnection: function(joint) {
		var master = new THREE.Object3D
		,   slave = new THREE.Object3D 
		var con = {
			node: null,
			master: null,
			joint: joint,
			joinMaster: master,
			joinSlave: slave
		}

		joint.matrix.decompose(slave.position, slave.rotation, slave.scale)
		joint.matrix.decompose(master.position, master.rotation, master.scale)

		var joinSlaveMatrix = new THREE.Matrix4
		joinSlaveMatrix.makeRotationY(Math.PI)
		slave.applyMatrix(joinSlaveMatrix)

		this.connections.push(con)
	},

	connect: function(indexA, node, indexB) {
		if(!node) {
			return console.warn('TN.connect to undefined node')
		}

		var conA = this.connections[indexA]
		,   conB = node.connections[indexB]

		if(!conA || !conB) {
			return console.warn('TN.connect with undefined joint')
		}

		if(conA.node || conB.node) {
			return console.warn('TN.connect to used joint')
		}

		this.object.add(conA.joinMaster)
		conA.joinMaster.add(joinB.joinSlave)
		conB.joinSlave.add(node.object)

		conA.node = node
		conB.node = this

		conA.master = true
		conB.master = false

		this.updateBox()
	},

	disconnect: function(indexA) {

	},

	boxUnion: function(box) {
		box.union(this.sample.box)

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			if(con.node) con.node.boxUnion(box)
		}
	},

	updateBox: function() {
		this.box.makeEmpty()
		this.boxUnion(this.box)

		if(this.box.isEmpty()) {
			this.boxCenter.set(0, 0, 0)
			this.boxSize.set(1, 1, 1).normalize()
			this.boxLength = 1

		} else {
			this.box.getCenter(this.boxCenter)
			this.box.getSize(this.boxSize)
			this.boxLength = this.boxSize.length()
		}
	}
})
