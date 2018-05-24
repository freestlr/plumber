Plumber = f.unit({
	unitName: 'Plumber',

	version: 4,

	mode: 'constructor',

	explodeEnabled: false,
	explodeStepped: false,
	explodeTimeScale: 1,

	catchFiles: false,
	catchSamples: true,

	dirSamples: '',
	srcAtlas: 'plumber-atlas.svg',
	srcCubemap: 'plumber-cubemap.png',

	stencilReplaceColor: '#00f0ff',
	stencilDeleteColor: '#ff5500',

	initFromHash: false,

	init: function(options) {
		console.log('PB version', this.version)

		this.get   = new Loader
		this.timer = new Timer(this.onTick, this)
		this.ready = new Defer

		this.imagery = new Imagery

		this.events = new EventEmitter

		this.sampler = new Sampler
		this.sampler.setImagery(this.imagery)



		this.connectionParts = []


		this.renderer = new THREE.WebGLRenderer({
			alpha: false,
			depth: true,
			stencil: true,
			antialias: true,
			preserveDrawingBuffer: true
		})
		this.renderer.autoClear = false
		this.canvas = this.renderer.domElement


		this.tiles = new TileView
		this.element = this.tiles.element

		this.clipboard = dom.elem('textarea', null, this.element)
		dom.style(this.clipboard, {
			position: 'absolute',
			zIndex: '-1'
		})

		this.view = new View3({
			ename: 'view-3 view-3-1',
			renderer: this.renderer,
			imagery: this.imagery,
			// clearColor: 0xFF00FF
		})

		this.enableViewRaycast = new Gate(Gate.AND, true)
		this.enableViewRaycast.events.on('change', function(enabled) {
			this.view.enableRaycast = enabled
		}, this)

		this.view2 = new View3({
			ename: 'view-3 view-3-2',
			renderer: this.renderer,
			imagery: this.imagery,
			// enableSSAO: false,
			// enableStencil: false,
			enableRaycast: false
			// clearColor: 0x00FF00
		})

		this.loading = new UI.LoadingBox

		this.viewTween = new TWEEN.Tween({ split: 0 })
			.to({ split: 0 }, 400)
			.easing(TWEEN.Easing.Cubic.Out)
			.onStart(this.onViewTweenStart, this)
			.onHalfway(this.onViewTweenHalfway, this)
			.onUpdate(this.onViewTweenUpdate, this)
			.onComplete(this.onViewTweenComplete, this)



		this.createDOM()

		this.setParams(options)
		this.setMode(this.mode, true)

		this.fetch()
	},


	createDOM: function() {
		this.buttonRoot = dom.div('vp-button-root', this.element)

		this.actionList = new Block.List({
			eroot: this.buttonRoot,
			ename: 'vp-list vp-list-action',
			template: {
				factory: Block.Toggle,
				ename: 'vp-button out-01',
				reset: true
			},

			items: [
				{ data: 'zoom_in',    attr: { icon: 'i-zoom-in',  title: 'Zoom in'    } },
				{ data: 'zoom_out',   attr: { icon: 'i-zoom-out', title: 'Zoom out'   } },
				{ data: 'zoom_fit',   attr: { icon: 'i-zoom-fit', title: 'Fit screen' } },
				{ data: 'explode',    attr: { icon: 'i-explode',  title: 'Exploded view' }, reset: false, eroot: this.element },
				{ data: 'screenshot', attr: { icon: 'i-photo',    title: 'Screen shot' } },
				{ data: 'rotate',     attr: { icon: 'i-autorotate', title: 'Auto rotate' }, reset: false },
			],

			events: {
				'block_add': function(block) {
					block.events.on(block.reset ? 'active' : 'change', this.onAction, this, block.data)
				}
			},
			eventScope: this
		})

		this.displayMenu = new Block.Menu({
			eroot: this.buttonRoot,
			ename: 'vp-menu vp-menu-display',
			template: {
				deselect: false,
				ename: 'vp-button out-01'
			},
			items: [
				{ data: 'transparent', attr: { icon: 'i-dis-transparent', title: 'Transparent view' } },
				{ data: 'normal',      attr: { icon: 'i-dis-normal',      title: 'Normal view'      } },
				{ data: 'wireframe',   attr: { icon: 'i-dis-wireframe',   title: 'Wireframe view'   } }
			],
			active: 1,

			events: {
				'change': this.onDisplayChange
			},
			eventScope: this
		})

		this.projectionMenu = new Block.Menu({
			eroot: this.buttonRoot,
			ename: 'vp-menu vp-menu-projection',
			template: {
				deselect: false,
				ename: 'vp-button out-01'
			},
			items: [
				{ data: 'perspective', camera: [ 1,  1,  1], attr: { icon: 'i-prj-perspective', title: 'Perspective' } },
				{ data: 'left',        camera: [-1,  0,  0], attr: { icon: 'i-prj-left',        title: 'Left'        } },
				{ data: 'right',       camera: [ 1,  0,  0], attr: { icon: 'i-prj-right',       title: 'Right'       } },
				{ data: 'top',         camera: [ 0,  1,  0], attr: { icon: 'i-prj-top',         title: 'Top'         } },
				{ data: 'bottom',      camera: [ 0, -1,  0], attr: { icon: 'i-prj-bottom',      title: 'Bottom'      } },
				{ data: 'front',       camera: [ 0,  0,  1], attr: { icon: 'i-prj-front',       title: 'Front'       } },
				{ data: 'back',        camera: [ 0,  0, -1], attr: { icon: 'i-prj-back',        title: 'Back'        } }
			],
			active: 0,

			events: {
				'change': this.onProjectionChange
			},
			eventScope: this
		})


		splitViewMessage: {
			this.splitViewMessage = dom.div('split-view-message')
			dom.text(this.splitViewMessage, 'no compatible connections')
			this.splitViewMessageVisible = new Gate(Gate.AND, true)
			this.splitViewMessageVisible.events.on('change', dom.display, dom, this.splitViewMessage)
			this.splitViewMessageVisible.events.on('opened', this.updateSplitViewMessagePosition, this)
			this.splitViewMessageVisible.off('g_svm_cons')
		}


		emptyViewMessage: {
			this.emptyViewMessage = dom.div('empty-view-message out-03 absmid')
			var center = dom.div('empty-view-message-center absmid', this.emptyViewMessage)
			,   frame  = dom.div('empty-view-message-frame absmid', this.emptyViewMessage)
			,   text   = dom.div('empty-view-message-text absmid', this.emptyViewMessage)

			f.nop(center, frame)
			dom.html(text, ['please', 'add', 'any product'].join('<br/>'))

			this.emptyViewMessageVisible = new Gate(Gate.AND, true)
			this.emptyViewMessageVisible.events.on('change', function(visible) {
				dom.togclass(this.emptyViewMessage, 'hidden', !visible)
			}, this)
		}


		dom.addclass(this.element, 'ontouchstart' in window ? 'touch' : 'no-touch')
		dom.addclass(this.element, 'plumber')
		dom.addclass(this.canvas, 'canvas-main')
		dom.prepend(this.element, this.canvas)
		dom.append(this.element, this.splitViewMessage)
		dom.append(this.element, this.emptyViewMessage)
		dom.display(this.canvas, false)
	},

	setParams: function(params) {
		for(var name in params) switch(name) {
			case 'eroot':
				dom.append(params.eroot, this.element)
			break

			case 'mode':
				this.mode = params.mode
			break

			case 'dirSamples':
				this.sampler.folder = params.dirSamples
			break

			case 'initFromHash':
				this.initFromHash = !!params.initFromHash
			break

			default:
				if(name in this) this[name] = params[name]
			break
		}
	},

	setMode: function(mode, force) {
		if(mode !== 'constructor' && mode !== 'viewer') {
			console.warn('unknown mode given:', mode, 'fallback to "viewer"')
			mode = 'viewer'
		}

		if(this.mode === mode && !force) return
		this.mode = mode

		this.modeis = {
			ctr: mode === 'constructor',
			vwr: mode === 'viewer'
		}

		var layout
		,   clients
		switch(mode) {
			case 'constructor':
				layout = ['h', 0, 0, 1]
				clients = [this.view, this.view2]
			break

			default:
			case 'viewer':
				layout = 0
				clients = [this.view]
			break
		}

		this.enableViewRaycast.set(this.modeis.ctr, 'g_vr:mode')

		this.tiles.setLayout(layout)
		this.tiles.setClients(clients)


		dom.setclass(this.element, {
			'mode-constructor' : this.modeis.ctr,
			'mode-viewer'      : this.modeis.vwr
		})

		dom.display(this.view.clearButton, this.modeis.ctr)
		dom.display(this.view2.clearButton, this.modeis.ctr)
		dom.display(this.buttonRoot, this.modeis.vwr)


		this.splitViewFrame = this.tiles.splits[0]
		this.splitScreen(false)
		this.view2.setTree(null)
		// this.clearTree()




		this.updateMarkerVisibility()
		this.view .markers.markersVisible.set(!!this.modeis.ctr, 'g_m_mode')
		this.view2.markers.markersVisible.set(!!this.modeis.ctr, 'g_m_mode')


		this.onViewTweenUpdate(1)
		this.onViewTweenComplete()
		// this.tiles.update()
	},

	makeGUI: function() {
		var self = this

		this.gui = new dat.GUI({
			// autoPlace: false,
			hideable: false
		})


		var slots = [
			'stencilLit',
			'stencilHover',
			'stencilSelect'
		]

		this.gui.closed = true

		this.gui.addColor(this.view, 'clearColor').name('Clear').onChange(redraw)
		this.gui.add(this.view, 'enableRender').name('Render').onChange(redraw)
		this.gui.add(this.view, 'debugDepth').name('Show Depth').onChange(redraw)
		this.gui.add(this.view, 'enableStencil').name('Enable Stencil').onChange(redraw)
		this.gui.add(this.view, 'enableStencilAA').name('AA Stencil').onChange(redraw)
		this.gui.add(this.view, 'enableStencilBloom').name('Bloom Stencil').onChange(redraw)
		this.gui.add(this.view, 'enableSSAO').name('SSAO').onChange(redraw)
		this.gui.add(this.view, 'enableOnlyAO').name('Only AO').onChange(redraw)
		this.gui.add(this.view, 'enableAAAO').name('AA AO').onChange(redraw)
		this.gui.add(this.view, 'enableBlurAO').name('Blur AO').onChange(redraw)
		this.gui.add(this.view, 'enableBloomAO').name('Bloom AO').onChange(redraw)

		var au = this.view.smSSAO.uniforms
		,   ao = this.gui.addFolder('Occlusion')
		// ao.add(au.cameraNear, 'value').min(0).max(1000).name('cameraNear').onChange(redraw)
		// ao.add(au.cameraFar,  'value').min(0).max(1000).name('cameraFar').onChange(redraw)
		ao.add(au.diffArea,   'value').min(0).max(2).name('diffArea').onChange(redraw)
		ao.add(au.gDisplace,  'value').min(0).max(2).name('gDisplace').onChange(redraw)
		ao.add(au.radius,     'value').min(0).max(50).name('radius').onChange(redraw)
		ao.add(au.aoClamp,    'value').min(0).max(2).name('aoClamp').onChange(redraw)
		ao.add(au.aoMin,      'value').min(0).max(1).name('aoMin').onChange(redraw)

		slots.forEach(function(slot) {
			var fd = this.gui.addFolder(slot)
			var params = this.view[slot].params

			fd.addColor(params, 'drawColor').onChange(redraw)
			fd.add(params, 'drawAlpha').min(0).max(1).onChange(redraw)
			fd.add(params, 'lineAlpha').min(0).max(1).onChange(redraw)
			fd.add(params, 'lineAngle').min(0).max(360).onChange(redraw)
			fd.add(params, 'edgeAlpha').min(0).max(1).onChange(redraw)
			fd.add(params, 'fillAlpha').min(0).max(1).onChange(redraw)
		}, this)


		this.gui.add(this, 'explodeStepped').name('Explode Step')

		var light = this.gui.addFolder('Light')
		light.add(this.view, 'directAngle').min(-1).max(1).name('Direct Angle').onChange(relight)
		light.add(this.view, 'directK').min(-1).max(1).name('Direct K').onChange(relight)
		light.add(this.view, 'directLift').min(-1).max(1).name('Direct Lift').onChange(relight)
		light.add(this.view.dirLight, 'intensity').min(0).max(1).name('Direct Power').onChange(redraw)
		light.add(this.view.ambLight, 'intensity').min(0).max(1).name('Ambient Power').onChange(redraw)

		this.gui.add(this.viewTween, 'durationTime').min(400).max(10000).name('Split Time')
		this.gui.add(this, 'explodeTimeScale').min(0.1).max(90).name('Conn Scale')


		function relight() {
			self.view.updateLights()
			self.view.needsRedraw = true
		}

		function redraw() {
			self.view.needsRedraw = true
			self.view2.needsRedraw = true
		}

		function explode(value) {
			if(!self.tree) return

			self.tree.traverseConnections(f.func('transitionProgress', 1 - value))
			self.view.needsRedraw = true
		}
	},

	fetch: function() {
		this.get.xml(this.srcAtlas)
			.then(Atlas.setSource)

		this.get.image(this.srcCubemap)
			.then(this.imagery.unwrapCubemap3x2, this.imagery)

		this.get.ready().then(this.run, this, null, true)
	},

	run: function() {
		this.makeGUI()

		new EventHandler(this.onresize, this).listen('resize',  window)
		new EventHandler(this.onkey,    this).listen('keydown', window, true)
		new EventHandler(this.onkey,    this).listen('keyup',   window, true)
		new EventHandler(this.onTap,    this).listen('tap',     this.element)

		new EventHandler(this.onDragOver, this).listen('dragover', this.view .element)
		new EventHandler(this.onDragOver, this).listen('dragover', this.view2.element)
		new EventHandler(this.onDrop,     this).listen('drop',     this.view .element)
		new EventHandler(this.onDrop,     this).listen('drop',     this.view2.element)


		this.tiles.events.on('update', this.onTilesUpdate, this)

		this.view.events.on('connection_select', this.onConnectionSelect, this, [this.view, 0])
		this.view2.events.on('connection_select', this.onConnectionSelect, this, [this.view2, 1])

		this.view.events.on('view_clear', this.onViewClear, this)
		this.view2.events.on('view_clear', this.onViewClear2, this)

		this.view.events.on('node_select', this.onNodeSelect, this)

		dom.display(this.canvas, true)
		this.onresize()



		this.view.onTick(0)
		this.view2.onTick(0)

		if(typeof bootProgress === 'function') bootProgress(1)

		this.ready.resolve(true)

		if(this.initFromHash) {
			this.loadFromHash()
		}

		this.timer.play()
	},

	loadFromHash: function() {
		var hash = location.hash.slice(1)
		if(hash) try {
			this.importString(hash, true)
			location.hash = ''

		} catch(e) {
			console.warn('loadFromHash failed:', e)
		}
	},





	onAction: function(action, active) {
		switch(action) {
			case 'zoom_in':
				this.view.zoom(1.5)
				this.view2.zoom(1.5)
			break

			case 'zoom_out':
				this.view.zoom(1/1.5)
				this.view2.zoom(1/1.5)
			break

			case 'zoom_fit':
				this.view.focusOnTree()
				this.view2.focusOnTree()
			break

			case 'explode':
				this.explode(active)
			break

			case 'rotate':
				this.autorotate(active)
			break

			case 'screenshot':
				this.makeScreenshot()
			break
		}
	},

	getConnectionsArray: function() {
		return this.tree.retrieveConnections({ connected: true }, true)
	},

	exportJSON: function(tree) {
		return TSerial.toJSON(tree || this.tree)
	},

	importJSON: function(json, animate) {
		return TSerial.fromJSON(json, this.sampler, animate).then(this.setTree1, this)
	},

	exportString: function(tree) {
		return TSerial.toString(this.exportJSON(tree))
	},

	importString: function(string, animate) {
		return this.importJSON(TSerial.fromString(string), animate)
	},


	litModeStart: function(mode, nodes) {
		switch(mode) {
			case 'replace':
				this.view.stencilLit.params.drawColor = this.stencilReplaceColor
				this.view.stencilRaycastMask =
					this.view.stencilLit    .value |
					this.view.stencilHover  .value |
					this.view.stencilSelect .value
			break

			case 'delete':
				this.view.stencilLit.params.drawColor = this.stencilDeleteColor
				this.view.stencilRaycastMask = ~0
			break

			case 'parent':
				this.view.stencilLit.params.drawColor = this.stencilReplaceColor
				this.view.stencilRaycastMask = 0
			break
		}

		if(nodes) {
			this.view.litNodeList(nodes, true)
		}
	},

	litModeClear: function() {
		this.view.litNodeList(this.view.highlightedNodes, false)

		this.view.needsRedraw = true
		this.view.stencilRaycastMask = ~0
	},

	shotElement: function(src, w, h) {
		var view = this.viewN
		if(!view) {
			view = this.viewN = new View3({
				renderer: this.renderer,
				imagery: this.imagery,
				enableStencil: false,
				enableRaycast: false
			})
		}

		return this.sampler.prepare(src).then(function(sample) {
			var target = view.renderTarget
			if(!target || target.width !== w || target.height !== h) {
				target = view.renderTarget = new THREE.WebGLRenderTarget(w, h, {
					minFilter: THREE.LinearFilter,
					magFilter: THREE.LinearFilter,
					format: THREE.RGBAFormat
				})
			}

			view.setSize(w, h)
			view.setTree(new TNode(sample))
			view.focusOnTree(0)
			view.onTick(0)

			var gl = this.renderer.context
			,   fb = target.__webglFramebuffer

			var ctx = this.imagery.makeCanvas(w, h)
			,   pix = ctx.createImageData(w, h)
			,   arr = new Uint8Array(pix.data.buffer)

			gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
			gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, arr)

			view.setTree(null)

			ctx.putImageData(pix, 0, 0)
			return ctx.canvas
		}, this)
	},



	deleteNodeWithPrompt: function(node) {
		if(!node) return

		var list = node.pinch()
		if(!list || !list.nodes.length) {
			return

		} else if(list.nodes.length < 2) {
			this.deleteNodeList(list)
			return
		}


		this.view.selectNode(null)
		this.view.hoverNode(null)
		this.litModeStart('delete', list.nodes)


		this.deletePromptTip = new UI.Prompt({
			tipRoot: this.element,

			arrow: false,
			align: 'bottom',
			distance: 64,
			point: this.view.projector.addPoint(),

			attr: {
				label: ['Do you want to delete', list.nodes.length, 'nodes?'].join(' ')
			},

			deletingNode: node,
			deletingList: list,

			buttonsTemplate: {
				eventScope: this
			},

			buttons: [{
				data: true,
				text: 'Yes',
				events: { 'active': this.deleteNodeFromPrompt }

			}, {
				data: false,
				text: 'No',
				events: { 'active': this.closeDeletePromptAndSelectNode }
			}]
		})

		this.deletePromptTip.visible.on()
	},

	deleteNodeFromPrompt: function(node) {
		var tip = this.deletePromptTip
		if(!tip) return

		this.deleteNodeList(tip.deletingList)
		this.closeDeletePrompt()
	},

	closeDeletePrompt: function() {
		var tip = this.deletePromptTip
		if(!tip) return

		this.view.litNodeList(this.view.highlightedNodes, false)

		tip.visible.off()
		delete this.deletePromptTip
	},

	closeDeletePromptAndSelectNode: function() {
		var tip = this.deletePromptTip
		this.view.selectNode(tip && tip.deletingNode || null)
		this.closeDeletePrompt()
	},





	autorotate: function(rotate) {
		this.view.orbit.autoRotate = rotate
		this.view2.orbit.autoRotate = rotate
	},

	onDisplayChange: function(display) {
		var isTransparent = display === 'transparent'
		,   isNormal      = display === 'normal'
		,   isWireframe   = display === 'wireframe'

		this.imagery.sampleMaterials.forEach(function(m) {

			if(isTransparent) {
				m.__pl_display_set = true
				m.__pl_transparent = m.transparent
				m.__pl_opacity     = m.opacity
				m.__pl_depthtest   = m.depthTest
				m.__pl_depthwrite  = m.depthWrite

				m.transparent = true
				m.opacity     = 0.5
				m.depthTest   = false
				m.depthWrite  = false

				m.needsUpdate = true

			} else if(m.__pl_display_set) {
				m.transparent = m.__pl_transparent
				m.opacity     = m.__pl_opacity
				m.depthTest   = m.__pl_depthtest
				m.depthWrite  = m.__pl_depthwrite

				delete m.__pl_transparent
				delete m.__pl_opacity
				delete m.__pl_depthtest
				delete m.__pl_depthwrite
				delete m.__pl_display_set

				m.needsUpdate = true
			}

		}, this)

		this.view.enableRender = isNormal || isTransparent
		this.view.enableWireframe = isWireframe
		this.view.needsRedraw = true

		this.view2.enableRender = isNormal || isTransparent
		this.view2.enableWireframe = isWireframe
		this.view2.needsRedraw = true
	},

	onProjectionChange: function(projection) {
		var block = this.projectionMenu.getBlock(projection)

		var isPerspective = projection === 'perspective'

		this.view.camera.fov = isPerspective ? 30 : 0.5
		this.view.camera.updateProjectionMatrix()

		this.view2.camera.fov = isPerspective ? 30 : 0.5
		this.view2.camera.updateProjectionMatrix()

		this.view.camera.position
			.fromArray(block.camera)
			.setLength(this.view.getFitDistance())
			.add(this.view.currentDim.center)

		this.view2.camera.position
			.fromArray(block.camera)
			.setLength(this.view2.getFitDistance())
			.add(this.view2.currentDim.center)

		this.view.orbit.target.copy(this.view.currentDim.center)
		this.view2.orbit.target.copy(this.view2.currentDim.center)

		this.view.orbit.orthoMode = !isPerspective
		this.view2.orbit.orthoMode = !isPerspective

		this.view.orbit.update()
		this.view2.orbit.update()
		this.view.needsRedraw = true
		this.view2.needsRedraw = true
	},

	makeScreenshot: function() {
		var time = new Date().toISOString().split('.')[0].replace(/:/g, '.')

		this.canvas.toBlob(function(blob) {
			saveAs(blob, 'pb-screen-'+ time +'.jpg')

		}, 'image/jpeg', 0.95)
	},

	onViewClear: function() {
		this.clearTree()
	},

	onViewClear2: function() {
		this.splitScreen(false)
		if(this.addElementDefer) {
			this.addElementDefer.reject({ status: 'canceled' })
		}
	},

	clearTree: function() {
		this.splitScreen(false)

		if(this.tree) this.deleteNodeList(this.tree.pinchr())
	},


	onViewTweenUpdate: function(t) {
		if(!this.splitViewFrame) return

		this.splitViewFrame.position = 1 - this.viewTween.source.split / 2
		this.tiles.update()

		var dim = this.explodeEnabled ? this.view.explodeDim : this.view.assembleDim
		var fit = this.splitScreenEnabled ? 5/4 : 5/3

		this.view.focusOnTree(0, dim, fit, t)
	},

	onViewTweenHalfway: function() {
		this.updateMarkerVisibility()
	},

	onViewTweenStart: function() {
		dom.display(this.tiles.ehelpers, true)
	},

	onViewTweenComplete: function() {
		if(!this.splitScreenEnabled) {
			this.view2.setTree(null)
			this.sampleView2 = null
		}

		dom.display(this.tiles.ehelpers, this.splitScreenEnabled)
	},

	explode: function(enabled) {
		if(this.explodeStepDefer) {
			this.explodeStepDefer.abort()
			delete this.explodeStepDefer
		}

		if(this.explodeEnabled === enabled) return
		this.explodeEnabled = enabled

		this.actionList.getBlock('explode').set(enabled)

		var view = this.view.tree ? this.view : this.view2
		,   tree = view.tree
		if(!tree) return

		var scale = this.explodeTimeScale
		var focusTime = 1500

		if(this.explodeStepped) {
			var list = []
			,   level = 0

			tree.traverseConnections(function(con, data, level) {
				if(!con.connected || !con.master) return

				if(!list[level]) {
					list[level] = []
				}

				list[level].push(con)
			})

			function runStep() {
				var cons = list[level++]
				if(!cons) return

				var defers = []
				for(var i = 0; i < cons.length; i++) {
					var con = cons[i]

					var defer = new Defer
					con.events.once('connect_end', defer.resolve, defer)
					con.playConnection(enabled ? 0 : 1, null, 0.4 * scale)

					defers.push(defer)
				}

				this.explodeStepDefer = Defer.all(defers).then(runStep, this)
			}

			runStep.call(this)

		} else {
			tree.traverseConnections(function(con) {
				if(con.connected && con.master) {
					con.playConnection(enabled ? 0 : 1, null, scale)
					if(focusTime < con.transitionTime) focusTime = con.transitionTime
				}
			})
		}

		var time = focusTime * scale
		,   dim = enabled ? view.explodeDim : view.assembleDim
		,   fit = enabled ? 5/4 : 4/3
		,   easing = enabled ? TWEEN.Easing.Quadratic.Out : TWEEN.Easing.Quadratic.InOut

		view.focusOnTree(time, dim, fit, null, null, easing)
	},

	explodeNode: function(node, exploded) {
		if(!node.upcon) return

		var master = node.upcon.connected

		master.playConnection(exploded ? 0 : 1, null, 0.6 * this.explodeTimeScale)
	},

	splitScreen: function(enabled) {
		if(this.mode === 'viewer' && enabled) return
		if(this.splitScreenEnabled === !!enabled) return
		this.splitScreenEnabled = !!enabled


		this.splitViewMessageVisible.set(this.splitScreenEnabled, 'g_svm_screen')
		this.enableViewRaycast.set(!this.splitScreenEnabled, 'g_vr:split')

		this.view.hoverNode(null)
		this.view.selectNode(null)
		this.view.selectConnection(null)

		var split = this.splitScreenEnabled ? 1 : 0
		if(split !== this.viewTween.target.split) {
			this.viewTween.target.split = split
			this.viewTween.start()
		}

		this.updateMarkerVisibility()
	},

	isComplexFigure: function(figure) {
		return figure && figure.types && figure.types.length
	},

	isAlias: function(alias) {
		return alias && typeof alias === 'string'
	},

	constructNode: function(src, alias) {
		if(!src) return Defer.complete(true)

		if(alias && !this.isAlias(alias)) {
			alias = null
			console.error('construct: only string aliases allowed: ', alias)
		}

		if(this.ready.pending) {
			// wait for env map
			return this.ready.then(f.binda(this.constructNode, this, arguments))
		}

		var parentView = this.splitScreenEnabled ? this.view2 : this.view
		if(this.loading.element.parentNode !== parentView.element) {
			dom.append(parentView.element, this.loading.element)
		}

		this.loading.setProgress(0)
		this.loading.visible.on()

		this.emptyViewMessageVisible.off('g_evm_tree')

		return this.sampler.prepare(src).then(function(sample) {
			this.loading.setProgress(1)
			this.loading.visible.off()

			var node = TSerial.isComplex(sample)
				? TSerial.constructJSON(sample, this.sampler, false)
				: new TNode(sample)

			if(alias) node.setId(alias)

			return node

		}, function(e) {
			this.loading.setProgress(1)
			this.loading.visible.off()
			throw e

		}, function(p) {
			this.loading.setProgress(Loader.commonProgress([].concat(p)))

		}, this)
	},


	setTree2: function(node) {
		if(!node) return

		this.view2.setTree(node)

		if(this.viewTween.source.split !== this.viewTween.target.split) {
			var kw = 1 - this.viewTween.target.split / 2
			,   tw = this.tiles.width * kw
			,   th = this.tiles.height

			this.view2.focusOnTree(0, null, 5/4, null, tw / th)
		}

		this.updateConnectionGroups(this.view.tree, this.view2.tree)
		this.updateMarkerVisibility()
	},

	setTree1: function(tree) {
		this.tree = tree
		this.view.setTree(this.tree)
		this.emptyViewMessageVisible.set(!this.tree, 'g_evm_tree')
	},


	getElementIdList: function() {
		var list = []

		this.tree.traverse(function(node) {
			list.push(node.id)
		}, this)

		return list
	},

	getElementById: function(id) {
		var found = null
		this.tree.traverse(function(node) {
			if(node.id === id) {
				found = node
				return TNode.TRSTOP
			}
		})

		return found
	},

	updateMarkerVisibility: function() {
		var visible = this.view2.tree
			&& this.viewTween.target.split === 1
			&& this.viewTween.source.split > 0.5

		if(this.debug) visible = true

		this.view .markers.markersVisible.set(!!visible, 'g_m_split')
		this.view2.markers.markersVisible.set(!!visible, 'g_m_split')
	},

	updateConnectionGroups: function(tree, tree2) {
		this.cons  = tree  && tree .retrieveConnections({ connected: false }, true) || []
		this.cons2 = tree2 && tree2.retrieveConnections({ connected: false }, true) || []

		var groups2 = []

		for(var i = 0; i < this.cons2.length; i++) {
			this.cons2[i].group = -1
		}

		for(var i = 0; i < this.cons.length; i++) {
			var con = this.cons[i]
			var list = con.canConnectList(this.cons2)

			con.group = -1

			if(list.length) {
				var found = false
				for(var j = 0; j < groups2.length; j++) {

					if(!f.seq(list, groups2[j])) continue

					con.group = j
					found = true
					break
				}

				if(!found) {
					var gi = groups2.length

					con.group = gi
					for(var j = 0; j < list.length; j++) {
						list[j].group = gi
					}

					groups2.push(list)
				}
			}
		}


		this.hasAvailableConnections = groups2.length
		this.splitViewMessageVisible.set(!this.hasAvailableConnections, 'g_svm_cons')
		this.updateSplitViewMessagePosition()
		this.updateConnectionVisibilitySets()

		if(this.addElementDefer && !this.hasAvailableConnections) {
			this.addElementDefer.reject({ status: 'rejected', reason: 'no match' })
		}

		this.view.needsRetrace = true
	},

	updateConnectionVisibilitySets: function() {
		if(this.cons) for(var i = 0; i < this.cons.length; i++) {
			this.updateConnectionVisibility(this.cons[i], this.connectionParts[1])
		}
		if(this.cons2) for(var i = 0; i < this.cons2.length; i++) {
			this.updateConnectionVisibility(this.cons2[i], this.connectionParts[0])
		}
	},

	updateConnectionVisibility: function(con, match) {
		var available = con.group !== -1
		,   compatible = match ? con.canConnect(match) : true

		con.inactive.set(!available || !compatible, 'view2')

		if(con.marker) {
			con.marker.visible.set(!this.hasAvailableConnections || available, 'active')
			con.marker.updateState()
		}
	},

	connectRandomNode: function() {
		var samples = f.sort(this.sampler.samples.slice(), Math.random)

		if(!this.tree && samples.length) {
			return this.constructNode(samples[0].src).then(this.setTree1, this)
		}

		var cons = this.tree.retrieveConnections({ connected: false }, true)
		f.sort(cons, Math.random)

		for(var i = 0; i < cons.length; i++) {
			var conA = cons[i]
			,   jointA = conA.joint

			for(var j = 0; j < samples.length; j++) {
				var sample = samples[j]

				if(!sample.object) {
					this.sampler.prepare(sample.src)
					continue
				}

				for(var k = 0; k < sample.joints.length; k++) {
					var jointB = sample.joints[k]
					if(!jointA.canConnect(jointB)) continue

					var node = new TNode(sample)
					this.makeConnection(conA, node.connections[k], true)

					return
				}
			}
		}
	},

	connectNodeSomewhere: function(node) {
		if(!node) return

		if(!this.tree) return this.setTree1(node)


		var cons = this.tree.retrieveConnections({ connected: false }, true)

		f.sort(cons, Math.random)

		loop_cons:
		for(var i = 0; i < cons.length; i++) {
			var conA = cons[i]

			for(var j = 0; j < node.connections.length; j++) {
				var conB = node.connections[j]
				if(!conB.canConnect(conA)) continue

				this.makeConnection(conA, conB, true)


				break loop_cons

				if(conB.canConnect(conA)) {
					this.makeConnection(conA, conB, true)
					break loop_cons
				}
			}
		}

		if(this.splitScreenEnabled) {
			this.updateConnectionGroups(this.view.tree, this.view2.tree)
		}
	},


	commonMethodMessages: {
		src: 'bad element: [#{src}]',
		id: 'invalid node id: [#{id}]',
		con: 'node [#{type}] don\'t have connection: [#{index}]',
		used: 'connection [#{type}][#{index}] already used',
		match: 'connections [#{typeA}][#{indexA}] and [#{typeB}][#{indexB}] don\'t match'
	},

	deferMethod: function(method, params, eventName, messages) {
		return new Defer().anyway(function(value, success) {
			var result = {
				method: method,
				params: params,
				success: success,
				status: success ? 'connected' : 'rejected'
			}

			if(typeof value === 'object') {
				f.copy(result, value)
			}

			if(!success) {
				var messages = this.commonMethodMessages
				result.reason = !value ? 'unknown error'
					: !value.msg ? value
					: !messages[value.msg] ? 'undefined error'
					: f.implode(messages[value.msg], value)
			}

			this.events.emit(eventName, result)
			if(success) return value
			else throw result
		}, this)
	},



	addElement: function(alias, src, link) {
		var defer = this.deferMethod('addElement', arguments, 'onAddElement')


		this.view2.setTree(null)

		var split = this.tree && this.mode !== 'viewer'
		this.splitScreen(split)

		return this.constructNode(src, alias).then(function(node) {
			if(split) {
				this.setTree2(node)
				return this.addElementDefer = new Defer

			} else {
				this.setTree1(node)

				var nodes = []
				node.traverse(function(n) {
					nodes.push(n.id)
				})

				return {
					root: node,
					nodes: nodes
				}
			}
		}, this).push(defer)
	},


	connectElement: function(src, indexA, id, indexB, animate, alias) {
		var defer = this.deferMethod('connectElement', arguments, 'onConnectElement')

		var nodeB = this.getElementById(id)
		if(!nodeB) {
			defer.reject({ msg: 'id', id: id })
		}

		var conB = nodeB.connections[indexB]
		if(!conB) {
			defer.reject({ msg: 'con', type: nodeB.type, index: indexB })
		}

		if(conB.connected) {
			defer.reject({ msg: 'used', type: nodeB.type, index: indexB })
		}

		this.constructNode(src, alias).then(function(nodeA) {
			var conA = nodeA.connections[indexA]
			if(!conA) {
				defer.reject({ msg: 'con', type: nodeA.type, index: indexA })
			}

			if(!conB.canConnect(conA)) {
				defer.reject({ msg: 'match', typeA: nodeA.type, indexA: indexA, typeB: nodeB.type, indexB: indexB })
			}

			var nodes = []
			,   rootA = conA.node
			rootA.traverse(function(node) { nodes.push(node.id) })

			this.makeConnection(conB, conA, animate)

			defer.resolve({
				root: rootA,
				nodes: nodes
			})

		}, function() {
			defer.reject({ msg: 'src', src: src })

		}, this)

		return defer
	},



	replaceElement: function(src, param) {
		var defer = this.deferMethod('replaceElement', arguments, 'onReplaceElement')

		if(this.tree) {
			this.sampler.prepare(src).then(function(sample) {
				return this.replaceElementBySample(sample, param)

			}, this).push(defer)

		} else {
			defer.reject('nothing to replace')
		}

		return defer
	},

	replaceElementBySample: function(sample, param) {
		if(!this.tree) throw 'nothing to replace'
		if(!sample) throw 'bad element'


		var replaceable = []

		if(param === -1 || param === 0) {
			this.tree.traverse(function(node) {
				if(node.canBeReplacedBy(sample)) replaceable.push(node)
			}, this)

		} else {
			var node = param instanceof TNode ? param : this.getElementById(param)
			if(!node) {
				throw 'invalid param: '+ param
			}
			if(!node.canBeReplacedBy(sample)) {
				throw 'sample can\'t replace this node: '+ param
			}

			replaceable.push(node)
		}

		if(!replaceable.length) {
			throw 'no suitable nodes'
		}

		// replace one of list
		if(param === 0 && replaceable.length > 1) {
			this.litModeStart('replace', replaceable)

			return this.issuedReplaceDefer = new Defer(function(node) {
				delete this.issuedReplaceDefer
				this.litModeClear()

				var replacedByOne = this.replaceNode(node, sample, true)

				return {
					status: 'replaced',
					replaced: [node.id],
					nodes: [replacedByOne.id]
				}
			}, this)
		}


		var select = this.mode === 'constructor' && replaceable.length === 1

		var replacedBy = []
		replaceable.forEach(function(node) {
			var replacedByOne = this.replaceNode(node, sample, select, param)
			replacedBy.push(replacedByOne.id)
		}, this)

		this.view.needsRedraw = true


		return {
			status: 'replaced',
			replaced: replaceable.map(f.prop('id')),
			nodes: replacedBy
		}
	},

	replaceNode: function(node, sample, select, alias) {
		if(!node || !sample || !node.canBeReplacedBy(sample)) {
			return null
		}

		var replacer = new TNode(sample)
		,   nextRoot = node.upcon ? this.view.tree : replacer
		,   rotation = node.upcon ? node.upcon.rotar : 0

		if(this.isAlias(alias)) {
			replacer.setId(alias)
		}

		replacer.replace(node)

		if(rotation && replacer.upcon) {
			replacer.upcon.rotate(rotation, false)
		}

		this.setTree1(nextRoot)

		if(select) this.view.selectNode(replacer)

		return replacer
	},

	getNodeReplacers: function(node, list) {

		var replacers = []
		if(node) for(var i = 0; i < list.length; i++) {
			var sample = list[i]

			if(node.canBeReplacedBy(sample)) {
				replacers.push(sample)
			}
		}

		return replacers
	},

	preloadAllSamples: function() {
		// this.sampler.samples.forEach(f.func('load'))
	},


	showNodeParent: function(node, enabled) {
		var parent = node && node.upnode
		if(!parent) return

		if(enabled) {
			this.litModeStart('parent')
		} else {
			this.litModeClear()
		}
		this.view.litNode(parent, enabled)
	},

	rotateNode: function(node, angle, animate) {
		if(typeof angle !== 'number') {
			angle = Math.PI / 6
		}
		if(node instanceof TNode === false) {
			node = this.getElementById(node)
		}
		if(node) {
			node.rotate(angle, true)
			this.view.needsRedraw = true
		}
	},


	deleteNodeList: function(list) {
		if(!list) return

		if(list.nextRoot && this.tree !== list.nextRoot) {
			list.nextRoot.goRoot(false)
		}
		if(list.removeCon) {
			list.removeCon.disconnect()
		}

		this.setTree1(list.nextRoot)


		this.events.emit('onRemoveElement', {
			nodes: list.nodes.map(function(node) { return node.id })
		})
	},


	onkey: function(e) {
		if(e.altKey) {

		} else if(this.pasting && !kbd.down) {
			this.pasting = false
			this.onPasteEnd()

		} else if(kbd.down && e.ctrlKey) switch(kbd.key) {
			case 'c':
				this.onCopy()
			return

			case 'x':
				this.onCopy()
			return

			case 'v':
				this.onPasteEnd()
			return

			case 'a':
				console.log('select all')
				e.preventDefault()
			return

		} else if(kbd.down && kbd.changed) switch(kbd.key) {
			case 'ENTER':
				this.deleteNodeFromPrompt()
			return

			case 'ESC':
				this.closeDeletePromptAndSelectNode()
			return

			case 'DEL':
				this.deleteNodeWithPrompt(this.view.nodeSelected)
			return

			case 'u':
				location.hash = this.exportString()
			return

			case 'o':
				this.explode(!this.explodeEnabled)
			return

			case 'm':
				if(this.view.nodeSelected) {
					this.view.nodeSelected.goRoot()
					this.setTree1(this.view.nodeSelected)
				}
			return

			case 'x':
				this.debug = !this.debug
				this.imagery.materials.subtract.visible = !!this.debug
				this.imagery.materials.norcon.visible = !!this.debug
				this.updateMarkerVisibility()

				// if(this.debug && this.view2.tree) this.view2.tree.sample.describe()
			break

			case 'r':
				if(kbd.state.SHIFT) {
					this.rotateNode(this.view.nodeSelected)
				} else {
					this.onViewClear()
				}
			break

			case 'e':
				this.preloadAllSamples()
				this.emptyViewMessageVisible.off('g_evm_tree')
			break

			case 'v':
				this.gui.closed ? this.gui.open() : this.gui.close()
			return
		}

		this.view.onKey(e)
		this.view2.onKey(e)
	},

	onCopy: function() {
		dom.text(this.clipboard, this.exportString())
		this.clipboard.focus()
		this.clipboard.select()
		console.log('onCopy', this.clipboard.textContent)
	},

	onPaste: function() {
		dom.text(this.clipboard, '')
		this.clipboard.focus()
		this.clipboard.select()
		console.log('onPaste')
	},

	onPasteEnd: function() {
		var figure = TSerial.fromString(this.clipboard.textContent)
		this.addElement(null, figure)
		console.log('onPasteEnd', figure)
	},

	onresize: function() {
		var e = this.tiles.element
		,   w = e.offsetWidth  || 1
		,   h = e.offsetHeight || 1

		this.renderer.setSize(w, h)
		this.tiles.autoresize()

		this.view.resizeRenderTargets(w, h)

		this.view2.rtDepthStencil = this.view.rtDepthStencil
		this.view2.rt1 = this.view.rt1
		this.view2.rt2 = this.view.rt2
		this.view2.rtB1 = this.view.rtB1
		this.view2.rtB2 = this.view.rtB2

		this.view.updateViewportSize()
		this.view2.updateViewportSize()

		// this.view.onResize()
	},

	updateSplitViewMessagePosition: function() {
		if(!this.splitViewFrame) return

		var elem = this.splitViewMessage
		,   vp   = this.splitViewFrame
		,   svw  = elem.offsetWidth
		,   svh  = elem.offsetHeight
		,   sx   = vp.split === TileView.VERTICAL_SPLIT   ? 0.5 : vp.position
		,   sy   = vp.split === TileView.HORIZONTAL_SPLIT ? 0.5 : vp.position
		,   cx   = vp.x + vp.w * sx - svw / 2
		,   cy   = vp.y + vp.h * sy - svh / 2

		elem.style.left = cx +'px'
		elem.style.top  = cy + 0.3 * vp.h +'px'
	},

	onTilesUpdate: function() {

		if(!this.hasAvailableConnections) {
			this.updateSplitViewMessagePosition()
		}

		// var canvas = this.canvas
		// ,   frame  = this.splitViewFrame

		// if(canvas.width  !== frame.w
		// || canvas.height !== frame.h) {
		// 	this.renderer.setSize(frame.w, frame.h)
		// }

		// canvas.style.left = frame.x +'px'
		// canvas.style.top  = frame.y +'px'
	},

	onTap: function(e) {
		if(this.deletePromptTip) {
			if(e.target === this.view.element
			|| e.target === this.view2.element) {
				this.closeDeletePromptAndSelectNode()
			}
		}
	},

	onDragOver: function(e) {
		if(this.catchFiles || this.catchSamples) {
			e.dataTransfer.dropEffect = 'copy'
			e.preventDefault()
		}
	},

	onDrop: function(e) {
		var dt = e.dataTransfer

		if(dt.files && dt.files.length) {

			if(this.catchFiles) {
				this.importFile(dt.files[0])
			}

		} else {
			if(this.catchSamples) {
				var src = dt.getData('text/sid')

				if(src) {
					this.constructNode(src).then(this.connectNodeSomewhere, this)
				}
			}
		}

		e.preventDefault()
	},

	importFile: function(file) {
		return this.sampler.readFile(file).anyway(function(value, success) {
			this.events.emit('onImportElement', success ? value : null)
		}, this)
	},





	onNodeSelect: function(node, prev) {
		if(prev && prev.nodeMarker) {
			prev.nodeMarker.destroy()
			prev.nodeMarker = null
		}

		if(this.issuedReplaceDefer && node && node.lit) {
			this.issuedReplaceDefer.resolve(node)
			return
		}



		if(this.view.selectedConnection) {

		} else if(node) {
			node.nodeMarker = new UI.NodeMarker({
				system: this.view.markers,
				hidden: false,
				node: node,
				events: {
					'node_rotate'  : this.rotateNode,
					'node_delete'  : this.deleteNodeWithPrompt,
					'node_explode' : this.explodeNode,
					'node_parent'  : this.showNodeParent
				},
				eventScope: this
			})

			this.view.focusOnNode(node)
			this.closeDeletePrompt()

		} else {
			this.closeDeletePromptAndSelectNode()
		}

		this.events.emit('onNodeSelect', [node && node.id, prev && prev.id])
	},

	onConnectionSelect: function(view, index, con) {
		this.connectionParts[index] = con

		this.updateConnectionVisibilitySets()

		var master = this.connectionParts[0]
		,   slave  = this.connectionParts[1]

		if(master && slave) {
			this.view.selectConnection(null)
			this.view2.selectConnection(null)
			this.view2.setTree(null)

			var nodes = []
			slave.node.traverse(function(n) {
				nodes.push(n.id)
			})

			this.makeConnection(master, slave, true)
			this.splitScreen(false)

			if(this.addElementDefer) this.addElementDefer.resolve({
				root: slave.node,
				nodes: nodes
			})
		}
	},

	makeConnection: function(master, slave, animate) {
		slave.node.goRoot(true)
		slave.object.updateMatrixWorld()

		master.node.connect(master.index, slave.node, slave.index)

		if(!animate || this.explodeEnabled) {
			var state = this.explodeEnabled ? 0 : 1
			master.playConnection(state, state, 0)

		} else if(animate) {
			master.playConnection(1, 0, this.explodeTimeScale)
		}

		this.view.setTree(this.tree)
	},

	onTick: function(t, dt) {

		if(kbd.state.t) {
			this.connectRandomNode()
		}

		this.view.onTick(dt)
		this.view2.onTick(dt)

		var marker = this.view.nodeSelected && this.view.nodeSelected.nodeMarker
		if(marker) {
			this.view.nodeSelected.getCenter(marker.point.world)
			this.view.projector.updatePoint(marker.point)
			marker.update()
		}

		if(this.deletePromptTip) {
			var node = this.deletePromptTip.deletingNode
			,   point = this.deletePromptTip.point

			node.getCenter(point.world)
			this.view.projector.updatePoint(point)
			this.deletePromptTip.move(point.screen.x, point.screen.y)
		}
	}
})
