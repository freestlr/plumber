UI = {
	imagesFolder: 'images/',
	inactiveImage: 'images/thumbs/thumb-inactive.png',
	absentImage: 'images/thumbs/thumb-absent.png',

	setImage: function(element, src) {
		if(!src) return

		var img = new Image
		img.src = src
		dom.append(element, img)
		return img
	},

	getSampleImage: function(sid) {
		var sample = main.sampler.samples[sid]
		return sample ? sample.name : 'unknown/'+ sid
	},

	setSampleImage: function(element, sid) {
		return Atlas.set(element, UI.getSampleImage(sid))
	}
}


UI.MainMenu = f.unit(Block.List, {
	unitName: 'UI_MainMenu',
	iname : 'header',
	cacheSize: false,

	create: function() {
		this.plannerLogo = dom.div('logo head-menu-cell', this.element)

		this.mobileButton = new Block.Toggle({
			ename: 'head-menu-mobile-toggle absmid',
			eroot: this.element,
			eicon: 'i-menu',
			noauto: true,
			active: false
		})

		this.mobileButton.events.on('tap', main.bus.will('open_mobile_menu'))

		this.modeMenu = new Block.Menu({
			cname   : 'mode-menu-item head-menu-cell',
			element : this.element,
			icons: [
				'm-floor',
				'm-door',
				'm-roof',
				'm-cut',
				'm-material',
				'm-calc'
			],
			labels: [
				'menu_label_floor',
				'menu_label_door',
				'menu_label_roof',
				'menu_label_cut',
				'menu_label_material',
				'menu_label_calc'
			],
			items: [
				'floor',
				'door',
				'roof',
				'cut',
				'material',
				'calc'
			]
		})

		dom.div('filler-in head-menu-cell', this.element)


		this.histUndo = new Block.Toggle({
			ename: 'hist-menu-item head-menu-cell inactive hand slow-01 undo',
			eroot: this.element,
			eicon: 'i-undo',
			active: false,
			noauto: true,
			elabel: 'menu_label_undo'
		})

		this.histRedo = new Block.Toggle({
			ename: 'hist-menu-item head-menu-cell inactive hand slow-01 redo',
			eroot: this.element,
			eicon: 'i-redo',
			active: false,
			noauto: true,
			elabel: 'menu_label_redo'
		})

		this.templates = new UI.Submenu({
			ename: 'hist-menu-item head-menu-cell hand slow-01 template',
			sname: 'tpl-menu submenu',
			cname: 'tpl-menu-item submenu-item',
			distance: 12,
			align: 'bottom',
			square: false,
			eroot: this.element,
			menuVisibleMethod: dom.visible,

			eicon: 'i-template',
			elabel: 'menu_label_template',
			icons: [
				'i-template-new',
				'i-template',
				'i-file-load',
				'i-file-save'
			],
			labels: [
				'menu_label_template_new',
				'menu_label_template_filter',
				'menu_label_template_load',
				'menu_label_template_save'
			],
			items: [
				'new',
				'filter',
				'load',
				'save'
			]
		})
		this.templates.menu.events.on('change', this.tplMenuItemChange, this)

		this.helpItem = new UI.Submenu({
			ename: 'hist-menu-item head-menu-cell hand slow-01 help-item',
			sname: 'tpl-menu submenu',
			cname: 'tpl-menu-item submenu-item',
			distance: 12,
			align: 'bottom',
			square: false,
			eroot: this.element,
			menuVisibleMethod: dom.visible,

			eicon: 'i-help',
			elabel: 'menu_label_help',
			icons: [
				'i-video',
				'i-tutorial'
			],
			labels: [
				'menu_label_help_video',
				'menu_label_help_guide'
			],
			items: [
				'video',
				'guide'
			]
		})
		this.helpItem.menu.events.on('change', this.helpMenuItemChange, this)


		this.histUndo.events.on('tap', main.bus.will('history_undo'))
		this.histRedo.events.on('tap', main.bus.will('history_redo'))


		dom.div('filler-last head-menu-cell', this.element)

		this.langMenu = new UI.Submenu({
			eroot: this.element,
			ename: 'hist-menu-item head-menu-cell hand slow-01 lang-menu',
			sname: 'lang-submenu submenu',
			cname: 'lang-submenu-item submenu-item',
			menuVisibleMethod: dom.visible,
			distance: -18,
			align: 'bottom',
			square: false,
			items: ['ru', 'en']
		})
		this.langMenuItem(this.langMenu)
		this.langMenu.menu.events.on('change', main.bus.will('lang_change'))
		this.langMenu.menu.blocks.forEach(this.langMenuItem, this)
		this.langMenu.menu.blocks.forEach(this.updateLangMenuItem, this)

		this.modeMenu.events.on('change', main.bus.will('mode_change'))
	},

	langMenuItem: function(block) {
		dom.div('image', block.element)
		dom.div('text',  block.element)
	},

	updateLangMenuItem: function(block) {
		var image = dom.one('.image', block.element)
		,   text  = dom.one('.text',  block.element)

		var texts = {
			ru: 'RU',
			en: 'EN'
		}

		var images = {
			ru: 'images/locale_ru.png',
			en: 'images/locale_en.png'
		}

		dom.text(text, texts[block.data])
		image.style.backgroundImage = 'url('+ images[block.data] +')'
	},

	updateLang: function(lang) {
		this.langMenu.set(0)
		this.langMenu.data = lang
		this.updateLangMenuItem(this.langMenu, lang)

		this.langMenu.menu.setItem(lang)
		this.langMenu.menu.blocks.forEach(function(block) {
			dom.display(block.element, lang !== block.data)
		})
	},

	histMenuItem: function(block) {
		block.proxyEvent('tap')
	},

	tplMenuItemChange: function(item) {
		this.templates.set(false, true)
		this.templates.menu.set(-1)

		switch(item) {
			case 'new':
				main.bus.emit('tpl_new')
			break

			case 'filter':
				main.bus.emit('tpl_filter')
			break

			case 'load':
				main.bus.emit('tpl_load')
			break

			case 'save':
				main.bus.emit('tpl_save')
			break
		}
	},

	helpMenuItemChange: function(item) {
		this.helpItem.set(false, true)
		this.helpItem.menu.set(-1)

		switch(item) {
			case 'video':
				main.bus.emit('popup_video', this.helpVideoSource)
			break

			case 'guide':
				main.bus.emit('help_guide')
			break
		}
	},

	onresize: function() {
		this.templates.autoresize()
		this.helpItem.autoresize()
		this.langMenu.autoresize()
	}
})

