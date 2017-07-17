Tool2D = f.unit({
	unitName: 'Tool2D',

	/**
	 * init
	 *  |
	 *  v
	 * pick <-----
	 *  |        |
	 *  v        |
	 * start <-- |
	 *  |      | |
	 *  v      | |
	 * move    | |
	 *  |      | |
	 *  v      | |
	 * magnet  | |
	 *  |      | |
	 *  v      | |
	 * end ----- |
	 *  | done?  |
	 *  v        |
	 * drop      |
	 *  |        |
	 *  v        |
	 * reset -----
	 *
	 */

	init  : function() {},
	start : function() {},
	move  : function() {},
	end   : function() {},
	drop  : function() {},

	pick: function(floor, options, mode) {
		this.floor   = floor
		this.options = options
		this.mode    = mode
	},

	magnet: function(offset) {
		for(var i = 0, l = this.magnetPoints.length; i < l; i++) {
			var target = this.magnetPoints[i]
			,   vertex = new THREE.Vector3

			vertex.addVectors(target.obvVertex.read(), offset)

			target.obvVertex.write(vertex)
		}
	},

	reset: function() {
		delete this.done
		delete this.save
		delete this.node
	}
})

Tool2D.MovePoint = f.unit(Tool2D, {
	unitName: 'Tool2D_MovePoint',

	init: function() {
		this.vr = new THREE.Vector3
		this.vs = new THREE.Vector3
		this.v1 = new THREE.Vector3
		this.ls = new THREE.Line3
		this.le = new THREE.Line3
	},

	start: function(node) {
		this.node    = node
		this.contour = this.node.obvParent.read()
		this.floor   = this.contour.obvParent.read()

		var prevWall = this.node.obvPrevWall.read()
		,   nextWall = this.node.obvNextWall.read()
		,   prevLine = prevWall.obvLine.read()
		,   nextLine = nextWall.obvLine.read()
		,   vertex   = this.node.obvVertex.read()

		this.ls.copy(prevLine)
		this.le.copy(nextLine)

		this.magnetPoints = [this.node]
		this.alignLines = [this.ls, this.le]

		this.vs.copy(vertex)
		this.v1.subVectors(this.mouse, vertex)
	},

	move: function() {
		this.vr.copy(this.mouse).sub(this.v1)

		this.node.obvVertex.write(this.vr.clone())
	},

	magnet: function(offset) {
		this.vr.add(offset)
		this.node.obvVertex.write(this.vr.clone())
	},

	end: function() {
		this.save = this.vr.distanceTo(this.vs) > Geo.EPS
		if(this.save) {
			this.floor.mergeContours(this.contour instanceof ANode.Roof)
		}
		this.done = true
	}
})

