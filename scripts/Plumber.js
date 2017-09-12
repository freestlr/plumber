Plumber = f.unit({
	unitName: 'Plumber',

	mode: 'constructor',
	explode: 0,

	catchFiles: false,
	catchSamples: true,

	dirSamples: 'samples/',
	srcAtlas: 'plumber-atlas.svg',
	srcCubemap: 'plumber-cubemap.png',

	init: function(options) {
		this.get   = new Loader
		this.timer = new Timer(this.onTick, this)
		this.ready = new Defer

		this.imagery = new Imagery

		this.events = new EventEmitter

		this.sampler = new Sampler
		this.sampler.setImagery(this.imagery)
		if(this.dirSamples) {
			this.sampler.folder = this.dirSamples
		}


		this.connectionParts = []


		this.renderer = new THREE.WebGLRenderer({
			alpha: false,
			depth: true,
			stencil: true,
			antialias: true,
			preserveDrawingBuffer: true
		})
		this.renderer.autoClear = false


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
			enableStencil: false,
			enableRaycast: false
			// clearColor: 0x00FF00
		})


		this.viewTween = new TWEEN.Tween({ position: 1 })
			.to({ position: 1 }, 400)
			.easing(TWEEN.Easing.Cubic.Out)
			.onUpdate(this.onViewTweenUpdate, this)
			.onComplete(this.onViewTweenComplete, this)




		this.explodeButton = new Block.Toggle({
			eroot: this.element,
			ename: 'button-explode out-01',
			eicon: 'i-search',
			active: false,
			deselect: true
		})

		this.explodeButton.events.on('change', this.onExplode, this)


		this.splitViewMessage = dom.div('split-view-message')
		dom.text(this.splitViewMessage, 'no compatible connections')
		this.splitViewMessageVisible = new Gate(Gate.AND, true)
		this.splitViewMessageVisible.events.on('change', dom.display, dom, this.splitViewMessage)
		this.splitViewMessageVisible.events.on('opened', this.updateSplitViewMessagePosition, this)
		this.splitViewMessageVisible.off('g_vm_cons')


		this.emptyViewMessage = dom.div('empty-view-message out-03 absmid')
		var center = dom.div('empty-view-message-center absmid', this.emptyViewMessage)
		,   frame  = dom.div('empty-view-message-frame absmid', this.emptyViewMessage)
		,   text   = dom.div('empty-view-message-text absmid', this.emptyViewMessage)

		dom.html(text, ['please', 'add', 'any product'].join('<br/>'))




		this.makeDeletePrompt()


		dom.addclass(this.element, 'ontouchstart' in window ? 'touch' : 'no-touch')
		dom.addclass(this.element, 'plumber')
		dom.addclass(this.renderer.domElement, 'canvas-main')
		dom.prepend(this.element, this.renderer.domElement)
		dom.append(this.element, this.splitViewMessage)
		dom.append(this.element, this.emptyViewMessage)


		for(var name in options) switch(name) {
			case 'eroot':
				dom.append(options.eroot, this.element)
			break

			case 'mode':
				this.mode = options.mode
			break

			case 'clearButton':
				dom.display(this.view.clearButton, options.clearButton)
				dom.display(this.view2.clearButton, options.clearButton)
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


		this.splitViewMessageVisible.set(this.modeis.ctr, 'g_vm_mode')


		this.updateMarkerVisibility()
		this.view .markers.markersVisible.set(!!this.modeis.ctr, 'g_m_mode')
		this.view2.markers.markersVisible.set(!!this.modeis.ctr, 'g_m_mode')


		this.tiles.update()
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

	addElement: function(id, src, link) {
		var sample =
			f.apick(this.sampler.samples, 'src', src) ||
			f.apick(this.sampler.samples,  'id',  id) ||
			this.addSample(id, src, link)

		if(!sample) return

		this.displayFigure(sample.id)
		return this.deferSample
	},

	addSample: function(id, src, link) {
		return this.sampler.addSample({
			id: id,
			src: src,
			link: link
		})
	},

	addFigure: function(json) {

	},

	addComplex: function(id, json) {
		if(!json || !json.types) return

		for(var i = 0; i < json.types.length; i++) {

		}

	},

	fetch: function() {
		this.get.xml(this.srcAtlas).defer
			.then(Atlas.setSource)

		this.get.image(this.srcCubemap).defer
			.then(this.imagery.unwrapCubemap3x2, this.imagery)

		this.get.ready().detach(this.run, this)
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
		this.gui = new dat.GUI({
			// autoPlace: false,
			hideable: false
		})

		var params = {
			stencilSlot: 'stencilHover'
		}

		var slots = [
			'stencilLit',
			'stencilHover',
			'stencilSelect'
		]

		this.gui.closed = true

		this.gui.addColor(this.view, 'clearColor').name('Clear').onChange(redraw)

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

		var self = this
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


	onViewTweenUpdate: function(k, values) {
		if(this.splitView) {
			this.splitView.position = values.position
			this.tiles.update()
		}
	},

	onViewTweenComplete: function() {
		if(!this.splitScreen) {
			this.view2.setTree(null)
			this.sampleView2 = null
		}
	},

	onExplode: function(enabled) {
		if(this.explodeStepDefer) {
			this.explodeStepDefer.abort()
			delete this.explodeStepDefer
		}


		if(enabled) {
			this.tree.traverseConnections(function(con) {
				if(con.connected && con.master) con.playConnection(0)
			})

		} else {
			var list = []
			,   level = 0

			this.tree.traverseConnections(function(con, data, level) {
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
					con.playConnection(1, 0.4)

					defers.push(defer)
				}

				this.explodeStepDefer = Defer.all(defers).then(runStep, this)
			}

			runStep.call(this)
		}
	},

	displayFigure: function(figure) {
		if(typeof figure === 'string') {
			figure = f.apick(this.sampler.samples, 'id', figure)
		}

		if(this.sampleView2 === figure) return

		if(this.tree && this.mode !== 'viewer') {
			this.sampleView2 = figure

		} else {
			this.sampleView2 = null
		}

		this.splitScreen = !!this.sampleView2


		this.splitViewMessageVisible.set(this.splitScreen, 'g_vm_screen')

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

		dom.togclass(this.emptyViewMessage, 'hidden', this.tree || figure)

		if(!figure) {

		} else if(this.sampleView2) {
			this.constructNode(figure, this.view2).then(this.setTree2, this)

		} else {
			this.constructNode(figure, this.view).then(this.setTree1, this)
		}

	},

	isComplexFigure: function(figure) {
		return figure && figure.types instanceof Array
	},

	constructNode: function(figure, targetView) {
		if(this.ready.pending) {
			return this.ready.then(f.binda(this.constructNode, this, arguments))
		}

		if(targetView) targetView.setPreloader(null)


		if(figure instanceof Sample) {
			if(targetView) targetView.setPreloader([figure])

			return figure.load().then(TNode.New, this.constructError, this)


		} else if(this.isComplexFigure(figure)) {
			var samples = TSerial.prepareSamples(figure.types, this.sampler)

			if(targetView) targetView.setPreloader(samples)

			return Defer.all(samples.map(f.func('load'))).then(function() {
				return TSerial.constructJSON(figure, samples, false)

			}, this.constructError, this)
		}
	},

	constructError: function(e) {
		this.events.emit('onAddElement', { status: 'error', error: e })
	},


	setTree2: function(node) {
		if(!node) return

		this.view2.setTree(node)
		this.updateConnectionGroups(this.tree, node)
		this.updateMarkerVisibility()
	},

	setTree1: function(node) {
		this.absolutelySetMainTree(node)

		if(node) {
			this.events.emit('onAddElement', { status: 'connected' })
		}
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
		this.splitViewMessageVisible.set(!this.hasAvailableConnections, 'g_vm_cons')
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
			return this.constructNode(samples[0], this.view).then(this.setTree1, this)
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
						this.makeViewConnection(conA, node.connections[k])
					}, this)

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

				this.makeViewConnection(conA, conB)


				break loop_cons
			}
		}

		if(this.splitScreen) {
			this.updateConnectionGroups(this.tree, this.view2.tree)
		}
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
				dom.addclass(this.emptyViewMessage, 'hidden')
			break

			case 'v':
				this.gui.closed ? this.gui.open() : this.gui.close()
			return
		}

		this.view.onKey(e)
		this.view2.onKey(e)
	},

	issueReplace: function(node) {
		this.events.emit('onIssueNodeReplace', node)
	},

	replaceElement: function(node, sid) {
		if(!node) return

		var sample = f.apick(this.sampler.samples, 'src', sid)
		if(!sample || !sample.canReplace(node)) return

		var root = !node.upcon
		this.constructNode(sample).then(function(replacer) {
			replacer.replace(node)

			if(root) this.view.setTree(replacer)
			else this.view.setTree(this.view.tree)

			// this.view.focusOnNode(replacer)
			this.view.selectNode(replacer)
		}, this)
	},

	preloadAllSamples: function() {
		this.sampler.samples.forEach(f.func('load'))
		this.view.setPreloader(this.sampler.samples)
	},


	rotateNode: function(node) {
		if(!node) return

		var angle = Math.PI / 6
		if(node.upcon) {
			node.upcon.rotate(angle)
		} else {
			node.object.rotateOnAxis(new THREE.Vector3(1, 0, 0), angle)
		}

		this.view.needsRedraw = true
	},

	promptDeleteNode: function(node) {
		if(!node) return

		this.deletePromptStat = node.pinch()

		if(this.deletePromptStat.removeCount < 2) {
			this.deleteNode()

		} else {
			dom.text(this.deletePromptTipText,
				['Do you want to delete', this.deletePromptStat.removeCount, 'nodes?'].join(' '))

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
		this.absolutelySetMainTree(null)
	},

	absolutelySetMainTree: function(tree) {
		this.tree = tree
		this.view.setTree(this.tree)

		dom.togclass(this.emptyViewMessage, 'hidden', !!this.tree)
	},


	deleteNode: function() {
		var stats = this.deletePromptStat
		if(!stats) return

		stats.removeNode.disconnect()
		this.absolutelySetMainTree(stats.maxRoot)
		this.view.selectNode(null)

		this.closeDeletePrompt()

		this.events.emit('onRemoveElement', stats)
	},


	onresize: function() {
		var e = this.tiles.element
		,   w = e.offsetWidth
		,   h = e.offsetHeight

		this.renderer.setSize(w, h)
		this.tiles.autoresize()

		this.view.resizeRenderTargets(w, h)
		this.view.resizeShaders(w, h)
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

		return

		var canvas = this.renderer.domElement
		,   frame  = this.splitView

		if(canvas.width  !== frame.w
		|| canvas.height !== frame.h) {
			this.renderer.setSize(frame.w, frame.h)
		}

		canvas.style.left = frame.x +'px'
		canvas.style.top  = frame.y +'px'
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
				,   sample = f.apick(this.sampler.samples, 'id', sid)

				if(sample) {
					this.constructNode(sample, this.view).then(this.connectNode, this)
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
		// this.displayFigure(sample.id)
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

		if(node) {
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
			dom.text(m.elemInfo, node.sample.src)
			dom.addclass(m.elemInfo, 'marker-label')

			m.bRep = dom.div('marker-action', m.content)
			m.bRot = dom.div('marker-action', m.content)
			m.bDel = dom.div('marker-action', m.content)

			m.watchEvents.push(
				new EventHandler(this.issueReplace, this, node).listen('tap', m.bRep),
				new EventHandler(this.rotateNode, this, node).listen('tap', m.bRot),
				new EventHandler(this.promptDeleteNode, this, node).listen('tap', m.bDel))

			m.watchAtlas.push(
				Atlas.set(m.bRep, 'i-move-forward'),
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

		this.events.emit('onNodeSelect', [node, prev])
	},

	onConnectionSelect: function(view, index, con) {
		this.connectionParts[index] = con

		this.updateConnectionVisibilitySets()

		var master = this.connectionParts[0]
		,   slave  = this.connectionParts[1]

		if(master && slave) this.makeViewConnection(master, slave)
	},

	makeViewConnection: function(master, slave) {
		this.view.selectConnection(null)
		this.view2.selectConnection(null)
		this.view2.setTree(null)

		slave.node.updateSize()
		master.node.connect(master.index, slave.node, slave.index)

		this.view.setTree(this.tree)

		master.playConnection()


		this.displayFigure(null)

		this.events.emit('onAddElement', { status: 'connected' })
	},

	removeSample: function(id) {
		var sample = f.apick(this.sampler.samples, 'id', id)
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

		this.onresize()



		this.view.onTick(0)
		this.view2.onTick(0)

		if(typeof bootProgress === 'function') bootProgress(1)

		this.ready.resolve(true)
		this.loadFromHash()

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

		TWEEN.update()

		this.view.onTick(dt)
		this.view2.onTick(dt)

		if(this.view.nodeSelected) {
			var marker = this.view.nodeSelected.nodeMarker

			marker.point.world.setFromMatrixPosition(this.view.nodeSelected.objectCenter.matrixWorld)
			this.view.projector.updatePoint(marker.point)
			marker.update()
		}

		if(this.deletePromptStat) {
			var node = this.deletePromptStat.removeNode
			,   point = this.deletePromptTip.point

			point.world.setFromMatrixPosition(node.objectCenter.matrixWorld)
			this.view.projector.updatePoint(point)
			this.deletePromptTip.move(Math.round(point.screen.x), Math.round(point.screen.y))
		}
	}
})
