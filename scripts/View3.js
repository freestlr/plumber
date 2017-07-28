function View3(options) {
	for(var name in options) this[name] = options[name]

	this.element   = dom.div('view-3', this.eroot)
	this.events    = new EventEmitter
	this.scene     = new THREE.Scene
	this.ambLight  = new THREE.AmbientLight(0xFFFFFF, 0.2)
	this.dirLight  = new THREE.DirectionalLight(0xFFFFFF, 1.0)
	this.camera    = new THREE.PerspectiveCamera
	this.orbit     = new THREE.OrbitControls(this.camera, this.element)
	this.raycaster = new THREE.Raycaster
	this.root      = new THREE.Object3D
	this.grid      = new THREE.Object3D

	this.scene.autoUpdate = false

	this.mouse  = new THREE.Vector2
	this.mouse2 = new THREE.Vector3
	this.mouse3 = new THREE.Vector3

	this.mouse.set(Infinity, Infinity)


	if(!this.renderer) {
		this.renderer = new THREE.WebGLRenderer({ antialias: true })
		this.renderer.autoClear = false
		this.renderer.clear()

		dom.append(this.element, this.renderer.domElement)
	}


	this.srScene  = new THREE.Scene
	this.srPlane  = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2))
	this.srCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1)
	this.srCamera.updateProjectionMatrix()
	this.srScene.add(this.srPlane)

	this.smFill = new THREE.ShaderMaterial({
		vertexShader: THREE.OverlayShader.vertexShader,
		fragmentShader: THREE.OverlayShader.fillShader,
		uniforms: THREE.UniformsUtils.clone(THREE.OverlayShader.fillUniforms)
	})

	this.srPlane.material = this.smFill


	this.clearButton = dom.div('view-clear hand', this.element)
	Atlas.set(this.clearButton, 'i-cross', 'absmid')
	dom.on('tap', this.clearButton, this.events.will('view_clear'))




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



	this.cameraTween = new TWEEN.Tween(this.camera.position)
		.easing(TWEEN.Easing.Cubic.Out)

	this.orbitTween = new TWEEN.Tween(this.orbit.target)
		.easing(TWEEN.Easing.Cubic.Out)


	this.makeGridSystem()


	this.dirLight.position.set(-100, 100, 100)
	this.dirLight.target.position.set(0, 0, 0)

	this.camera.position.set(1, 1, 1)

	this.treeCenter = new THREE.Vector3
	this.treeSize = 1
	this.focusOnTree(0)


	this.root.add(this.ambLight)
	this.root.add(this.dirLight)
	this.scene.add(this.root)
	this.scene.add(this.grid)
	this.scene.add(this.transform)

	dom.on('tap',       this.element, this)
	dom.on('mousemove', this.element, this)
	dom.on('mouseout',  this.element, this)
}

