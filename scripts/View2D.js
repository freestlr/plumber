View2D = f.unit(Block, {
	unitName: 'Block_View2D',

	ename: 'view-2d',

	scaleMin: 12,
	scaleMax: 300,
	scaleFactor: 1.1,
	hoverRadius: 10,

	visibleMethod: dom.visible,

	create: function() {
		this.glayer  = dom.div('graphics', this.element)

		this.gridcvs = dom.elem('canvas', null, this.glayer)
		this.gridctx = this.gridcvs.getContext('2d')

		this.canvas  = dom.elem('canvas', null, this.glayer)
		this.context = this.canvas.getContext('2d')

		this.buffer  = dom.elem('canvas', null)
		this.bufctx  = this.buffer.getContext('2d')

		this.scale   = new Gate(Gate.MULTIPLY, 1)
		this.drag    = new Drag(this.glayer)
		this.mouse0  = new THREE.Vector2
		this.mouse2  = new THREE.Vector2
		this.mouse3  = new THREE.Vector3
		this.helpers = new Helper2D.Root({ eroot: this.element })
		this.root    = new Draw2D(this.context, this.bufctx, this)

		this.obvWidth  = new Observable(0)
		this.obvHeight = new Observable(0)
		this.obvTree   = new Observable
		this.obvScale  = new Observable(1)
		this.obvDragX  = new Observable(0)
		this.obvDragY  = new Observable(0)
		this.obvGrid   = new Observable().set(this, this.readGrid)
		this.obvDraw   = new Observable().set(this, this.readDraw)
		this.obvHidden = new Observable({}).set(this, null, null, Geo.equalJSON)
		this.obvLayer  = new Observable
		this.obvFloor  = new Observable().set(this, this.readFloor)
		this.obvMode   = new Observable

		this.magnetOffset = new THREE.Vector3

		this.screenPointsPool = []

		this.sfleft   = dom.div('scrollfield left',   this.glayer)
		this.sfright  = dom.div('scrollfield right',  this.glayer)
		this.sftop    = dom.div('scrollfield top',    this.glayer)
		this.sfbottom = dom.div('scrollfield bottom', this.glayer)

		this.scaleTweenObject = {}
		this.scaleTween = new TWEEN.Tween(this.scaleTweenObject)
			.easing(TWEEN.Easing.Cubic.Out)
			// .easing(TWEEN.Easing.Linear.None)
			.onUpdate(this.scaleTweenUpdate, this)

		this.tools = {}
		this.makeTools(this.tools, {
			mpoint : Tool2D.MovePoint,
			mwall  : Tool2D.MoveWall,
			mslope : Tool2D.MoveSlope,
			mhole  : Tool2D.MoveHole,
			mcont  : Tool2D.MoveContour,
			square : Tool2D.AddFixedShape,
			lcorn  : Tool2D.AddFixedShape,
			rcorn  : Tool2D.AddFixedShape,
			cross  : Tool2D.AddFixedShape,
			tlike  : Tool2D.AddFixedShape,
			poly   : Tool2D.AddPolygon,
			window : Tool2D.AddHole,
			door   : Tool2D.AddHole
		})

		this.helpers.events.when({
			move   : this.nodeInteraction,
			mouse  : this.updatePointer,
			hover  : this.hover
		}, this)

		this.scale.events.on('change', this.onscale, this)

		dom.on('wheel',      this.element, this)
		dom.on('touchstart', this.glayer,  this)
		dom.on('touchmove',  this.glayer,  this)
		dom.on('touchend',   this.glayer,  this)
		dom.on('mousedown',  this.glayer,  this)
		dom.on('mousemove',  this.glayer,  this)
		dom.on('mouseup',    this.glayer,  this)
		dom.on('mouseenter', this.element, this)
		dom.on('mouseleave', this.element, this)
		dom.on('tap',        this.glayer,  this)

		this.scale.check(true)
	},

	handleEvent: function(e) {
		switch(e.type) {
			case 'wheel':      return this.onwheel(e)
			case 'touchstart': return this.ontouchstart(e)
			case 'touchmove':  return this.ontouchmove(e)
			case 'touchend':   return this.ontouchend(e)
			case 'mousedown':  return this.onmousedown(e)
			case 'mousemove':  return this.onmousemove(e)
			case 'mouseup':    return this.onmouseup(e)
			case 'mouseenter': return this.onover(e)
			case 'mouseleave': return this.onout(e)
			case 'tap':        return this.ontap(e)
		}
	},

	makeTools: function(tools, list) {
		for(var name in list) {
			var tool = tools[name] = new list[name](name)

			tool.mouse = this.mouse3
		}
	},

	autopickTool: function(node) {
		var tools = {
			point   : 'mpoint',
			slope   : 'mslope',
			wall    : 'mwall',
			hole    : 'mhole',
			roof    : 'mcont',
			box     : 'mcont'
		}

		if(node && node.name in tools) {
			this.pickTool(tools[node.name])
			this.tool.autopick = true
		}
	},

	pickTool: function(name, options) {
		if(!this.visible.value) return

		if(this.tool) this.dropTool()

		if(name in this.tools) {
			this.tool = this.tools[name]
			this.tool.pick(this.floor, options, this.obvMode.read())
			this.helpers.transparent.on()
		}
	},

	dropTool: function() {
		if(!this.visible.value || !this.tool) return

		this.tool.drop()
		if(this.tool.save) {
			this.commit()
		}
		this.tool.reset()
		delete this.tool.autopick
		delete this.tool

		this.drag.enable()
		this.helpers.transparent.off()
	},

	hover: function(object) {
		main.bus.emit('node_hover', object)
		dom.togclass(this.element, 'hover', !!object)
	},

	select: function(object) {
		if(!object) object = this.floor
		main.bus.emit('selection_set', [[object]])
	},

	nodeInteraction: function(node) {
		if(!this.tool) {
			this.select(node)
			this.autopickTool(node)
		}
		if(this.tool) {
			this.helpers.transparent.on()
			this.drag.disable()

			this.tool.start(node)
			this.tool.moves = 0
			this.tool.moved = false
		}
	},

	commit: function() {
		main.bus.emit('history_push')
	},

	onresize: function() {
		this.obvWidth.write(this.width)
		this.obvHeight.write(this.height)

		this.elementOffset = dom.offset(this.element)
	},

	onscale: function(scale) {
		this.hoverLimit  = this.hoverRadius * this.hoverRadius
		// if(has.touch) this.hoverLimit *= 3

		this.hoverScaled = this.hoverLimit / (scale * scale)


		this.drag.scale = 1 / scale
		this.root.setScale(scale)

		this.obvScale.write(scale)
	},

	updatePointer: function(event) {
		var point = event.changedTouches ? event.changedTouches[0] : event
		,   x = point.pageX
		,   y = point.pageY

		this.useMagnet = !event.ctrlKey
		this.mouse0.set(x, y)
		this.mouse2.set(x, y).sub(this.elementOffset)
		this.screenToWorld(this.mouse2, this.mouse3)
	},

	pointerStart: function() {
		this.down = true
		dom.addclass(this.element, 'down')

		if(kbd.state.SPACE) return

		var inter = this.intersection(this.mouse2, this.intersectionMode)
		this.hover(inter)
		this.nodeInteraction(inter)
	},

	pointerMove: function() {
		if(this.tool) {
			var inter = this.intersection(this.mouse2, this.tool.intersectionMode)

			this.tool.moves++
			this.tool.moved = this.tool.moves > 2
			this.tool.move(inter)

			if(this.useMagnet) {
				var magnetPoint = this.magnet(this.tool.magnetPoints, this.tool.alignLines)
				if(magnetPoint) {
					this.tool.magnet(this.magnetOffset, magnetPoint)
				}
			}

		} else if(!kbd.state.SPACE) {
			var inter = this.intersection(this.mouse2, this.intersectionMode)
			this.hover(inter)
		}
	},

	pointerEnd: function() {
		this.down = false
		dom.remclass(this.element, 'down')

		if(kbd.state.SPACE) return

		if(this.tool) {
			var inter = this.intersection(this.mouse2, this.tool.intersectionMode)
			this.tool.move(inter)

			if(this.tool.moved && this.useMagnet) {
				var magnetPoint = this.magnet(this.tool.magnetPoints, this.tool.alignLines)
				if(magnetPoint) {
					this.tool.magnet(this.magnetOffset, magnetPoint)
				}
			}
			this.tool.end(inter)

			if(this.tool.done) {
				if(this.tool.autopick) {
					this.dropTool()
				} else {
					main.bus.emit('tool_change', null)
				}

				this.select(this.intersection(this.mouse2, this.intersectionMode))
			}
		}
	},

	pointerZoom: function(e) {
		var a = e.touches[0]
		,   b = e.touches[1]

		var ax = a.pageX
		,   ay = a.pageY
		,   bx = b.pageX
		,   by = b.pageY
		,   dx = bx - ax
		,   dy = by - ay
		,   ds = Math.sqrt(dx * dx + dy * dy)
		,   cx = (ax + bx) / 2 - this.elementOffset.x - this.width  / 2
		,   cy = (ay + by) / 2 - this.elementOffset.y - this.height / 2

		this.zoom(ds * this.baseScale, cx, cy)
	},

	ontouchstart: function(e) {
		this.updatePointer(e)
		this.touchcount = e.touches.length

		if(this.touchcount === 1) {
			this.pointerStart()

		} else {
			var a  = e.touches[0]
			,   b  = e.touches[1]
			,   dx = b.pageX - a.pageX
			,   dy = b.pageY - a.pageY

			this.baseScale = this.scale.value / Math.sqrt(dx * dx + dy * dy)
		}

		e.preventDefault()
	},

	ontouchmove: function(e) {
		this.updatePointer(e)

		if(this.touchcount === 1) {
			this.pointerMove()

		} else {
			this.pointerZoom(e)
		}

		e.preventDefault()
	},

	ontouchend: function(e) {
		this.updatePointer(e)

		if(this.touchcount === 1) {
			this.pointerEnd()

		} else {
			return this.ontouchstart(e)
		}

		e.preventDefault()
	},

	onmousedown: function(e) {
		this.updatePointer(e)

		if(e.which !== 1) return

		this.pointerStart()
		e.preventDefault()
	},

	onmousemove: function(e) {
		this.updatePointer(e)
		this.pointerMove()
		if(this.down) {
			e.preventDefault()
		}
	},

	onmouseup: function(e) {
		this.updatePointer(e)

		if(e.which !== 1) return

		this.pointerEnd()
		e.preventDefault()
	},

	onover: function(e) {
		if(this.tool) this.tool.node.visible.on()
	},

	onout: function(e) {
		if(this.tool) this.tool.node.visible.off()
		this.hover(null)
	},

	ontap: function(e) {
		this.helpers.blur()
		main.bus.emit('blur')
	},

	onwheel: function(e) {
		var delta = e.wheelDeltaY || -e.deltaY
		,   value = delta / Math.abs(delta)

		if(isNaN(value)) return

		var zoom = Math.pow(this.scaleFactor, value)
		,   x = e.pageX - this.elementOffset.x - this.width  / 2
		,   y = e.pageY - this.elementOffset.y - this.height / 2

		this.zoom(this.scale.value * zoom, x, y)
	},

	onkey: function(e) {
		var hotkey = false

		if(kbd.down) switch(kbd.key) {
			case 'p':
				this.focusOnTree()
				hotkey = true
			break
		}

		if(!hotkey) switch(kbd.key) {
			case 'SPACE':
				this.helpers.transparent.set(kbd.down)
				dom.togclass(this.element, 'drag', kbd.down)
				this.hover(null)
				hotkey = true
			break

			case 'w':
			case 's':
			case 'a':
			case 'd':
			case 'U_ARR':
			case 'D_ARR':
			case 'L_ARR':
			case 'R_ARR':
				hotkey = true
			break
		}

		return hotkey
	},

	scaleTweenUpdate: function() {
		this.panTo(this.scaleTweenObject.x, this.scaleTweenObject.y)
		this.scale.set(this.scaleTweenObject.s, 'zoom')
	},

	zoomByTime: function(scale, time, x, y) {
		var os = this.scale.value
		,   ts = f.clamp(os / scale, this.scaleMin, this.scaleMax)
		,   ds = 1 / ts - 1 / os

		if(arguments.length <4) {
			x = 0
			y = 0
		}

		var tx = this.drag.offset.x + x * ds
		,   ty = this.drag.offset.y + y * ds

		this.tweenMoveTo(ts, tx, ty, time)
	},

	tweenMoveTo: function(s, x, y, t) {
		this.scaleTweenObject.x = this.drag.offset.x
		this.scaleTweenObject.y = this.drag.offset.y
		this.scaleTweenObject.s = this.scale.value

		this.scaleTween.to({ x: x, y: y, s: s }, t || 300).start()
	},

	zoom: function(scale, x, y) {
		scale = f.clamp(scale, this.scaleMin, this.scaleMax)

		var os = this.scale.value
		,   ds = 1 / scale - 1 / os

		if(arguments.length <3) {
			x = 0
			y = 0
		}

		this.drag.offset.x += x * ds
		this.drag.offset.y += y * ds
		this.drag.changed = true
		this.scale.set(scale, 'zoom')
	},

	panBy: function(dx, dy) {
		var x = this.drag.offset.x + dx / this.scale.value
		,   y = this.drag.offset.y + dy / this.scale.value

		this.panTo(x, y)
	},

	panTo: function(x, y) {
		if(x !== this.drag.offset.x
		|| y !== this.drag.offset.y) {
			this.drag.offset.x = x
			this.drag.offset.y = y
			this.drag.changed = true
		}
	},

	moveByKeyboard: function(dt) {
		var speed = 0.5
		,   dist  = speed * dt

		var nx = dist * (kbd.state.L_ARR || kbd.state.a)
		,   px = dist * (kbd.state.R_ARR || kbd.state.d)
		,   ny = dist * (kbd.state.U_ARR || kbd.state.w)
		,   py = dist * (kbd.state.D_ARR || kbd.state.s)

		this.panBy(nx - px, ny - py)
	},

	focusOnTree: function(time) {
		var scale = 1
		,   centerX = 0
		,   centerY = 0

		if(this.tree && this.tree.obvBoundingValid.read()) {
			var size   = this.tree.obvBoundingSize.read()
			,   center = this.tree.obvMassCenter.read()

			scale = 0.5 * Math.min(this.width / size.x, this.height / size.z)
			centerX = -center.x
			centerY = -center.z

		} else {
			scale = 50
			centerX = 0
			centerY = 0
		}

		if(time) {
			this.tweenMoveTo(scale, centerX, centerY, time)

		} else {
			this.zoom(scale)
			this.panTo(centerX, centerY)
		}
	},

	intersection: function(point, mode) {
		if(!mode || !this.tree || !this.floor) return

		var closest = new THREE.Vector2
		var radius = this.hoverLimit

		var boxes = this.floor.obvBoxes.read()
		for(var i = 0; i < boxes.length; i++) {
			var contour = boxes[i]

			if(mode.contour) {
				var screen = this.toScreen(contour.obvCenter.read())

				if(screen.distanceToSquared(point) < radius) return contour
			}

			if(mode.corner) {
				var points = contour.obvPoints.read()
				for(var j = 0; j < points.length; j++) {
					var corner = points[j]
					,   screen = this.toScreen(corner.obvVertex.read())

					if(screen.distanceToSquared(point) < radius) return corner
				}
			}

			if(mode.wall || mode.hole) {
				var walls = contour.obvWalls.read()
				for(var j = 0; j < walls.length; j++) {
					var wall = walls[j]

					if(mode.hole) {
						var holes = wall.obvHoles.read()
						for(var k = 0; k < holes.length; k++) {
							var hole = holes[k]
							,   line = hole.obvLine.read()
							,   screenA = this.toScreen(line.start)
							,   screenB = this.toScreen(line.end)

							Geo.closestPointToLine2(screenA, screenB, point, closest)
							if(closest.distanceToSquared(point) < radius) return hole
						}
					}

					if(mode.wall) {
						var line    = wall.obvLine.read()
						,   screenA = this.toScreen(line.start)
						,   screenB = this.toScreen(line.end)

						Geo.closestPointToLine2(screenA, screenB, point, closest)
						if(closest.distanceToSquared(point) < radius) return wall
					}
				}
			}
		}

		var roofs = this.floor.obvRoofs.read()
		for(var i = 0; i < roofs.length; i++) {
			var contour = roofs[i]

			if(mode.roof) {
				var screen = this.toScreen(contour.obvCenter.read())

				if(screen.distanceToSquared(point) < radius) return contour
			}

			if(mode.rcorner) {
				var points = contour.obvPoints.read()
				for(var j = 0; j < points.length; j++) {
					var corner = points[j]
					,   screen = this.toScreen(corner.obvVertex.read())

					if(screen.distanceToSquared(point) < radius) return corner
				}
			}

			if(mode.slope || mode.hole) {
				var walls = contour.obvWalls.read()
				for(var j = 0; j < walls.length; j++) {
					var wall = walls[j]

					if(mode.hole) {
						var holes = wall.obvHoles.read()
						for(var k = 0; k < holes.length; k++) {
							var hole = holes[k]
							,   line = hole.obvLine.read()
							,   screenA = this.toScreen(line.start)
							,   screenB = this.toScreen(line.end)

							Geo.closestPointToLine2(screenA, screenB, point, closest)
							if(closest.distanceToSquared(point) < radius) return hole
						}
					}

					if(mode.slope) {
						var line    = wall.obvLine.read()
						,   screenA = this.toScreen(line.start)
						,   screenB = this.toScreen(line.end)

						Geo.closestPointToLine2(screenA, screenB, point, closest)
						if(closest.distanceToSquared(point) < radius) return wall
					}
				}
			}
		}
	},

	magnet: function(targets, alines, apoints) {
		if(!this.tree || !targets || !targets.length) return

		var pointmode = targets.length === 1
		var target0 = targets[0]
		,   vertex0 = target0.obvVertex.read()

		var closest = new THREE.Vector3

		var hidden = this.obvHidden.read()
		,   layer  = this.obvLayer.read()

		var floors = this.tree.obvFloors.read()
		for(var i = 0; i < floors.length; i++) if(i === layer || !hidden[i]) {
			var floor    = floors[i]
			,   boxes    = floor.obvBoxes.read()
			,   roofs    = floor.obvRoofs.read()
			,   contours = boxes.concat(roofs)

			for(var j = 0; j < contours.length; j++) {
				var contour = contours[j]

				var points = contour.obvPoints.read()
				for(var k = 0; k < points.length; k++) {
					var point  = points[k]

					if(targets.indexOf(point) !== -1) continue

					var vertex = point.obvVertex.read()
					for(var l = 0; l < targets.length; l++) {
						var target = targets[l]
						,   target_vertex = target.obvVertex.read()

						this.magnetOffset.subVectors(vertex, target_vertex)

						var distance = this.magnetOffset.lengthSq()
						if(distance && distance < this.hoverScaled) return target
					}
				}

				if(pointmode) {
					var walls = contour.obvWalls.read()
					for(var k = 0; k < walls.length; k++) {
						var wall = walls[k]
						,   prevPoint = wall.obvPrevPoint.read()
						,   nextPoint = wall.obvNextPoint.read()

						if(target0 === prevPoint || target0 === nextPoint) continue

						var line = wall.obvLine.read()
						line.closestPointToPoint(vertex0, false, closest)
						this.magnetOffset.subVectors(closest, vertex0)

						var distance = this.magnetOffset.lengthSq()
						if(distance && distance < this.hoverScaled) return target0
					}
				}
			}
		}

		if(pointmode) {
			if(alines) for(var i = 0; i < alines.length; i++) {
				var line = alines[i]

				line.closestPointToPoint(vertex0, false, closest)
				this.magnetOffset.subVectors(closest, vertex0)

				var distance = this.magnetOffset.lengthSq()
				if(distance && distance < this.hoverScaled) return target0
			}

			if(apoints) for(var i = 0; i < apoints.length; i++) {
				var point = apoints[i]

				this.magnetOffset.subVectors(point, vertex0)

				var distance = this.magnetOffset.lengthSq()
				if(distance && distance < this.hoverScaled) return target0
			}
		}

		this.magnetOffset.set(0, 0, 0)
		return null
	},

	updateTransform: (function() {
		var ddX = 0
		,   ddY = 0

		return function() {
			if(ddX !== this.drag.delta.x
			|| ddY !== this.drag.delta.y) {
				ddX = this.drag.delta.x
				ddY = this.drag.delta.y

				var cs = this.canvas.style
				,   ms = this.helpers.element.style

				var tf = 'translate('+ ddX +'px,'+ ddY +'px)'

				cs.webkitTransform = tf
				cs.   mozTransform = tf
				cs.    msTransform = tf
				cs.     OTransform = tf
				cs.      transform = tf

				ms.webkitTransform = tf
				ms.   mozTransform = tf
				ms.    msTransform = tf
				ms.     OTransform = tf
				ms.      transform = tf
			}
		}
	})(),

	resetTransform: function() {
		this.canvas.style.webkitTransform = ''
	},

	screenToWorld: function(screen, world) {
		var s  = this.scale.value
		,   tx = this.drag.offset.x + this.width  / 2 / s
		,   ty = this.drag.offset.y + this.height / 2 / s

		world = world || new THREE.Vector3
		world.x = screen.x / s - tx
		world.z = screen.y / s - ty
		return world
	},

	worldToScreen: function(world, screen) {
		var s  = this.scale.value
		,   tx = this.drag.offset.x * s + this.width  / 2
		,   ty = this.drag.offset.y * s + this.height / 2

		screen = screen || new THREE.Vector2
		screen.x = world.x * s + tx
		screen.y = world.z * s + ty
		return screen
	},

	toScreen: function(world) {
		if(!world.__screen) {
			world.__screen = new THREE.Vector2
			this.screenPointsPool.push(world)
			this.worldToScreen(world, world.__screen)
		}
		world.__requested = true
		return world.__screen
	},

	updateScreenPool: function(pool) {
		var s  = this.obvScale.read()
		,   dx = this.obvDragX.read()
		,   dy = this.obvDragY.read()
		,   w  = this.obvWidth.read()
		,   h  = this.obvHeight.read()

		var tx = dx * s + w / 2
		,   ty = dy * s + h / 2

		for(var i = 0, l = pool.length; i < l; i++) {
			var world  = pool[i]
			,   screen = world.__screen

			screen.x = world.x * s + tx
			screen.y = world.z * s + ty
			world.__requested = false
		}
	},

	releaseScreenPool: function(pool) {
		for(var i = pool.length -1; i >= 0; i--) {
			var world = pool[i]

			if(!world.__requested) {
				pool.splice(i, 1)
				delete world.__requested
				delete world.__screen
			}
		}
	},

	treeNodeAdded: function(node) {
		for(var name in node.helpers) {
			this.helpers.addHelper(node.helpers[name])
		}
	},

	treeNodeRemoved: function(node) {
		for(var name in node.helpers) {
			this.helpers.removeHelper(node.helpers[name])
		}
	},

	setTree: function(tree) {
		this.tree = tree

		this.tree.events.when({
			'add_node': this.treeNodeAdded,
			'rem_node': this.treeNodeRemoved
		}, this)

		this.obvTree.write(tree)
	},

	readFloor: function() {
		var tree = this.obvTree.read()
		if(!tree) return null

		var index = this.obvLayer.read()
		,   floors = tree.obvFloors.read()

		var floor = floors[index]
		if(!floor) {
			floor = floors[0]

			this.obvLayer.write(0)
		}

		return this.floor = floor
	},

	setLayer: function(index) {
		this.obvLayer.write(index)
		this.obvFloor.read()
	},

	setMode: function(mode) {
		this.obvMode.write(mode)

		this.intersectionMode = {
			contour : mode.floor,
			corner  : mode.floor,
			wall    : mode.floor,
			slope   : mode.roof,
			roof    : mode.roof,
			rcorner : mode.roof,
			hole    : mode.door
		}
	},

	setLayerVisibility: function(index, visible) {
		var hidden = f.merge(this.obvHidden.read())
		hidden[index] = !visible
		this.obvHidden.write(hidden)
	},

	readGrid: function() {
		var width  = this.obvWidth.read()
		,   height = this.obvHeight.read()
		,   scale  = this.obvScale.read()
		,   dragX  = this.obvDragX.read()
		,   dragY  = this.obvDragY.read()

		if(!width || !height) return NaN

		var size  = 10
		,   lenX = width  / scale
		,   lenY = height / scale
		,   cenX = -lenX / 2
		,   cenY = -lenY / 2
		,   len  = Math.min(lenX, lenY)
		,   minX = cenX - dragX
		,   minY = cenY - dragY
		,   maxX = minX + lenX
		,   maxY = minY + lenY


		var pow = f.exp(len / size)
		var step = Math.pow(size, pow + 1)
		var n = Math.pow(len / size / step, 1 / this.scaleFactor)

		if(n < 0.5) step /= 10
		// else if(n < 0.8) step /= 5

		var startX = minX - (minX % step) - (minX >    0 ? step : 0)
		,   startY = minY - (minY % step) - (minY >    0 ? step : 0)
		,   endX   = maxX - (maxX % step) + (maxX < lenX ? step : 0)
		,   endY   = maxY - (maxY % step) + (maxY < lenY ? step : 0)
		,   countX = Math.round((endX - startX) / step)
		,   countY = Math.round((endY - startY) / step)
		,   offsX  = Math.round(startX / step)
		,   offsY  = Math.round(startY / step)


		var precision = f.exp(step)

		var c = this.gridctx
		c.canvas.width  = width
		c.canvas.height = height

		c.textAlign = 'right'
		for(var i = 0; i < countX; i++) {
			var p = startX + i * step
			var s = Math.round((p - minX) * scale)

			c.fillStyle = (i + offsX) % 10 ? '#ccc' : '#999'
			c.fillRect(s, 0, 1, height)
			c.fillStyle = 'black'
			c.fillText(f.pround(p, -precision), s - 5, 10)
		}
		for(var i = 0; i < countY; i++) {
			var p = startY + i * step
			var s = Math.round((p - minY) * scale)

			c.fillStyle = (i + offsY) % 10 ? '#ccc' : '#999'
			c.fillRect(0, s, width, 1)
			c.fillStyle = 'black'
			c.fillText(f.pround(p, -precision), width - 5, s + 10)
		}

		return NaN
	},

	readDraw: function() {
		var tree   = this.obvTree.read()
		,   width  = this.obvWidth.read()
		,   height = this.obvHeight.read()
		,   hidden = this.obvHidden.read()
		,   layer  = this.obvLayer.read()
		,   mode   = this.obvMode.read()

		if(!tree || !width || !height) return

		this.helpers.hide()

		this.canvas.width  = width
		this.canvas.height = height
		this.buffer.width  = width
		this.buffer.height = height

		this.updateScreenPool(this.screenPointsPool)
		this.root.draw(tree, mode, layer, hidden)
		this.releaseScreenPool(this.screenPointsPool)

		this.helpers.update()

		return NaN
	},

	update: function(t, dt, i) {
		if(!this.visible.value) return

		if(dt) this.moveByKeyboard(dt)

		if(this.drag.changed) {
			this.drag.changed = false

			this.obvDragX.write(this.drag.offset.x)
			this.obvDragY.write(this.drag.offset.y)
		}

		this.obvGrid.read()
		this.obvDraw.read()
	}
})