Tool2D.MoveWall = f.unit(Tool2D, {
	unitName: 'Tool2D_MoveWall',
	extrudeThreshold: 0.1,

	init: function() {
		this.vs = new THREE.Vector3
		this.v1 = new THREE.Vector3
		this.v2 = new THREE.Vector3
		this.v3 = new THREE.Vector3
		this.v4 = new THREE.Vector3
		this.l1 = new THREE.Line3
		this.l2 = new THREE.Line3
	},

	start: function(node) {
		this.node    = node
		this.contour = this.node.obvParent.read()
		this.floor   = this.contour.obvParent.read()
		this.roof    = this.contour instanceof ANode.Roof

		this.prevPoint = this.node.obvPrevPoint.read()
		this.nextPoint = this.node.obvNextPoint.read()

		this.magnetPoints = [this.prevPoint, this.nextPoint]

		var delta = this.node.obvDelta.read()
		,   normal = this.node.obvNormal.read()

		var prevVertex = this.prevPoint.obvVertex.read()
		,   nextVertex = this.nextPoint.obvVertex.read()

		var prevWall = this.node.obvPrevNode.read()
		,   prevNormal = prevWall.obvNormal.read()
		,   prevLine = prevWall.obvLine.read()

		var nextWall = this.node.obvNextNode.read()
		,   nextNormal = nextWall.obvNormal.read()
		,   nextLine = nextWall.obvLine.read()

		this.l1.set(prevVertex, nextVertex)
		this.l1.closestPointToPoint(this.mouse, true, this.v1).sub(this.mouse)

		this.v2.copy(delta)
		this.vs.copy(prevVertex)

		var points = this.contour.obvPoints.read()
		if(normal.distanceTo(prevNormal) < this.extrudeThreshold) {
			this.prevMid = new ANode.Point([prevVertex.x, prevVertex.z])

			var prevIndex = this.prevPoint.obvMountIndex.read()

			points = points.slice()
			points.splice(prevIndex || this.contour.obvWalls.read().length, 0, this.prevMid)
			this.contour.obvPoints.write(points)

			this.l1.start.copy(prevVertex)
			this.l1.end.addVectors(this.l1.start, normal)

		} else {
			this.l1.copy(prevLine)
		}

		if(normal.distanceTo(nextNormal) < this.extrudeThreshold) {
			this.nextMid = new ANode.Point([nextVertex.x, nextVertex.z])

			var nextIndex = this.nextPoint.obvMountIndex.read()

			points = points.slice()
			points.splice(nextIndex +1, 0, this.nextMid)
			this.contour.obvPoints.write(points)

			this.l2.start.copy(nextVertex)
			this.l2.end.addVectors(this.l2.start, normal)

		} else {
			this.l2.copy(nextLine)
		}
	},

	move: function() {
		this.v3.addVectors(this.v1, this.mouse)
		this.v4.addVectors(this.v2, this.v3)

		var p1 = Geo.intersectEdges(this.v3, this.v4, this.l1.start, this.l1.end, true, true)
		var p2 = Geo.intersectEdges(this.v3, this.v4, this.l2.start, this.l2.end, true, true)

		if(!p1 || !p2) return

		this.prevPoint.obvVertex.write(p1)
		this.nextPoint.obvVertex.write(p2)
	},

	magnet: function(offset, node) {
		if(node === this.prevPoint) {
			this.v3.addVectors(this.prevPoint.obvVertex.read(), offset)
			this.v4.addVectors(this.v3, this.v2)

			var px = Geo.intersectEdges(this.v3, this.v4, this.l2.start, this.l2.end, true, true, this.v4)

		} else {
			this.v4.addVectors(this.nextPoint.obvVertex.read(), offset)
			this.v3.subVectors(this.v4, this.v2)

			var px = Geo.intersectEdges(this.v3, this.v4, this.l1.start, this.l1.end, true, true, this.v3)
		}
		if(!px) return

		this.prevPoint.obvVertex.write(this.v3.clone())
		this.nextPoint.obvVertex.write(this.v4.clone())
	},

	end: function() {
		this.save = this.prevPoint.obvVertex.read().distanceTo(this.vs) > Geo.EPS

		if(this.save) {
			this.floor.mergeContours(this.roof)

		} else {
			// @TODO: coplanar walls gets broken sometimes
			if(this.prevMid) {
				this.contour.obvPoints.write(f.adrop(this.contour.obvPoints.read().slice(), this.prevMid))
				delete this.prevMid
			}
			if(this.nextMid) {
				this.contour.obvPoints.write(f.adrop(this.contour.obvPoints.read().slice(), this.nextMid))
				delete this.nextMid
			}
		}

		this.done = true
	}
})

Tool2D.MoveSlope = f.unit(Tool2D.MoveWall, {
	unitName: 'Tool2D_MoveSlope',

})

