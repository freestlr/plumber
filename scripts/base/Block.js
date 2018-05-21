Block = f.unit({
	unitName: 'Block',

	etag: 'div',
	ename: 'block',
	einam: 'absmid',
	visibleMethod: dom.display,
	cacheSize: true,

	events: null,
	element: null,
	visible: null,
	template: null,

	init: function(options) {
		f.copy(this, options)

		this.watchAtlas  = []
		this.watchLocale = []
		this.watchEvents = []
		this.watchBlocks = []

		this.protocall('create')
		this.protocall('createPost')
	},

	protomerge: function(name) {
		var value = {}
		for(var i = 0; i < this.protochain.length; i++) {
			f.copy(value, this.protochain[i][name])
		}
		f.copy(value, this[name])
		return value
	},

	protocall: function(name) {
		for(var i = 0; i < this.protochain.length; i++) {
			var proto = this.protochain[i]
			,   method = proto[name]

			if(Object.prototype.hasOwnProperty.call(proto, name)
			&& typeof method === 'function') method.call(this)
		}
	},

	create: function() {
		if(this.events instanceof EventEmitter === false) {
			this.events = new EventEmitter(this.events, this.eventScope || this)
		}
		if(!this.visible) {
			this.visible = new Gate(Gate.AND, !this.hidden)
		}
		if(!this.element) {
			this.element = dom.elem(this.etag)
		}
		if(this.eroot) {
			dom.append(this.eroot.element || this.eroot, this.element)
		}

		this.content = this.element
	},

	createPost: function() {
		dom.addclass(this.element, this.ename)


		if(typeof this.data === 'string') {
			dom.addclass(this.element, this.data)
		}
		if(this.listens) for(var i = 0; i < this.listens.length; i++) {
			this.events.on.apply(this.events, this.listens[i])
		}

		if(this.text) {
			console.warn('Block::text is [deprecated], use ::attr.text')
			this.setAttribute('text', this.text)
			// dom.text(this.content, this.text)
		}
		if(this.title) {
			console.warn('Block::title is [deprecated], use ::attr.title')
			this.setAttribute('title', this.title)
			// attr.title = this.title
			// dom.attr(this.content, 'title', this.title)
			// this.element.setAttribute('title', this.title)
		}
		if(this.elabel) {
			console.warn('Block::elabel is [deprecated], use ::eattr.label')
			this.setAttributeLocale('label', this.elabel)
			// this.setLabel(this.elabel)
			// dom.addclass(this.element, 'labeled')
			// this.watchLocale.push(
			// 	Locale.setText(dom.div('block-label', this.content), this.elabel))
		}
		if(this.etext) {
			console.warn('Block::etext is [deprecated], use ::eattr.text')
			this.setAttributeLocale('text', this.etext)
			// this.setAttributesLocale({ textContent: this.etext })
			// this.watchLocale.push(
			// 	Locale.setText(this.content, this.etext))
		}
		if(this.etitle) {
			console.warn('Block::etitle is [deprecated], use ::eattr.title')
			this.setAttributeLocale('title', this.etitle)
			// this.setAttributesLocale({ title: this.etitle })
			// this.watchLocale.push(
			// 	Locale.setTitle(this.content, this.etitle))
		}
		if(this.eicon) {
			console.warn('Block::eicon is [deprecated], use ::attr.icon')
			this.setAttribute('icon', this.eicon)
			// this.setIcon(this.eicon)
			// dom.addclass(this.element, 'eicon')
			// if(typeof Atlas !== 'undefined') this.watchAtlas.push(
			// 	Atlas.set(this.content, this.eicon, this.einam))
		}


		this.setAttributes(this.attr)
		this.setAttributesLocale(this.eattr)

		this.visible.events.on('change', this.visibleMethod, this, this.element)
	},

	setIcon: function(value) {
		dom.togclass(this.element, 'eicon', !!value)

		if(typeof Atlas === 'undefined') return

		if(value != null) {
			if(!this.atlasElement) {
				this.atlasElement = this.content
				this.watchAtlas.push(this.atlasElement)
			}
			this.atlasIcon = value
			Atlas.set(this.atlasElement, this.atlasIcon, this.einam)

		} else if(this.atlasElement) {
			Atlas.free(this.atlasElement)
			f.adrop(this.watchAtlas, this.atlasElement)
			this.atlasElement = null
		}
	},

	setLabel: function(value) {
		if(value != null) {
			if(!this.labelElement) {
				this.labelElement = dom.div('block-label', this.content)
				dom.addclass(this.element, 'labeled')
			}

			dom.text(this.labelElement, value)

		} else if(this.labelElement) {
			dom.remclass(this.element, 'labeled')
			dom.remove(this.labelElement)
			this.labelElement = null
		}
	},

	setAttribute: function(name, value) {
		switch(name) {
			case 'text':
				dom.text(this.content, value)
			break

			case 'icon':
				this.setIcon(value)
			break

			case 'label':
				this.setLabel(value)
			break

			default:
				dom.attr(this.content, name, value)
			break
		}
	},

	setAttributeLocale: function(name, value) {
		this.watchLocale.push(Locale.setAttribute(name, this.content, value))
	},

	setAttributes: function(attr) {
		for(var name in attr) this.setAttribute(name, attr[name])
	},

	setAttributesLocale: function(attr) {
		for(var name in attr) this.setAttributeLocale(name, attr[name])
	},

	destroy: function() {
		if(typeof Atlas !== 'undefined') {
			this.watchAtlas.forEach(Atlas.free)
			this.watchAtlas = []
		}

		if(typeof Locale !== 'undefined') {
			this.watchLocale.forEach(Locale.unwatch)
			this.watchLocale = []
		}

		this.watchEvents.forEach(f.func('release'))
		this.watchEvents = []

		this.watchBlocks.forEach(f.func('destroy'))
		this.watchBlocks = []

		this.events.off()

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
		this.element.style.width  = ''
		this.element.style.height = ''

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

	auto: true,
	active: false,
	reset: false,
	resetTime: 100,
	disabled: false,
	deselect: true,
	hovered: false,

	create: function() {
		this.watchEvents.push(
			new EventHandler(this.ontap, this).listen('tap', this.element),
			new EventHandler(this.onenter, this).listen('mouseenter', this.element),
			new EventHandler(this.onleave, this).listen('mouseleave', this.element))
	},

	createPost: function() {
		this.update()
	},

	ontap: function() {
		if(this.auto) this.toggle(true)
	},

	onenter: function() {
		this.hovered = true
		this.events.emit('hover', this.hovered)
	},

	onleave: function() {
		this.hovered = false
		this.events.emit('hover', this.hovered)
	},

	toggle: function(emitEvent) {
		this.set(!this.active, emitEvent)
	},

	set: function(active, emitEvent, force) {
		var prev = !!this.active
		,   next = !!active
		if(!force) {
			if(this.disabled || prev === next
			|| (this.reset && this.active)
			|| (!this.deselect && !active)) return false
		}

		this.active = next
		this.update()

		if(emitEvent) {
			this.events.emit('change', next)
			this.events.emit(next ? 'active' : 'inactive', next)
		}

		var scope = this
		if(!force && this.reset) setTimeout(function() {
			scope.set(prev, emitEvent, true)

		}, this.resetTime)

		return true
	},

	update: function() {
		dom.togclass(this.element, 'active',   this.active)
		dom.togclass(this.element, 'disabled', this.disabled)
		dom.togclass(this.element, 'hand', this.auto && !this.disabled && (!this.active || this.deselect))
	}
})


Block.List = f.unit(Block, {
	unitName: 'Block_List',
	ename: 'list',
	cname: 'list-item',

	blocks: null,
	items: null,

	template: {
		factory: Block,
		ename: 'list-item'
	},

	create: function() {
		this.blocks = []
		this.template = this.protomerge('template')
		this.container = this.element
	},

	createPost: function() {
		this.addItemList(this.items)
	},

	addItemList: function(items) {
		if(items) items.forEach(this.addItem, this)
	},

	addItem: function(item) {
		if(typeof item !== 'object') {
			item = { data: item }
		}

		var options = f.merge({ eroot: this.container }, this.template, item)
		var Factory = options.factory || Block

		return this.addBlock(new Factory(options))
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

	getIndex: function(data) {
		for(var i = 0; i < this.blocks.length; i++) {
			var block = this.blocks[i]
			if(block.hasOwnProperty('data') && block.data === data) return i
		}
		return -1
	},

	getBlock: function(data) {
		return this.blocks[this.getIndex(data)]
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

	template: {
		ename: 'menu-item',
		factory: Block.Toggle
	},

	createPost: function() {
		this.set(this.active)
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
		this.active = -1
		this.activeBlock = null
		this.activeItem  = null

		for(var i = this.blocks.length -1; i >= 0; i--) {
			var block = this.blocks[i]

			if(block.active) {
				this.active = i
				this.activeBlock = block
				this.activeItem = block.data
			}
		}
	},

	onitemchange: function(block, active) {
		if(active) this.unsetBlocks(block, true)

		var last = this.active

		this.update()
		if(last !== this.active) {
			this.events.emit('change', this.activeItem)
		}
	},

	onitemhover: function(block, enabled) {
		this.events.emit('hover', [block, enabled])
	},

	set: function(index, emitEvent, multiple) {
		var block = this.blocks[index]
		if(block === this.activeBlock) return false

		if(!block || block.set(1, emitEvent)) {
			if(!multiple) this.unsetBlocks(block, emitEvent)

			this.update()
			return true
		}

		return false
	},

	setItem: function(data, emitEvent, multiple) {
		return this.set(this.getIndex(data), emitEvent, multiple)
	},

	unsetBlocks: function(except, emitEvent) {
		for(var i = 0; i < this.blocks.length; i++) {
			var block = this.blocks[i]
			if(!block.active || block === except) continue

			block.set(0, emitEvent, true)
		}
	}
})


Block.Fade = f.unit(Block, {
	unitName: 'Block_Fade',
	ename: 'block-fade',

	fadeAxis: null,
	fadeTime: 300,
	fadeDistance: 20,

	create: function() {
		this.fadeTween = new TWEEN.Tween({ v: 0 })
			.to({ v: 0 }, this.fadeTime)
			.easing(TWEEN.Easing.Cubic.Out)
			.onStart(this.onTransitionStart, this)
			.onUpdate(this.onTransitionUpdate, this)
			.onComplete(this.onTransitionEnd, this)
	},

	createPost: function() {
		this.fadeTween.source.v = +!this.hidden
		this.fadeTween.target.v = +!this.hidden
		this.visible.check(true)
		// this.onTransitionUpdate()
		// this.onTransitionEnd()
	},

	visibleMethod: function() {
		if(this.visible.value) {
			dom.display(this.element, true)
			this.autoresize()
		}

		this.fadeTween.target.v = +this.visible.value
		this.fadeTween.start()
	},

	onTransitionStart: function() {
		this.inTransition = true
	},

	onTransitionUpdate: function() {
		var v = this.fadeTween.source.v
		,   d = (1 - v) * this.fadeDistance
		,   a = this.fadeAxis || { x: 0, y: 1 }

		this.element.style.opacity = Math.max(0, v * v * 2 - 1)
		this.transform(this.element, d * a.x, d * a.y)
	},

	onTransitionEnd: function() {
		if(!this.visible.value) {
			dom.display(this.element, false)
		}
		this.inTransition = false
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
	}
})


Block.Tip = f.unit(Block.Fade, {
	unitName: 'Block_Tip',
	ename: 'tip',

	hidden: true,
	align: null,
	preferAlign: null,
	tipRoot: null,
	integerPosition: false,
	distance: 8,
	arrowPadding: 8,
	animationTime: 200,

	create: function() {
		this.arrow   = dom.div('tip-arrow', this.element)
		this.content = dom.div('tip-content', this.element)

		if(!this.tipRoot) {
			this.tipRoot = this.eroot || this.element.parentNode || document.body
		}

		this.arrowPoint   = { x: 0, y: 0 }
		this.elementPoint = { x: 0, y: 0 }
	},

	getElementBox: function(element, relative) {
		if(!element) return null

		if(element.getBoundingClientRect) {
			var rect = element.getBoundingClientRect()
			,   offset = dom.offset(relative)

			return {
				x: rect.left - offset.x,
				y: rect.top  - offset.y,
				w: rect.width,
				h: rect.height
			}

		} else {
			var offset = dom.offset(element, relative)

			return {
				x: offset.x,
				y: offset.y,
				w: element.offsetWidth,
				h: element.offsetHeight
			}
		}
	},

	moveToElement: function(element, align, distance) {
		if(!element) return


		var box = this.getElementBox(element, this.element.offsetParent)

		if(align == null) {
			align = this.align || this.getAlign(box.x, box.y, box.w, box.h)
		}

		var x = box.x
		,   y = box.y
		switch(align) {
			case 'left':
				y += box.h / 2
			break

			case 'right':
				x += box.w
				y += box.h / 2
			break

			case 'top':
				x += box.w / 2
			break

			case 'bottom':
				x += box.w / 2
				y += box.h
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

		var aw = this.arrow.offsetWidth
		,   ah = this.arrow.offsetHeight
		,   ad = Math.sqrt(aw * aw + ah * ah) / 2
		,   ap = this.arrowPadding
		,   ao = distance || this.distance
		,   ew = this.element.offsetWidth
		,   eh = this.element.offsetHeight
		,   cw = this.content.offsetWidth
		,   ch = this.content.offsetHeight
		,   rw = re.offsetWidth
		,   rh = re.offsetHeight

		var ecx = Math.floor(ew / 2)
		,   ecy = Math.floor(eh / 2)
		,   ccx = Math.floor(cw / 2)
		,   ccy = Math.floor(ch / 2)

		var vertical
		var epl, ept, apl, apt
		switch(align) {
			case 'left':
				vertical = false
				epl = x - ew - ao
				ept = y - ecy
				apl = cw
				apt = ccy
			break

			case 'right':
				vertical = false
				epl = x + ao
				ept = y - ecy
				apl = 0
				apt = ccy
			break

			case 'top':
				vertical = true
				epl = x - ecx
				ept = y - ao - eh
				apl = ccx
				apt = ch
			break

			case 'bottom':
				vertical = true
				epl = x - ecx
				ept = y + ao
				apl = ccx
				apt = 0
			break

			default: return
		}

		var eol = Math.max(0, -epl)
		if(eol) {
			if(vertical) apl -= Math.min(ccx - ad - ap, eol)
			epl += eol
		}

		var eor = Math.max(0, epl + ew - rw)
		if(eor) {
			if(vertical) apl += Math.min(ccx - ad - ap, eor)
			epl -= eor
		}

		var eot = Math.max(0, -ept)
		if(eot) {
			if(!vertical) apt -= Math.min(ccy - ad - ap, eot)
			ept += eot
		}

		var eob = Math.max(0, ept + eh - rh)
		if(eob) {
			if(!vertical) apt += Math.min(ccy - ad - ap, eob)
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

		if(this.integerPosition) {
			epl = Math.round(epl)
			ept = Math.round(ept)
			apl = Math.round(apl)
			apt = Math.round(apt)
			ao  = Math.round(ao)
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

		this.fadeAxis = this.alignAxes[this.lastAlign || this.align]
		this.updateTransform()
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

		if(this.preferAlign && spaces[aligns.indexOf(this.preferAlign)] > 0) {
			return this.preferAlign
		}

		var maxspace = Math.max.apply(null, spaces)
		,   index = spaces.indexOf(maxspace)

		return aligns[index]
	},

	alignAxes: {
		left   : { x:  1, y:  0 },
		right  : { x: -1, y:  0 },
		top    : { x:  0, y:  1 },
		bottom : { x:  0, y: -1 }
	},

	visibleMethod: function() {
		if(this.visible.value) {
			dom.append(this.tipRoot, this.element)
			this.autoresize()
		}

		this.fadeTween.target.v = +this.visible.value
		this.fadeTween.start()
	},

	updateTransform: function() {
		var d = (1 - this.fadeTween.source.v) * this.fadeDistance
		,   e = this.elementPoint
		,   a = this.fadeAxis || { x: 0, y: 0 }

		this.transform(this.element, e.x + d * a.x, e.y + d * a.y)
	},

	onTransitionUpdate: function() {
		this.element.style.opacity = this.fadeTween.source.v
		this.updateTransform()
	},

	onTransitionEnd: function() {
		if(!this.visible.value) dom.remove(this.element)
		this.inTransition = false
	}
})


Block.Dropdown = f.unit(Block.Toggle, {
	unitName: 'Block_Dropdown',
	ename: 'dropdown-toggle',
	cacheSize: false,

	tipTemplate: {
		tipRoot: null,
		align: null,
		distance: 12
	},

	create: function() {
		this.tip = new Block.Tip(this.protomerge('tipTemplate'))
		this.content = this.tip.content

		this.events.on('active', Block.Dropdown.closeAll, null, this)

		Block.Dropdown.instances.push(this)
	},

	destroy: function() {
		f.adrop(Block.Dropdown.instances, this)
		this.tip.destroy()
	},

	update: function() {
		Block.Toggle.prototype.update.apply(this, arguments)

		this.tip.visible.set(this.active, 'dropdown')
		if(this.active) this.autoresize()
	},

	autoresize: function() {
		this.tip.moveToElement(this.element)
	}
})

Block.Dropdown.instances = []
Block.Dropdown.closeAll = function(except) {
	Block.Dropdown.instances.forEach(function(dropdown) {
		if(dropdown !== except) dropdown.set(0, true)
	}, this)
}


Block.Range = f.unit(Block, {
	unitName: 'Block_Range',
	ename: 'block-range',
	cacheSize: false,

	value: 0,
	step: 0,
	min: 0,
	max: 1,

	create: function() {
		this.bar = dom.elem('block-range-bar', this.element)
		this.pos = dom.elem('block-range-pos', this.element)

		this.drag = new Drag(this.element)
		this.drag.events.when({
			'start': this.onDragStart,
			'end': this.onDragEnd,
			'drag': this.onDrag
		}, this)
	},

	onDragStart: function(drag, e) {
		var pos = (e.pageX - this.barOffset.x) / this.barWidth

		if(!dom.ancestor(e.target, this.pos)) {
			drag.point.x = drag.origin.x = pos * this.barWidth
			this.value = pos
		}
	},

	onDragEnd: function(drag, e) {

	},

	onDrag: function(drag, e) {
		this.value = drag.point.x / this.barWidth
		this.update()
	},

	onResize: function() {
		this.barOffset = dom.offset(this.bar)
		this.barWidth  = this.bar.offsetWidth
		this.barHeight = this.bar.offsetHeight
		this.drag.min.x = this.min * this.barWidth
		this.drag.max.x = this.max * this.barWidth
		this.drag.point.x = f.clamp(this.drag.point.x, this.drag.min.x, this.drag.max.x)
		this.drag.point.y = f.clamp(this.drag.point.y, this.drag.min.y, this.drag.max.y)
		this.update()
	},

	update: function() {
		var pos = f.hround(this.value * this.barWidth)
		dom.xstyle(this.pos, 'transform', 'translateX('+ pos +'px)')
	}
})
