View3 = f.unit({
	unitName: 'View3',
	ename: 'view-3',


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
	halfSizeOcclusion: true,

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

		this.element   = dom.div(this.ename, this.eroot)
		this.events    = new EventEmitter
		this.scene     = new THREE.Scene
		this.ambLight  = new THREE.AmbientLight(0xFFFFFF, 0.7)
		this.dirLight  = new THREE.DirectionalLight(0xFFFFFF, 0.5)
		this.camera    = new THREE.PerspectiveCamera(30)
		this.orbit     = new THREE.OrbitControls(this.camera, this.element)
		this.raycaster = new THREE.Raycaster
		this.root      = new THREE.Object3D
		this.lastcam   = new THREE.Matrix4

		this.elementOffset = { x: 0, y: 0 }
		this.highlightedNodes = []
		this.globalConnections = []
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
		this.smDepth.side = THREE.DoubleSide
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




		this.connectionLine = new THREE.LineSegments(
			new THREE.BufferGeometry,
			this.imagery.materials.connection)
		this.connectionLine.frustumCulled = false

		this.cameraTween = new TWEEN.Tween({ x: 0, y: 0, z: 0 })
			.easing(TWEEN.Easing.Cubic.Out)

		this.orbitTween = new TWEEN.Tween({ x: 0, y: 0, z: 0 })
			.easing(TWEEN.Easing.Cubic.Out)



		this.dirLight.position.set(-100, 100, 100)
		this.dirLight.target.position.set(0, 0, 0)

		this.camera.position.set(1, 1, 1)

		this.explodeDim  = new TDimensions
		this.assembleDim = new TDimensions
		this.currentDim  = new TDimensions

		this.focusOnTree(0)


		this.scene.add(this.ambLight)
		this.scene.add(this.dirLight)
		this.scene.add(this.root)
		// this.scene.add(this.transform)
		this.scene.add(this.connectionLine)

		new EventHandler(this.onMouseMove, this).listen('mousemove', this.element)
		new EventHandler(this.onMouseOut,  this).listen('mouseout',  this.element)
		new EventHandler(this.onTap,       this).listen('tap',       this.element)
	},


	makeShader: function(source) {
		if(source) return new THREE.ShaderMaterial({
			vertexShader: source.vertexShader,
			fragmentShader: source.fragmentShader,
			uniforms: THREE.UniformsUtils.clone(source.uniforms)
		})
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

	orbitTo: function(nextTarget, time, distance, theta, lerp, easing) {
		if(kbd.state.SHIFT) return
		// console.trace(nextTarget, time, distance, theta, lerp)

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
		,   thetaGot = f.clamp(theta == null ? thetaNow : theta, thetaMin, thetaMax)

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
			if(easing == null) {
				easing = TWEEN.Easing.Quadratic.Out
			}

			if(target.distanceToSquared(nextTarget) > EPS) {
				this.orbitTween.from(target).to(nextTarget, time).easing(easing).start()
			}

			if(camera.distanceToSquared(nextCamera) > EPS) {
				this.cameraTween.from(camera).to(nextCamera, time).easing(easing).start()
			}

		} else if(lerp != null) {
			camera.lerp(nextCamera, lerp)
			target.lerp(nextTarget, lerp)
			this.orbit.update()

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

	focusOnTree: function(time, dim, fit, lerp, aspect, easing) {
		// return this.focusOnNode(null, time)
		if(!this.tree) {
			time = 0
		}

		if(time == null) {
			time = this.focusDuration
		}

		if(dim == null) {
			dim = this.currentDim
		}

		if(fit == null) {
			fit = 4/3
		}

		var distance = this.getFitDistance(dim.size, fit, fit, aspect)

		this.orbitTo(dim.center, time, distance, null, lerp, easing)
	},

	focusOnNode: function(node, time) {
		if(isNaN(time)) {
			time = this.focusDuration
		}

		this.orbitTo(node.local.center, time)
	},

	getFitDistance: function(size, factorX, factorY, aspect, fov) {
		if(size    == null) size = this.currentDim.size
		if(factorX == null) factorX = 1.5
		if(factorY == null) factorY = 1.5

		if(aspect == null) aspect = this.camera.aspect
		if(fov    == null) fov    = this.camera.fov

		var half = Math.max(size.x, size.y, size.z) / 2
		,   beta = fov * f.xrad / 2
		,   fitH = half * (factorX || 1) / Math.tan(beta * aspect)
		,   fitV = half * (factorY || 1) / Math.tan(beta)

		return isFinite(aspect) ? Math.max(fitH, fitV) : fitV
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
		this.scene.updateMatrixWorld(true)

		if(this.tree) {
			this.root.add(this.tree.object)

			this.tree.traverse(this.updateNodeStencil, this)
			this.tree.events.on('animate_start', this.onConnectStart, this)

		} else {
			// this.camera.position.set(1, 1, 1)
		}

		this.animatedConnections.forEach(this.onConnectEnd, this)

		this.updateTreeSize(this.explodeDim,  true, 0)
		this.updateTreeSize(this.assembleDim, true, 1)
		this.updateTreeSize(this.currentDim,  true, null)
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
			con.events.on('animate_end', this.onConnectEnd, this)
		}
	},

	onConnectEnd: function(con) {
		var index = this.animatedConnections.indexOf(con)
		if(index !== -1) {
			con.events.off(null, null, this)

			this.animatedConnections.splice(index, 1)
			this.animatedConnectionsEnd = true
		}
	},

	updateTreeSize: function(dim, forceState, state) {
		if(this.tree) {
			if(forceState) this.tree.setConnectedState(state)
			this.tree.getDimensions(dim)

		} else {
			dim.box.makeEmpty()
			dim.center.set(0, 0, 0)
			dim.mass = 0
			dim.size.set(1, 1, 1).normalize()
			dim.length = 1
			dim.sphere.set(dim.center, dim.length)
		}
	},

	updateConnectionTree: function() {
		var remove = this.markers.markers.slice()

		this.globalConnections = []

		if(this.tree) {
			this.tree.traverseConnections(this.updateConnection, this, remove)
		}

		for(var i = 0; i < remove.length; i++) {
			this.markers.removeMarker(remove[i])
		}

		var g = this.connectionLine.geometry
		,   c = this.globalConnections.length * 3 * 2
		if(!g.attributes.position || g.attributes.position.array.length !== c) {
			g.removeAttribute('position')
			g.addAttribute('position', new THREE.BufferAttribute(new Float32Array(c), 3))
		}

		this.updateConnectionLine(this.globalConnections)
	},

	updateConnectionLine: function(cons) {
		var g = this.connectionLine.geometry
		,   a = g.attributes.position
		if(!a) return

		var v1 = new THREE.Vector3

		for(var i = 0; i < cons.length; i++) {
			var c = cons[i]
			if(!c.connected || !c.master) continue

			var vi = c.viewGlobalIndex * 2 * 3
			,   mt = c.node.object.matrixWorld
			,   mp = c.object.position
			,   sp = c.connected.object.position

			v1      .copy(mp    ).applyMatrix4(mt).toArray(a.array, vi +0)
			v1.addVectors(mp, sp).applyMatrix4(mt).toArray(a.array, vi +3)
		}

		a.needsUpdate = true
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

		if(con.connected && con.master) {
			con.viewGlobalIndex = this.globalConnections.length
			this.globalConnections.push(con)
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
			,   length = this.currentDim.length
			,   minimal = this.tree ? this.tree.local.length : 1

			this.camera.near = Math.max(distance - radius, minimal * 0.05)
			this.camera.far  = Math.max(distance + radius, length)
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
				this.litNode(this.tree, this.debug)
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

		for(var i = 0; i < node.meshes.length; i++) {
			node.meshes[i].stencilValue = value
		}
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
		this.needsRedraw = true
	},

	litNodeList: function(list, lit) {
		if(list) for(var i = list.length -1; i >= 0; i--) {
			this.litNode(list[i], lit)
		}
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

		var inter = this.raycaster.intersectObject(this.tree.object, true)
		for(var i = 0; i < inter.length; i++) {
			var object = inter[i].object

			if(object.stencilValue & this.stencilRaycastMask) {
				this.hoverNode(object.parentNode)
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
		var fullW = w
		,   fullH = h
		,   halfW = fullW
		,   halfH = fullH

		if(this.halfSizeOcclusion) {
			halfW = fullW >> 1
			halfH = fullH >> 1
		}

		if(this.fullW !== fullW
		|| this.fullH !== fullH) {
			this.fullW = fullW
			this.fullH = fullH

			this.rtDepthStencil = new THREE.WebGLRenderTarget(this.fullW, this.fullH, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat
			})

			this.rtB1 = new THREE.WebGLRenderTarget(this.fullW, this.fullH, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat
			})
			this.rtB2 = this.rtB1.clone()
		}

		if(this.halfW !== halfW
		|| this.halfH !== halfH) {
			this.halfW = halfW
			this.halfH = halfH

			this.rt1 = new THREE.WebGLRenderTarget(this.halfW, this.halfH, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat
			})
			this.rt2 = this.rt1.clone()
		}
	},

	onResize: function() {
		this.elementOffset = dom.offset(this.element)
		this.setSize(
			this.element.offsetWidth  || 1,
			this.element.offsetHeight || 1)
	},

	setSize: function(w, h) {
		if(this.width  === w
		&& this.height === h) return

		this.width  = w
		this.height = h

		this.projector.resize(this.width, this.height)


		if(!this.viewport) {
			if(!this.renderTarget) {
				this.renderer.setSize(this.width, this.height)
			}
			this.resizeRenderTargets(this.width, this.height)
		}

		this.updateProjection()

		this.needsRetrace = true
		this.needsRedraw = true
	},

	updateViewportSize: function() {
		var w = this.viewport ? this.viewport.w : this.width
		,   h = this.viewport ? this.viewport.h : this.height

		this.orbit.setSize(w, h)
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
			this.root.visible = true

			this.renderer.stencilWrite = false
			draw(this.renderTarget, this.scene, this.camera)
		}

		if(this.enableWireframe) {
			this.scene.overrideMaterial = this.imagery.materials.wireframe
			this.connectionLine.visible = false
			draw(this.renderTarget, this.scene, this.camera)
			this.connectionLine.visible = true
			this.scene.overrideMaterial = null
		}

		var stencilPasses = null
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
			if(stencilPasses.length === 0) {
				stencilPasses = null
			}
		}

		if((this.enableSSAO || stencilPasses) && this.smDepth) {
			var target = this.debugDepth ? this.renderTarget : this.rtDepthStencil

			gl.enable(gl.STENCIL_TEST)
			gl.stencilMask(0xFF)
			gl.stencilFunc(gl.ALWAYS, 0, 0xFF)
			gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE)
			this.renderer.stencilWrite = true
			this.scene.overrideMaterial = this.smDepth

			this.renderer.setClearColor(0xFFFFFF, 1)
			// this.renderer.setClearColor(0, 1)
			clear(target)
			draw(target, this.scene, this.camera)

			this.scene.overrideMaterial = null
			this.renderer.stencilWrite = false
			gl.disable(gl.STENCIL_TEST)
		}


		gl.disable(gl.DEPTH_TEST)

		if(this.debugDepth) return


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

		if(stencilPasses) {
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
		if(this.orbit.autoRotate) {
			this.orbit.update()
			this.needsRedraw = true
		}

		this.transform.update()

		if(this.animatedConnections.length || this.animatedConnectionsEnd) {
			this.animatedConnectionsEnd = false
			this.needsRedraw = true
			this.needsRetrace = true
			this.needsProjection = true

			this.updateTreeSize(this.currentDim)
			this.updateConnectionLine(this.globalConnections)
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
			// this.updateGrid()

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

		if(this.needsRedraw && this.width && this.height) {
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

	// var value = this.parentNode ? this.parentNode.stencilValue : this.stencilValue

	gl.stencilFunc(gl.ALWAYS, +this.stencilValue || 0, 0xff)
}

THREE.Object3D.prototype.onAfterRender = function(renderer, scene, camera, geometry, material, group) {
	// if(!renderer.stencilWrite) return

	// var gl = renderer.context
}