View3.prototype = {

	enableGrid: false,
	enableRender: true,
	enableWireframe: false,
	enableRaycast: true,
	enableStencil: true,

	clearColor: 0xAAAAAA,
	// hoverColor: 0xFFFE5C,
	// selectColor: 0x26D970,
	hoverColor: '#0096ff',
	selectColor: '#f5f46c',

	focusTheta: 1.0,
	focusDuration: 300,
	focusDistance: 1.5,

	handleEvent: function(e) {
		switch(e.type) {
			case 'mousemove':  return this.onMouseMove(e)
			case 'mouseout':   return this.onMouseOut(e)
			case 'tap':        return this.onTap(e)
		}
	},

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

	orbitTo: function(nextTarget, time, distance, theta) {
		var EPS = 1e-9

		var camera = this.camera.position
		,   target = this.orbit.target

		var nextOffset  = new THREE.Vector3
		,   nextCamera  = new THREE.Vector3
		,   matrixTheta = new THREE.Matrix4

		var distNow = camera.distanceTo(nextTarget)
		,   distMin = this.orbit.minDistance
		,   distMax = this.orbit.maxDistance
		,   distGot = f.clamp(distance || distNow, distMin, distMax)

		nextOffset.subVectors(camera, target).setLength(distGot)


		var thetaNow = Math.acos(nextOffset.y / distGot)
		,   thetaMin = this.orbit.minPolarAngle
		,   thetaMax = this.orbit.maxPolarAngle
		,   thetaGot = f.clamp(theta || thetaNow, thetaMin, thetaMax)

		if(Math.abs(thetaGot - thetaNow) > EPS) {
			var axis = nextCamera
			axis.set(-nextOffset.z, 0, nextOffset.x).normalize()
			matrixTheta.makeRotationAxis(axis, thetaNow - thetaGot)
			nextOffset.applyMatrix4(matrixTheta)
		}

		nextCamera.addVectors(nextTarget, nextOffset)


		this.orbitTween.stop()
		this.cameraTween.stop()

		if(time) {
			if(target.distanceToSquared(nextTarget) > EPS) {
				this.orbitTween.to({
					x: nextTarget.x,
					y: nextTarget.y,
					z: nextTarget.z
				}, time).start()
			}

			if(camera.distanceToSquared(nextCamera) > EPS) {
				this.cameraTween.to({
					x: nextCamera.x,
					y: nextCamera.y,
					z: nextCamera.z
				}, time).start()
			}

		} else {
			camera.copy(nextCamera)
			target.copy(nextTarget)
			this.orbit.update()
		}
	},

	focusOnTree: function(time) {

		if(isNaN(time)) {
			time = this.focusDuration
		}

		if(this.tree) {
			this.tree.updateSize()
		}

		this.orbitTo(this.treeCenter, time, this.treeSize * this.focusDistance, this.focusTheta)
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
			this.root.updateMatrixWorld()
			this.tree.updateSize()

			// this.treeCenter.copy(this.tree.sphere.center)
			// this.treeSize = this.tree.sphere.radius * 2

			this.treeCenter.copy(this.tree.boxCenter)
			this.treeSize = this.tree.boxLength

		} else {
			this.treeCenter.set(0, 0, 0)
			this.treeSize = 100
		}


		this.updateProjection()
		this.updateConnections()

		this.focusOnTree()
		this.needsRedraw = true
	},

	updateConnections: function() {
		this.markers.clear()

		if(!this.tree) return

		this.tree.object.updateMatrixWorld()
		this.tree.traverseConnections(this.addConnectionMarker, this)
	},

	addConnectionMarker: function(con) {
		con.marker = this.markers.addMarker(con.getPosition(), con.data.object.name, con)
	},

	updateProjection: function() {
		this.camera.fov    = 70
		this.camera.aspect = this.width / this.height
		this.camera.far    = this.treeSize * 100
		this.camera.near   = this.treeSize * 0.01
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

				dom.togclass(this.markers.element, 'debug', this.enableWireframe)
				this.markers.update()
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

	updateConnectionType: function(con, types) {
		console.log(con.marker)
	},

	setConnectionTypes: function(types) {
		if(this.tree) this.tree.traverseConnections(this.updateConnectionType, this, types)
	},

	updateMeshStencil: function(mesh, value) {
		if(!mesh.userData.stencilWrite) return

		mesh.stencilValue = value
	},

	updateNodeStencil: function(node) {
		var value = node.selected ? 2
		          : node.hovered  ? 1
		          :                 0

		node.sample.traverse(node.sampleObject, this.updateMeshStencil, this, value)
	},

	selectConnection: function(con) {
		if(!con || con.inactive.value || con.connected) {
			con = null
		}

		var old = this.selectedConnection
		if(old === con) return

		if(old) {
			old.selected = false
			old.marker.updateState()
		}

		this.selectedConnection = con

		if(con) {
			con.selected = true
			con.marker.updateState()
		}

		this.events.emit('connection_select', con)
	},

	selectNode: function(node) {
		var prev = this.nodeSelected
		if(node === prev) return

		if(prev) {
			prev.selected = false
			this.updateNodeStencil(prev)
		}

		this.nodeSelected = node

		if(node) {
			node.selected = true
			this.updateNodeStencil(node)
		}

		this.events.emit('node_select', [node, prev])
		this.needsRedraw = true
	},

	hoverNode: function(node) {
		var prev = this.nodeHovered
		if(node === prev) return

		if(prev) {
			prev.hovered = false
			this.updateNodeStencil(prev)
		}

		this.nodeHovered = node

		if(node) {
			node.hovered = true
			this.updateNodeStencil(node)
		}

		dom.togclass(this.element, 'hand', !!node)
		this.events.emit('node_hover', [node, prev])
		this.needsRedraw = true
	},

	updatePointer: function(point) {
		if(this.fpvEnabled) {
			this.mouse.x = this.width  / 2
			this.mouse.y = this.height / 2

			this.mouse2.x = 0
			this.mouse2.y = 0

		} else {
			if(point) {
				this.mouse.x = point.pageX - this.elementOffset.x
				this.mouse.y = point.pageY - this.elementOffset.y
			}

			this.mouse2.x =  (this.mouse.x / this.width ) * 2 -1
			this.mouse2.y = -(this.mouse.y / this.height) * 2 +1
		}

		this.mouse2.z = -1
	},

	retrace: function() {
		if(!this.enableRaycast || !this.tree) return

		this.projector.viewportToWorld(this.mouse2, this.mouse3, true)
		this.raycaster.setFromCamera(this.mouse2, this.camera)

		var inter = this.raycaster.intersectObject(this.scene, true)
		this.hoverNode(inter.length && inter[0].object.node)
	},

	onMouseMove: function(e) {
		this.updatePointer(e)

		this.needsRetrace = true
	},

	onMouseOut: function(e) {
		this.updatePointer(e)

		this.needsRetrace = true
	},

	onTap: function(e) {
		if(e.target === this.element) {

			if(this.transformConnection) {
				this.transformConnection.detachControl()
				this.transformConnection = null

				this.updateConnections()
				this.needsRedraw = true

			} else {
				this.selectConnection(null)
			}
		}

		this.selectNode(this.nodeHovered)
	},

	onMarkerTap: function(marker) {
		var con = marker.connection

		if(kbd.state.CTRL) {
			this.transformConnection = con
			this.transformConnection.attachControl(this.transform)

			this.markers.removeMarker(con.marker)
			this.needsRedraw = true

		} else {
			this.selectConnection(con)
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
		this.needsRetrace = true
	},

	onTick: function(dt) {
		this.transform.update()

		if(this.orbitTween.playing || this.cameraTween.playing) {
			this.camera.lookAt(this.orbit.target)
			this.needsRedraw = true
		}

		this.camera.updateMatrixWorld()
		if(!this.lastcam.equals(this.camera.matrixWorld)) {
			this.lastcam.copy(this.camera.matrixWorld)

			this.needsRetrace = true
		}

		if(this.needsRetrace) {
			this.needsRetrace = false
			this.needsRedraw = true

			this.projector.updateMatrices()
			this.updateLights()
			this.updateGrid()
			this.retrace()
		}

		if(this.needsRedraw) {
			this.needsRedraw = false

			var vp = this.viewport
			if(vp) {
				this.renderer.setViewport(vp.x, vp.y, vp.w, vp.h)
				this.renderer.setScissor(vp.x, vp.y, vp.w, vp.h)
				this.renderer.setScissorTest(true)
			} else {
				this.renderer.setScissorTest(false)
			}

			this.renderer.setClearColor(this.clearColor)
			this.renderer.clear()

			this.scene.updateMatrixWorld(true)

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

			if(this.enableStencil) {
				var gl = this.renderer.context
				gl.enable(gl.BLEND)
				gl.disable(gl.DEPTH_TEST)
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

				gl.enable(gl.STENCIL_TEST)

				gl.stencilFunc(gl.EQUAL, 1, 0xFF)
				this.smFill.uniforms.color.value.set(this.hoverColor)
				this.renderer.render(this.srScene, this.srCamera)

				gl.stencilFunc(gl.EQUAL, 2, 0xFF)
				this.smFill.uniforms.color.value.set(this.selectColor)
				this.renderer.render(this.srScene, this.srCamera)

				gl.disable(gl.BLEND)
				gl.disable(gl.STENCIL_TEST)
				gl.enable(gl.DEPTH_TEST)
			}

			this.projector.update()
			this.markers.update()
		}
	}
}
