TNode = f.unit({
	unitName: 'TNode',

	init: function(sample) {
		this.object = new THREE.Object3D
		this.events = new EventEmitter
		this.local  = new TDimensions

		this.meshes = []
		this.connections = []

		this.setId(++TNode.count)


		// this.debugBox = new THREE.Mesh(
		// 	new THREE.BoxGeometry(1, 1, 1),
		// 	new THREE.MeshBasicMaterial({ color: 0xFF00FF, transparent: true, opacity: 0.2 }))
		// this.debugBox.visible = false
		// this.object.add(this.debugBox)

		if(sample) this.setSample(sample)
		else console.warn('new TNode with no sample')
	},

	setId: function(id) {
		this.id = id
		this.object.name = 'TN'+ this.id
	},

	traverse: function(func, scope, data) {
		var sig = func.call(scope || this, this, data)
		if(sig === TNode.TRSTOP) return sig

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]
			if(!con || !con.connected || !con.master) continue

			var sig = con.target.traverse(func, scope, data)
			if(sig === TNode.TRSTOP) return sig
		}
	},

	traverseConnections: function(func, scope, data, level) {
		if(level == null) level = 0

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]
			if(!con) continue

			func.call(scope || this, con, data, level)

			if(con.connected && con.master) con.target.traverseConnections(func, scope, data, level +1)
		}
	},

	testConnection: function(con, extra) {
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
		this.traverseConnections(this.testConnection, this, {
			test: test,
			binary: binary,
			list: cons
		})
		return cons
	},

	setSample: function(sample) {
		for(var i = this.meshes.length -1; i >= 0; i--) {
			var mesh = this.meshes[i]

			mesh.parentNode = null
			this.object.remove(mesh)
			this.meshes.splice(i, 1)
		}
		for(var i = this.connections.length -1; i >= 0; i--) {
			var con = this.connections[i]

			this.connections.splice(i, 1)
		}



		this.sample = sample

		if(!this.sample) {
			this.type = null
			return
		}

		this.type = sample.src

		for(var i = 0; i < sample.meshes.length; i++) {
			var original = sample.meshes[i]

			var mesh = original.clone()
			original.matrixWorld.decompose(mesh.position, mesh.rotation, mesh.scale)
			mesh.updateMatrix()
			mesh.parentNode = this

			this.object.add(mesh)
			this.meshes.push(mesh)
		}

		for(var i = 0; i < sample.joints.length; i++) {
			var joint = sample.joints[i]

			var con = new TConnection(this, joint, this.connections.length)
			con.events.link(this.events)

			this.connections.push(con)
		}
	},

	getRoot: function() {
		var node = this
		while(node.upnode) node = node.upnode
		return node
	},

	goRoot: function(origin) {
		if(!this.upcon) return

		if(origin) {
			this.object.matrixWorld.identity()
		}

		this.object.matrixWorld.decompose(
			this.object.position,
			this.object.quaternion,
			this.object.scale)
		this.object.updateMatrix()

		var next = this.upcon
		,   prev = null
		while(next) {
			prev = next
			next = next.target.upcon
			prev.goMaster()
		}

		this.upcon = null
		this.upnode = null
	},

	getCenter: function(target) {
		if(target) target.copy(this.sample.dim.center).applyMatrix4(this.object.matrixWorld)
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

		var root = this.getRoot()

		root.traverse(function(n) { rootNodes.push(n) })
		this.traverse(function(n) { thisNodes.push(n) })

		var removeRoot = this
		,   removeCon = this.upcon
		,   maxList = f.snot(rootNodes, thisNodes)
		,   maxRoot = root

		for(var i = 0; i < this.connections.length; i++) {
			var con = this.connections[i]
			if(!con.connected || !con.master) continue

			var node = con.connected.node
			var nodes = []
			node.traverse(function(n) { nodes.push(n) })

			if(nodes.length > maxList.length) {
				removeRoot = root
				removeCon = con.connected
				maxList = nodes
				maxRoot = node
			}
		}

		return {
			nodes: f.snot(rootNodes, maxList),
			removeCon: removeCon,
			nextRoot: maxRoot
		}
	},

	pinchr: function() {
		var nodes = []
		this.traverse(function(n) { nodes.push(n) })

		return {
			nodes: nodes,
			removeCon: null,
			nextRoot: null
		}
	},


	connect: function(indexA, node, indexB) {
		if(!node) {
			return console.warn('TN.connect to undefined node')
		}

		if(node === this) {
			return console.error('TN.connect to itself')
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

	rotate: function(angle, animate) {
		if(this.upcon) {
			this.upcon.rotate(angle, animate)

		} else {
			// nope
			// this.object.rotateOnAxis(this.object.up, angle)
			// this.object.updateMatrixWorld()
		}
	},

	setConnectedState: function(state) {
		this.traverseConnections(function(con) {
			if(con.connected && con.master) {
				con.transitionProgress(state == null ? con.connTween.source.connected : state)
			}
		}, this)
	},

	getDimensions: function(global) {
		if(!global) global = new Dimensions

		global.box.makeEmpty()
		global.center.set(0, 0, 0)
		global.mass = 0

		this.object.updateMatrixWorld(true)

		this.traverse(function(node) {
			node.updateBox()

			var dim = node.local
			var mass = 1 // dim.mass

			global.box.union(dim.box)
			global.center.x += mass * dim.center.x
			global.center.y += mass * dim.center.y
			global.center.z += mass * dim.center.z
			global.mass += mass
		})

		if(Math.abs(global.mass) > 1e-6) {
			global.center.multiplyScalar(1 / global.mass)
		} else {
			global.center.set(0, 0, 0)
		}

		global.box.getCenter(global.size)
		global.center.add(global.size).multiplyScalar(0.5)
		global.box.getSize(global.size)
		global.length = global.size.length()
		global.box.getBoundingSphere(global.sphere)
	},

	updateBox: function(dim) {
		if(!dim) dim = this.local

		if(this.sample) {
			dim.box.copy(this.sample.dim.box).applyMatrix4(this.object.matrixWorld)
			dim.center.copy(this.sample.dim.center).applyMatrix4(this.object.matrixWorld)

		} else {
			dim.box.makeEmpty()
			dim.center.set(0, 0, 0)
		}

		dim.box.getSize(dim.size)
		dim.length = dim.size.length()
		dim.mass = dim.size.x * dim.size.y * dim.size.z
	}
})

TNode.count = 0
TNode.TRSTOP = {}