UI.MobileMenu = f.unit(Block.Toggle, {
	unitName: 'UI_MobileMenu',
	ename: 'mobile-menu out-02',
	handed: false,
	noauto: true,
	active: false,

	create: function() {
		this.header = dom.div('mobile-menu-head', this.element)
		this.contentWrap = dom.div('mobile-menu-wrap touchscroll', this.element)
		this.content = dom.div('mobile-menu-body', this.contentWrap)

		this.plannerLogo = dom.div('mobile-menu-logo', this.header)

		this.closeButton = new Block.Toggle({
			ename: 'mobile-menu-close',
			eroot: this.header,
			eicon: 'i-close',
			active: false,
			noauto: true
		})


		this.templateNew = new Block.Toggle({
			ename: 'mobile-menu-item tpl-new',
			eroot: this.content,
			// eicon: 'i-template-new',
			elabel: 'menu_label_template_new',
			active: false,
			noauto: true
		})

		this.templateFilter = new Block.Toggle({
			ename: 'mobile-menu-item tpl-filter',
			eroot: this.content,
			// eicon: 'i-template-new',
			elabel: 'menu_label_template_filter',
			active: false,
			noauto: true
		})

		this.templateLoad = new Block.Toggle({
			ename: 'mobile-menu-item tpl-load',
			eroot: this.content,
			// eicon: 'i-template-new',
			elabel: 'menu_label_template_load',
			active: false,
			noauto: true
		})

		this.templateSave = new Block.Toggle({
			ename: 'mobile-menu-item tpl-save',
			eroot: this.content,
			// eicon: 'i-template-new',
			elabel: 'menu_label_template_save',
			active: false,
			noauto: true
		})

		this.langButton = new Block.Toggle({
			ename: 'mobile-menu-item mobile-menu-item-lang',
			eroot: this.content,
			eicon: 'i-arrow',
			elabel: 'menu_label_lang',
			active: false,
			noauto: true
		})

		this.shareButton = new Block.Toggle({
			etag: 'a',
			ename: 'mobile-menu-item mobile-menu-item-share',
			eroot: this.content,
			// eicon: 'i-link',
			elabel: 'menu_label_share',
			active: false,
			noauto: true
		})

		this.helpButton = new Block.Toggle({
			ename: 'mobile-menu-item mobile-menu-item-help',
			eroot: this.content,
			// eicon: 'i-help',
			elabel: 'menu_label_help',
			active: false,
			noauto: true
		})

		this.modeMenu = new Block.Menu({
			ename: 'mobile-mode-menu',
			cname: 'mobile-mode-menu-item mobile-menu-item',
			eroot: this.content,
			// icons: [
			// 	'm-floor',
			// 	'm-door',
			// 	'm-roof',
			// 	'm-cut',
			// 	'm-material',
			// 	'm-calc'
			// ],
			labels: [
				'menu_label_floor',
				'menu_label_door',
				'menu_label_roof',
				'menu_label_cut',
				'menu_label_material',
				'menu_label_calc'
			],
			items: [
				'floor',
				'door',
				'roof',
				'cut',
				'material',
				'calc'
			]
		})



		this.makeLangButton(this.langButton)


		this.closeButton.events.on('tap',    this.set, this, 0)
		this.langButton.events.on('tap',     this.set, this, 0)
		this.shareButton.events.on('tap',    this.set, this, 0)
		this.helpButton.events.on('tap',     this.set, this, 0)
		this.templateNew.events.on('tap',    this.set, this, 0)
		this.templateFilter.events.on('tap', this.set, this, 0)
		this.templateLoad.events.on('tap',   this.set, this, 0)
		this.templateSave.events.on('tap',   this.set, this, 0)
		this.modeMenu.events.on('change',    this.set, this, 0)

		this.langButton.events.on('tap',     this.setNextLang, this)
		this.shareButton.events.on('tap',    main.bus.will('open_share'))
		this.helpButton.events.on('tap',     main.bus.will('open_help'))
		this.templateNew.events.on('tap',    main.bus.will('tpl_new'))
		this.templateFilter.events.on('tap', main.bus.will('tpl_filter'))
		this.templateLoad.events.on('tap',   main.bus.will('tpl_load'))
		this.templateSave.events.on('tap',   main.bus.will('tpl_save'))
		this.modeMenu.events.on('change',    main.bus.will('mode_change'))

		// this.scroll = new iScroll(this.contentWrap, { vScroll: true, hScroll: false })

		main.bus.on('open_mobile_menu', this.set, this, 1)
		this.events.on('change', this.autoresize, this)
	},

	makeLangButton: function(block) {
		this.nextLangItem = dom.div('lang-next absmid', block.element)
	},

	updateLang: function(lang) {
		var list = Object.keys(Locale.assets)
		,   curr = list.indexOf(lang)
		,   next = list[(curr + 1) % list.length]

		this.nextLang = next
		dom.text(this.nextLangItem, next)
	},

	updateLink: function(link) {
		this.shareButton.element.setAttribute('href', link)
	},

	setNextLang: function() {
		main.bus.emit('lang_change', this.nextLang)
	},

	autoresize: function() {
		var elementHeight = this.element.offsetHeight
		var headerHeight = this.header.offsetHeight

		this.contentWrap.style.height = elementHeight - headerHeight +'px'

		// this.scroll.refresh()
	}
})

UI.ToolMenu = f.unit(Block.Menu, {
	unitName: 'UI_ToolMenu',
	ename: 'tool-menu',
	cname: 'tool-menu-item slow-01',
	cacheSize: false,

	create: function() {
		this.container = dom.div('wrap', this.element)
	},

	autoresize: function() {
		var parent = this.element.parentNode
		if(!parent || !this.blocks || !this.blocks.length) return

		var parentH = parent.offsetHeight - 20
		,   totalH = 0
		,   maxW = 0
		,   maxH = 0

		for(var i = 0; i < this.blocks.length; i++) {
			var block = this.blocks[i]

			maxW = Math.max(maxW, block.element.offsetWidth)
			maxH = Math.max(maxH, block.element.offsetHeight)
			totalH += block.element.offsetHeight
		}

		var cols = Math.ceil(totalH / parentH)
		,   rows = Math.ceil(this.blocks.length / cols)

		var w = maxW * cols
		,   h = maxH * rows

		dom.togclass(this.element, 'cols-3', cols === 3)
		dom.togclass(this.element, 'cols-2', cols === 2)
		dom.togclass(this.element, 'cols-1', cols === 1)

		if(w && h) this.resize(w, h)
	}
})


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



UI.FloorMenu = f.unit(Block.Menu, {
	unitName: 'UI_FloorMenu',
	ename: 'floor-menu',
	cname: 'floor-menu-item',

	create: function() {
		this.container = dom.div('wrap', this.element)

		this.plus = new UI.Submenu({
			ename: this.cname,
			iname: 'plus hand',
			sname: 'plus-menu submenu',
			cname: 'plus-menu-item submenu-item',
			text: '+',
			distance: 28,
			eroot: this.container,
			etitle: 'layer_title_add',
			align: 'left',

			icons: [
				't-floor',
				't-roof'
			],
			titles: [
				'layer_title_addfloor',
				'layer_title_addroof'
			],
			items: [
				'floor',
				'roof'
			]
		})

		this.plus.menu.events.on('change', this.onPlusMenu, this)

		this.events.on('change', main.bus.will('floor_change'))
	},

	createItem: function(options, index) {
		var floor = options.data

		options.floor = floor
		options.text = floor +1
		options.eicon = 'i-roof-fill'

		var block = new Block.Toggle(options)

		block.bVisible = new Block.Toggle({
			ename: 'visible action hand',
			active: true,
			handed: false,
			eicon: 'i-visible',
			etitle: 'layer_title_visible',
			eroot: block.element
		})

		block.bRemove = new Block.Toggle({
			ename: 'remove action hand',
			active: false,
			handed: false,
			disabled: floor === 0,
			eicon: 'i-delete',
			etitle: 'layer_title_remove',
			eroot: block.element
		})

		dom.addclass(block.element, 'floor-'+ (floor +1))

		return block
	},

	plusMenuVisible: function(elem, visible) {
		dom.togclass(elem, 'hidden', !visible)
	},

	onitemtap: function(block, ev) {
		switch(ev.target) {
			case block.bRemove.element:
				block.bRemove.set(0)
				if(block.floor > 0) this.removeFloor(block.floor)
			break

			case block.bVisible.element:
				main.bus.emit('floor_show', [block.floor, block.bVisible.active])
			break

			default:
				this.set(this.blocks.indexOf(block), true)
		}
	},

	onPlusMenu: function(type) {
		this.plus.menu.set(-1)
		this.plus.set(false, true)

		main.bus.emit('floor_add', [this.floors, type === 'roof'])
	},

	setFloors: function(count, withRoof) {
		this.floors = count
		this.roof   = withRoof
		this.update()
	},

	removeFloor: function(floor) {
		if(this.active >= floor) {
			this.set(this.active -1, true)
		}

		main.bus.emit('floor_del', floor)
	},

	update: function() {
		dom.display(this.plus.element, !this.roof && this.floors < this.blocks.length)

		this.blocks.forEach(this.updateBlock, this)
		this.autoresize()
	},

	updateBlock: function(block, index) {
		block.set(index === this.active)
		block.visible.set(block.floor < this.floors)
		dom.togclass(block.element, 'roof', this.roof && block.floor === this.floors -1)
	},

	autoresize: function() {
		var w = this.container.offsetWidth
		,   h = this.container.offsetHeight

		if(w && h) this.resize(w, h)

		this.plus.autoresize()
	}
})


