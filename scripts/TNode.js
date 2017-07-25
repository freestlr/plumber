TNode = f.unit({
	unitName: 'TNode',

	init: function(sample) {
		this.object    = new THREE.Object3D

		this.box       = new THREE.Box3
		this.boxCenter = new THREE.Vector3
		this.boxSize   = new THREE.Vector3

		this.connections = []

		if(sample) this.setSample(sample)
	},

	traverse: function(func, scope, data) {
		func.call(scope || this, this, data)

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			if(con.master && con.node) con.node.traverse(func, scope, data)
		}
	},

	traverseConnections: function(func, scope, data) {
		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			func.call(scope || this, this, con, i, data)

			if(con.master && con.node) con.node.traverseConnections(func, scope, data)
		}
	},

	setSample: function(sample) {
		if(this.sample) {
			return console.warn('TN.setSample: node already has sample')
		}

		this.sample = sample
		this.sampleObject = sample.clone()

		this.object.add(this.sampleObject)

		this.connections = []
		sample.joints.forEach(this.addConnection, this)

		// this.boxNeedsUpdate = true
		// this.updateBox()
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
		slave.rotateY(Math.PI)

		// con.helper = this.makeConnectionHelper(joint.name)
		// joint.object.add(con.helper)

		// var joinSlaveMatrix = new THREE.Matrix4
		// joinSlaveMatrix.makeRotationY(Math.PI)
		// slave.applyMatrix(joinSlaveMatrix)


		console.log(master.rotation, slave.rotation)

		this.object.add(master)
		this.connections.push(con)
	},

	makeConnectionHelper: function(id) {
		var s = 256
		var ctx = main.imagery.makeCanvas(s, s)
		ctx.fillStyle = f.rcolor()
		ctx.fillRect(0, 0, s, s)
		ctx.fillStyle = 'white'
		ctx.strokeStyle = 'black'
		ctx.textAlign = 'center'
		ctx.font = '18px monospace'
		ctx.strokeText(id, s/2, s/2)
		ctx.fillText(id, s/2, s/2)

		var t = new THREE.Texture(ctx.canvas)
		t.wrapS = THREE.RepeatWrapping
		t.wrapT = THREE.RepeatWrapping
		t.needsUpdate = true

		var object = new THREE.Object3D

		var line = new THREE.Line(
			new THREE.Geometry,
			new THREE.LineBasicMaterial({ color: 'black' }))

		var mesh = new THREE.Mesh(
			new THREE.CubeGeometry(10, 10, 10),
			new THREE.MeshBasicMaterial({ map: t }))

		line.geometry.vertices.push(
			new THREE.Vector3(0, 0, 0),
			new THREE.Vector3(0, 50, 0))

		mesh.position.set(0, 50, 0)

		object.add(line)
		object.add(mesh)
		return object
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
		conA.joinMaster.add(conB.joinSlave)
		conB.joinSlave.add(node.object)

		conA.node = node
		conB.node = this

		conA.master = true
		conB.master = false

		// this.boxNeedsUpdate = true
		// node.boxNeedsUpdate = true
		// node.updateBox()
		// this.updateBox()
	},

	disconnect: function(indexA) {

	},

	// boxUnion: function(box) {
	// 	box.union(this.sample.box)

	// 	for(var i = 0; i < this.connections.length; i++) {
	// 		var con = this.connections[i]

	// 		if(con.master && con.node) con.node.boxUnion(box)
	// 	}
	// },

	boxUnion: function(node, box) {
		node.updateBox()
		box.union(node.sample.box)
	},

	updateBox: function() {
		// if(!this.boxNeedsUpdate) return
		// this.boxNeedsUpdate = false

		this.object.updateMatrixWorld()

		this.box.makeEmpty()

		var box = new THREE.Box3
		this.traverse(function(node) {
			box.copy(node.sample.box)
			box.applyMatrix4(node.object.matrixWorld)
			this.box.union(box)

		}, this)

		// this.box.makeEmpty()
		// this.boxUnion(this.box)
		// this.traverse(this.boxUnion, this, this.box)

		// this.object.updateMatrixWorld()
		// this.box.copy(this.sample.box)
		// this.box.applyMatrix4(this.object.matrixWorld)

		// console.log('box:',
		// 	this.box.min.toArray().map(f.hround),
		// 	this.box.max.toArray().map(f.hround))

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
