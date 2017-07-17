main = {}
main.version = 0.65
main.configVersion = 0.13
main.debug = false
main.session = {}
main.started = Date.now()

main.selection = []

function debug_pre() {
	var proto = THREE.Vector3.prototype
	for(var name in proto) {
		if(name !== 'constructor' && typeof proto[name] === 'function') {
			f.mitm(proto, name, checkVector3, true)
		}
	}

	var proto = THREE.Matrix4.prototype
	for(var name in proto) {
		if(name !== 'constructor' && typeof proto[name] === 'function') {
			// f.mitm(proto, name, checkMatrix4, true)
		}
	}

	function checkVector3(name, args, method) {
		var result = method.apply(this, args)

		checkNaN([this.x, this.y, this.z], 'Vector3', name, args)
		return result
	}

	function checkMatrix4(name, args, method) {
		var result = method.apply(this, args)

		checkNaN(this.elements, 'Matrix4', name, args)
		return result
	}

	function checkNaN(values, unit, name, args) {
		if(values.some(isNaN)) {
			var a = [].slice.call(args).map(f.hround)
			console.log(unit +'('+ values.map(f.hround) +').'+ name +'('+ a +')', [''].concat(
				Error().stack.split(/\s+at\s+/).slice(3).map(parseStack)).join('\n'))
		}
	}

	function parseStack(item) {
		var parts = item.split(/\s+/)
		,   file  = parts.pop().slice(1, -1)
		,   name  = parts.join(' ')

		return file +' :: '+ name
	}

	THREE.Matrix4.prototype.toString = function() {
		return 'm4('+ this.elements.map(f.hround).join(', ') +')'
	}
	THREE.Vector3.prototype.toString = function() {
		return 'v3('+ this.toArray().map(f.hround).join(', ') +')'
	}
	THREE.Vector2.prototype.toString = function() {
		return 'v2('+ this.toArray().map(f.hround).join(', ') +')'
	}
}

dom.ready(function() {
	try {
		main.nwgui = require('nw.gui')
		main.nwind = main.nwgui.Window.get()
	} catch(e) {}

	main.params = {}
	location.search.slice(1).split('&').forEach(function(pair) {
		var parts = pair.split('=')
		,   name  = decodeURIComponent(parts[0])
		,   value = decodeURIComponent(parts[1])

		main.params[name] = value
	})

	if(!window.config) debug_pre()


	main.obvDebug = new Observable(main.debug)


	main.bus = new EventEmitter

	main.up = new THREE.Vector3(0, 1, 0)
	main.ui = new UI.UI
	main.hs = new History
	main.db = new Database
	main.v2 = new View2D({ eroot: main.ui.viewport })
	main.v3 = new View3D({ eroot: main.ui.viewport, events: main.bus })
	main.vc = new ViewCalc({ eroot: main.ui.viewport })

	main.vc.setScene(main.v3.scene)
	main.ui.guide.setHistory(main.hs)

	main.get = new Loader

	main.sampler = new Sampler
	main.sampler.folder = 'samples/'

	main.imagery = new Imagery
	main.imagery.folder = 'images/'

	main.tree = new ANode.House

	main.v2.setTree(main.tree)
	main.v3.setTree(main.tree)
	main.vc.setTree(main.tree)

	if(main.nwgui) {
		main.ui.mainMenu.helpVideoSource = 'video/Alta-Planner_new_version.webm'
		main.vc.rcart.visible.off()
		dom.display(main.ui.watermark, false)
		dom.display(main.ui.agreement, false)
	}

	datinit()
	fetch()
})

