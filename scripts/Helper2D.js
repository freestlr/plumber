Helper2D = f.unit(Block, {
	unitName: 'Helper2D',
	ename: 'helper-2d test-helper-please-ignore',

	hidden: true,

	visibleMethod: function(element, visible) {
		if(visible) {
			dom.append(this.root.element, this.element)
		} else {
			dom.remove(this.element)
		}
	},

	init: function(node, options) {
		this.id = ++Helper2D.count
		this.node = node

		Block.prototype.init.call(this, options)

		this.visible.set(!!this.root, 'root')

		dom.on('mouseenter', this.element, main.bus.will('node_hover', node))
	},

	show: function(x, y) {
		if(!this.root) return

		if(this.roundPosition) {
			x = Math.round(x)
			y = Math.round(y)
		}

		this.move(x, y)
		this.root.showHelper(this)
	},

	remove: function() {
		if(this.root) this.root.removeHelper(this)
	},

	commit: function() {
		main.bus.emit('history_push')
	},

	update: function() {

	}
})

Helper2D.count = 0

Helper2D.Root = f.unit(Block, {
	unitName: 'Helper2D_Root',
	ename: 'helpers-2d nonselect',

	create: function() {
		this.transparent = new Gate(Gate.AND, false)
		this.transparent.events.on('change', dom.togclass, dom, [this.element, 'transparent'])

		this.reset()
	},

	reset: function() {
		this.items = {}
		this.shown = {}

		this.element.innerHTML = ''
	},

	addHelper: function(helper) {
		helper.root = this
		helper.visible.on('root')

		this.items[helper.id] = helper
	},

	removeHelper: function(helper) {
		if(helper && helper.id in this.items) {
			helper.visible.off('show')
			helper.visible.off('root')

			delete this.items[helper.id]
			delete this.shown[helper.id]
			delete helper.root
			delete helper.id
		}
	},

	showHelper: function(helper) {
		if(helper && helper.id in this.items) {
			this.shown[helper.id] = true
		}
	},

	hide: function() {
		this.shown = {}
	},

	blur: function() {
		if(this.focused) this.focused.reset()
	},

	update: function() {
		for(var id in this.items) {
			var helper  = this.items[id]
			,   visible = this.shown[id]

			helper.visible.set(!!visible, 'show')

			if(visible) helper.update()
		}
	}
})




Helper2D.AutoToolHelper = f.unit(Helper2D, {
	unitName: 'Helper2D_AutoToolHelper',
	ename: 'h2d h2d-tool hand',

	create: function() {

		var self = this
		dom.on('touchstart', this.element, function(e) {
			self.start(e)
		})
		dom.on('mousedown', this.element, function(e) {
			if(e.which === 1) self.start(e)
		})
	},

	start: function(e) {
		this.events.emit('action', e)
		// further commit relayed to tool and v2
	}
})

Helper2D.ActionHelper = f.unit(Helper2D, {
	unitName: 'Helper2D_ActionHelper',
	ename: 'h2d h2d-action hand',

	create: function() {
		dom.on('tap', this.element, this)
	},

	handleEvent: function(e) {
		this.events.emit('action')
		this.commit()
	}
})

