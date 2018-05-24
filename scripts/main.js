
var get = new Loader

var main = new Plumber({
	eroot: document.body,
	srcAtlas: 'images/atlas.svg',
	srcCubemap: 'images/cubemap.png',
	dirSamples: 'samples/',
	initFromHash: true,
	catchFiles: true
})

var sidebar = new UI.Sidebar({
	eroot: document.body
})


get.json('configs/samples.json').then(function(list) {
	list.forEach(addSample)
	sidebar.setVisibleSamples(null)
	main.preloadAllSamples()

}).then(eventmap)


function eventmap() {
	main.events.when({
		'onNodeSelect': onNodeSelect,
		'onAddElement': onAddElement,
		'onReplaceElement': onReplaceElement,
		'onConnectElement': onConnectElement,
		'onImportElement': onImportElement
	})

	sidebar.events.when({
		'mode_change': onModeChange,
		'sample_change': changeSample,
		'sample_remove': main.removeSample,
		'file_import': main.importFile
	}, main)
}

function addSample(item) {
	if(!item || item.hide) return

	if(main.isComplexFigure(item)) {
		sidebar.addSample(item, item.name, item.thumb, false)

	} else {
		var sample = main.sampler.getSample(item.src)

		if(sample) {
			if(item.link) sample.link = item.link

			var block = sidebar.addSample(sample.src, sample.name, item.thumb, false)
			block.replacer = item.replacer
		}
	}
}

function changeSample(src) {
	if(!src) {
		main.splitScreen(false)

	} else if(main.isComplexFigure(src)) {
		// main.clear()
		main.addElement(null, src)

	} else {
		var mode = sidebar.modeMenu.activeItem
		switch(mode) {
			case 'connect':
				main.addElement(null, src)
			break

			case 'replace':
				if(sidebar.selectedNode) {
					sidebar.sampleMenu.set(-1)
					main.replaceElement(src, sidebar.selectedNode)

				} else if(kbd.state.SHIFT) {
					sidebar.sampleMenu.set(-1)
					main.replaceElement(src, -1)

				} else {
					main.replaceElement(src, 0)
				}
			break
		}
	}

	updateVisibleSamples()
}

function onImportElement(sample) {
	if(sample) {
		sidebar.addSample(sample.src, sample.name, sample.thumb, true, true)
	} else {
		console.error('failed to import file')
	}
	// sidebar.setSample(sample)
}

function onAddElement(e) {
	switch(e.status) {
		case 'connected':
			sidebar.sampleMenu.set(-1)
		break

		case 'canceled':
			sidebar.sampleMenu.set(-1)
		break

		case 'rejected':
		break

		case 'error':
			sidebar.sampleMenu.set(-1)
		break
	}

	// console.log('onAddElement', e.status)
}

function onReplaceElement(e) {
	// console.log('onReplaceElement', e.status)
}

function onConnectElement(e) {
	// console.log('onConnectElement', e.status, e.error || e.nodes)
}

function onModeChange(mode) {
	updateVisibleSamples()
}

function onNodeSelect(node) {
	sidebar.sampleMenu.set(-1)
	sidebar.selectedNode = node
	updateVisibleSamples()
}

function updateVisibleSamples() {
	var mode = sidebar.modeMenu.activeItem
	var lit = false

	switch(mode) {
		case 'connect':
			if(main.tree) main.tree.traverse(function(node) {
				main.view.litNode(node, false)
			})
			sidebar.setVisibleSamples(null)
		break

		case 'replace':
			var visibleAll  = []
			,   visibleNode = null

			lit = !sidebar.sampleMenu.activeBlock

			if(main.tree) main.tree.traverse(function(node) {
				var nodeSamples = main.getNodeReplacers(node, main.sampler.samples)

				if(lit) {
					main.view.litNode(node, sidebar.selectedNode ? false : nodeSamples.length)
				}

				if(node.id === sidebar.selectedNode) {
					visibleNode = nodeSamples
				}
				visibleAll = f.sor(visibleAll, nodeSamples)
			})

			sidebar.setVisibleSamples(visibleNode || visibleAll)
		break
	}

	if(lit) main.litModeStart('replace')
	else    main.litModeClear()

	main.view.needsRedraw = true
}
