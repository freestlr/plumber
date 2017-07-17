var main = {}
main.get = new Loader
main.sampler = new Sampler
main.sampler.folder = 'samples/'

main.view = new View3D({
	eroot: document.body,
	minDistance: 1e-4,
	minPolarAngle: -Math.PI/2,
	bgcolor: 0xeeeeee
})

// Imagery.prototype.materialOptions.defaults.wireframe = true
main.imagery = new Imagery

main.get.xml('images/atlas.svg').defer.then(Atlas.setSource)
main.get.json('configs/samples.json').defer.then(function(data) {
	main.sampler.fetch(data).then(makeMenu)
})

// makeMenu()
makeRenderer()

function makeRenderer() {
	var background = 0xeeeeee

	main.renderer  = new THREE.WebGLRenderer
	main.element   = main.renderer.domElement

	main.object    = new THREE.Object3D
	main.camera    = new THREE.PerspectiveCamera
	// main.camera    = new THREE.OrthographicCamera
	main.scene     = new THREE.Scene
	main.scene.fog = new THREE.FogExp2(background, 0.6)
	main.orbit     = new THREE.OrbitControls(main.camera, main.element)
	main.fpview    = new THREE.FirstPersonControls(main.camera, main.element)
	main.light     = new THREE.AmbientLight(0xaaaaaa)
	main.direct    = new THREE.DirectionalLight(0xffffff, 0.2)
	main.sunlight  = new THREE.DirectionalLight(0xffffff, 0.5)
	main.raycaster = new THREE.Raycaster

	main.grid      = new THREE.Object3D
	main.gridXZ    = makeGrid()
	main.gridXY    = makeGrid()
	main.gridYZ    = makeGrid()

	main.gridXZ.normal = new THREE.Vector3(0, 1, 0)
	main.gridXY.normal = new THREE.Vector3(0, 0, 1)
	main.gridYZ.normal = new THREE.Vector3(1, 0, 0)

	main.grid.add(main.gridXZ)
	main.grid.add(main.gridXY)
	main.grid.add(main.gridYZ)
	main.object.add(main.light)
	main.object.add(main.direct)
	main.object.add(main.sunlight)
	// main.object.add(main.crosshair)
	main.scene.add(main.grid)
	main.scene.add(main.object)

	main.gridXY.rotation.x = Math.PI/2
	main.gridYZ.rotation.z = Math.PI/2
	main.renderer.autoClear = false
	main.renderer.setClearColor(background)

	var cpos = 1
	main.camera.position.set(cpos, Math.pow(cpos, 4/5), cpos * 5/4)
	main.sunlight.position.set(1000, 600, -1000)
	main.orbit.update()
	updateRay()

	main.fpview.events.on('capture', oncapture, main)
	dom.on('hashchange', window, onhashchange)
	dom.on('keydown', window, onkey)
	dom.on('keyup',   window, onkey)

	// dom.append(document.body, main.element)
}

function makeGrid() {
	var size = 10
	var divisions = 200
	var color1 = new THREE.Color(0x333333)
	var color2 = new THREE.Color(0xBBBBBB)

	var center = divisions / 2;
	var step = ( size * 2 ) / divisions;
	var vertices = [], colors = [];

	for ( var i = -divisions, j = 0, k = - size; i <= divisions; i ++, k += step ) {

		vertices.push( - size, 0, k, size, 0, k );
		vertices.push( k, 0, - size, k, 0, size );

		var color = i % 10 === 0 ? color1 : color2;

		color.toArray( colors, j ); j += 3;
		color.toArray( colors, j ); j += 3;
		color.toArray( colors, j ); j += 3;
		color.toArray( colors, j ); j += 3;
	}

	var geometry = new THREE.BufferGeometry()
	geometry.addAttribute( 'position', new THREE.Float32Attribute( vertices, 3 ) )
	geometry.addAttribute( 'color', new THREE.Float32Attribute( colors, 3 ) )

	var material = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } )
	material.transparent = true

	return new THREE.LineSegments(geometry, material)
}


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

	onhashchange()
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

	main.view.setTree({
		events: new EventEmitter,
		obvBoundingBox: box,
		obvBoundingValid: !box.isEmpty(),
		obvBoundingSize: box.getSize(),
		obvBoundingCenter: box.getCenter(),
		obvMassCenter: box.getCenter(),
		object: object
	})
	main.sample = object
	main.view.focusOnTree(300)
	// main.object.add(main.sample)
	// main.needsRedraw = true
	return true
}

