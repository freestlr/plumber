Tool3D = f.unit({
	unitName: 'Tool3D',

	init: function() {},

	pick: function(node, options, selection) {
		this.root = node.obvRoot.read()
	},

	start  : function() {},
	move   : function() {},
	magnet : function() {},
	end    : function() {},
	drop   : function() {},

	reset: function() {
		delete this.draw
		delete this.done
		delete this.save
	},

	setMultiple: function(name, nodes, starts, delta) {
		var deltaMin = delta
		for(var i = 0; i < nodes.length; i++) {
			var node  = nodes[i]
			,   start = starts[i]
			,   value = node.clampOption(name, start + delta)

			if(Math.abs(value - start) < Math.abs(deltaMin)) {
				deltaMin = value - start
			}
		}

		var changed = false
		for(var i = 0; i < nodes.length; i++) {
			var node = nodes[i]
			,   start = starts[i]

			changed |= node.setOption(name, start + deltaMin)
		}

		this.draw |= changed
		return changed
	},

	intersectWallRay: function() {
		var plane = new THREE.Plane

		return function(wall, ray, target) {
			if(!wall || !ray) return

			plane.normal.copy(wall.obvNormal.read())
			plane.constant = -wall.obvPdist.read()

			return ray.intersectPlane(plane, target)
		}
	}()
})

Tool3D.AddRoof = f.unit(Tool3D, {
	unitName: 'Tool3D_AddRoof',

	highlightNodes: 'flat',
	intersectionMode: { floor: 'flat' },
	intersectionList: { flat: ['floor'] },

	start: function(inter) {
		if(!inter) return

		var subnode = inter.object.subnode
		,   node    = subnode.target
		,   data    = subnode.data
		,   next    = node.obvNextNode.read()
		,   index   = node.obvMountIndex.read()
		,   floor

		var json = {
			points: data.points.map(function(p) { return [p.x, p.z] }),
			soffit: true
		}

		if(data.roof) {
			floor = node

			json.ground = data.roof.obvGround.read() + data.roof.obvBreak.read()
			json.soffit = false
			json.ledge = 0.04
			json.plank = data.roof.obvPlank.read()

		} else if(!next) {
			main.bus.emit('floor_add', [index +1, true, true])
			var floors = this.root.obvFloors.read()
			floor = floors[floors.length -1]

		} else {
			floor = next
		}

		floor.obvRoofs.write(floor.obvRoofs.read().concat(new ANode.Roof(json)))

		this.done = true
		this.save = true
		this.draw = true
	}
})

Tool3D.AddDrain = f.unit(Tool3D, {
	unitName: 'Tool3D_AddDrain',

	highlightNodes: 'slope',
	intersectionMode: { roof: 'slope' },
	intersectionList: { slope: ['roof'] },

	start: function(inter) {
		if(!inter) return

		var node = inter.object.subnode.target

		if(!node.obvDrain.read()) {
			node.obvDrain.write(new ANode.Drain([]))
		}

		this.done = true
		this.save = true
		this.draw = true
	}
})

Tool3D.AddPipe = f.unit(Tool3D, {
	unitName: 'Tool3D_AddPipe',

	highlightNodes: 'flume, drain',
	intersectionMode: { drain: 'flume' },
	intersectionList: { flume: ['drain'] },

	init: function() {
		this.lineA = new THREE.Vector3
		this.lineB = new THREE.Vector3

		this.line = new THREE.Line(new THREE.Geometry)
		this.line.visible = false
		this.line.material.color.set('lime')
		this.line.geometry.vertices.push(this.lineA, this.lineB)
	},

	pick: function(node) {
		this.root = node.obvRoot.read()
		this.root.object.add(this.line)

		this.lineA.set(0, 0, 0)
		this.lineB.set(0, 0, 0)
		this.line.geometry.verticesNeedUpdate = true
	},

	start: function(inter) {
		if(!inter) return

		var subnode = inter.object.subnode
		,   drain   = subnode.target
		,   slope   = subnode.targets.slope
		,   index   = slope.obvMountIndex.read()
		,   ledgeLine = slope.obvLedgeLine.read()

		var pos = ledgeLine.closestPointToPointParameter(inter.point)
		,   pipe = new ANode.DrainPipe(index + pos)

		drain.obvPipes.write(drain.obvPipes.read().concat(pipe))


		this.done = true
		this.save = true
		this.draw = true
	},

	move: function(inter) {
		this.line.visible = !!inter

		if(!inter) return

		this.lineA.copy(inter.point)
		this.lineB.copy(inter.point).setY(0)
		this.line.geometry.verticesNeedUpdate = true

		this.draw = true
	},

	drop: function() {
		this.root.object.remove(this.line)
	}
})

