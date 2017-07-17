View3D = f.unit(Block, {
	unitName: 'Block_View3D',

	ename: 'view-3d',

	fov: 70,

	autoRotate: false,
	enableSSAO: true,
	enableOnlyAO: false,
	enableStencil: true,
	enableRender: true,
	enableScreen: true,
	enableBlur: false,
	enableWire: false,
	enableNormal: false,
	debugStencil: false,
	timesFXAA: 1,

	bgcolor: 0x333333,

	minDistance: 1,
	maxDistance: 100,
	minPolarAngle: 0,
	maxPolarAngle: Math.PI / 2,

	frames: 0,


	stencilNone: {
		value: 0,
		params: {
			drawColor: 0x333333
		}
	},

	stencilLit: {
		value: 1,
		params: {
			drawColor: 0x3355FF,
			drawAlpha: 0.9,
			lineAlpha: 0.7,
			edgeAlpha: 0.9,
			fillAlpha: 0.2
		}
	},

	stencilHover: {
		value: 2,
		params: {
			drawColor: 0xFFFFFF,
			drawAlpha: 1.0,
			lineAlpha: 0.5,
			edgeAlpha: 0.8,
			fillAlpha: 0.1
		}
	},

	stencilSelect: {
		value: 3,
		params: {
			drawColor: 0xFFFF33,
			drawAlpha: 0.7,
			lineAlpha: 0.7,
			edgeAlpha: 1.0,
			fillAlpha: 0.3
		}
	},

	stencilInvalid: {
		value: 4,
		params: {
			drawColor: 0xFF5533,
			drawAlpha: 0.7,
			lineAlpha: 0.6,
			edgeAlpha: 0.9,
			fillAlpha: 0.6
		}
	},

	visibleMethod: dom.visible,

	create: function() {
		this.camera    = new THREE.PerspectiveCamera
		this.scene     = new THREE.Scene
		this.orbit     = new THREE.OrbitControls(this.camera, this.element)
		this.fpview    = new THREE.FirstPersonControls(this.camera, this.element)
		this.object    = new THREE.Object3D
		this.light     = new THREE.AmbientLight(0xaaaaaa)
		this.direct    = new THREE.DirectionalLight(0xffffff, 0.2)
		this.sunlight  = new THREE.DirectionalLight(0xffffff, 0.5)
		this.raycaster = new THREE.Raycaster
		this.mouse     = new THREE.Vector2
		this.mouse2    = new THREE.Vector2
		this.mdown     = new THREE.Vector2

		this.srCamera  = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
		this.srScene   = new THREE.Scene
		this.srPlane   = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2))

		this.obvDrawMaterials = new Observable().set(this, this.readDrawMaterials)
		this.obvDrawSubnodeOutlines = new Observable().set(this, this.readDrawSubnodeOutlines)

		this.obvTool  = new Observable
		this.obvMode  = new Observable
		this.obvTree  = new Observable
		this.obvDirty = new Observable
		this.obvDraw  = new Observable().set(this, this.readDraw)

		this.obvViewLitNodes = new Observable
		this.obvToolLitNodes = new Observable
		this.obvIntersectionMode = new Observable().set(this, this.readIntersectionMode)


		this.cameraTween = new TWEEN.Tween(this.camera.position)
			.easing(TWEEN.Easing.Cubic.InOut)
			.onStart(this.positionTweenStart, this)
			.onComplete(this.positionTweenComplete, this)

		this.orbitTween = new TWEEN.Tween(this.orbit.target)
			.easing(TWEEN.Easing.Cubic.InOut)
			.onStart(this.positionTweenStart, this)
			.onComplete(this.positionTweenComplete, this)

		this.crosshair = this.makeCrosshair(0x555555)
		// this.skybox = this.makeSkybox(5000)
		// this.skybox.rotation.y = -Math.PI/2
		this.grid = this.makeGrid(5, 40)

		this.scene.add(this.grid)
		this.scene.add(this.light)
		this.scene.add(this.direct)
		this.scene.add(this.sunlight)
		this.scene.add(this.object)
		this.scene.add(this.crosshair)

		this.srScene.add(this.srPlane)

		this.camera.position.set(10, Math.pow(10, 4/5), 10 * 5/4)
		this.sunlight.position.set(1000, 600, -1000)
		this.updateControl()
		this.initShaders()

		this.tool = null
		this.tools = {}

		if(window.Tool3D) {
			this.tools.roof  = new Tool3D.AddRoof
			this.tools.flume = new Tool3D.AddDrain
			this.tools.pipe  = new Tool3D.AddPipe
			this.tools.hole  = new Tool3D.AddHole
			this.tools.mpipe = new Tool3D.MovePipe
			this.tools.mhole = new Tool3D.MoveHole
			this.tools.chole = new Tool3D.CloneHole
			this.tools.mcut  = new Tool3D.MoveCut
			this.tools.mjoin = new Tool3D.MoveJoin
			this.tools.join  = new Tool3D.AddJoin
			this.tools.hcut  = new Tool3D.AddHorizontalCut
			this.tools.vcut  = new Tool3D.AddVerticalCut

			this.tools.window = this.tools.door = this.tools.hole
		}

		// var needsRedraw = true
		// Object.defineProperty(this, 'needsRedraw', {
		// 	get: function() { return needsRedraw },
		// 	set: function(s) { console.trace(needsRedraw = s) }
		// })

		this.additionsVisible = new Gate(Gate.AND, true)
		this.additionsVisible.events.on('change', function(enabled) {
			this.skybox.visible = enabled
			this.grid.visible = enabled
		}, this)

		this.crosshairVisible = new Gate(Gate.AND, true)
		this.crosshairVisible.events.on('change', function(enabled) {
			this.crosshair.visible = enabled
		}, this)

		this.orbitEnabled = new Gate(Gate.AND, true)
		this.orbitEnabled.events.on('change', function(enabled) {
			this.orbit.enabled = enabled
		}, this)

		this.cutVisibility = new Gate(Gate.AND, true)
		this.cutVisibility.events.on('change', this.dispatchAllSubnodeHooks, this)

		this.fpview.events.on('capture', this.fpCapture, this)

		dom.on('mouseout',  this.element, this)
		dom.on('mousedown', this.element, this)
		dom.on('mousemove', this.element, this)
		dom.on('mouseup',   this.element, this)
		dom.on('touchstart',this.element, this)
		dom.on('touchmove', this.element, this)
		dom.on('touchend',  this.element, this)
		dom.on('tap',       this.element, this)

		this.createRenderer()
	},

	createRenderer: function() {
		try {
			this.renderer = new THREE.WebGLRenderer
		} catch(e) {
			console.warn('RENDERER FAILED:', e)
			this.createWebGLErrorMessage()
			this.orbitEnabled.off('renderer')
			return
		}

		this.renderer.setClearColor(this.bgcolor, 1)
		this.renderer.autoClear = false

		dom.append(this.element, this.renderer.domElement)
	},

	createWebGLErrorMessage: function() {
		var msg = dom.div('message', this.element)
		,   img = dom.div('message-image', msg)
		,   txt = dom.div('message-text', msg)

		Atlas.set(img, 'i-warning')
		Locale.setText(txt, 'v3_text_nogl')
	},

	dispatchSubnodeHook: function(subnode) {
		if(subnode.type === 'cut') {
			subnode.object.visible = this.cutVisibility.value
		}
	},

	dispatchAllSubnodeHooks: function(type) {
		var pool = this.tree && Observable.unwrap(this.tree.obvSubnodePool)
		if(!pool) return

		for(var i = 0; i < pool.length; i++) {
			this.dispatchSubnodeHook(pool[i])
		}

		this.needsRedraw = true
	},

	makeSkybox: function(size, images) {
		var materials = []

		main.imagery.skybox.images = images
		main.imagery.skybox.needsUpdate = true

		for(var i = 0; i < 6; i++) {
			var texture = new THREE.Texture
			texture.image = images[i]
			texture.needsUpdate = true

			materials.push(new THREE.MeshBasicMaterial({ side: THREE.BackSide, map: texture }))
		}

		this.skybox = new THREE.Mesh(
			new THREE.BoxGeometry(size, size, size),
			new THREE.MeshFaceMaterial(materials))

		this.scene.add(this.skybox)
	},

	handleEvent: function(e) {
		if(!this.renderer) return

		switch(e.type) {
			case 'touchstart': return this.ontouchstart(e)
			case 'touchmove':  return this.ontouchmove(e)
			case 'touchend':   return this.ontouchend(e)
			case 'mousedown':  return this.onmousedown(e)
			case 'mousemove':  return this.onmousemove(e)
			case 'mouseup':    return this.onmouseup(e)
			case 'mouseout':   return this.onmouseout(e)
			case 'tap':        return this.ontap(e)
		}
	},

	pickTool: function(name, options, node) {
		if(!this.visible.value) return

		if(this.tool) {
			this.tool.drop()

			if(this.tool.save) {
				this.events.emit('history_push')
			}

			this.tool.reset()
			this.orbitEnabled.on('tool')
		}

		this.tool = this.tools[name]

		if(this.tool) {
			this.tool.pick(node || this.tree, options, main.selection)
		}

		this.obvTool.write(this.tool)
		this.obvToolLitNodes.write(this.tool ? this.tool.highlightNodes : null)
	},

	onkey: function(e) {
		var time = Date.now()

		var hotkey = true
		switch(kbd.key) {
			case 'SHIFT':
				if(!kbd.down || this.fpview.moving) {
					this.fpview.onKey(e)
				}
			break

			case 'x':
				if(!kbd.down) break

				var inter = this.raycaster.intersectObject(this.scene, true) [0]
				if(inter && inter.object.parent) {
					inter.object.parent.remove(inter.object)
					this.needsRedraw = true
				}
			break

			case 'c':
				this.focusOnTree(300)
			break

			case 'w':
			case 's':
			case 'a':
			case 'd':
			// case 'SHIFT':
			case 'SPACE':
				this.fpview.onKey(e)
			break

			case 'f':
				this.fpview.capture()
			break

			case 'i':
				if(kbd.down) {
					this.demolitionStart()
				} else {
					this.demolitionEnd()
				}

				this.needsRedraw = true
			break

			case 'o':
				if(this.benchStart) {
					if(time - this.benchStart > 1000) {
						this.benchEnd = time
					}

				} else if(kbd.down) this.bench()
			break

			case 'ESC':
				if(this.benchStart) this.benchEnd = Date.now()
				hotkey = false
			break

			default:
				hotkey = kbd.down ? this.orbit.onKeyDown(e) : false
			break
		}

		return hotkey
	},

	makeShaderMaterial: function(data) {
		if(data) return new THREE.ShaderMaterial({
			vertexShader: data.vertexShader,
			fragmentShader: data.fragmentShader,
			uniforms: THREE.UniformsUtils.clone(data.uniforms)
		})
	},

	initShaders: function() {
		this.smSSAO  = this.makeShaderMaterial(THREE.SSAOShader)
		this.smFXAA  = this.makeShaderMaterial(THREE.FXAAShader)
		this.smHBlur = this.makeShaderMaterial(THREE.HorizontalBlurShader)
		this.smVBlur = this.makeShaderMaterial(THREE.VerticalBlurShader)
		this.smCopy  = this.makeShaderMaterial(THREE.CopyShader)
		this.smOverlay = this.makeShaderMaterial(THREE.OverlayShader)

		this.smDepth = new THREE.MeshDepthMaterial
		this.smDepth.depthPacking = THREE.RGBADepthPacking
		this.smDepth.blending = THREE.NoBlending
		this.smDepth.side = THREE.DoubleSide

		if(this.smOverlay) {
			this.smFill = new THREE.ShaderMaterial({
				vertexShader: THREE.OverlayShader.vertexShader,
				fragmentShader: THREE.OverlayShader.fillShader,
				uniforms: THREE.UniformsUtils.clone(THREE.OverlayShader.fillUniforms)
			})
		}
	},

	onresize: function() {
		if(this.renderer) this.renderer.setSize(this.width, this.height)

		this.camera.fov    = this.fov
		this.camera.aspect = this.width / this.height
		this.camera.near   = 0.1
		this.camera.far    = 10000
		this.camera.updateProjectionMatrix()

		this.elementOffset = dom.offset(this.element)

		this.rtDraw = new THREE.WebGLRenderTarget(this.width, this.height, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat
		})

		this.rtTemp = this.rtDraw.clone()
		this.rt1 = this.rtDraw.clone()
		this.rt2 = this.rtDraw.clone()

		if(this.smSSAO) {
			this.smSSAO.uniforms['size'      ].value.set(this.width, this.height)
			this.smSSAO.uniforms['cameraNear'].value = 0.1
			this.smSSAO.uniforms['cameraFar' ].value = 100
		}

		if(this.smFXAA) {
			this.smFXAA.uniforms['resolution'].value.set(1/ this.width, 1/ this.height)
		}

		if(this.smOverlay) {
			this.smOverlay.uniforms['resolution'].value.set(1/ this.width, 1/ this.height)
		}

		if(this.smHBlur && this.smVBlur) {
			this.smHBlur.uniforms['h'].value = 1/ this.width
			this.smVBlur.uniforms['v'].value = 1/ this.height
		}

		this.needsRedraw = true
	},

	updatePointer: function(point) {
		if(point) {
			this.mouse2.set(point.pageX, point.pageY).sub(this.elementOffset)
		}

		if(this.fpview.enabled) {
			this.mouse.x = 0
			this.mouse.y = 0

		} else {
			this.mouse.x =  (this.mouse2.x / this.width ) * 2 -1
			this.mouse.y = -(this.mouse2.y / this.height) * 2 +1
		}

		this.mouseFinite = isFinite(this.mouse.x) && isFinite(this.mouse.y)
		if(this.mouseFinite) {
			this.raycaster.setFromCamera(this.mouse, this.camera)
		}
	},

	treeSubnodeAdded: function(subnode) {
		var context = { view: this, subnode: subnode }

		subnode.obvSubnodeTarget  = new Observable().set(context, this.readSubnodeTarget)
		subnode.obvSubnodeOutline = new Observable().set(context, this.readSubnodeOutline)

		this.dispatchSubnodeHook(subnode)
	},

	treeSubnodeRemoved: function(subnode) {
		subnode.obvSubnodeTarget .destroy()
		subnode.obvSubnodeOutline.destroy()
	},

	// subnode context
	readSubnodeTarget: function() {
		var subnode = this.subnode

		subnode.targetList = []

		var blank = subnode.owner.node.obvBlank.read()
		if(!blank) {
			var mode = this.view.obvIntersectionMode.read()

			subnode.interactive = mode && mode[subnode.type]
			if(subnode.interactive) for(var i = 0; i < subnode.interactive.length; i++) {
				var name = subnode.interactive[i]
				,   node = subnode.targets[name]

				if(node) subnode.targetList.push(node)
			}

		} else {
			subnode.interactive = null
		}

		subnode.target = subnode.targetList[0]

		if(subnode.interactive && !subnode.target) {
			// console.warn('subnode without target', subnode.type, '->', subnode.interactive)
		}

		return subnode.interactive
	},

	// subnode context
	readSubnodeOutline: function() {
		var subnode = this.subnode

		subnode.obvSubnodeTarget.read()

		var selected = false
		,   hovered  = false
		,   invalid  = false

		if(subnode.target) {
			hovered  = subnode.target.obvHover.read()
			selected = subnode.target.obvSelect.read()
		}

		var mainSelected = selected
		,   mainHovered  = hovered

		for(var name in subnode.targets) {
			var node =  subnode.targets[name]
			if(!node) continue

			if(!invalid  && !node.obvValid .read()) invalid  = true
			if(mainSelected || mainHovered) continue

			if(!selected &&  node.obvSelect.read()) selected = true
			if(!hovered  &&  node.obvHover .read()) hovered  = true
		}

		var viewHL = this.view.obvViewLitNodes.read()
		,   toolHL = this.view.obvToolLitNodes.read()

		var lit = (viewHL && viewHL.indexOf(subnode.type) !== -1)
		       || (toolHL && toolHL.indexOf(subnode.type) !== -1)


		var stencilValue = invalid ? this.view.stencilInvalid.value
			:             selected ? this.view.stencilSelect.value
			:              hovered ? this.view.stencilHover.value
			:                  lit ? this.view.stencilLit.value
			:                        this.view.stencilNone.value

		for(var i = 0; i < subnode.meshes.length; i++) {
			subnode.meshes[i].stencilWrite = stencilValue
		}

		this.view.needsRedraw = true

		return stencilValue
	},


	autopickTool: {
		control: {
			hole: 'chole'
		},

		defaults: {
			cut  : 'mcut',
			join : 'mjoin',
			hole : 'mhole',
			pipe : 'mpipe'
		}
	},

	subnodeGroupingList: {

	},

	subnodeTargetList: {
		calc: {},

		cut: {
			cut    : ['cut'],
			join   : ['join', 'cutsegment']
		},

		material: {
			hole   : ['hole'],
			slope  : ['roof'],
			plinth : ['box'],
			wall   : ['piece'],
			join   : ['join', 'cutsegment'],
			corner : ['point'],
			drain  : ['drain'],
			flume  : ['drain'],
			pipe   : ['drain']
		},

		defaults: {
			hole   : ['hole'],
			slope  : ['slope', 'roof'],
			wall   : ['wall', 'slope', 'roof', 'floor'],
			join   : ['join', 'cutsegment'],
			plinth : ['floor'],
			drain  : ['drain'],
			flume  : ['drain'],
			pipe   : ['pipe']
		}
	},

	setMode: function(mode, modestring) {
		this.highlightNodes = false
		this.autopicking = true


		switch(modestring) {
			case 'calc':
				this.autopicking = false
			break

			case 'cut':
				this.highlightNodes = 'cut'
			break

			case 'material':
				this.autopicking = false
			break
		}

		this.obvMode.write(modestring)
		this.obvViewLitNodes.write(this.highlightNodes)
	},

	readIntersectionMode: function() {
		var tool = this.obvTool.read()
		if(tool) {
			return tool.intersectionList

		} else {
			var mode = this.obvMode.read()

			return this.subnodeTargetList[mode]
				|| this.subnodeTargetList.defaults
		}
	},

	intersectSortDist: function(a, b) {
		return a.distance - b.distance
	},

	intersectSubnodes: function() {
		if(!this.tree || !this.mouseFinite) return

		var pool = Observable.unwrap(this.tree.obvSubnodePool)
		if(!pool || !pool.length) return

		var intersects = []
		for(var i = 0; i < pool.length; i++) {
			var subnode = pool[i]
			if(!subnode.obvSubnodeTarget.read()) continue

			if(subnode.type === 'cut' && !this.cutVisibility.value) continue

			for(var j = 0; j < subnode.meshes.length; j++) {
				var mesh = subnode.meshes[j]

				mesh.subnode = subnode
				mesh.raycast(this.raycaster, intersects)
			}
		}

		intersects.sort(this.intersectSortDist)
		return intersects[0]
	},

	filterNodeSelect: function(node, target) {
		if((node instanceof ANode.HCut       && !node.obvGlobal.read())
		|| (node instanceof ANode.Cutsegment && !node.obvInstall.read())) {
			return false
		}

		switch(this.obvMode.read()) {
			case 'material':
				if(target.getFabric() !== node.getFabric()) return false
			break
		}

		if(target instanceof ANode.Slope) {
			return target.obvParent.read() === node
		}

		if(target instanceof ANode.Hole
		&& node   instanceof ANode.Hole) {
			return target.obvSampleType.read() === node.obvSampleType.read()
		}


		return target.constructor === node.constructor
	},

	select: function(inter, add) {
		var multiple = kbd.state.SHIFT
		,   subnode  = inter && inter.object.subnode

		var select_normal = 'selection_set'
		,   select_multiple = add ? 'selection_add' : 'selection_tog'

		var method, nodes

		if(subnode && subnode.obvSubnodeTarget.read()) {
			var targetList = subnode.targetList
			,   target = targetList[0]
			if(!target) return

			var grouping = main.selection.length === 1 && main.selection[0] === target
			if(grouping) {
				var groupRoot = this.subnodeGroupingList[subnode.type]
				,   groupNode = subnode.targets[groupRoot] || this.tree

				nodes = groupNode.traverse(null, this.filterNodeSelect, this, target)

			} else {
				nodes = [target]
			}

			method = multiple ? select_multiple : select_normal

		} else {
			if(!multiple) {
				method = select_normal
				nodes = null
			}
		}

		if(method) this.events.emit(method, [nodes])
	},

	hover: function(inter) {
		var node = inter && inter.object.subnode && inter.object.subnode.target

		this.events.emit('node_hover', node)

		dom.togclass(this.element, 'hover', !!node)
	},

	pointerStart: function() {
		var inter = this.intersectSubnodes()

		if(!this.tool && inter && this.autopicking) {
			var node = inter.object.subnode && inter.object.subnode.target

			if(node) {
				var autopickList = kbd.state.CTRL
					? this.autopickTool.control
					: this.autopickTool.defaults

				var toolName = autopickList[node.name]
				if(toolName) {
					this.orbitEnabled.off('tool')

					if(main.selection.indexOf(node) === -1) {
						this.selectedEarly = true
						this.select(inter, true)
					}

					this.events.emit('tool_change', [toolName, null, node])
				}
			}
		}

		if(this.tool) {
			this.tool.start(inter, this.raycaster.ray)
			this.tool.moves = 0
			this.tool.moved = false
		}
	},

	pointerMove: function() {
		var inter = this.intersectSubnodes()

		if(this.down) {
			this.hover(null)
		} else {
			this.hover(this.tool && this.tool.hoverSuppress ? null : inter)
		}

		if(this.tool) {
			this.tool.moves++
			this.tool.moved = this.tool.moves > 2
			this.tool.move(inter, this.raycaster.ray)
		}
	},

	pointerEnd: function() {
		var used = false

		if(this.tool) {
			var inter = this.intersectSubnodes()
			this.tool.move(inter, this.raycaster.ray)
			this.tool.end(inter, this.raycaster.ray)

			used = this.tool.done && this.tool.save

			if(this.tool.done) {
				this.events.emit('tool_change', null)
			}
		}

		if(!used && !this.selectedEarly && this.mouse2.distanceToSquared(this.mdown) < 9) {
			this.select(this.intersectSubnodes())
		}

		delete this.selectedEarly
	},

	ontouchstart: function(e) {
		this.down = true
		this.updatePointer(e.changedTouches[0])
		this.mdown.copy(this.mouse2)

		this.pointerStart()
		e.preventDefault()
	},

	ontouchmove: function(e) {
		this.updatePointer(e.changedTouches[0])

		this.pointerMove()
		e.preventDefault()
	},

	ontouchend: function(e) {
		this.down = false
		this.updatePointer(e.changedTouches[0])

		this.pointerEnd()
		e.preventDefault()
	},

	onmousedown: function(e) {
		this.down = true
		this.updatePointer(e)
		this.mdown.copy(this.mouse2)

		if(e.which !== 1) return

		this.pointerStart()
	},

	onmousemove: function(e) {
		this.updatePointer(e)
		this.pointerMove()
		// if(this.down) e.preventDefault()
	},

	onmouseup: function(e) {
		this.down = false
		if(e.which !== 1) return

		this.updatePointer(e)
		this.pointerEnd()
	},

	onmouseout: function(e) {
		this.updatePointer({
			pageX: Infinity,
			pageY: Infinity
		})
		this.pointerMove()
	},

	ontap: function(e) {
		this.events.emit('blur')
	},

	fpCapture: function(capture) {
		this.fpactive = capture
		this.orbitEnabled.set(!capture, 'fpv')
		this.crosshairVisible.set(!capture, 'fpv')
		dom.togclass(this.element, 'first-person', capture)

		this.cameraTween.stop()
		this.orbitTween.stop()

		var target = this.orbit.target
		,   camera = this.camera.position

		if(capture) {
			this.orbitDistance = camera.distanceTo(target)

		} else {
			// this.fpview.reset()

			var inters = this.raycaster.intersectObject(this.tree.object, true)
			,   direction = this.raycaster.ray.direction

			if(inters.length) {
				target.copy(inters[0].point)

			} else {
				var distance = this.orbitDistance

				if(direction.y > 0) {
					distance = Math.min(distance, camera.y / direction.y)
				}

				target
					.copy(direction)
					.setLength(distance)
					.add(camera)
			}


			if(direction.y > 0) {
				var rotateTarget = direction.clone()
					.setLength(camera.distanceTo(target))
					.multiplyScalar(1 / Math.cos(direction.y))
					.add(camera)
					.setY(camera.y)

				this.orbitTo(rotateTarget, 300)

			} else {
				this.orbit.update()
			}
		}
	},

	orbitTo: function() {
		var targetOffset = new THREE.Vector3
		,   targetCamera = new THREE.Vector3
		,   matrixTheta  = new THREE.Matrix4

		return function orbitTo(target, time, distance, theta) {
			var EPS = window.Geo ? Geo.EPS : 1e-9

			var distNow = this.camera.position.distanceTo(target)
			,   distMin = this.orbit.minDistance
			,   distMax = this.orbit.maxDistance
			,   distTarget = f.clamp(distance || distNow, distMin, distMax)

			targetOffset.subVectors(this.camera.position, this.orbit.target).setLength(distTarget)


			var thetaNow = Math.acos(targetOffset.y / distTarget)
			,   thetaMin = this.orbit.minPolarAngle
			,   thetaMax = this.orbit.maxPolarAngle
			,   thetaTarget = f.clamp(theta || thetaNow, thetaMin, thetaMax)

			if(Math.abs(thetaTarget - thetaNow) > EPS) {
				var axis = targetCamera
				axis.set(-targetOffset.z, 0, targetOffset.x).normalize()
				matrixTheta.makeRotationAxis(axis, thetaNow - thetaTarget)
				targetOffset.applyMatrix4(matrixTheta)
			}

			targetCamera.addVectors(target, targetOffset)


			this.orbitTween.stop()
			this.cameraTween.stop()

			if(time) {
				if(this.orbit.target.distanceToSquared(target) > EPS) {
					this.orbitTween.easing(TWEEN.Easing.Cubic.Out)
					this.orbitTween.to({
						x: target.x,
						y: target.y,
						z: target.z
					}, time).start()
				}

				if(this.camera.position.distanceToSquared(targetCamera) > EPS) {
					this.cameraTween.easing(TWEEN.Easing.Cubic.Out)
					this.cameraTween.to({
						x: targetCamera.x,
						y: targetCamera.y,
						z: targetCamera.z
					}, time).start()
				}

			} else {
				this.camera.position.copy(targetCamera)
				this.camera.lookAt(target)
				this.orbit.target.copy(target)
				this.orbit.update()
			}
		}
	}(),

	zoomByTime: function(scale, time) {
		var target   = this.orbit.target
		,   distance = this.camera.position.distanceTo(target) * scale

		this.orbitTo(target, time || 300, distance)
	},

	updateControl: function() {
		this.orbit.minDistance   = this.minDistance
		this.orbit.maxDistance   = this.maxDistance
		this.orbit.minPolarAngle = this.minPolarAngle
		this.orbit.maxPolarAngle = this.maxPolarAngle

		this.orbit.borderBox.min.y = 0
		// if(this.tree && this.tree.boundingBoxValid) {
		// 	this.orbit.borderBox.copy(this.tree.boundingBox)

		// } else {
		// 	this.orbit.borderBox.min.set(-30,  0, -30)
		// 	this.orbit.borderBox.max.set( 30, 30,  30)
		// }
		this.orbit.update()
	},

	makeCrosshair: function(color) {
		var geometry = new THREE.Geometry
		,   material = new THREE.LineBasicMaterial({ color: color })

		var vXP = new THREE.Vector3( 1,  0,  0)
		,   vXN = new THREE.Vector3(-1,  0,  0)
		,   vYP = new THREE.Vector3( 0,  1,  0)
		,   vYN = new THREE.Vector3( 0, -1,  0)
		,   vZP = new THREE.Vector3( 0,  0,  1)
		,   vZN = new THREE.Vector3( 0,  0, -1)

		geometry.vertices.push(vXP, vXN, vYP, vYN, vZP, vZN)

		return new THREE.LineSegments(geometry, material)
	},

	makeGrid: function(cell, repeat, texturedGrid) {
		return new THREE.GridHelper(cell * repeat, repeat)
	},

	setTree: function(tree) {
		if(this.tree) {
			this.tree.events.off(null, null, this)
			this.object.remove(this.tree.object)
		}

		this.tree = tree

		if(this.tree) {
			this.tree.events.when({
				'add_subnode': this.treeSubnodeAdded,
				'rem_subnode': this.treeSubnodeRemoved
			}, this)

			this.object.add(this.tree.object)
		}

		this.obvTree.write(this.tree)
	},

	focusOnTree: function() {
		var target = new THREE.Vector3

		return function focusOnTree(time, detachedTarget) {
			var dist

			if(this.tree && Observable.unwrap(this.tree.obvBoundingValid)) {
				dist = Observable.unwrap(this.tree.obvBoundingSize).length() * 2

				target.copy(Observable.unwrap(this.tree.obvMassCenter))

			} else {
				dist = 25

				target.set(0, 0, 0)
			}

			if(detachedTarget) {
				this.camera.getWorldDirection(this.orbit.target)
				this.orbit.target.setLength(this.camera.position.distanceTo(target))
				this.orbit.target.add(this.camera.position)
			}

			this.orbitTo(target, time, dist, 1.333)
		}
	}(),

	setLayer: function(layer) {
		this.layer = layer
	},

	positionTweenStart: function() {
		this.orbitEnabled.off('tween')
	},

	positionTweenComplete: function() {
		this.orbitEnabled.on('tween')
		this.orbit.update()
	},

	snapshot: function(context, width, height) {
		if(!this.tree || !this.renderer) return

		this.crosshairVisible.off('snapshot')
		this.resize(width, height)


		this.draw()
		context.drawImage(this.renderer.domElement, 0, 0)

		this.autoresize()
		this.crosshairVisible.on('snapshot')
		this.draw()
	},

	draw: function() {
		if(!this.renderer) return

		var gl = this.renderer.context

		var renderer = this.renderer
		,   srPlane  = this.srPlane
		,   srScene  = this.srScene
		,   srCamera = this.srCamera

		function swap() {
			var temp    = readBuffer
			readBuffer  = writeBuffer
			writeBuffer = temp
		}
		function draw(buffer, scene, camera) {
			if(!scene ) scene  = srScene
			if(!camera) camera = srCamera

			renderer.render(scene, camera, buffer)
		}
		function clear(buffer, color, depth, stencil) {
			if(buffer) {
				renderer.clearTarget(buffer, color, depth, stencil)
			} else {
				renderer.clear(color, depth, stencil)
			}
		}
		function shader(material, input, uniforms) {
			for(var name in uniforms) {
				var item = material.uniforms[name]
				,   data = uniforms[name]

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


		clear()
		clear(this.rt1)
		clear(this.rt2)
		clear(this.rtTemp)
		clear(this.rtDraw)

		var writeBuffer = this.rt1
		,   readBuffer  = this.rt2

		if(this.enableWire) {
			this.scene.overrideMaterial = main.imagery.materials.wireframe

		} else if(this.enableNormal) {
			this.scene.overrideMaterial = main.imagery.materials.normal

		} else {
			this.scene.overrideMaterial = null
		}

		this.additionsVisible.set(!this.enableWire, 'wire')
		this.crosshairVisible.set(!this.enableWire, 'wire')

		if(!this.smCopy) {
			draw(null, this.scene, this.camera)
			return
		}

		if(this.enableRender) {
			gl.enable(gl.DEPTH_TEST)
			gl.stencilMask(0xff)
			this.renderer.stencilWrite = true

			draw(this.rtDraw, this.scene, this.camera)

			gl.disable(gl.DEPTH_TEST)
			gl.stencilMask(0x00)
			this.renderer.stencilWrite = false


			shader(this.smCopy, this.rtDraw)
			draw(writeBuffer)
			swap()
		}

		if(this.smSSAO && this.enableSSAO && !this.enableWire && !this.debugStencil) {
			this.additionsVisible.off('ssao')
			this.crosshairVisible.off('ssao')
			this.cutVisibility.off('ssao')
			this.scene.overrideMaterial = this.smDepth

			gl.enable(gl.DEPTH_TEST)
			draw(this.rtTemp, this.scene, this.camera)
			gl.disable(gl.DEPTH_TEST)

			this.additionsVisible.on('ssao')
			this.crosshairVisible.on('ssao')
			this.cutVisibility.on('ssao')
			this.scene.overrideMaterial = null

			shader(this.smSSAO, readBuffer, {
				onlyAO: +this.enableOnlyAO,
				tDepth: this.rtTemp.texture
			})
			draw(writeBuffer)
			swap()
		}

		if(this.smFXAA && !this.enableWire && !this.debugStencil) for(var i = 0; i < this.timesFXAA; i++) {
			shader(this.smFXAA, readBuffer)
			draw(writeBuffer)
			swap()
		}

		if(this.smOverlay && this.enableStencil && !this.debugStencil && !this.enableWire) {

			var stencilPasses = this.highlightNodes || this.tool && this.tool.highlightNodes ? [
				this.stencilLit,
				this.stencilHover,
				this.stencilSelect,
				this.stencilInvalid

			] : [
				this.stencilHover,
				this.stencilSelect,
				this.stencilInvalid
			]

			var saaR, saaW, saaT


			this.renderer.setClearColor(0)
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

			for(var i = 0; i < stencilPasses.length; i++) {
				var pass = stencilPasses[i]

				gl.stencilFunc(gl.EQUAL, pass.value, 0xff)
				shader(this.smFill, null, { color: 0xffffff })
				clear(this.rtDraw, true, true, false)
				draw(this.rtDraw)
				gl.stencilFunc(gl.ALWAYS, 0, 0xff)


				saaR = this.rtDraw
				saaW = this.rtTemp

				if(this.smFXAA) for(var j = 0; j < this.timesFXAA; j++) {
					shader(this.smFXAA, saaR)
					draw(saaW)

					saaT = saaR
					saaR = saaW
					saaW = saaT
				}


				shader(this.smOverlay, saaR, pass.params)

				if(this.enableBlur) {
					draw(saaW)

					shader(this.smHBlur, saaW)
					draw(saaR)

					shader(this.smVBlur, saaR)
					gl.enable(gl.BLEND)
					draw(readBuffer)
					gl.disable(gl.BLEND)

					shader(this.smCopy, saaW)
					gl.enable(gl.BLEND)
					draw(readBuffer)
					gl.disable(gl.BLEND)

				} else {
					gl.enable(gl.BLEND)
					draw(readBuffer)
					gl.disable(gl.BLEND)
				}
			}

			this.renderer.setClearColor(this.bgcolor)
		}

		if(this.smFill && this.debugStencil && !this.enableWire) {
			var stencilPasses = [
				this.stencilNone,
				this.stencilLit,
				this.stencilHover,
				this.stencilSelect,
				this.stencilInvalid
			]

			for(var i = 0; i < stencilPasses.length; i++) {
				var pass = stencilPasses[i]

				gl.stencilFunc(gl.EQUAL, pass.value, 0xff)
				shader(this.smFill, null, { color: pass.params.drawColor })
				draw(this.rtDraw)
				gl.stencilFunc(gl.ALWAYS, 0, 0xff)
			}

			shader(this.smCopy, this.rtDraw)
			draw(readBuffer)
		}

		if(this.enableScreen) {
			shader(this.smCopy, readBuffer)
			draw()
		}

		this.needsRedraw = false
		this.frames++
	},

	readDrawMaterials: function() {
		var materials = main.imagery.obvMaterialsList.read()
		,   loaded = main.imagery.obvProductsLoaded.read()
		for(var i = 0; i < materials.length; i++) {
			var material = materials[i]
			var fabric = material.obvFabric.read()
			if(!loaded) material.obvLoaded.read()
		}

		return NaN
	},

	readDrawSubnodeOutlines: function() {
		var tree = this.obvTree.read()
		,   pool = Observable.unwrap(tree.obvSubnodePool)

		if(pool) for(var i = 0; i < pool.length; i++) {
			pool[i].obvSubnodeOutline.read()
		}

		return NaN
	},

	readDraw: function() {
		var tree = this.obvTree.read()
		if(!tree) return NaN

		this.obvDirty.read()

		Observable.unwrap(tree.obvDraw3)
		this.obvDrawMaterials.read()
		this.obvDrawSubnodeOutlines.read()

		this.draw()

		return NaN
	},

	bench: function(duration) {
		this.benchFrames = this.frames
		this.benchStart  = Date.now()
		this.benchEnd    = this.benchStart + (duration || 60 * 1000)

		this.benchNodes = []

		var cutter = this.tree.obvCutter.read()

		var hcuts = cutter.obvHCuts.read()
		for(var i = 0; i < hcuts.length; i++) {
			this.benchNodes.push({
				node: hcuts[i],
				speed: Math.random() * 2000 + 200,
				amplitude: Math.random() * 4,
				option: 'pos',
				value: hcuts[i].obvPos.read()
			})
		}

		var pages = cutter.obvPages.read()
		for(var plid in pages) {
			var page = pages[plid]
			,   vcuts = page.obvVCuts.read()

			for(var i = 0; i < vcuts.length; i++) {
				this.benchNodes.push({
					node: vcuts[i],
					speed: Math.random() * 2000 + 200,
					amplitude: Math.random() * 4,
					option: 'pos',
					value: vcuts[i].obvPos.read()
				})
			}
		}

		this.autoRotate = true
	},

	demolitionStart: function() {

		var vector = new THREE.Vector3
		if(this.demoitems) this.demoitems.forEach(function(item) {
			item.object.position.sub(vector.copy(item.vector).multiplyScalar(item.displace))
		})


		this.scene.updateMatrixWorld(true)

		var time   = Date.now()
		,   center = this.orbit.target
		,   demoitems = []
		this.tree.object.traverse(function(object) {
			if(!object.geometry) return

			var point  = new THREE.Vector3
			,   vector = new THREE.Vector3
			,   matrix = new THREE.Matrix3

			object.geometry.computeBoundingBox()
			object.geometry.boundingBox.getCenter(point)
			point.applyMatrix4(object.matrixWorld)

			matrix.setFromMatrix4(object.parent.matrixWorld).getInverse(matrix)
			vector.subVectors(point, center).applyMatrix3(matrix).normalize()

			demoitems.push({
				point: point,
				matrix: matrix,
				object: object,
				friction: Math.pow(0.72 + 0.1 * Math.random(), 60 / 1000),
				start: time,
				vector: vector,
				displace: 0,
				impulse: Math.random() * 4 + 0.1
			})
		})

		this.demoitems = demoitems
		this.demolition = true
	},

	demolitionEnd: function() {
		var time = Date.now()
		this.demoitems.forEach(function(item) {
			item.end = time
			item.endDisplace = item.displace
		})

		this.demolition = false
	},

	demolitionUpdate: function(t, dt) {
		var v = new THREE.Vector3

		if(this.demolition) {
			for(var i = 0; i < this.demoitems.length; i++) {
				var item = this.demoitems[i]
				,   accel = 0

				for(var j = 0; j < dt; j++) accel += Math.pow(item.friction, j)

				item.object.position.sub(v.copy(item.vector).multiplyScalar(item.displace))
				item.displace += item.impulse * accel * 0.04
				item.impulse *= Math.pow(item.friction, dt)
				item.vector = new THREE.Vector3()
					.subVectors(item.point, this.orbit.target)
					.applyMatrix3(item.matrix)
					.normalize()
				item.object.position.add(v.copy(item.vector).multiplyScalar(item.displace))
			}
			this.needsRedraw = true

		} else if(this.demoitems) {
			var modify = false

			for(var i = 0; i < this.demoitems.length; i++) {
				var item = this.demoitems[i]
				if(!item.displace) continue

				var progress = Math.min(1, (t - item.end) / (item.endDisplace * 70))
				,   phase = 1 - TWEEN.Easing.Cubic.InOut(progress)

				item.object.position.sub(v.copy(item.vector).multiplyScalar(item.displace))
				item.displace = item.endDisplace * phase
				item.object.position.add(v.copy(item.vector).multiplyScalar(item.displace))

				modify = true
			}

			if(modify) {
				this.needsRedraw = true
			} else {
				delete this.demoitems
			}
		}
	},

	update: function(t, dt, i) {
		if(!this.width || !this.visible.value) return

		if(this.benchStart && t < this.benchEnd) {

			for(var i = 0; i < this.benchNodes.length; i++) {
				var bn = this.benchNodes[i]

				var phase = Math.sin((t - this.benchStart) / bn.speed)

				bn.node.setOption(bn.option, bn.value + bn.amplitude * phase)
			}
		}

		if(this.benchStart && t > this.benchEnd) {
			var bt = t - this.benchStart
			,   bf = this.frames - this.benchFrames
			,   bs = f.mround(bf / bt * 1000, 5)

			console.log('bench for', bt +'ms:', bf, 'frames', bs, 'fps')
			this.autoRotate = false

			delete this.benchStart
			delete this.benchEnd
			delete this.benchFrames
		}

		if(this.demolition || this.demoitems) {
			this.demolitionUpdate(t, dt)
		}

		if(this.tool && this.tool.draw) {
			this.tool.draw = false
			this.needsRedraw = true
		}

		this.fpview.update(dt)
		if(this.fpview.changed) {
			this.fpview.changed = false
			this.orbit.target.add(this.fpview.delta)
			this.needsRetrace = true
			this.needsRedraw = true
		}

		if(this.autoRotate) {
			this.orbit.rotateLeft(dt / 16 * -2 * 2 * Math.PI / 60 / 60)
			this.orbit.update()
		}

		if(this.orbitTween.playing || this.cameraTween.playing) {
			this.camera.lookAt(this.orbit.target)
			this.needsRedraw = true
		}

		if(this.orbit.changed) {
			this.orbit.changed = false
			this.needsRetrace = true
			this.needsRedraw = true
		}

		if(this.orbit.radius && this.orbit.radius !== this.fpview.speed) {
			this.fpview.speed = this.orbit.radius
			this.fpview.needsUpdateForce = true
		}

		if(this.needsRetrace) {
			this.needsRetrace = false
			this.updatePointer()
			this.pointerMove()
		}

		if(this.needsRedraw) {
			this.obvDirty.write(NaN)
		}

		this.crosshair.position.copy(this.orbit.target)
		// this.crosshair.rotation.y = this.camera.rotation.y
		this.direct.target.position.copy(this.orbit.target)
		this.direct.position.copy(this.camera.position)

		this.obvDraw.read()
	}
})
