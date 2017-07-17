Draw2D = f.unit({
	unitName: 'Draw2D',

	scale: 1,
	selectionColor: '#619FD1',
	selectionColor: '#E8E118',
	invalidColor: '#EE5533',
	hoverColor: 'skyblue',
	holeColor: '#0a63ae',

	init: function(context, buffer, view) {
		var dw = 22
		,   dl = 8

		// this.slopeFiller        = this.makeDashPattern(8, 1, 'transparent', '#333')
		this.slopeWalls         = this.makeDashPattern(dw, dl, 'transparent', '#333')
		this.slopeWallsGable    = this.makeDashPattern(dw, dl, 'white', '#333')
		this.slopeWallsInactive = this.makeDashPattern(dw, dl, 'transparent', 'rgba(0, 0, 0, 0.2)')
		this.slopeWallsHover    = this.makeDashPattern(dw, dl, this.hoverColor, '#333')
		this.slopeWallsSelected = this.makeDashPattern(dw, dl, this.selectionColor, '#333')

		this.context = context
		this.buffer  = buffer
		this.view    = view
	},

	strokeLine: function(a, b) {
		this.context.beginPath()
		this.context.moveTo(a.x, a.y)
		this.context.lineTo(b.x, b.y)
		this.context.stroke()
	},

	applyPath: function(points, close) {
		if(!points || !points.length) return

		this.context.beginPath()

		for(var i = 0; i < points.length; i++) {
			var point = points[i]
			,   screen = this.getScreenPoint(point)

			if(i) {
				this.context.lineTo(screen.x, screen.y)
			} else {
				this.context.moveTo(screen.x, screen.y)
			}
		}

		if(close) this.context.closePath()
	},

	getScreenPoint: function(point) {
		return this.view.toScreen(point)
	},

	makeDashPattern: function(size, width, back, front) {
		var g = document.createElement('canvas')
		var c = g.getContext('2d')

		g.width = g.height = size
		c.fillStyle = back
		c.strokeStyle = front
		c.lineWidth = width
		c.fillRect(0, 0, size, size)
		c.beginPath()
		c.moveTo(size * 2, -size)
		c.lineTo(-size, size * 2)
		c.moveTo(size * 2, 0)
		c.lineTo(0, size * 2)
		c.moveTo(size, -size)
		c.lineTo(-size, size)
		c.stroke()

		return c.createPattern(g, 'repeat')
	},

	debugLine: function(points, color, open) {
		var s = new THREE.Vector2

		main.v2.worldToScreen(points[0], s)

		this.context.strokeStyle = color || 'white'
		this.context.beginPath()
		this.context.moveTo(s.x, s.y)

		for(var i = 1; i < points.length; i++) {
			var p = points[i]

			main.v2.worldToScreen(p, s)
			this.context.lineTo(s.x, s.y)
		}
		if(!open) {
			this.context.closePath()
		}
		this.context.stroke()
	},

	outlineText: function(text, x, y, color) {
		this.context.lineWidth = 4
		this.context.font = 'bold 11px monospace'
		this.context.strokeStyle = 'black'
		this.context.fillStyle = color
		this.context.strokeText(text, x, y)
		this.context.fillText(text, x, y)
	},

	footnote: function(a, b, n, offset, excess) {
		if(isNaN(offset)) offset = 12
		if(isNaN(excess)) excess = 1.5

		var ctx = this.context

		ctx.strokeStyle = '#444'
		ctx.lineWidth = 1

		var lx = n.x * offset
		,   ly = n.z * offset
		,   hx = n.x * offset * excess
		,   hy = n.z * offset * excess

		ctx.beginPath()
		ctx.moveTo(a.x, a.y)
		ctx.lineTo(a.x + hx, a.y + hy)
		ctx.stroke()

		ctx.beginPath()
		ctx.moveTo(b.x, b.y)
		ctx.lineTo(b.x + hx, b.y + hy)
		ctx.stroke()

		ctx.beginPath()
		ctx.moveTo(a.x + lx, a.y + ly)
		ctx.lineTo(b.x + lx, b.y + ly)
		ctx.stroke()
	},

	setScale: function(scale) {
		this.scale = scale
	},

	draw: function(tree, mode, activeLayer, hiddenLayers) {
		var w = this.context.canvas.width
		,   h = this.context.canvas.height

		this.mode = mode

		this.context.save()
		this.context.setTransform(1, 0, 0, 1, 0, 0)

		var original = this.context
		this.context = this.buffer

		var floors = tree.obvFloors.read()
		for(var i = 0; i < floors.length; i++) {
			if(hiddenLayers[i] || i === activeLayer) continue

			this.buffer.save()
			this.drawLayer(floors[i], false)

			this.buffer.globalCompositeOperation = 'destination-in'
			this.buffer.setTransform(1, 0, 0, 1, 0, 0)
			this.buffer.fillStyle = 'rgba(0, 0, 0, 0.3)'
			this.buffer.fillRect(0, 0, w, h)

			original.drawImage(this.buffer.canvas, 0, 0)

			this.buffer.clearRect(0, 0, w, h)
			this.buffer.restore()
		}
		this.context = original
		this.context.restore()

		var currLayer = floors[activeLayer]
		if(currLayer) {
			this.drawLayer(currLayer, true)
		}
	},

	drawLayer: function(node, active) {
		if(!node.obvVisible.read()) return

		this.layerActive = active

		var boxes = node.obvBoxes.read()
		,   roofs = node.obvRoofs.read()

		boxes.forEach(this.drawBox, this)
		roofs.forEach(this.drawRoof, this)
	},

	drawBox: function(node) {
		if(!node.obvVisible.read()) return

		var center   = node.obvCenter.read()
		,   points   = node.obvPoints.read()
		,   walls    = node.obvWalls.read()
		,   vertices = node.obvVertices.read()

		var helpers  = node.helpers
		,   open     = node.open
		,   blank    = node.obvBlank.read()
		,   selected = node.obvSelect.read()

		var ctx = this.context
		,   cen = this.getScreenPoint(center)

		ctx.fillStyle   = selected ? 'rgba(218, 232, 255, 0.6)' : 'rgba(255, 255, 255, 0.7)'
		ctx.strokeStyle = 'black'
		ctx.lineWidth   = 10
		ctx.miterLimit  = 8

		this.applyPath(vertices, !open)
		if(!open) ctx.fill()
		ctx.stroke()

		if(this.layerActive && this.mode.floor && !blank) {
			helpers.center.show(cen.x, cen.y)
		}

		if(walls.length > 1) walls.forEach(this.drawWall, this)

		if(this.mode.floor) {
			points.forEach(this.drawCorner, this)
		}
	},

	drawRoof: function(node) {
		if(!node.obvVisible.read()) return

		var center      = node.obvCenter.read()
		,   walls       = node.obvWalls.read()
		,   points      = node.obvPoints.read()
		,   ledgePoints = node.obvLedgePoints.read()

		var helpers  = node.helpers
		,   selected = node.obvSelect.read()
		,   blank    = node.obvBlank.read()

		var ctx = this.context
		,   cen = this.getScreenPoint(center)

		if(ledgePoints && ledgePoints.length) {
			ctx.fillStyle   = selected ? 'rgba(218, 232, 255, 0.6)' : 'rgba(255, 255, 255, 0.6)'
			ctx.strokeStyle = 'black'
			ctx.lineWidth   = 1
			ctx.miterLimit  = 1

			this.applyPath(ledgePoints, true)
			ctx.fill()
		}

		if(this.layerActive && this.mode.roof && !blank) {
			helpers.center.show(cen.x, cen.y)
		}

		ctx.globalAlpha = 1

		if(walls.length > 1) walls.forEach(this.drawSlope, this)

		if(this.mode.roof) {
			points.forEach(this.drawRoofCorner, this)
		}
	},

	drawWall: function(node) {
		if(!node.obvVisible.read()) return

		var prevWall   = node.obvPrevNode.read()
		,   nextWall   = node.obvNextNode.read()
		,   prevPoint  = node.obvPrevPoint.read()
		,   nextPoint  = node.obvNextPoint.read()
		,   prevVertex = prevPoint.obvVertex.read()
		,   nextVertex = nextPoint.obvVertex.read()

		var center  = node.obvCenter.read()
		,   normal  = node.obvNormal.read()
		,   contour = node.obvParent.read()
		,   width   = node.obvWidth.read()
		,   holes   = node.obvHoles.read()

		var selected = node.obvSelect.read()
		,   hover    = node.obvHover.read()
		,   helpers  = node.helpers

		var contourBlank = contour.obvBlank.read()

		var ctx = this.context
		,   prevScreen   = this.getScreenPoint(prevVertex)
		,   nextScreen   = this.getScreenPoint(nextVertex)
		,   centerScreen = this.getScreenPoint(center)

		if(this.layerActive && this.mode.floor && !contourBlank && width * this.scale > 30) {
			var x = centerScreen.x + normal.x * 18
			,   y = centerScreen.y + normal.z * 18

			var related = prevPoint.obvSelect.read() ? prevPoint
						: nextPoint.obvSelect.read() ? nextPoint
						: prevWall.obvSelect.read()  ? prevWall
						: nextWall.obvSelect.read()  ? nextWall
						: null

			this.footnote(prevScreen, nextScreen, normal, 12)
			helpers.width.show(x, y)
			helpers.width.setRelated(related)
		}

		if(selected || hover) {
			ctx.lineWidth   = 10
			ctx.strokeStyle =
				selected ? this.selectionColor :
				hover    ? this.hoverColor     :
				'black'
			this.strokeLine(prevScreen, nextScreen)
		}

		if(this.layerActive && selected && !contourBlank) {

			helpers.split.show(centerScreen.x, centerScreen.y)

			var dx = normal.x * 10
			,   dy = normal.z * 10
			ctx.lineWidth = 1
			ctx.strokeStyle = 'black'
			ctx.beginPath()
			ctx.moveTo(centerScreen.x - dx, centerScreen.y - dy)
			ctx.lineTo(centerScreen.x + dx, centerScreen.y + dy)
			ctx.stroke()
		}

		holes.forEach(this.drawHole, this)

		if(main.debug && this.layerActive) {
			var x = centerScreen.x - normal.x * 12
			,   y = centerScreen.y - normal.z * 12
			this.outlineText('w'+ node.obvMountIndex.read(), x, y, 'skyblue')
		}
	},

	drawSlope: function(node) {
		if(!node.obvVisible.read()) return

		var center     = node.obvCenter.read()
		,   normal     = node.obvNormal.read()
		,   alpha      = node.obvAlpha.read()
		,   width      = node.obvWidth.read()
		,   contour    = node.obvOuterContour.read()
		,   holes      = node.obvHoles.read()
		,   gable      = node.obvGable.read()
		,   prevPoint  = node.obvPrevPoint.read()
		,   nextPoint  = node.obvNextPoint.read()
		,   prevVertex = prevPoint.obvVertex.read()
		,   nextVertex = nextPoint.obvVertex.read()

		var selected = node.obvSelect.read()
		,   hover    = node.obvHover.read()
		,   helpers  = node.helpers

		var ctx = this.context
		,   one = this.getScreenPoint(prevVertex)
		,   two = this.getScreenPoint(nextVertex)
		,   cen = this.getScreenPoint(center)
		,   nor = normal

		if(contour && contour.length && !gable) {
			ctx.strokeStyle = 'black'
			ctx.miterLimit = 1
			ctx.lineWidth = 1.5

			this.applyPath(contour, true)
			ctx.stroke()
		}


		ctx.lineWidth  = 7
		ctx.miterLimit = 7
		ctx.lineCap = 'square'

		if(selected) {
			ctx.strokeStyle = this.slopeWallsSelected
		} else if(hover) {
			ctx.strokeStyle = this.slopeWallsHover
		} else if(this.mode.hole) {
			if(gable) {
				ctx.strokeStyle = 'black'
			} else {
				ctx.strokeStyle = this.slopeWallsInactive
			}
		} else {
			ctx.strokeStyle = this.slopeWalls
		}

		ctx.translate(one.x, one.y)
		ctx.rotate(alpha)

		ctx.beginPath()
		ctx.moveTo(0, 0)
		ctx.lineTo(width * this.scale, 0)
		ctx.stroke()

		ctx.rotate(-alpha)
		ctx.translate(-one.x, -one.y)


		if(this.layerActive && this.mode.roof
		&& (selected || hover)) {
			var x = cen.x + nor.x * 28
			,   y = cen.y + nor.z * 28

			this.footnote(one, two, nor, 20)
			helpers.width.show(x, y)

			if(selected) {
				helpers.split.show(cen.x, cen.y)
			}
		}

		holes.forEach(this.drawHole, this)

		if(main.debug && this.layerActive) {
			var sections = node.obvSections.read()

			var l = sections.length

			ctx.miterLimit = 1
			ctx.lineWidth = 1
			for(var i = 0; i < l; i++) {
				var s = sections[i]

				var p = [s.lowLeft, s.highLeft, s.highRight, s.lowRight]
				var c = f.softcolor(i / l)

				ctx.strokeStyle = f.rgba(c)
				ctx.fillStyle = f.rgba(c, 0.1)
				this.applyPath(p)
				ctx.stroke()
				ctx.fill()
			}

			if(hover) {
				var center = new THREE.Vector2
				,   length = contour.length
				for(var i = 0; i < length; i++) {
					var s = this.getScreenPoint(contour[i])

					center.add(s)
					this.outlineText(i, s.x, s.y, 'white')
				}
				center.multiplyScalar(1 / length)
				this.outlineText(index, center.x, center.y, 'yellow')
			}
		}
	},

	drawHole: function(node) {
		if(!node.obvVisible.read()) return

		var line   = node.obvLine.read()
		,   center = node.obvCenter.read()
		,   type   = node.obvSampleType.read()
		,   valid  = node.obvValid.read()
		,   wall   = node.obvParent.read()
		,   normal = wall.obvNormal.read()

		var helpers  = node.helpers
		,   selected = node.obvSelect.read()
		,   hover    = node.obvHover.read()
		,   blank    = node.obvBlank.read()

		var ctx = this.context
		,   one = this.getScreenPoint(line.start)
		,   two = this.getScreenPoint(line.end)
		,   cen = this.getScreenPoint(center)
		,   nor = normal

		if(this.layerActive && this.mode.door && !blank) {
			var x = cen.x - nor.x * 18
			,   y = cen.y - nor.z * 18

			this.footnote(one, two, nor, -12)
			helpers.width.show(x, y)
		}

		ctx.lineCap     = 'butt'
		ctx.lineWidth   = 10
		ctx.strokeStyle =
			!valid   ? this.invalidColor   :
			selected ? this.selectionColor :
			hover    ? this.hoverColor     :
			           this.holeColor

		this.strokeLine(one, two)

		switch(type) {
			case 'window':
				ctx.lineWidth   = 1
				ctx.strokeStyle = 'white'
			break

			case 'door':
				ctx.lineWidth   = 3
				ctx.strokeStyle = 'black'
			break
		}
		this.strokeLine(one, two)

		if(main.debug && this.layerActive) {
			var x = cen.x + nor.x * 12
			,   y = cen.y + nor.z * 12
			this.outlineText('h'+ node.obvMountIndex.read(), x, y, 'white')
		}
	},

	drawRoofCorner: function(node) {
		if(!node.obvVisible.read()) return

		var vertex = node.obvVertex.read()

		var selected = node.obvSelect.read()
		,   hover    = node.obvHover.read()

		var ctx = this.context
		var one = this.getScreenPoint(vertex)

		ctx.lineWidth   = 2
		ctx.fillStyle   = 'white'
		ctx.strokeStyle = 'black'

		if(hover   ) ctx.fillStyle = this.hoverColor
		if(selected) ctx.fillStyle = this.selectionColor

		ctx.beginPath()
		ctx.arc(one.x, one.y, 5, 0, 2 * Math.PI)
		ctx.fill()
		ctx.stroke()

		if(main.debug && this.layerActive) {
			this.outlineText('p'+ node.obvMountIndex.read(), one.x, one.y, 'lime')
		}
	},

	drawCorner: function(node) {
		if(!node.obvVisible.read()) return

		var vertex = node.obvVertex.read()

		var selected = node.obvSelect.read()
		,   hover    = node.obvHover.read()

		var ctx = this.context
		var one = this.getScreenPoint(vertex)

		ctx.lineWidth   = 5
		ctx.fillStyle   = 'white'
		ctx.strokeStyle = 'black'

		if(hover   ) ctx.strokeStyle = this.hoverColor
		if(selected) ctx.strokeStyle = this.selectionColor

		ctx.beginPath()
		ctx.arc(one.x, one.y, 5, 0, 2 * Math.PI)
		ctx.stroke()
		ctx.fill()

		if(main.debug && this.layerActive) {
			this.outlineText('p'+ node.obvMountIndex.read(), one.x, one.y, 'lime')
		}
	}
})
