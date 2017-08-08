UI.Sidebar = f.unit(Block, {
	unitName: 'UI_Sidebar',
	ename: 'sidebar',

	create: function() {
		this.get = new Loader

		this.file = new FileImport
		dom.append(this.element, this.file.element)


		this.sampleMenu = new Block.Menu({
			eroot: this.element,
			ename: 'sample-menu',
			deselect: true,

			options: {
				factory: Block.Toggle,
				ename: 'sample-item'
			}
		})

		this.sampleMenu.events.relay('change', this.events, 'sample_change')
		this.file.events.relay('import', this.events, 'file_import')

		dom.addclass(this.element, 'ontouchstart' in window ? 'touch' : 'no-touch')
	},

	addSample: function(id, name, thumb, removable) {
		var menu = this.sampleMenu

		this.remSample(id)

		var block = menu.addItem({ data: id })

		block.element.setAttribute('draggable', true)

		block.watchEvents.push(
			new EventHandler(this.onSampleDrag, this, block).listen('dragstart', block.element))


		if(thumb) {
			dom.img(thumb, 'sample-thumb', block.element)
		}

		if(name) {
			dom.text(dom.div('sample-name', block.element), name)
		}

		if(removable) {
			block.remove = dom.div('sample-remove hand', block.element)

			block.watchAtlas.push(
				Atlas.set(block.remove, 'i-cross', 'absmid'))

			block.watchEvents.push(
				new EventHandler(this.onSampleRemove, this, block).listen('tap', block.remove))
		}
	},

	remSample: function(id) {
		var menu = this.sampleMenu

		menu.removeBlock(menu.blocks[menu.getIndex(id)])
	},

	setSample: function(id) {
		this.sampleMenu.setItem(id)
	},

	onSampleRemove: function(block) {
		this.sampleMenu.removeBlock(block, true)

		this.events.emit('sample_remove', block.data)
	},

	onSampleDrag: function(block, e) {
		e.dataTransfer.setData('text/sid', block.data)
	}
})