Helper2D.NumberHelper = f.unit(Helper2D, {
	unitName: 'Helper2D_NumberHelper',
	ename: 'h2d h2d-number',

	roundPosition: true,

	create: function() {
		this.label = dom.div('label', this.element)
		this.input = dom.elem('input', 'text', this.element)
		this.input.type = 'text'


		var self = this

		dom.on('focus', this.input, function() {
			self.input.value = ''
			self.root.focused = self
			self.preventValueUpdate = true
			self.updateSize()
		})

		dom.on('blur', this.input, function() {
			self.root.focused = null
			self.reset()
		})

		dom.on('input', this.input, function() {
			self.updateSize()
		})

		dom.on('change', this.input, function() {
			var value = +self.input.value

			if(isNaN(value)) self.reset()
			else self.updateValue(value)
		})

		dom.on('keydown', this.input, function(e) {
			switch(e.keyCode) {
				case 27: return self.reset()
			}
		})
	},

	setRelated: function(object) {
		this.related = object
		dom.togclass(this.element, 'active', object)
	},

	updateSize: function() {
		dom.text(this.label, this.input.value)

		var w = this.label.offsetWidth
		this.input.style.width = w +'px'
		this.input.style.marginLeft = -w / 2 +'px'
	},

	reset: function() {
		this.preventValueUpdate = false
		this.input.blur()
		this.input.value = this.value
		this.updateSize()
	},

	update: function() {
		if(!this.preventValueUpdate) {
			this.value = f.pround(Observable.unwrap(this.option.value), 1)
			this.input.value = this.value
			this.updateSize()
		}
	},

	updateValue: function(value) {
		this.value = value
		this.node.setOption(this.option, this.value, this.related)
		this.commit()
		this.reset()
	}
})




Helper2D.Contour = f.unit(Helper2D, {
	unitName: 'Helper2D_Contour',
	ename: 'h2d h2d-contour',

	roundPosition: true,

	create: function() {
		this.label = dom.div('label', this.element)
		this.larea = dom.elem('span', null, this.label)
		this.lunit = dom.elem('span', null, this.label)

		this.matrix = new THREE.Matrix4

		Locale.setHtml(this.lunit, 'm_square_meter')

		// @TODO: redraw 2d after action
		this.hrotate = new Helper2D.ActionHelper(this.node, {
			iname: 'action rotate',
			eroot: this.element,
			eicon: 'i-rotate',
			etitle: 'helper_title_rotate',
			root: this
		})
		this.hmove = new Helper2D.AutoToolHelper(this.node, {
			iname: 'action move',
			eroot: this.element,
			eicon: 'i-move',
			etitle: 'helper_title_move',
			root: this
		})
		this.hremove = new Helper2D.ActionHelper(this.node, {
			iname: 'action remove',
			eroot: this.element,
			eicon: 'i-delete',
			etitle: 'helper_title_remove',
			root: this
		})

		this.hmove  .events.on('action', this.cmove, this)
		this.hrotate.events.on('action', this.rotate, this, -90)
		this.hremove.events.on('action', this.remove, this, false)
	},

	cmove: function(e) {
		this.root.events.emit('mouse', e)
		this.root.events.emit('move', this.node)
	},

	rotate: function(angle) {
		this.matrix.makeRotationY(f.torad(angle))

		var points = this.node.obvPoints.read()
		,   center = this.node.obvCenter.read()

		for(var i = 0; i < points.length; i++) {
			var point = points[i]

			var v3 = point.obvVertex.read().clone()
				.sub(center)
				.applyMatrix4(this.matrix)
				.add(center)

			point.obvVertex.write(v3)
		}
	},

	remove: function() {
		if(this.node.setOption('remove')) {
			this.commit()
		}
	},

	update: function() {
		dom.text(this.larea, f.pround(this.node.obvArea.read(), 1) +' ')
	}
})

Helper2D.WallSplit = f.unit(Helper2D.ActionHelper, {
	unitName: 'Helper2D_WallSplit',
	ename: 'h2d h2d-action wall-split hand',
	etitle: 'helper_title_split',

	create: function() {
		this.events.on('action', this.split, this)
	},

	split: function() {
		var contour = this.node.obvParent.read()
		,   center  = this.node.obvCenter.read()
		,   index   = this.node.obvMountIndex.read()
		,   points  = contour.obvPoints.read().slice()

		points.splice(index +1, 0, new ANode.Point([center.x, center.z]))

		contour.obvPoints.write(points)
	}
})

Helper2D.NodeWidth = f.unit(Helper2D.NumberHelper, {
	unitName: 'Helper2D_NodeWidth',
	etitle: 'helper_title_size',

	create: function() {
		this.option = this.node.options.width
	}
})
