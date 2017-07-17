ViewCalc = f.unit(Block, {
	unitName: 'Block_ViewCalc',

	ename: 'view-calc',
	versionDrawn: -1,

	stock: 0.2,
	threshold: 1e-3,

	visibleMethod: dom.visible,

	fields: ['thumb', 'group', 'name', 'amount'],

	unitOrder: [
		"mt_d45", "mt_bh01", "mt_bh02",
		"mt_flat", "mt_flata", "mt_flatb",
		"mt_pin53", "mt_pin138",
		"mt_base", "mt_pad",
		"mt_dowel16", "mt_dowel21", "mt_angle",

		'siding', 'facade', 'joint',

		'outer', 'fouter', 'inner', 'radial',

		'begin', 'fbegin', 'finish',
		'jtrim', 'fjtrim',

		'hang', 'frame', 'soffit', 'ramp',

		'flume', 'flelb_90', 'flelb_125', 'flcoup', 'flsup', 'flend',
		'funnel', 'pielb_67', 'pipe', 'picoup', 'pisup', 'piend'
	],

	measures: {
		a: 'm_sqare_meter',
		p: 'm_meter',
		h: 'm_meter',
		l: 'm_meter',
		n: 'm_piece'
	},

	icons: {
		siding    : 'u-sd-siding',
		joint     : 'u-sd-joint',
		begin     : 'u-sd-begin',
		finish    : 'u-sd-finish',
		outer     : 'u-sd-outer',
		radial    : 'u-sd-radial',
		inner     : 'u-sd-inner',
		jtrim     : 'u-sd-jtrim',
		facade    : 'u-fc-facade',
		fbegin    : 'u-fc-begin',
		fjtrim    : 'u-fc-jtrim',
		fouter    : 'u-fc-outer',
		hang      : 'u-hang',
		frame     : 'u-frame',
		soffit    : 'u-soffit',
		ramp      : 'u-ramp',
		flume     : 'u-di-flume',
		flelb_90  : 'u-di-flelb-90',
		flelb_125 : 'u-di-flelb-125',
		flcoup    : 'u-di-flcoup',
		flsup     : 'u-di-flsup',
		flend     : 'u-di-flend',
		pipe      : 'u-di-pipe',
		pielb_67  : 'u-di-pielb',
		picoup    : 'u-di-picoup',
		pisup     : 'u-di-pisup',
		piend     : 'u-di-piend',
		funnel    : 'u-di-funnel',
		ab_bc100  : 'u-sd-joint-altaboard-100',
		ab_bc50   : 'u-sd-joint-altaboard-50',
		'ab_bc9.5': 'u-sd-joint-altaboard-9.5',
		ab_bc52   : 'u-sd-mount-altaboard-52',
		rust_b    : 'u-dr-corner-b',
		rust_m    : 'u-dr-corner-m',
		rust_s    : 'u-dr-corner-s',
		rust_u    : 'u-dr-corner-u'
	},

	thumbs: {
		flume: 'thumb-drain-flume.png',
		flelb_90: 'thumb-drain-flelb-90.png',
		flelb_125: 'thumb-drain-flelb-125.png',
		flcoup: 'thumb-drain-flcoup.png',
		flsup: 'thumb-drain-flsup.png',
		flend: 'thumb-drain-flend.png',
		pipe: 'thumb-drain-pipe.png',
		pielb: 'thumb-drain-pielb-45.png',
		picoup: 'thumb-drain-picoup.png',
		pisup: 'thumb-drain-pisup.png',
		piend: 'thumb-drain-piend.png',
		funnel: 'thumb-drain-funnel.png'
	},

	create: function() {
		this.obvTree = new Observable
		this.obvCalc = new Observable().set(this, this.readCalc)
		this.obvParams = new Observable().set(this, this.readParams)
		this.obvMaterials = new Observable().set(this, this.readMaterials)
		this.obvCalcMount = new Observable(false)

		this.canvas  = dom.elem('canvas', 'snapshot', this.element)
		this.context = this.canvas.getContext('2d')

		this.canvas.width  = 1920
		this.canvas.height = 1080

		this.sview   = dom.div('snapview')
		this.pview   = dom.div('params touchscroll')
		this.ptable  = dom.elem('table', 'params-table', this.pview)
		this.ptbody  = dom.elem('tbody', 'params-body', this.ptable)

		this.ptable.setAttribute('cellspacing', '0')
		this.ptable.setAttribute('cellpadding', '0')

		this.rview   = dom.div('result')
		this.rhead   = dom.div('result-header clearfix', this.rview)
		this.rhlabel = dom.div('result-label', this.rhead)
		this.rthead  = dom.elem('table', 'result-head',  this.rview)
		this.rtview  = dom.div('result-view touchscroll', this.rview)
		this.rtable  = dom.elem('table', 'result-table', this.rtview)
		this.rtbody  = dom.elem('tbody', 'result-body',  this.rtable)
		this.rtmsg   = dom.div('result-message', this.rview)

		this.visible.events.on('change', this.onvisible, this)

		this.rtable.setAttribute('cellspacing', '0')
		this.rtable.setAttribute('cellpadding', '0')

		this.rcart = new Block.Toggle({
			ename: 'action hand cart',
			eroot: this.rhead,
			handed: false,
			active: true,
			elabel: 'calc_label_cart',
			eicon: 'i-cart'
		})

		this.rmount = new Block.Toggle({
			ename: 'action hand mount option-boolean',
			eroot: this.rhead,
			handed: false,
			active: false,
			elabel: 'calc_label_mount'
		})

		this.rcmount = dom.div('field')
		dom.prepend(this.rmount.element, this.rcmount)

		this.rprint = new Block.Toggle({
			ename: 'action hand print',
			eroot: this.rhead,
			handed: false,
			active: true,
			etitle: 'calc_title_print',
			eicon: 'i-print'
		})

		dom.img('images/preloader-cart.gif', 'slow-05 preloader', this.rcart.element)


		this.rprint.events.on('change', this.onprint, this)
		this.rcart.events.on('change', this.oncart, this)
		this.rmount.events.on('change', this.onmount, this)

		Locale.setText(this.rhlabel, 'calc_header_result')
		Locale.setText(this.rtmsg, 'calc_message_empty')

		var rthead = dom.elem('thead', '', this.rthead)
		,   rthrow = dom.elem('tr', '', rthead)
		this.fields.forEach(function(field) {
			var col = dom.elem('th', 'result-col result-'+ field, rthrow)
			Locale.setText(col, 'calc_field_'+ field)
		}, this)

		this.tiles = new TileView
		this.tiles.setLayout(['h', ['v', 0, 0], 0], 0.45)
		this.tiles.events.on('update', this.ontilesupdate, this)
		this.tiles.setClients([
			{ element: this.sview },
			{ element: this.pview },
			{ element: this.rview }
		])
		dom.append(this.element, this.tiles.element)

		this.watched = []
		this.graphics = []
	},

	loading: function(loading) {
		this.rtview.style.backgroundImage = loading ? 'url(images/loading.gif)' : ''
	},

	cartLoading: function(isLoading) {
		dom.togclass(this.rcart.element, 'loading', isLoading)
	},

	ontilesupdate: function() {
		main.v3.autoresize()

		var offset = dom.offset(this.rtview, this.rview)
		this.rtview.style.height = this.height - offset.y +'px'

		this.updateHeaderSize()
	},

	onvisible: function(visible) {
		if(visible) {
			this.rtview.scrollTop = 0
			this.tiles.autoresize()
		}
	},

	oncart: function() {
		this.rcart.set(1)
		this.cartLoading(true)

		main.bus.emit('cart', this.materials)
	},

	onmount: function(active) {
		dom.togclass(this.rcmount, 'active', active)
		this.obvCalcMount.write(active)
	},

	onprint: function() {
		this.rprint.set(1)
		this.draw()
		window.print()
	},

	onresize: function() {
		this.tiles.autoresize()
	},

	updateHeaderSize: function() {
		for(var i = 0; i < this.fields.length; i++) {
			var field = this.fields[i]

			var td = dom.one('.result-'+ field, this.rtbody)
			,   th = dom.one('.result-'+ field, this.rthead)

			if(!td || !th) continue

			th.style.width = td.offsetWidth +'px'
		}
	},

	addTableCol: function(root, item) {
		var elem = dom.elem('td', 'table-col', root)

		dom.text(elem, item)
	},

	addParamsHeaderRow: function(root, item) {
		var col = dom.elem('td', 'table-head', root)

		col.setAttribute('colspan', 8)
		this.watched.push(Locale.setText(col, item))
	},

	addParamsBreakerRow: function(root) {
		var col = dom.elem('td', 'table-break', root)

		col.setAttribute('colspan', 8)
	},

	addParamsEmptyRow: function(root) {
		dom.elem('td', 'table-col', root)
		dom.elem('td', 'table-col', root)
		dom.elem('td', 'table-col', root)
		dom.elem('td', 'table-col', root)
	},

	addParamsItemRow: function(root, name) {
		dom.elem('td', 'table-col', root)
		var label = dom.elem('td', 'table-col', root)
		this.watched.push(Locale.setText(label, 'calc_'+ name))

		this.addTableCol(root, f.pround(this.params[name], 1))

		var unit  = this.units[name.split('_').pop()]
		,   eunit = dom.elem('td', 'table-col', root)

		this.watched.push(Locale.setHtml(eunit, unit))
	},

	addParamsRow: function(item) {
		var row = dom.elem('tr', 'table-row', this.ptbody)

		switch(typeof item) {
			case 'string':
				this.addParamsHeaderRow(row, item)
			break

			case 'number':
				this.addParamsBreakerRow(row)
			break

			default:
				item[0] ? this.addParamsItemRow(row, item[0]) : this.addParamsEmptyRow(row)
				item[1] ? this.addParamsItemRow(row, item[1]) : this.addParamsEmptyRow(row)
			break
		}

		return row
	},

	addResultRow: function(id, items) {
		if(!items) return

		var mat  = main.imagery.products[id]

		var group = main.db.query()
			.from('product')
			.where('product.id', 'eq', mat.id)
			.joinInner('group', 'product.gid', 'group.id')
			.joinLeft('image', 'group.logo', 'image.id')
			.selectOne(
				'image.object as logo',
				'group.title as title',
				'group.subtitle as subtitle')

		var erow  = dom.elem('tr', 'result-row', this.rtbody)
		,   ethum = dom.elem('td', 'result-col result-thumb',  erow)
		,   egrp  = dom.elem('td', 'result-col result-group',  erow)
		,   ename = dom.elem('td', 'result-col result-name',   erow)
		,   enumb = dom.elem('td', 'result-col result-amount', erow)
		,   elogo = dom.div('result-logo', egrp)
		,   etitl = dom.div('result-title', egrp)
		,   esubt = dom.div('result-subtitle', egrp)
		,   ecolo = dom.div('result-color', egrp)
		,   ecolv = dom.div('col-view', ecolo)
		,   ecoln = dom.div('col-name', ecolo)

		var icon  = this.icons[mat.unit]
		,   deft  = this.thumbs[mat.unit] || 'thumb-absent.png'
		,   thumb = mat.thumb ? mat.thumb.url : 'images/thumbs/'+ deft

		if(icon && mat.unit !== 'siding' && mat.unit !== 'facade') {
			Atlas.set(ethum, icon)
			this.graphics.push(ethum)

		} else {
			UI.setImage(ethum, thumb)
			dom.togclass(ethum, 'absent', !mat.thumb && !this.thumbs[mat.unit])
		}

		if(group.logo) {
			UI.setImage(elogo, group.logo.url)
		} else {
			dom.display(elogo, false)
		}

		if(mat.color) {
			var ecolab = dom.elem('span', null, ecoln)
			,   ecocol = dom.elem('span', null, ecoln)
			,   ecotxt = dom.elem('span', null, ecoln)

			dom.text(ecocol, ': ')
			this.watched.push(Locale.setText(ecolab, 'calc_field_color'))
			this.watched.push(Locale.setText(ecotxt, mat.title))

			ecolv.style.backgroundColor = mat.color

		} else if(mat.cid) {
			this.watched.push(Locale.setText(ecoln, mat.title))
			if(mat.thumb) UI.setImage(ecolv, mat.thumb.url)
			else if(mat.texture) UI.setImage(ecolv, mat.texture.url)

		} else {
			dom.display(ecolo, false)
		}

		dom.text(enumb, items)

		this.watched.push(Locale.setText(ename, 'unit_'+ mat.unit))
		this.watched.push(Locale.setText(etitl, group.title))
		if(group.subtitle) this.watched.push(Locale.setText(esubt, group.subtitle))
		else dom.text(esubt, '')
	},

	setTree: function(tree) {
		this.obvTree.write(tree)
	},

	setScene: function(scene) {
		this.scene = scene
	},

	readParams: function() {
		var tree = this.obvTree.read()

		var params = {
			room_a: 0,

			wall_w: 0,
			wall_h: 0,
			wall_n: 0,
			walls: [],

			comm_a: 0,
			comm_p: 0,

			hole_a: 0,
			hole_p: 0,
			hole_l: 0,
			hole_w: 0,
			hole_h: 0,
			hole_n: 0,
			holes: [],

			door_n: 0,
			door_a: 0,
			door_p: 0,
			door_l: 0,
			win_n: 0,
			win_a: 0,
			win_p: 0,
			win_l: 0,

			plin_a: 0,
			plin_p: 0,
			plin_h: tree.obvPlinth.read(),

			pocorn_l: 0,
			picorn_l: 0,
			prcorn_l: 0,
			pacorn_l: 0,

			ocorn_l: 0,
			icorn_l: 0,
			rcorn_l: 0,
			acorn_l: 0,
			acorn_n: 0,

			drain_h: 0,
			drain_p: 0,
			roof_a: 0,
			ledge_a: 0,
			ledge_p: 0,
			finish_l: 0,
			begin_l: 0,

			flume_n: 0,
			flume_l: 0,
			flend_n: 0,
			fle90_n: 0,
			fle125_n: 0,
			pipe_n: 0,
			pipe_l: 0
		}

		var floors = tree.obvFloors.read()
		for(var i = 0; i < floors.length; i++) {
			var floor = floors[i]
			,   floor_boxes = floor.obvBoxes.read()
			,   floor_roofs = floor.obvRoofs.read()

			for(var j = 0; j < floor_boxes.length; j++) {
				var contour = floor_boxes[j]
				,   contour_height = contour.obvHeight.read()
				,   contour_area   = contour.obvArea.read()
				,   contour_points = contour.obvPoints.read()
				,   contour_walls  = contour.obvWalls.read()

				for(var k = 0; k < contour_points.length; k++) {
					var point = contour_points[k]

					if(point.obvOuter.read()) {
						if(point.obvDirect.read()) {
							params.ocorn_l += contour_height
							if(!i) params.pocorn_l += params.plin_h

						} else {
							params.rcorn_l += contour_height
							if(!i) params.prcorn_l += params.plin_h
						}
					} else {
						params.icorn_l += contour_height
						if(!i) params.picorn_l += params.plin_h
					}
					params.acorn_l += contour_height
					params.acorn_n ++
					if(!i) params.pacorn_l += params.plin_h
				}

				for(var k = 0; k < contour_walls.length; k++) {
					var wall = contour_walls[k]
					,   wall_width = wall.obvWidth.read()
					,   wall_pmin  = wall.obvPmin.read()
					,   wall_pmax  = wall.obvPmax.read()
					,   wall_holes = wall.obvHoles.read()

					params.wall_w += wall_width
					params.wall_h += contour_height
					params.wall_n ++

					params.walls.push({
						w: wall_width,
						h: contour_height
					})

					wall_holes.forEach(addHole)

					if(!i) {
						params.plin_a += wall_width * params.plin_h
						params.plin_p += wall_width
					}

					params.begin_l += wall_width

					var below = wall.findCoplanar(false)
					for(var l = 0; l < below.length; l++) {
						var bwall = below[l]
						,   bwall_pmin = bwall.obvPmin.read()
						,   bwall_pmax = bwall.obvPmax.read()

						if(bwall_pmin > wall_pmax
						|| bwall_pmax < wall_pmin) continue

						var pr = Math.min(bwall_pmax, wall_pmax)
						,   pl = Math.max(bwall_pmin, wall_pmin)

						params.begin_l -= pr - pl
					}

					params.finish_l += wall_width

					var above = wall.findCoplanar(true)
					for(var l = 0; l < above.length; l++) {
						var awall = above[l]
						,   awall_pmin = awall.obvPmin.read()
						,   awall_pmax = awall.obvPmax.read()

						if(awall_pmin > wall_pmax
						|| awall_pmax < wall_pmin) continue

						var pr = Math.min(awall_pmax, wall_pmax)
						,   pl = Math.max(awall_pmin, wall_pmin)

						params.finish_l -= pr - pl
					}

					params.comm_a += wall_width * contour_height
					params.comm_p += wall_width
				}

				if(contour_height > 1) {
					params.room_a += contour_area
				}
			}

			for(var j = 0; j < floor_roofs.length; j++) {
				var roof = floor_roofs[j]
				,   roof_bottom = roof.obvBottom.read()
				,   roof_height = roof.obvHeight.read()
				,   roof_points = roof.obvPoints.read()
				,   roof_walls  = roof.obvWalls.read()
				,   roof_drain  = roof.obvDrain.read()
				,   roof_area   = roof.obvArea.read()
				,   roof_gables = false

				for(var k = 0; k < roof_points.length; k++) {
					var point = roof_points[k]
					,   point_prevWall = point.obvPrevWall.read()
					,   point_nextWall = point.obvNextWall.read()

					var ledgeA = point_prevWall.obvLedgeOffset.read()
					,   ledgeB = point_nextWall.obvLedgeOffset.read()
					,   length = Math.sqrt(ledgeA * ledgeA + ledgeB * ledgeB)

					params.ledge_p += length * 2
				}

				for(var k = 0; k < roof_walls.length; k++) {
					var slope = roof_walls[k]
					,   slope_gable = slope.obvGable.read()
					,   slope_area  = slope.obvArea.read()
					,   slope_holes = slope.obvHoles.read()
					,   clo = slope.obvLedgeOffset.read()
					,   clw = slope.obvLedgeWidth.read()
					,   csw = slope.obvSlopeWidth.read()

					var prevSlope = slope.obvPrevNode.read()
					,   nextSlope = slope.obvNextNode.read()
					,   plo = prevSlope.obvLedgeOffset.read()
					,   nlo = nextSlope.obvLedgeOffset.read()


					if(slope_gable) {
						slope_holes.forEach(addHole)

						roof_gables = true
						params.ledge_a += clo * (csw * 2 - plo - nlo) / 2
						params.ledge_p += csw * 2 - plo - nlo
						params.comm_a += slope_area

					} else {
						params.ledge_a += clo * (clw * 2 - plo - nlo) / 2
						params.ledge_p += clw * 2 - plo - nlo
						params.roof_a += slope_area
					}

					if(roof_drain && !slope_gable) {
						params.drain_p += clw
					}
				}

				if(roof_gables && roof_height > 1) {
					params.room_a += roof_area
				}

				if(!roof_drain) continue

				for(var k = 0; k < roof_points.length; k++) {
					var corner = roof_points[k]
					,   corner_direct = corner.obvDirect.read()
					,   corner_beta   = corner.obvBeta.read()
					,   abeta = Math.abs(corner_beta)

					var prevWall = corner.obvPrevWall.read()
					,   nextWall = corner.obvNextWall.read()

					var prevGable = prevWall.obvGable.read()
					,   nextGable = nextWall.obvGable.read()

					if(nextGable || prevGable) {
						params.flend_n += nextGable ^ prevGable

					} else if(corner_direct) {
						params.fle90_n ++

					} else if(f.torad(120) < abeta && abeta < f.torad(150)) {
						params.fle125_n ++

					} else {
						params.flend_n += 2
					}
				}

				for(var k = 0; k < roof_drain.thing.subnodes.length; k++) {
					var subnode = roof_drain.thing.subnodes[k]
					if(!subnode.data) continue

					switch(subnode.type) {
						case 'flume':
							params.flume_l += subnode.data.length
							params.flume_n ++
						break
					}
				}

				var drain_pipes = roof_drain.obvPipes.read()
				for(var k = 0; k < drain_pipes.length; k++) {
					var pipe = drain_pipes[k]

					for(var l = 0; l < pipe.thing.subnodes.length; l++) {
						var subnode = pipe.thing.subnodes[l]
						if(!subnode.data) continue

						switch(subnode.type) {
							case 'pipe':
								params.pipe_l += subnode.data.length
								params.pipe_n ++
							break
						}
					}
				}

				params.drain_h += roof_bottom
			}
		}

		function addHole(hole) {
			var hole_width  = hole.obvWidth.read()
			,   hole_height = hole.obvHeight.read()
			,   hole_type   = hole.obvSampleType.read()

			params.hole_w += hole_width
			params.hole_h += hole_height
			params.hole_n ++

			params.holes.push({
				w: hole_width,
				h: hole_height
			})

			switch(hole_type) {
				case 'door':
					params.door_n ++
					params.door_a += hole_width * hole_height
					params.door_p += hole_width * 1 + hole_height * 2
					params.door_l += hole_width * 1
				break

				case 'window':
					params.win_n ++
					params.win_a += hole_width * hole_height
					params.win_p += hole_width * 1 + hole_height * 2
					params.win_l += hole_width * 1
				break
			}
		}

		params.hole_a = params.win_a + params.door_a
		params.hole_p = params.win_p + params.door_p
		params.hole_l = params.win_l + params.door_l
		params.room_p = params.plin_p
		params.wall_a = params.comm_a - params.hole_a
		params.begin_l -= params.door_l

		this.params = params
		return params
	},

	addMaterial: function(mat, length, stock) {
		if(!mat || !length) return

		if(!mat.art) {
			console.warn('adding ethereal material:', mat)
		}

		if(main.debug) {
			console.log('addmat:', mat.unit, mat.id, mat.group, mat.cname, length)
		}

		if(!this.materials[mat.id]) {
			this.materials[mat.id] = 0
		}

		if(isNaN(stock)) stock = this.stock
		this.materials[mat.id] += (1 + stock) * length / (mat.size || 1)
	},

	addSimilarMaterial: function(mat, unit, length, stock) {
		var similar = main.imagery.getSimilarProduct(mat, unit)
		if(!similar) return

		this.addMaterial(similar, length, stock)
	},

	addMountingPins: function(length) {
		var warming = false
		,   pins = length * 3
		,   t_pins = warming ? 'mt_pin138' : 'mt_pin53'

		this.addSimilarMaterial(null, 'mt_base', pins, 0)
		this.addSimilarMaterial(null, t_pins, pins, 0)
	},

	readMaterials: function() {
		var pmat = main.imagery.getUsedProduct('plinth')
		,   xmat = main.imagery.getUsedProduct('pcorner')
		,   cmat = main.imagery.getUsedProduct('corner')
		,   fmat = main.imagery.getUsedProduct('framing')
		,   smat = main.imagery.getUsedProduct('soffit')
		,   dmat = main.imagery.getUsedProduct('drain')

		this.materials = {}


		var tree   = this.obvTree.read()
		,   subs   = tree.obvSubnodePool.read()
		,   params = this.obvParams.read()
		,   cutter = tree.obvCutter.read()
		,   pages  = cutter.obvPages.read()
		for(var plid in pages) {
			var page = pages[plid]
			,   tiles = page.obvTiles.read()
			,   pieces = page.obvPieces.read()

			for(var j = 0; j < pieces.length; j++) {
				var piece = pieces[j]
				,   wmat = main.imagery.getUsedProduct(piece.material)
				if(!wmat || !wmat.group) continue


				var lpiece = piece.obvLPiece.read()
				,   rpiece = piece.obvRPiece.read()
				,   dpiece = piece.obvDPiece.read()
				,   upiece = piece.obvUPiece.read()

				var area = 0
				,   hlen = 0

				var voidL = 0
				,   voidR = 0
				,   voidU = 0
				,   voidD = 0

				var psubs = subs.filter(function(s) {
					return s.type === 'wall' && s.targets.piece === piece
				})

				for(var k = 0; k < psubs.length; k++) {
					var subnode = psubs[k]

					var sd = subnode.data
					if(!sd) continue

					area += sd.area
					hlen += sd.holeL + sd.holeR + sd.holeU

					var joinL = 0
					,   joinR = 0
					,   joinD = 0
					,   joinU = 0

					for(var l = 0; l < psubs.length; l++) {
						var other = psubs[l]
						var od = other.data
						if(!od || sd === od || sd.plid !== od.plid) continue

						var dminX = Math.max(sd.minX, od.minX)
						,   dminY = Math.max(sd.minY, od.minY)
						,   dmaxX = Math.min(sd.maxX, od.maxX)
						,   dmaxY = Math.min(sd.maxY, od.maxY)

						var dx = Math.max(0, dmaxX - dminX)
						,   dy = Math.max(0, dmaxY - dminY)

						if(od.maxX === sd.minX) joinL += dy
						if(od.minX === sd.maxX) joinR += dy
						if(od.maxY === sd.minY) joinD += dx
						if(od.minY === sd.maxY) joinU += dx
					}

					// these thing are not equal as sd.edgeN has hole counted
					if(!sd.hasL && joinL < sd.edgeL) voidL += sd.edgeL - joinL
					if(!sd.hasR && joinR < sd.edgeR) voidR += sd.edgeR - joinR
					if(!sd.hasD && joinD < sd.edgeD) voidD += sd.edgeD - joinD
					if(!sd.hasU && joinU < sd.edgeU) voidU += sd.edgeU - joinU
				}



				if(/altaboard/i.test(wmat.group)) {
					var bc50  = voidD + voidU + voidL + voidR
					,   bc100 = hlen
					,   bc52  = bc50 / 2 + bc100

					this.addMaterial(wmat, area)
					this.addSimilarMaterial(wmat, 'ab_bc50',  bc50)
					this.addSimilarMaterial(wmat, 'ab_bc100', bc100)
					this.addSimilarMaterial(wmat, 'ab_bc52',  bc52)

				} else if(wmat.unit === 'siding') {
					var begin  = voidD
					,   finish = voidU

					this.addMaterial(wmat, area)
					this.addSimilarMaterial(wmat, 'begin',  begin)
					this.addSimilarMaterial(wmat, 'finish', finish)

				} else if(wmat.unit === 'facade') {
					var fbegin = voidD
					,   fjtrim = voidU + hlen

					this.addMaterial(wmat, area)
					this.addSimilarMaterial(wmat, 'fbegin', fbegin)
					this.addSimilarMaterial(wmat, 'fjtrim', fjtrim)

				} else {
					console.log('do not happen')
				}


				if(!this.obvCalcMount.read()) continue

				var t_mount
				switch(wmat.gid) {
					case 'g_altas':
					case 'g_alaska_lux':
					case 'g_alaska_clas':
					case 'g_kanada_prest':
					case 'g_kanada_prem':
						t_mount = 'mt_d45'
					break

					case 'g_bh_1':
						t_mount = 'mt_bh01'
					break

					case 'g_bh_2':
					case 'g_bh_2s':
						t_mount = 'mt_bh02'
					break

					case 'g_rock':
					case 'g_canyon':
					case 'g_fagot':
					case 'g_antique':
					case 'g_clinker':
					case 'g_tile':
						t_mount = 'mt_flata'
					break

					case 'g_brick':
					case 'g_stone':
					case 'g_granite':
						t_mount = 'mt_flatb'
					break

					default:
						t_mount = 'mt_flat'
					break
				}

				var mmat  = main.imagery.getSimilarProduct(null, t_mount)
				,   step  = 0.4 // 30-40cm recommended range
				,   mount = area / step

				this.addMaterial(mmat, mount)
				this.addMountingPins(mount / mmat.size)
			}
		}

		for(var i = 0; i < subs.length; i++) {
			var subnode = subs[i]
			,   data = subnode.data
			if(!data) continue

			switch(subnode.type) {
				case 'join':
					if(!data.length) break

					var jmat = data.material.obvFabric.read()
					if(!jmat || !jmat.id) break

					var jw = jmat.width / 1000

					this.addMaterial(jmat, Math.ceil(data.length / jw) * jw, 0)
				break
			}
		}

		var flat_mat = main.imagery.getSimilarProduct(null, 'mt_flat')
		if(flat_mat && this.obvCalcMount.read()) {
			var flats = 0
			,   size = flat_mat.width / 1000

			params.walls.forEach(function(wall) {
				flats += 2 * (Math.ceil(wall.w / size) + Math.ceil(wall.h / size))
			})
			params.holes.forEach(function(hole) {
				flats += 2 * (Math.ceil(hole.w / size) + Math.ceil(hole.h / size))
			})

			this.addMaterial(flat_mat, flats * size, 0)
			this.addMountingPins(flats)


			var angles = Math.ceil(Math.ceil(params.acorn_n * (params.wall_h / params.wall_n)))
			this.addSimilarMaterial(null, 'mt_angle', angles, 0)
		}


		if(pmat && pmat.group && params.plin_h) {
			this.addMaterial(pmat, params.plin_a)
			this.addSimilarMaterial(pmat, 'fbegin', params.plin_p)
		}

		if(xmat && xmat.group) {
			var rust = xmat.unit === 'rust'

			if(rust) {
				var h = xmat.sample.height
				,   l = params.pocorn_l
				,   k = Math.ceil(l / h)

				this.addSimilarMaterial(xmat, 'rust_b', k * xmat.sample.blocks_big, 0)
				this.addSimilarMaterial(xmat, 'rust_m', k * xmat.sample.blocks_middle, 0)
				this.addSimilarMaterial(xmat, 'rust_s', k * xmat.sample.blocks_small, 0)
				this.addSimilarMaterial(xmat, 'rust_u', l)

			} else {
				this.addMaterial(xmat, params.pocorn_l)
				this.addSimilarMaterial(xmat, 'radial', params.prcorn_l)
			}
		}

		if(cmat && cmat.group) {
			var facade = cmat.unit === 'fouter'
			,   rust   = cmat.unit === 'rust'

			if(rust) {
				var h = cmat.sample.height
				,   l = params.ocorn_l
				,   k = Math.ceil(l / h)

				this.addSimilarMaterial(cmat, 'rust_b', k * cmat.sample.blocks_big, 0)
				this.addSimilarMaterial(cmat, 'rust_m', k * cmat.sample.blocks_middle, 0)
				this.addSimilarMaterial(cmat, 'rust_s', k * cmat.sample.blocks_small, 0)
				this.addSimilarMaterial(cmat, 'rust_u', l)

			} else {
				this.addMaterial(cmat, params.ocorn_l)
				this.addSimilarMaterial(cmat, 'radial', params.rcorn_l)
				if(!facade) this.addSimilarMaterial(cmat, 'inner', params.icorn_l)
			}
		}

		if(fmat && fmat.group) {
			this.addMaterial(fmat, params.hole_p)
		}

		if(smat && smat.group) {
			this.addMaterial(smat, params.ledge_a)
			this.addSimilarMaterial(smat, 'jtrim', params.ledge_p)
		}

		if(dmat && dmat.group) {
			var flumeMat  = main.imagery.getSimilarProduct(dmat, 'flume')
			,   flsupMat  = main.imagery.getSimilarProduct(dmat, 'flsup')
			,   flcoupMat = main.imagery.getSimilarProduct(dmat, 'flcoup')
			,   pipeMat   = main.imagery.getSimilarProduct(dmat, 'pipe')

			var couplings = params.flume_l / flumeMat.size / 2
			// 2 supports for each elbow, funnel, and coupling
			var fittings = params.fle90_n + params.fle125_n + params.pipe_n + couplings / flcoupMat.size

			this.addMaterial(flumeMat, params.flume_l)
			this.addMaterial(flsupMat, params.flume_l + fittings * flsupMat.size)
			this.addMaterial(flcoupMat, couplings)
			this.addSimilarMaterial(dmat, 'flelb_90', params.fle90_n, 0)
			this.addSimilarMaterial(dmat, 'flelb_125', params.fle125_n, 0)
			this.addSimilarMaterial(dmat, 'flend', params.flend_n, 0)

			this.addMaterial(pipeMat, params.pipe_l)
			this.addSimilarMaterial(dmat, 'pisup', params.pipe_l)
			this.addSimilarMaterial(dmat, 'picoup', params.pipe_l / pipeMat.size)
			this.addSimilarMaterial(dmat, 'pielb_67', params.pipe_n * 2, 0)
			this.addSimilarMaterial(dmat, 'piend', params.pipe_n, 0)
			this.addSimilarMaterial(dmat, 'funnel', params.pipe_n, 0)
		}

		this.ceilMaterials(this.materials)

		return this.materials
	},

	ceilMaterials: function(materials) {
		if(main.debug) console.log('material items, stock', this.stock)

		for(var key in materials) {
			var val  = materials[key]

			if(val > this.threshold) {
				materials[key] = Math.ceil(val)
				if(main.debug) console.log(' ', key, val)

			} else {
				delete materials[key]
			}
		}
	},

	sortUnits0: function(key) {
		var parts = key.split('/')
		,   gord  = this.groupOrder.indexOf(parts[0])
		,   names = this.unitOrder.length
		,   uord  = this.unitOrder.indexOf(parts[1])

		return gord + (~uord ? uord : names) / (names +1)
	},

	sortUnits1: function(id) {
		var mat   = main.imagery.products[id]
		,   gord  = this.groupOrder.indexOf(mat.group)
		,   names = this.unitOrder.length
		,   uord  = this.unitOrder.indexOf(mat.unit)

		return gord + (~uord ? uord : names) / (names +1)
	},

	sortUnits: function(id) {
		var mat   = main.imagery.products[id]
		,   gord  = this.groupOrder.indexOf(mat.group)
		,   names = this.unitOrder.length
		,   uord  = this.unitOrder.indexOf(mat.unit)

		return (~uord ? uord : names) + gord / this.groupOrder.length
	},

	draw: function() {
		if(!this.scene) return

		var sw = this.canvas.width
		,   sh = this.canvas.height
		,   sr = (sw + sh) / 2
		,   cx = sw >> 1
		,   cy = sh >> 1

		main.v3.snapshot(this.context, sw, sh)

		var g = this.context.createRadialGradient(cx, cy, sr * 0.4, cx, cy, sr * 0.7)

		g.addColorStop(0, 'rgba(240, 240, 240, 0)')
		g.addColorStop(1, 'rgba(240, 240, 240, 1)')
		this.context.fillStyle = g
		this.context.fillRect(0, 0, sw, sh)
	},

	readCalc: function() {
		var tree = this.obvTree.read()
		if(!tree) return NaN


		var materials = this.obvMaterials.read()

		this.watched.forEach(Locale.unwatch)
		this.watched = []

		this.graphics.forEach(Atlas.free)
		this.graphics = []


		this.units = {
			a: 'm_square_meter',
			p: 'm_meter',
			h: 'm_meter',
			l: 'm_meter',
			n: 'm_piece'
		}

		var scheme = [
			'calc_header_common',
			['room_a',  'win_n' ],
			['room_p',  'door_n'],

			0, 'calc_header_params',
			['wall_a',  'win_p' ],
			['ocorn_l', 'win_l' ],
			['icorn_l', 'door_p'],
			[null,      'hole_a'],
			['roof_a',  'plin_h'],
			['drain_p', 'plin_a'],
			['drain_h'          ],
			['ledge_a'          ]
		]

		dom.html(this.ptbody, '')
		scheme.forEach(this.addParamsRow, this)

		dom.html(this.rtbody, '')



		// var groupweight = {}
		// for(var key in materials) {
		// 	var id = key.split('/')[0]

		// 	if(groupweight[id]) {
		// 		groupweight[id] += materials[key]
		// 	} else {
		// 		groupweight[id]  = materials[key]
		// 	}
		// }

		var groupweight = {}
		for(var id in materials) {
			var group = main.imagery.products[id].group

			if(groupweight[group]) {
				groupweight[group] += materials[id]
			} else {
				groupweight[group]  = materials[id]
			}
		}

		this.groupOrder = f.sort(Object.keys(groupweight), function(id) { return -groupweight[id] })
		for(var i = this.groupOrder.length -1; i >= 0; i--) {
			var g = this.groupOrder[i]

			if(g.indexOf('drain') !== -1) {
				this.groupOrder.splice(i, 1)
				this.groupOrder.push(g)
			}
		}

		this.materialsList = f.sort(Object.keys(materials), this.sortUnits, this)
		for(var i = 0; i < this.materialsList.length; i++) {
			var name  = this.materialsList[i]

			this.addResultRow(name, materials[name])
		}

		var empty = !this.materialsList.length
		dom.display(this.rhead,  !empty)
		dom.display(this.rthead, !empty)
		dom.display(this.rtview, !empty)
		dom.display(this.rtmsg,   empty)


		this.updateHeaderSize()

		return NaN
	},

	update: function(t, dt, i) {
		if(!this.visible.value) return

		this.obvCalc.read()
	}
})