Tool2D.MoveHole = f.unit(Tool2D, {
	unitName: 'Tool2D_MoveHole',

	init: function() {
		this.v1 = new THREE.Vector3
		this.l1 = new THREE.Line3
	},

	start: function(node) {
		this.node = node
		this.wall = this.node.obvParent.read()

		this.l1.set(this.wall.obvPrevVertex.read(), this.wall.obvNextVertex.read())


		this.l1.closestPointToPoint(this.mouse, true, this.v1)
		this.v1.sub(this.l1.start)

		this.startPos = this.node.obvPos.read()
		this.startOffset = this.v1.length() / this.wall.obvWidth.read() - this.startPos
	},

	move: function() {
		this.l1.closestPointToPoint(this.mouse, true, this.v1)
		this.v1.sub(this.l1.start)

		var pos = this.v1.length() / this.wall.obvWidth.read() - this.startOffset

		this.node.setOption('pos', pos)
	},

	end: function() {
		this.save = Math.abs(this.node.obvPos.read() - this.startPos) > Geo.EPS
		this.done = true
	}
})

Tool2D.MoveContour = f.unit(Tool2D, {
	unitName: 'Tool2D_MoveContour',

	init: function() {
		this.vs = new THREE.Vector3
		this.v1 = new THREE.Vector3
		this.v2 = new THREE.Vector3
	},

	start: function(node) {
		if(!node) return

		this.node = node
		this.floor = this.node.obvParent.read()

		this.magnetPoints = this.node.obvPoints.read()

		this.vs.copy(this.node.obvCenter.read())
		this.v1.subVectors(this.mouse, this.vs)
	},

	move: function() {
		this.v2.subVectors(this.node.obvCenter.read(), this.mouse).add(this.v1)

		var points = this.node.obvPoints.read()
		for(var i = 0, l = points.length; i < l; i++) {
			var point = points[i]

			point.obvVertex.write(point.obvVertex.read().clone().sub(this.v2))
		}
	},

	magnet: function(offset) {
		var points = this.node.obvPoints.read()
		for(var i = 0, l = points.length; i < l; i++) {
			var point = points[i]

			point.obvVertex.write(point.obvVertex.read().clone().add(offset))
		}
	},

	end: function() {
		this.save = this.node.obvCenter.read().distanceTo(this.vs) > Geo.EPS
		if(this.save) this.floor.mergeContours()
		this.done = true
	}
})

Tool2D.AddPolygon = f.unit(Tool2D, {
	unitName: 'Tool2D_AddPolygon',

	init: function() {
		this.v1 = new THREE.Vector3
	},

	pick: function(floor, options, mode) {
		this.floor = floor
		this.roof = mode.roof

		if(this.roof) {
			this.node = new ANode.Roof({})
			this.floor.obvRoofs.write(this.floor.obvRoofs.read().concat(this.node))

		} else {
			this.node = new ANode.Box({})
			this.floor.obvBoxes.write(this.floor.obvBoxes.read().concat(this.node))
		}
		this.point = new ANode.Point([this.mouse.x, this.mouse.z])

		this.node.obvPoints.write([ this.point ])
		this.node.visible.off()
		this.node.obvBlank.write(true)
		this.node.open = true

		this.begin = this.point
		this.begin.obvSelect.write(true)

		this.magnetPoints = [this.point]
	},

	move: function() {
		this.node.visible.on()

		this.v1.copy(this.mouse)
		this.point.obvVertex.write(this.v1.clone())

		this.save = true
	},

	magnet: function(offset) {
		this.v1.add(offset)
		this.point.obvVertex.write(this.v1.clone())
	},

	end: function() {
		var points = this.node.obvPoints.read()
		,   pointA = this.begin.obvVertex.read()
		,   pointB = this.point.obvVertex.read()

		if(points.length > 1 && pointA.distanceTo(pointB) < Geo.EPS) {

			if(points.length > 3) this.done = true

		} else {
			this.point = new ANode.Point([this.mouse.x, this.mouse.z])
			this.node.obvPoints.write(points.concat(this.point))
			this.magnetPoints = [this.point]
		}
	},

	drop: function() {
		var points = this.node.obvPoints.read()
		if(this.done || points.length > 3) {
			this.begin.obvSelect.write(false)
			this.node.obvBlank.write(false)

			this.node.obvPoints.write(points.slice(0, -1))

			this.floor.mergeContours(this.roof)

			this.save = true
			delete this.node.open

		} else {
			if(this.roof) {
				var roofs = this.floor.obvRoofs.read().slice()
				this.floor.obvRoofs.write(f.adrop(roofs, this.node))

			} else {
				var boxes = this.floor.obvBoxes.read().slice()
				this.floor.obvBoxes.write(f.adrop(boxes, this.node))
			}
			// this.node.destroy()
		}
	}
})