function fetch() {
	main.resources = {
		samples   : { type: 'json',  url: 'configs/samples.json',   done: samplesReady   },
		templates : { type: 'json',  url: 'configs/templates.json', done: templatesReady },
		atlas     : { type: 'xml',   url: 'images/atlas.svg',       done: Atlas.setSource },
		locale_ru : { type: 'json',  url: 'configs/locale_ru.json' },
		locale_en : { type: 'json',  url: 'configs/locale_en.json' },

		uv        : { type: 'image', url: 'images/uv.jpg', noload: !!window.config, done: uvReady },
		skybox_px : { type: 'image', url: 'images/skybox-px.jpg' },
		skybox_nx : { type: 'image', url: 'images/skybox-nx.jpg' },
		skybox_py : { type: 'image', url: 'images/skybox-py.jpg' },
		skybox_ny : { type: 'image', url: 'images/skybox-ny.jpg' },
		skybox_pz : { type: 'image', url: 'images/skybox-pz.jpg' },
		skybox_nz : { type: 'image', url: 'images/skybox-nz.jpg' },

		'groups.db' : { type: 'json',  url: 'configs/groups.db.json' },
		'colors.db' : { type: 'json',  url: 'configs/colors.db.json' },
		'images.db' : { type: 'json',  url: 'configs/images.db.json' },
		 'units.db' : { type: 'json',  url: 'configs/units.db.json' },
	  'products.db' : { type: 'json',  url: 'configs/products.db.json' },
	}

	var templatesDefer = new Defer
	,   imageryDefer   = new Defer
	,   samplerDefer   = new Defer

	for(var name in main.resources) {
		var item =  main.resources[name]

		if(item.noload) continue

		item.loaded = new Defer(item.done)

		if(window.config && config[name]) {
			item.data = config[name]
			item.loaded.resolve(item.data)
		} else {
			main.get.load(item.type, item.url, { saveTo: item }).defer.push(item.loaded)
		}
	}

	var sourcesDefer = main.get.ready()
	var databaseDefer = Defer.all([
		main.resources['groups.db'].loaded,
		main.resources['colors.db'].loaded,
		main.resources['images.db'].loaded,
		main.resources['units.db'].loaded,
		main.resources['products.db'].loaded]).then(dbLoaded)

	Defer.all([sourcesDefer, templatesDefer]).then(mainLoaded)
	Defer.all([imageryDefer, samplerDefer]).then(resourcesLoaded, resourcesLoaded)



	function uvReady(data) {
		main.imagery.products.uv = {
			id: 'uv',
			texture: {
				resolution : 2,
				width      : 1024,
				height     : 1024,
				image      : data
			}
		}
	}
	function samplesReady(data) {
		main.sampler.fetch(data).push(samplerDefer)
	}
	function templatesReady(data) {
		main.templates = data

		var loader = new Loader
		,   done = !!window.config

		for(var i = 0; i < data.length; i++) {
			var tpl = data[i]

			if(done) tpl.data = config[tpl.json.replace(/\.json$/, '')]
			else loader.json('configs/'+ tpl.json, { saveTo: tpl })
		}

		if(done) templatesDefer.resolve()
		else loader.ready().push(templatesDefer)

		main.ui.templateFilter.createHouse(data)
	}
	function dbLoaded() {
		main.db.importTable('group',   main.resources['groups.db'].data)
		main.db.importTable('color',   main.resources['colors.db'].data)
		main.db.importTable('image',   main.resources['images.db'].data)
		main.db.importTable('unit',    main.resources['units.db'].data)
		main.db.importTable('product', main.resources['products.db'].data)

		main.db.query().into('color').addColumn('title')

		var colors = main.db.query()
			.from('color')
			.select('color.id as id', 'color.title_ru as ru', 'color.title_en as en')


		var titles_ru = {}
		,   titles_en = {}

		for(var i = 0; i < colors.length; i++) {
			var color = colors[i]
			,   token = 'db_color_'+ color.id

			titles_ru[token] = color.ru
			titles_en[token] = color.en

			main.db.query()
				.from('color')
				.where('color.id', 'eq', color.id)
				.update('color.title', token)
		}

		Locale.add('ru', titles_ru)
		Locale.add('en', titles_en)

		main.imagery.fetchDB(main.db).push(imageryDefer)
		main.ui.makeMaterialList(main.imagery.productsList)
		main.ui.showMaterialSlot('wall')
	}
	function resourcesLoaded() {
		main.resourcesLoaded = true
		console.log('resourcesLoaded', Date.now() - main.started +'ms')

		main.vc.loading(false)
		main.ui.makeSamplesList()

		// loadMaterials(main.hs.data.tree)

		// main.sampler.getSamples().forEach(main.dat.addSample)
	}
	function mainLoaded() {
		setTimeout(run)
	}
}




