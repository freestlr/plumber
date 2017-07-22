var main = {}

main.get = new Loader
main.timer = new Timer(loop)
main.file = new FileImport

main.imagery = new Imagery

main.sampler = new Sampler
main.sampler.setImagery(main.imagery)
main.sampler.folder = 'samples/'

main.tiles = new TileView
// main.tiles.setLayout(['v', ['h', 0, 0, 0.7], 0, 0.8])
main.tiles.setLayout(['h', 0, 0, 0.9])

// main.splitV = main.tiles.splits[0]
// main.viewportL = main.tiles.frames[0]
// main.viewportR = main.tiles.frames[1]
// main.tiles.showClients()


// main.tiles.events.on('update', main.onTilesUpdate, main)

main.renderer = new THREE.WebGLRenderer({ antialias: true })

main.view = new View3({
	// eroot: document.body,
	renderer: main.renderer,
	enableWireframe: false
})

main.view2 = new View3({
	// eroot: document.body,
	renderer: main.renderer,
	enableWireframe: false
})


main.tiles.setClients([main.view, main.view2])


dom.addclass(main.renderer.domElement, 'canvas-main')
dom.append(main.tiles.element, main.renderer.domElement)
dom.append(document.body, main.tiles.element)
dom.append(document.body, main.file.input)



main.get.xml('images/atlas.svg').defer
	.then(Atlas.setSource)

main.get.image('images/textures/cubemap.png').defer
	.then(main.imagery.unwrapCubemap3x2, main.imagery)

// main.get.image('images/textures/cloth_45.jpg').defer
// 	.then(function(image) {
// 
// 		main.imagery.setMaterial('gold', {
// 			id: 1111,
// 			color: 0xf7d78a,
// 			texture: {
// 				image: main.imagery.pixel.image,
// 				loaded: true,
// 				repeatX: 120,
// 				repeatY: 80
// 			},
// 			bump: {
// 				image: image,
// 				loaded: true,
// 				repeatX: 120,
// 				repeatY: 80
// 			}
// 		})
// 	})

main.get.json('configs/samples.json').defer
	.then(main.sampler.addSampleList, main.sampler)
	.then(makeMenu)
	.then(run)



function makeMenu() {
	var samples = main.sampler.getList()
	,   names = samples.map(getSampleImage)

	main.sampleMenu = new UI.Submenu({
		ename: 'sample sample-item absmid hand',
		sname: 'submenu',
		cname: 'submenu-item sample-item',
		eroot: document.body,
		distance: 18,
		visibleMethod: dom.visible,
		align: 'bottom',
		square: false,

		texts: names,
		items: samples
	})

	main.sampleMenu.menu.events.on('add-block', onSubAdd)
	main.sampleMenu.menu.blocks.forEach(onSubAdd)




	var mat = main.imagery.materials.gold
	var col = mat && mat.specular

	main.gui = new dat.GUI({
		// autoPlace: false,
		hideable: false
	})
	main.gui.closed = true

	var props = {}

	props.number = 3
	main.gui.add(props, 'number').name('Number')

	if(col) {
		props.color = '#'+ col.getHexString()
		main.gui.addColor(props, 'color').name('Color').onChange(function(color) {
			col.set(color)
			main.view.needsRedraw = true
			main.view2.needsRedraw = true
		})
	}
}

function onSubAdd(block) {
	block.element.setAttribute('draggable', true)
}

function onSubChange(sid) {
	location.hash = sid
}

function getSampleImage(sid) {
	var sample = main.sampler.samples[sid]
	return sample ? sample.name : 'unknown/'+ sid
}

function setSampleImage(element, sid) {
	return Atlas.set(element, UI.getSampleImage(sid))
}

function loadSample(sid) {
	var sample = main.sampler.samples[sid]
	if(!sample) return false

	if(!sample.object && !sample.src) return false

	main.sampleMenu.set(0, true)
	UI.setSampleImage(main.sampleMenu.element, sid)


	if(main.deferSample) {
		main.deferSample.set(null)
	}
	main.sample = sample
	main.deferSample = main.sample.load().then(setSample)
	return true
}

function setSample() {
	main.sample.describe()

	main.view.setTree(main.sample.clone())
	main.view.focusOnTree(300)

	main.view2.setTree(main.sample.clone())
	main.view2.focusOnTree(300)
}


function onkey(e) {
	if(kbd.down && kbd.changed) switch(kbd.key) {
		case 'v':
			main.gui.closed ? main.gui.open() : main.gui.close()
		return
	}
	main.view.onKey(e)
}

function onhashchange(e) {
	var id = location.hash.slice(1)
	if(id) {
		if(!loadSample(id)) {
			location.hash = ''
		}

	} else {
		main.sampleMenu.set(1, true)
	}
}

function onresize() {
	var element = main.tiles.element
	main.renderer.setSize(element.offsetWidth, element.offsetHeight)

	main.tiles.autoresize()
	// main.view.onResize()
}

function onDragOver(e) {
	e.dataTransfer.dropEffect = 'copy'
	e.preventDefault()
}

function onDrop(e) {
	var file = e.dataTransfer.files[0]
	if(file) main.file.importJSON(file)
	e.preventDefault()
}

function onSampleImport(item) {
	main.sampler.addSample(item)

	var menu = main.sampleMenu.menu
	var block = menu.addItem({
		data: item.id,
		text: item.name
	})

	menu.set(menu.blocks.indexOf(block), true)
}


function run() {
	dom.on('hashchange', window, onhashchange)
	dom.on('resize',  window, onresize)
	dom.on('keydown', window, onkey)
	dom.on('keyup',   window, onkey)

	dom.on('dragover', main.view.element, onDragOver)
	dom.on('drop', main.view.element, onDrop)

	main.sampleMenu.menu.events.on('change', onSubChange)
	main.file.events.on('import', onSampleImport)


	onresize()
	onhashchange()
	main.timer.play()
}

function loop(t, dt) {
	TWEEN.update()

	main.view.onTick(dt)
	main.view2.onTick(dt)
}