UI.DoorToolMenu = f.unit(UI.ToolMenu, {
	unitName: 'UI_DoorToolMenu',
	ename: 'door-tool-menu tool-menu',
	cname: 'door-tool-menu-item tool-menu-item slow-01',
	cacheSize: false,

	create: function() {
		this.resizeables = []
	},

	createPost: function() {
		this.visible.events.on('change', this.updateVisible, this)
	},

	makeSamplesList: function() {
		this.blocks.forEach(this.createSubmenu, this)
		this.enableEvents = true
	},

	createSubmenu: function(block) {
		var samples = main.sampler.getList(block.data)
		,   names   = samples.map(UI.getSampleImage)

		var submenu = new UI.Submenu({
			ename: 'samples hand',
			sname: 'door-tool-submenu submenu',
			cname: 'door-tool-submenu-item submenu-item',
			eroot: block.element,
			distance: 18,
			visibleMethod: dom.visible,
			align: 'right',

			icons: names,
			// titles: names,
			items: samples
		})

		block.events.on('change', this.onBlockChange, this, [block, submenu])
		submenu.menu.events.on('change', this.onSubChange, this, [block, submenu])

		switch(block.data) {
			case 'window':
				submenu.menu.setItem('wrzvh', true)
			break

			default:
				submenu.menu.set(0, true)
		}

		submenu.set(0, true)
		submenu.visible.off()
		this.resizeables.push(submenu)
		block.submenu = submenu
	},

	onBlockChange: function(block, submenu, active) {
		submenu.visible.set(active)

		if(active) {
			this.setTool(block)

		} else {
			submenu.set(0)
		}
	},

	onSubChange: function(block, submenu, sid) {
		block.sid = sid
		submenu.set(0)

		UI.setSampleImage(block.element, sid)

		this.setTool(block)
	},

	setTool: function(block) {
		if(this.enableEvents) {
			main.bus.emit('tool_change', [block.data, block.sid])
		}
	},

	updateVisible: function(visible) {
		if(visible) this.autoresize()
	},

	onresize: function() {
		this.resizeables.forEach(f.func('autoresize'))
	}
})


