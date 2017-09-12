
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

}).then(eventmap)


function eventmap() {
	main.events.when({
		'onIssueNodeReplace': onIssueNodeReplace,
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

		var block = sidebar.addSample(sample, sample.id, item.thumb, false)

		block.replacer = item.replacer
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
	sidebar.setMode('connect')
	updateVisibleSamples()
}

function onIssueNodeReplace(node) {
	sidebar.selectedNode = node
	sidebar.setMode('replace')
	updateVisibleSamples()
}

function updateVisibleSamples() {
	var mode = sidebar.modeMenu.activeItem

	switch(mode) {
		case 'connect':
			sidebar.setVisibleSamples(null)
		break

		case 'replace':
			sidebar.setVisibleSamples(getNodeReplacers(sidebar.selectedNode))
		break
	}
}

function getNodeReplacers(node) {
	if(!node) return []

	var connected = node.getConnectedList().map(f.prop('joint'))

	var samples = main.sampler.samples.filter(function(sample) {
		return sample !== node.sample && sample.canReplace(connected)
	})

	return samples.map(f.prop('id'))
}
