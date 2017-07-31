Block = f.unit({
	unitName: 'Block',

	etag: 'div',
	ename: 'block',
	visibleMethod: dom.display,
	cacheSize: true,

	x: 0,
	y: 0,

	init: function(options) {
		f.copy(this, options)

		this.watchAtlas  = []
		this.watchLocale = []
		this.watchEvents = []

		for(var i = 0; i < this.protochain.length; i++) {
			this.invoke(this.protochain[i], 'create')
		}
		for(var i = 0; i < this.protochain.length; i++) {
			this.invoke(this.protochain[i], 'createPost')
		}
	},

	invoke: function(proto, method) {
		if(Object.prototype.hasOwnProperty.call(proto, method)
		&& typeof proto[method] === 'function') {
			return proto[method].call(this)
		}
	},

	create: function() {
		if(!this.events)  this.events  = new EventEmitter
		if(!this.element) this.element = dom.elem(this.etag, null, this.eroot)
		if(!this.visible) this.visible = new Gate(Gate.AND, !this.hidden)
	},

	createPost: function() {
		dom.addclass(this.element, this.ename)

		this.visible.events.on('change', this.visibleMethod, this, this.element)
		this.visible.check(true)

		if(this.text) {
			dom.text(this.element, this.text)
		}
		if(this.elabel) {
			this.watchLocale.push(
				Locale.setText(dom.div('block-label', this.element), this.elabel))
		}
		if(this.etext) {
			this.watchLocale.push(
				Locale.setText(this.element, this.etext))
		}
		if(this.etitle) {
			this.watchLocale.push(
				Locale.setTitle(this.element, this.etitle))
		}
		if(this.eicon) {
			Atlas.set(this.element, this.eicon, 'absmid')
			dom.addclass(this.element, 'eicon')
			this.watchAtlas.push(this.element)
		}
	},

	destroy: function() {
		this.watchAtlas.forEach(Atlas.free)
		this.watchAtlas = []

		this.watchLocale.forEach(Locale.unwatch)
		this.watchLocale = []

		this.watchEvents.forEach(f.func('release'))
		this.watchEvents = []

		dom.remove(this.element)
	},

	resize: function(w, h) {
		w = w |0
		h = h |0

		if(this.cacheSize
		&& this.width  === w
		&& this.height === h) return

		this.element.style.width  = w +'px'
		this.element.style.height = h +'px'

		this.width  = w
		this.height = h
		this.onresize()
	},

	autoresize: function() {
		var w = this.element.offsetWidth
		,   h = this.element.offsetHeight

		if(this.cacheSize
		&& this.width  === w
		&& this.height === h) return

		this.width  = w
		this.height = h
		this.onresize()
	},

	onresize: function() {

	}
})


Block.Toggle = f.unit(Block, {
	unitName: 'Block_Toggle',
	ename: 'toggle',

	active: true,
	reset: false,
	disabled: false,
	deselect: true,
	auto: true,

	create: function() {
		this.watchEvents.push(new EventHandler(this.ontap, this).listen('tap', this.element))
		this.watchEvents.push(new EventHandler(this.onover, this).listen('mouseenter', this.element))
	},

	createPost: function() {
		this.update()
	},

	ontap: function() {
		if(this.auto) this.toggle(true)
	},

	onover: function() {
		this.events.emit('hover', this)
	},

	toggle: function(emitEvent) {
		this.set(!this.active, emitEvent)
	},

	set: function(active, emitEvent, force) {
		if(!force) {
			if(this.disabled
			|| this.active == active
			|| (!this.deselect && !active)) return false
		}

		if(!this.reset) {
			this.active = active
			this.update()
		}

		if(emitEvent) {
			this.events.emit('change', active)
			this.events.emit(active ? 'active' : 'inactive', active)
		}
		return true
	},

	update: function() {
		dom.togclass(this.element, 'active',   this.active)
		dom.togclass(this.element, 'disabled', this.disabled)
		dom.togclass(this.element, 'hand', !this.disabled && (this.deselect || !this.active))
	}
})