UI.MaterialWindow = f.unit(Block.Menu, {
	unitName: 'UI_MaterialWindow',
	ename: 'material-window',
	cname: 'mat-head-item',

	create: function() {
		this.container = dom.div('mat-head', this.element)

		this.itemsSubmenu = new UI.Submenu({
			eroot: this.element,
			ename: 'material-items-submenu-toggle submenu-toggle',
			sname: 'material-items-submenu submenu',
			cname: 'material-items-submenu-item submenu-item',

			align: 'top',
			square: true,
			distance: 12,
			cacheSize: false,
			menuVisibleMethod: dom.visible
		})

		this.itemsSubmenu.events.on('change', this.submenuVisible, this)
		this.itemsSubmenuWatch = []

		this.events.on('change', this.openCategory, this)
		this.events.on('open_color', this.openColor, this)
		this.events.on('open_group', this.openGroup, this)

		this.content = dom.div('mat-list', this.element)
		this.loading = dom.img('images/loading.gif', 'mat-loading absmid', this.content)

		dom.on('mouseover', this.content, this)
		dom.on('mouseleave', this.content, this)
		dom.on('mousedown', this.content, this)
		dom.on('touchstart', this.content, this)

		this.categories = {}
		this.categoriesDB  = {}
		this.elementsGroup = {}
		this.elementsThumb = {}

		this.elementList = {}
		this.scrollsList = {}

		this.slotList = []

		this.items.forEach(this.makeCategory, this)

		this.visible.events.on('opened', this.refresh, this)
	},

	handleEvent: function(e) {
		switch(e.type) {
			case 'mouseleave':
			case 'mouseover': this.onover(e)
			break

			case 'touchstart':
			case 'mousedown': this.itemsSubmenu.set(0, true)
			break
		}
	},

	onover: function(e) {
		var category = this.categoriesDB[this.category]
		if(category && category.scroll.animating) return

		var id = e.target.dataset.fabricId
		if(id == this.hoveredItem) return

		this.hoveredItem = id

		this.openColor(id || this.itemList, 'ui_hover', false, e)

		main.bus.emit('mat_select', !id)
	},

	onresize: function() {
		this.refresh()
	},

	refresh: function() {
		var cat = this.categoriesDB[this.category]
		if(!cat) return

		setTimeout(function() {
			cat.scroll.refresh()
		}, 0)
	},

	removePreloader: function() {
		dom.remove(this.loading)
		delete this.loading
	},

	makeCategory: function(name) {
		var element = dom.div('mat-group-wrap slow-03')
		,   content = dom.div('mat-group-list clearfix', element)

		var scroll = new iScroll(element, {
			vScroll: false,
			hScroll: true,
			speed: 2000,
			speedMax: 700
		})

		this.categoriesDB[name] = {
			element: element,
			content: content,
			groups : 0,
			scroll : scroll
		}
	},

	makeProducts: function(products) {

		this.products = products
		this.itemToGroup   = {}
		this.elementsGroup = {}
		this.elementsThumb = {}

		var groups = main.db.query()
			.from('group')
			.joinRight('product', 'group.id', 'product.gid')
			.joinInner('unit', 'product.uid', 'unit.id')
			.where('unit.name', 'in', this.items)
			.groupBy('group.id', 'unit.name')
			.joinLeft('image', 'group.logo', 'image.id')
			.select(
				'unit.id as uid',
				'unit.name as unit',
				'group.id as gid',
				'group.name as group',
				'group.title as title',
				'group.subtitle as subtitle',
				'image.object as logo')


		groups.forEach(this.makeGroup, this)

		for(var name in this.categoriesDB) {
			var cat = this.categoriesDB[name]

			cat.content.style.width = cat.groups * 140 +'px'
			cat.scroll.refresh()
		}
	},

	makeGroup: function(group) {
		var category = this.categoriesDB[group.unit]

		var items = this.products.filter(function(prod) {
			return prod.unit === group.unit
				&& prod.gid  === group.gid
		})

		for(var i = 0; i < items.length; i++) {
			var prodA = items[i]

			for(var j = items.length -1; j > i; j--) {
				var prodB = items[j]

				if(prodA.cid === prodB.cid) items.splice(j, 1)
			}
		}


		if(!items.length) return

		category.groups++

		var elem  = dom.div('mat-group slow-03', category.content)
		,   thumb = dom.div('thumb', elem)
		,   title = dom.div('title', elem)
		,   subt  = dom.div('subtitle', elem)
		,   list  = dom.div('mat-item-list clearfix', elem)
		,   image

		if(group.title) Locale.setText(title, group.title)
		if(group.subtitle) Locale.setText(subt, group.subtitle)

		if(group.inactive) {
			image = UI.inactiveImage
			dom.addclass(elem, 'inactive')

		} else {
			image = group.logo && group.logo !== -1 && group.logo.url

			if(!image) console.warn('no image')

			if(!image) for(var i = 0; i < items.length; i++) {
				var item = items[i]

				if(item.thumb) {
					image = item.thumb.url
					break
				}
				if(item.texture) {
					image = item.texture.url
					break
				}
			}
		}

		dom.on('tap', elem, this.events.will('open_group', [items, elem, category]))

		items.forEach(function(item) {
			var element = this.makeItem(item)
			if(!element) return

			dom.append(list, element)
			this.itemToGroup[item.id] = group.gid
		}, this)

		list.style.width = items.length * 17 +'px'
		thumb.style.backgroundImage = 'url('+ (image || UI.absentImage) +')'
		this.elementsGroup[group.unit + group.gid] = elem
	},

	makeItem: function(item) {
		if(item.hidden) return

		var elem = dom.div('mat-item hand slow-01')

		if(item.title) {
			Locale.setTitle(elem, item.title)
		}

		if(item.color) {
			elem.style.backgroundColor = item.color
		} else if(item.thumb) {
			elem.style.backgroundImage = 'url('+ item.thumb.url +')'
		} else if(item.texture) {
			elem.style.backgroundImage = 'url('+ item.texture.url +')'
		}

		if(!item.inactive) {
			dom.on('tap', elem, this.events.will('open_color', [item.id, false, false]))
		}
		elem.dataset.fabricId = item.id

		this.elementsThumb[item.id] = elem
		return elem
	},

	makeSubmenuItem: function(item) {
		if(item.hidden) return

		var block = this.itemsSubmenu.menu.addItem(item.id)
		,   image = dom.div('material-items-submenu-item-image', block.element)
		,   label = dom.div('material-items-submenu-item-label', block.element)

		if(item.title) {
			this.itemsSubmenuWatch.push(Locale.setText(label, item.title))
		}

		if(item.color) {
			image.style.backgroundColor = item.color
		} else if(item.thumb) {
			image.style.backgroundImage = 'url('+ item.thumb.url +')'
		} else if(item.texture) {
			image.style.backgroundImage = 'url('+ item.texture.url +')'
		}

		if(!item.inactive) {
			dom.on('tap', block.element, this.events.will('open_color', [item.id, false, true]))
		}
	},

	setSlots: function(slotList, unitList) {
		this.slotList = slotList || []
		this.unitList = unitList || []
	},

	showSelectedItem: function() {
		var prev = this.prodList || []
		,   next = this.slotList.map(main.imagery.getUsedProduct, main.imagery)

		this.prodList = next
		this.itemList = this.prodList.map(f.prop('id'))

		var diff = f.adiff(next, prev)
		if(!diff.addc && !diff.remc) return


		this.set(-1)
		this.blocks.forEach(function(block) {
			block.set(false)
			block.disabled = this.unitList.indexOf(block.data) < 0
			block.visible.set(!block.disabled)
		}, this)


		for(var i = 0; i < diff.remc; i++) {
			this.itemSelected(diff.rem[i], false)
		}
		for(var i = 0; i < diff.addc; i++) {
			this.itemSelected(diff.add[i], true)
		}

		var units = {}
		for(var i = 0; i < this.prodList.length; i++) {
			var prod = this.prodList[i]
			if(!prod || !prod.unit) continue

			if(!units[prod.unit]) {
				units[prod.unit] = 1
			} else {
				units[prod.unit]++
			}
		}

		var unitsZero = []
		for(var unit in units) {
			unitsZero.push([units[unit], unit])
		}
		if(unitsZero.length) {
			var unit = unitsZero.sort(f.zerosort)[0][1]

			this.setItem(unit, true) || this.set(-1, true)

		} else {
			this.items.some(function(unit) {
				return this.setItem(unit, true)

			}, this) || this.set(-1, true)
		}
	},

	itemSelected: function(prod, visible) {
		if(!prod) return

		dom.togclass(this.elementsGroup[prod.unit + prod.gid], 'selected', visible)
		dom.togclass(this.elementsThumb[prod.id],              'selected', visible)
	},

	openCategory: function(name) {
		if(name === this.category) return

		this.itemsSubmenu.set(0, true)

		var prev = this.categoriesDB[this.category]
		,   next = this.categoriesDB[name]

		var hideclass = 'hide-left'
		,   showclass = 'hide-right'

		if(prev) {
			dom.addclass(prev.element, hideclass)
		}

		if(next) {
			dom.addclass(next.element, showclass)
			dom.append(this.content, next.element)
			setTimeout(dom.remclass, 150, next.element, showclass)
		}

		if(this.cleantimer) this.cleanup()
		this.cleanup = cleanup
		this.cleantimer = setTimeout(f.func('cleanup'), 300, this)

		function cleanup() {
			this.cleantimer = clearTimeout(this.cleantimer)

			if(prev) {
				dom.remove(prev.element)
				dom.remclass(prev.element, hideclass)

				prev.scroll.stop()
				prev.scroll.scrollTo(0, 0, 0)
			}
			if(next) {
				next.scroll.refresh()
			}
		}

		this.category = name
	},

	submenuVisible: function(visible) {

		if(visible) {
			this.itemsSubmenu.autoresize()

		} else {
			this.itemsSubmenu.menu.clearBlocks()
			this.itemsSubmenu.menu.active = -1
			this.itemsSubmenuWatch.forEach(Locale.unwatch)
			this.itemsSubmenuWatch = []
		}
	},

	openGroup: function(items, elem, category, e) {
		if(!e.touch) return

		this.itemsSubmenu.set(0, true)
		if(!items) return


		var offset = dom.offset(elem, null, true)
		offset.x += category.scroll.x
		offset.y += category.scroll.y
		offset.x += elem.offsetWidth / 2

		var anchor = this.itemsSubmenu.element.style
		anchor.left = offset.x +'px'
		// anchor.top  = offset.y +'px'

		items.forEach(this.makeSubmenuItem, this)
		this.itemsSubmenu.menu.setItemList(this.itemList)
		this.itemsSubmenu.set(1, true)
	},

	openColor: function(color, silent, touch, e) {
		if(e.touch ^ touch) return

		for(var i = 0; i < this.slotList.length; i++) {
			var id = color instanceof Array ? color[i] : color
			main.bus.emit('mat_change', [this.slotList[i], id, silent])
		}

		if(!silent) {
			main.bus.emit('history_push')
		}
	}
})


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


UI.CartPopup = f.unit({
	unitName: 'UI_CartPopup',

	init: function() {
		this.dialog = new Dialog(true)
		dom.addclass(this.dialog.element, 'cart-dialog')

		this.results = dom.elem('div', 'cart-results', this.dialog.content)
		this.message = dom.elem('div', 'cart-message', this.dialog.content)

		this.tableView = dom.div('cart-table-view', this.results)
		this.table     = dom.div('cart-table', this.tableView)
		this.tableSep  = dom.div('cart-table-sep', this.table)

		this.cartButton = dom.a('#', 'cart-link', this.results)
		Locale.setText(this.cartButton, 'cart_goto_cart')


		dom.on('tap', this.cartButton, main.bus.will('cart_go'))
		dom.on('tap', this.dialog.content, f.binds(this.ontap, this))

		this.errorWrap  = dom.div('cart-message-wrap', this.message)
		this.errorImage = dom.div('cart-message-image', this.errorWrap)
		this.errorText  = dom.div('cart-message-text', this.errorWrap)

		Atlas.set(this.errorImage, 'i-warning')

		this.watched = []
	},

	ontap: function() {
		if(this.error) this.hide()
	},

	addMaterialRow: function(id, amount, status) {
		var elem   = dom.div('cart-mat')
		,   egroup = dom.div('cart-mat-field group', elem)
		,   ename  = dom.div('cart-mat-field name', elem)
		,   ecolor = dom.div('cart-mat-field color', elem)
		,   eitems = dom.div('cart-mat-field amount', elem)
		,   einfo  = dom.div('cart-mat-field info', elem)

		var mat = main.imagery.products[id]

		var group = main.db.query()
			.from('product')
			.where('product.id', 'eq', mat.id)
			.joinInner('group', 'product.gid', 'group.id')
			.selectOne(
				'group.title as title',
				'group.subtitle as subtitle')


		var name, text

		switch(status) {
			case 'ok':
				name = 'ok'
				text = 'cart_item_ok'
				dom.insert(this.table, elem, this.tableSep)
			break

			case 'error':
				name = 'error'
				text = 'cart_item_error'
				dom.append(this.table, elem)
			break

			default:
				name = 'unknown'
				text = 'cart_item_unknown'
				dom.append(this.table, elem)
			break
		}

		dom.addclass(elem, name)
		dom.text(eitems, amount)

		this.watched.push(Locale.setText(ecolor, mat.title))
		this.watched.push(Locale.setText(einfo, text))
		this.watched.push(Locale.setText(egroup, group.title))
		this.watched.push(Locale.setText(ename, 'unit_'+ mat.unit))
	},

	showResults: function(materials, added, url) {
		this.clear()

		this.cartButton.setAttribute('href', url)
		this.cartButton.setAttribute('target', '_blank')

		for(var id in materials) {
			this.addMaterialRow(id, materials[id], added[id])
		}

		dom.display(this.results, true)
		dom.display(this.message, false)
		this.dialog.open()
	},

	showError: function(token) {
		this.clear()
		this.error = true

		this.watched.push(Locale.setText(this.errorText, token))

		dom.display(this.results, false)
		dom.display(this.message, true)
		this.dialog.open()
	},

	clear: function() {
		this.watched.forEach(Locale.unwatch)
		this.watched = []
		delete this.error

		dom.html(this.errorText, '')
		dom.html(this.table, '')
		dom.append(this.table, this.tableSep)
	},

	hide: function() {
		this.dialog.close()
	}
})


