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
		this.htap  = new EventHandler(this.ontap,  this).listen('tap',        this.element)
		this.hover = new EventHandler(this.onover, this).listen('mouseenter', this.element)
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
			this.activeItem  = block ? block.data : null
		}
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

	setItem: function(item) {
		for(var i = 0; i < this.blocks.length; i++) {
			var block = this.blocks[i]
			if(!block.hasOwnProperty('data') || block.data !== item) continue

			return this.set(i)
		}
		return this.set(-1)
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

	align: 'bottom',
	animationTime: 200,
	tweenDistance: 20,

	create: function() {
		this.arrow   = dom.div('tip-arrow', this.element)
		this.content = dom.div('tip-content', this.element)

		this.transitionTween = new TWEEN.Tween({})
			.easing(TWEEN.Easing.Cubic.Out)
			.to({}, this.animationTime)
			.onUpdate(this.updateTween, this)
			.onComplete(this.onAnimationEnd, this)
	},

	updateTween: function() {
		var s = this.transitionTween.source
		this.element.style.opacity   = s.o
		this.element.style.transform = ['translateX(', s.x, 'px) translateY(', s.y, 'px)'].join('')
	},

	moveToElement: function(element, align, distance) {
		if(!element) return

		var width  = element.offsetWidth
		,   height = element.offsetHeight
		,   offset = dom.offset(element, this.element.offsetParent)

		if(align == null) {
			align = this.getAlign(offset.x, offset.y, width, height)
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
		this.align = align == null ? this.getAlign(x, y, 0, 0) : align

		var re = this.element.offsetParent
		if(!re) return

		var aw = 12
		,   ao = distance || 8
		,   ew = this.element.offsetWidth
		,   eh = this.element.offsetHeight
		,   rw = re.offsetWidth
		,   rh = re.offsetHeight

		var vertical
		var epl, ept, apl, apt
		switch(align) {
			case 'left':
				vertical = false
				epl = x - ew - ao
				ept = y - eh/2
				// apl = ew -2 -aw
				apl = ew -2
				apt = eh/2
			break

			case 'right':
				vertical = false
				epl = x + ao
				ept = y - eh/2
				// apl = aw
				apl = 0
				apt = eh/2
			break

			case 'top':
				vertical = true
				epl = x - ew/2
				ept = y - ao - eh
				apl = ew/2
				// apt = eh -2 + aw
				apt = eh -2
			break

			case 'bottom':
				vertical = true
				epl = x - ew/2
				ept = y + ao
				apl = ew/2
				// apt = -aw
				apt = 0
			break

			default: return
		}

		if(vertical && epl < 0) {
			apl -= Math.min(ew / 2 - aw, -epl)
			epl = 0
		}

		if(vertical && (epl + ew) > rw) {
			apl += Math.min(ew / 2 - aw, (epl + ew) - rw)
			epl = rw - ew
		}

		if(!vertical && ept < 0) {
			apt -= Math.min(eh / 2 - aw, -ept)
			ept = 0
		}

		if(!vertical && (ept + eh) > rh) {
			apt += Math.min(eh / 2 - aw, (ept + eh) - rh)
			ept = rh - eh
		}

		this.element.style.left = epl +'px'
		this.element.style.top  = ept +'px'
		this.arrow.style.left = apl +'px'
		this.arrow.style.top  = apt +'px'
	},

	getAlign: function(x, y, w, h) {
		var aligns = ['top', 'right', 'bottom', 'left']
		,   wh     = window.innerHeight
		,   ww     = window.innerWidth

		var tw = this.element.offsetWidth
		,   th = this.element.offsetHeight

		var top    = y
		,   right  = ww - x - w
		,   bottom = wh - y - h
		,   left   = x

		var offsets = [top - th, right - tw, bottom - th, left - tw]

		var dMax  = Math.max.apply(null, offsets)
		,   index = offsets.indexOf(dMax)

		return aligns[index]
	},

	visibleMethod: function(elem, v) {
		if(!this.firstVisible) {
			this.firstVisible = true
			dom.visible(elem, v)
		}

		var s = this.transitionTween.source
		,   t = this.transitionTween.target
		,   d = this.tweenDistance

		var ox = { left: d, right: -d } [this.align] || 0
		,   oy = { top: d, bottom: -d } [this.align] || 0

		s.x = v ? ox : 0
		s.y = v ? oy : 0
		s.o = +!v

		t.x = v ? 0 : ox
		t.y = v ? 0 : oy
		t.o = +v

		if(v) dom.visible(elem, true)

		this.transitionTween.start()
	},

	onAnimationEnd: function() {
		if(!this.visible.value) dom.visible(this.element, false)
	}
})