Block.List = f.unit(Block, {
	unitName: 'Block_List',
	ename: 'list',
	cname: 'list-item',

	blocks: null,
	items: null,

	factory: Block,
	options: {},

	create: function() {
		this.blocks = []
		this.container = this.element
	},

	createPost: function() {
		this.addItemList(this.items)
	},

	collectOptions: function(data, index) {
		var options = {
			data   : data,
			index  : index,
			active : index === this.active,
			ename  : this.cname,
			eroot  : this.container
		}

		for(var name in this.options) {
			options[name] = this.options[name]
		}

		if(this.disabled) {
			options.disabled = !!this.disabled[index]
			if(options.disabled) options.ename += ' disabled'
		}
		if(this.labels) {
			options.elabel = this.labels[index]
			if(options.elabel) options.ename += ' labeled'
		}
		if(this.titles) {
			options.etitle = this.titles[index]
		}
		if(this.icons) {
			options.eicon = this.icons[index]
		}
		if(this.texts) {
			options.text = this.texts[index]
		}

		if(typeof data === 'string') {
			options.ename += ' '+ data

		} else if(data && typeof data === 'object') {
			for(var name in data) options[name] = data[name]
		}

		return options
	},

	addItemList: function(items) {
		if(items) items.forEach(this.addItem, this)
	},

	addItem: function(item) {
		var options = this.collectOptions(item, this.blocks.length)
		,   block   = new this.factory(options/* , this.blocks.length */)

		this.addBlock(block)

		return block
	},

	addBlock: function(block) {
		this.blocks.push(block)
		this.events.emit('add-block', block)
	},

	removeBlock: function(block) {
		var index = this.blocks.indexOf(block)
		if(~index) {
			this.blocks.splice(index, 1)
			if(block.events) block.events.unlink(this.events)
			dom.remove(block.element)
			return true
		}
	},

	destroy: function() {
		Block.prototype.destroy.call(this)

		this.clearBlocks(true)
	},

	clearBlocks: function(destroy) {
		for(var i = this.blocks.length -1; i >= 0; i--) {
			if(destroy) this.blocks[i].destroy()
			this.removeBlock(this.blocks[i])
		}
	}
})


Block.Menu = f.unit(Block.List, {
	unitName: 'Block_Menu',
	ename: 'menu',
	active: -1,
	deselect: false,
	disabled: [],

	factory: Block.Toggle,

	addBlock: function(block) {
		Block.List.prototype.addBlock.call(this, block)

		block.events.on('change', this.onitemchange, this, block)
		block.events.on('hover',  this.onitemhover,  this, block)
	},

	removeBlock: function(block) {
		if(Block.List.prototype.removeBlock.call(this, block)) {
			block.events.off('change', this.onitemchange, this, block)
			block.events.off('hover',  this.onitemhover,  this, block)
		}
	},

	update: function() {
		for(var i = this.blocks.length -1; i >= 0; i--) {
			var block = this.blocks[i]
			if(!this.deselect) {
				block.disabled = block.active
			}
			if(!block.active) continue

			this.active = i
			this.activeBlock = block
			this.activeItem  = block.data

			return
		}

		this.active = -1
		this.activeBlock = null
		this.activeItem  = null
	},

	onitemchange: function(block, active) {
		this.unsetBlock(this.activeBlock)
		this.update()
		this.events.emit('change', this.activeItem)
	},

	onitemhover: function(block) {
		this.events.emit('hover', block)
	},

	set: function(index, emitEvent) {
		var block = this.blocks[index]
		if(block === this.activeBlock) return

		this.unsetBlock(this.activeBlock, emitEvent)
		if(block) block.set(1, emitEvent)

		this.update()
	},

	setItem: function(item, emitEvent) {
		for(var i = 0; i < this.blocks.length; i++) {
			var block = this.blocks[i]
			if(!block.hasOwnProperty('data') || block.data !== item) continue

			return this.set(i, emitEvent)
		}
		return this.set(-1, emitEvent)
	},

	unsetBlock: function(block, emitEvent) {
		if(block) {
			if(!this.deselect) block.disabled = false
			block.set(0, emitEvent)
		}
	}
})


