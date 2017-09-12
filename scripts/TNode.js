TNode = f.unit({
	unitName: 'TNode',

	init: function(sample) {
		this.object    = new THREE.Object3D
		this.events    = new EventEmitter

		this.box       = new THREE.Box3
		this.boxCenter = new THREE.Vector3
		this.boxSize   = new THREE.Vector3
		this.boxLength = 1


		this.localBox    = new THREE.Box3
		this.localCenter = new THREE.Vector3
		this.localSize   = new THREE.Vector3
		this.localLength = 1
		this.localSphere = new THREE.Sphere

		this.objectCenter = new THREE.Object3D

		this.connections = []

		this.object.add(this.objectCenter)

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

	traverseConnections: function(func, scope, data, level) {
		if(level == null) level = 0

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			func.call(scope || this, con, data, level)

			if(con.connected && con.master) con.target.traverseConnections(func, scope, data, level +1)
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

		this.sample.box.getCenter(this.objectCenter.position)

		this.object.add(this.sampleObject)

		this.connections = []
		sample.joints.forEach(this.addConnection, this)
	},

	setObjectParent: function(object) {
		object.node = this
	},


	addConnection: function(joint) {
		var con = new TConnection(this, joint, this.connections.length)

		con.events.link(this.events)

		this.connections.push(con)
	},

	remConnection: function() {

	},


	getConnectedList: function() {
		var joints = []
		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]
			if(con.connected) joints.push(con.connected)
		}

		return joints
	},

	canReplace: function(node) {
		var used = []
		for(var i = 0; i < node.connections.length; i++) {
			var con = node.connections[i]
			if(!con.connected) continue

			used.push(con.joint.id)
		}

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			var index = used.indexOf(con.joint.id)
			if(index !== -1) used.splice(index, 1)
		}

		return used.length === 0
	},

	replace: function(nodeB) {
		var nodeA = this

		var cons = nodeB.getConnectedList()
		for(var i = 0; i < cons.length; i++) {

			var conC = cons[i]
			,   nodeC = conC.node
			,   masterC = conC.master

			conC.disconnect()

			for(var j = 0; j < nodeA.connections.length; j++) {
				var conA = nodeA.connections[j]

				if(!conA.connected && conC.canConnect(conA)) {
					if(masterC) nodeC.connect(conC.index, nodeA, conA.index)
					else        nodeA.connect(conA.index, nodeC, conC.index)

					break
				}
			}
		}
	},

	replaceA: function(nodeB) {
		var cons = this.getConnectedList()
		for(var i = 0; i < cons.length; i++) {

			var conA = cons[i]
			var nodeA = conA.node
			var masterA = conA.master

			conA.disconnect()

			for(var j = 0; j < nodeB.connections.length; j++) {
				var conB = nodeB.connections[j]

				if(!conB.connected && conA.canConnect(conB)) {
					if(masterA) nodeA.connect(conA.index, nodeB, conB.index)
					else        nodeB.connect(conB.index, nodeA, conA.index)
				}
			}
		}
	},

	canBeReplacedBy: function(sample) {
		var used = []
		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]
			if(!con.connected) continue

			used.push(con.joint.id)
		}

		var connected = []
		for(var i = 0; i < node.connections.length; i++) {
			if(node.connections[i].connected) connected.push(i)
		}

		for(var i = 0; i < sample.joints.length; i++) {
			var joint = sample.joints[i]

			var index = used.indexOf(joint.id)
			if(index !== -1) used.splice(index, 1)
		}

		return used.length === 0
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

		return {
			removeNode: this,
			removeCount: rcount - maxCount,
			maxRoot: maxRoot
		}
	},

	pinchr: function() {
		var tcount = 0
		this.traverse(function() { tcount++ })

		return {
			removeNode: this,
			removeCount: tcount,
			maxRoot: null
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

		node.events.link(this.events)

		node.upcon = conB
		node.upnode = this
		conA.connect(conB)
	},

	disconnect: function() {
		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			if(con.connected) con.disconnect()
		}

		if(this.upnode) {
			this.events.unlink(this.upnode.events)
		}
	},

	destroy: function() {
		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			con.destroy()
		}
	},

	sizeUnion: function(node) {
		if(node.sample) {
			node.updateBox()
			this.box.union(node.localBox)

		} else {
			// this.box.expandByPoint(node.object.position)
		}
	},

	updateBox: function() {
		this.localBox.copy(this.sample.box).applyMatrix4(this.object.matrixWorld)
		this.localBox.getSize(this.localSize)
		this.localCenter.copy(this.sample.boxCenter).applyMatrix4(this.object.matrixWorld)
		this.localLength = this.localSize.length()
	},

	updateSize: function() {
		this.object.updateMatrixWorld()


		this.box.makeEmpty()
		this.traverse(this.sizeUnion, this)


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
