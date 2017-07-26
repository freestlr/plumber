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

main.splitView = main.tiles.splits[0]


main.viewTween = new TWEEN.Tween(main.splitView)
	.to({ position: 0.5 }, 400)
	.easing(TWEEN.Easing.Cubic.Out)
	.onUpdate(main.tiles.update, main.tiles)


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


var clear2 = dom.div('view-clear hand', main.view2.element)
Atlas.set(clear2, 'i-cross', 'absmid')
new EventHandler(onViewClear2).listen('tap', clear2)


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
		deselect: true,

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
	location.hash = sid || ''
}


function onViewClear() {
	main.tree = null
	main.view.setTree(null)
	location.hash = ''
}


function onViewClear2() {
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
	// main.sample.describe()

	var node = new TNode(main.sample)

	if(main.tree) {
		main.view2.setTree(node)
		main.view2.focusOnTree(300)

		main.viewTween.target.position = 0.5
		main.viewTween.start()

	} else {
		main.tree = node
		main.view.setTree(node)
		main.view.focusOnTree(300)
		location.hash = ''
	}
}

function connectSample(sid) {
	var sample = main.sampler.samples[sid]
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
		main.viewTween.target.position = 1
		main.viewTween.start()
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
	var sample = main.sampler.addSample(item)
	var menu = main.sampleMenu

	var block = menu.addItem({
		data: sample.id,
		text: sample.src
	})

	block.remove = dom.div('sample-remove absmid hand', block.element)
	Atlas.set(block.remove, 'i-cross', 'absmid')

	block.hRemove = new EventHandler(removeSample, null, block).listen('tap', block.remove)

	menu.set(menu.blocks.indexOf(block), true)
}


main.connectionParts = []
function onConnectionTap(view, index, con) {
	main.connectionParts[index] = con

	var master = main.connectionParts[0]
	,   slave  = main.connectionParts[1]

	if(master && slave) makeConnection(master, slave)
}

function makeConnection(master, slave) {
	main.view.selectConnection(null)
	main.view2.selectConnection(null)
	main.view2.setTree(null)

	master.node.connect(master.index, slave.node, slave.index)
	main.view.setTree(main.tree)
	main.view.focusOnTree(300)
	// main.view.needsRedraw = true

	location.hash = ''
}

function removeSample(block) {
	main.sampleMenu.removeBlock(block)

	Atlas.free(block.remove)
	block.hRemove.release()

	var sample = main.sampler.samples[block.data]
	if(sample) {
		delete main.sampler.samples[sample.id]
	}
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

	main.view.events.on('connection_select', onConnectionTap, null, [main.view, 0])
	main.view2.events.on('connection_select', onConnectionTap, null, [main.view2, 1])


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
