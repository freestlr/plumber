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
	.to({ position: main.splitView.position }, 400)
	.easing(TWEEN.Easing.Cubic.Out)
	.onUpdate(main.tiles.update, main.tiles)


main.renderer = new THREE.WebGLRenderer({
	alpha: false,
	depth: true,
	stencil: true,
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
	enableStencil: false,
	enableRaycast: false
	// clearColor: 0x00FF00
})


main.list = dom.div('samples-list')

main.tiles.setClients([main.view, main.view2, { element: main.list }])


main.splitViewMessage = dom.div('split-view-message')
dom.text(main.splitViewMessage, 'no compatible connections')
dom.display(main.splitViewMessage, false)



dom.addclass(document.body, 'ontouchstart' in window ? 'touch' : 'no-touch')
dom.addclass(main.renderer.domElement, 'canvas-main')
dom.prepend(main.tiles.element, main.renderer.domElement)
dom.append(main.tiles.element, main.splitViewMessage)
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
	main.sampleMenu = new Block.Menu({
		ename: 'sample-menu',
		eroot: main.list,
		deselect: true,

		options: {
			factory: Block.Toggle,
			ename: 'sample-item'
		},

		items: main.sampler.getList().map(function(sid) {
			return {
				text: main.sampler.samples[sid].name,
				data: sid
			}
		})
	})

	main.sampleMenu.events.on('add-block', onSubAdd)
	main.sampleMenu.blocks.forEach(onSubAdd)





	var mat = main.imagery.materials.subtract
	var col = main.view.smFill.uniforms.color.value

	main.gui = new dat.GUI({
		// autoPlace: false,
		hideable: false
	})
	main.gui.closed = true

	var props = {}

	props.number = 3
	main.gui.add(main.view.smFill.uniforms.alpha, 'value').min(0).max(1).name('Alpha').onChange(function() { main.view.needsRedraw = true })

	if(col) {
		props.color = '#'+ col.getHexString()
		main.gui.addColor(props, 'color').name('Color').onChange(function(color) {
			col.set(color)
			redraw()
		})
	}
	main.gui.addColor(main.view.stencilHover.params, 'drawColor').name('Hover').onChange(redraw)
	main.gui.addColor(main.view.stencilSelect.params, 'drawColor').name('Select').onChange(redraw)

	function redraw() {
		main.view.needsRedraw = true
		main.view2.needsRedraw = true
	}
}

function onSubAdd(block) {
	block.element.setAttribute('draggable', true)

	block.watchEvents.push(
		new EventHandler(onSubDrag, null, block).listen('dragstart', block.element))
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

	main.splitScreen = main.sampleView2 && (main.sampleView2.object || main.sampleView2.src)

	if(!main.splitScreen) {
		main.view.markers.markersVisible.off('view2')
		main.view2.markers.markersVisible.off('view2')

		dom.display(main.splitViewMessage, false)
	}

	main.view.enableRaycast = !main.splitScreen

	main.view.hoverNode(null)
	main.view.selectNode(null)
	main.view.selectConnection(null)

	var splitPosition = main.splitScreen ? 0.5 : 1
	if(splitPosition !== main.viewTween.target.position) {
		main.viewTween.target.position = splitPosition
		main.viewTween.start()
	}

	preloadSample(sample, setSample)
}

