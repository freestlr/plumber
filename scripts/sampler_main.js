var main = {}
main.get = new Loader
main.sampler = new Sampler
main.sampler.folder = 'samples/'

main.timer = new Timer(loop)
main.view = new View3({
	eroot: document.body,
	enableWireframe: true
})


main.imagery = new Imagery

main.get.xml('images/atlas.svg').defer
	.then(Atlas.setSource)

main.get.json('configs/samples.json').defer
	.then(main.sampler.fetch, main.sampler)
	.then(makeMenu)
	.then(run)



function makeMenu() {
	var samples = main.sampler.getList()
	,   names = samples.map(getSampleImage)

	main.sampleMenu = new UI.Submenu({
		ename: 'sample sample-item absmid hand',
		sname: 'submenu',
		cname: 'submenu-item sample-item',
		eroot: document.body,
		distance: 18,
		visibleMethod: dom.visible,
		align: 'bottom',

		icons: names,
		items: samples
	})

	main.sampleMenu.menu.events.on('change', onSubChange, main)
}

function onSubChange(sid) {
	location.hash = sid
}

function getSampleImage(sid) {
	var sample = main.sampler.samples[sid]
	return sample ? sample.name : 'unknown/'+ sid
}

function setSampleImage(element, sid) {
	return Atlas.set(element, UI.getSampleImage(sid))
}

function setSample(sid) {
	var sample = main.sampler.samples[sid]
	if(!sample) return false

	main.sampleMenu.set(0, true)
	UI.setSampleImage(main.sampleMenu.element, sid)

	var object = sample.bake()


	var box = new THREE.Box3
	object.traverse(function(object) {
		if(object.geometry) {

			if(!object.geometry.boundingBox) {
				object.geometry.computeBoundingBox()
			}

			box.union(object.geometry.boundingBox)
		}
	})

	main.view.setTree(object)
	main.view.focusOnTree(300)
	main.sample = object

	return true
}

function onkey(e) {
	main.view.onKey(e)
}

function onhashchange(e) {
	if(!setSample(location.hash.slice(1))) {
		main.sampleMenu.set(1, true)
	}
}

function onresize() {
	main.view.onResize()
}


function run() {
	dom.on('hashchange', window, onhashchange)
	dom.on('resize',  window, onresize)
	dom.on('keydown', window, onkey)
	dom.on('keyup',   window, onkey)


	onresize()
	onhashchange()
	main.timer.play()
}

function loop(t, dt) {
	TWEEN.update()

	main.view.onTick(dt)
}
