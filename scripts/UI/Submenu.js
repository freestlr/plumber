UI.Submenu = f.unit(Block.Toggle, {
	unitName: 'UI_Submenu',
	ename: 'submenu-toggle hand',
	cname: 'submenu-item',
	sname: 'submenu',

	distance: 12,
	itemSize: 74,
	margin: 4,
	align: 'right',
	cacheSize: false,
	menuVisibleMethod: dom.display,
	square: true,

	create: function() {
		this.tip = new Block.Tip({
			eroot: this.sroot || document.body
		})

		this.menu = new Block.Menu({
			element: this.tip.content,
			ename: this.sname,
			cname: this.cname,

			icons: this.icons,
			titles: this.titles,
			labels: this.labels,
			texts: this.texts,
			items: this.items
		})

		this.set(false, true)
		this.events.on('active', UI.Submenu.closeAll, null, this)

		UI.Submenu.instances.push(this)
	},

	destroy: function() {
		f.adrop(UI.Submenu.instances, this)
		dom.remove(this.tip.element)
	},

	update: function() {
		dom.togclass(this.element, 'active',   this.active)
		dom.togclass(this.element, 'disabled', this.disabled)

		this.tip.visible.set(this.active, 'submenu')
		if(this.active) this.autoresize()
	},

	autoresize: function() {
		if(this.square) {
			var items = this.menu.blocks.length
			,   cols  = Math.ceil(Math.sqrt(items))
			,   rows  = Math.ceil(items / cols)
			,   size  = this.itemSize

			this.menu.resize(size * cols + this.margin, size * rows + this.margin)

		} else {
			this.menu.autoresize()
		}

		this.tip.moveToElement(this.element, this.align, this.distance)
	}
})
UI.Submenu.instances = []

UI.Submenu.closeAll = function(except) {
	UI.Submenu.instances.forEach(function(submenu) {
		if(submenu !== except) submenu.set(0, true)
	}, this)
}
