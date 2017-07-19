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
		square: false,

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

	var object = sample.clone()


	var box = new THREE.Box3
	// object.traverse(function(object) {
	// })

	console.log('sample', sid)
	traverse(object, function(object, data, level) {
		describeObject(object, level)

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

function traverse(object, callback, scope, data, level) {
	if(!object) return

	if(level == null) level = 0

	callback.call(scope || this, object, data, level)

	if(object.children) for(var i = 0; i < object.children.length; i++) {
	// if(object.children) for(var i = object.children.length -1; i >= 0; i--) {
		this.traverse(object.children[i], callback, scope, data, level +1)
	}
}

function describeObject(object, level) {
	console.log(Array(level +1).join('\t'),
	'name: {'+ object.name + '}',
	(object.material ? 'mat: {'+ object.material.name +'}' : '[no mat]'),

	// 'pos: {',
	// 	'x:', f.mround(object.position.x, 3),
	// 	'y:', f.mround(object.position.y, 3),
	// 	'z:', f.mround(object.position.z, 3),
	// '}',

	// 'rot: {',
	// 	'x:', f.hround(f.xdeg * object.rotation.x),
	// 	'y:', f.hround(f.xdeg * object.rotation.y),
	// 	'z:', f.hround(f.xdeg * object.rotation.z),
	// '}',

	'pos: ['+ [
		f.mround(object.position.x, 3),
		f.mround(object.position.y, 3),
		f.mround(object.position.z, 3),
	].join(', ') +']',

	'rot: ['+ [
		f.hround(f.xdeg * object.rotation.x),
		f.hround(f.xdeg * object.rotation.y),
		f.hround(f.xdeg * object.rotation.z),
	].join(', ') +']')
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
