function TileView() {
	this.events = new EventEmitter

	this.element  = dom.div('tileview')
	this.econtent = dom.div('content', this.element)
	this.ehelpers = dom.div('helpers', this.element)

	this.setClients()
	this.setLayout()
}

TileView.VERTICAL_SPLIT   = 1
TileView.HORIZONTAL_SPLIT = 2

TileView.prototype = {
	width: 0,
	height: 0,

	makeFrame: function(def, parent) {
		var frame = {
			source: def,
			parent: parent
		}
		if(def && def[0]) {
			frame.split = def[0] === 'v'
				? TileView.VERTICAL_SPLIT
				: TileView.HORIZONTAL_SPLIT

			frame.head = this.makeFrame(def[1], frame)
			frame.tail = this.makeFrame(def[2], frame)
			frame.position = def[3] || 0.5
			this.splits.push(frame)

		} else {
			frame.index = this.frames.length
			this.frames.push(frame)
		}
		return frame
	},

	setLayout: function(layout) {
		this.splits = []
		this.frames = []
		this.root = this.makeFrame(layout)

		this.helpers = []
		this.ehelpers.innerHTML = ''
		for(var i = 0; i < this.splits.length; i++) {
			var frame = this.splits[i]
			var drag = new Drag(dom.div('tile-helper', this.ehelpers))

			drag.min.x = drag.min.y = 0
			drag.max.x = drag.max.y = 1
			drag.offset.x = drag.offset.y = frame.position
			drag.events.on('start', this.startHelper, this, frame)
			drag.events.on('drag', this.dragHelper, this, frame)
			this.helpers.push(drag)
		}

		this.update()
	},

	setClients: function(clients) {
		this.clients = clients || []
		this.econtent.innerHTML = ''

		if(clients) for(var i = 0; i < clients.length; i++) {
			var c = clients[i]
			if(!c) continue

			if(c.element) {
				dom.addclass(c.element, 'tile-client')
				dom.append(this.econtent, c.element)
			}
		}
	},

	resize: function(w, h) {
		this.width  = w
		this.height = h

		this.setElement(this.element, NaN, NaN, this.width, this.height)
		this.update()
	},

	autoresize: function() {
		this.width  = this.element.offsetWidth
		this.height = this.element.offsetHeight

		// NaN produces invalid value - will reset to auto
		this.setElement(this.element, NaN, NaN, NaN, NaN)
		this.update()
	},

	update: function() {
		this.resizeFrame(this.root, 0, 0, this.width, this.height)

		this.helpers.forEach(this.updateHelper, this)
		this.clients.forEach(this.updateClient, this)

		this.events.emit('update')
	},

	resizeFrame: function(frame, x, y, w, h) {
		if(arguments.length > 1) {
			frame.x = x
			frame.y = y
			frame.w = w
			frame.h = h
		} else {
			x = frame.x
			y = frame.y
			w = frame.w
			h = frame.h
		}

		switch(frame.split) {
			case TileView.VERTICAL_SPLIT:
				var hh = frame.h * frame.position
				,   th = frame.h * (1 - frame.position)

				this.resizeFrame(frame.head, x, y     , w, hh)
				this.resizeFrame(frame.tail, x, y + hh, w, th)
			break

			case TileView.HORIZONTAL_SPLIT:
				var hw = frame.w * frame.position
				,   tw = frame.w * (1 - frame.position)

				this.resizeFrame(frame.head, x     , y, hw, h)
				this.resizeFrame(frame.tail, x + hw, y, tw, h)
			break
		}
	},

	setElement: function(element, x, y, w, h) {
		if(!element) return

		var st = element.style

		st.top    = y +'px'
		st.left   = x +'px'
		st.width  = w +'px'
		st.height = h +'px'
	},

	showClients: function() {
		this.setClients()

		this.frames.forEach(function(frame, index) {
			var cli = dom.div('tile-client tile-client-test', this.econtent)
			,   idx = dom.div('tile-client-index absmid', cli)
			,   siz = dom.div('tile-client-size absmid', cli)

			cli.style.backgroundColor = f.rcolor()
			idx.innerHTML = index

			this.clients[index] = {
				element: cli,
				resize: function(w, h) {
					siz.innerHTML = Math.round(w) +'x'+ Math.round(h)
				}
			}
		}, this)

		this.update()
	},

	startHelper: function(frame, origin) {
		origin.x = origin.y = frame.position
	},

	dragHelper: function(frame, offset) {
		if(frame.split === TileView.VERTICAL_SPLIT) {
			frame.position = f.clamp(offset.y, 0, 1)
		} else {
			frame.position = f.clamp(offset.x, 0, 1)
		}
		frame.source[3] = frame.position
		this.resizeFrame(frame)
		this.update()
	},

	updateHelper: function(drag, index) {
		var frame = this.splits[index]

		if(frame.split === TileView.VERTICAL_SPLIT) {
			var dy = frame.position * frame.h
			this.setElement(drag.element, frame.x, frame.y + dy, frame.w, 1)
			dom.addclass(drag.element, 'tile-helper-vertical')
			dom.remclass(drag.element, 'tile-helper-horizontal')
			drag.scale = 1 / frame.h

		} else {
			var dx = frame.position * frame.w
			this.setElement(drag.element, frame.x + dx, frame.y, 1, frame.h)
			dom.addclass(drag.element, 'tile-helper-horizontal')
			dom.remclass(drag.element, 'tile-helper-vertical')
			drag.scale = 1 / frame.w
		}
	},

	updateClient: function(client, index) {
		var frame = this.frames[index]

		if(client.element) {
			dom.display(client.element, !!frame)
		}

		if(frame) {
			this.setElement(client.element, frame.x, frame.y, frame.w, frame.h)
			if(client.resize) client.resize(frame.w, frame.h)
		}
	}
}
