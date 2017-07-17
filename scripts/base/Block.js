Block = f.unit({
	unitName: 'Block',
	etag: 'div',
	ename: 'block',
	iname: '',
	visibleMethod: dom.display,
	cacheSize: true,

	x: 0,
	y: 0,

	init: function(options) {
		f.copy(this, options)

		this.protochain.forEach(f.callown('create', this))
		this.protochain.forEach(f.callown('createPost', this))
	},

	create: function() {
		this.visible = new Gate(Gate.AND, !this.hidden)

		if(!this.events)  this.events  = new EventEmitter
		if(!this.element) this.element = dom.elem(this.etag, null, this.eroot)
	},

	createPost: function() {
		dom.addclass(this.element, this.ename)
		dom.addclass(this.element, this.iname)

		this.visible.events.on('change', this.visibleMethod, this, this.element)

		if(this.text) {
			dom.text(this.element, this.text)
		}
		if(this.elabel) {
			this.elabel = new Block.TextBlock({
				ename: 'block-label',
				eroot: this.element,
				token: this.elabel
			})
		}
		if(this.etext) {
			Locale.setText(this.element, this.etext)
		}
		if(this.etitle) {
			Locale.setTitle(this.element, this.etitle)
		}
		if(this.eicon) {
			Atlas.set(this.element, this.eicon)
			dom.addclass(this.element, 'eicon')
		}
	},

	proxyEvent: function(name, func, scope, element) {
		this.events.on(name, func, scope || this)
		dom.on(name, element || this.element, this.events.will(name))
	},

	updateTransform: function() {
		var st = this.element.style
		,   tf = 'translate('+ this.x +'px,'+ this.y +'px)'

		st.webkitTransform = tf
		st.   mozTransform = tf
		st.    msTransform = tf
		st.     OTransform = tf
		st.      transform = tf
	},

	move: function(x, y) {
		x = f.hround(x)
		y = f.hround(y)

		if(x === this.x && y === this.y) return

		this.x = x
		this.y = y
		this.updateTransform()
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
		this.element.style.width  = ''
		this.element.style.height = ''

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

Block.TextBlock = f.unit(Block, {
	unitName: 'Block_TextBlock',
	token: null,
	ename: 'textblock',

	create: function() {
		Locale.setText(this.element, this.token)
	}
})


Block.Toggle = f.unit(Block, {
	unitName: 'Block_Toggle',
	ename: 'toggle',
	active: true,
	disabled: false,
	handed: true,

	create: function() {
		this.proxyEvent('tap', this.ontap)
	},

	createPost: function() {
		this.update()
	},

	set: function(active, emitEvent) {
		if(this.active == active
		|| this.disabled) return false

		this.active = active
		this.update()

		if(emitEvent) {
			this.events.emit('change', this.active)
			this.events.emit(this.active ? 'active' : 'inactive')
		}
		return true
	},

	toggle: function(emitEvent) {
		this.set(!this.active, emitEvent)
	},

	ontap: function() {
		if(!this.noauto) this.toggle(true)
	},

	update: function() {
		dom.togclass(this.element, 'active',   this.active)
		dom.togclass(this.element, 'disabled', this.disabled)
		if(this.handed) dom.togclass(this.element, 'hand', !this.active)
	}
})


Block.List = f.unit(Block, {
	unitName: 'Block_List',
	ename: 'list',
	cname: 'list-item',
	itemprefix: 'item-',

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
			options.iname = data

		} else if(data && typeof data === 'object') {
			for(var name in data) options[name] = data[name]
		}

		return options
	},

	createItem: function(options, index) {
		return new this.factory(options)
	},

	addItemList: function(items) {
		if(items) items.forEach(this.addItem, this)
	},

	addItem: function(item) {
		var options = this.collectOptions(item, this.blocks.length)
		,   block   = this.createItem(options, this.blocks.length)

		this.addBlock(block)

		return block
	},

	addBlock: function(block) {
		this.blocks.push(block)
		if(block.events) block.events.link(this.events, this.itemprefix, block)
	},

	removeBlock: function(block) {
		var index = this.blocks.indexOf(block)
		if(~index) {
			this.blocks.splice(index, 1)
			if(block.events) block.events.unlink(this.events)
			dom.remove(block.element)
		}
	},

	clearBlocks: function() {
		for(var i = this.blocks.length; i >= 0; i--) {
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
	options: {
		ontap: null
	},

	create: function() {
		this.selection = []
		this.events.on('item-tap', this.onitemtap, this)
	},

	onitemtap: function(block) {
		this.set(this.blocks.indexOf(block), true)
	},

	set: function(index, emitEvent, multiple) {
		if(this.deselect
		&& index === this.active
		&& index !== -1) {
			return this.set(-1, emitEvent)
		}

		var next = this.blocks[index]
		if(!next && multiple) return false

		if(next && !next.set(1, true)) return false

		if(!multiple) for(var i = this.selection.length -1; i >= 0; i--) {
			this.selection[i].set(0, true)
			this.selection.splice(i, 1)
		}

		if(next) this.selection.push(next)

		this.active      = index
		this.activeBlock = next
		this.activeItem  = next ? next.data : null

		emitEvent && this.events.emit('change', this.activeItem)
		return true
	},

	setItem: function(item, emitEvent) {
		for(var i = 0; i < this.blocks.length; i++) {
			var block = this.blocks[i]
			if(!block.hasOwnProperty('data') || block.data !== item) continue

			return this.set(i, emitEvent)
		}
		return this.set(-1, emitEvent)
	},

	setItemList: function(itemList, emitEvent) {
		this.set(-1, emitEvent)

		for(var i = 0; i < this.blocks.length; i++) {
			var block = this.blocks[i]
			if(itemList.indexOf(block.data) === -1) continue

			this.set(i, emitEvent, true)
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

		if(align == null) {
			align = this.getAlign(element)
		}

		var width  = element.offsetWidth
		,   height = element.offsetHeight
		,   offset = dom.offset(element, this.element.offsetParent)

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
		this.align = align

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
				apl = ew -2
				apt = eh/2
			break

			case 'right':
				vertical = false
				epl = x + ao
				ept = y - eh/2
				apl = 0
				apt = eh/2
			break

			case 'top':
				vertical = true
				epl = x - ew/2
				ept = y - ao - eh
				apl = ew/2
				apt = eh -2
			break

			case 'bottom':
				vertical = true
				epl = x - ew/2
				ept = y + ao
				apl = ew/2
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

	getAlign: function(element) {
		var offset = dom.offset(element)
		,   aligns = ['top', 'right', 'bottom', 'left']
		,   wh     = window.innerHeight
		,   ww     = window.innerWidth

		var tw = this.element.offsetWidth
		,   th = this.element.offsetHeight

		var top    = offset.y
		,   right  = ww - offset.x - element.offsetWidth
		,   bottom = wh - offset.y - element.offsetHeight
		,   left   = offset.x

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