Tool2D.AddFixedShape = f.unit(Tool2D, {
	unitName: 'Tool2D_AddFixedShape',

	sizes: {
		square: 4,
		lcorn: 6,
		rcorn: 6,
		cross: 12,
		tlike: 8
	},

	moveFunc: {
		square: function(x, z, h) {
			this.vertices[0] = new THREE.Vector3(x - h, 0, z - h)
			this.vertices[1] = new THREE.Vector3(x + h, 0, z - h)
			this.vertices[2] = new THREE.Vector3(x + h, 0, z + h)
			this.vertices[3] = new THREE.Vector3(x - h, 0, z + h)
		},

		lcorn: function(x, z, h) {
			this.vertices[0] = new THREE.Vector3(x - h, 0, z - h)
			this.vertices[1] = new THREE.Vector3(x    , 0, z - h)
			this.vertices[2] = new THREE.Vector3(x    , 0, z    )
			this.vertices[3] = new THREE.Vector3(x + h, 0, z    )
			this.vertices[4] = new THREE.Vector3(x + h, 0, z + h)
			this.vertices[5] = new THREE.Vector3(x - h, 0, z + h)
		},

		rcorn: function(x, z, h) {
			this.vertices[0] = new THREE.Vector3(x - h, 0, z    )
			this.vertices[1] = new THREE.Vector3(x    , 0, z    )
			this.vertices[2] = new THREE.Vector3(x    , 0, z - h)
			this.vertices[3] = new THREE.Vector3(x + h, 0, z - h)
			this.vertices[4] = new THREE.Vector3(x + h, 0, z + h)
			this.vertices[5] = new THREE.Vector3(x - h, 0, z + h)
		},

		cross: function(x, z, h, q) {
			this.vertices[ 0] = new THREE.Vector3(x - h, 0, z - q)
			this.vertices[ 1] = new THREE.Vector3(x - q, 0, z - q)
			this.vertices[ 2] = new THREE.Vector3(x - q, 0, z - h)
			this.vertices[ 3] = new THREE.Vector3(x + q, 0, z - h)
			this.vertices[ 4] = new THREE.Vector3(x + q, 0, z - q)
			this.vertices[ 5] = new THREE.Vector3(x + h, 0, z - q)
			this.vertices[ 6] = new THREE.Vector3(x + h, 0, z + q)
			this.vertices[ 7] = new THREE.Vector3(x + q, 0, z + q)
			this.vertices[ 8] = new THREE.Vector3(x + q, 0, z + h)
			this.vertices[ 9] = new THREE.Vector3(x - q, 0, z + h)
			this.vertices[10] = new THREE.Vector3(x - q, 0, z + q)
			this.vertices[11] = new THREE.Vector3(x - h, 0, z + q)
		},

		tlike: function(x, z, h, q) {
			this.vertices[ 0] = new THREE.Vector3(x - h, 0, z    )
			this.vertices[ 1] = new THREE.Vector3(x - q, 0, z    )
			this.vertices[ 2] = new THREE.Vector3(x - q, 0, z - h)
			this.vertices[ 3] = new THREE.Vector3(x + q, 0, z - h)
			this.vertices[ 4] = new THREE.Vector3(x + q, 0, z    )
			this.vertices[ 5] = new THREE.Vector3(x + h, 0, z    )
			this.vertices[ 6] = new THREE.Vector3(x + h, 0, z + h)
			this.vertices[ 7] = new THREE.Vector3(x - h, 0, z + h)
		}
	},

	init: function(variant) {
		this.length = this.sizes[variant]
		this.moveObject = this.moveFunc[variant]
	},

	pick: function(floor, options, mode) {
		this.size = 8
		this.roof = mode.roof

		this.floor = floor
		if(this.roof) {
			this.node = new ANode.Roof({})
			this.floor.obvRoofs.write(this.floor.obvRoofs.read().concat(this.node))

		} else {
			this.node = new ANode.Box({})
			this.floor.obvBoxes.write(this.floor.obvBoxes.read().concat(this.node))
		}

		this.node.visible.off()
		this.node.obvBlank.write(true)

		this.points = []
		this.vertices = []
		while(this.points.length < this.length) {
			// setup contour in circle shape to prevent collapsing and NaNs
			var alpha  = this.points.length / this.length * Math.PI * 2
			,   point  = new ANode.Point([Math.sin(alpha), Math.cos(alpha)])
			,   vertex = point.obvVertex.read()

			this.points.push(point)
			this.vertices.push(vertex)
		}

		this.node.obvPoints.write(this.points)
		this.magnetPoints = this.points
	},

	move: function(node) {
		this.node.visible.on()
		this.moveObject(this.mouse.x, this.mouse.z, this.size / 2, this.size / 4)

		for(var i = 0, l = this.points.length; i < l; i++) {
			this.points[i].obvVertex.write(this.vertices[i])
		}
	},

	magnet: function(offset) {
		for(var i = 0, l = this.points.length; i < l; i++) {
			var p = this.points[i]
			,   v = this.vertices[i].clone()

			v.add(offset)
			p.obvVertex.write(v)
		}
	},

	end: function() {
		this.node.obvBlank.write(false)
		this.floor.mergeContours(this.roof)
		this.save = true
		this.done = true
	},

	drop: function() {
		if(!this.done) {
			if(this.roof) {
				this.floor.obvRoofs.write(f.adrop(this.floor.obvRoofs.read().slice(), this.node))

			} else {
				this.floor.obvBoxes.write(f.adrop(this.floor.obvBoxes.read().slice(), this.node))
			}
		}
	}
})