function run() {
	dom.append(document.body, main.ui.element)

	main.v3.makeSkybox(5000, [
		main.resources.skybox_px.data,
		main.resources.skybox_nx.data,
		main.resources.skybox_py.data,
		main.resources.skybox_ny.data,
		main.resources.skybox_pz.data,
		main.resources.skybox_nz.data
	])

	Locale.add('ru', main.resources.locale_ru.data)
	Locale.add('en', main.resources.locale_en.data)

	eventmap()
	onresize()
	loadend()

	var tree
	if(!tree && location.hash === '#0') try {
		delete localStorage.session
		delete localStorage.data
	} catch(e) {}

	if(!tree) try {
		tree = main.hs.unpack(location.hash.slice(1)).tree
	} catch(e) {}

	if(!tree) try {
		tree = main.hs.unpack(localStorage.data).tree
	} catch(e) {}

	setLocale(main.params.lang in Locale.assets ? main.params.lang : 'ru')

	if(tree && tree.floors) {
		setTemplate(tree)

	} else {
		main.ui.helloDialog.open()
		newTemplate()
	}


	sessionLoad()
	location.hash = ''
	loop()
}


function eventmap() {
	// disable for better days
	// dom.on('error',    window, onerror)
	dom.on('resize',   window, onresize)
	dom.on('keydown',  window, onkey)
	dom.on('keyup',    window, onkey)
	dom.on('touchend', window, ontouchend)

	main.bus.when({
		'mode_change'    : setMode,
		'view_change'    : setView,
		'lang_change'    : setLocale,
		'tool_change'    : setTool,
		'zoom_change'    : changeZoom,
		'cuts_change'    : cutsVisibility,

		'floor_change'   : setFloor,
		'floor_add'      : addFloor,
		'floor_del'      : delFloor,
		'floor_show'     : showFloor,

		'tpl_new'        : newTemplate,
		'tpl_change'     : setTemplate,
		'tpl_filter'     : null,
		'tpl_save'       : saveTemplateFile,
		'tpl_load'       : loadTemplateFile,
		'tpl_loaded'     : null,

		'selection_add'  : selectionAdd,
		'selection_rem'  : selectionRem,
		'selection_tog'  : selectionTog,
		'selection_set'  : selectionSet,

		'node_hover'     : hoverNode,
		'node_destroy'   : destroyNode,

		'history_push'   : historySave,

		'open_share'     : updateHash,
		'open_help'      : null,

		'mat_change'     : setMaterial,
		'mat_select'     : selectionVisible,
		'blur'           : onblur,
		'cart'           : gotoCart,
		'cart_go'        : null
	})

	main.bus.when({
		'history_undo'   : main.hs.undo,
		'history_redo'   : main.hs.redo,
		'history_change' : main.hs.load,
	}, main.hs)

	main.hs.events.on('change', historyLoad)
}