function onkey(e) {
	if(kbd.changed) switch(kbd.key) {
		case 'w':
		case 's':
		case 'a':
		case 'd':
		case 'SHIFT':
		case 'SPACE':
			main.fpview.onKey(e)
		break

		case 'f':
			main.fpview.capture()
		break

		case 'v':
			if(kbd.down) main.sampleMenu.toggle()
		break

		default:
			main.orbit.onKeyDown(e)
		break
	}

	main.view.onkey(e)
}

function onhashchange(e) {
	if(!setSample(location.hash.slice(1))) {
		main.sampleMenu.set(1, true)
	}
}

function onresize() {
	var w = window.innerWidth
	,   h = window.innerHeight

	main.view.autoresize()
	main.renderer.setSize(w, h)

	main.camera.fov    = 80
	main.camera.aspect = w / h
	main.camera.near   = 0.1
	main.camera.far    = 10000

	// main.camera.left   = -w/(1 << 11)
	// main.camera.right  =  w/(1 << 11)
	// main.camera.top    = -h/(1 << 11)
	// main.camera.bottom =  h/(1 << 11)

	main.camera.updateProjectionMatrix()

	main.elementOffset = dom.offset(main.element)
	main.needsRedraw = true
}

function oncapture(capture) {
	main.fpactive = capture
	main.orbit.enabled = !capture
	dom.togclass(main.element, 'first-person', capture)
}

function updateRay() {
	main.raycaster.setFromCamera({ x: 0, y: 0 }, main.camera)

	var direction = main.raycaster.ray.direction

	var projXZ = direction.dot(main.gridXZ.normal)
	,   projXY = direction.dot(main.gridXY.normal)
	,   projYZ = direction.dot(main.gridYZ.normal)

	main.gridXZ.material.opacity = Math.abs(projXZ)
	main.gridXY.material.opacity = Math.abs(projXY)
	main.gridYZ.material.opacity = Math.abs(projYZ)

	// main.gridXZ.position.y = 0.4 * projXZ + main.camera.position.y
	// main.gridXY.position.z = 0.4 * projXY + main.camera.position.z
	// main.gridYZ.position.x = 0.4 * projYZ + main.camera.position.x

	main.direct.target.position.copy(main.orbit.target)
	main.direct.position.copy(main.camera.position)
}

function update(t, dt) {
	main.fpview.update(dt)
	if(main.fpview.changed) {
		main.fpview.changed = false
		main.orbit.changed = true
		main.orbit.target.add(main.fpview.delta)
		main.needsRedraw = true
	}

	if(main.orbit.changed) {
		main.orbit.changed = false
		main.needsRedraw = true
		updateRay()
	}

	if(main.orbit.radius && main.orbit.radius !== main.fpview.speed) {
		main.fpview.speed = main.orbit.radius
		main.fpview.needsUpdateForce = true
	}

	if(main.needsRedraw) {
		main.needsRedraw = false
		main.renderer.clear()

		main.grid.visible = false
		main.object.visible = true
		main.renderer.render(main.scene, main.camera)

		main.grid.visible = true
		main.object.visible = false
		main.renderer.render(main.scene, main.camera)
	}
}

main.frameTime = 0
main.frameLast = 0
main.frameDelta = 0
main.frameCount = 0
function loop() {
	requestAnimationFrame(loop)

	main.frameCount++
	main.frameLast = main.frameTime
	main.frameTime = window.performance.now()
	main.frameDelta = main.frameTime - main.frameLast

	TWEEN.update()

	main.view.update(main.frameTime, main.frameDelta, main.frameCount)
	update(main.frameTime, main.frameDelta, main.frameCount)
}

main.frameTime = window.performance.now()
onresize()
loop()
