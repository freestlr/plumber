
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
		var sample = main.getSample(item.src, item.link)
		if(sample) {
			var block = sidebar.addSample(sample.src, sample.name, item.thumb, false)

			block.replacer = item.replacer
		}
	}
}

function changeSample(src) {
	if(!src) {
		main.displayFigure(null)
		updateVisibleSamples()

	} else if(main.isComplexFigure(src)) {
		// main.clear()
		updateVisibleSamples()
		main.displayFigure(src)

	} else {
		var mode = sidebar.modeMenu.activeItem
		switch(mode) {
			case 'connect':
				main.displayFigure(src)
			break

			case 'replace':
				if(sidebar.selectedNode) {
					sidebar.sampleMenu.set(-1)
					main.replaceElement(src, sidebar.selectedNode)

				} else {
					main.replaceElement(src, 0)
				}
			break
		}
	}
}

function onImportElement(sample) {
	sidebar.addSample(sample.src, sample.name, sample.thumb, true, true)
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
				node.lit = false
				main.view.updateNodeStencil(node)
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
					node.lit = sidebar.selectedNode ? false : nodeSamples.length
					main.view.updateNodeStencil(node)
				}

				if(node === sidebar.selectedNode) {
					visibleNode = nodeSamples
				}
				visibleAll = f.sor(visibleAll, nodeSamples)
			})

			sidebar.setVisibleSamples(visibleNode || visibleAll)
		break
	}

	if(lit) main.litModeStart()
	else    main.litModeClear()
	main.view.needsRedraw = true
}