function datinit() {
	var gui = new dat.GUI({
		autoPlace: false,
		hideable: false,
	})
	gui.closed = true

	dom.append(main.ui.viewport, gui.domElement)


	var props = {
		color: '#ffffff'
	}

	var controls = {}


	var tree = {
		subnodes: [],
		boundingBox: new THREE.Box3,
		boundingBoxSize: new THREE.Vector3,
		boundingBoxValid: true,
		massCenter: new THREE.Vector3,
		object: null
	}


	function toggle() {
		gui.closed ? gui.open() : gui.close()
	}

	function getTargetMaterials() {
		return main.ui.materialWindow.slotList.map(function(slot) {
			return main.imagery.materials[slot]
		})
	}

	function updateColor() {
		var material = getTargetMaterials() [0]
		if(!material || !material.color) return

		props.color = '#'+ material.color.getHexString()
		controls.color.updateDisplay()
	}

	function changeColor(color) {
		getTargetMaterials().forEach(function(material) {
			if(material && material.color) {
				material.color.set(color || 0xFFFFFF)
			}
		})

		main.v3.needsRedraw = true
	}

	function showSample(sample) {
		main.v3.setTree(null)

		tree.object = sample.object
		tree.boundingBox.makeEmpty()
		tree.object.traverse(function(object) {
			if(object.geometry) {
				object.geometry.vertices.forEach(tree.boundingBox.expandByPoint, tree.boundingBox)
			}
		})
		tree.boundingBox.size(tree.boundingBoxSize)
		tree.boundingBox.center(tree.massCenter)

		main.v3.setTree(tree)
		main.v3.focusOnTree()
	}

	function addSample(sample) {
		sample.__display = f.binda(showSample, null, [sample])

		controls.samples.add(sample, '__display').name(sample.obj)
		if(sample.dirty) console.log('dirty', sample.dump())
	}

	var subnodesVisible  = {}
	,   subnodesMemory   = {}
	,   subnodesControls = []

	var listSubnodes = f.postpone(200, function() {
		for(var i = subnodesControls.length -1; i >= 0; i--) {
			var c = subnodesControls[i]

			controls.subnodes.remove(c)
			subnodesControls.splice(i, 1)
		}

		subnodesVisible = {}

		var pool = main.tree.obvSubnodePool.read()
		for(var i = 0; i < pool.length; i++) {
			var s = pool[i]

			subnodesVisible[s.type] = true
		}

		var subnodesOrder = Object.keys(subnodesVisible).sort()
		for(var i = 0; i < subnodesOrder.length; i++) {
			var type = subnodesOrder[i]
			if( type in subnodesMemory) {
				subnodesVisible[type] = subnodesMemory[type]
			}

			subnodesControls.push(
				controls.subnodes.add(subnodesVisible, type).onChange(updateSubnodes))
		}

		updateSubnodes()
	})

	function updateSubnodes() {
		for(var type in subnodesVisible) {
			subnodesMemory[type] = subnodesVisible[type]
		}

		main.v3.cutVisibility.set(subnodesVisible.cut, 'dat')
		main.tree.obvSubnodePool.read().forEach(updateSubnode)
	}

	function updateSubnode(subnode) {
		if(subnode.type === 'cut') return

		subnode.object.visible = subnodesVisible[subnode.type]
		main.v3.needsRedraw = true
	}

	function v3redraw() {
		main.v3.needsRedraw = true
	}

	main.tree.events.on('add_subnode', updateSubnode)
	main.tree.events.on('add_subnode', listSubnodes)
	main.tree.events.on('rem_subnode', listSubnodes)


	gui.add(main.v3, 'autoRotate').name('Rotation')
	controls.color  = gui.addColor(props, 'color').name('Color').onChange(changeColor)

	gui.add(main,    'debug'        ).name('Debug'    )
	gui.add(main.v3, 'enableWire'   ).name('Wireframe').onChange(v3redraw)
	gui.add(main.v3, 'enableNormal' ).name('Normals'  ).onChange(v3redraw)
	gui.add(main.v3, 'enableSSAO'   ).name('SSAO'     ).onChange(v3redraw)
	gui.add(main.v3, 'enableOnlyAO' ).name('Only AO'  ).onChange(v3redraw)
	gui.add(main.v3, 'enableStencil').name('Draw stencil').onChange(v3redraw)
	gui.add(main.v3, 'enableBlur'   ).name('Blur stencil').onChange(v3redraw)
	gui.add(main.v3, 'debugStencil' ).name('Show stencil').onChange(v3redraw)
	gui.add(main.v3, 'timesFXAA'    ).min(0).max(8).step(1).name('FXAA').onChange(v3redraw)

	controls.subnodes = gui.addFolder('Subnodes')
	controls.samples = gui.addFolder('Samples')


	main.dat = {
		toggle: toggle,
		updateColor: updateColor,
		addSample: addSample
	}
}

