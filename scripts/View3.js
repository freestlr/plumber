View3 = f.unit({
	unitName: 'View3',
	ename: 'view-3',


	enableGrid: false,
	enableRender: true,
	enableWireframe: false,
	enableRaycast: true,
	enableStencil: true,
	enableStencilAA: false,
	enableStencilBloom: true,
	enableSSAO: true,
	enableOnlyAO: false,
	enableAAAO: false,
	enableBlurAO: true,
	enableBloomAO: true,

	debugDepth: false,

	// enableWarningPulse: false,
	// enableSelectMarker: true,
	// enableSelectNode: true,
	// enableFocusMarker: false,


	renderTarget: null,

	clearColor: '#f4f4f4',

	focusThetaMin: 0.5,
	focusThetaMax: 2.2,
	focusDistance: 1.0,
	focusDuration: 500,

	directAngle: 0.28,
	directK: -0.5,
	directLift: 0.5,

	stencilRaycastMask: ~0,

	stencilNone: {
		value: 1,
		params: {
			drawAlpha: 0,
		}
	},

	stencilLit: {
		value: 2,
		params: {
			drawColor: '#00f0ff',
			drawAlpha: 1,
			lineAlpha: 0.11,
			lineAngle: 0,
			edgeAlpha: 0.8,
			fillAlpha: 0.2
		}
	},

	stencilHover: {
		value: 4,
		params: {
			drawColor: '#00ffb3',
			drawAlpha: 1,
			lineAlpha: 0.2,
			lineAngle: 0,
			edgeAlpha: 0.8,
			fillAlpha: 0.11
		}
	},

	stencilSelect: {
		value: 8,
		params: {
			drawColor: '#00FF77',
			drawAlpha: 1,
			lineAlpha: 0.4,
			lineAngle: 0,
			edgeAlpha: 0.9,
			fillAlpha: 0.2
		}
	},


	init: function(options) {
		for(var name in options) this[name] = options[name]

		this.element   = dom.div('view-3', this.eroot)
		this.events    = new EventEmitter
		this.scene     = new THREE.Scene
		this.ambLight  = new THREE.AmbientLight(0xFFFFFF, 0.7)
		this.dirLight  = new THREE.DirectionalLight(0xFFFFFF, 0.5)
		this.camera    = new THREE.PerspectiveCamera(30)
		this.orbit     = new THREE.OrbitControls(this.camera, this.element)
		this.raycaster = new THREE.Raycaster
		this.root      = new THREE.Object3D
		this.grid      = new THREE.Object3D
		this.lastcam   = new THREE.Matrix4

		this.highlightedNodes = []
		this.animatedConnections = []

		this.scene.autoUpdate = false

		this.mouse  = new THREE.Vector2(Infinity, Infinity)
		this.mouse2 = new THREE.Vector3
		this.mouse3 = new THREE.Vector3
		this.updatePointer()


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
		this.smACAA    = this.makeShader(THREE.ACAAShader)
		this.smSSAO    = this.makeShader(THREE.SSAOShader)
		this.smDepth   = this.makeShader(THREE.DepthShader)
		// this.smDepth   = new THREE.MeshDepthMaterial
		// this.smDepth.depthPacking = THREE.RGBADepthPacking


		this.clearButton = dom.div('view-clear out-02 hand', this.element)
		Atlas.set(this.clearButton, 'i-cross', 'absmid')
		new EventHandler(this.events.will('view_clear')).listen('tap', this.clearButton)




		this.transform = new THREE.TransformControls(this.camera, this.element)
		this.transform.addEventListener('change', f.binds(this.onTransformControlsChange, this))

		this.projector = new PointProjector(this.camera)

		this.markers = new UI.MarkerSystem({
			eroot: this.element,
			projector: this.projector
		})
		this.markers.events.when({
			'marker_enter': this.onMarkerEnter,
			'marker_leave': this.onMarkerLeave,
			'marker_tap': this.onMarkerTap
		}, this)

		this.markers.markersVisible.events.on('change', function(value) {
			this.needsRedraw = true
		}, this)



		this.wireMaterial = new THREE.MeshBasicMaterial({ wireframe: true, color: 0 })


		this.cameraTween = new TWEEN.Tween({ x: 0, y: 0, z: 0 })
			.easing(TWEEN.Easing.Cubic.Out)

		this.orbitTween = new TWEEN.Tween({ x: 0, y: 0, z: 0 })
			.easing(TWEEN.Easing.Cubic.Out)


		this.makeGridSystem()
		this.makePreloader()


		this.dirLight.position.set(-100, 100, 100)
		this.dirLight.target.position.set(0, 0, 0)

		this.camera.position.set(1, 1, 1)

		this.explodeDim  = this.makeDimensions()
		this.assembleDim = this.makeDimensions()
		this.currentDim  = this.makeDimensions()

		this.focusOnTree(0)


		this.root.add(this.ambLight)
		this.root.add(this.dirLight)
		this.scene.add(this.root)
		this.scene.add(this.grid)
		this.scene.add(this.transform)

		new EventHandler(this.onMouseMove, this).listen('mousemove', this.element)
		new EventHandler(this.onMouseOut,  this).listen('mouseout',  this.element)
		new EventHandler(this.onTap,       this).listen('tap',       this.element)
	},


	makeDimensions: function() {
		return {
			box: new THREE.Box3,
			sphere: new THREE.Sphere,
			center: new THREE.Vector3,
			size: new THREE.Vector3,
			mass: 0,
			length: 1
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

		var step = (size * 2) / divisions
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

	setPreloader: function(samples) {
		this.preloaderSamples = samples
		this.updatePreloader()
	},

	updatePreloader: function() {
		var progress = 1

		var items = this.preloaderSamples && this.preloaderSamples.length
		if(items) {

			progress = 0
			for(var i = 0; i < items; i++) {
				progress += this.preloaderSamples[i].progress
			}

			progress /= items
		}

		this.setProgress(progress)
		this.setLoading(progress < 1)

		if(progress >= 1) {
			delete this.preloaderSamples
		}
	},

	updateLights: function() {
		var p = this.dirLight.position

		p.subVectors(this.camera.position, this.orbit.target)

		var a = Math.atan2(p.z, p.x)
		,   l = p.length()

		p.x = Math.cos(a - this.directAngle * Math.PI)
		p.z = Math.sin(a - this.directAngle * Math.PI)
		p.y = p.y / l * this.directK + this.directLift

		this.dirLight.updateMatrixWorld()
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
		,   distMin = this.orbit.minDistance
		,   distMax = this.orbit.maxDistance
		,   distGot = f.clamp(isNaN(distance) ? distNow : distance, distMin, distMax)

		nextOffset.subVectors(camera, target)
		if(!nextOffset.lengthSq()) {
			nextOffset.set(1, 1, 1)
		}
		nextOffset.setLength(distGot)


		var thetaNow = Math.acos(nextOffset.y / distGot)
		,   thetaMin = Math.max(this.focusThetaMin, this.orbit.minPolarAngle)
		,   thetaMax = Math.min(this.focusThetaMax, this.orbit.maxPolarAngle)
		,   thetaGot = f.clamp(isNaN(theta) ? thetaNow : theta, thetaMin, thetaMax)

		if(this.orbit.orthoMode) {
			thetaGot = thetaNow
		}

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

	zoom: function(scale, time) {
		this.orbit.dollyIn(scale)
		this.orbit.update()
		this.needsRedraw = true
	},

	focusOnTree: function(time, dim) {
		// return this.focusOnNode(null, time)

		if(time == null) {
			time = this.focusDuration
		}

		if(dim == null) {
			dim = this.currentDim
		}

		var distance = this.getFitDistance(dim.size, 1.5, 1.5)

		this.orbitTo(dim.center, time, distance)
	},

	focusOnNode: function(node, time) {
		if(isNaN(time)) {
			time = this.focusDuration
		}

		this.orbitTo(node.localCenter, time)
	},

	getFitDistance: function(size, factorX, factorY) {
		if(size    == null) size = this.currentDim.size
		if(factorX == null) factorX = 1.5
		if(factorY == null) factorY = 1.5

		var fov = this.camera.fov * f.xrad / 2
		,   asp = this.camera.aspect

		var half = Math.max(size.x, size.y, size.z) / 2
		,   fitH = half * (factorX || 1) / Math.tan(fov * asp)
		,   fitV = half * (factorY || 1) / Math.tan(fov)

		return asp ? Math.max(fitH, fitV) : fitV
	},


	lookAt: function() {

	},

	setTree: function(node) {
		this.selectNode(null)
		this.hoverNode(null)

		if(this.tree) {
			this.root.remove(this.tree.object)

			this.tree.events.off(null, null, this)
		}

		this.tree = node

		if(this.tree) {
			this.root.add(this.tree.object)

			this.tree.traverse(this.updateNodeStencil, this)
			this.tree.events.on('connect_start', this.onConnectStart, this)
		}

		this.animatedConnections.forEach(this.onConnectEnd, this)

		this.updateTreeSize(this.explodeDim, true, 0)
		this.updateTreeSize(this.assembleDim, true, 1)
		this.updateTreeSize(this.currentDim, true)
		this.updateProjection()
		this.updateConnectionTree()

		this.focusOnTree()
		this.needsRetrace = true
		this.needsRedraw = true
	},

	onConnectStart: function(con) {
		var index = this.animatedConnections.indexOf(con)
		if(index === -1) {
			this.animatedConnections.push(con)
			con.events.on('connect_end', this.onConnectEnd, this)
		}
	},

	onConnectEnd: function(con) {
		var index = this.animatedConnections.indexOf(con)
		if(index !== -1) {
			con.events.off(null, null, this)

			this.animatedConnections.splice(index, 1)
		}
	},

	updateTreeSize: function(cont, forceState, state) {
		cont.box.makeEmpty()
		cont.center.set(0, 0, 0)
		cont.mass = 0

		if(this.tree) {
			if(forceState) this.tree.traverseConnections(function(con) {
				if(!con.connected || !con.master) return

				con.transitionProgress(state == null ? con.tween.source.connected : state)
			}, this)

			this.scene.updateMatrixWorld(true)

			this.tree.traverse(function(node) {
				node.updateBox()
				cont.box.union(node.localBox)

				var s = node.sample.boxLength
				cont.center.x += s * node.localCenter.x
				cont.center.y += s * node.localCenter.y
				cont.center.z += s * node.localCenter.z

				cont.mass += s
			}, this)

			if(Math.abs(cont.mass) > 1e-6) {
				cont.center.multiplyScalar(1 / cont.mass)
			} else {
				cont.center.set(0, 0, 0)
			}

			cont.box.getSize(cont.size)

		} else {
			cont.size.set(1, 1, 1).normalize()
		}

		cont.length = cont.size.length()
		cont.box.getBoundingSphere(cont.sphere)
	},

	updateConnectionTree: function() {
		var remove = this.markers.markers.slice()

		if(this.tree) {
			this.tree.traverseConnections(this.updateConnection, this, remove)
		}

		for(var i = 0; i < remove.length; i++) {
			this.markers.removeMarker(remove[i])
		}
	},

	updateConnection: function(con, remove) {
		if(con.marker) {
			this.markers.addMarker(con.marker)

			var index = remove.indexOf(con.marker)
			if(index !== -1) remove.splice(index, 1)
		}

		if(con.animating) {
			this.onConnectStart(con)
		}
	},

	updateProjection: function() {
		var v1 = new THREE.Vector3
		,   v2 = new THREE.Vector3

		return function() {
			this.camera.aspect = this.width / this.height

			if(!isFinite(this.camera.aspect)) {
				this.camera.aspect = 1
			}

			v1.subVectors(this.orbit.target, this.camera.position)
			v2.subVectors(this.currentDim.sphere.center, this.camera.position)

			var distance = v2.dot(v1.normalize())
			,   radius = this.currentDim.sphere.radius

			this.camera.near = Math.max(distance - radius, 1)
			this.camera.far  = Math.max(distance + radius, 100)
			this.camera.updateProjectionMatrix()

			if(this.smSSAO) {
				this.smSSAO.uniforms.cameraNear.value = this.camera.near
				this.smSSAO.uniforms.cameraFar.value = this.camera.far
			}

			this.projector.updateMatrices()
		}
	}(),

	onTransformControlsChange: function() {
		var con = this.transformConnection
		if(con) {
			con.updateControl()
			this.updateConnectionTree()
			// this.markers.removeMarker(con.marker)
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
				this.debug = !this.debug
				this.enableWireframe = this.debug
				this.needsRedraw = true

				dom.togclass(this.markers.element, 'debug', this.debug)
				this.markers.debug = this.debug
				this.markers.update(true)
			return

			case 's':
				this.verbose = !this.verbose
				this.markers.verbose = this.verbose
				this.markers.update(true)
			return

			case 'z':
				this.enableRender = !this.enableRender
				this.needsRedraw = true
			return

			case 'c':
				this.focusOnTree()
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
		mesh.stencilValue = value
	},

	updateNodeStencil: function(node) {
		var value = node.selected ? this.stencilSelect.value
		          : node.hovered  ? this.stencilHover .value
		          : node.lit      ? this.stencilLit   .value
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
			this.selectNode(null)
		}

		this.selectedConnection = con

		if(con) {
			con.selected = true
			con.marker.updateState()
			this.selectNode(con.node)
		}

		this.events.emit('connection_select', con)
	},

	selectNode: function(node) {
		var prev = this.nodeSelected
		if(node === prev) return

		if(prev) {
			prev.selected = false
			// prev.debugBox.visible = false
			this.updateNodeStencil(prev)
		}

		this.nodeSelected = node

		if(node) {
			node.selected = true
			// node.debugBox.visible = true
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

	litNode: function(node, lit) {
		if(!node) return

		node.lit = lit

		var index = this.highlightedNodes.indexOf(node)
		if(lit) {
			if(index === -1) this.highlightedNodes.push(node)

		} else {
			if(index !== -1) this.highlightedNodes.splice(index, 1)
		}

		this.updateNodeStencil(node)
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
		this.projector.viewportToWorld(this.mouse2, this.mouse3, true)
		this.raycaster.setFromCamera(this.mouse2, this.camera)

		var inter = this.raycaster.intersectObject(this.scene, true)
		for(var i = 0; i < inter.length; i++) {
			var object = inter[i].object

			if(object.stencilValue & this.stencilRaycastMask) {
				this.hoverNode(object.node)
				return
			}
		}

		this.hoverNode(null)
	},

	onMouseMove: function(e) {
		this.updatePointer(e)

		this.needsRetrace = true
	},

	onMouseOut: function(e) {
		this.mouse.x = Infinity
		this.mouse.y = Infinity
		this.updatePointer()

		this.needsRetrace = true
	},

	onTap: function(e) {
		if(e.target !== this.element) return

		if(this.transformConnection) {
			this.transformConnection.detachControl()
			this.transformConnection = null

			this.updateConnectionTree()
			this.needsRedraw = true

		} else {
			this.selectConnection(null)
		}

		this.selectNode(this.nodeHovered)
	},

	onMarkerEnter: function(marker) {
		this.hoverNode(marker && marker.connection && marker.connection.node || null)
	},

	onMarkerLeave: function(marker) {
		this.hoverNode(null)
	},

	onMarkerTap: function(marker) {
		var con = marker && marker.connection
		if(!con) return

		if(kbd.state.CTRL) {
			this.transformConnection = con
			this.transformConnection.attachControl(this.transform)

			// this.markers.removeMarker(con.marker)
			// delete con.marker

			this.needsRedraw = true

		} else {
			this.selectConnection(con)
		}
	},

	resizeRenderTargets: function(w, h) {
		this.fullW = w
		this.fullH = h

		this.halfW = this.fullW >> 1
		this.halfH = this.fullH >> 1

		this.rtDepthStencil = new THREE.WebGLRenderTarget(this.fullW, this.fullH, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat
		})

		this.rt1 = new THREE.WebGLRenderTarget(this.halfW, this.halfH, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat
		})
		this.rt2 = this.rt1.clone()


		this.rtB1 = new THREE.WebGLRenderTarget(this.fullW, this.fullH, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat
		})
		this.rtB2 = this.rtB1.clone()
	},

	onResize: function() {
		this.width  = this.element.offsetWidth  || 1
		this.height = this.element.offsetHeight || 1

		this.elementOffset = dom.offset(this.element)
		this.projector.resize(this.width, this.height)


		if(!this.viewport) {
			this.renderer.setSize(this.width, this.height)
			this.resizeRenderTargets(this.width, this.height)
		}

		this.updateProjection()

		this.needsRetrace = true
		this.needsRedraw = true
	},

	draw: function() {
		var gl = this.renderer.context
		,   vp = this.viewport

		var renderer = this.renderer
		,   srPlane  = this.srPlane
		,   srScene  = this.srScene
		,   srCamera = this.srCamera


		var wb, rb
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



		this.renderer.setClearColor(this.clearColor, 1)
		clear(this.renderTarget)


		gl.enable(gl.DEPTH_TEST)

		if(this.enableRender) {
			this.grid.visible = false
			this.root.visible = true

			this.renderer.stencilWrite = false
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

		if((this.enableSSAO || this.enableStencil) && this.smDepth) {
			var target = this.debugDepth ? this.renderTarget : this.rtDepthStencil

			gl.enable(gl.STENCIL_TEST)
			gl.stencilMask(0xFF)
			gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE)
			this.renderer.stencilWrite = true
			this.scene.overrideMaterial = this.smDepth

			// this.renderer.setClearColor(0xFFFFFF, 1)
			this.renderer.setClearColor(0, 1)
			clear(target)
			draw(target, this.scene, this.camera)

			this.scene.overrideMaterial = null
			this.renderer.stencilWrite = false
			gl.disable(gl.STENCIL_TEST)

			if(this.debugDepth) return
		}


		gl.disable(gl.DEPTH_TEST)


		wb = this.rt1
		rb = this.rt2
		if(this.enableSSAO && this.smSSAO && !this.debugStencil) {

			if(this.enableOnlyAO) {
				shader(this.smFill, null, { color: 0xFFFFFF })
				draw(this.renderTarget)
			}

			clear(rb)
			shader(this.smSSAO, null, {
				tDepth: this.rtDepthStencil.texture
			})
			draw(rb)


			if(this.enableAAAO && this.smACAA) {
				shader(this.smACAA, rb, {
					width: this.halfW,
					height: this.halfH
				})
				draw(wb)
				swap()
			}

			if(this.enableBlurAO && this.smVBlur && this.smHBlur) {
				shader(this.smVBlur, rb, { height: this.halfH })
				draw(wb)

				shader(this.smHBlur, wb, { width: this.halfW })

				gl.enable(gl.BLEND)
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

				if(this.enableBloomAO) {
					draw(this.renderTarget)
				} else {
					draw(rb)
				}
				gl.disable(gl.BLEND)
			}

			gl.enable(gl.BLEND)
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
			shader(this.smCopy, rb)
			draw(this.renderTarget)

			gl.disable(gl.BLEND)
		}

		wb = this.rtB1
		rb = this.rtB2
		if(this.enableStencil && this.smOverlay) {

			var stencilPasses = []
			if(this.highlightedNodes.length) {
				stencilPasses.push(this.stencilLit)
			}
			if(this.nodeHovered) {
				stencilPasses.push(this.stencilHover)
			}
			if(this.nodeSelected) {
				stencilPasses.push(this.stencilSelect)
			}

			if(!stencilPasses.length) return



			this.renderer.setClearColor(0, 0)
			clear(rb)
			clear(wb)
			clear(this.rtDepthStencil, true, true, false)

			gl.enable(gl.STENCIL_TEST)
			gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP)
			for(var i = 0; i < stencilPasses.length; i++) {
				var pass = stencilPasses[i]

				gl.stencilFunc(gl.EQUAL, pass.value, 0xFF)
				shader(this.smFill, null, {
					color: pass.params.drawColor,
					alpha: pass.params.drawAlpha
				})
				draw(this.rtDepthStencil)
			}
			gl.disable(gl.STENCIL_TEST)


			shader(this.smOverlay, this.rtDepthStencil, {
				width: this.fullW,
				height: this.fullH
			})
			draw(rb)


			if(this.enableStencilAA && this.smACAA) {
				shader(this.smACAA, rb, {
					width: this.fullW,
					height: this.fullH
				})
				draw(wb)
				swap()
			}

			if(this.enableStencilBloom && this.smVBlur && this.smHBlur) {
				shader(this.smVBlur, rb, { height: this.fullH })
				draw(wb)

				gl.enable(gl.BLEND)
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
				shader(this.smHBlur, wb, { width: this.fullW })
				draw(this.renderTarget)
				gl.disable(gl.BLEND)
			}

			gl.enable(gl.BLEND)
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
			shader(this.smCopy, rb)
			draw(this.renderTarget)

			gl.disable(gl.BLEND)
		}
	},

	onTick: function(dt) {
		if(this.preloaderSamples) {
			this.updatePreloader()
		}

		if(this.orbit.autoRotate) {
			this.orbit.update()
			this.needsRedraw = true
		}

		this.transform.update()

		if(this.animatedConnections.length) {
			this.needsRedraw = true
			this.needsRetrace = true
			this.needsProjection = true

			this.updateTreeSize(this.currentDim)
		}

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
			this.orbit.update()

			this.needsRedraw = true
		}

		if(this.orbitTween.ended || this.cameraTween.ended) {
			this.orbit.update()
		}


		this.camera.updateMatrixWorld()
		if(!this.lastcam.equals(this.camera.matrixWorld)) {
			this.lastcam.copy(this.camera.matrixWorld)

			this.projector.updateMatrices()
			this.updateLights()
			this.updateGrid()

			this.needsRetrace = true
			this.needsRedraw = true
			this.needsProjection = true
		}

		if(this.needsProjection) {
			this.needsProjection = false

			this.updateProjection()
		}

		if(this.needsRetrace) {

			if(this.enableRaycast && this.tree && !this.orbit.down
			&& !this.orbitTween.playing && !this.cameraTween.playing) {
				this.needsRetrace = false
				this.retrace()
			}
		}

		if(this.needsRedraw) {
			this.needsRedraw = false

			this.draw()
			this.projector.update()
			this.markers.update()
		}
	}
})


THREE.Object3D.prototype.onBeforeRender = function(renderer, scene, camera, geometry, material, group) {
	if(!renderer.stencilWrite) return

	var gl = renderer.context

	gl.stencilFunc(gl.ALWAYS, +this.stencilValue || 0, 0xff)
}

THREE.Object3D.prototype.onAfterRender = function(renderer, scene, camera, geometry, material, group) {
	// if(!renderer.stencilWrite) return

	// var gl = renderer.context
}
