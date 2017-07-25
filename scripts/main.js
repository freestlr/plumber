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
main.tiles.setLayout(['h', ['h', 0, 0, 1], 0, 0.7])

// main.splitV = main.tiles.splits[0]
// main.viewportL = main.tiles.frames[0]
// main.viewportR = main.tiles.frames[1]
// main.tiles.showClients()


// main.tiles.events.on('update', main.onTilesUpdate, main)

main.renderer = new THREE.WebGLRenderer({
	antialias: true,
	preserveDrawingBuffer: true
})
main.renderer.autoClear = false


main.view = new View3({
	// eroot: document.body,
	renderer: main.renderer,
	// clearColor: 0xFF00FF,
	enableWireframe: false
})

main.view2 = new View3({
	// eroot: document.body,
	renderer: main.renderer,
	// clearColor: 0x00FF00,
	enableWireframe: false
})


main.tfc = new THREE.TransformControls(main.view.camera, main.view.element)
main.tfc.addEventListener('change', onTransformControlsChange)
main.view.scene.add(main.tfc)


main.tiles.setClients([main.view, main.view2])


dom.addclass(document.body, 'ontouchstart' in window ? 'touch' : 'no-touch')
dom.addclass(main.renderer.domElement, 'canvas-main')
dom.append(main.tiles.element, main.renderer.domElement)
dom.append(document.body, main.tiles.element)
dom.append(document.body, main.file.input)



main.get.xml('images/atlas.svg').defer
	.then(Atlas.setSource)

main.get.image('images/textures/cubemap.png').defer
	.then(main.imagery.unwrapCubemap3x2, main.imagery)

main.get.json('configs/samples.json').defer
	.then(main.sampler.addSampleList, main.sampler)
	.then(makeMenu)
	.detach(run)



function makeMenu() {
	var samples = main.sampler.getList()
	,   names = samples.map(function(sid) { return main.sampler.samples[sid].src })

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
	block.hDragStart = new EventHandler(onSubDrag, null, block).listen('dragstart', block.element)
}

function onSubDrag(block, e) {
	e.dataTransfer.setData('text/sample', block.data)
}

function onSubChange(sid) {
	location.hash = sid
}


function loadSample(sid) {
	var sample = main.sampler.samples[sid]
	if(!sample) return false

	if(!sample.object && !sample.src) return false

	main.sampleMenu.set(0, true)
	dom.text(main.sampleMenu.element, sample.src)


	if(main.deferSample) {
		main.deferSample.set(null)
	}
	main.sample = sample
	main.deferSample = main.sample.load().detach(setSample)
	return true
}

function setSample() {
	// main.sample.describe()

	// console.log(main.sample.joints)
	var joint0 = main.sample.joints[1]
	if(joint0) {
		main.tfc.attach(joint0.object)

	} else {
		main.tfc.detach()
	}

	var node = new TNode(main.sample)

	// main.view.setTree(main.sample.clone())
	// main.view.focusOnTree(300)

	if(main.tree) {
		main.view2.setTree(node)
		main.view2.focusOnTree(300)

	} else {
		main.tree = node
		main.view.setTree(node)
		main.view.focusOnTree(300)
	}
}

function connectSample(id) {
	var sample = main.sampler.samples[id]
	if(!sample) return

	if(main.tree) {
		var connected = false
		main.tree.traverse(function(node) {
			if(connected) return

			for(var i = 0; i < node.connections.length; i++) {
				var con = node.connections[i]

				if(!con.node) {
					node.connect(i, new TNode(sample), 0)
					connected = true
					return
				}
			}
		})

	} else {
		main.tree = new TNode(sample)
		main.view.setTree(main.tree)
	}

	main.view.focusOnTree()
	main.view.needsRedraw = true
}


function onkey(e) {
	if(kbd.down && kbd.changed) switch(kbd.key) {
		case '1': return main.tfc.setMode('translate')
		case '2': return main.tfc.setMode('rotate')
		case '3': return main.tfc.setMode('scale')
		case '4': return main.tfc.setSpace(main.tfc.space === 'world' ? 'local' : 'world')

		case 'c':
			main.view.focusOnTree()
			main.view2.focusOnTree()
		return

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
	var dt = e.dataTransfer

	var file = dt.files[0]
	if(file) {
		main.file.importJSON(file)
	} else {
		connectSample(dt.getData('text/sample'))
	}
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

function onTransformControlsChange() {
	// console.log(main.tfc.object.matrix.elements)
	main.view.needsRedraw = true
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
	bootProgress(1)
	main.timer.play()
}

function loop(t, dt) {
	TWEEN.update()

	main.tfc.update()

	main.view.onTick(dt)
	main.view2.onTick(dt)
}