function onkey(e) {
	var nodeName = e.target && e.target.nodeName && e.target.nodeName.toLowerCase()
	if(nodeName === 'input' || nodeName === 'textarea') {
		if(kbd.key === 'ESC') e.target.blur()
		return
	}
	if(!kbd.changed) return

	var view2d = main.ui.viewMenu.activeItem === 'v2d'

	var D = kbd.down
	,   S = kbd.state.SHIFT
	,   C = kbd.state.CTRL
	,   A = kbd.state.ALT

	var hotkey = true
	if(D && !S && !C && !A && /^\d$/.test(kbd.key)) {
		setFloor(+kbd.key -1)

	} else if(D) switch(kbd.seq) {
		case 'CTRL+y':
			main.hs.redo()
		break

		case 'CTRL+z':
			main.hs.undo()
		break

		case 'r':
			main.hs.reload()
		break

		case 'z':
			dom.togclass(main.ui.element, 'fullscreen')
			onresize()
		break

		case 'c':
			changeZoom('center')
		break

		case 'TAB':
			setView(view2d ? 'v3d' : 'v2d')
		break

		case 'ESC':
			setTool(null)
			main.bus.emit('blur')
			hotkey = false
		break

		case 'DEL':
			var removed = main.selection.map(f.func('setOption', 'remove')).filter(Boolean).length
			if(removed) main.bus.emit('history_push')
		break

		case 'v':
			main.dat.toggle()
		break

		case 'b':
			main.debug = !main.debug
			main.obvDebug.write(main.debug)
		break

		default:
			hotkey = false
		break

	} else {
		hotkey = false
	}

	if(hotkey || (view2d ? main.v2 : main.v3).onkey(e)) {
		e.preventDefault()

	} else {
		D && console.log('keydown', kbd.seq || kbd.event.keyCode)
	}
}

function onerror(e) {
	document.title = e.filename.split('/').pop() +':'+ e.lineno
}

function ontouchend(e) {
	if(e.target.nodeName.toLowerCase() === 'input') {
		e.target.focus()
	}

	e.preventDefault()
	return false
}

function onresize() {
	main.v2.autoresize()
	main.v3.autoresize()
	main.vc.autoresize()
	main.ui.autoresize()
}

function onblur() {
	main.ui.onblur()
}

function updateHistMenu() {
	main.ui.updateHistMenu(main.hs.index > 0, main.hs.index < main.hs.limit)
	main.ui.mobileMenu.updateLink('#'+ main.hs.item)
}

function updateHash() {
	location.hash = main.hs.item
}

function setLocale(lang) {
	history.replaceState(null, '', '?lang='+ lang)
	Locale.set(lang)
	main.ui.setLocale(lang)
}

function newTemplate() {
	setTemplate(null)
	setMode('floor')
}

function setTemplate(item) {
	var tree
	if(typeof item === 'number') {
		var template = main.templates[item]
		if(template) tree = template.data

	} else tree = item

	main.imagery.resetMaterials()
	main.hs.data.tree = tree || {}
	main.hs.save()
	main.hs.reload()

	if(main.tree.version !== main.configVersion) {
		console.warn('config version:', main.tree.version,
			'do not match app version:', main.configVersion)
	}

	main.v2.focusOnTree()
	main.v3.focusOnTree()
	setFloor(0, true)
}

function loadTemplateFile(file) {
	var input  = dom.elem('input', null)
	,   reader = new FileReader

	dom.on('change', input, function() {
		var file = input.files[0]

		reader.readAsText(file)
	})

	dom.on('load', reader, function() {
		var data = JSON.parse(reader.result)

		setTemplate(data.tree)

		main.bus.emit('tpl_loaded')
	})

	input.setAttribute('type', 'file')
	input.click()
}

function saveTemplateFile() {
	main.tree.obvDraw3.read()
	main.vc.obvCalc.read()

	var parm = main.vc.obvParams.read()
	,   name = main.vc.materialsList[0]
	,   prod = main.imagery.products[name]
	,   pcid = prod ? prod.group +'-'+ prod.cname : 'empty'
	,   area = Math.round(parm.room_a)
	,   date = f.dformat(new Date, 'DD.MM_hh:ii')

	var data = JSON.stringify(main.hs.data, ' ', 2)
	,   name = ['house', pcid, area +'m2', date].join('-') +'.alt'

	saveAs(new Blob([data]), name)
}


