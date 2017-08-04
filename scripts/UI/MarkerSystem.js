UI.MarkerSystem = f.unit(Block, {
	unitName: 'UI_MarkerSystem',
	ename: 'marker-system noselect',

	create: function() {
		this.markers = []

		this.markersVisible = new Gate(Gate.AND, false)
		this.markersVisible.events.on('change', this.onMarkersVisible, this)
	},

	onMarkersVisible: function(visible) {
		for(var i = 0; i < this.markers.length; i++) {
			var m = this.markers[i]
			if(!m.undisposable) m.visible.set(visible, 'system')
		}
	},

	addMarker: function(position, text, con, undisposable) {
		if(!this.projector) return

		var marker = new UI.Marker({
			eroot: this.element,
			events: this.events,
			projector: this.projector,
			// point: this.projector.addPoint(),
			connection: con
		})

		if(position) {
			marker.point.world.copy(position)
		}

		if(con) {
			con.getInnerPosition(marker.inner.world)
		}

		if(undisposable) {
			marker.undisposable = true
		} else {
			marker.visible.set(this.markersVisible.value, 'system')
		}

		marker.updateState()
		// this.updateMarker(marker)

		this.markers.push(marker)

		0&& console.log('addMarker',
			con.data.id,
			marker.point.world,
			con.connected ? con.master ? 'master' : 'slave' : 'empty')
		return marker
	},

	removeMarker: function(marker) {
		var index = this.markers.indexOf(marker)
		if(index !== -1) {
			this.markers.splice(index, 1)

			marker.destroy()
		}
	},

	clear: function() {
		while(this.markers.length) this.removeMarker(this.markers[0])
	},

	update: function() {
		f.sort(this.markers, this.distanceSort, this)
		this.markers.forEach(this.updateMarker, this)
	},

	distanceSort: function(marker) {
		return -marker.point.distance
	},

	updateMarker: function(marker, index) {
		marker.element.style.zIndex = index
		marker.update()
	}
})


UI.Marker = f.unit(Block.Tip, {
	unitName: 'UI_Marker',
	ename: 'marker hand',
	hidden: true,

	align: 'top',
	distance: 100,
	arrowWidth: 1,
	arrowPadding: -2,

	create: function() {
		dom.remclass(this.arrow,   'tip-arrow')
		dom.remclass(this.content, 'tip-content')

		dom.addclass(this.arrow,   'marker-arrow')
		dom.addclass(this.content, 'marker-content marker-interactive out-03')

		this.arrowLine = dom.div('marker-arrow-line marker-interactive out-03', this.arrow)

		this.elemGroup = dom.span('marker-group', this.content)
		this.elemInfo = dom.span('marker-info', this.content)


		this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
		this.svg.className.baseVal = 'marker-depth-line marker-interactive out-03'

		this.svgLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
		this.svgLine.setAttribute('x1', 0)
		this.svgLine.setAttribute('y1', 0)

		dom.append(this.svg, this.svgLine)
		dom.append(this.element, this.svg)


		this.state = {
			hover: false,
			selected: false,
			connected: false,
			inactive: false,
			master: false
		}

		if(this.connection) {
			dom.text(this.elemInfo, this.connection.data.object.name)

			this.connection.events.when({
				'connect': this.updateState,
				// 'select': this.updateState
			}, this)

		}

		this.point = this.projector.addPoint()
		this.inner = this.projector.addPoint()

		this.watchEvents.push(
			new EventHandler(this.onTap, this).listen('tap', this.element),
			new EventHandler(this.onEnter, this).listen('mouseenter', this.element),
			new EventHandler(this.onLeave, this).listen('mouseleave', this.element))
	},

	destroy: function() {
		Block.Tip.prototype.destroy.call(this)

		if(this.connection) {
			this.connection.events.off(null, null, this)
		}
		this.projector.remPoint(this.point)

		Atlas.free(this.elemGroup)
	},

	updateState: function() {
		if(!this.connection) return

		for(var key in this.state) {
			var val = this.connection[key]

			this.state[key] = val instanceof Gate ? val.value : val
		}

		Atlas.free(this.elemGroup)
		dom.text(this.elemGroup, '')

		var g = this.connection.group
		if(isNaN(g)) {

		} else if(g === -1) {
			Atlas.set(this.elemGroup, 'i-deny')

		} else {
			dom.text(this.elemGroup, String.fromCharCode(g + 65))
		}
		this.visible.set(!isNaN(g), 'mapped')


		dom.setclass(this.element, this.state)
		this.visible.set(!this.state.connected, 'available')
	},

	onEnter: function() {
		this.events.emit('marker_enter', this)
	},

	onLeave: function() {
		this.events.emit('marker_leave', this)
	},

	onTap: function() {
		this.events.emit('marker_tap', this)
	},

	update: function() {
		var visible = this.visible.value || this.inTransition

		var px = Math.round(this.point.screen.x)
		,   py = Math.round(this.point.screen.y)

		var ix = this.inner.screen.x
		,   iy = this.inner.screen.y

		var dx = ix - px
		,   dy = iy - py

		var vdepth = visible && this.connection && this.connection.depth && !isNaN(dx) && !isNaN(dy)

		dom.display(this.svg, vdepth)
		if(!visible) return


		this.scale = 0.7 * (1.3 - Math.min(0.7, this.point.distance / 1.5))

		// this.visible.set(this.point.visible, 'onScreen')
		// if(!this.visible.value) return


		this.move(px, py, this.align)

		if(!vdepth) return

		var sw = Math.ceil(Math.abs(dx))
		,   sh = Math.ceil(Math.abs(dy))
		,   ss = Math.max(sw, sh)

		this.svg.setAttribute('width',  ss *2 +2)
		this.svg.setAttribute('height', ss *2 +2)
		this.svg.setAttribute('viewBox', [-ss -1, -ss -1, ss *2 +2, ss *2 +2].join(' '))
		this.svg.style.marginLeft = -ss -1 +'px'
		this.svg.style.marginTop  = -ss -1 +'px'
		this.svg.style.left = px - this.elementPoint.x +'px'
		this.svg.style.top  = py - this.elementPoint.y +'px'

		this.svgLine.setAttribute('x2', dx)
		this.svgLine.setAttribute('y2', dy)
	},

	move: function() {
		Block.Tip.prototype.move.apply(this, arguments)

		var distance = Math.max(0, this.lastDistance)

		var as  = this.arrowLine.style
		,   asw = this.arrowWidth +'px'
		,   asl = distance +'px'

		as.left = as.right = as.top = as.bottom = 'auto'
		as.width = as.height = asw

		switch(this.lastAlign) {
			case 'left':
				as.width = asl
				as.left = '100%'
			break

			case 'right':
				as.width = asl
				as.right = '100%'
			break

			case 'top':
				as.height = asl
				as.top = '100%'
			break

			case 'bottom':
				as.height = asl
				as.bottom = '100%'
			break
		}
	}
})
