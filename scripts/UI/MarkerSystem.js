UI.MarkerSystem = f.unit(Block, {
	unitName: 'UI_MarkerSystem',
	ename: 'marker-system noselect',

	create: function() {
		this.markers = []
	},

	addMarker: function(position, text, con) {
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

	align: 'top',
	distance: 100,
	arrowWidth: 1,
	arrowPadding: -2,

	create: function() {
		dom.setclass(this.arrow,   { 'tip-arrow':   false, 'marker-arrow':   true })
		dom.setclass(this.content, { 'tip-content': false, 'marker-content': true })

		this.arrowLine = dom.div('marker-arrow-line', this.arrow)

		this.elemId   = dom.span('marker-id',   this.content)
		this.elemKey  = dom.span('marker-key',  this.content)
		this.elemInfo = dom.span('marker-info', this.content)


		this.state = {
			hover: false,
			selected: false,
			connected: false,
			inactive: false,
			master: false
		}
		this.updateState()

		if(this.connection) {
			dom.text(this.elemId,   this.connection.data.id)
			dom.text(this.elemKey,  this.connection.data.key)
			dom.text(this.elemInfo, this.connection.data.object.name)

			this.connection.events.when({
				'connect': this.updateState,
				// 'select': this.updateState
			}, this)

		}

		this.point = this.projector.addPoint()

		this.watchEvents.push(
			new EventHandler(this.onTap, this).listen('tap', this.element))
	},

	destroy: function() {
		Block.Tip.prototype.destroy.call(this)

		this.connection.events.off('connect', null, this)
		this.projector.remPoint(this.point)
	},

	updateState: function() {
		for(var key in this.state) {
			this.state[key] = this.connection[key]
		}

		dom.setclass(this.element, this.state)
		this.visible.set(!this.state.connected, 'available')
	},

	onTap: function() {
		this.events.emit('marker_tap', this)
	},

	update: function() {
		this.scale = 0.7 * (1.3 - Math.min(0.7, this.point.distance / 1.5))

		// this.visible.set(this.point.visible, 'onScreen')
		// if(!this.visible.value) return

		var x = Math.round(this.point.screen.x)
		,   y = Math.round(this.point.screen.y)

		this.move(x, y, this.align)
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