ANode.Wall = f.unit(ANode, {
	unitName: 'ANode_Wall',
	name: 'wall',
	label: 'node_label_wall',
	targetMaterial: 'wall',
	T3: Draw3D.Wall,

	removable: false,

	/**
	 * Read this very carefully:
	 *  WALLS DO NOT EXIST
	 *        OR
	 * POINTS DO NOT EXIST
	 *
	 */
	create: function() {
		this.obvHoles = this.mountList(new Observable().set(this, this.readHoles))

		this.obvWidth  = new Observable().set(this, this.readWidth, this.writeWidth, Geo.equalReals)
		this.obvHeight = new Observable().set(this, this.readHeight, null, Geo.equalReals)
		this.obvBottom = new Observable().set(this, this.readBottom, null, Geo.equalReals)

		this.obvWidthRelated = new Observable

		this.obvLine      = new Observable().set(this, this.readLine, null, Geo.equalLines)
		this.obvDelta     = new Observable().set(this, this.readDelta, null, Geo.equalVectors)
		this.obvDirection = new Observable().set(this, this.readDirection, null, Geo.equalVectors)
		this.obvCenter    = new Observable().set(this, this.readCenter, null, Geo.equalVectors)
		this.obvNormal    = new Observable().set(this, this.readNormal, null, Geo.equalVectors)

		this.obvPrevPoint = new Observable().set(this, this.readPrevPoint)
		this.obvNextPoint = new Observable().set(this, this.readNextPoint)

		this.obvPrevVertex = new Observable().set(this, this.readPrevVertex, null, Geo.equalVectors)
		this.obvNextVertex = new Observable().set(this, this.readNextVertex, null, Geo.equalVectors)

		this.obvAlpha     = new Observable().set(this, this.readAlpha, null, Geo.equalReals)
		this.obvPdist     = new Observable().set(this, this.readPdist, null, Geo.equalReals)
		this.obvPmin      = new Observable().set(this, this.readPmin, null, Geo.equalReals)
		this.obvPmax      = new Observable().set(this, this.readPmax, null, Geo.equalReals)
		this.obvPlid      = new Observable().set(this, this.readPlid)
		this.obvPage      = new Observable().set(this, this.readPage)
		this.obvWbox      = new Observable().set(this, this.readWbox, null, Geo.equalBox2)

		this.obvHoleBoxes = new Observable().set(this, this.readHoleBoxes, null, Geo.equalJSON)

		this.options.width = {
			type: 'number',
			label: 'option_label_width',
			value: this.obvWidth,
			related: this.obvWidthRelated,
			min: 0.1,
			step: 0.1
		}

		this.helpers.split = new Helper2D.WallSplit(this)
		this.helpers.width = new Helper2D.NodeWidth(this)
	},

	readPrevVertex: function() {
		var point = this.obvPrevPoint.read()
		if(point) return point.obvVertex.read().clone()
	},

	readNextVertex: function() {
		var point = this.obvNextPoint.read()
		if(point) return point.obvVertex.read().clone()
	},

	readPrevPoint: function() {
		var contour = this.obvParent.read()
		if(!contour) return

		var points = contour.obvPoints.read()
		if(!points) return

		var index = this.obvMountIndex.read()
		,   point = points[index]
		if(!point) return

		return point
	},

	readNextPoint: function() {
		var contour = this.obvParent.read()
		if(!contour) return

		var points = contour.obvPoints.read()
		if(!points) return

		var next = this.obvNextNode.read()
		if(!next) return

		var index = next.obvMountIndex.read()
		,   point = points[index]
		if(!point) return

		return point
	},

	readLine: function() {
		return new THREE.Line3(
			this.obvPrevVertex.read(),
			this.obvNextVertex.read())
	},

	readDelta: function() {
		return this.obvLine.read().delta()
	},

	readDirection: function() {
		return this.obvDelta.read().clone().normalize()
	},

	readCenter: function() {
		var center = new THREE.Vector3

		center.copy(this.obvDelta.read())
		center.multiplyScalar(1/2)
		center.add(this.obvPrevVertex.read())

		return center
	},

	readNormal: function() {
		var direction = this.obvDirection.read()

		return new THREE.Vector3(-direction.z, 0, direction.x)
	},

	readAlpha: function() {
		var direction = this.obvDirection.read()
		return Math.atan2(direction.z, direction.x)
	},

	readWidth: function() {
		return this.obvDelta.read().length()
	},

	readPdist: function() {
		return this.getPlaneDist(this.obvLine.read().start)
	},

	readPmin: function() {
		return this.getPlanePos(this.obvLine.read().start)
	},

	readPmax: function() {
		return this.getPlanePos(this.obvLine.read().end)
	},

	readPlid: function() {
		return Geo.encodePlid(this.obvAlpha.read(), this.obvPdist.read())
	},

	readHoleBoxes: function() {
		var page = this.obvPage.read()
		return page ? page.obvHoleBoxes.read() : []
	},

	readWbox: function() {
		var pmin = this.obvPmin.read()
		,   pmax = this.obvPmax.read()

		var bottom = this.obvBottom.read()
		,   height = this.obvHeight.read()

		var min = new THREE.Vector2(pmin, bottom)
		,   max = new THREE.Vector2(pmax, bottom + height)
		,   box = new THREE.Box2(min, max)

		return box
	},

	readHeight: function() {
		var contour = this.obvParent.read()
		if(!contour) return 1

		return contour.obvHeight.read()
	},

	readBottom: function() {
		var contour = this.obvParent.read()
		if(!contour) return 1

		return contour.obvBottom.read()
	},

	readPage: function() {
		var plid = this.obvPlid.read()
		,   root = this.obvRoot.read()

		return root ? root.getCutpage(plid) : null
	},

	sortHoles: function(hole) {
		return hole.obvPos.read()
	},

	readHoles: function(holes) {
		return f.sort(holes.slice(), this.sortHoles)
	},


	getPlanePos: function(point) {
		var direction = this.obvDirection.read()
		return point.x * direction.x + point.z * direction.z
	},

	getPlaneDist: function(point) {
		var direction = this.obvDirection.read()
		return -point.x * direction.z + point.z * direction.x
	},

	getPlanePoint: function(ppos, target) {
		if(!target) target = new THREE.Vector3

		var width = this.obvWidth.read()
		,   delta = this.obvDelta.read()
		,   start = this.obvPrevVertex.read()
		,   pmin  = this.obvPmin.read()
		,   fract = (ppos - pmin) / width

		target.copy(delta).multiplyScalar(fract).add(start)
		return target
	},



	writeWidth: function(next, prev) {
		var ratio = next / prev

		var line = new THREE.Line3
		,   va = new THREE.Vector3
		,   vb = new THREE.Vector3

		var prevWall = this.obvPrevNode.read()
		,   nextWall = this.obvNextNode.read()

		var p0 = this.obvPrevPoint.read()
		,   p1 = this.obvNextPoint.read()
		,   v0 = p0.obvVertex.read()
		,   v1 = p1.obvVertex.read()


		line.set(v0, v1)

		switch(this.obvWidthRelated.read()) {

			/**
			 *    p0   this   p1
			 *      o--------o
			 */
			case p0:
				line.at(ratio, va)

				p1.obvVertex.write(va)
			break

			case p1:
				line.at(1 - ratio, va)

				p0.obvVertex.write(va)
			break


			/**
			 *    p3   prev   p0
			 *      o--------o
			 *      |        |
			 * gran |        | this
			 *      |        |
			 *      o        o
			 *    p2          p1
			 */
			case prevWall:
				var gran = prevWall.obvPrevNode.read()
				,   p2 = gran.obvPrevPoint.read()
				,   p3 = gran.obvNextPoint.read()
				,   v2 = p2.obvVertex.read()
				,   v3 = p3.obvVertex.read()

				line.at(1 - ratio, va)
				vb.subVectors(va, v0).add(v3)

				if(Geo.intersectEdges(va, vb, v2, v3, true, true, vb)) {
					p3.obvVertex.write(vb)
					p0.obvVertex.write(va)
				}
			break


			/**
			 *    p1   next   p2
			 *      o--------o
			 *      |        |
			 * this |        | gran
			 *      |        |
			 *      o        o
			 *    p0          p3
			 */
			case nextWall:
				var gran = nextWall.obvNextNode.read()
				,   p2 = gran.obvPrevPoint.read()
				,   p3 = gran.obvNextPoint.read()
				,   v2 = p2.obvVertex.read()
				,   v3 = p3.obvVertex.read()

				line.at(ratio, va)
				vb.subVectors(va, v1).add(v2)

				if(Geo.intersectEdges(va, vb, v2, v3, true, true, vb)) {
					p1.obvVertex.write(va)
					p2.obvVertex.write(vb)
				}
			break


			/**
			 *    p0   this   p1
			 *      o--------o
			 */
			default:
				line.at(-ratio / 2 + 0.5, va)
				line.at( ratio / 2 + 0.5, vb)

				p0.obvVertex.write(va)
				p1.obvVertex.write(vb)
			break
		}
	},

	findCoplanar: function(above) {
		var contour = this.obvParent.read()
		,   floor0  = contour.obvParent.read()
		,   index0  = floor0.obvMountIndex.read()
		,   house   = floor0.obvParent.read()
		,   floors  = house.obvFloors.read()
		,   floor1  = floors[index0 +(above ? +1 : -1)]
		,   plid    = this.obvPlid.read()
		,   found   = []

		if(!floor1) return found

		var boxes = floor1.obvBoxes.read()
		for(var j = 0; j < boxes.length; j++) {
			var box = boxes[j]

			var walls = box.obvWalls.read()
			for(var k = 0; k < walls.length; k++) {
				var wall = walls[k]

				if(wall.obvPlid.read() === plid) found.push(wall)
			}
		}

		var roofs = floor1.obvRoofs.read()
		for(var j = 0; j < roofs.length; j++) {
			var roof = roofs[j]

			var walls = roof.obvWalls.read()
			for(var k = 0; k < walls.length; k++) {
				var slope = walls[k]

				if(slope.obvGable.read() && slope.obvPlid.read() === plid) found.push(slope)
			}
		}

		return found
	},

	findCoplanarWall: function(pos, above) {
		var contour = this.obvParent.read()
		,   floor0  = contour.obvParent.read()
		,   index0  = floor0.obvMountIndex.read()
		,   house   = floor0.obvParent.read()
		,   floors  = house.obvFloors.read()
		,   plid    = this.obvPlid.read()
		,   found   = []


		var i = index0, floor

		next_floor:
		while(floor = floors[above ? ++i : --i]) {

			var boxes = floor.obvBoxes.read()
			for(var j = 0; j < boxes.length; j++) {
				var box = boxes[j]

				var walls = box.obvWalls.read()
				for(var k = 0; k < walls.length; k++) {
					var wall = walls[k]

					if(wall.obvPlid.read() === plid
					&& wall.obvPmin.read() < pos - Geo.EPS
					&& wall.obvPmax.read() > pos + Geo.EPS) {

						found.push(wall)
						continue next_floor
					}
				}
			}

			var roofs = floor.obvRoofs.read()
			for(var j = 0; j < roofs.length; j++) {
				var roof = roofs[j]

				var walls = roof.obvWalls.read()
				for(var k = 0; k < walls.length; k++) {
					var slope = walls[k]

					if(slope.obvGable.read()
					&& slope.obvPlid.read() === plid
					&& slope.obvPmin.read() < pos - Geo.EPS
					&& slope.obvPmax.read() > pos + Geo.EPS) {

						found.push(slope)
						continue next_floor
					}
				}
			}

			break
		}

		return found
	}
})