function historyLoad(data) {
	main.tree.obvJSON.write(data.tree)

	loadMaterials(data.tree)

	updateFloorsUI()
	updateHistMenu()
	setFloor(main.floor, true)

	if(main.session.selection) {
		selectionSet(main.session.selection.map(main.tree.query, main.tree))
	}
	hoverNode(null)
}

function historySave() {
	main.hs.data.tree = main.tree.obvJSON.read()
	main.hs.data.tree.materials = main.imagery.saveMaterials()
	main.hs.save()

	updateHistMenu()
}

function loadMaterials(tree) {
	if(!tree) return

	main.imagery.loadMaterials(tree.materials)

	main.v3.needsRedraw = true
	main.ui.materialWindow.showSelectedItem()
}


function setMaterial(slot, id, silent) {
	main.imagery.setMaterial(slot, id)

	var prod = main.imagery.getUsedProduct(slot)
	if(!prod) return

	main.dat.updateColor()

	if(silent !== 'ui_hover') {
		main.ui.selectNodes(main.selection)
	}
}

function changeZoom(action) {
	var scale_in  = 0.67
	,   scale_out = 1.5
	,   duration  = 300

	var view

	switch(main.view) {
		case 'v2d':
			view = main.v2
		break

		case 'v3d':
			view = main.v3
		break
	}

	if(!view) return

	switch(action) {
		case 'in':
			view.zoomByTime(scale_in, duration)
		break

		case 'out':
			view.zoomByTime(scale_out, duration)
		break

		case 'center':
			view.focusOnTree(duration)
		break
	}
}

function cutsVisibility(visible) {
	main.ui.cutsVisible.set(visible)
	main.v3.cutVisibility.set(visible, 'ui')
}

function setMode(modestring, silent) {
	if(main.modestring === modestring) return
	main.modestring = modestring

	main.ui.mainMenu.modeMenu.setItem(modestring)
	main.ui.mobileMenu.modeMenu.setItem(modestring)

	var mode = {
		floor    : modestring === 'floor',
		door     : modestring === 'door',
		hole     : modestring === 'door',
		roof     : modestring === 'roof',
		drain    : modestring === 'drain',
		cut      : modestring === 'cut',
		material : modestring === 'material',
		calc     : modestring === 'calc'
	}

	var prev = main.mode || {}
	main.mode = mode

	var has = []
	,   not = []
	for(var name in mode) (mode[name] ? has : not).push('mode-'+ name)
	dom.addclass(main.ui.element, has.join(' '))
	dom.remclass(main.ui.element, not.join(' '))

	main.ui.viewMenu      .visible.set(!mode.calc,    'mode')
	main.ui.floorToolMenu .visible.set(mode.floor || mode.roof, 'mode')
	main.ui.doorToolMenu  .visible.set(mode.door,     'mode')
	main.ui.roofToolMenu  .visible.set(mode.roof,     'mode')
	main.ui.cutToolMenu   .visible.set(mode.cut,      'mode')
	main.ui.materialMenu  .visible.set(mode.material, 'mode')
	main.ui.materialWindow.visible.set(mode.material, 'mode')
	main.ui.optionsBar    .visible.set(!mode.material && !mode.calc, 'mode')

	selectionSet(null)
	hoverNode(null)
	setTool(null)
	cutsVisibility(mode.cut)

	main.v2.setMode(mode, modestring)
	main.v3.setMode(mode, modestring)


	if(mode.material ^ prev.material) main.v3.autoresize()

	var view
	switch(modestring) {
		case 'floor':
			view = 'v2d'
		break

		case 'door':
		case 'roof':
			if(main.view === 'vcalc') view = 'v3d'
		break

		case 'cut':
		case 'drain':
		case 'material':
			view = 'v3d'
		break

		case 'calc':
			view = 'vcalc'
		break
	}

	if(view) {
		setView(view, silent)
	}

	if(!silent) {
		main.session.mode = modestring
		sessionSave()
	}
}

