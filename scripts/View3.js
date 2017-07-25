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

	this.transform = new THREE.TransformControls(this.camera, this.element)
	this.transform.addEventListener('change', f.binds(this.onTransformControlsChange, this))

	this.projector = new PointProjector(this.camera)

	this.markers = new UI.MarkerSystem({
		eroot: this.element,
		projector: this.projector
	})
	this.markers.events.on('marker_tap', this.onMarkerTap, this)



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


	this.root.add(this.ambLight)
	this.root.add(this.dirLight)
	this.scene.add(this.root)
	this.scene.add(this.grid)
	this.scene.add(this.transform)

	dom.on('tap', this.element, this)
}

View3.prototype = {

	enableGrid: false,
	enableRender: true,
	enableWireframe: false,

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

	handleEvent: function(e) {
		switch(e.type) {
			case 'tap':
				this.onTap(e)
			return
		}
	},

	focusOnTree: function() {
		if(this.tree) {
			this.tree.updateBox()
			this.camera.position.set(1, 1, 1).setLength(this.tree.boxLength * 1.01)
			this.orbit.target.copy(this.tree.boxCenter)

		} else {
			this.camera.position.set(1, 1, 1).setLength(1.01)
			this.orbit.target.set(0, 0, 0)
		}

		this.orbit.update()
	},

	lookAt: function() {

	},

	setTree: function(node) {
		if(this.tree) {
			this.root.remove(this.tree.object)
		}

		this.tree = node

		if(this.tree) {
			this.root.add(this.tree.object)
			this.tree.updateBox()
			this.updateProjection()
		}

		this.updateConnections()
		this.needsRedraw = true
	},

	updateConnections: function() {
		this.markers.clear()

		if(!this.tree) return

		this.tree.object.updateMatrixWorld()
		this.tree.traverseConnections(this.addConnectionMarker, this)
	},

	addConnectionMarker: function(node, con, index) {
		var color = con.connected ? con.master ? 'tomato' : 'yellow' : 'white'

		con.marker = this.markers.addMarker(con.getPosition(), con.data.object.name, color, con)
	},

	updateProjection: function() {
		var size = this.tree ? this.tree.boxLength : 1

		this.camera.fov    = 70
		this.camera.aspect = this.width / this.height
		this.camera.far    = size * 100
		this.camera.near   = size * 0.01
		this.camera.updateProjectionMatrix()

		this.needsRetrace = true
	},

	onTransformControlsChange: function() {
		var con = this.transformConnection
		if(con) {
			con.updateControl()
			this.updateConnections()
			this.markers.removeMarker(con.marker)
		}

		this.needsRedraw = true
	},

	onKey: function(e) {
		if(e.ctrlKey || e.shiftKey || e.altKey) {

		} else if(kbd.down && kbd.changed) switch(kbd.key) {
			case '1': return this.transform.setMode('translate')
			case '2': return this.transform.setMode('rotate')
			case '3': return this.transform.setMode('scale')
			case 'q': return this.transform.setSpace('local')
			case 'w': return this.transform.setSpace('world')

			case 'x':
				this.enableWireframe = !this.enableWireframe
				this.needsRedraw = true
			return

			case 'z':
				this.enableRender = !this.enableRender
				this.needsRedraw = true
			return

			case 'g':
				this.enableGrid = !this.enableGrid
				this.needsRedraw = true
			return
		}
	},


	setViewport: function(viewport) {
		this.viewport = viewport

		this.onResize()
	},

	onTap: function(e) {
		if(this.transformConnection && e.target === this.element) {
			this.transformConnection.detachControl()
			this.transformConnection = null

			this.updateConnections()
			this.needsRedraw = true
		}
	},

	onMarkerTap: function(marker) {

		if(kbd.state.CTRL) {
			var con = marker.data

			this.transformConnection = con
			this.transformConnection.attachControl(this.transform)

			this.markers.removeMarker(con.marker)
			this.needsRedraw = true
		}
	},

	onResize: function() {
		this.width  = this.element.offsetWidth
		this.height = this.element.offsetHeight

		this.elementOffset = dom.offset(this.element)

		this.projector.resize(this.width, this.height)


		if(!this.viewport) {
			this.renderer.setSize(this.width, this.height)
		}
		this.updateProjection()

		this.needsRedraw = true
	},

	onTick: function(dt) {
		this.transform.update()

		this.camera.updateMatrix()
		if(!this.lastcam.equals(this.camera.matrix)) {
			this.lastcam.copy(this.camera.matrix)

			this.needsRetrace = true
		}

		if(this.needsRetrace) {
			this.needsRetrace = false
			this.needsRedraw = true

			this.projector.updateMatrices()

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

			if(this.enableRender) {
				this.grid.visible = false
				this.root.visible = true
				this.renderer.render(this.scene, this.camera)
			}

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

			this.projector.update()
			this.markers.update()
		}
	}
}
