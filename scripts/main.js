var main = {}

main.get = new Loader
main.timer = new Timer(loop)
main.file = new FileImport

main.imagery = new Imagery

main.sampler = new Sampler
main.sampler.setImagery(main.imagery)
main.sampler.folder = 'samples/'

main.tiles = new TileView
main.tiles.setLayout(['h', ['h', 0, 0, 1], 0, 0.8])



main.renderer = new THREE.WebGLRenderer({
	antialias: true,
	preserveDrawingBuffer: true
})
main.renderer.autoClear = false


main.view = new View3({
	// eroot: document.body,
	renderer: main.renderer,
	// clearColor: 0xFF00FF
})

main.view2 = new View3({
	// eroot: document.body,
	renderer: main.renderer,
	// clearColor: 0x00FF00
})


main.list = dom.div('samples-list')

main.tiles.setClients([main.view, main.view2, { element: main.list }])



var clear = dom.div('view-clear hand', main.view.element)
Atlas.set(clear, 'i-cross', 'absmid')
new EventHandler(onViewClear).listen('tap', clear)


dom.addclass(document.body, 'ontouchstart' in window ? 'touch' : 'no-touch')
dom.addclass(main.renderer.domElement, 'canvas-main')
dom.append(main.tiles.element, main.renderer.domElement)
dom.append(document.body, main.tiles.element)
dom.append(main.list, main.file.element)



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


	main.sampleMenu = new Block.Menu({
		ename: 'sample-menu',
		cname: 'sample-item',
		eroot: main.list,

		texts: names,
		items: samples
	})

	main.sampleMenu.events.on('add-block', onSubAdd)
	main.sampleMenu.blocks.forEach(onSubAdd)





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


function onViewClear() {
	main.tree = null
	main.view.setTree(null)
	location.hash = ''
}


function loadSample(sid) {
	main.sampleMenu.setItem(sid)

	var sample = main.sampler.samples[sid]
	if(!sample) return false

	if(!sample.object && !sample.src) return false


	if(main.deferSample) {
		main.deferSample.set(null)
	}
	main.sample = sample
	main.deferSample = main.sample.load().detach(setSample)
	return true
}

function setSample() {
	main.sample.describe()

	var node = new TNode(main.sample)

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
		var found = false
		main.tree.traverseConnections(function(node, con, index) {
			if(found || con.connected) return

			node.connect(index, new TNode(sample), 0)
			found = true
		})

	} else {
		main.tree = new TNode(sample)
		main.view.setTree(main.tree)
	}

	main.view.updateConnections()
	main.view.focusOnTree()
	main.view.needsRedraw = true
}


function onkey(e) {
	if(e.ctrlKey || e.shiftKey || e.altKey) {

	} else if(kbd.down && kbd.changed) switch(kbd.key) {
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
	var ok = loadSample(location.hash.slice(1))
	if(!ok) {
		location.hash = ''
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

	var menu = main.sampleMenu
	var block = menu.addItem({
		data: item.id,
		text: item.src
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

	main.sampleMenu.events.on('change', onSubChange)
	main.file.events.on('import', onSampleImport)


	onresize()
	onhashchange()
	bootProgress(1)
	main.timer.play()
}

function loop(t, dt) {
	TWEEN.update()

	main.view.onTick(dt)
	main.view2.onTick(dt)
}