Tool3D.MovePipe = f.unit(Tool3D, {
	unitName: 'Tool3D_MovePipe',

	pick: function(node, options, selection) {
		if(!node) return

		this.pipe = node
		this.slope = this.pipe.obvSlope.read()
		this.fract = this.pipe.obvFract.read()

		this.listNodes = []
		this.listStart = []
		for(var i = 0; i < selection.length; i++) {
			var node = selection[i]
			if(node instanceof ANode.DrainPipe) {
				this.listNodes.push(node)
				this.listStart.push(node.obvFract.read())
			}
		}
	},

	start: function(inter, ray) {
		var point = this.intersectWallRay(this.slope, ray)
		if(point) {
			var ppos  = this.slope.getPlanePos(point)
			,   pmin  = this.slope.obvPmin.read()
			,   width = this.slope.obvLedgeWidth.read()
			,   fract = (ppos - pmin) / width

			this.offsetFract = this.fract - fract

		} else {
			this.offsetFract = 0
		}
	},

	move: function(inter, ray) {
		var point = this.intersectWallRay(this.slope, ray)
		if(!point || this.done) return

		var ppos  = this.slope.getPlanePos(point)
		,   pmin  = this.slope.obvPmin.read()
		,   width = this.slope.obvLedgeWidth.read()

		var fract = (ppos - pmin) / width + this.offsetFract
		,   delta = fract - this.fract

		this.setMultiple('fract', this.listNodes, this.listStart, delta)
	},

	end: function() {
		this.save = Math.abs(this.pipe.obvFract.read() - this.fract) > Geo.EPS
		this.done = true
	}
})

Tool3D.Hole = f.unit(Tool3D, {
	unitName: 'Tool3D_Hole',

	hoverSuppress: true,
	intersectionMode: { wall: 'wall, hole', slope: 'wall, hole' },
	intersectionList: {
		wall: ['wall', 'slope'],
		hole: ['wall', 'slope']
	},

	setWall: function(wall, holes) {
		if(this.wall === wall) return

		if(this.wall) {
			this.wall.obvHoles.write(f.snot(this.wall.obvHoles.read(), holes))
		}

		this.wall = wall

		if(this.wall) {
			this.wall.obvHoles.write(f.sor(this.wall.obvHoles.read(), holes))
		}

		this.draw = true
	},

	getPointPos: function(wall, point, offset) {
		var ppos  = wall.getPlanePos(point)
		,   pmin  = wall.obvPmin.read()
		,   width = wall.obvWidth.read()

		return (ppos - pmin - offset) / width
	},

	getPointLow: function(wall, point, offset) {
		var bottom = wall.obvBottom.read()

		return point.y - bottom - offset
	}
})

Tool3D.AddHole = f.unit(Tool3D.Hole, {
	unitName: 'Tool3D_AddHole',

	pick: function(node, sid) {
		var source = { i: 0, p: 0, w: 1.1, h: 2.2, l: 0, t: sid || 0 }

		var sample = main.sampler.samples[sid]
		if(sample) {
			if(sample.type === 'window') {
				source.l = 0.9
			}

			source.w = sample.width
			source.h = sample.height + source.l
		}

		this.root = node.obvRoot.read()
		this.hole = new ANode.Hole(source)

		this.hole.obvBlank.write(true)

		this.offsetPos = 0
		this.offsetLow = (source.h - source.l) / 2
	},

	move: function(inter, ray) {
		var wall = inter ? inter.object.subnode.target : null
		if(!wall || ray.direction.dot(wall.obvNormal.read()) < 0) {
			this.setWall(wall, [this.hole])
		}

		if(!this.wall) return


		var point = this.intersectWallRay(this.wall, ray)
		if(!point) return

		this.draw |= this.hole.setOption('pos', this.getPointPos(this.wall, point, this.offsetPos))
		this.draw |= this.hole.setOption('low', this.getPointLow(this.wall, point, this.offsetLow))
	},

	end: function() {
		if(!this.wall) return

		this.hole.obvBlank.write(false)

		delete this.hole
		delete this.wall

		this.draw = true
		this.done = true
		this.save = true
	},

	drop: function() {
		if(this.hole) this.setWall(null, [this.hole])
		this.draw = true
	}
})

