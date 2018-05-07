Plumber = f.unit({
	unitName: 'Plumber',

	version: 0.02,

	mode: 'constructor',
	explode: 0,
	explodeStepped: false,

	catchFiles: false,
	catchSamples: true,

	dirSamples: '',
	srcAtlas: 'plumber-atlas.svg',
	srcCubemap: 'plumber-cubemap.png',

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

		this.view = new View3({
			// eroot: document.body,
			renderer: this.renderer,
			// clearColor: 0xFF00FF
		})

		this.view2 = new View3({
			// eroot: document.body,
			renderer: this.renderer,
			// enableSSAO: false,
			enableStencil: false,
			enableRaycast: false
			// clearColor: 0x00FF00
		})


		this.viewTween = new TWEEN.Tween({ position: 1 })
			.to({ position: 1 }, 400)
			.easing(TWEEN.Easing.Cubic.Out)
			.onStart(this.onViewTweenStart, this)
			.onUpdate(this.onViewTweenUpdate, this)
			.onComplete(this.onViewTweenComplete, this)



		this.buttonRoot = dom.div('vp-button-root', this.element)

		this.explodeButton = new Block.Toggle({
			eroot: this.element,
			ename: 'vp-button vp-button-explode out-01',
			eicon: 'i-explode',
			title: 'Exploded view'
		})

		this.zoomInButton = new Block.Toggle({
			eroot: this.buttonRoot,
			ename: 'vp-button vp-button-zoom-in out-01',
			reset: true,
			eicon: 'i-zoom-in',
			title: 'Zoom in'
		})

		this.zoomOutButton = new Block.Toggle({
			eroot: this.buttonRoot,
			ename: 'vp-button vp-button-zoom-out out-01',
			reset: true,
			eicon: 'i-zoom-out',
			title: 'Zoom out'
		})

		this.zoomFitButton = new Block.Toggle({
			eroot: this.buttonRoot,
			ename: 'vp-button vp-button-zoom-fit out-01',
			reset: true,
			eicon: 'i-zoom-fit',
			title: 'Fit screen'
		})

		this.screenshotButton = new Block.Toggle({
			eroot: this.buttonRoot,
			ename: 'vp-button vp-button-screenshot out-01',
			reset: true,
			eicon: 'i-photo',
			title: 'Screen shot'
		})

		this.rotateButton = new Block.Toggle({
			eroot: this.buttonRoot,
			ename: 'vp-button vp-button-rotate out-01',
			eicon: 'i-autorotate',
			title: 'Auto rotate'
		})

		this.displayMenu = new Block.Menu({
			eroot: this.buttonRoot,
			ename: 'vp-menu vp-menu-display',
			options: {
				factory: Block.Toggle,
				deselect: false,
				ename: 'vp-button'
			},
			items: [{
				data: 'transparent',
				eicon: 'i-dis-transparent',
				title: 'Transparent view'
			}, {
				data: 'normal',
				eicon: 'i-dis-normal',
				title: 'Normal view'
			}, {
				data: 'wireframe',
				eicon: 'i-dis-wireframe',
				title: 'Wireframe view'
			}],
			active: 1
		})

		this.projectionMenu = new Block.Menu({
			eroot: this.buttonRoot,
			ename: 'vp-menu vp-menu-projection',
			options: {
				factory: Block.Toggle,
				deselect: false,
				ename: 'vp-button'
			},
			items: [{
				data: 'perspective',
				eicon: 'i-prj-perspective',
				title: 'Perspective'
			}, {
				data: 'left',
				eicon: 'i-prj-left',
				title: 'Left'
			}, {
				data: 'right',
				eicon: 'i-prj-right',
				title: 'Right'
			}, {
				data: 'top',
				eicon: 'i-prj-top',
				title: 'Top'
			}, {
				data: 'bottom',
				eicon: 'i-prj-bottom',
				title: 'Bottom'
			}, {
				data: 'front',
				eicon: 'i-prj-front',
				title: 'Front'
			}, {
				data: 'back',
				eicon: 'i-prj-back',
				title: 'Back'
			}],
			active: 0
		})

		this.explodeButton.events.on('change', this.onExplode, this)
		this.zoomInButton.events.on('change', this.onZoom, this, 'in')
		this.zoomOutButton.events.on('change', this.onZoom, this, 'out')
		this.zoomFitButton.events.on('change', this.onZoom, this, 'fit')
		this.screenshotButton.events.on('change', this.onScreenshot, this)
		this.rotateButton.events.on('change', this.onRotate, this)
		this.displayMenu.events.on('change', this.onDisplayChange, this)
		this.projectionMenu.events.on('change', this.onProjectionChange, this)


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



		this.makeDeletePrompt()


		dom.addclass(this.element, 'ontouchstart' in window ? 'touch' : 'no-touch')
		dom.addclass(this.element, 'plumber')
		dom.addclass(this.canvas, 'canvas-main')
		dom.prepend(this.element, this.canvas)
		dom.append(this.element, this.splitViewMessage)
		dom.append(this.element, this.emptyViewMessage)
		dom.display(this.canvas, false)


		for(var name in options) switch(name) {
			case 'eroot':
				dom.append(options.eroot, this.element)
			break

			case 'mode':
				this.mode = options.mode
			break

			case 'dirSamples':
				this.sampler.folder = options.dirSamples
			break

			case 'initFromHash':
				this.initFromHash = !!options.initFromHash
			break

			default:
				if(name in this) this[name] = options[name]
			break
		}


		this.setMode(this.mode, true)

		this.fetch()
	},

	setMode: function(mode, force) {
		if(this.mode === mode && !force) return
		this.mode = mode

		var layout
		,   clients
		switch(mode) {
			case 'constructor':
				layout = ['h', 0, 0, 1]
				clients = [this.view, this.view2]
			break

			default:
				console.warn('unknown mode given:', mode, 'fallback to "viewer"')
				mode = 'viewer'

			case 'viewer':
				layout = 0
				clients = [this.view2]
			break
		}

		this.modeis = {
			ctr: mode === 'constructor',
			vwr: mode === 'viewer'
		}

		dom.setclass(this.element, {
			'mode-constructor' : this.modeis.ctr,
			'mode-viewer'      : this.modeis.vwr
		})

		dom.display(this.view.clearButton, this.modeis.ctr)
		dom.display(this.view2.clearButton, this.modeis.ctr)
		dom.display(this.buttonRoot, this.modeis.vwr)

		// this.view.setTree(null)
		this.clearTree()
		this.view2.setTree(null)


		this.tiles.setLayout(layout)
		this.tiles.setClients(clients)


		this.splitView = this.tiles.splits[0]
		if(this.splitView) {
			var p = this.splitView.position
			this.viewTween.target.position = p
			this.viewTween.source.position = p
		}


		this.splitViewMessageVisible.set(this.modeis.ctr, 'g_svm_mode')


		this.updateMarkerVisibility()
		this.view .markers.markersVisible.set(!!this.modeis.ctr, 'g_m_mode')
		this.view2.markers.markersVisible.set(!!this.modeis.ctr, 'g_m_mode')


		this.onViewTweenUpdate()
		this.onViewTweenComplete()
		// this.tiles.update()
	},

	onZoom: function(zoom) {
		switch(zoom) {
			case 'in':
				this.view.zoom(1.5)
				this.view2.zoom(1.5)
			break

			case 'out':
				this.view.zoom(1/1.5)
				this.view2.zoom(1/1.5)
			break

			case 'fit':
				this.view.focusOnTree()
				this.view2.focusOnTree()
			break
		}
	},

	onRotate: function(rotate) {
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
		var pos = {
			perspective : [ 1,  1,  1],
			left        : [-1,  0,  0],
			right       : [ 1,  0,  0],
			top         : [ 0,  1,  0],
			bottom      : [ 0, -1,  0],
			front       : [ 0,  0,  1],
			back        : [ 0,  0, -1]
		}

		var isPerspective = projection === 'perspective'

		this.view.camera.fov = isPerspective ? 30 : 0.5
		this.view.camera.updateProjectionMatrix()

		this.view2.camera.fov = isPerspective ? 30 : 0.5
		this.view2.camera.updateProjectionMatrix()

		this.view.camera.position
			.fromArray(pos[projection])
			.setLength(this.view.getFitDistance())
			.add(this.view.treeCenter)

		this.view2.camera.position
			.fromArray(pos[projection])
			.setLength(this.view2.getFitDistance())
			.add(this.view2.treeCenter)

		this.view.orbit.target.copy(this.view.treeCenter)
		this.view2.orbit.target.copy(this.view2.treeCenter)

		this.view.orbit.orthoMode = !isPerspective
		this.view2.orbit.orthoMode = !isPerspective

		this.view.orbit.update()
		this.view2.orbit.update()
		this.view.needsRedraw = true
		this.view2.needsRedraw = true
	},

	onScreenshot: function() {
		var time = new Date().toISOString().split('.')[0].replace(/:/g, '.')

		this.canvas.toBlob(function(blob) {
			saveAs(blob, 'pb-screen-'+ time +'.jpg')

		}, 'image/jpeg', 0.95)
	},

	getConnectionsArray: function() {
		return this.tree.retrieveConnections({ connected: true }, true)
	},

	exportJSON: function() {
		return TSerial.toJSON(this.tree)
	},

	importJSON: function(json, animate) {
		return TSerial.fromJSON(json, this.sampler, animate).then(this.absolutelySetMainTree, this)
	},

	exportString: function() {
		return TSerial.toString(this.exportJSON())
	},

	importString: function(string, animate) {
		return this.importJSON(TSerial.fromString(string), animate)
	},


	replaceElement: function(src, param) {
		var sample = this.getSample(src)

		if(!this.tree || !sample) {
			this.events.emit('onReplaceElement', {
				status: 'rejected',
				reason: sample ? 'no tree' : 'bad sample'
			})

		} else {
			sample.load().then(function() {
				this.replaceElementBySample(sample, param)
			}, function(e) {
				this.events.emit('onReplaceElement', {
					status: 'rejected',
					reason: 'bad element: '+ src
				})
			}, this)
		}
	},

	replaceElementBySample: function(sample, param) {
		var events = this.events
		function replaceOne(node) {
			replaceMany([node])
		}
		function replaceMany(nodes) {
			events.emit('onReplaceElement', { status: 'replaced', nodes: nodes.map(f.prop('id')) })
		}
		function replaceBad(e) {
			events.emit('onReplaceElement', { status: 'rejected', reason: e })
		}


		if(!this.tree || !sample) {
			return replaceBad(sample ? 'no tree' : 'bad sample')
		}

		switch(param) {
			case -1:
				var replaceable = []

				this.tree.traverse(function(node) {
					if(node.canBeReplacedBy(sample)) replaceable.push(node)
				}, this)

				if(replaceable.length) {
					var defers = replaceable.map(function(node) {
						return this.replaceNode(node, sample)
					}, this)

					Defer.all(defers).then(replaceMany, replaceBad)

				} else replaceBad('no suitable nodes')
			break

			case 0:
				var replaceable = []

				this.tree.traverse(function(node) {
					this.view.litNode(node, node.canBeReplacedBy(sample))

					if(node.lit) replaceable.push(node)
				}, this)


				switch(replaceable.length) {
					case 0:
						replaceBad('no suitable nodes')
					return

					case 1:
						var node = replaceable[0]

						this.view.litNode(node, false)
						this.replaceNode(node, sample, true).then(replaceOne, replaceBad)
					break

					default:
						this.issuedReplace = sample
						this.litModeStart()
					break
				}
			break

			default:
				var node = param instanceof TNode ? param : this.getElementById(param)
				if(node) {
					this.replaceNode(node, sample, true).then(replaceOne, replaceBad)

				} else replaceBad('invalid param: '+ param)
			break
		}

		this.view.needsRedraw = true
	},

	litModeStart: function() {
		this.view.stencilRaycastMask =
			this.view.stencilLit    .value |
			this.view.stencilHover  .value |
			this.view.stencilSelect .value
	},

	litModeClear: function() {
		if(this.tree) this.tree.traverse(function(node) {
			this.view.litNode(node, false)
		}, this)

		this.view.needsRedraw = true
		this.view.stencilRaycastMask = ~0
	},

	addElement: function(id, src, link) {
		var sample = this.getSample(src, link)

		if(sample) {
			this.displayFigure(sample.src)

		} else {
			this.events.emit('onAddElement', {
				status: 'error',
				error: 'bad element source: "'+ src +'"'
			})
		}
	},

	getSample: function(src, link) {
		return f.apick(this.sampler.samples, 'src', src)
			|| this.sampler.addSample({ src: src, link: link })
	},

	addFigure: function(json) {

	},

	addComplex: function(id, json) {
		if(!json || !json.types) return

		for(var i = 0; i < json.types.length; i++) {

		}

	},

	fetch: function() {
		this.get.xml(this.srcAtlas)
			.then(Atlas.setSource)

		this.get.image(this.srcCubemap)
			.then(this.imagery.unwrapCubemap3x2, this.imagery)

		this.get.ready().then(this.run, this, null, true)
	},


	makeDeletePrompt: function() {
		var tip = new Block.Tip({
			tipRoot: this.element,
			align: 'top',
			point: this.view.projector.addPoint(),
			hidden: true
		})

		dom.addclass(tip.element, 'prompt')

		var text = dom.div('prompt-text', tip.content)
		,   ok   = dom.div('prompt-button hand prompt-button-ok', tip.content)
		,   no   = dom.div('prompt-button hand prompt-button-cancel', tip.content)

		dom.text(ok, 'Yes')
		dom.text(no, 'No')

		tip.watchEvents.push(
			new EventHandler(this.deleteNode, this).listen('tap', ok),
			new EventHandler(this.closeDeletePrompt, this).listen('tap', no))

		this.deletePromptTipText = text
		this.deletePromptTip = tip
	},


	makeGUI: function() {
		var self = this

		this.gui = new dat.GUI({
			// autoPlace: false,
			hideable: false
		})

		// var params = {
		// 	stencilSlot: 'stencilHover'
		// }

		var slots = [
			'stencilLit',
			'stencilHover',
			'stencilSelect'
		]

		this.gui.closed = true

		this.gui.addColor(this.view, 'clearColor').name('Clear').onChange(redraw)
		this.gui.add(this.view, 'enableAA').name('AA').onChange(redraw)
		this.gui.add(this.view, 'enableSSAO').name('SSAO').onChange(redraw)
		this.gui.add(this.view, 'enableOnlyAO').name('Only AO').onChange(redraw)
		this.gui.add(this.view, 'debugDepth').name('Show Depth').onChange(redraw)

		var au = this.view.smSSAO.uniforms
		,   ao = this.gui.addFolder('Occlusion')
		// ao.add(main.v3, 'enableBlurAO').name('Blur AO').onChange(redraw)
		// ao.add(main.v3, 'enableBloomAO').name('Bloom AO').onChange(redraw)
		ao.add(au.cameraNear, 'value').min(0).max(1000).name('cameraNear').onChange(redraw)
		ao.add(au.cameraFar,  'value').min(0).max(1000).name('cameraFar').onChange(redraw)
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


		this.gui.add(this, 'explode').min(0).max(1).name('Explode').onChange(explode)
		this.gui.add(this, 'explodeStepped').name('Explode Step')

		this.gui.add(this.view, 'directAngle').min(-1).max(1).name('Direct Angle').onChange(relight)
		this.gui.add(this.view, 'directK').min(-1).max(1).name('Direct K').onChange(relight)
		this.gui.add(this.view, 'directLift').min(-1).max(1).name('Direct Lift').onChange(relight)
		this.gui.add(this.view.dirLight, 'intensity').min(0).max(1).name('Direct Power').onChange(redraw)
		this.gui.add(this.view.ambLight, 'intensity').min(0).max(1).name('Ambient Power').onChange(redraw)

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




	onViewClear: function() {
		this.clear()
	},

	onViewClear2: function() {
		this.displayFigure(null)
		this.events.emit('onAddElement', { status: 'canceled' })
	},

	clear: function() {
		this.displayFigure(null)
		this.view.setPreloader(null)
		this.view2.setPreloader(null)
		this.clearTree()
	},


	onViewTweenUpdate: function() {
		if(this.splitView) {
			this.splitView.position = this.viewTween.source.position
			this.tiles.update()

			this.view.focusOnTree(0)
			this.view2.focusOnTree(0)
		}
	},

	onViewTweenStart: function() {
		dom.display(this.tiles.ehelpers, true)
	},

	onViewTweenComplete: function() {
		if(!this.splitScreen) {
			this.view2.setTree(null)
			this.sampleView2 = null
		}

		dom.display(this.tiles.ehelpers, this.splitScreen)
	},

	onExplode: function(enabled) {
		if(this.explodeStepDefer) {
			this.explodeStepDefer.abort()
			delete this.explodeStepDefer
		}

		var view = this.view.tree ? this.view : this.view2
		,   tree = view.tree
		if(!tree) return

		view.focusOnTree(null, enabled ? view.explodeDim : view.assembleDim)

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
					con.playConnection(enabled ? 0 : 1, 0.4)

					defers.push(defer)
				}

				this.explodeStepDefer = Defer.all(defers).then(runStep, this)
			}

			runStep.call(this)

		} else {
			tree.traverseConnections(function(con) {
				if(con.connected && con.master) con.playConnection(enabled ? 0 : 1)
			})
		}
	},

	displayFigure: function(figure) {
		var sample = f.apick(this.sampler.samples, 'src', figure)
		if(sample) figure = sample

		if(this.issuedReplace) {
			delete this.issuedReplace
			this.litModeClear()
		}

		if(this.sampleView2 === figure) return

		if(this.tree || this.mode === 'viewer') {
			this.sampleView2 = figure

		} else {
			this.sampleView2 = null
		}

		this.splitScreen = !!this.sampleView2


		this.splitViewMessageVisible.set(this.splitScreen, 'g_svm_screen')
		this.emptyViewMessageVisible.set(!this.tree && !figure, 'g_evm_tree')

		this.view.enableRaycast = !this.splitScreen

		this.view.hoverNode(null)
		this.view.selectNode(null)
		this.view.selectConnection(null)

		this.view2.setTree(null)

		var splitPosition = this.splitScreen ? 0.5 : 1
		if(splitPosition !== this.viewTween.target.position) {
			this.viewTween.target.position = splitPosition
			this.viewTween.start()
		}

		this.updateMarkerVisibility()


		if(!figure) {

		} else if(this.sampleView2) {
			this.constructNode(figure, this.view2)
				.then(this.setTree2, this.constructError, this)

		} else {
			this.constructNode(figure, this.view)
				.then(this.setTree1, this.constructError, this)
		}

	},

	isComplexFigure: function(figure) {
		return figure && figure.types && figure.types.length
	},

	constructNode: function(figure, targetView) {
		if(this.ready.pending) {
			return this.ready.then(f.binda(this.constructNode, this, arguments))
		}

		if(targetView) targetView.setPreloader(null)


		if(figure instanceof Sample) {
			if(targetView) targetView.setPreloader([figure])

			return figure.load().then(TNode.New)


		} else if(this.isComplexFigure(figure)) {
			var samples = TSerial.prepareSamples(figure.types, this.sampler)

			if(targetView) targetView.setPreloader(samples)

			return Defer.all(samples.map(f.func('load'))).then(function() {
				return TSerial.constructJSON(figure, samples, false)
			}, this)

		} else {
			return Defer.complete(false, 'bad sample')
		}
	},

	constructError: function(e) {
		this.events.emit('onAddElement', {
			status: 'error',
			error: e
		})
	},


	setTree2: function(node) {
		if(!node) return

		this.view2.setTree(node)
		this.updateConnectionGroups(this.tree, node)
		this.updateMarkerVisibility()
	},

	setTree1: function(node) {
		this.absolutelySetMainTree(node)

		if(!node) return

		var nodes = []
		node.traverse(function(n) {
			nodes.push(n.id)
		})

		this.events.emit('onAddElement', {
			status: 'connected',
			root: node,
			nodes: nodes
		})
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
		var visible = this.debug || this.view2.tree

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

		if(!this.hasAvailableConnections) {
			this.events.emit('onAddElement', { status: 'rejected' })
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

		if(!this.tree) {
			return this.constructNode(samples[0], this.view)
				.then(this.setTree1, this.constructError, this)
		}

		var cons = this.tree.retrieveConnections({ connected: false }, true)
		f.sort(cons, Math.random)

		for(var i = 0; i < cons.length; i++) {
			var conA = cons[i]
			,   jointA = conA.joint

			for(var j = 0; j < samples.length; j++) {
				var sample = samples[j]

				if(!sample.object) {
					sample.load()
					continue
				}

				for(var k = 0; k < sample.joints.length; k++) {
					var jointB = sample.joints[k]
					if(!jointA.canConnect(jointB)) continue

					this.constructNode(sample, this.view).then(function(node) {
						this.makeViewConnection(conA, node.connections[k], true)
					}, this.constructError, this)

					return
				}
			}
		}
	},

	connectNode: function(node) {
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

				this.makeViewConnection(conA, conB, true)


				break loop_cons
			}
		}

		if(this.splitScreen) {
			this.updateConnectionGroups(this.tree, this.view2.tree)
		}
	},

	connectElement: function(src, indexA, id, indexB, animate) {
		var sample = this.getSample(src)
		if(!sample) {
			return this.connectElementError('src', { src: src })
		}

		var nodeB = this.getElementById(id)
		if(!nodeB) {
			return this.connectElementError('id', { id: id })
		}

		var conB = nodeB.connections[indexB]
		if(!conB) {
			return this.connectElementError('con', { type: nodeB.type, index: indexB })
		}

		if(conB.connected) {
			return this.connectElementError('used', { type: nodeB.type, index: indexB })
		}

		this.constructNode(sample).then(function(nodeA) {
			var conA = nodeA.connections[indexA]
			if(!conA) {
				return this.connectElementError('con', { type: nodeA.type, index: indexA })
			}

			if(!conB.canConnect(conA)) {
				return this.connectElementError('match', { typeA: nodeA.type, indexA: indexA, typeB: nodeB.type, indexB: indexB })
			}

			this.makeViewConnection(conB, conA, animate, 'onConnectElement')

		}, function(e) {
			this.connectElementError('raw', e)

		}, this)
	},

	connectElementError: function(type, data) {
		var messages = {
			src: 'bad element src: [#{src}]',
			id: 'invalid node id: [#{id}]',
			con: 'node [#{type}] don\'t have connection: [#{index}]',
			used: 'connection [#{type}][#{index}] already used',
			match: 'connections [#{typeA}][#{indexA}] and [#{typeB}][#{indexB}] don\'t match'
		}

		this.events.emit('onConnectElement', {
			status: 'rejected',
			reason: type === 'raw' ? data : f.implode(messages[type] || 'unknown error', data)
		})
	},


	onkey: function(e) {
		if(e.ctrlKey || e.shiftKey || e.altKey) {

		} else if(kbd.down && kbd.changed) switch(kbd.key) {
			case 'ENTER':
				if(this.deletePromptTip.visible.value) {
					this.deleteNode()
				}
			return

			case 'ESC':
				if(this.deletePromptTip.visible.value) {
					this.closeDeletePrompt()
				}
			return

			case 'DEL':
				this.promptDeleteNode(this.view.nodeSelected)
			return

			case 'u':
				location.hash = this.exportString()
			return

			case 'x':
				this.debug = !this.debug
				this.imagery.materials.subtract.visible = !!this.debug
				this.imagery.materials.norcon.visible = !!this.debug
				this.updateMarkerVisibility()

				// if(this.debug && this.view2.tree) this.view2.tree.sample.describe()
			break

			case 'r':
				this.onViewClear()
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

	replaceNode: function(node, sample, select) {
		if(!node || !sample || !node.canBeReplacedBy(sample)) {
			return Defer.complete(false, 'bad replacement')
		}

		return this.constructNode(sample).then(function(replacer) {
			replacer.replace(node)

			this.absolutelySetMainTree(node.upcon ? this.view.tree : replacer)

			if(select) this.view.selectNode(replacer)

			return replacer

		}, function(e) {
			this.events.emit('onReplaceElement', {
				status: 'rejected',
				reason: 'construct error',
				error: e
			})
		}, this)
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
		this.sampler.samples.forEach(f.func('load'))
		this.view.setPreloader(this.sampler.samples)
	},


	rotateNode: function(node) {
		if(!node) return

		node.rotate(Math.PI / 6)

		this.view.needsRedraw = true
	},

	promptDeleteNode: function(node) {
		if(!node) return

		var stat = this.deletePromptStat = node.pinch()

		if(stat.nodes.length < 2) {
			this.deleteNode()

		} else {
			dom.text(this.deletePromptTipText,
				['Do you want to delete', stat.nodes.length, 'nodes?'].join(' '))

			this.deletePromptTip.visible.on()
		}
	},


	closeDeletePrompt: function() {
		this.deletePromptTip.visible.off()
		delete this.deletePromptStat
	},

	clearTree: function() {
		if(!this.tree) return

		this.deletePromptStat = this.tree.pinchr()
		this.deleteNode()
	},

	absolutelySetMainTree: function(tree) {
		this.tree = tree
		var view = this.mode === 'constructor' ? this.view : this.view2

		view.setTree(this.tree)

		this.emptyViewMessageVisible.set(!this.tree, 'g_evm_tree')
	},


	deleteNode: function() {
		var stat = this.deletePromptStat
		if(!stat) return

		stat.root.disconnect()
		if(stat.nextRoot && stat.nextRoot !== stat.root) {
			stat.nextRoot.upnode = null
			stat.nextRoot.upcon = null
			this.absolutelySetMainTree(stat.nextRoot)

		} else {
			this.absolutelySetMainTree(null)
		}

		this.view.selectNode(null)

		this.closeDeletePrompt()

		this.events.emit('onRemoveElement', stat)
	},


	onresize: function() {
		var e = this.tiles.element
		,   w = e.offsetWidth  || 1
		,   h = e.offsetHeight || 1

		this.renderer.setSize(w, h)
		this.tiles.autoresize()

		this.view.resizeRenderTargets(w, h)
		this.view.resizeShaders(w, h)

		this.view2.rtDepthStencil = this.view.rtDepthStencil
		this.view2.rt1 = this.view.rt1
		this.view2.rt2 = this.view.rt2
		// this.view.onResize()
	},

	updateSplitViewMessagePosition: function() {
		if(!this.splitView) return

		var elem = this.splitViewMessage
		,   vp   = this.splitView
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
		// ,   frame  = this.splitView

		// if(canvas.width  !== frame.w
		// || canvas.height !== frame.h) {
		// 	this.renderer.setSize(frame.w, frame.h)
		// }

		// canvas.style.left = frame.x +'px'
		// canvas.style.top  = frame.y +'px'
	},

	onTap: function(e) {
		if(this.deletePromptTip.visible.value) {
			if(!dom.ancestor(e.target, this.deletePromptTip.element)
			&& !dom.ancestor(e.target, this.view.markers.element)) {
				this.closeDeletePrompt()
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
				var sid = dt.getData('text/sid')
				,   sample = f.apick(this.sampler.samples, 'src', sid)

				if(sample) {
					this.constructNode(sample, this.view)
						.then(this.connectNode, this.constructError, this)
				}
			}
		}

		e.preventDefault()
	},

	importFile: function(file) {
		return this.sampler.readFile(file)
			.then(this.onSampleImport, this.onSampleImportFail, this)
	},



	onSampleImport: function(sample) {
		// this.displayFigure(sample.src)
		this.events.emit('onImportElement', sample)
		return sample
	},

	onSampleImportFail: function(e) {
		console.warn('File import error:', e)
	},




	onNodeSelect: function(node, prev) {
		var system = this.view.markers
		if(prev && prev.nodeMarker) {
			system.removeMarker(prev.nodeMarker)
			prev.nodeMarker.destroy()
			prev.nodeMarker = null
		}

		if(node && node.lit && this.issuedReplace) {
			this.replaceNode(node, this.issuedReplace, true)
			this.litModeClear()
			delete this.issuedReplace

			return
		}

		if(this.view.selectedConnection) {

		} else if(node) {
			var m = new UI.Marker({
				undisposable: true,
				deleteNode: node,
				align: 'bottom'
			})

			system.addMarker(m)

			m.visible.on('main')

			dom.remclass(m.content, 'marker-interactive')


			// m.label = dom.div('marker-info', m.content)
			// dom.text(m.label, node.sample.src)
			dom.text(m.elemInfo, '['+ node.id +'] '+ node.sample.src)
			dom.addclass(m.elemInfo, 'marker-label')

			m.bRot = dom.div('marker-action', m.content)
			m.bDel = dom.div('marker-action', m.content)

			m.watchEvents.push(
				new EventHandler(this.rotateNode, this, node).listen('tap', m.bRot),
				new EventHandler(this.promptDeleteNode, this, node).listen('tap', m.bDel))

			m.watchAtlas.push(
				Atlas.set(m.bRot, 'i-rotate'),
				Atlas.set(m.bDel, 'i-delete'))

			if(node.sample.link) {
				m.bInfo = dom.a(node.sample.link, 'marker-action out-02', m.content)
				m.bInfo.setAttribute('target', '_blank')
				m.watchAtlas.push(Atlas.set(m.bInfo, 'i-info'))
			}

			node.nodeMarker = m


			if(!kbd.state.SHIFT) {
				this.view.focusOnNode(node)
			}
		}

		this.events.emit('onNodeSelect', [node && node.id, prev && prev.id])
	},

	onConnectionSelect: function(view, index, con) {
		this.connectionParts[index] = con

		this.updateConnectionVisibilitySets()

		var master = this.connectionParts[0]
		,   slave  = this.connectionParts[1]

		if(master && slave) this.makeViewConnection(master, slave, true)
	},

	makeViewConnection: function(master, slave, animate, eventType) {
		this.view.selectConnection(null)
		this.view2.selectConnection(null)
		this.view2.setTree(null)

		var nodes = []
		slave.node.traverse(function(n) {
			nodes.push(n.id)
		})

		slave.object.updateMatrixWorld()

		master.node.connect(master.index, slave.node, slave.index)

		this.displayFigure(null)

		this.view.setTree(this.tree)
		this.view.focusOnTree(null, this.view.assembleDim)


		if(animate) {
			master.playConnection()
		}


		this.events.emit(eventType || 'onAddElement', {
			status: 'connected',
			root: slave.node,
			nodes: nodes
		})
	},

	removeSample: function(src) {
		var sample = f.apick(this.sampler.samples, 'src', src)
		if(sample) {
			f.adrop(this.sampler.samples, sample)
		}
	},

	run: function() {
		this.makeGUI()

		new EventHandler(this.onresize, this).listen('resize',  window)
		new EventHandler(this.onkey,    this).listen('keydown', window)
		new EventHandler(this.onkey,    this).listen('keyup',   window)
		new EventHandler(this.onTap,    this).listen('tap',     window)
		// new EventHandler(this.onHash,   this).listen('hashchange', window)

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

	onHash: function() {
		this.loadFromHash()
	},

	onTick: function(t, dt) {

		if(kbd.state.t) {
			this.connectRandomNode()
		}

		this.view.onTick(dt)
		this.view2.onTick(dt)

		var marker = this.view.nodeSelected && this.view.nodeSelected.nodeMarker
		if(marker) {
			marker.point.world.setFromMatrixPosition(this.view.nodeSelected.objectCenter.matrixWorld)
			this.view.projector.updatePoint(marker.point)
			marker.update()
		}

		if(this.deletePromptStat) {
			var node = this.deletePromptStat.root
			,   point = this.deletePromptTip.point

			point.world.setFromMatrixPosition(node.objectCenter.matrixWorld)
			this.view.projector.updatePoint(point)
			this.deletePromptTip.move(Math.round(point.screen.x), Math.round(point.screen.y))
		}
	}
})
