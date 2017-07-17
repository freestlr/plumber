ANode.Contour = f.unit(ANode, {
	unitName: 'ANode_Contour',
	name: 'contour',
	T3: Draw3D.Contour,

	create: function() {
		this.obvPoints = this.mountLoop(new Observable().set(this, this.readPoints, this.writePoints))
		this.obvWalls  = this.mountLoop()

		this.obvHoles = new Observable([]).set(this, this.readHoles, this.writeHoles)

		this.obvVertices = new Observable().set(this, this.readVertices)
		this.obvTriangles = new Observable().set(this, this.readTriangles, null, Geo.equalJSON)
		this.obvHeight = new Observable().set(this, this.readHeight, null, Geo.equalReals)
		this.obvBottom = new Observable().set(this, this.readBottom, null, Geo.equalReals)
		this.obvPlinth = new Observable().set(this, this.readPlinth, null, Geo.equalReals)
		this.obvArea   = new Observable().set(this, this.readArea, null, Geo.equalReals)
		this.obvBox    = new Observable().set(this, this.readBox, null, Geo.equalBox3)
		this.obvCenter = new Observable().set(this, this.readCenter, null, Geo.equalVectors)


		this.helpers.center = new Helper2D.Contour(this)
	},

	writeJSON: function(json) {
		var points = []
		if(json.points) for(var i = 0; i < json.points.length; i++) {
			points.push(new ANode.Point(json.points[i]))
		}
		this.obvPoints.write(points)


		var holes = []
		if(json.holes) for(var i = 0; i < json.holes.length; i++) {
			holes.push(new ANode.Hole(json.holes[i]))
		}
		this.obvHoles.write(holes)
	},

	readJSON: function() {
		var json  = {}
		,   points = this.obvPoints.read()
		,   holes = this.obvHoles.read()

		if(points.length) json.points = points.map(this.readItemJSON)
		if(holes.length) json.holes = holes

		return json
	},

	copyOnMerge: function(contour) {

	},

	makeWall: function() {
		return new ANode.Wall
	},

	readPoints: function(points) {
		var vertices = []
		for(var i = 0; i < points.length; i++) {
			vertices.push(points[i].obvVertex.read())
		}

		if(Geo.areaOf(vertices) < 0) {
			return points.slice().reverse()
		} else {
			return points
		}
	},

	writePoints: function(next, prev) {
		var diff = f.adiff(next, prev)
		if(!diff.remc && !diff.addc) return

		var walls = this.obvWalls.read().slice()
		for(var i = 0; i < diff.remc; i++) {
			var node = diff.rem[i]
			,   index = diff.remi[i]

			var prevIndex = (index || walls.length) - 1
			,   prevWall  = walls[prevIndex]
			,   prevWidth = prevWall.obvWidth.read()
			,   prevHoles = prevWall.obvHoles.read()

			var nextIndex = index
			,   nextWall  = walls[nextIndex]
			,   nextWidth = nextWall.obvWidth.read()
			,   nextHoles = nextWall.obvHoles.read()

			var prevRatio = prevWidth / (prevWidth + nextWidth)
			,   nextRatio = 1 - prevRatio

			for(var j = 0; j < prevHoles.length; j++) {
				var hole = prevHoles[j]

				hole.obvPos.write(hole.obvPos.read() * prevRatio)
			}

			for(var j = 0; j < nextHoles.length; j++) {
				var hole = nextHoles[j]

				hole.obvPos.write(hole.obvPos.read() * nextRatio + prevRatio)
			}

			var holes = prevHoles.concat(nextHoles)
			if(prevWidth < nextWidth) {
				walls.splice(prevIndex, 1)
				prevWall.obvHoles.write([])
				nextWall.obvHoles.write(holes)

			} else {
				walls.splice(nextIndex, 1)
				nextWall.obvHoles.write([])
				prevWall.obvHoles.write(holes)
			}
		}

		for(var i = 0; i < diff.addc; i++) {
			var node  = diff.add[i]
			,   index = diff.addi[i]

			var prevWallIndex = (index || walls.length) -1
			,   prevWall = this.makeWall()
			,   nextWall = walls[prevWallIndex]
			walls.splice(prevWallIndex, 0, prevWall)

			if(!nextWall) continue

			var holes = nextWall.obvHoles.read()
			if(!holes.length) continue

			var vertex = node.obvVertex.read()

			var prevIndex  = (index || next.length) -1
			,   prevPoint  = next[prevIndex]
			,   prevVertex = prevPoint.obvVertex.read()
			,   prevWidth  = prevVertex.distanceTo(vertex)

			var nextIndex  = (index +1) % next.length
			,   nextPoint  = next[nextIndex]
			,   nextVertex = nextPoint.obvVertex.read()
			,   nextWidth  = nextVertex.distanceTo(vertex)

			var sumWidth  = prevWidth + nextWidth
			,   splitPos  = prevWidth / sumWidth
			,   prevRatio = sumWidth / prevWidth
			,   nextRatio = sumWidth / nextWidth

			var prevHoles = []
			,   nextHoles = []
			for(var i = 0; i < holes.length; i++) {
				var hole = holes[i]
				,   pos = hole.obvPos.read()

				if(pos > splitPos) {
					hole.obvPos.write((pos - splitPos) * nextRatio)
					nextHoles.push(hole)

				} else {
					hole.obvPos.write(pos * prevRatio)
					prevHoles.push(hole)
				}
			}

			nextWall.obvHoles.write(nextHoles)
			prevWall.obvHoles.write(prevHoles)
		}

		this.obvWalls.write(walls)
	},



	writeHoles: function(holes) {
		var walls = this.obvWalls.read()
		,   wall_holes = []

		for(var i = 0; i < walls.length; i++) {
			wall_holes.push([])
		}

		for(var i = 0; i < holes.length; i++) {
			var node = holes[i]
			,   index = node.obvWall.read()
			,   list = wall_holes[index]

			if(list) {
				list.push(node)

			} else {
				console.warn('AN hole with invalid wall index:', index)
			}
		}

		for(var i = 0; i < walls.length; i++) {
			var wall = walls[i]

			wall.obvHoles.write(wall_holes[i])
		}
	},

	readHoles: function() {
		var walls = this.obvWalls.read()
		,   holes = []

		for(var i = 0; i < walls.length; i++) {
			var wall_holes = walls[i].obvHoles.read()

			for(var j = 0; j < wall_holes.length; j++) {
				holes.push(wall_holes[j].readJSON())
			}
		}

		return holes
	},



	readHeight: function() {
		var floor = this.obvParent.read()
		if(!floor) return 1

		return floor.obvHeight.read()
	},

	readBottom: function() {
		var floor = this.obvParent.read()
		if(!floor) return 0

		return floor.obvBottom.read()
	},

	readPlinth: function() {
		var floor = this.obvParent.read()
		if(!floor) return 0

		return floor.obvPlinth.read()
	},

	readVertices: function() {
		var points = this.obvPoints.read()

		var vertices = []
		for(var i = 0; i < points.length; i++) {
			vertices.push(points[i].obvVertex.read())
		}

		return vertices
	},

	readBox: function() {
		var vertices = this.obvVertices.read()
		,   box = new THREE.Box3()
		return box.setFromPoints(vertices)
	},

	readArea: function() {
		var vertices = this.obvVertices.read()
		return Geo.areaOf(vertices)
	},

	readTriangles: function() {
		var vertices = this.obvVertices.read()
		return Geo.triangulate(vertices)
	},

	readCenter: function() {
		var vertices  = this.obvVertices.read()
		,   triangles = this.obvTriangles.read()
		,   center = new THREE.Vector3

		var mass = 0
		for(var i = 0; i < triangles.length; i++) {
			var t = triangles[i]
			,   a = vertices[t[0]]
			,   b = vertices[t[1]]
			,   c = vertices[t[2]]
			,   s = -Geo.areaOf(t, vertices)

			center.x += s * (a.x + b.x + c.x) / 3
			center.y += s * (a.y + b.y + c.y) / 3
			center.z += s * (a.z + b.z + c.z) / 3

			mass += s
		}

		if(Math.abs(mass) > Geo.EPS) {
			center.multiplyScalar(1 / mass)
		}

		return center
	}
})
