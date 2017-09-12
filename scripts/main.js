
var get = new Loader

var main = new Plumber({
	eroot: document.body,
	srcAtlas: 'images/atlas.svg',
	srcCubemap: 'images/cubemap.png',
	dirSamples: 'samples/',
	catchFiles: true
})

var sidebar = new UI.Sidebar({
	eroot: document.body
})


get.json('configs/samples.json').defer.then(function(list) {
	list.forEach(addSample)
	sidebar.setVisibleSamples(null)
	main.preloadAllSamples()

}).then(eventmap)


function eventmap() {
	main.events.when({
		'onNodeSelect': onNodeSelect,
		'onAddElement': onAddElement,
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
		sidebar.addSample(item, item.id, item.thumb, false)

	} else {
		var sample = main.addSample(item.id || item.src, item.src, item.link)
		if(sample) {
			var block = sidebar.addSample(sample, sample.id, item.thumb, false)

			block.replacer = item.replacer
		}
	}
}

function changeSample(sample) {
	if(!sample) {
		main.displayFigure(null)

	} else if(main.isComplexFigure(sample)) {
		main.clear()
		main.displayFigure(sample)

	} else {
		var mode = sidebar.modeMenu.activeItem
		switch(mode) {
			case 'connect':
				main.displayFigure(sample.id)
			break

			case 'replace':
				main.replaceElement(sidebar.selectedNode, sample.src)
				sidebar.sampleMenu.set(-1)
			break
		}
	}
}

function onImportElement(sample) {
	sidebar.addSample(sample, sample.id, sample.thumb, true, true)
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
}

function onModeChange(mode) {
	updateVisibleSamples()
}

function onNodeSelect(node) {
	sidebar.selectedNode = node
	// if(!node || !node.lit) sidebar.setMode('connect')
	updateVisibleSamples()
}

function updateVisibleSamples() {
	var mode = sidebar.modeMenu.activeItem

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

			if(main.tree) main.tree.traverse(function(node) {
				var nodeSamples = getNodeReplacers(node)
				node.lit = nodeSamples.length
				main.view.updateNodeStencil(node)

				if(node === sidebar.selectedNode) visibleNode = nodeSamples
				visibleAll = f.sor(visibleAll, nodeSamples)
			})

			sidebar.setVisibleSamples(visibleNode || visibleAll)
		break
	}

	main.view.needsRedraw = true
}

function getNodeReplacers(node) {
	if(!node) return []

	var connected = node.getConnectedList().map(f.prop('joint'))

	var samples = main.sampler.samples.filter(function(sample) {
		return sample !== node.sample && sample.canReplace(connected)
	})

	return samples.map(f.prop('id'))
}
