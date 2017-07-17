ANode.Floor = f.unit(ANode, {
	unitName: 'ANode_Floor',
	name: 'floor',
	label: 'node_label_floor',
	T3: Draw3D.Layer,

	create: function() {
		this.obvBoxes = this.mountList()
		this.obvRoofs = this.mountList()

		this.obvHeight = new Observable().set(this, null, null, Geo.equalReals)
		this.obvBottom = new Observable().set(this, this.readBottom, null, Geo.equalReals)
		this.obvPlinth = new Observable().set(this, this.readPlinth, this.writePlinth, Geo.equalReals)
		this.obvPlinthHidden = new Observable().set(this, this.readPlinthHidden)

		this.obvFlatsHigh = new Observable().set(this, this.readFlatsHigh)
		this.obvFlatsLow  = new Observable().set(this, this.readFlatsLow)

		this.obvBoxesVertices = new Observable().set(this, this.readBoxesVertices)
		this.obvRoofsVertices = new Observable().set(this, this.readRoofsVertices)

		this.obvIsRoof = new Observable

		this.obvLabel = new Observable().set(this, this.readLabel)


		this.options.plinth = {
			name: 'plinth',
			type: 'number',
			label: 'option_label_plinth',
			hidden: this.obvPlinthHidden,
			value: this.obvPlinth,
			min: 0,
			step: 0.1
		}
		this.options.height = {
			type: 'number',
			label: 'option_label_floorheight',
			hidden: this.obvIsRoof,
			value: this.obvHeight,
			min: 0.2,
			step: 0.1
		}

		this.obvRemovable.set(this, this.readRemovable)

		this.label = this.obvLabel
	},

	writeJSON: function(json) {
		this.obvHeight.write(json.height || 3)

		this.obvIsRoof.write(!!json.roof)


		var boxes = []
		if(json.boxes) for(var i = 0; i < json.boxes.length; i++) {
			boxes.push(new ANode.Box(json.boxes[i]))
		}
		this.obvBoxes.write(boxes)


		var roofs = []
		if(json.roofs) for(var i = 0; i < json.roofs.length; i++) {
			roofs.push(new ANode.Roof(json.roofs[i]))
		}
		this.obvRoofs.write(roofs)
	},

	readJSON: function() {
		var json = {
			height: this.round(this.obvHeight.read())
		}

		if(this.obvIsRoof.read()) json.roof = 1

		var boxes = this.obvBoxes.read()
		if(boxes.length) json.boxes = boxes.map(this.readItemJSON)

		var roofs = this.obvRoofs.read()
		if(roofs.length) json.roofs = roofs.map(this.readItemJSON)

		return json
	},

	readRemovable: function() {
		return !!this.obvMountIndex.read()
	},

	readPlinth: function() {
		var index = this.obvMountIndex.read()
		if(index) return 0

		var house = this.obvParent.read()
		if(!house) return 0

		return house.obvPlinth.read()
	},

	writePlinth: function(plinth) {
		var house = this.obvParent.read()
		if(!house) return

		house.obvPlinth.write(plinth)
	},

	readPlinthHidden: function() {
		return this.obvMountIndex.read() > 0
	},

	readBottom: function() {
		var prev = this.obvPrevNode.read()
		if(prev) {
			return prev.obvBottom.read() + prev.obvHeight.read()

		} else {
			return this.obvPlinth.read()
		}
	},

	readLabel: function() {
		return this.obvIsRoof.read() ? 'node_label_roof' : 'node_label_floor'
	},

	readBoxesVertices: function() {
		var boxes = this.obvBoxes.read()

		var vertices = []
		for(var i = 0; i < boxes.length; i++) {
			vertices.push(boxes[i].obvVertices.read())
		}

		return vertices
	},

	readRoofsVertices: function() {
		var roofs = this.obvRoofs.read()

		var vertices = []
		for(var i = 0; i < roofs.length; i++) {
			var roof = roofs[i]
			if(!roof.obvGround.read()) {
				vertices.push(roof.obvVertices.read())
			}
		}

		return vertices
	},

	readFlatsHigh: function() {
		var flats = this.obvBoxesVertices.read()

		var nextFloor = this.obvNextNode.read()
		if(nextFloor) {
			var nextBoxes = nextFloor.obvBoxesVertices.read()
			,   nextRoofs = nextFloor.obvRoofsVertices.read()

			return this.subContours(flats, nextBoxes.concat(nextRoofs))

		} else {
			return flats
		}
	},

	readFlatsLow: function() {
		var boxes = this.obvBoxesVertices.read()
		,   roofs = this.obvRoofsVertices.read()
		,   flats = boxes.concat(roofs)

		var prevFloor = this.obvPrevNode.read()
		if(prevFloor) {
			return this.subContours(flats, prevFloor.obvBoxesVertices.read())

		} else {
			return flats
		}
	},

	subContours: function(low, high) {
		var indices = []
		var points = []
		var right = ~((1 << low.length) -1)

		for(var j = 0; j < low.length; j++) {
			var contour = low[j]

			indices.push(f.rangep(contour.length, points.length))
			points = points.concat(contour)
		}

		for(var j = 0; j < high.length; j++) {
			var contour = high[j]

			indices.push(f.rangep(contour.length, points.length))
			points = points.concat(contour)
		}


		var inter  = Geo.intersectContours(indices, points)
		,   edges  = Geo.collectEdges(inter.contours)
		,   paths  = Geo.searchPaths(edges)
		,   chunks = Geo.collectChunks(paths, inter.points)

		Geo.dropChunks(chunks, false)
		Geo.findChunkOwners(chunks, inter.contours, inter.points)

		var result = []
		for(var i = chunks.length -1; i >= 0; i--) {
			var c = chunks[i]

			if(c.owners & right) continue

			var contour = []
			for(var j = 0; j < c.indices.length; j++) {
				contour.push(points[c.indices[j]])
			}
			result.push(contour)
		}

		return result
	},

	/**
	 * TODO: merge holes
	 * TODO: check coincide points
	 *
	 */
	mergeContours: function(roofs) {
		// roof merging disabled for better days
		if(roofs) return

		var indices = []
		var vertices = []
		var hole_planes = []
		var next_walls = []

		var contours = roofs
			? this.obvRoofs.read()
			: this.obvBoxes.read()

		for(var i = 0; i < contours.length; i++) {
			var contour = contours[i]
			,   offset  = vertices.length
			,   pmap    = []

			var contour_points = contour.obvPoints.read()
			,   contour_walls  = contour.obvWalls.read()
			for(var j = 0; j < contour_points.length; j++) {
				var point = contour_points[j]
				,   wall = contour_walls[j]

				vertices.push(point.obvVertex.read())
				pmap.push(j + offset)

				var wall_holes = wall.obvHoles.read()

				if(wall_holes.length) hole_planes.push({
					plid: wall.obvPlid.read(),
					pmin: wall.obvPmin.read(),
					pmax: wall.obvPmax.read(),
					holes: wall_holes
				})
			}

			indices.push(pmap)
		}

		var inter = Geo.intersectContours(indices, vertices)
		// if(!inter.intersect.length) {
		// 	for(var i = 0; i < contours.length; i++) {
		// 		var contour = contours[i]
		// 		contour.points.forEach(this.indexMountList)
		// 	}
		// 	return
		// }

		var edges  = Geo.collectEdges(inter.contours)
		,   paths  = Geo.searchPaths(edges)
		,   chunks = Geo.collectChunks(paths, vertices)

		Geo.dropChunks(chunks, true)
		Geo.findChunkOwners(chunks, inter.contours, inter.points)


		var prev_contours = contours.slice()
		,   next_contours = []
		for(var i = 0; i < chunks.length; i++) {
			var chunk = chunks[i]
			,   length = chunk.indices.length
			,   contour = roofs ? new ANode.Roof : new ANode.Box

			if(chunk.owners & (chunk.owners -1) === 0) {
				var parent = prev_contours[Math.log2(chunk.owners)]

				if(parent) contour.copyOnMerge(parent)
				else console.warn('Floor.mergeContours: bad chunk owner')
			}

			var next_points = []
			for(var j = 0; j < length; j++) {
				var vertex = inter.points[chunk.indices[j]]
				next_points.push(new ANode.Point([vertex.x, vertex.z]))
			}
			contour.obvPoints.write(next_points)


			var contour_walls = contour.obvWalls.read()
			for(var j = 0; j < contour_walls.length; j++) {
				next_walls.push(contour_walls[j])
			}

			next_contours.push(contour)
		}

		for(var i = 0; i < next_walls.length; i++) {
			if(!hole_planes.length) break

			var next_wall = next_walls[i]
			,   next_plid = next_wall.obvPlid.read()
			,   next_pmin = next_wall.obvPmin.read()
			,   next_pmax = next_wall.obvPmax.read()

			for(var j = hole_planes.length -1; j >= 0; j--) {
				var hole_plane = hole_planes[j]

				if(hole_plane.plid === next_plid
				&& hole_plane.pmin <   next_pmax
				&& hole_plane.pmax >   next_pmin) {

					next_wall.obvHoles.write(hole_plane.holes)
				}
			}
		}

		// for(var i = prev_contours.length -1; i >= 0; i--) {
		// 	prev_contours[i].destroy()
		// }

		if(roofs) {
			this.obvRoofs.write(next_contours)

		} else {
			this.obvBoxes.write(next_contours)
		}
	}
})