Tool3D.MoveHole = f.unit(Tool3D.Hole, {
	unitName: 'Tool3D_MoveHole',

	pick: function(node, options, selection) {
		this.listNodes = []
		this.listPos   = []
		this.listLow   = []

		this.hole = node
		if(!this.hole) return

		this.wall = this.hole.obvParent.read()

		for(var i = 0; i < selection.length; i++) {
			var node = selection[i]
			if(node instanceof ANode.Hole) {

				var wall = node.obvParent.read()
				if(wall === this.wall) {
					this.listNodes.push(node)
					this.listPos.push(node.obvPos.read())
					this.listLow.push(node.obvLow.read())
				}
			}
		}
	},

	start: function(inter, ray) {
		this.startPos  = this.hole.obvPos.read()
		this.startLow  = this.hole.obvLow.read()
		this.startWall = this.wall

		var point = this.intersectWallRay(this.wall, ray)
		if(point) {
			var width = this.wall.obvWidth.read()
			this.offsetPos = (this.getPointPos(this.wall, point, 0) - this.startPos) * width
			this.offsetLow = this.getPointLow(this.wall, point, 0) - this.startLow

		} else {
			this.offsetPos = 0
			this.offsetLow = this.hole.obvHeight.read() / 2
		}
	},

	move: function(inter, ray) {
		if(!this.moved) return

		for(var i = 0; i < this.listNodes.length; i++) {
			var node = this.listNodes[i]

			if(!node.obvBlank.read()) {
				node.obvBlank.write(true)
				this.draw = true
			}
		}

		var wall = inter ? inter.object.subnode.target : this.wall
		if(wall !== this.wall && ray.direction.dot(wall.obvNormal.read()) < 0) {
			this.setWall(wall, this.listNodes)
		}

		var point = this.intersectWallRay(this.wall, ray)
		if(!point) return

		var pos = this.getPointPos(this.wall, point, this.offsetPos)
		,   low = this.getPointLow(this.wall, point, this.offsetLow)

		this.setMultiple('pos', this.listNodes, this.listPos, pos - this.startPos)
		this.setMultiple('low', this.listNodes, this.listLow, kbd.state.SHIFT ? 0 : low - this.startLow)
	},

	end: function() {
		var cx = Math.abs(this.hole.obvPos.read() - this.startPos) > Geo.EPS
		,   cy = Math.abs(this.hole.obvLow.read() - this.startLow) > Geo.EPS

		this.save |= this.wall !== this.startWall
		this.save |= this.moved && (cx || cy)

		if(!this.save) {
			this.setMultiple('pos', this.listNodes, this.listPos, 0)
			this.setMultiple('low', this.listNodes, this.listLow, 0)
		}

		for(var i = 0; i < this.listNodes.length; i++) {
			this.listNodes[i].obvBlank.write(false)
		}

		this.draw = true
		this.done = true
	}
})

Tool3D.CloneHole = f.unit(Tool3D.MoveHole, {
	unitName: 'Tool3D_CloneHole',

	pick: function(node, options, selection) {
		Tool3D.MoveHole.prototype.pick.call(this, node, options, selection)

		for(var i = 0; i < this.listNodes.length; i++) {
			var hole = this.listNodes[i]
			,   clone = hole.clone()

			if(this.hole === hole) {
				this.hole = clone
			}

			this.listNodes[i] = clone
		}

		this.wall = null
	}
})

