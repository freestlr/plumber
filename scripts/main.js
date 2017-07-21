var main = {}
main.get = new Loader

main.file = new FileImport

main.imagery = new Imagery

main.sampler = new Sampler
main.sampler.setImagery(main.imagery)
main.sampler.folder = 'samples/'

main.timer = new Timer(loop)
main.view = new View3({
	eroot: document.body,
	enableWireframe: false
})

dom.append(document.body, main.file.input)

main.get.xml('images/atlas.svg').defer
	.then(Atlas.setSource)

main.get.image('images/textures/cubemap.png').defer
	.then(main.imagery.unwrapCubemap3x2, main.imagery)

main.get.image('images/textures/cloth_45.jpg').defer
	.then(function(image) {

		main.imagery.setMaterial('gold', {
			id: 1111,
			color: 0xf7d78a,
			texture: {
				image: main.imagery.pixel.image,
				loaded: true,
				repeatX: 120,
				repeatY: 80
			},
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

		texts: names,
		items: samples
	})

	main.sampleMenu.menu.events.on('add-block', onSubAdd)
	main.sampleMenu.menu.blocks.forEach(onSubAdd)




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

function onSubAdd(block) {
	block.element.setAttribute('draggable', true)
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

	console.log('sample', sample.src)
	traverse(object, describeObject)


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


function describeObject(object, data, level) {
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
	var id = location.hash.slice(1)
	if(id) {
		if(!setSample(id)) {
			location.hash = ''
		}

	} else {
		main.sampleMenu.set(1, true)
	}
}

function onresize() {
	main.view.onResize()
}

function onDragOver(e) {
	e.dataTransfer.dropEffect = 'copy'
	e.preventDefault()
}

function onDrop(e) {
	var file = e.dataTransfer.files[0]
	if(file) main.file.importJSON(file)
	e.preventDefault()
}

function onSampleImport(item) {
	main.sampler.addSample(item)

	var menu = main.sampleMenu.menu
	var block = menu.addItem({
		data: item.id,
		text: item.name
	})

	menu.set(menu.blocks.indexOf(block), true)
}


function run() {
	dom.on('hashchange', window, onhashchange)
	dom.on('resize',  window, onresize)
	dom.on('keydown', window, onkey)
	dom.on('keyup',   window, onkey)

	dom.on('dragover', main.view.element, onDragOver)
	dom.on('drop', main.view.element, onDrop)

	main.sampleMenu.menu.events.on('change', onSubChange)
	main.file.events.on('import', onSampleImport)


	onresize()
	onhashchange()
	main.timer.play()
}

function loop(t, dt) {
	TWEEN.update()

	main.view.onTick(dt)
}
