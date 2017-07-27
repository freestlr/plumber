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
	displaySample(sid)
}


function onViewClear() {
	main.tree = null
	main.view.setTree(null)
	displaySample(null)
}


function onViewClear2() {
	displaySample(null)
}


function displaySample(sid) {
	var sample = main.sampler.samples[sid]
	if(sample === main.sampleView2) return

	main.sampleView2 = main.tree ? sample : null
	main.sampleMenu.setItem(main.sampleView2 && main.sampleView2.id)

	var openView2 = main.sampleView2 && (main.sampleView2.object || main.sampleView2.src)

	if(!openView2) {
		main.view.markers.markersVisible.off('view2')
		main.view2.markers.markersVisible.off('view2')
	}

	var splitPosition = openView2 ? 0.5 : 1
	if(splitPosition !== main.viewTween.target.position) {
		main.viewTween.target.position = splitPosition
		main.viewTween.start()
	}

	if(main.deferSample) {
		main.deferSample.set(null)
		main.deferSample = null
	}
	if(sample) {
		main.deferSample = sample.load().detach(setSample)
		// sample.describe()
	}
}


function setSample(sample) {
	if(!sample) return

	var node = new TNode(sample)

	if(main.tree) {
		main.view2.setTree(node)
		updateConnectionGroups(main.tree, node)

		main.view.markers.markersVisible.on('view2')
		main.view2.markers.markersVisible.on('view2')

	} else {
		main.tree = node
		main.view.setTree(node)
	}
}

function updateConnectionGroups(tree, tree2) {
	main.cons = tree.retrieveConnections({ connected: false }, true)
	main.cons2 = tree2.retrieveConnections({ connected: false }, true)

	var groups2 = []

	for(var i = 0; i < main.cons2.length; i++) {
		main.cons2[i].group = -1
	}

	for(var i = 0; i < main.cons.length; i++) {
		var con = main.cons[i]
		var list = con.canConnectList(main.cons2)

		con.group = -1

		if(list.length) {
			var found = false
			for(var j = 0; j < groups2.length; j++) {

				if(!f.seq(list, groups2[j])) continue

				con.group = j
				found = true
				break
			}

			if(!found) {
				var gi = groups2.length

				con.group = gi
				for(var j = 0; j < list.length; j++) {
					list[j].group = gi
				}

				groups2.push(list)
			}
		}
	}

	updateConnectionVisibilitySets()
}

function updateConnectionVisibilitySets() {
	if(main.cons) for(var i = 0; i < main.cons.length; i++) {
		updateConnectionVisibility(main.cons[i], main.connectionParts[1])
	}
	if(main.cons2) for(var i = 0; i < main.cons2.length; i++) {
		updateConnectionVisibility(main.cons2[i], main.connectionParts[0])
	}
}
function updateConnectionVisibility(con, match) {
	var visible = con.group !== -1
	if(visible && match) visible = con.canConnect(match)

	con.inactive.set(!visible, 'view2')
	con.marker.updateState()
}

function connectSample(sid) {
	var sample = main.sampler.samples[sid]
	if(!sample) return

	if(main.tree) {
		var found = false
		main.tree.traverseConnections(function(con) {
			if(found || con.connected) return

			con.node.connect(con.index, new TNode(sample), 0)
			found = true
		})

	} else {
		main.tree = new TNode(sample)
	}

	main.view.setTree(main.tree)
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
	main.view2.onKey(e)
}

// function onhashchange(e) {
// 	displaySample(location.hash.slice(1))
// }

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
function onConnectionSelect(view, index, con) {
	main.connectionParts[index] = con

	updateConnectionVisibilitySets()

	var master = main.connectionParts[0]
	,   slave  = main.connectionParts[1]

	if(master && slave) makeViewConnection(master, slave)
}

function makeViewConnection(master, slave) {
	main.view.selectConnection(null)
	main.view2.selectConnection(null)
	main.view2.setTree(null)

	master.node.connect(master.index, slave.node, slave.index)

	main.view.setTree(main.tree)


	main.animatedConnection = master
	master.events.once('connect_start', function() {
		main.animatedConnection = master
	})
	master.events.once('connect_end', function() {
		delete main.animatedConnection
	})

	master.playConnection()

	displaySample(null)
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
	// dom.on('hashchange', window, onhashchange)
	dom.on('resize',  window, onresize)
	dom.on('keydown', window, onkey)
	dom.on('keyup',   window, onkey)

	dom.on('dragover', main.view.element, onDragOver)
	dom.on('drop', main.view.element, onDrop)

	main.sampleMenu.events.on('change', onSubChange)
	main.file.events.on('import', onSampleImport)

	main.view.events.on('connection_select', onConnectionSelect, null, [main.view, 0])
	main.view2.events.on('connection_select', onConnectionSelect, null, [main.view2, 1])

	main.view.events.on('view_clear', onViewClear)
	main.view2.events.on('view_clear', onViewClear2)


	onresize()
	// onhashchange()
	bootProgress(1)
	main.timer.play()
}

function loop(t, dt) {
	if(main.animatedConnection) {
		main.view.needsRedraw = true
	}

	TWEEN.update()

	main.view.onTick(dt)
	main.view2.onTick(dt)
}
