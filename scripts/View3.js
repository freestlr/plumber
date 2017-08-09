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

	this.smCopy    = this.makeShader(THREE.CopyShader)
	this.smFill    = this.makeShader(THREE.FillShader)
	this.smOverlay = this.makeShader(THREE.OverlayShader)
	this.smHBlur   = this.makeShader(THREE.HorizontalBlurShader)
	this.smVBlur   = this.makeShader(THREE.VerticalBlurShader)
	this.smFXAA    = this.makeShader(THREE.FXAAShader)

	this.clearButton = dom.div('view-clear out-02 hand', this.element)
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



	this.cameraTween = new TWEEN.Tween({ x: 0, y: 0, z: 0 })
		.easing(TWEEN.Easing.Cubic.Out)

	this.orbitTween = new TWEEN.Tween({ x: 0, y: 0, z: 0 })
		.easing(TWEEN.Easing.Cubic.Out)


	this.makeGridSystem()
	this.makePreloader()


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
	enableFXAA: true,
	enableBloom: true,

	renderTarget: null,

	clearColor: '#FFFFFF',

	focusThetaMin: 0.5,
	focusThetaMax: 2.2,
	focusDistance: 1.0,
	focusDuration: 300,

	stencilNone: {
		value: 0,
		params: {}
	},

	stencilHover: {
		value: 1,
		params: {
			drawColor: '#00FF77',
			drawAlpha: 1.0,
			lineAlpha: 0.0,
			edgeAlpha: 1.0,
			fillAlpha: 0.03
		}
	},

	stencilSelect: {
		value: 2,
		params: {
			drawColor: '#00FF77',
			drawAlpha: 1.0,
			lineAlpha: 0.4,
			edgeAlpha: 0.9,
			fillAlpha: 0.1
		}
	},


	handleEvent: function(e) {
		switch(e.type) {
			case 'mousemove':  return this.onMouseMove(e)
			case 'mouseout':   return this.onMouseOut(e)
			case 'tap':        return this.onTap(e)
		}
	},

	makeShader: function(source) {
		if(source) return new THREE.ShaderMaterial({
			vertexShader: source.vertexShader,
			fragmentShader: source.fragmentShader,
			uniforms: THREE.UniformsUtils.clone(source.uniforms)
		})
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

	makePreloader: function() {
		this.preloaderBox = dom.div('view-preloader-box absmid out-03 hidden', this.element)
		this.preloaderBlocks = []
		for(var i = 0; i < 10; i++) {
			this.preloaderBlocks.push(dom.div('view-preloader-block', this.preloaderBox))
		}
	},

	setLoading: function(enabled) {
		if(this.preloaderEnabled === !!enabled) return
		this.preloaderEnabled = !!enabled

		dom.togclass(this.preloaderBox, 'hidden', !enabled)
	},

	setProgress: function(progress) {
		if(this.preloaderProgress === progress) return
		this.preloaderProgress = progress

		var blox = this.preloaderBlocks.length
		,   prog = f.clamp(progress, 0, 1) * blox
		,   full = Math.floor(prog)
		,   frac = prog - full

		for(var i = 0; i < blox; i++) {
			this.preloaderBlocks[i].style.opacity = i < full ? 1 : i > full ? 0 : frac
		}
	},

	setPreloader: function(sample) {
		if(sample && sample.progress < 1) {
			this.preloaderSample = sample
			this.setLoading(true)
			this.setProgress(sample.progress)

		} else {
			this.preloaderSample = null
			this.setLoading(false)
		}
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

		if(!nextTarget) nextTarget = target

		var nextOffset  = new THREE.Vector3
		,   nextCamera  = new THREE.Vector3
		,   matrixTheta = new THREE.Matrix4

		var distNow = camera.distanceTo(target)
		,   distMay = camera.distanceTo(nextTarget)
		,   distMin = this.orbit.minDistance
		,   distMax = this.orbit.maxDistance
		,   distGot = f.clamp(isNaN(distance) ? distNow : distance, distMin, distMax)

		nextOffset.subVectors(camera, target).setLength(distGot)


		var thetaNow = Math.acos(nextOffset.y / distGot)
		,   thetaMin = Math.max(this.focusThetaMin, this.orbit.minPolarAngle)
		,   thetaMax = Math.min(this.focusThetaMax, this.orbit.maxPolarAngle)
		,   thetaGot = f.clamp(isNaN(theta) ? thetaNow : theta, thetaMin, thetaMax)

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
				this.orbitTween.from(target).to(nextTarget, time).start()
			}

			if(camera.distanceToSquared(nextCamera) > EPS) {
				this.cameraTween.from(camera).to(nextCamera, time).start()
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

		this.updateTreeSize()

		var distance = Math.sqrt(this.treeSize) * 30
		this.orbitTo(this.treeCenter, time, distance)
	},

	focusOnNode: function(node, time) {
		if(isNaN(time)) {
			time = this.focusDuration
		}

		var distance = node.sample.size.y * 4 * this.focusDistance

		this.orbitTo(node.localCenter, time)
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
		}


		this.updateTreeSize()
		this.updateProjection()
		this.updateConnections()

		this.focusOnTree()
		this.needsRedraw = true
	},

	updateTreeSize: function() {
		if(this.tree) {
			this.tree.updateSize()

			this.treeCenter.copy(this.tree.boxCenter)
			this.treeSize = this.tree.boxLength

		} else {
			this.treeCenter.set(0, 0, 0)
			this.treeSize = 100
		}
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
		var value = node.selected ? this.stencilSelect.value
		          : node.hovered  ? this.stencilHover .value
		          :                 this.stencilNone  .value

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
		if(e.target !== this.element) return

		if(this.transformConnection) {
			this.transformConnection.detachControl()
			this.transformConnection = null

			this.updateConnections()
			this.needsRedraw = true

		} else {
			this.selectConnection(null)
		}

		this.selectNode(this.nodeHovered)
	},

	onMarkerTap: function(marker) {
		var con = marker.connection
		if(!con) return

		if(kbd.state.CTRL) {
			this.transformConnection = con
			this.transformConnection.attachControl(this.transform)

			this.markers.removeMarker(con.marker)
			this.needsRedraw = true

		} else {
			this.selectConnection(con)
		}
	},

	resizeRenderTargets: function(w, h) {
		this.rtStencil = new THREE.WebGLRenderTarget(w, h, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat
		})

		this.rt1 = this.rtStencil.clone()
		this.rt2 = this.rtStencil.clone()
	},

	resizeShaders: function(w, h) {
		var rx = 1 / w
		,   ry = 1 / h

		if(this.smOverlay) {
			this.smOverlay.uniforms['resolution'].value.set(rx, ry)
		}

		if(this.smFXAA) {
			this.smFXAA.uniforms['resolution'].value.set(rx, ry)
		}

		if(this.smVBlur) {
			this.smVBlur.uniforms['v'].value = ry
		}

		if(this.smHBlur) {
			this.smHBlur.uniforms['h'].value = rx
		}
	},

	onResize: function() {
		this.width  = this.element.offsetWidth
		this.height = this.element.offsetHeight

		this.elementOffset = dom.offset(this.element)
		this.projector.resize(this.width, this.height)


		if(!this.viewport) {
			this.renderer.setSize(this.width, this.height)
			this.resizeRenderTargets(this.width, this.height)
			this.resizeShaders(this.width, this.height)
		}

		this.updateProjection()
		this.needsRetrace = true
	},

	draw: function() {
		var gl = this.renderer.context
		,   vp = this.viewport

		var renderer = this.renderer
		,   srPlane  = this.srPlane
		,   srScene  = this.srScene
		,   srCamera = this.srCamera

		var wb = this.rt1
		,   rb = this.rt2

		function swap() {
			var tb = rb
			rb = wb
			wb = tb
		}
		function updateViewport() {
			if(vp) {
				renderer.setViewport(vp.x, vp.y, vp.w, vp.h)
				renderer.setScissor(vp.x, vp.y, vp.w, vp.h)
				renderer.setScissorTest(true)
			} else {
				renderer.setScissorTest(false)
			}
		}
		function draw(buffer, scene, camera) {
			if(!scene ) scene  = srScene
			if(!camera) camera = srCamera

			updateViewport()
			renderer.render(scene, camera, buffer)
		}
		function clear(buffer, color, depth, stencil) {
			updateViewport()
			if(buffer) {
				renderer.clearTarget(buffer, color, depth, stencil)
			} else {
				renderer.clear(color, depth, stencil)
			}
		}
		function shader(material, input, uniforms) {
			for(var name in uniforms) {
				var item = material.uniforms[name]
				if(!item) continue

				var data = uniforms[name]
				if(item.value instanceof THREE.Color) {
					item.value.set(data)
				} else {
					item.value = data
				}
			}
			if(input) {
				material.uniforms.tDiffuse.value = input.texture
			}
			srPlane.material = material
		}



		this.renderer.setClearColor(this.clearColor)
		clear(this.renderTarget)


		this.scene.updateMatrixWorld(true)

		if(this.enableRender) {
			this.grid.visible = false
			this.root.visible = true

			this.renderer.render(this.scene, this.camera, this.renderTarget)
			draw(this.renderTarget, this.scene, this.camera)
		}

		if(this.enableGrid) {
			this.grid.visible = true
			this.root.visible = false

			draw(this.renderTarget, this.scene, this.camera)
		}

		if(this.enableWireframe) {
			this.scene.overrideMaterial = this.wireMaterial
			draw(this.renderTarget, this.scene, this.camera)
			this.scene.overrideMaterial = null
		}

		if(this.enableStencil && this.smFill && this.smCopy && this.smOverlay) {
			gl.enable(gl.STENCIL_TEST)
			gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE)


			this.scene.overrideMaterial = this.smFill
			clear(this.rtStencil)
			draw(this.rtStencil, this.scene, this.camera)
			this.scene.overrideMaterial = null



			this.renderer.setClearColor(0, 0)
			clear(rb)
			clear(wb)


			gl.disable(gl.DEPTH_TEST)
			gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP)


			var stencilPasses = [this.stencilHover, this.stencilSelect]
			for(var i = 0; i < stencilPasses.length; i++) {
				var pass = stencilPasses[i]

				gl.stencilFunc(gl.EQUAL, pass.value, 0xFF)
				shader(this.smFill)
				this.renderer.setClearColor(0, 1)
				clear(this.rtStencil, true, true, false)
				draw(this.rtStencil)
				gl.stencilFunc(gl.ALWAYS, 0, 0xFF)

				shader(this.smOverlay, this.rtStencil, pass.params)
				gl.enable(gl.BLEND)
				gl.blendFunc(gl.ONE, gl.ONE)
				draw(wb)
				gl.disable(gl.BLEND)
			}

			if(this.enableFXAA && this.smFXAA) {
				shader(this.smFXAA, wb)
				draw(rb)
				swap()
			}

			if(this.enableBloom && this.smVBlur && this.smHBlur) {
				shader(this.smVBlur, wb)
				draw(rb)

				shader(this.smHBlur, rb)

				gl.enable(gl.BLEND)
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
				draw()
				gl.disable(gl.BLEND)
			}

			gl.enable(gl.BLEND)
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
			shader(this.smCopy, wb)
			draw()



			gl.disable(gl.BLEND)
			gl.disable(gl.STENCIL_TEST)
			gl.enable(gl.DEPTH_TEST)
		}

	},

	onTick: function(dt) {
		if(this.preloaderSample) {
			var p = this.preloaderSample.progress
			this.setProgress(p)
			this.setLoading(p < 1)

			if(p >= 1) delete this.preloaderSample
		}

		this.transform.update()

		if(this.orbitTween.playing) {
			this.orbit.target.x += this.orbitTween.delta.x
			this.orbit.target.y += this.orbitTween.delta.y
			this.orbit.target.z += this.orbitTween.delta.z
		}

		if(this.cameraTween.playing) {
			this.camera.position.x += this.cameraTween.delta.x
			this.camera.position.y += this.cameraTween.delta.y
			this.camera.position.z += this.cameraTween.delta.z
		}

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

			this.draw()
			this.projector.update()
			this.markers.update()
		}
	}
}


THREE.Object3D.prototype.onBeforeRender = function(renderer, scene, camera, geometry, material, group) {
	if(!this.userData.stencilWrite) return

	var gl = renderer.context

	gl.stencilFunc(gl.ALWAYS, +this.stencilValue || 0, 0xff)
}

THREE.Object3D.prototype.onAfterRender = function(renderer, scene, camera, geometry, material, group) {
	if(!this.userData.stencilWrite) return

	var gl = renderer.context
}