Tool2D.AddHole = f.unit(Tool2D, {
	unitName: 'Tool2D_AddHole',

	intersectionMode: { wall: true, slope: true },

	init: function() {
		this.v1 = new THREE.Vector3
		this.l1 = new THREE.Line3
	},

	pick: function(floor, sid) {
		this.floor = floor

		var json   = { i: 0, p: 0, w: 1, l: 0, h: 1.5, t: sid || 0 }
		,   sample = main.sampler.samples[sid]

		if(sample) {
			switch(sample.type) {
				case 'window':
					json.l = 0.9
				break

				case 'door':
					json.l = 0
				break
			}

			json.w = sample.width
			json.h = sample.height + json.l
		}

		this.node = new ANode.Hole(json)
		this.node.visible.off()
		this.node.obvBlank.write(true)
	},

	move: function(wall) {
		if(wall instanceof ANode.Slope && !wall.obvGable.read()) return

		this.node.visible.on()

		if(wall !== this.wall) {
			if(this.wall) {
				var holes = this.wall.obvHoles.read().slice()
				this.wall.obvHoles.write(f.adrop(holes, this.node))
			}

			this.wall = wall

			if(this.wall) {
				var holes = this.wall.obvHoles.read().concat(this.node)
				this.wall.obvHoles.write(holes)
			}
		}


		if(this.wall) {
			var vs = this.wall.obvPrevVertex.read()
			,   ve = this.wall.obvNextVertex.read()

			this.l1.set(vs, ve)
			this.l1.closestPointToPoint(this.mouse, true, this.v1)
			this.v1.sub(vs)

			this.node.setOption('pos', this.v1.length() / this.wall.obvWidth.read())
		}
	},

	end: function() {
		this.node.obvBlank.write(false)

		this.save = !!this.wall
		this.done = true

		delete this.wall
	},

	drop: function() {
		if(!this.done && this.wall) {
			var holes = this.wall.obvHoles.read().slice()
			this.wall.obvHoles.write(f.adrop(holes, this.node))

			delete this.wall
		}
	}
})
