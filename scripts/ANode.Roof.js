ANode.Roof = f.unit(ANode.Contour, {
	unitName: 'ANode_Roof',
	name: 'roof',
	label: 'node_label_roof',
	targetMaterial: 'roof',
	T3: Draw3D.Roof,

	minAngle: 10,
	maxAngle: 80,
	defAngle: 30,
	defLedge: 0.2,

	create: function() {
		ANode.Contour.prototype.create.call(this)

		this.obvDrain = this.mountProp()

		this.obvAngle = new Observable().set(this, this.readAngle, this.writeAngle, Geo.equalReals)
		this.obvLedge = new Observable().set(this, null, null, Geo.equalReals)
		this.obvPlank = new Observable().set(this, null, null, Geo.equalReals)
		this.obvBreak = new Observable().set(this, null, null, Geo.equalReals)

		this.obvAngleMin = new Observable().set(this, this.readAngleMin, null, Geo.equalReals)
		this.obvAngleMax = new Observable().set(this, this.readAngleMax, null, Geo.equalReals)

		this.obvSoffit = new Observable().set(this, this.readSoffit)
		this.obvHeight = new Observable().set(this, this.readHeight, null, Geo.equalReals)
		this.obvGround = new Observable().set(this, this.readGround, null, Geo.equalReals)

		this.obvAngleList = new Observable().set(this, this.readAngleList, this.writeAngleList, Geo.equalJSON)
		this.obvGableList = new Observable().set(this, this.readGableList, this.writeGableList, Geo.equalJSON)
		this.obvLedgeList = new Observable().set(this, this.readLedgeList, this.writeLedgeList, Geo.equalJSON)

		this.obvBreakOrHeight = new Observable().set(this, this.readBreakOrHeight, this.writeBreakOrHeight, Geo.equalReals)


		this.obvInnerSlices = new Observable().set(this, this.readInnerSlices)
		this.obvOuterSlices = new Observable().set(this, this.readOuterSlices)
		this.obvLedgePoints = new Observable().set(this, this.readLedgePoints)
		this.obvBreaks = new Observable().set(this, this.readBreaks)


		this.options.angle = {
			type: 'number',
			label: 'option_label_roof_angle',
			value: this.obvAngle,
			min: this.obvAngleMin,
			max: this.obvAngleMax
		}
		this.options.ledge = {
			type: 'number',
			label: 'option_label_roof_ledge',
			value: this.obvLedge,
			min: 0,
			max: 1,
			step: 0.05
		}
		this.options.plank = {
			type: 'number',
			label: 'option_label_roof_plank',
			value: this.obvPlank,
			min: 0.01,
			max: 1,
			step: 0.05
		}
		this.options.soffit = {
			type: 'boolean',
			label: 'option_label_roof_soffit',
			value: this.obvSoffit
		}
		this.options.height = {
			type: 'number',
			label: 'option_label_roof_height',
			value: this.obvBreakOrHeight,
			min: 0,
			step: 0.1
		}
		this.options.ground = {
			type: 'number',
			label: 'option_label_roof_ground',
			hidden: true,
			value: this.obvGround
		}
	},

	readBreakOrHeight: function() {
		return this.obvBreak.read() || this.obvHeight.read()
	},

	writeBreakOrHeight: function(brk) {
		this.obvBreak.write(brk)

		var height = this.obvHeight.read()
		if(height < brk) this.obvBreak.write(null)
	},

	readBottom: function() {
		var ground = this.obvGround.read()
		,   floor  = this.obvParent.read()
		if(!floor) return ground

		return floor.obvBottom.read() + ground
	},

	readHeight: function() {
		var height = 0

		var walls = this.obvWalls.read()
		for(var i = 0; i < walls.length; i++) {
			var slopeHeight = walls[i].obvSlopeHeight.read()

			if(height < slopeHeight) height = slopeHeight
		}

		return height
	},

	writeJSON: function(json) {
		this.obvLedge.write(json.ledge || 0.2)
		this.obvPlank.write(json.plank || 0.1)
		this.obvBreak.write(json.height || 0)

		this.obvSoffit.write(json.soffit === 0 ? false : true)
		this.obvGround.write(json.ground || 0)

		ANode.Contour.prototype.writeJSON.call(this, json)

		this.obvAngleList.write(json.angles || [])
		this.obvGableList.write(json.gables || [])
		this.obvLedgeList.write(json.ledges || [])

		this.obvDrain.write(json.drain ? new ANode.Drain(json.drain) : null)
	},

	readJSON: function() {
		var json  = {}
		,   points = this.obvPoints.read()
		,   holes  = this.obvHoles.read()
		,   drain  = this.obvDrain.read()
		,   ledge  = this.obvLedge.read()
		,   plank  = this.obvPlank.read()
		,   height = this.obvBreak.read()
		,   soffit = this.obvSoffit.read()
		,   ground = this.obvGround.read()
		,   angleList = this.obvAngleList.read()
		,   gableList = this.obvGableList.read()
		,   ledgeList = this.obvLedgeList.read()

		if(!soffit) {
			json.soffit = 0
		}
		if(isFinite(height)) {
			json.height = this.round(height)
		}
		if(ground) {
			json.ground = this.round(ground)
		}
		if(ledge) {
			json.ledge = ledge
		}
		if(plank) {
			json.plank = plank
		}

		if(angleList.filter(Boolean).length) {
			json.angles = angleList.map(this.round)
		}
		if(gableList.filter(Boolean).length) {
			json.gables = gableList
		}
		if(ledgeList.filter(Boolean).length) {
			json.ledges = ledgeList
		}


		if(points.length) json.points = points.map(this.readItemJSON)
		if(holes.length) json.holes = holes
		if(drain) json.drain = drain.readJSON()

		return json
	},

	readAngleList: function() {
		var walls = this.obvWalls.read()

		var angleList = []
		for(var i = 0; i < walls.length; i++) {
			var wall = walls[i]

			angleList.push(wall.obvGable.read() ? 0 : wall.obvAngle.read())
		}
		return angleList
	},

	writeAngleList: function(angleList) {
		var walls = this.obvWalls.read()
		for(var i = 0; i < walls.length; i++) {
			walls[i].obvAngle.write(angleList[i] || this.defAngle)
		}
	},

	readGableList: function() {
		var walls = this.obvWalls.read()

		var gableList = []
		for(var i = 0; i < walls.length; i++) {
			gableList.push(walls[i].obvGable.read())
		}
		return gableList
	},

	writeGableList: function(gableList) {
		var walls = this.obvWalls.read()
		for(var i = 0; i < walls.length; i++) {
			walls[i].obvGable.write(gableList[i] || 0)
		}
	},

	readLedgeList: function() {
		var walls = this.obvWalls.read()

		var ledgeList = []
		for(var i = 0; i < walls.length; i++) {
			var wall = walls[i]

			ledgeList.push(wall.obvGable.read() && wall.obvLedge.read() || 0)
		}
		return ledgeList
	},

	writeLedgeList: function(ledgeList) {
		var walls = this.obvWalls.read()
		for(var i = 0; i < walls.length; i++) {
			walls[i].obvLedge.write(ledgeList[i] || this.defLedge)
		}
	},

	readAngle: function(prev) {
		var angleList = this.obvAngleList.read()
		,   angleHash = {}
		for(var i = 0; i < angleList.length; i++) {
			var a = angleList[i]
			if(!a) continue

			if(angleHash[a]) angleHash[a]++
			else angleHash[a] = 1
		}

		var mostItems = 0
		,   mostAngle
		for(var angle in angleHash) {
			if(mostItems > angleHash[angle]) continue

			mostItems = angleHash[angle]
			mostAngle = angle
		}

		return +mostAngle
	},

	writeAngle: function(next, prev) {
		var walls = this.obvWalls.read()
		,   delta = next - prev

		for(var i = 0; i < walls.length; i++) {
			var wall = walls[i]

			if(!wall.obvGable.read()) {
				wall.obvAngle.write(wall.obvAngle.read() + delta)
			}
		}
	},

	readAngleMin: function() {
		var angleList = this.obvAngleList.read()
		,   angle = this.obvAngle.read()

		var min = Infinity
		for(var i = 0; i < angleList.length; i++) {
			var a = angleList[i]

			if(a && min > a) min = a
		}

		return this.minAngle + (angle - min)
	},

	readAngleMax: function() {
		var angleList = this.obvAngleList.read()
		,   angle = this.obvAngle.read()

		var max = -Infinity
		for(var i = 0; i < angleList.length; i++) {
			var a = angleList[i]

			if(a && max < a) max = a
		}

		return this.maxAngle - (max - angle)
	},

	copyOnMerge: function(roof) {
		this.obvLedge.write(roof.obvLedge.read())
		this.obvPlank.write(roof.obvPlank.read())
		this.obvBreak.write(roof.obvBreak.read())

		this.obvSoffit.write(roof.obvSoffit.read())
		this.obvGround.write(roof.obvGround.read())

		this.obvAngleList.write(roof.obvAngleList.read())
		this.obvGableList.write(roof.obvGableList.read())

		this.obvDrain.write(roof.drain ? new ANode.Drain(roof.drain.readJSON()) : null)
	},

	readInnerSlices: function() {
		var slices = []

		var walls  = this.obvWalls.read()
		,   points = this.obvVertices.read()
		,   limit  = this.obvBreak.read()

		var planes = []
		for(var i = 0; i < walls.length; i++) {
			planes.push(walls[i].obvInnerPlane.read())
		}

		var bottomSlice = this.addSlice(walls, planes, points)
		if(!bottomSlice) return slices

		slices.push(bottomSlice)
		this.sliceRoof(bottomSlice, slices, 0, limit)

		return slices
	},

	readOuterSlices: function() {
		var slices = []

		var walls  = this.obvWalls.read()
		,   points = this.obvVertices.read()
		,   limit  = this.obvBreak.read()

		var planes = []
		for(var i = 0; i < walls.length; i++) {
			planes.push(walls[i].obvOuterPlane.read())
		}

		var bottomSlice = this.addSlice(walls, planes, points)
		if(!bottomSlice) return slices


		var ledge = this.obvLedge.read()

		bottomSlice.points = []
		for(var i = 0; i < bottomSlice.size; i++) {
			bottomSlice.points.push(bottomSlice.rays[i].atY(-ledge))
		}

		slices.push(bottomSlice)

		this.sliceRoof(bottomSlice, slices, 0, limit)


		return slices
	},

	readBreaks: function() {
		var slices = this.obvInnerSlices.read()
		,   breaks = []
		for(var i = 0; i < slices.length; i++) {
			var slice = slices[i]

			if(slice.last) breaks.push(slice)
		}
		return breaks
	},

	readLedgePoints: function() {
		var slice = this.obvOuterSlices.read() [0]
		return slice ? slice.points : []
	},



	makeWall: function() {
		return new ANode.Slope
	},

	addSlice: function(walls, planes, points, parent) {
		if(Geo.areaOf(points) < Geo.EPS) return

		if(points.length !== walls.length) {
			console.error('addSlice got different walls and points')
		}

		var slice = {
			parent : parent,
			size   : walls.length,
			walls  : walls,
			points : points,
			planes : planes,

			slices   : [],
			sections : [],
			rays     : [],

			top    : Infinity,
			bottom : 0
		}

		for(var i = 0; i < slice.size; i++) {
			var j = (i || slice.size) -1

			var a = planes[j]
			,   b = planes[i]

			var r = a.intersectPlane(b)

			if(!r) {
				r = new THREE.Ray
				r.direction.copy(walls[j].obvClimb.read())
				a.projectPoint(points[i], r.origin)
			}
			if(r.direction.y < 0) {
				r.direction.negate()
			}
			if(r.direction.y < Geo.EPS) {
				r.direction.copy(this.obvRoot.read().up)
			}

			slice.rays.push(r)
		}

		if(parent) {
			slice.bottom = parent.top
			parent.slices.push(slice)
		}

		return slice
	},

	sliceRoof: function(slice, slices, level, limit) {
		var size = slice.size

		var minBreak
		var minPoints = []
		var minPointPlanes = []
		var pointPlanes = []

		var cp0 = new THREE.Vector3
		var cp1 = new THREE.Vector3

		for(var i = 0; i < size; i++) {
			var j = (i || size) -1

			var r = slice.rays[i]

			for(var k = 0; k < size; k++) if(k !== i && k !== j) {
				var c = slice.planes[k]

				var point = r.intersectPlane(c, null, true)
				if(!point || point.y <= slice.bottom) continue

				var cr0 = slice.rays[k]
				var cr1 = slice.rays[(k + 1) % size]

				cr0.atY(point.y, cp0)
				cr1.atY(point.y, cp1)

				if(!Geo.pointInRect(point, cp0, cp1)) continue

				var planes = [i, j, k]

				if(Math.abs(slice.top - point.y) < Geo.EPS) {
					var length = minPoints.length
					var index = Geo.pushPoint(minPoints, point, true)

					if(index === length) {
						minPointPlanes.push(planes)
					} else {
						minPointPlanes[index] = f.sor(minPointPlanes[index], planes)
					}

				} else if(point.y < slice.top) {
					slice.top = point.y
					minPoints = [point]
					minPointPlanes = [planes]
				}
			}

			pointPlanes.push([i, j])
		}

		if(slice.top === Infinity) return

		if(limit && slice.top > limit) {
			slice.top = limit
			minPointPlanes = []
			minBreak = true
		}

		for(var i = 0; i < pointPlanes.length; i++) {
			var a = pointPlanes[i]

			for(var j = 0; j < minPointPlanes.length; j++) {
				var b = minPointPlanes[j]

				if(f.sand(a, b).length >= 2) pointPlanes[i] = f.sor(a, b)
			}
		}

		var points = slice.rays.map(f.func('atY', slice.top))
		,   pmap   = Geo.makePointMap(points)

		for(var i = 0; i < size; i++) {
			var j = (i + 1) % size

			var w = slice.walls[i]
			,   a = slice.points[i]
			,   b = slice.points[j]
			,   c = points[pmap[i]]
			,   d = points[pmap[j]]

			if(!a || !b || !c || !d) throw Error('invalid section')

			var section = {
				lowLeft   : a,
				lowRight  : b,
				highLeft  : c,
				highRight : d,
				wall      : w,
				sections  : [],
				level     : level,
				slice     : slice
			}

			section.order = -w.getPlanePos(section.lowLeft)

			if(slice.parent) {
				var index  = slice.parent.walls.indexOf(w)
				,   parent = slice.parent.sections[index]

				parent.sections.push(section)
				section.parent = parent
			}

			slice.sections.push(section)
			// w.sections.push(section)
		}

		// if(slice.last) return

		if(level > 10) {
			console.error('sliceRoof: too many levels')
			return
		}


		var inter = Geo.intersectContours([f.range(size)], points, pmap)
		,   edges = Geo.collectEdges(inter.contours)
		if(edges.length <3) return

		var paths  = Geo.searchPaths(edges)
		,   chunks = Geo.collectChunks(paths, points)

		Geo.dropChunks(chunks, true)


		if(points.length !== size) {
			console.warn('sliceRoof: intersectContours created new points:', points.slice(size))
			// return
		}


		var prevDirection = new THREE.Vector3
		,   nextDirection = new THREE.Vector3

		for(var i = 0; i < chunks.length; i++) {
			var indices = chunks[i].indices
			var length  = indices.length
			var nextWalls = []
			var nextPlanes = []
			var nextPoints = []

			for(var j = 0; j < length; j++) {
				var k = (j + 1) % length
				,   l = (j || length) -1

				var ai = indices[j]
				,   bi = indices[k]
				,   ci = indices[l]

				var a = points[ai]
				,   b = points[bi]
				,   c = points[ci]

				// TODO case when intersectContours makes additional points
				var wallPlanes = f.sand(pointPlanes[ai], pointPlanes[bi])
				var wall = slice.walls[wallPlanes[0]]
				if(!wall) {
					// console.error('points', pointPlanes[ai], pointPlanes[bi], 'do not have common plane')
					continue
				}

				prevDirection.subVectors(a, c).normalize()
				nextDirection.subVectors(b, a).normalize()
				if(Geo.equalVectors(prevDirection, nextDirection)) continue

				nextPoints.push(points[ai])
				nextPlanes.push(slice.planes[wallPlanes[0]])
				nextWalls.push(wall)
			}

			var nextSlice = this.addSlice(nextWalls, nextPlanes, nextPoints, slice)
			if(!nextSlice) continue

			slices.push(nextSlice)

			if(!minBreak) {
				this.sliceRoof(nextSlice, slices, level +1, limit)
			} else {
				nextSlice.last = true
			}
		}
	}
})