UI.VideoPopup = f.unit({
	unitName: 'UI_HelpPopup',

	init: function() {
		this.dialog = new Dialog(true)
		this.dialog.events.when({
			open   : this.onDialogOpen,
			hidden : this.onDialogHidden
		}, this)

		dom.addclass(this.dialog.element, 'help-dialog')

		main.bus.on('popup_video', this.open, this)
	},

	createVideoFrame: function() {
		var root = this.dialog.content

		var fw = root.offsetWidth
		,   fh = root.offsetHeight

		var frame = dom.elem('iframe', 'video')
		frame.src = this.source
		frame.setAttribute('width',  fw)
		frame.setAttribute('height', fh)
		frame.setAttribute('frameborder', 0)
		frame.setAttribute('allowfullscreen', 1)

		dom.append(root, frame)
	},

	open: function(source) {
		this.source = source
		this.dialog.open()
	},

	close: function() {
		this.dialog.close()
	},

	onDialogOpen: function() {
		dom.html(this.dialog.content, '')
		this.createVideoFrame()
	},

	onDialogHidden: function() {
		dom.html(this.dialog.content, '')
	}
})


UI.ElementHint = f.unit(Block, {
	unitName: 'UI_ElementHint',
	ename: 'element-hint',

	target: null,
	animationTime: 500,

	create: function() {
		this.initPosition = {}
		this.createTweens()

		this.top    = dom.div('hint-disabled-zone', this.element)
		this.right  = dom.div('hint-disabled-zone', this.element)
		this.bottom = dom.div('hint-disabled-zone', this.element)
		this.left   = dom.div('hint-disabled-zone', this.element)

		dom.on('resize', window, f.binds(this.resize, this))
	},

	createTweens: function() {
		this.transitionTween = new TWEEN.Tween({})
			.easing(TWEEN.Easing.Cubic.Out)
			.to({}, this.animationTime)
			.onUpdate(this.updateTween, this)
			.onComplete(this.onAnimationEnd, this)
	},

	updateTween: function() {
		var pos = this.transitionTween.source

		var st = this.top.style
		,   sr = this.right.style
		,   sb = this.bottom.style
		,   sl = this.left.style

		st.width  = pos.tw +'px'
		st.height = pos.th +'px'
		st.left   = pos.tx +'px'
		st.top    = pos.ty +'px'

		sr.width  = pos.rw +'px'
		sr.height = pos.rh +'px'
		sr.left   = pos.rx +'px'
		sr.top    = pos.ry +'px'

		sb.width  = pos.bw +'px'
		sb.height = pos.bh +'px'
		sb.left   = pos.bx +'px'
		sb.top    = pos.by +'px'

		sl.width  = pos.lw +'px'
		sl.height = pos.lh +'px'
		sl.left   = pos.lx +'px'
		sl.top    = pos.ly +'px'
	},

	open: function(target) {
		if(!this.target && !target) return

		if(!this.target) {
			this.getWindowSize()
			f.copy(this.transitionTween.source, this.initPosition)
		}

		this.target = target

		if(this.target) {
			this.updateDisplay()
		}

		this.getTargetPosition()
		this.transitionTween.start()
	},

	getWindowSize: function() {
		var ww = window.innerWidth
		,   wh = window.innerHeight
		,   pos = this.initPosition

		pos.tx = 0
		pos.ty = 0
		pos.rx = ww
		pos.ry = 0
		pos.bx = 0
		pos.by = wh
		pos.lx = 0
		pos.ly = 0

		pos.tw = ww
		pos.th = 0
		pos.rw = 0
		pos.rh = wh
		pos.bw = ww
		pos.bh = 0
		pos.lw = 0
		pos.lh = wh
	},

	getTargetPosition: function() {
		this.getWindowSize()

		var pos = this.transitionTween.target

		if(this.target) {
			var targetOffset = dom.offset(this.target, null, true)

			var tx = targetOffset.x
			,   ty = targetOffset.y
			,   tw = this.target.offsetWidth
			,   th = this.target.offsetHeight
			,   ww = window.innerWidth
			,   wh = window.innerHeight


			pos.tw = pos.bw = tw
			pos.lh = pos.rh = wh

			pos.th = ty
			pos.rw = ww - tx - tw
			pos.bh = wh - ty - th
			pos.lw = tx

			pos.ty = 0
			pos.tx = tx

			pos.ry = 0
			pos.rx = tx + tw

			pos.by = ty + th
			pos.bx = tx

			pos.ly = 0
			pos.lx = 0

		} else {
			f.copy(pos, this.initPosition)
		}
	},

	resize: function() {
		if(this.target) {
			this.getTargetPosition()
			f.copy(this.transitionTween.source, this.transitionTween.target)
			this.updateTween()
		}
	},

	updateDisplay: function() {
		var display = this.target ? 'block' : 'none'

		this.top.style.display    = display
		this.right.style.display  = display
		this.bottom.style.display = display
		this.left.style.display   = display
	},

	onAnimationEnd: function() {
		this.updateDisplay()
		this.events.emit('hint_animation_end')
	}
})


