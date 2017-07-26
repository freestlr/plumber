TNode = f.unit({
	unitName: 'TNode',

	init: function(sample) {
		this.object    = new THREE.Object3D

		this.box       = new THREE.Box3
		this.boxCenter = new THREE.Vector3
		this.boxSize   = new THREE.Vector3

		this.sphere = new THREE.Sphere

		this.connections = []

		if(sample) this.setSample(sample)
	},

	traverse: function(func, scope, data) {
		func.call(scope || this, this, data)

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			if(con.connected && con.master) con.target.traverse(func, scope, data)
		}
	},

	traverseConnections: function(func, scope, data) {
		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			func.call(scope || this, con, data)

			if(con.connected && con.master) con.target.traverseConnections(func, scope, data)
		}
	},

	setSample: function(sample) {
		if(this.sample) {
			return console.warn('TN.setSample: node already has sample')
		}

		var object = sample.clone()
		if(!object) {
			return console.warn('TN.setSample: got no sample object')
		}

		this.sample = sample
		this.sampleObject = object

		this.object.add(this.sampleObject)

		this.connections = []
		sample.joints.forEach(this.addConnection, this)
	},

	addConnection: function(joint) {
		this.connections.push(new TConnection(this, joint, this.connections.length))
	},

	remConnection: function() {

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

		if(conA.connected || conB.connected) {
			return console.warn('TN.connect to used joint')
		}

		conA.connect(conB)
	},

	disconnect: function(indexA) {

	},

	sizeUnion: function(node, extra) {
		if(node.sample) {
			extra.box.copy(node.sample.box)
			extra.box.applyMatrix4(node.object.matrixWorld)
			this.box.union(extra.box)

			extra.sphere.copy(node.sample.sphere)
			extra.sphere.center.applyMatrix4(node.object.matrixWorld)
			this.sphere.union(extra.sphere)

		} else {
			this.box.expandByPoint(node.object.position)
			this.sphere.expandByPoint(node.object.position)
		}
	},

	updateSize: function() {
		this.object.updateMatrixWorld()

		this.box.makeEmpty()
		this.sphere.radius = -1


		if(this.sample) {
			this.sphere.copy(this.sample.sphere)
		}
		this.traverse(this.sizeUnion, this, {
			box: new THREE.Box3,
			sphere: new THREE.Sphere
		})

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
