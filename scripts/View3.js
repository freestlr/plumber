function View3(options) {
	for(var name in options) this[name] = options[name]

	this.element   = dom.div('view-3', this.eroot)
	this.scene     = new THREE.Scene
	this.ambLight  = new THREE.AmbientLight(0xFFFFFF, 0.2)
	this.dirLight  = new THREE.DirectionalLight(0xFFFFFF, 1.0)
	this.camera    = new THREE.PerspectiveCamera
	this.orbit     = new THREE.OrbitControls(this.camera, this.element)
	this.raycaster = new THREE.Raycaster
	this.root      = new THREE.Object3D
	this.grid      = new THREE.Object3D

	this.box       = new THREE.Box3
	this.boxCenter = new THREE.Vector3(0, 0, 0)
	this.boxSize   = new THREE.Vector3(1, 1, 1).normalize()
	this.boxLength = 1

	this.wireMaterial = new THREE.MeshBasicMaterial({ wireframe: true, color: 0 })

	this.lastcam = new THREE.Matrix4

	if(!this.renderer) {
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.autoClear = false
		this.renderer.clear()

		dom.append(this.element, this.renderer.domElement)
	}

	this.camera.position.set(1, 1, 1)
	this.orbit.update()

	this.dirLight.position.set(-100, 100, 100)
	this.dirLight.target.position.set(0, 0, 0)

	this.makeGridSystem()


	// this.tiles = new TileView
	// // this.tiles.setLayout(['v', ['h', 0, 0, 0.7], 0, 0.8])
	// this.tiles.setLayout(['h', 0, 0, 0.9])

	// this.splitV = this.tiles.splits[0]
	// this.frameL = this.tiles.frames[0]
	// this.frameR = this.tiles.frames[1]
	// this.tiles.showClients()
	// this.tiles.setClients([{
	// 	element: this.view.element,
	// 	resize: f.binds(this.view.onResize, this.view)
	// }])
	// this.tiles.events.on('update', this.onTilesUpdate, this)


	this.root.add(this.ambLight)
	this.root.add(this.dirLight)
	this.scene.add(this.root)
	this.scene.add(this.grid)

	// dom.append(this.element, this.tiles.element)
}