UI.Guide = f.unit(Block, {
	ename: 'guide',

	pointerDuration: 1000,
	pointerDelay: 333,

	nextStep: 'next',
	prevStep: 'prev',
	replayStep: 'replay',

	create: function () {
		this.hint = new UI.ElementHint({
			eroot: this.element
		})

		this.control   = dom.div('guide-control absmid', this.element)
		this.conhead   = dom.div('guide-control-head', this.control)
		this.conbody   = dom.div('guide-control-body', this.control)
		this.conlabel  = dom.elem('span', 'guide-control-label', this.conhead)
		this.closeBtn  = dom.div('guide-button hand guide-button-close', this.conhead)
		this.prevBtn   = dom.div('guide-button hand guide-button-prev active', this.conbody)
		this.replayBtn = dom.div('guide-button hand guide-button-replay active', this.conbody)
		this.nextBtn   = dom.div('guide-button hand guide-button-next active', this.conbody)
		this.cursor    = dom.div('guide-pointer', this.element)

		this.tip = new Block.Tip({
			eroot: this.element
		})
		this.content = dom.div('guide-content', this.tip.content)
		this.message = dom.div('guide-message', this.content)

		Locale.setText(this.conlabel, 'guide_label_mode')
		Locale.setTitle(this.prevBtn, 'guide_title_prev')
		Locale.setTitle(this.nextBtn, 'guide_title_next')
		Locale.setTitle(this.replayBtn, 'guide_title_replay')

		Atlas.set(this.closeBtn, 'i-close')
		Atlas.set(this.prevBtn, 'i-arrow', 'absmid')
		Atlas.set(this.nextBtn, 'i-arrow', 'absmid')
		Atlas.set(this.replayBtn, 'i-tutorial-replay', 'absmid')
		Atlas.set(this.cursor, 'i-cursor')

		this.pointerTween = new TWEEN.Tween({})
			.delay(this.pointerDelay)
			.easing(TWEEN.Easing.Cubic.InOut)
			.to({}, this.pointerDuration)
			.onStart(this.onPointerStart, this)
			.onUpdate(this.onPointerUpdate, this)
			.onComplete(this.onPointerEnd, this)

		this.tip.visible.off('guide')
		this.createSteps()

		dom.visible(this.element, false)

		dom.on('resize', window, f.binds(this.onResize, this))
		dom.on('tap', this.nextBtn,   f.binda(this.playStep, this, [this.nextStep]))
		dom.on('tap', this.prevBtn,   f.binda(this.playStep, this, [this.prevStep]))
		dom.on('tap', this.replayBtn, f.binda(this.playStep, this, [this.replayStep]))
		dom.on('tap', this.closeBtn,  f.binds(this.closeGuide, this))

		this.hint.events.on('hint_animation_end', this.onHintAnimationEnd, this)

		main.bus.on('help_guide', this.openGuide, this)
	},

	setHistory: function(history) {
		this.history = history
	},

	handleEvent: function(e) {
		// capture
		if(e.eventPhase === 1 && !e.guidedEvent && !dom.ancestor(e.target, this.control)) {
			e.preventDefault()
			e.stopPropagation()
		}
	},

	getCenter: function() {
		return {
			x: window.innerWidth / 2,
			y: window.innerHeight / 2
		}
	},

	getPointerPosition: function(target) {
		if(target === 'screenCenter') {
			return this.getCenter()

		} else if(typeof target === 'string') {
			var element = dom.one(target)
			,   offset  = dom.offset(element)

			return {
				x: offset.x + element.offsetWidth  / 2,
				y: offset.y + element.offsetHeight / 2
			}

		} else switch(target.type) {
			case 'world':
				var view = main.view === 'v2d' ? main.v2 : main.v3
				,   point = view.worldToScreen({ x: target.point[0], y: 0, z: target.point[1] })

				return {
					x: point.x + view.elementOffset.x,
					y: point.y + view.elementOffset.y
				}
			break

			case 'node':
				var view = main.view === 'v2d' ? main.v2 : main.v3
			break
		}
	},

	createSteps: function() {
		this.steps = [{
			center: true,
			element: '.guide-control',
			content: 'Вы вошли в режим обучения\nДля продолжения нажмите стрелку вправо\nДля выхода нажмите крестик'
		}, {
			mode: 'floor',
			view: 'v2d',
			floor: 0,
			actions: [{
				type: 'bus',
				name: 'tpl_new'
			}],
			element: '.mode-menu-item.floor',
			content: 'В этом режиме Вы можете добавить и изменить стены'
		}, {
			pointer: [
				'.square',
				{ type: 'world', point: [0, 0] }
			]
		}, {
			center: true,
			element: '.floor-menu-item.plus',
			content: 'Добавим еще один этаж и крышу'
		}, {
			pointer: [
				'.floor-menu-item.plus', '.plus-menu-item.floor',
				'.floor-menu-item.plus', '.plus-menu-item.roof'
			]
		}, {
			floor: 2,
			element: '.floor-menu',
			content: 'Тут Вы можете переключать этажи'
		}, {
			pointer: [
				'.floor-menu-item.floor-2',
				'.floor-menu-item.floor-1'
			]
		}, {
			floor: 0,
			center: true,
			element: '.floor-tool-menu',
			content: 'Добавленные стены соединяются вместе'
		}, {
			pointer: [
				'.tool-menu-item.square',
				{ type: 'world', point: [4, 2] },
				'.zoom-menu-item.center'
			]
		}, {
			element: '.mode-menu-item.door',
			content: 'Добавим несколько окон'
		}, {
			pointer: [
				'.mode-menu-item.door',
				'.door-tool-menu-item.window',
				{ type: 'world', point: [2, 6] },
				'.door-tool-menu-item.window',
				{ type: 'world', point: [6, 6] }
			]
		}, {
			mode: 'door',
			element: '.door-tool-menu',
			content: 'Окна и двери есть разных видов'
		}, {
			actions: [{
				type: 'func',
				func: function() {
					main.ui.doorToolMenu.blocks[0].submenu.menu.setItem('wr', true)
					main.bus.emit('tool_change', null)
				}
			}],
			pointer: [
				'.door-tool-menu-item.window',
				'.door-tool-menu-item.window .samples',
				'.door-tool-submenu-item.wa',
				{ type: 'world', point: [8, 0] },
				'.door-tool-menu-item.window',
				{ type: 'world', point: [8, 4] }
			]
		}, {
			element: '.v3d',
			content: 'Общий вид Вашего дома'
		}, {
			pointer: ['.v3d']
		}]
	},

	simulateMouseEvent: function(type, element, x, y) {
		x = Math.round(x)
		y = Math.round(y)

		if(!element) {
			element = document.elementFromPoint(x, y)
		}

		if(!element) {
			return
		}

		var event = new MouseEvent(type, {
			bubbles: true,
			clientX: x,
			clientY: y
		})

		event.guidedEvent = true

		element.dispatchEvent(event)
	},

	playPointerStep: function(target) {
		f.copy(this.pointerTween.target, this.getPointerPosition(target))
		this.pointerTween.start()
	},

	openGuide: function() {
		f.copy(this.pointerTween.source, this.getCenter())
		this.onPointerUpdate()

		dom.visible(this.element, true)

		this.userMode = main.modestring
		this.userView = main.view
		this.userFloor = main.floor
		this.userHistoryIndex = this.history.index

		this.stepHistoryIndex = []
		this.stepIndex = 0
		this.pointerIndex = 0

		this.history.writeToStorage = false
		this.playStep(this.replayStep)
	},

	closeGuide: function() {
		if(this.pointerActive) {
			this.pointerTween.stop()
		}

		this.showTip(null)
		this.setCapturingMode(false)

		dom.visible(this.element, false)

		this.history.load(this.userHistoryIndex)
		main.bus.emit('mode_change', this.userMode)
		main.bus.emit('view_change', this.userView)
		main.bus.emit('floor_change', this.userFloor)

		main.v2.focusOnTree()
		main.v3.focusOnTree()

		this.history.writeToStorage = true
	},

	showTip: function(target) {
		this.tipIsDrawn = !!target
		this.target = target
		this.tip.visible.off('guide')
		this.hint.open(target)
	},

	inheritParameter: function(name) {
		var index = this.stepIndex
		while(index > -1) {
			var step = this.steps[index--]
			if(name in step) return step[name]
		}
	},

	setParameter: function(name, eventName) {
		var value = this.inheritParameter(name)
		if(value !== undefined) main.bus.emit(eventName, value)
	},

	resetPointer: function() {
		this.pointerIndex = 0
		this.pointerActive = false
		this.setCapturingMode(false)
	},

	playStep: function(direction) {
		switch(direction) {
			case this.nextStep:
				while(this.pointerActive) {
					this.pointerTween.stop()
					f.copy(this.pointerTween.source, this.pointerTween.target)
					this.onPointerUpdate()
					this.onPointerEnd()
				}

				if(this.stepIndex === this.steps.length -1) return

				this.stepIndex++
			break

			case this.prevStep:
				if(this.stepIndex === 0) return

				this.stepIndex--

			case this.replayStep:
				if(this.pointerTween.playing) {
					this.pointerTween.stop()
				}

				this.history.load(this.stepHistoryIndex[this.stepIndex])
			break
		}

		this.stepHistoryIndex[this.stepIndex] = this.history.index

		dom.togclass(this.prevBtn, 'active', this.stepIndex > 0)
		dom.togclass(this.nextBtn, 'active', this.stepIndex < this.steps.length -1)


		this.setParameter('mode', 'mode_change')
		this.setParameter('view', 'view_change')
		this.setParameter('floor', 'floor_change')


		var step = this.steps[this.stepIndex]

		main.bus.emit('tool_change', null)

		if(step.center) {
			main.bus.emit('zoom_change', 'center')
		}

		if(step.content && step.element) {
			this.helpMessage = step.content
			this.showTip(dom.one(step.element))

		} else {
			this.showTip(null)
		}

		if(step.actions) step.actions.forEach(this.invokeAction, this)

		this.resetPointer()
		if(step.pointer) {
			this.pointerActive = true
			this.playPointerStep(step.pointer[this.pointerIndex])
		}
	},

	invokeAction: function(action) {
		switch(action.type) {
			case 'bus':
				main.bus.emit(action.name, action.data)
			break

			case 'func':
				action.func()
			break
		}
	},

	setCapturingMode: function(enable) {
		if(!!this.capturingMode === !!enable) return
		this.capturingMode = enable

		var toggle = enable ? dom.on : dom.off

		toggle('mousedown',  window, this, true)
		toggle('mouseup',    window, this, true)
		toggle('mousemove',  window, this, true)
		toggle('touchstart', window, this, true)
		toggle('touchend',   window, this, true)
		toggle('touchmove',  window, this, true)
	},

	onPointerStart: function() {
		this.setCapturingMode(true)
	},

	onPointerEnd: function() {
		var step = this.steps[this.stepIndex]
		if(!step.pointer) {
			this.resetPointer()
			return
		}

		var target  = step.pointer[this.pointerIndex]
		,   point   = this.getPointerPosition(target)

		var element = null
		if(typeof target === 'string') {
			element = dom.one(target)
		}

		this.simulateMouseEvent('mousedown', element, point.x, point.y)
		this.simulateMouseEvent('mouseup', element, point.x, point.y)

		if(++this.pointerIndex < step.pointer.length) {
			this.playPointerStep(step.pointer[this.pointerIndex])

		} else {
			this.resetPointer()
		}
	},

	onPointerUpdate: function() {
		var pos = this.pointerTween.source
		this.cursor.style.transform = ['translate(', pos.x, 'px,', pos.y, 'px)'].join('')

		this.simulateMouseEvent('mousemove', null, pos.x, pos.y)
	},

	onHintAnimationEnd: function() {
		if(this.tipIsDrawn) {
			this.tipIsDrawn = false

			this.tip.visible.set(!!this.target, 'guide')

			if(this.helpMessage) {
				dom.text(this.message, this.helpMessage)
			}

			this.tip.moveToElement(this.target)
		}
	},

	onResize: function() {
		this.tip.moveToElement(this.target)
	}
})


