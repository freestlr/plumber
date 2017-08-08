
var get = new Loader

var main = new Plumber({
	eroot: document.body,
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
		'sample_change': main.displaySample,
		'sample_remove': main.removeSample,
		'file_import': main.importFile
	}, main)
}

function addSample(item) {
	if(!item || item.hide) return

	var sample = main.addSample(item.id, item.src, item.link)

	sidebar.addSample(sample.id, sample.name, sample.thumb, false)
}

function onImportElement(sample) {
	sidebar.addSample(sample.id, sample.name, sample.thumb, true)
	sidebar.setSample(sample.id)
}

function onAddElement(e) {
	console.log('onAddElement', e)

	switch(e.status) {
		case 'connected':
			sidebar.sampleMenu.set(-1)
		break

		case 'canceled':
			sidebar.sampleMenu.set(-1)
		break

		case 'rejected':
		break
	}
}