function gotoCart(materials) {
	var domain
	switch(location.host) {
		case 'alta-profil.ru':
		case 'www.alta-profil.ru':
			domain = '//www.alta-profil.ru'
		break

		default:
			domain = '//b.alta-profil.ru'
		break
	}

	var apiURL  = domain +'/ajax.php?action=add_products_from_modulator_to_cart'
	,   cartURL = domain +'/cart'

	var data = {
		planner_id: main.session.id,
		products: {}
	}

	var backref = {}

	for(var id in materials) {
		var mat = main.imagery.products[id]
		if(!mat.art) continue

		backref[mat.art] = id
		data.products[mat.art] = materials[id]
	}

	main.get.post(apiURL, {
		prepare: JSON.parse,
		query: { data: JSON.stringify(data) }

	}).defer.then(onload, onerror)


	function onload(resp) {
		var url = resp.cart_url || cartURL
		,   mstat = {}

		for(var art in resp.products) {
			var id = backref[art]

			mstat[id] = resp.products[art]
		}

		main.ui.cartPopup.showResults(materials, mstat, url)

		main.vc.cartLoading(false)
	}

	function onerror(e) {
		if(e instanceof SyntaxError) {
			main.ui.cartPopup.showError('cart_bad_json')

		} else {
			main.ui.cartPopup.showError('cart_bad_connection')
		}

		main.vc.cartLoading(false)
	}
}


function showFloor(floor, visible) {
	main.v2.setLayerVisibility(floor, visible)
}

function addFloor(index, roof, empty) {
	main.tree.addFloor(roof, !empty)

	updateFloorsUI()

	setFloor(index)
	historySave()
}

function delFloor(index) {
	var floors = main.tree.obvFloors.read()
	,   floor = floors[index]

	if(floor && floor.setOption('remove')) {
		updateFloorsUI()
		if(main.floor >= index) setFloor(main.floor -1)
		historySave()
	}
}

function updateFloorsUI() {
	var floors = main.tree.obvFloors.read()
	,   length = floors.length
	,   last   = floors[length -1]

	main.ui.updateFloorMenu(length, last.obvIsRoof.read())
}

function setFloor(floor, force) {
	if(main.floor === floor && !force) return

	var floors = main.tree.obvFloors.read()
	if(-1 >= floor || floor >= floors.length) return

	main.floor = floor

	main.ui.floorMenu.setItem(floor)
	main.v2.setLayer(floor)
	main.v3.setLayer(floor)

	if(main.view === 'v2d') {
		selectionSet([floors[main.floor]])
	}
}

function setView(name, silent) {
	if(main.view === name) return

	var is2 = name === 'v2d'
	,   is3 = name === 'v3d'
	,   isc = name === 'vcalc'

	var ws2 = main.view === 'v2d'
	,   ws3 = main.view === 'v3d'
	,   wsc = main.view === 'vcalc'

	main.view = name
	main.ui.viewMenu.setItem(name)

	dom.togclass(main.ui.element, 'view-2d', is2)
	dom.togclass(main.ui.element, 'view-3d', is3)
	dom.togclass(main.ui.element, 'view-calc', isc)

	// main.ui.cutsVisible   .visible.set(is3, 'view')
	main.ui.zoomMenu      .visible.set(is2 || is3, 'view')
	main.ui.floorMenu     .visible.set(is2, 'view')
	main.ui.floorToolMenu .visible.set(is2, 'view')
	// main.ui.doorToolMenu  .visible.set(is2, 'view')
	main.ui.roofToolMenu  .visible.set(is3, 'view')
	main.ui.cutToolMenu   .visible.set(is3, 'view')
	main.ui.materialMenu  .visible.set(is3, 'view')
	main.ui.materialWindow.visible.set(is3, 'view')


	if(isc) {
		dom.append(main.vc.sview, main.v3.element)
		dom.append(main.vc.sview, main.ui.watermark)
		main.v3.autoresize()

	} else if(wsc) {
		dom.append(main.ui.viewport, main.v3.element)
		dom.append(main.ui.viewport, main.ui.watermark)
		main.v3.autoresize()
	}

	// main.ui.optionsBar.visible.set(is2, 'view')

	if(is3) main.v3.needsRedraw = true

	main.v2.visible.set(is2)
	main.v3.visible.set(is3 || isc)
	main.vc.visible.set(isc)

	main.ui.autoresize()

	if(!silent) {
		main.session.view = name
		sessionSave()
	}
}