UI.ShareFly = f.unit(UI.Submenu, {
	unitName: 'UI_ShareFly',
	ename: 'share-submenu-toggle submenu-toggle',
	cname: 'share-submenu-item',
	sname: 'share-submenu submenu',

	square: false,
	align: 'top',
	distance: 12,
	itemSize: 300,
	menuVisibleMethod: dom.visible,

	create: function() {
		main.bus.on('open_share', this.set, this, [1, true])
		this.menu.events.on('change', this.set, this, 0)
		this.menu.events.on('change', this.menu.set, this.menu, -1)
	}
})


UI.UI = f.unit(Block, {
	unitName: 'UI_UI',
	ename: 'ui',
	cacheSize: false,

	create: function() {
		UI.Submenu.prototype.sroot = this.element
		Dialog.prototype.parent = this.element

		this.mainMenu = new UI.MainMenu({
			helpVideoSource: 'https://www.youtube-nocookie.com/embed/d2E-_wavkjs?rel=0',
			eroot: this.element
		})

		this.viewport = dom.div('viewport', this.element)

		this.mobileMenu = new UI.MobileMenu({
			eroot: this.element
		})

		this.optionsBar = new UI.OptionsBar({
			eroot: this.viewport
		})

		this.videoPopup = new UI.VideoPopup

		this.guide = new UI.Guide({
			eroot: this.element
		})

		this.shareFly = new UI.ShareFly({
			eroot: this.element,
			items: ['share'],
			labels: ['share_label_header']
		})

		this.viewMenu = new Block.Menu({
			ename: 'view-menu',
			cname: 'view-menu-item',
			eroot: this.viewport,
			icons: ['i-v2d', 'i-v3d'],
			items: ['v2d', 'v3d']
		})

		this.floorMenu = new UI.FloorMenu({
			eroot: this.viewport,
			items: f.rangep(10, 9, -1)
		})


		this.floorToolMenu = new UI.ToolMenu({
			iname: 'floor-tool-menu',
			eroot: this.viewport,
			disabled: [0,0,0,0,0,0, 1,1],
			icons: [
				'tf-square',
				'tf-lcorn',
				'tf-rcorn',
				'tf-cross',
				'tf-tlike',
				'tf-poly',
				'tf-addrect',
				'tf-addtrapeze'
			],
			titles: [
				'tool_title_square',
				'tool_title_lcorn',
				'tool_title_rcorn',
				'tool_title_cross',
				'tool_title_tlike',
				'tool_title_poly'
			],
			items: [
				'square',
				'lcorn',
				'rcorn',
				'cross',
				'tlike',
				'poly',
				'addrect',
				'addtrapeze'
			]
		})

		this.doorToolMenu = new UI.DoorToolMenu({
			eroot: this.viewport,
			icons: [
				't-window',
				't-door'
			],
			labels: [
				'tool_label_windows',
				'tool_label_doors'
			],
			items: [
				'window',
				'door'
			]
		})

		this.roofToolMenu = new UI.ToolMenu({
			eroot: this.viewport,
			icons: [
				't-roof',
				't-flume',
				't-pipe'
			],
			titles: [
				'tool_title_roof',
				'tool_title_flume',
				'tool_title_pipe'
			],
			items: [
				'roof',
				'flume',
				'pipe'
			]
		})

		this.cutToolMenu = new UI.ToolMenu({
			eroot: this.viewport,
			icons: [
				't-scissor-v',
				't-scissor',
				't-addjoin'
			],
			titles: [
				'tool_title_vcut',
				'tool_title_hcut',
				'tool_title_join'
			],
			items: [
				'vcut',
				'hcut',
				'join'
			]
		})


		this.cutsVisible = new Block.Toggle({
			// eroot: this.cutToolMenu.container,
			ename: 'tool-menu-item cuts-visible slow-01 hand',
			eicon: 'i-cuts',
			etitle: 'item_title_cuts',
			data: 'cuts-visible',
			handed: false
		})

		dom.insert(this.cutToolMenu.container, this.cutsVisible.element, this.cutToolMenu.blocks[0].element)
		this.cutToolMenu.blocks.unshift(this.cutsVisible)

		this.materialMenu = new UI.ToolMenu({
			iname: 'mat-tool-menu tool-menu',
			cname: 'mat-tool-menu-item tool-menu-item slow-01',
			eroot: this.viewport,
			icons: [
				't-wall',
				't-join',
				't-corner',
				't-plinth',
				't-plinth-corner',
				't-framing',
				't-roof',
				't-soffit',
				't-drain'
			],
			labels: [
				'tool_label_walls',
				'tool_label_join',
				'tool_label_corners',
				'tool_label_plinth',
				'tool_label_pcorners',
				'tool_label_framing',
				'tool_label_roof',
				'tool_label_soffit',
				'tool_label_drain'
			],
			items: [
				'wall',
				'join',
				'corner',
				'plinth',
				'pcorner',
				'framing',
				'roof',
				'soffit',
				'drain'
			]
		})

		this.zoomMenu = new Block.Menu({
			ename: 'zoom-menu',
			cname: 'zoom-menu-item slow-01 hand',
			eroot: this.viewport,
			handed: false,
			items: [
				'in',
				'out',
				'center'
			],
			titles: [
				'item_title_zoomin',
				'item_title_zoomout',
				'item_title_zoomcenter'
			],
			icons: [
				'i-zoom-in',
				'i-zoom-out',
				'i-zoom-center'
			]
		})

		this.materialWindow = new UI.MaterialWindow({
			eroot: this.element,
			icons: [
				'i-mg-siding',
				'i-mg-facade',
				'i-mg-siding',
				'i-mg-facade',
				'i-mg-siding',
				'i-mg-tile',
				'i-mg-siding',
				't-flume',
				'i-mg-door',
				'i-mg-siding',
				'i-mg-corner-decor'
			],
			labels: [
				'mat_window_siding',
				'mat_window_facade',
				'mat_window_outer',
				'mat_window_fouter',
				'mat_window_frame',
				'mat_window_tile',
				'mat_window_soffit',
				'mat_window_drain',
				'mat_window_door',
				'mat_window_joint',
				'mat_window_decor'
			],
			items: [
				'siding',
				'facade',
				'outer',
				'fouter',
				'frame',
				'roof',
				'soffit',
				'pipe',
				'door',
				'joint',
				'rust'
			]
		})

		this.availableMaterialUnits = {
			'wall'    : ['siding', 'facade'],
			'join'    : ['joint'],
			'plinth'  : ['facade'],
			'corner'  : ['outer', 'fouter', 'rust'],
			'pcorner' : ['fouter', 'rust'],
			'framing' : ['frame'],
			'door'    : ['door'],
			'roof'    : ['roof'],
			'soffit'  : ['soffit'],
			'drain'   : ['pipe']
		}

		this.templateFilter = new Filter

		this.footer = dom.div('footer', this.element)

		this.agreement = dom.a('#', 'agreement', this.footer)
		this.agreement.setAttribute('target', '_blank')
		Locale.setText(this.agreement, 'footer_agreement')
		Locale.setAttribute('href', this.agreement, 'footer_link_agreement')


		this.copyright = dom.div('copyright', this.footer)
		Locale.setText(this.copyright, 'footer_copyright')


		this.watermark = dom.a('#', 'watermark', this.viewport)
		this.watermark.setAttribute('target', '_blank')
		Locale.setAttribute('href', this.watermark, 'watermark_link')

		this.cartPopup = new UI.CartPopup


		this.helloDialog = new Dialog(true)
		dom.addclass(this.helloDialog.element, 'hello-dialog')

		this.helloMenu = new Block.Menu({
			eroot: this.helloDialog.content,
			ename: 'hello-menu',
			cname: 'hello-menu-item slow-01 hand',
			handed: false,
			items: [
				'new',
				'filter'
			],
			labels: [
				'hello_label_new',
				'hello_label_filter'
			]
		})
		this.helloMenu.blocks.forEach(this.helloMenuItem, this)
		this.helloMenu.events.on('change', this.helloChange, this)


		var toolChange = main.bus.will('tool_change')
		this.floorToolMenu.events.on('change', toolChange)
		this.roofToolMenu.events.on('change', toolChange)
		this.cutToolMenu.events.on('change', toolChange)
		// this.doorToolMenu.events.on('tool_change', toolChange)



		this.zoomMenu.events.on('change', this.zoomChange, this)
		this.materialMenu.events.on('change', this.showMaterialSlot, this)

		this.viewMenu.events.on('change', main.bus.will('view_change'))
		this.zoomMenu.events.on('change', main.bus.will('zoom_change'))
		this.cutsVisible.events.on('change', main.bus.will('cuts_change'))
	},

	helloMenuItem: function(block) {
		var urls = {
			'new'    : 'images/project-new.jpg',
			'filter' : 'images/project-tpl.jpg'
		}
		block.element.style.backgroundImage = 'url('+ urls[block.data] +')'
	},

	helloChange: function(item) {
		this.helloDialog.close()

		switch(item) {
			case 'new':
				// main.bus.emit('tpl_new')
			break

			case 'filter':
				main.bus.emit('tpl_filter')
			break
		}
	},

	zoomChange: function(action) {
		this.zoomMenu.set(-1)
	},

	openTemplateDialog: function() {
		this.templateDialog.open()
	},

	updateFloorMenu: function(length, roof) {
		this.floorMenu.setFloors(length, roof)
	},

	updateHistMenu: function(undoActive, redoActive) {
		dom.togclass(this.mainMenu.histUndo.element, 'inactive', !undoActive)
		dom.togclass(this.mainMenu.histRedo.element, 'inactive', !redoActive)
	},

	setTool: function(name) {
		this.floorToolMenu.setItem(name)
		this.doorToolMenu.setItem(name)
		this.roofToolMenu.setItem(name)
		this.cutToolMenu.setItem(name)
	},

	setLocale: function(lang) {
		var wmi = {
			ru: 'l-apf-ru',
			en: 'l-apf-en',
		}

		Atlas.set(this.watermark, wmi[lang] || wmi.ru)

		var apl = {
			ru: 'images/altaplanner.png',
			en: 'images/altaplanner_en.png'
		}
		this.mainMenu.plannerLogo.style.backgroundImage = 'url('+ (apl[lang] || apl.ru) +')'
		this.mobileMenu.plannerLogo.style.backgroundImage = 'url('+ (apl[lang] || apl.ru) +')'

		this.mobileMenu.updateLang(lang)
		this.mainMenu.updateLang(lang)
	},

	makeSamplesList: function() {
		this.doorToolMenu.makeSamplesList()
		this.doorToolMenu.autoresize()
	},

	makeMaterialList: function(data) {
		this.materialWindow.makeProducts(data)

		setTimeout(f.func('removePreloader'), 500, this.materialWindow)
	},

	showMaterialSlot: function(root, slots) {
		var units = this.availableMaterialUnits[root]

		this.materialMenu.setItem(root)
		this.materialWindow.setSlots(slots ? slots : root ? [root] : null, units)
		this.materialWindow.showSelectedItem()
	},

	showMaterialSlotList: function(slotList) {
		var slots = f.sor(slotList).filter(Boolean)
		,   roots = f.sor(slots.map(main.imagery.rootMaterial, main.imagery))

		if(!roots.length) {
			this.showMaterialSlot('wall')
		} else if(roots.length === 1) {
			this.showMaterialSlot(roots[0], slots)
		} else {
			this.showMaterialSlot(null)
		}
	},

	selectNodes: function(nodes) {
		this.showMaterialSlotList(nodes.map(f.func('getMaterial')))
		this.optionsBar.setNodeList(nodes)
	},

	onblur: function() {
		this.mobileMenu.set(0)
		UI.Submenu.closeAll(null)
	},

	onresize: function() {
		this.templateFilter.resizeForm()
		this.shareFly.autoresize()
		this.mainMenu.autoresize()
		this.mobileMenu.autoresize()
		this.optionsBar.autoresize()
		this.floorToolMenu.autoresize()
		this.doorToolMenu.autoresize()
		this.roofToolMenu.autoresize()
		this.cutToolMenu.autoresize()
		this.floorMenu.autoresize()
		this.materialMenu.autoresize()
		this.materialWindow.autoresize()
	},

	update: function(t, dt, i) {
		this.optionsBar.update()
	}
})
