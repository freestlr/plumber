
var get = new Loader

var main = new Plumber({
	eroot: document.body,
	srcAtlas: 'images/atlas.svg',
	srcCubemap: 'images/cubemap.png',
	catchFiles: true
})

var sidebar = new UI.Sidebar({
	eroot: document.body
})


get.json('configs/samples.json').defer.then(function(list) {
	list.forEach(addSample)

}).then(eventmap)


function eventmap() {
	main.events.when({
		'onAddElement': onAddElement,
		'onImportElement': onImportElement
	})

	sidebar.events.when({
		'sample_change': changeSample,
		'sample_remove': main.removeSample,
		'file_import': main.importFile
	}, main)
}

function addSample(item) {
	if(!item || item.hide) return

	if(!main.isComplexFigure(item)) {
		main.addSample(item.id, item.src, item.link)
	}

	sidebar.addSample(item, item.id, item.thumb, false)
}

function changeSample(sample) {
	if(!sample) {
		main.displayFigure(null)

	} else if(main.isComplexFigure(sample)) {
		main.clear()
		main.displayFigure(sample)

	} else {
		main.displayFigure(sample.id)
	}
}

function onImportElement(sample) {
	sidebar.addSample(sample, sample.id, sample.thumb, true)
	sidebar.setSample(sample)
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