function preloadSample(sample, onComplete) {
	if(main.deferSample) {
		main.deferSample.set(null)
		main.deferSample = null
	}
	if(sample) {
		main.deferSample = sample.load().detach(onComplete)
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
	main.cons  = tree && tree.retrieveConnections({ connected: false }, true) || []
	main.cons2 = tree2 && tree2.retrieveConnections({ connected: false }, true) || []

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

	// console.log(groups2.length)
	main.hasAvailableConnections = groups2.length
	dom.display(main.splitViewMessage, !main.hasAvailableConnections)
	updateSplitViewMessagePosition()
	updateConnectionVisibilitySets()

	main.view.needsRetrace = true
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
	var available = con.group !== -1
	,   compatible = match ? con.canConnect(match) : true

	con.marker.visible.set(!main.hasAvailableConnections || available, 'active')
	con.inactive.set(!available || !compatible, 'view2')
	con.marker.updateState()
}

function connectSample(sample) {
	if(!sample) return

	var node = new TNode(sample)

	if(main.tree) {
		var cons = main.tree.retrieveConnections({ connected: false }, true)

		loop_cons:
		for(var i = 0; i < cons.length; i++) {
			var conA = cons[i]

			for(var j = 0; j < node.connections.length; j++) {
				var conB = node.connections[j]

				if(conA.canConnect(conB)) {
					conA.node.connect(conA.index, node, conB.index)
					main.view.setTree(main.tree)
					break loop_cons
				}
			}
		}


	} else {
		main.tree = node
		main.view.setTree(main.tree)
	}

	if(main.splitScreen) {
		updateConnectionGroups(main.tree, main.view2.tree)
	}
}


function onkey(e) {
	if(e.ctrlKey || e.shiftKey || e.altKey) {

	} else if(kbd.down && kbd.changed) switch(kbd.key) {
		case 'DEL':
			promptDeleteNode(main.view.nodeSelected)
		return

		case 'c':
			main.view.focusOnTree()
			main.view2.focusOnTree()
		return

		case 'x':
			main.debug = !main.debug
			main.imagery.materials.subtract.visible = !!main.debug
			main.imagery.materials.norcon.visible = !!main.debug
			if(main.debug && main.view2.tree) main.view2.tree.sample.describe()
		break

		case 'v':
			main.gui.closed ? main.gui.open() : main.gui.close()
		return
	}

	main.view.onKey(e)
	main.view2.onKey(e)
}

function promptDeleteNode(node) {
	if(!node) return

	var stats = node.pinch()
	if(stats.removeCount < 2) {
		node.disconnect()
		main.tree = stats.maxRoot
		main.view.setTree(main.tree)
		main.view.selectNode(null)

	} else {
		console.log('do you want to delete', stats.removeCount, 'nodes?')
	}
}


// function onhashchange(e) {
// 	displaySample(location.hash.slice(1))
// }

function onresize() {
	var e = main.tiles.element
	,   w = e.offsetWidth
	,   h = e.offsetHeight

	main.renderer.setSize(w, h)
	main.tiles.autoresize()

	main.view.resizeRenderTargets(w, h)
	main.view.resizeShaders(w, h)
	// main.view.onResize()
}

function updateSplitViewMessagePosition() {
	var elem = main.splitViewMessage
	,   vp   = main.splitView
	,   svw  = elem.offsetWidth
	,   svh  = elem.offsetHeight
	,   sx   = vp.split === TileView.VERTICAL_SPLIT   ? 0.5 : vp.position
	,   sy   = vp.split === TileView.HORIZONTAL_SPLIT ? 0.5 : vp.position
	,   cx   = vp.x + vp.w * sx - svw / 2
	,   cy   = vp.y + vp.h * sy - svh / 2

	elem.style.left = cx +'px'
	elem.style.top  = cy + 0.3 * vp.h +'px'
}

function onTilesUpdate() {

	if(!main.hasAvailableConnections) {
		updateSplitViewMessagePosition()
	}

	return

	var canvas = main.renderer.domElement
	,   frame  = main.splitView

	if(canvas.width  !== frame.w
	|| canvas.height !== frame.h) {
		main.renderer.setSize(frame.w, frame.h)
	}

	canvas.style.left = frame.x +'px'
	canvas.style.top  = frame.y +'px'
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
		var sid = dt.getData('text/sample')
		,   sample = main.sampler.samples[sid]

		preloadSample(sample, connectSample)
	}

	e.preventDefault()
}

function onSampleImport(item) {
	var sample = main.sampler.addSample(item)
	var menu = main.sampleMenu

	var block = menu.addItem({
		data: sample.id,
		text: sample.name
	})

	block.remove = dom.div('sample-remove absmid hand', block.element)

	block.watchAtlas.push(
		Atlas.set(block.remove, 'i-cross', 'absmid'))

	block.watchEvents.push(
		new EventHandler(removeSample, null, block).listen('tap', block.remove))

	menu.set(menu.blocks.indexOf(block), true)
}


function onNodeSelect(node, prev) {
	var system = main.view.markers
	if(prev && prev.deleteMarker) {
		system.removeMarker(prev.deleteMarker)
		prev.deleteMarker = null
	}
	if(node) {
		var m = main.view.markers.addMarker(node.localBox.getCenter(), 'remove', null, true)
		m.deleteNode = node
		m.align = 'bottom'
		m.visible.on()

		m.watchAtlas.push(Atlas.set(dom.div('marker-delete', m.content), 'i-delete'))

		node.deleteMarker = m
	}
}

function onMarkerTap(marker) {
	if(marker && marker.deleteNode) promptDeleteNode(marker.deleteNode)
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
	main.sampleMenu.removeBlock(block, true)

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
	dom.on('dragover', main.view2.element, onDragOver)
	dom.on('drop', main.view.element, onDrop)
	dom.on('drop', main.view2.element, onDrop)

	main.sampleMenu.events.on('change', onSubChange)
	main.file.events.on('import', onSampleImport)

	main.tiles.events.on('update', onTilesUpdate)

	main.view.events.on('connection_select', onConnectionSelect, null, [main.view, 0])
	main.view2.events.on('connection_select', onConnectionSelect, null, [main.view2, 1])

	main.view.events.on('view_clear', onViewClear)
	main.view2.events.on('view_clear', onViewClear2)

	main.view.events.on('node_select', onNodeSelect)
	main.view.events.on('marker_tap', onMarkerTap)

	onresize()
	// onhashchange()
	bootProgress(1)
	main.timer.play()
}

function loop(t, dt) {
	if(main.animatedConnection) {
		main.view.needsRedraw = true
		main.view.needsRetrace = true
	}

	TWEEN.update()

	main.view.onTick(dt)
	main.view2.onTick(dt)
}
