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
		if(!this.visible) this.visible = new Gate(Gate.AND, !this.hidden)
		if(!this.element) this.element = dom.elem(this.etag, null, this.eroot)
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
			dom.addclass(this.element, 'eicon')
			this.watchAtlas.push(
				Atlas.set(this.element, this.eicon, 'absmid'))
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
		this.onResize()
	},

	autoresize: function() {
		var w = this.element.offsetWidth
		,   h = this.element.offsetHeight

		if(this.cacheSize
		&& this.width  === w
		&& this.height === h) return

		this.width  = w
		this.height = h
		this.onResize()
	},

	onResize: function() {

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
		this.watchEvents.push(
			new EventHandler(this.ontap, this).listen('tap', this.element),
			new EventHandler(this.onover, this).listen('mouseenter', this.element))
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

	options: {
		ename: 'list-item',
		factory: Block
	},

	create: function() {
		this.blocks = []
		this.container = this.element
	},

	createPost: function() {
		this.addItemList(this.items)
	},

	addItemList: function(items) {
		if(items) items.forEach(this.addItem, this)
	},

	addItem: function(item) {
		if(typeof item === 'string') item = { data: item }

		var options = f.merge({ eroot: this.container }, this.options, item)

		return this.addBlock(new options.factory(options))
	},

	addBlock: function(block) {
		this.blocks.push(block)
		this.events.emit('block_add', block)
		return block
	},

	removeBlock: function(block, destroy) {
		var index = this.blocks.indexOf(block)
		if(index === -1) return false

		this.blocks.splice(index, 1)

		if(destroy) block.destroy()
		else dom.remove(block.element)

		return true
	},

	destroy: function() {
		Block.prototype.destroy.call(this)

		this.clearBlocks(true)
	},

	clearBlocks: function(destroy) {
		for(var i = this.blocks.length -1; i >= 0; i--) {
			this.removeBlock(this.blocks[i], destroy)
		}
	}
})


Block.Menu = f.unit(Block.List, {
	unitName: 'Block_Menu',
	ename: 'menu',
	active: -1,

	options: {
		ename: 'menu-item',
		factory: Block.Toggle
	},

	addBlock: function(block) {
		block.events.when({
			change: this.onitemchange,
			hover: this.onitemhover
		}, this, block)

		block.set(0)

		return Block.List.prototype.addBlock.call(this, block)
	},

	removeBlock: function(block, destroy) {
		var ok = Block.List.prototype.removeBlock.call(this, block, destroy)
		if(ok) block.events.off(null, null, this)

		return ok
	},

	update: function() {
		for(var i = this.blocks.length -1; i >= 0; i--) {
			var block = this.blocks[i]
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
		this.unsetBlocks(block)
		this.update()
		this.events.emit('change', this.activeItem)
	},

	onitemhover: function(block) {
		this.events.emit('hover', block)
	},

	set: function(index, emitEvent) {
		var block = this.blocks[index]
		if(block === this.activeBlock) return

		this.unsetBlocks(block, emitEvent)
		if(block) block.set(1, emitEvent)

		this.update()
	},

	getIndex: function(data) {
		for(var i = 0; i < this.blocks.length; i++) {
			var block = this.blocks[i]
			if(block.hasOwnProperty('data') && block.data === data) return i
		}
		return -1
	},

	setItem: function(data, emitEvent) {
		return this.set(this.getIndex(data), emitEvent)
	},

	unsetBlocks: function(except, emitEvent) {
		for(var i = 0; i < this.blocks.length; i++) {
			var block = this.blocks[i]
			if(block === except) continue

			block.set(0, emitEvent, true)
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

		this.transitionTween = new TWEEN.Tween({ v: +!this.hidden })
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
		&& Math.abs(this.elementPoint.x - epl) < 2
		&& Math.abs(this.elementPoint.y - ept) < 2
		&& this.lastDistance === ao
		&& this.lastAlign === align) return

		this.arrowPoint.x = apl
		this.arrowPoint.y = apt
		this.arrow.style.left = apl +'px'
		this.arrow.style.top  = apt +'px'

		this.elementPoint.x = epl
		this.elementPoint.y = ept

		this.lastDistance = ao
		this.lastAlign = align


		this.updateTransform()
	},


	alignAxes: {
		left   : { x:  1, y:  0 },
		right  : { x: -1, y:  0 },
		top    : { x:  0, y:  1 },
		bottom : { x:  0, y: -1 }
	},

	transitionAxis: null,

	updateTransform: function() {
		var d = (1 - this.transitionTween.source.v) * this.tweenDistance
		,   e = this.elementPoint

		var a = this.transitionAxis
			|| this.alignAxes[this.lastAlign || this.align]
			|| { x: 0, y: 0 }

		this.transform(this.element, e.x + d * a.x, e.y + d * a.y)
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
		if(!this.initVisible) {
			this.initVisible = true

			this.transitionTween.source.v = +v
			this.onTransitionUpdate()
			this.onTransitionEnd()
			return
		}

		if(this.visible.value) {
			dom.append(this.tipRoot, this.element)
		}

		this.transitionTween.target.v = +v
		this.transitionTween.start()
	},

	onTransitionStart: function() {
		this.inTransition = true
	},

	onTransitionUpdate: function() {
		this.element.style.opacity = this.transitionTween.source.v
		this.updateTransform()
	},

	onTransitionEnd: function() {
		if(!this.visible.value) {
			dom.remove(this.element)
		}
		this.inTransition = false
	}
})
