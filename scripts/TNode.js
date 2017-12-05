TNode = f.unit({
	unitName: 'TNode',

	init: function(sample) {
		this.id        = ++TNode.count
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
		else console.warn('new TNode with no sample')
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
		this.type = sample.src
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

	canBeReplacedBy: function(sample) {
		if(!sample || this.sample === sample) return false

		var connected = []
		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]

			if(con.connected) connected.push(con.connected.joint)
		}

		if(!connected.length) return true


		var available = sample.joints.slice()

		loop_connected:
		for(var i = 0; i < connected.length; i++) {
			var jointA = connected[i]

			for(var j = available.length -1; j >= 0; j--) {
				var jointB = available[j]

				if(jointA.canConnect(jointB)) {
					available.splice(j, 1)
					continue loop_connected
				}
			}

			return false
		}

		return true
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


	pinch: function() {
		var rootNodes = []
		,   thisNodes = []

		var root = f.follow(this, 'upnode').pop()

		root.traverse(function(n) { rootNodes.push(n.id) })
		this.traverse(function(n) { thisNodes.push(n.id) })

		var maxList = f.snot(rootNodes, thisNodes)
		,   maxRoot = root
		,   removeRoot = this

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]
			if(!con.connected || !con.master) continue

			var node = con.connected.node
			var nodes = []
			node.traverse(function(n) { nodes.push(n.id) })

			if(nodes.length > maxList.length) {
				removeRoot = root
				maxList = nodes
				maxRoot = node
			}
		}

		return {
			root: removeRoot,
			nodes: f.snot(rootNodes, maxList),
			nextRoot: maxRoot
		}
	},

	pinchr: function() {
		var nodes = []
		this.traverse(function(n) { nodes.push(n.id) })

		return {
			root: this,
			nodes: nodes,
			nextRoot: null
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

	rotate: function(angle) {
		if(this.upcon) {
			this.upcon.rotate(angle)

		} else {
			this.object.rotateOnAxis(this.object.up, angle)
		}
	},

	getRotation: function() {
		// TODO
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

TNode.count = 0
TNode.TRSTOP = {}
