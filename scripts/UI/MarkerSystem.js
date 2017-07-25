UI.MarkerSystem = f.unit(Block, {
	ename: 'marker-system noselect',

	create: function() {
		this.markers = []
	},

	addMarker: function(position, data) {
		if(!this.projector) return

		var marker = new UI.Marker({
			eroot: this.element,
			events: this.events,
			point: this.projector.addPoint()
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

			dom.remove(marker.element)
			marker.unbind()
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
			marker.update(marker.point.screen.x, marker.point.screen.y, 1, index)
		}
	}
})


UI.Marker = f.unit(Block, {
	ename: 'marker hand',

	create: function() {
		this.bind()
	},

	visibleMethod: function(element, visible) {
		if(visible) dom.append(this.eroot, element)
		else dom.remove(element)
	},

	bind: function() {
		this.hTap = new EventHandler(this.onTap, this).listen('tap', this.element)
	},

	unbind: function() {
		this.hTap.release()
	},

	onTap: function() {
		this.events.emit('marker_tap', this)
	},

	update: function(x, y, s, z) {
		if( this._x !== x
		||  this._y !== y
		||  this._s !== s) {

			this._x = Math.round(x)
			this._y = Math.round(y)
			this._s = s
			this._transform(this.element, this._x, this._y, this._s)
		}

		this.element.style.zIndex = z
	},

	_transform: function(element, x, y, s) {
		var style = ' translateX('+ f.hround(x) +'px)'
		          + ' translateY('+ f.hround(y) +'px)'
		          + '      scale('+ f.hround(s) +')'

		element.style.webkitTransform = style
		element.style.   mozTransform = style
		element.style.    msTransform = style
		element.style.     OTransform = style
		element.style.      transform = style
	}
})
