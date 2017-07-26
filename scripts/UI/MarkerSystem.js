UI.MarkerSystem = f.unit(Block, {
	unitName: 'UI_MarkerSystem',
	ename: 'marker-system noselect',

	create: function() {
		this.markers = []
	},

	addMarker: function(position, text, connection) {
		if(!this.projector) return

		var marker = new UI.Marker({
			eroot: this.element,
			events: this.events,
			point: this.projector.addPoint(),
			connection: connection
		})

		if(position) {
			marker.point.world.copy(position)
		}

		this.updateMarker(marker)
		this.markers.push(marker)
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
		marker.scale = 0.7 * (1.3 - Math.min(0.7, marker.point.distance / 1.5))

		marker.visible.set(marker.point.visible, 'onScreen')

		if(marker.visible.value) {
			marker.update(marker.point.screen, index)
			// marker.updateState()
		}
	}
})


UI.Marker = f.unit(Block.Tip, {
	unitName: 'UI_Marker',
	ename: 'marker hand',
	align: 'top',
	distance: 100,
	arrowWidth: 0,

	create: function() {
		dom.setclass(this.arrow,   { 'tip-arrow':   false, 'marker-arrow':   true })
		dom.setclass(this.content, { 'tip-content': false, 'marker-content': true })

		this.elemId   = dom.span('marker-id',   this.content)
		this.elemKey  = dom.span('marker-key',  this.content)
		this.elemInfo = dom.span('marker-info', this.content)


		this.state = {
			hover: false,
			selected: false,
			connected: false,
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

		this.watchEvents.push(
			new EventHandler(this.onTap, this).listen('tap', this.element))
	},

	updateState: function() {
		for(var key in this.state) {
			this.state[key] = this.connection[key]
		}

		dom.setclass(this.element, this.state)
		this.visible.set(!this.state.connected, 'connected')
	},

	onTap: function() {
		this.events.emit('marker_tap', this)
	},

	update: function(point, z) {
		var x = Math.round(point.x)
		,   y = Math.round(point.y)

		this.move(x, y, this.align)
		this.element.style.zIndex = z
	},

	move: function(x, y, align, distance) {
		Block.Tip.prototype.move.apply(this, arguments)

		var as = this.arrow.style
		switch(this.lastAlign) {
			case 'left':
			case 'right':
				as.width = this.distance +'px'
				as.height = '1px'
			break

			case 'top':
			case 'bottom':
				as.width = '1px'
				as.height = this.distance +'px'
			break
		}
	}
})
