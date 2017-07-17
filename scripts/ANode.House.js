ANode.House = f.unit(ANode, {
	unitName: 'ANode_House',
	name: 'house',

	root: true,
	removable: false,

	create: function() {
		this.up = new THREE.Vector3(0, 1, 0)


		this.obvFloors = this.mountList()
		this.obvCutter = this.mountProp()

		this.obvPlinth = new Observable(0).set(this, null, null, Geo.equalReals)


		this.obvSubnodePool    = new Observable([])
		this.obvWallsList      = new Observable([]).set(this, this.readWallsList)
		this.obvWallsHash      = new Observable({}).set(this, this.readWallsHash)

		this.obvMassCenter     = new Observable().set(this, this.readMassCenter, null, Geo.equalVectors)
		this.obvBoundingBox    = new Observable().set(this, this.readBoundingBox, null, Geo.equalBox3)
		this.obvBoundingSize   = new Observable().set(this, this.readBoundingSize, null, Geo.equalVectors)
		this.obvBoundingCenter = new Observable().set(this, this.readBoundingCenter, null, Geo.equalVectors)
		this.obvBoundingValid  = new Observable().set(this, this.readBoundingValid)

		this.obvDraw3 = new Observable().set(this, this.readDraw3)
	},

	writeJSON: function(json) {
		this.version = json.version || main.configVersion

		this.obvPlinth.write(+json.plinth || 0)

		var floors = []
		if(json.floors) for(var i = 0; i < json.floors.length; i++) {
			floors.push(new ANode.Floor(json.floors[i]))
		}
		if(!floors.length) {
			floors.push(new ANode.Floor({}))
		}

		this.obvFloors.write(floors)
		// this.obvCutter.write(new ANode.Cutter(json.cutter || {}))

		var cutter = new ANode.Cutter
		this.obvCutter.write(cutter)
		cutter.obvJSON.write(json.cutter || {})
	},

	readJSON: function() {
		var json = {
			version: this.version
		}

		var plinth = this.obvPlinth.read()
		if(plinth) {
			json.plinth = this.round(plinth)
		}
		var floors = this.obvFloors.read()
		if(floors.length) {
			json.floors = floors.map(this.readItemJSON)
		}

		var cutter = this.obvCutter.read()
		if(cutter) {
			json.cutter = cutter.obvJSON.read()
		}

		return json
	},

	readDraw3: function() {
		this.rebuildNode(this)
		return NaN
	},

	rebuildNode: function(node) {
		node.obvBuild.read()

		var children = node.obvChildren.read()
		for(var i = 0; i < children.length; i++) {
			this.rebuildNode(children[i])
		}
	},

	readWallsList: function() {
		var next = []

		var floors = this.obvFloors.read()
		for(var i = 0; i < floors.length; i++) {
			var floor = floors[i]
			,   boxes = floor.obvBoxes.read()
			,   roofs = floor.obvRoofs.read()

			var blen = boxes.length
			,   alen = roofs.length + blen
			for(var j = 0; j < alen; j++) {
				var contour = boxes[j] || roofs[j - blen]
				,   walls = contour.obvWalls.read()

				for(var k = 0; k < walls.length; k++) {
					next.push(walls[k])
				}
			}
		}

		return next
	},

	readWallsHash: function(prev) {
		var next = {}
		,   hash = {}

		var walls = this.obvWallsList.read()
		for(var i = 0; i < walls.length; i++) {
			var wall = walls[i]
			,   plid = wall.obvPlid.read()

			if(!hash[plid]) {
				hash[plid] = []
			}

			hash[plid].push(wall)
		}

		for(var plid in hash) {
			var nextWalls = hash[plid]

			var obvWalls = prev[plid]
			if(obvWalls) {
				var prevWalls = obvWalls.read()

				if(f.snot(nextWalls, prevWalls).length) {
					obvWalls.write(nextWalls)
				}

			} else {
				obvWalls = new Observable(nextWalls)
			}

			next[plid] = obvWalls
		}

		return next
	},

	addNode: function(node) {
		this.events.emit('add_node', node)

		var children = node.obvChildren.read()
		children.forEach(this.addNode, this)
	},

	remNode: function(node) {
		this.events.emit('rem_node', node)

		var children = node.obvChildren.read()
		children.forEach(this.remNode, this)
	},

	remSubnodeFromPool: function(subnode) {
		var pool = this.obvSubnodePool.read()
		,   index = pool.indexOf(subnode)

		if(index !== -1) {
			var next = pool.slice()
			next.splice(index, 1)
			this.obvSubnodePool.write(next)

			this.events.emit('rem_subnode', subnode)
		}
	},

	addSubnodeIntoPool: function(subnode) {
		var pool  = this.obvSubnodePool.read()
		,   index = pool.indexOf(subnode)

		if(index === -1) {
			this.obvSubnodePool.write(pool.concat(subnode))
			this.events.emit('add_subnode', subnode)

		} else {
			console.warn('addSubnodeIntoPool() trying to double-add subnode')
		}
	},

	readSTL: function() {
		var vc = new THREE.Vector3

		var stl = ['solid alta_house']

		this.object.updateMatrixWorld(true)

		var pool = this.obvSubnodePool.read()
		for(var i = 0; i < pool.length; i++) {
			var s = pool[i]

			for(var j = 0; j < s.meshes.length; j++) {
				var m = s.meshes[j]
				,   g = m.geometry

				for(var k = 0; k < g.faces.length; k++) {
					var f = g.faces[k]

					vc.copy(f.normal).applyMatrix4(m.matrixWorld)

					stl.push('facet normal '+ vc.toArray().join(' '))
					stl.push('  outer loop')

					vc.copy(g.vertices[f.a]).applyMatrix4(m.matrixWorld)
					stl.push('    vertex '+ vc.toArray().join(' '))

					vc.copy(g.vertices[f.b]).applyMatrix4(m.matrixWorld)
					stl.push('    vertex '+ vc.toArray().join(' '))

					vc.copy(g.vertices[f.c]).applyMatrix4(m.matrixWorld)
					stl.push('    vertex '+ vc.toArray().join(' '))

					stl.push('  endloop')
					stl.push('endfacet')
				}
			}
		}

		stl.push('endsolid alta_house')

		return stl.join('\n')
	},

	getCutpage: function(plid) {
		var cutter = this.obvCutter.read()
		if(cutter) return cutter.getPage(plid)
	},

	getWalls: function(plid) {
		if(isNaN(plid)) {
			return this.obvWallsList.read()
		}

		var hash = this.obvWallsHash.read()
		,   obvWalls = hash[plid]

		return obvWalls ? obvWalls.read() : []
	},

	addFloor: function(roof, autofill, index) {
		var contours = []
		,   floors = this.obvFloors.read().slice()
		,   length = floors.length

		if(isNaN(index)) index = length -1
		var sourceFloor = floors[index]

		if(autofill) {
			var boxes = sourceFloor.obvBoxes.read()
			for(var i = 0; i < boxes.length; i++) {
				var contour = boxes[i]
				,   points = contour.obvPoints.read()

				contours.push({
					points: points.map(this.readItemJSON)
				})
			}
		}

		var floor = new ANode.Floor({
			roof: roof,
			boxes: !roof ? contours : [],
			roofs:  roof ? contours : []
		})

		floors.splice(index +1, 0, floor)
		this.obvFloors.write(floors)

		return floor
	},

	readBoundingBox: function() {
		var box = new THREE.Box3

		var floors = this.obvFloors.read()
		for(var i = 0; i < floors.length; i++) {
			var floor = floors[i]
			,   boxes = floor.obvBoxes.read()
			,   roofs = floor.obvRoofs.read()

			var blen = boxes.length
			,   alen = roofs.length + blen

			for(var j = 0; j < alen; j++) {
				var contour = boxes[j] || roofs[j - blen]
				,   cbox = contour.obvBox.read()

				box.min.min(cbox.min)
				box.max.max(cbox.max)
			}
		}

		if(floor) {
			box.max.y = floor.obvBottom.read() + floor.obvHeight.read()
		}

		return box
	},

	readBoundingValid: function() {
		var box = this.obvBoundingBox.read()

		return Geo.pointFinite(box.min)
			&& Geo.pointFinite(box.max)
	},

	readBoundingSize: function() {
		var size = new THREE.Vector3
		if(this.obvBoundingValid.read()) {
			this.obvBoundingBox.read().getSize(size)
		}
		return size
	},

	readBoundingCenter: function() {
		var center = new THREE.Vector3
		if(this.obvBoundingValid.read()) {
			this.obvBoundingBox.read().getCenter(center)
		}
		return center
	},

	readMassCenter: function() {
		var center = new THREE.Vector3

		var mass = 0
		var floors = this.obvFloors.read()
		for(var i = 0; i < floors.length; i++) {
			var floor = floors[i]
			,   boxes = floor.obvBoxes.read()
			,   roofs = floor.obvRoofs.read()

			var blen = boxes.length
			,   alen = roofs.length + blen

			for(var j = 0; j < alen; j++) {
				var contour = boxes[j] || roofs[j - blen]
				,   point   = contour.obvCenter.read()
				,   bottom  = contour.obvBottom.read()
				,   area    = contour.obvArea.read()

				center.x += area * point.x
				center.y += area * bottom
				center.z += area * point.z

				mass += area
			}
		}

		if(Math.abs(mass) > Geo.EPS) {
			center.multiplyScalar(1 / mass)
		}

		return center
	}
})