Tool3D.MoveCut = f.unit(Tool3D, {
	unitName: 'Tool3D_MoveCut',

	pick: function(node, options, selection) {
		this.listNodes = []
		this.listPos = []

		this.cut = node
		if(!this.cut) return

		for(var i = 0; i < selection.length; i++) {
			var node = selection[i]

			if(node instanceof ANode.Cut) {
				this.listNodes.push(node)
				this.listPos.push(node.obvPos.read())
			}
		}
	},

	start: function(inter, ray) {
		if(!inter || !this.cut) return

		var page  = inter.object.subnode.targets.cutpage
		this.wall = page.obvWall0.read()

		this.horizontal = this.cut instanceof ANode.HCut

		var point = this.intersectWallRay(this.wall, ray)

		this.startValue = this.cut.obvPos.read()
		this.startOffset = point ? this.getPos(point) - this.startValue : 0
	},

	getPos: function(point) {
		return this.horizontal ? point.y : this.wall.getPlanePos(point)
	},

	move: function(inter, ray) {
		if(!this.cut) return

		var point = this.intersectWallRay(this.wall, ray)
		if(!point) return

		var delta = this.getPos(point) - this.startOffset - this.startValue
		this.setMultiple('pos', this.listNodes, this.listPos, delta)

		this.draw = true
		this.save = true
	},

	end: function() {
		if(!this.moved || Math.abs(this.cut.obvPos.read() - this.startValue) < Geo.EPS) {
			this.setMultiple('pos', this.listNodes, this.listPos, 0)
			this.save = false
		}
		delete this.cut
		this.done = true
	}
})

Tool3D.AddCut = f.unit(Tool3D, {
	unitName: 'Tool3D_AddCut',

	hoverSuppress: true,
	intersectionMode: { wall: 'wall', slope: 'wall' },
	intersectionList: { wall: ['wall', 'slope'] },

	init: function() {
		this.line = new THREE.Line(new THREE.Geometry)
		this.line.material.color.set('lime')

		this.create()
	},

	create: function() {

	},

	pick: function(node) {
		this.root = node.obvRoot.read()
		this.cutter = this.root.obvCutter.read()

		this.root.object.add(this.line)
	},

	drop: function() {
		this.destroyLine()
	},

	destroyLine: function() {
		this.root.object.remove(this.line)
		this.line.geometry.dispose()
	}
})

Tool3D.AddHorizontalCut = f.unit(Tool3D.AddCut, {
	unitName: 'Tool3D_AddHorizontalCut',

	start: function(inter) {
		if(!inter) return

		this.cutter.cutHorizontally(inter.point.y)

		this.done = true
		this.save = true
		this.draw = true
	},

	setContour: function(contour) {
		if(this.contour === contour) return
		this.contour = contour
		this.destroyLine()

		if(this.contour) {
			var vertices = this.contour.obvVertices.read()

			this.line.geometry = new THREE.Geometry
			this.line.geometry.vertices = vertices.concat(vertices[0])
			this.root.object.add(this.line)
		}

		this.draw = true
	},

	move: function(inter) {
		if(!inter) return this.setContour(null)

		var wall = inter.object.subnode.target
		this.setContour(wall.obvParent.read())

		this.line.position.y = inter.point.y
		this.draw = true
	}
})