function sessionSave() {
	try {
		localStorage.session = JSON.stringify(main.session)
	} catch(e) {
	}
}

function sessionLoad(data) {
	try {
		main.session = JSON.parse(localStorage.session)
	} catch(e) {
		main.session = {}
	}

	if(!main.session.id) {
		main.session.id = parseInt(Math.random().toString().slice(7), 10)
	}
	if(!main.session.mode) {
		main.session.mode = 'floor'
	}
	if(!main.session.view) {
		main.session.view = 'v3d'
	}

	if(main.session.camera) {
		main.v3.camera.position.fromArray(main.session.camera.position)
		main.v3.orbit.target.fromArray(main.session.camera.target)
		main.v3.orbit.update()

	} else {
		main.session.camera = {}
	}

	setMode(main.session.mode, true)
	setView(main.session.view)
}

function destroyNode(node) {
	if(node.obvSelect.read()) selectionRem([node])
	if(node.obvHover.read()) hoverNode(null)
}

function setTool(name, options, node) {
	if(name && !node) {
		selectionSet(null)
	}

	hoverNode(null)

	main.v2.pickTool(name, options, node)
	main.v3.pickTool(name, options, node)
	main.ui.setTool(name)
}

function updateNodeHighlight(node, select, hover) {
	if(!node) return

	if(select != null) node.obvSelect.write(select)
	if(hover  != null) node.obvHover.write(hover)
}

function selectionVisible(visible) {
	f.amap(main.selection, updateNodeHighlight, null, visible, null)
}

function selectionAdd(selection) {
	selectionSet(f.sor(main.selection, selection))
}

function selectionRem(selection) {
	selectionSet(f.snot(main.selection, selection))
}

function selectionTog(selection) {
	selectionSet(f.sxor(main.selection, selection))
}

function selectionSet(selection) {
	var prev = main.selection
	,   next = [].concat(selection).filter(Boolean)
	,   diff = f.adiff(next, prev)
	if(!diff.addc && !diff.remc) return

	f.amap(diff.rem, updateNodeHighlight, null, false, null)
	f.amap(diff.add, updateNodeHighlight, null, true,  null)

	main.selection = next

	main.ui.selectNodes(main.selection)
	main.dat.updateColor()

	main.session.selection = main.selection.map(f.func('path'))
	sessionSave()
}

function hoverNode(node) {
	var prev = main.hoveredNode
	if(node === prev) return

	main.hoveredNode = node
	updateNodeHighlight(prev, null, false)
	updateNodeHighlight(node, null, true)
}

function loadend() {
	var loading = dom.one('.loading')
	,   loadtxt = dom.one('.loading-text')
	,   lcindex

	setTimeout(stage1, 500)
	function stage1() {
		lcindex = Locale.setText(loadtxt, 'loading_ready')
		dom.addclass(loading, 'hide')
		setTimeout(stage2, 500)
	}
	function stage2() {
		Locale.unwatch(lcindex)
		dom.remove(loading)
	}
}

loop.last  = Date.now()
loop.frame = 0
function loop() {
	requestAnimationFrame(loop)

	TWEEN.update()

	if(main.v3.orbit.changed) {
		main.session.camera.position = main.v3.camera.position.toArray()
		main.session.camera.target = main.v3.orbit.target.toArray()
		sessionSave()
	}

	if(main.debug) {
		var m = main.v3.renderer.info.memory
		document.title = [
			m.geometries +'g',
			m.textures   +'t',
			main.tree.obvSubnodePool.read().length +'s'
		].join(' ')
	}

	loop.time  = Date.now()
	loop.delta = loop.time - loop.last
	loop.frame++

	main.v2.update(loop.time, loop.delta, loop.frame)
	main.v3.update(loop.time, loop.delta, loop.frame)
	main.vc.update(loop.time, loop.delta, loop.frame)
	main.ui.update(loop.time, loop.delta, loop.frame)

	loop.last = loop.time
}
