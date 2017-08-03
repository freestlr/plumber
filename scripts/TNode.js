TNode = f.unit({
	unitName: 'TNode',

	init: function(sample) {
		this.object    = new THREE.Object3D

		this.box       = new THREE.Box3
		this.boxCenter = new THREE.Vector3
		this.boxSize   = new THREE.Vector3
		this.boxLength = 1

		this.sphere = new THREE.Sphere

		this.localBox = new THREE.Box3
		this.localSphere = new THREE.Sphere

		this.connections = []

		if(sample) this.setSample(sample)
	},

	traverse: function(func, scope, data) {
		var sig = func.call(scope || this, this, data)
		if(sig === TNode.TRSTOP) return sig

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]
			if(!con.connected || !con.master) continue

			var sig = con.target.traverse(func, scope, data)
			if(sig === TNode.TRSTOP) return sig
		}
	},

	traverseConnections: function(func, scope, data) {
		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			func.call(scope || this, con, data)

			if(con.connected && con.master) con.target.traverseConnections(func, scope, data)
		}
	},

	includeConnection: function(con, extra) {
		if(!extra || !extra.list) return

		for(var name in extra.test) {
			var test = extra.test[name]
			,   val = con[name]

			if(extra.binary ? !val !== !test : val !== test) return
		}

		extra.list.push(con)
	},

	retrieveConnections: function(test, binary) {
		var cons = []
		this.traverseConnections(this.includeConnection, this, {
			test: test,
			binary: binary,
			list: cons
		})
		return cons
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
		this.sample.traverse(this.sampleObject, this.setObjectParent, this)

		this.object.add(this.sampleObject)

		this.connections = []
		sample.joints.forEach(this.addConnection, this)
	},

	setObjectParent: function(object) {
		object.node = this
	},

	addConnection: function(joint) {
		this.connections.push(new TConnection(this, joint, this.connections.length))
	},

	remConnection: function() {

	},

	pinch: function() {
		var list   = []
		,   roots  = []
		,   counts = []
		,   maxCount = 0
		,   maxIndex = -1
		,   maxNode  = null
		,   maxRoot  = null

		var root = f.follow(this, 'upnode').pop()
		,   tcount = 0
		,   rcount = 0

		root.traverse(function() { rcount++ })
		this.traverse(function() { tcount++ })

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]
			if(!con.connected) continue

			var node = con.connected.node
			,   count = 0

			var nroot = node
			while(nroot.upnode && nroot.upnode !== this) {
				nroot = nroot.upnode
			}


			nroot.traverse(function() { count++ })
			if(nroot === root) count -= tcount

			if(count > maxCount) {
				maxCount = count
				maxIndex = list.length
				maxNode  = node
				maxRoot  = nroot
			}

			list.push(node)
			roots.push(nroot)
			counts.push(count)
		}

		// if(maxIndex !== -1) {
		// 	if(root !== nroot) {

		// 	}
		// }

		// console.log(rcount - maxCount, maxRoot)
		return {
			removeNode: this,
			removeCount: rcount - maxCount,
			maxRoot: maxRoot
		}
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

		node.upcon = conB
		node.upnode = this
		conA.connect(conB)
	},

	disconnect: function() {
		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			if(con.connected) con.disconnect()
		}
	},

	sizeUnion: function(node) {
		if(node.sample) {
			node.localBox.copy(node.sample.box)
			node.localBox.applyMatrix4(node.object.matrixWorld)
			this.box.union(node.localBox)

			node.localSphere.copy(node.sample.sphere)
			node.localSphere.center.applyMatrix4(node.object.matrixWorld)
			this.sphere.union(node.localSphere)

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
		this.traverse(this.sizeUnion, this)

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

TNode.TRSTOP = {}