Tool3D.AddVerticalCut = f.unit(Tool3D.AddCut, {
	unitName: 'Tool3D_AddVerticalCut',

	create: function() {
		this.lineA = new THREE.Vector3
		this.lineB = new THREE.Vector3
		this.line.geometry.vertices.push(this.lineA, this.lineB)
	},

	start: function(inter) {
		if(!inter) return

		var wall = inter.object.subnode.target
		,   plid = wall.obvPlid.read()
		,   pos  = wall.getPlanePos(inter.point)

		this.cutter.cutVertically(pos, plid)

		this.done = true
		this.save = true
		this.draw = true
	},

	setVisible: function(visible) {
		if(this.visible === visible) return
		this.visible = visible

		if(this.visible) {
			this.root.object.add(this.line)
		} else {
			this.destroyLine()
		}

		this.draw = true
	},

	move: function(inter) {
		this.setVisible(!!inter)

		if(!inter) return

		var wall = inter.object.subnode.target
		,   pos = wall.getPlanePos(inter.point)

		var low  = wall.findCoplanarWall(pos, false).pop() || wall
		,   high = wall.findCoplanarWall(pos, true ).pop() || wall

		var minY = low.obvBottom.read()
		,   maxY

		if(high instanceof ANode.Slope) {
			maxY = high.getHeightAt(high.getPlanePos(inter.point))
		} else {
			maxY = high.obvBottom.read() + high.obvHeight.read()
		}

		this.lineA.copy(inter.point).setY(minY)
		this.lineB.copy(inter.point).setY(maxY)
		this.line.geometry.verticesNeedUpdate = true
		this.line.position.copy(wall.obvNormal.read()).setLength(0.01)

		this.draw = true
	}
})


Tool3D.AddJoin = f.unit(Tool3D, {
	unitName: 'Tool3D_AddJoin',
	hoverSuppress: true,
	intersectionMode: { wall: 'wall', slope: 'wall' },
	intersectionList: { wall: ['piece'] },

	pick: function() {
		this.join = new ANode.Join
	},

	start: function(inter, ray) {
		if(!inter) return

		this.setByInter(inter)
		delete this.join

		this.done = true
		this.save = true
		this.draw = true
	},

	move: function(inter, ray) {
		if(!this.join) return

		if(inter) {
			this.setByInter(inter)
			this.draw = true

		} else if(this.tile) {
			delete this.tile

			this.join.unmount()
			this.draw = true
		}
	},

	setByInter: function(inter) {
		var EPS = Geo.EPS

		var piece = inter.object.subnode.target
		,   tile  = piece.obvTile.read()
		,   page  = piece.obvParent.read()
		,   wall  = page.obvWall0.read()

		var px = wall.getPlanePos(inter.point)
		,   py = inter.point.y


		if(this.tile !== tile) {
			this.tile = tile
			this.join.unmount()

			if(!tile) return

			this.vertical = this.tile.obvVertical.read()
			this.join.obvPos.write(this.vertical ? py : px)
			this.tile.obvJoins.write(this.tile.obvJoins.read().concat(this.join))
		}

		this.join.obvPos.write(this.vertical ? py : px)
	},

	drop: function() {
		if(this.join) {
			this.join.unmount()
		}
		delete this.join
		delete this.tile
	}
})


Tool3D.MoveJoin = f.unit(Tool3D, {
	unitName: 'Tool3D_MoveJoin',

	pick: function(node, options, selection) {
		this.listNodes = []
		this.listPos   = []

		this.join = node
		if(!this.join) return

		for(var i = 0; i < selection.length; i++) {
			var node = selection[i]
			if(node instanceof ANode.Join) {
				this.listNodes.push(node)
				this.listPos.push(node.obvPos.read())
			}
		}
	},

	start: function(inter, ray) {
		if(!inter || !this.join) return

		this.wall = inter.object.subnode.targets.wall
		         || inter.object.subnode.targets.slope

		this.tile = this.join.obvParent.read()

		this.vertical = this.tile.obvVertical.read()
		this.startPos = this.join.obvPos.read()

		var point = this.intersectWallRay(this.wall, ray)
		if(point) {
			var pos = this.vertical ? point.y : this.wall.getPlanePos(point)
			this.offsetPos = pos - this.startPos
		} else {
			this.offsetPos = 0
		}
	},

	move: function(inter, ray) {
		if(!this.join || !this.wall) return

		var point = this.intersectWallRay(this.wall, ray)
		if(!point) return


		var pos = this.vertical ? point.y : this.wall.getPlanePos(point)

		this.setMultiple('pos', this.listNodes, this.listPos, pos - this.startPos - this.offsetPos)

		this.draw = true
		this.save = true
	},

	end: function() {
		if(!this.moved || Math.abs(this.join.obvPos.read() - this.startPos) < Geo.EPS) {
			this.setMultiple('pos', this.listNodes, this.listPos, 0)
			this.save = false
		}
		delete this.join
		this.done = true
	}
})
