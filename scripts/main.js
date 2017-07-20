var main = {}
main.get = new Loader

main.imagery = new Imagery

main.sampler = new Sampler
main.sampler.setImagery(main.imagery)
main.sampler.folder = 'samples/'

main.timer = new Timer(loop)
main.view = new View3({
	eroot: document.body,
	enableWireframe: false
})


main.get.xml('images/atlas.svg').defer
	.then(Atlas.setSource)

main.get.image('images/textures/cubemap.png').defer
	.then(function(image) {
		console.log(image.width, image.height)

		var s = image.height / 2

		var images = []

		for(var y = 0; y < 2; y++)
		for(var x = 0; x < 3; x++) {
			var c = main.imagery.makeCanvas(s, s)
			c.drawImage(image, x * s, y * s, s, s, 0, 0, s, s)
			images.push(c.canvas)
		}

		var skybox = [
			images[2], images[0],
			images[4], images[3],
			images[5], images[1]
		]

		main.imagery.skybox.image = skybox
		main.imagery.skybox.needsUpdate = true
		main.view.needsRedraw = true
	})

main.get.image('images/textures/cloth_45.jpg').defer
	.then(function(image) {

		main.imagery.setMaterial('gold', {
			id: 1111,
			color: 0xf7d78a,
			bump: {
				image: image,
				loaded: true,
				repeatX: 120,
				repeatY: 80
			}
		})
	})

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




	var mat = main.imagery.materials.gold
	if(!mat) return
	var col = mat.specular

	main.gui = new dat.GUI({
		// autoPlace: false,
		hideable: false
	})

	main.gui.closed = true

	var props = {
		number: 3,
		color: '#'+ col.getHexString()
	}
	main.gui.add(props, 'number').name('Number')
	main.gui.addColor(props, 'color').name('Color').onChange(function(color) {
		col.set(color)
		main.view.needsRedraw = true
	})
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
	// if(object.material) console.log(object.material)
	console.log(Array(level +1).join('\t'), object.type,
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
	if(kbd.down && kbd.changed) switch(kbd.key) {
		case 'v':
			main.gui.closed ? main.gui.open() : main.gui.close()
		return
	}
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
