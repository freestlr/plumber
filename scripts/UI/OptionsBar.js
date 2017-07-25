UI.OptionsBar = f.unit(Block, {
	unitName: 'UI_OptionsBar',
	ename: 'options-bar',
	cacheSize: false,

	create: function() {
		this.wrap = dom.div('options-wrap', this.element)
		this.clear()
	},

	clear: function() {
		dom.html(this.wrap, '')

		this.updates  = []
		this.controls = []

		this.resizeables && this.resizeables.forEach(f.func('destroy'))
		this.resizeables = []

		this.watched && this.watched.forEach(Locale.unwatch)
		this.watched = []

		delete this.nodes
	},

	setNodeList: function(nodes) {
		this.clear()

		if(nodes && nodes.length) {
			this.nodes = nodes
			this.makeLabel(this.nodes)

			var first = this.nodes[0]
			,   different = false
			for(var i = 1; i < this.nodes.length; i++) {

				if(this.nodes[i].name !== first.name) {
					different = true
					break
				}
			}

			var options = this.nodes.map(f.prop('options'))
			if(different) {
				this.addControl('remove', options.map(f.prop('remove')))

			} else for(var name in first.options) {
				this.addControl(name, options.map(f.prop(name)))
			}
		}

		this.visible.set(!!this.controls.length, 'controls')
		this.update()
	},

	addControl: function(name, optionList) {
		var option = optionList[0]
		,   type = option.type
		,   label = Observable.unwrap(option.label)

		var control = {
			id: 'option-bar-item-'+ name,
			name: name,
			list: optionList,
			option: option,
			root: dom.div('option option-'+ type, this.wrap)
		}

		var methods = {
			'action'  : this.makeButton,
			'boolean' : this.makeCheckbox,
			'number'  : this.makeNumberField,
			'sample'  : this.makeSampleSelector
		}

		if(label) {
			control.label = dom.elem('label', 'label', control.root)
			this.watched.push(Locale.setText(control.label, label))
		}

		if(type in methods) {
			control.element = methods[type].call(this, optionList, control)
			control.element.setAttribute('id', control.id)
			dom.append(control.root, control.element)
		}

		this.updates.push(new Observable().set(this, function() {
			var disabled = true
			,   hidden   = true
			for(var i = 0; i < optionList.length; i++) {
				var option = optionList[i]

				hidden   &= Observable.unwrap(option.hidden)
				disabled &= Observable.unwrap(option.disabled)
			}

			dom.display(control.root, !hidden, '')
			dom.togclass(control.root, 'disabled', !!disabled)

			this.needsResize = true

			return NaN
		}))

		this.controls.push(control)
	},

	commitOption: function(optionList, value, silent) {
		var valid = true
		,   active = []
		for(var i = 0; i < optionList.length; i++) {
			var option = optionList[i]

			if(Observable.unwrap(option.disabled)
			|| Observable.unwrap(option.hidden)) continue

			active.push(option)

			valid &= option.node.validOption(option, value instanceof Array ? value[i] : value)
		}
		if(!valid) return


		var save = false
		for(var i = 0; i < active.length; i++) {
			var option = active[i]

			save |= option.node.setOption(option, value instanceof Array ? value[i] : value)
		}


		if(save && !silent) {
			main.bus.emit('history_push')
		}
	},

	update: function() {
		if(!this.visible.value) return

		this.updates.forEach(f.func('read'))

		if(this.needsResize) {
			this.autoresize()
		}
	},

	makeLabel: function(nodes) {
		var labels = f.sor(nodes.map(f.prop('label')).map(Observable.unwrap))
		,   label  = labels.length === 1 ? labels[0] : 'node_label_multiple'
		if(!label) return

		var root = dom.div('option node-label', this.wrap)
		,   name = dom.elem('span', 'label-name', root)
		,   num  = dom.elem('span', 'label-index', root)

		this.watched.push(Locale.setText(name, label))

		if(nodes.length === 1) {
			var node = nodes[0]
			if(node instanceof ANode.Floor && !node.obvIsRoof.read()) {
				dom.text(num, ' '+ (node.obvMountIndex.read() +1))
			} else {
				dom.text(num, '')
			}
		} else {
			dom.text(num, ' ['+ nodes.length +']')
		}

		return root
	},

	makeButton: function(optionList, control) {
		var element = dom.div('field hand', this.wrap)

		var block = new Block.Toggle({
			ename: 'overlay',
			handed: false,
			eroot: element,
			eicon: optionList[0].icon,
			active: false
		})

		block.events.on('change', this.commitOption, this, [optionList])
		return element
	},

	makeCheckbox: function(optionList, control) {
		var block = new Block.Toggle({
			eroot: this.wrap,
			ename: 'field hand',
			handed: false
		})

		this.updates.push(new Observable().set(this, function() {
			var active = false
			for(var i = 0; i < optionList.length; i++) {
				active |= Observable.unwrap(optionList[i].value)
			}

			block.set(!!active)

			return NaN
		}))

		dom.addclass(control.label, 'hand')
		dom.on('tap', control.label, block.events.will('tap'))

		block.events.on('change', this.commitOption, this, [optionList])
		return block.element
	},

	makeNumberField: function(optionList, control) {
		var self = this

		var input = dom.elem('input', 'field', this.wrap)
		,   drag = new Drag(control.label)
		,   scale = 1

		var length = optionList.length
		,   values
		,   offsets

		this.updates.push(new Observable().set(this, function() {
			scale   = Infinity
			values  = []
			offsets = []

			var disabled = true
			,   average = 0

			var dl = Infinity
			,   dr = Infinity

			for(var i = 0; i < length; i++) {
				var option = optionList[i]

				var oval = Observable.unwrap(option.value)
				,   omin = Observable.unwrap(option.min)
				,   omax = Observable.unwrap(option.max)
				,   ostp = Observable.unwrap(option.step)
				,   odis = Observable.unwrap(option.disabled)

				if(!isNaN(ostp)) scale = Math.min(scale, +ostp)

				var min = isNaN(omin) ? -Infinity : +omin
				,   max = isNaN(omax) ?  Infinity : +omax

				var dl = Math.min(dl, oval - min)
				,   dr = Math.min(dr, max - oval)

				disabled &= odis

				average += oval
				values.push(oval)
			}

			average /= length

			drag.min.x = average - dl
			drag.max.x = average + dr
			drag.offset.x = average
			drag.scale = isFinite(scale) ? scale / 10 : 0.1

			if(drag.min.x > drag.max.x) {
				drag.min.x = drag.max.x = drag.offset.x
			}

			input.value = f.hround(drag.offset.x)
			input.disabled = !!disabled

			for(var i = 0; i < length; i++) {
				offsets.push(values[i] - average)
			}

			return NaN
		}))

		function commit(global) {
			self.commitOption(optionList, offsets.map(function(dx) {
				return global + dx
			}), true)
		}

		function save() {
			main.bus.emit('history_push')
		}

		var wheel_save = f.postpone(500, save)


		drag.events.on('drag', function(offset) {
			commit(offset.x)
		})
		drag.events.on('end', save)

		dom.on('change', input, function() {
			self.commitOption(optionList, +input.value)
		})

		dom.on('wheel', control.root, function(e) {
			var delta  = e.wheelDeltaY || -e.deltaY
			,   change = delta / Math.abs(delta)
			,   value  = drag.offset.x + change * scale

			if(drag.min.x <= value && value <= drag.max.x) {
				commit(value)
				wheel_save()
			}
		})

		return input
	},

	makeSampleSelector: function(optionList) {
		var option = optionList[0]
		var value = Observable.unwrap(option.value)
		var sample = main.sampler.samples[value]
		var element = dom.div('field hand', this.wrap)

		// houston, we have a problem
		var samples = main.sampler.getList(sample.type)
		,   names   = samples.map(UI.getSampleImage)

		var block = new UI.Submenu({
			ename: 'overlay',
			sname: 'option-sample-menu submenu',
			cname: 'option-sample-item submenu-item',
			eroot: element,
			distance: 16,
			align: 'top',
			eicon: UI.getSampleImage(sample.id),

			icons: names,
			titles: main.debug ? names : null,
			items: samples
		})

		block.menu.setItem(sample.id)
		block.menu.events.on('change', this.changeSampleItem, this, [block, optionList])

		this.resizeables.push(block)
		return element
	},

	changeSampleItem: function(block, optionList, value) {
		UI.setSampleImage(block.element, value)

		this.commitOption(optionList, value)
	},

	autoresize: function() {
		var width  = this.wrap.offsetWidth
		,   height = this.wrap.offsetHeight

		this.resize(width, height)
		this.resizeables.forEach(f.func('autoresize'))
		this.needsResize = false
	}
})