Block.Tip = f.unit(Block, {
	unitName: 'Block_Tip',
	ename: 'tip',

	align: null,
	distance: 8,
	arrowWidth: 12,
	arrowPadding: 8,
	animationTime: 200,
	tweenDistance: 20,

	create: function() {
		this.arrow   = dom.div('tip-arrow', this.element)
		this.content = dom.div('tip-content', this.element)

		this.arrowPoint   = { x: 0, y: 0 }
		this.elementPoint = { x: 0, y: 0 }

		this.transitionTween = new TWEEN.Tween({ o: 0, x: 0, y: 0 })
			.easing(TWEEN.Easing.Cubic.Out)
			.to({}, this.animationTime)
			.onStart(this.onTransitionStart, this)
			.onUpdate(this.onTransitionUpdate, this)
			.onComplete(this.onTransitionEnd, this)
	},

	moveToElement: function(element, align, distance) {
		if(!element) return

		var width  = element.offsetWidth
		,   height = element.offsetHeight
		,   offset = dom.offset(element, this.element.offsetParent)

		if(align == null) {
			align = this.align || this.getAlign(offset.x, offset.y, width, height)
		}

		var x = offset.x
		,   y = offset.y
		switch(align) {
			case 'left':
				y += height / 2
			break

			case 'right':
				x += width
				y += height / 2
			break

			case 'top':
				x += width / 2
			break

			case 'bottom':
				x += width / 2
				y += height
			break
		}

		this.move(x, y, align, distance)
	},

	move: function(x, y, align, distance) {
		if(align == null) {
			align = this.align || this.getAlign(x, y, 0, 0)
		}

		var re = this.element.offsetParent
		if(!re) return

		var aw = this.arrowWidth / 2
		,   ap = this.arrowPadding
		,   ao = distance || this.distance
		,   ew = this.element.offsetWidth
		,   eh = this.element.offsetHeight
		,   rw = re.offsetWidth
		,   rh = re.offsetHeight
		,   cx = ew / 2
		,   cy = eh / 2

		var vertical
		var epl, ept, apl, apt
		switch(align) {
			case 'left':
				vertical = false
				epl = x - ew - ao
				ept = y - cy
				apl = ew
				apt = cy
			break

			case 'right':
				vertical = false
				epl = x + ao
				ept = y - cy
				apl = 0
				apt = cy
			break

			case 'top':
				vertical = true
				epl = x - cx
				ept = y - ao - eh
				apl = cx
				apt = eh
			break

			case 'bottom':
				vertical = true
				epl = x - cx
				ept = y + ao
				apl = cx
				apt = 0
			break

			default: return
		}

		var eol = Math.max(0, -epl)
		if(eol) {
			if(vertical) apl -= Math.min(cx - aw - ap, eol)
			epl += eol
		}

		var eor = Math.max(0, epl + ew - rw)
		if(eor) {
			if(vertical) apl += Math.min(cx - aw - ap, eor)
			epl -= eor
		}

		var eot = Math.max(0, -ept)
		if(eot) {
			if(!vertical) apt -= Math.min(cy - aw - ap, eot)
			ept += eot
		}

		var eob = Math.max(0, ept + eh - rh)
		if(eob) {
			if(!vertical) apt += Math.min(cy - aw - ap, eob)
			ept -= eob
		}

		switch(align) {
			case 'left':
				ao += eor - eol
			break

			case 'right':
				ao += eol - eor
			break

			case 'top':
				ao += eob - eot
			break

			case 'bottom':
				ao += eot - eob
			break
		}


		if(this.arrowPoint.x === apl
		&& this.arrowPoint.y === apt
		&& this.elementPoint.x === epl
		&& this.elementPoint.y === ept
		&& this.lastDistance === ao
		&& this.lastAlign === align) return

		this.arrowPoint.x = apl
		this.arrowPoint.y = apt

		this.elementPoint.x = epl
		this.elementPoint.y = ept

		this.lastDistance = ao
		this.lastAlign = align


		this.updateTransform()
	},

	updateTransform: function() {
		var s = this.transitionTween.source
		,   a = this.arrowPoint
		,   e = this.elementPoint

		this.transform(this.element, e.x + s.x, e.y + s.y)
		this.transform(this.arrow, a.x, a.y)
	},

	transform: function(element, x, y, s) {
		var style = ' translateX('+ f.hround(x || 0) +'px)'
		          + ' translateY('+ f.hround(y || 0) +'px)'
		          + '      scale('+ f.hround(s || 1) +')'

		element.style.webkitTransform = style
		element.style.   mozTransform = style
		element.style.    msTransform = style
		element.style.     OTransform = style
		element.style.      transform = style
	},

	getAlign: function(x, y, w, h) {
		var re = this.element.offsetParent
		if(!re) return null

		var rw = re.offsetWidth
		,   rh = re.offsetHeight

		var ew = this.element.offsetWidth
		,   eh = this.element.offsetHeight

		var ot = y
		,   or = rw - x - w
		,   ob = rh - y - h
		,   ol = x

		var aligns = ['top', 'right', 'bottom', 'left']
		,   spaces = [ot - eh, or - ew, ob - eh, ol - ew]

		var maxspace = Math.max.apply(null, spaces)
		,   index = spaces.indexOf(maxspace)

		return aligns[index]
	},

	visibleMethod: function(elem, v) {
		var s = this.transitionTween.source
		,   t = this.transitionTween.target
		,   d = this.tweenDistance

		var ox = { left: d, right: -d } [this.lastAlign] || 0
		,   oy = { top: d, bottom: -d } [this.lastAlign] || 0


		if(!this.initVisible) {
			this.initVisible = true

			s.x = v ? ox : 0
			s.y = v ? oy : 0
			s.o = +!v

			this.onTransitionUpdate()
			this.onTransitionEnd()
			return
		}

		t.x = v ? 0 : ox
		t.y = v ? 0 : oy
		t.o = +v

		this.transitionTween.start()
	},

	onTransitionStart: function() {
		if(this.visible.value) {
			this.inTransition = true
			dom.append(this.eroot, this.element)
		}
	},

	onTransitionUpdate: function() {
		var s = this.transitionTween.source
		this.element.style.opacity = s.o
		this.updateTransform()
	},

	onTransitionEnd: function() {
		if(!this.visible.value) {
			this.inTransition = false
			dom.remove(this.element)
		}
	}
})