View3.prototype = {

	enableGrid: false,
	clearColor: 0xAAAAAA,

	makeGrid: function() {
		var size = 10
		,   divisions = 200

		var color1 = new THREE.Color(0x333333)
		,   color2 = new THREE.Color(0xBBBBBB)

		var center = divisions / 2
		,   step = (size * 2) / divisions
		,   vertices = []
		,   colors   = []

		for(var i = -divisions, j = 0, k = -size; i <= divisions; i++, k += step) {

			vertices.push(-size, 0, k, size, 0, k)
			vertices.push(k, 0, -size, k, 0, size)

			var color = i % 10 === 0 ? color1 : color2

			color.toArray( colors, j ); j += 3
			color.toArray( colors, j ); j += 3
			color.toArray( colors, j ); j += 3
			color.toArray( colors, j ); j += 3
		}

		var geometry = new THREE.BufferGeometry()
		geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
		geometry.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

		var material = new THREE.LineBasicMaterial({ vertexColors: THREE.VertexColors })
		material.transparent = true

		return new THREE.LineSegments(geometry, material)
	},

	makeGridSystem: function() {
		this.gridXZ = this.makeGrid()
		this.gridXY = this.makeGrid()
		this.gridYZ = this.makeGrid()

		this.gridXZ.normal = new THREE.Vector3(0, 1, 0)
		this.gridXY.normal = new THREE.Vector3(0, 0, 1)
		this.gridYZ.normal = new THREE.Vector3(1, 0, 0)

		this.grid.add(this.gridXZ)
		this.grid.add(this.gridXY)
		this.grid.add(this.gridYZ)

		this.gridXY.rotation.x = Math.PI/2
		this.gridYZ.rotation.z = Math.PI/2
	},

	updateLights: function() {
		this.dirLight.position.copy(this.camera.position)
	},

	updateGrid: function() {
		if(!this.enableGrid) return

		this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera)

		var direction = this.raycaster.ray.direction

		var projXZ = direction.dot(this.gridXZ.normal)
		,   projXY = direction.dot(this.gridXY.normal)
		,   projYZ = direction.dot(this.gridYZ.normal)

		this.gridXZ.material.opacity = Math.abs(projXZ)
		this.gridXY.material.opacity = Math.abs(projXY)
		this.gridYZ.material.opacity = Math.abs(projYZ)

		// this.gridXZ.position.y = 0.4 * projXZ + this.camera.position.y
		// this.gridXY.position.z = 0.4 * projXY + this.camera.position.z
		// this.gridYZ.position.x = 0.4 * projYZ + this.camera.position.x
	},

	traverse: function(object, func, scope, data) {
		if(object) {
			func.call(scope, object, data)

			if(object.children) for(var i = object.children.length -1; i >= 0; i--) {
				this.traverse(object.children[i], func, scope, data)
			}
		}
	},

	boxUnion: function(object, box) {
		if(!object.geometry) return

		if(!object.geometry.boundingBox) {
			object.geometry.computeBoundingBox()
		}

		box.union(object.geometry.boundingBox)
	},

	computeSize: function() {
		this.box.makeEmpty()
		this.traverse(this.tree, this.boxUnion, this, this.box)

		if(this.box.isEmpty()) {
			this.boxCenter.set(0, 0, 0)
			this.boxSize.set(1, 1, 1).normalize()
			this.boxLength = 1

		} else {
			this.box.getCenter(this.boxCenter)
			this.box.getSize(this.boxSize)
			this.boxLength = this.boxSize.length()
		}
	},

	focusOnTree: function() {
		this.camera.position.set(1, 1, 1).setLength(this.boxLength * 1.5)
		this.orbit.target.copy(this.boxCenter)
		this.orbit.update()
	},

	lookAt: function() {

	},

	setTree: function(tree) {
		if(this.tree) {
			this.root.remove(this.tree)
		}

		this.tree = tree

		if(this.tree) {
			this.root.add(this.tree)
			this.computeSize()
			this.updateProjection()
		}

		this.needsRedraw = true
	},

	updateProjection: function() {
		this.camera.fov    = 70
		this.camera.aspect = this.width / this.height
		// this.camera.aspect = this.frameL.w / this.frameL.h
		this.camera.far    = this.boxLength * 100
		this.camera.near   = this.boxLength * 0.01
		this.camera.updateProjectionMatrix()
	},

	onKey: function(e) {
		if(kbd.down && kbd.changed) switch(kbd.key) {
			case 'x':
				this.enableWireframe = !this.enableWireframe
				this.needsRedraw = true
			break

			case 'g':
				this.enableGrid = !this.enableGrid
				this.needsRedraw = true
			break
		}
	},

	// onTilesUpdate: function() {
	// 	this.updateProjection()

	// 	this.needsRedraw = true
	// },

	setViewport: function(viewport) {
		this.viewport = viewport

		this.onResize()
	},

	onResize: function() {
		this.width  = this.element.offsetWidth
		this.height = this.element.offsetHeight

		this.elementOffset = dom.offset(this.element)

		// this.tiles.autoresize()

		if(!this.viewport) {
			this.renderer.setSize(this.width, this.height)
		}
		this.updateProjection()

		this.needsRedraw = true
	},

	onTick: function(dt) {

		this.camera.updateMatrix()
		if(!this.lastcam.equals(this.camera.matrix)) {
			this.lastcam.copy(this.camera.matrix)

			this.needsRetrace = true
		}

		if(this.needsRetrace) {
			this.needsRetrace = false
			this.needsRedraw = true

			this.updateLights()
			this.updateGrid()
		}

		if(this.needsRedraw) {
			this.needsRedraw = false

			if(this.viewport) {
				var f = this.viewport
				this.renderer.setViewport(f.x, f.y, f.w, f.h)
				this.renderer.setScissor(f.x, f.y, f.w, f.h)
				this.renderer.setScissorTest(true)
			}

			this.renderer.setClearColor(this.clearColor)
			this.renderer.clear()

			this.grid.visible = false
			this.root.visible = true
			this.renderer.render(this.scene, this.camera)

			if(this.enableGrid) {
				this.grid.visible = true
				this.root.visible = false
				this.renderer.render(this.scene, this.camera)
			}

			if(this.enableWireframe) {
				this.scene.overrideMaterial = this.wireMaterial
				this.renderer.render(this.scene, this.camera)
				this.scene.overrideMaterial = null
			}
		}
	}
}
