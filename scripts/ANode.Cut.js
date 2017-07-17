ANode.Cutter = f.unit(ANode, {
	unitName: 'ANode_Cutter',
	name: 'cutter',
	removable: false,

	create: function() {
		this.obvPages = this.mountHash(new Observable({}).set(this, this.readPages))
		this.obvHCuts = this.mountList(new Observable([]).set(this, this.readCuts, this.writeHCuts))
	},

	writeJSON: function(json) {
		for(var i = 0; i < json.length; i++) {
			var page_json = json[i]
			if(!isNaN(page_json.plid)) continue

			var cuts_json = page_json.cuts
			if(!cuts_json || !cuts_json.length) continue

			var cuts = []
			for(var j = 0; j < cuts_json.length; j++) {
				cuts.push(new ANode.HCut(cuts_json[j]))
			}

			this.obvHCuts.write(cuts)
		}

		var pages = this.obvPages.read()
		for(var i = 0; i < json.length; i++) {
			var page_json = json[i]
			if( isNaN(page_json.plid)) continue

			var page = pages[page_json.plid]
			if(!page) {
				console.warn('AN.Cutter: page not exist', page_json)

			} else {
				page.obvJSON.write(page_json)
			}
		}
	},

	readJSON: function() {
		var pages = this.obvPages.read()
		,   hcuts = this.obvHCuts.read()

		var json = []

		if(hcuts.length) json.push({
			cuts: hcuts.map(this.readItemJSON)
		})

		for(var plid in pages) {
			json.push(pages[plid].obvJSON.read())
		}

		return json
	},

	readPages: function(prev) {
		var house = this.obvParent.read()
		,   hash  = house.obvWallsHash.read()
		,   hcuts = this.obvHCuts.read()
		,   next  = f.copy({}, prev)

		for(var plid in hash) {

			var page = next[plid]
			if(!page) {
				page = new ANode.Cutpage

				var cuts = []
				for(var i = 0; i < hcuts.length; i++) {
					cuts.push(new ANode.HCut(hcuts[i].obvPos.read()))
				}
				page.obvHCuts.write(cuts)

				next[plid] = page
			}
		}

		return next
	},

	sortCuts: function(a, b) {
		return a.obvPos.read() - b.obvPos.read()
	},

	readCuts: function(cuts) {
		return cuts.slice().sort(ANode.Cutter.prototype.sortCuts)
	},


	addCut: function(obvCuts, posA, horizontal) {
		var cuts = obvCuts.read()
		for(var i = 0; i < cuts.length; i++) {
			var posB = cuts[i].obvPos.read()

			if(Math.abs(posA - posB) < Geo.EPS) return
			if(posA < posB) break
		}

		cuts = cuts.slice()
		cuts.splice(i, 0, horizontal
			? new ANode.HCut(posA)
			: new ANode.VCut(posA))

		obvCuts.write(cuts)
	},

	cutVertically: function(pos, plid) {
		var page = this.getPage(plid)
		if(page) this.addCut(page.obvVCuts, pos, false)
	},

	cutHorizontally: function(pos, plid) {
		this.addCut(this.obvHCuts, pos, true)
	},

	writeHCuts: function(next, prev) {
		var diff = f.adiff(next, prev)
		if(!diff.remc && !diff.addc) return

		var pages = this.obvPages.read()

		for(var i = 0; i < diff.remc; i++) {
			var index = diff.remi[i]

			for(var plid in pages) {
				var page = pages[plid]
				,   cuts = page.obvHCuts.read().slice()

				cuts.splice(index, 1)
				page.obvHCuts.write(cuts)
			}
		}

		for(var i = 0; i < diff.addc; i++) {
			var index = diff.addi[i]
			,   cut = next[index]
			,   pos = cut.obvPos.read()

			for(var plid in pages) {
				var page = pages[plid]
				,   cuts = page.obvHCuts.read().slice()

				cuts.splice(index, 0, new ANode.HCut(pos))
				page.obvHCuts.write(cuts)
			}
		}
	},

	getPage: function(plid) {
		var pages = this.obvPages.read()
		return pages[plid]
	}
})

ANode.Cutpage = f.unit(ANode, {
	unitName: 'ANode_Cutpage',
	name: 'cutpage',
	T3: Draw3D.Cutpage,
	removable: false,

	create: function() {
		var readCuts = ANode.Cutter.prototype.readCuts

		this.obvPieces = this.mountList()
		this.obvHCuts  = this.mountList(new Observable([]).set(this, readCuts, this.writeHCuts))
		this.obvVCuts  = this.mountList(new Observable([]).set(this, readCuts, this.writeVCuts))
		this.obvTiles  = this.mountList(new Observable([]).set(this, this.readTiles))

		this.obvPlid = new Observable().set(this, this.readPlid)
		this.obvCols = new Observable(1)
		this.obvRows = new Observable(1)

		this.obvUpdate = new Observable().set(this, this.readUpdate)
		this.obvWalls  = new Observable().set(this, this.readWalls)
		this.obvWall0  = new Observable().set(this, this.readWall0)
		this.obvBox    = new Observable().set(this, this.readBox, null, Geo.equalBox2)
		this.obvPoly   = new Observable().set(this, this.readPoly)

		this.obvHoles = new Observable().set(this, this.readHoles)
		this.obvHoleBoxes = new Observable().set(this, this.readHoleBoxes)

		this.obvPieces.write([ new ANode.Cutpiece ])
	},

	writeJSON: function(json) {
		if(json.cuts && json.cuts.length) {
			var cuts = []
			for(var j = 0; j < json.cuts.length; j++) {
				cuts.push(new ANode.VCut(json.cuts[j]))
			}
			this.obvVCuts.write(cuts)
		}

		if(json.pieces && json.pieces.length) {
			var pieces = this.obvPieces.read()
			for(var j = 0; j < pieces.length; j++) {
				pieces[j].obvJSON.write(json.pieces[j])
			}
		}

		if(json.tiles && json.tiles.length) {
			var tiles = this.obvTiles.read()
			for(var j = 0; j < tiles.length; j++) {
				tiles[j].obvJSON.write(json.tiles[j])
			}
		}

		if(json.hsegs && json.hsegs.length) {
			var hcuts = this.obvHCuts.read()
			for(var j = 0; j < hcuts.length; j++) {
				hcuts[j].obvSegmentFabrics.write(json.hsegs[j])
			}
		}

		if(json.vsegs && json.vsegs.length) {
			var vcuts = this.obvVCuts.read()
			for(var j = 0; j < vcuts.length; j++) {
				vcuts[j].obvSegmentFabrics.write(json.vsegs[j])
			}
		}
	},

	readJSON: function() {
		var json = {}

		var plid = this.obvPlid.read()
		if(!isNaN(plid)) {
			json.plid = plid
		}

		var vcuts = this.obvVCuts.read()
		if(vcuts.length) {
			json.cuts = vcuts.map(this.readItemJSON)

			var vsegs = vcuts.map(f.prop('obvSegmentFabrics')).map(f.func('read'))
			if(vsegs.filter(Boolean).length) {
				json.vsegs = vsegs
			}
		}

		var hcuts = this.obvHCuts.read()
		if(hcuts.length) {

			var hsegs = hcuts.map(f.prop('obvSegmentFabrics')).map(f.func('read'))
			if(hsegs.filter(Boolean).length) {
				json.hsegs = hsegs
			}
		}

		var pieces = this.obvPieces.read().map(this.readItemJSON)
		if(pieces.filter(Boolean).length) {
			json.pieces = pieces
		}

		var tiles = this.obvTiles.read()
		if(tiles.length) {
			json.tiles = tiles.map(this.readItemJSON)
		}

		return json
	},

	readPlid: function() {
		return +this.obvMountIndex.read()
	},

	readWalls: function() {
		var root = this.obvRoot.read()
		if(!root) return []

		return root.getWalls(this.obvPlid.read())
	},

	readWall0: function() {
		return this.obvWalls.read() [0]
	},

	readBox: function() {
		var box = new THREE.Box2

		var walls = this.obvWalls.read()
		for(var i = 0; i < walls.length; i++) {
			var wall = walls[i]
			if(wall instanceof ANode.Slope && !wall.obvGable.read()) continue

			box.union(wall.obvWbox.read())
		}

		return box
	},

	readPoly: function() {
		var contours = []

		var walls = this.obvWalls.read()
		for(var i = 0; i < walls.length; i++) {
			var wall = walls[i]

			if(wall instanceof ANode.Slope) {
				if(!wall.obvGable.read()) continue

				contours.push(wall.obvPlaneContour.read().slice())

			} else {
				var box = wall.obvWbox.read()

				contours.push([
					new THREE.Vector2(box.min.x, box.min.y),
					new THREE.Vector2(box.min.x, box.max.y),
					new THREE.Vector2(box.max.x, box.max.y),
					new THREE.Vector2(box.max.x, box.min.y) ])
			}
		}

		return Geo.mergeAlignedContoursXY(contours)
	},

	readHoles: function() {
		var holes = []

		var walls = this.obvWalls.read()
		for(var i = 0; i < walls.length; i++) {
			holes = holes.concat(walls[i].obvHoles.read())
		}

		return holes
	},

	readHoleBoxes: function() {
		var hole_boxes = []

		var holes = this.obvHoles.read()
		for(var j = 0; j < holes.length; j++) {
			var h = holes[j]
			if(!h.obvValid.read() || h.obvBlank.read()) continue

			var hbox = h.obvBox.read()

			hole_boxes.push({
				minX: hbox.min.x,
				maxX: hbox.max.x,
				minY: hbox.min.y,
				maxY: hbox.max.y
			})
		}

		return hole_boxes
	},

	readUpdate: function() {
		var hc = this.obvHCuts.read()
		,   vc = this.obvVCuts.read()

		var w = this.obvCols.read()
		,   h = this.obvRows.read()


		var pieces = this.obvPieces.read()
		for(var i = 0; i < pieces.length; i++) {
			var piece = pieces[i]

			var row = Math.floor(i / w)
			,   col = i % w

			var lcut = vc[col-1]
			,   dcut = hc[row-1]
			,   rcut = vc[col  ]
			,   ucut = hc[row  ]

			piece.obvCol.write(col)
			piece.obvRow.write(row)

			piece.obvLCut.write(lcut || null)
			piece.obvDCut.write(dcut || null)
			piece.obvRCut.write(rcut || null)
			piece.obvUCut.write(ucut || null)

			piece.obvDPiece.write(row ===   0 ? null : pieces[w * (row -1) + col])
			piece.obvUPiece.write(row === h-1 ? null : pieces[w * (row +1) + col])
			piece.obvLPiece.write(col ===   0 ? null : pieces[w * row + col -1])
			piece.obvRPiece.write(col === w-1 ? null : pieces[w * row + col +1])

			var box = new THREE.Box2
			box.min.x = lcut ? lcut.obvPos.read() : -Infinity
			box.min.y = dcut ? dcut.obvPos.read() : -Infinity
			box.max.x = rcut ? rcut.obvPos.read() :  Infinity
			box.max.y = ucut ? ucut.obvPos.read() :  Infinity

			piece.obvBox.write(box)
		}

		return NaN
	},


	writeHCuts: function(next, prev) {
		this.modifyGrid(next, prev, this.dropRow, this.cloneRow)
	},

	writeVCuts: function(next, prev) {
		this.modifyGrid(next, prev, this.dropCol, this.cloneCol)
	},

	modifyGrid: function(next, prev, drop, clone) {
		var diff = f.adiff(next, prev)
		if(!diff.remc && !diff.addc) return

		for(var i = 0; i < diff.remc; i++) {
			drop.call(this, diff.remi[i])
		}

		for(var i = 0; i < diff.addc; i++) {
			clone.call(this, diff.addi[i])
		}
	},


	cloneCol: function(x) {
		var pieces = this.obvPieces.read().slice()
		,   cols   = this.obvCols.read()
		,   rows   = this.obvRows.read()

		for(var y = rows - 1; y >= 0; y--) {
			var a = x + y * cols

			pieces.splice(a, 0, pieces[a].clone())
		}
		this.obvPieces.write(pieces)
		this.obvCols.write(cols +1)
	},

	cloneRow: function(y) {
		var pieces = this.obvPieces.read().slice()
		,   cols   = this.obvCols.read()
		,   rows   = this.obvRows.read()

		var a = y * cols
		,   b = a + cols - 1

		for(var x = 0; x < cols; x++) {
			pieces.splice(a, 0, pieces[b].clone())
		}
		this.obvPieces.write(pieces)
		this.obvRows.write(rows +1)
	},

	dropCol: function(x) {
		var pieces = this.obvPieces.read().slice()
		,   cols   = this.obvCols.read()
		,   rows   = this.obvRows.read()

		for(var y = rows -1; y >= 0; y--) {
			var i = cols * y + x

			pieces.splice(i, 1)
		}
		this.obvPieces.write(pieces)
		this.obvCols.write(cols -1)
	},

	dropRow: function(y) {
		var pieces = this.obvPieces.read().slice()
		,   cols   = this.obvCols.read()
		,   rows   = this.obvRows.read()

		for(var x = cols -1; x >= 0; x--) {
			var i = cols * y + x

			pieces.splice(i, 1)
		}
		this.obvPieces.write(pieces)
		this.obvRows.write(rows -1)
	},

	copy: function(page) {
		this.obvCols.write(page.obvCols.read())
		this.obvRows.write(page.obvRows.read())

		var prev_pieces = page.obvPieces.read()
		,   next_pieces = []
		for(var i = 0; i < prev_pieces.length; i++) {
			next_pieces.push(prev_pieces[i].clone())
		}
		this.obvPieces.write(next_pieces)
	},

	readTiles: function(prev) {
		var prevTiles = prev.slice()
		,   nextTiles = []

		var piecesHeap   = this.obvPieces.read().slice()
		,   piecesGroups = []

		reuse_match_all:
		while(piecesHeap.length) {
			var piece0 = piecesHeap[0]
			,   fabric = piece0.material.obvFabric.read()
			,   nextPieces = []

			this.followPiece(piece0, fabric, nextPieces, piecesHeap)

			var nextLength = nextPieces.length
			for(var i = 0; i < prevTiles.length; i++) {
				var tile = prevTiles[i]

				var prevPieces = tile.obvPieces.read()
				,   prevLength = prevPieces.length

				if(nextLength === prevLength
				&& nextLength === f.sand(prevPieces, nextPieces).length) {
					prevTiles.splice(i, 1)
					nextTiles.push(tile)

					continue reuse_match_all
				}
			}

			piecesGroups.push(nextPieces)
		}

		reuse_match_some:
		for(var i = prevTiles.length -1; i >= 0; i--) {
			var tile = prevTiles[i]
			,   prevPieces = tile.obvPieces.read()

			for(var j = piecesGroups.length -1; j >= 0; j--) {
				var nextPieces = piecesGroups[j]

				if(f.sand(prevPieces, nextPieces).length) {

					piecesGroups.splice(j, 1)
					prevTiles.splice(i, 1)
					nextTiles.push(tile)

					tile.obvPieces.write(nextPieces)

					continue reuse_match_some
				}
			}
		}

		for(var i = 0; i < piecesGroups.length; i++) {
			var tile = prevTiles[i] || new ANode.Jointile

			tile.obvPieces.write(piecesGroups[i])
			nextTiles.push(tile)
		}

		return nextTiles
	},

	followPiece: function(piece, fabric, pieces, heap) {
		if(!piece || pieces.indexOf(piece) !== -1) return

		var pfab = piece.material.obvFabric.read()
		if(pfab !== fabric) return

		pieces.push(piece)
		f.adrop(heap, piece)

		this.followPiece(piece.obvLPiece.read(), fabric, pieces, heap)
		this.followPiece(piece.obvRPiece.read(), fabric, pieces, heap)
		this.followPiece(piece.obvUPiece.read(), fabric, pieces, heap)
		this.followPiece(piece.obvDPiece.read(), fabric, pieces, heap)
	}
})

ANode.Cut = f.unit(ANode, {
	unitName: 'ANode_Cut',
	name: 'cut',
	label: 'node_label_cut',
	T3: Draw3D.Cut,

	create: function() {
		this.obvPos    = new Observable().set(this, null, null, Geo.equalReals)
		this.obvPosMin = new Observable().set(this, this.readPosMin, null, Geo.equalReals)
		this.obvPosMax = new Observable().set(this, this.readPosMax, null, Geo.equalReals)
		this.obvPosGroup = new Observable().set(this, this.readPosGroup, this.writePosGroup)

		this.obvSegments = this.mountList(new Observable().set(this, this.readSegments))
		this.obvSegmentFabrics = new Observable().set(this, this.readSegmentFabrics, this.writeSegmentFabrics)

		this.obvGroup  = new Observable().set(this, this.readGroup)
		this.obvMaster = new Observable().set(this, this.readMaster)
		this.obvGlobal = new Observable().set(this, this.readGlobal)

		this.options.pos = {
			type: 'number',
			hidden: true,
			value: this.obvPosGroup,
			min: this.obvPosMin,
			max: this.obvPosMax
		}
	},

	writeJSON: function(json) {
		this.obvPos.write(json)
	},

	readJSON: function() {
		return this.round(this.obvPos.read())
	},

	readGlobal: function() {
		var node = this.obvParent.read()
		return node instanceof ANode.Cutter
	},

	readGroup: function() {
		if(this instanceof ANode.VCut) return [this]

		var node   = this.obvParent.read()
		,   cutter = this.obvGlobal.read() ? node : node.obvParent.read()
		,   pages  = cutter.obvPages.read()
		,   hcuts  = cutter.obvHCuts.read()
		,   index  = this.obvMountIndex.read()

		var group = [hcuts[index]]

		for(var plid in pages) {
			var page = pages[plid]
			,   cuts = page.obvHCuts.read()

			group.push(cuts[index])
		}

		return group
	},

	readPosGroup: function() {
		return this.obvPos.read()
	},

	writePosGroup: function(next) {
		var group = this.obvGroup.read()
		for(var i = 0; i < group.length; i++) {
			group[i].obvPos.write(next)
		}
	},

	readPosMin: function() {
		if(this.obvGlobal.read()) return -Infinity

		var page = this.obvParent.read()
		,   box  = page.obvBox.read()

		return this instanceof ANode.HCut ? box.min.y : box.min.x
	},

	readPosMax: function() {
		if(this.obvGlobal.read()) return Infinity

		var page = this.obvParent.read()
		,   box  = page.obvBox.read()

		return this instanceof ANode.HCut ? box.max.y : box.max.x
	},

	readMaster: function() {
		return this.obvGroup.read() [0]
	},

	readSegmentFabrics: function(prev) {
		var fabrics = this.obvSegments.read().map(this.readItemJSON, this)
		return fabrics.filter(Boolean).length ? fabrics : 0
	},

	writeSegmentFabrics: function(next, prev) {
		var segments = this.obvSegments.read()
		for(var i = 0; i < segments.length; i++) {
			segments[i].obvJSON.write(next && next[i] || 0)
		}
	},

	readSegments: function(prev) {
		if(this.obvGlobal.read()) return []

		var horizontal = this instanceof ANode.HCut

		var page   = this.obvParent.read()
		,   cols   = page.obvCols.read()
		,   rows   = page.obvRows.read()
		,   pieces = page.obvPieces.read()
		,   cuts   = horizontal ? page.obvVCuts.read() : page.obvHCuts.read()
		,   length = horizontal ? cols : rows
		,   index  = this.obvMountIndex.read()

		var next = []
		for(var i = 0; i < length; i++) {
			var segment = new ANode.Cutsegment

			if(horizontal) {
				segment.obvPrevPiece.write(pieces[(index + 0) * cols + i])
				segment.obvNextPiece.write(pieces[(index + 1) * cols + i])

			} else {
				segment.obvPrevPiece.write(pieces[i * cols + (index + 0)])
				segment.obvNextPiece.write(pieces[i * cols + (index + 1)])
			}

			segment.obvPrevCut.write(cuts[i - 1])
			segment.obvNextCut.write(cuts[i + 0])

			next.push(segment)
		}

		return next
	},

	readUpdate: function() {
		var page = this.obvParent.read()
		if(page) page.obvUpdate.read()

		// dirty magic
		return Observable.context.value
	}
})

ANode.HCut = f.unit(ANode.Cut, {
	unitName: 'ANode_HCut'
})

ANode.VCut = f.unit(ANode.Cut, {
	unitName: 'ANode_VCut'
})

ANode.Cutsegment = f.unit(ANode, {
	unitName: 'ANode_Cutsegment',
	name: 'cutsegment',
	targetMaterial: 'join',
	removable: false,
	label: 'unit_joint',
	T3: Draw3D.Cutsegment,

	/**
	 *
	 *       |           |
	 *       | nextPiece |
	 *       |           |
	 *  -----o----seg----o-----HCut
	 *       |           |
	 *       | prevPiece |
	 *       |           |
	 *   prevCut       nextCut
	 *
	 *
	 *
	 *           VCut
	 *             |
	 *             |     nextCut
	 *   ----------o----------
	 *             |
	 * prevPiece  seg  nextPiece
	 *             |
	 *   ----------o----------
	 *             |     prevCut
	 *             |
	 */
	create: function() {
		this.material = main.imagery.addSubmaterial('join')

		this.obvPrevCut = new Observable
		this.obvNextCut = new Observable

		this.obvPrevPiece = new Observable
		this.obvNextPiece = new Observable

		this.obvInstall = new Observable().set(this, this.readInstall)
	},

	writeJSON: function(json) {
		main.imagery.setMaterial(this.material.name, json || 0)
	},

	readJSON: function() {
		if(this.material.obvImplicit.read()) return 0

		var fabric = this.material.obvFabric.read()
		return fabric && fabric.id || 0
	},

	readInstall: function() {
		var pieceA = this.obvPrevPiece.read()
		,   pieceB = this.obvNextPiece.read()

		var fabricA = pieceA.material.obvFabric.read()
		,   fabricB = pieceB.material.obvFabric.read()

		return fabricA !== fabricB
	},

	onDestroy: function() {
		main.imagery.remSubmaterial(this.material.name)

		delete this.material
	}
})


ANode.Cutpiece = f.unit(ANode, {
	unitName: 'ANode_Cutpiece',
	name: 'piece',
	targetMaterial: 'wall',
	removable: false,

	create: function() {
		this.material = main.imagery.addSubmaterial('wall')

		var readUpdate = ANode.Cut.prototype.readUpdate

		this.obvTile = new Observable().set(this, this.readTile)

		this.obvLCut = new Observable().set(this, readUpdate)
		this.obvRCut = new Observable().set(this, readUpdate)
		this.obvUCut = new Observable().set(this, readUpdate)
		this.obvDCut = new Observable().set(this, readUpdate)

		this.obvLPiece = new Observable().set(this, readUpdate)
		this.obvRPiece = new Observable().set(this, readUpdate)
		this.obvUPiece = new Observable().set(this, readUpdate)
		this.obvDPiece = new Observable().set(this, readUpdate)

		this.obvCol = new Observable().set(this, readUpdate)
		this.obvRow = new Observable().set(this, readUpdate)
		this.obvBox = new Observable().set(this, readUpdate, null, Geo.equalBox2)

		// this.obvUpdate = new Observable().set(this, readUpdate)
	},

	writeJSON: function(json) {
		main.imagery.setMaterial(this.material.name, json || 0)
	},

	readJSON: function() {
		if(this.material.obvImplicit.read()) return 0

		var fabric = this.material.obvFabric.read()
		return fabric && fabric.id || 0
	},

	readTile: function() {
		var page = this.obvParent.read()
		,   tiles = page.obvTiles.read()

		for(var i = 0; i < tiles.length; i++) {
			var tile = tiles[i]
			,   pieces = tile.obvPieces.read()

			if(pieces.indexOf(this) !== -1) return tile
		}
	},

	onDestroy: function() {
		main.imagery.remSubmaterial(this.material.name)

		delete this.material
	},

	copy: function(piece) {
		main.imagery.copyMaterial(this.material, piece.material)
	}
})

ANode.Jointile = f.unit(ANode, {
	unitName: 'ANode_Jointile',
	T3: Draw3D.Jointile,
	removable: false,

	create: function() {
		this.obvJoins = this.mountList(new Observable([]).set(this, this.readJoins))

		this.obvPieces   = new Observable([])
		this.obvFabric   = new Observable().set(this, this.readFabric)
		this.obvInstall  = new Observable().set(this, this.readInstall)
		this.obvVertical = new Observable().set(this, this.readVertical)
		this.obvInterval = new Observable().set(this, this.readInterval, null, Geo.equalReals)
		this.obvMinimal  = new Observable().set(this, this.readMinimal, null, Geo.equalReals)
		this.obvMaximal  = new Observable().set(this, this.readMaximal, null, Geo.equalReals)
		this.obvBox      = new Observable().set(this, this.readBox, null, Geo.equalBox2)

		this.obvJoinFabric = new Observable().set(this, this.readJoinFabric)
		this.obvMaterial = new Observable().set(this, this.readMaterial)
		this.material = this.obvMaterial
	},

	writeJSON: function(json) {
		var page   = this.obvParent.read()
		,   pieces = page.obvPieces.read()

		if(json.pieces && json.pieces.length) {
			var pieces_tile = []
			for(var i = 0; i < json.pieces.length; i++) {
				pieces_tile.push(pieces[json.pieces[i]])
			}

			this.obvPieces.write(pieces_tile)

		} else {
			console.warn('Jointile without pieces')
			return
		}

		if(json.joins && json.joins.length) {
			var joins = []
			for(var i = 0; i < json.joins.length; i++) {
				joins.push(new ANode.Join(json.joins[i]))
			}

			this.obvJoins.write(joins)
		}
	},

	readJSON: function() {
		var json = {
			pieces: []
		}

		var pieces = this.obvPieces.read()
		for(var i = 0; i < pieces.length; i++) {
			json.pieces.push(pieces[i].obvMountIndex.read())
		}

		var joins = this.obvJoins.read()
		if(joins.length) {
			json.joins = joins.map(this.readItemJSON)
		}

		return json
	},

	readBox: function() {
		var box   = new THREE.Box2
		,   pbsum = new THREE.Box2

		var jpage = this.obvParent.read()
		,   jpbox = jpage.obvBox.read()
		,   pieces = this.obvPieces.read()
		for(var i = 0; i < pieces.length; i++) {
			var piece = pieces[i]
			,   pbox = piece.obvBox.read()

			pbsum.union(pbox)
		}
		box.copy(jpbox).intersect(pbsum)
		return box
	},

	readFabric: function() {
		var pieces = this.obvPieces.read()
		,   piece0 = pieces[0]

		return piece0.material.obvFabric.read()
	},

	readMaterial: function(prev) {
		if(prev) main.imagery.remSubmaterial(prev.name)

		return main.imagery.addSubmaterial('join')
	},

	readJoinFabric: function() {
		return main.imagery.getSimilarProduct(this.obvFabric.read(), 'joint')
	},

	readInterval: function() {
		var fabric = this.obvFabric.read()
		return (fabric && fabric.width || 3000) / 1000
	},

	readMinimal: function() {
		var box = this.obvBox.read()
		return this.obvVertical.read() ? box.min.y : box.min.x
	},

	readMaximal: function() {
		var box = this.obvBox.read()
		return this.obvVertical.read() ? box.max.y : box.max.x
	},

	readVertical: function() {
		var fabric = this.obvFabric.read()
		return fabric && fabric.vertical || false
	},

	readInstall: function() {
		var fabric = this.obvFabric.read()
		if(!fabric) return true

		return fabric.unit === 'siding' && !/altaboard/i.test(fabric.group)
	},

	readJoins: function(prev) {
		if(!this.obvInstall.read()) return []

		var interval = this.obvInterval.read()
		,   minimal  = this.obvMinimal.read()
		,   maximal  = this.obvMaximal.read()


		var jarr = []
		for(var i = 0; i < prev.length; i++) {
			var join = prev[i]

			jarr.push([join.obvPos.read(), join])
		}
		jarr.sort(f.zerosort)


		var valid = true
		,   left  = minimal
		for(var i = 0; i < jarr.length; i++) {
			var pos = jarr[i][0]
			if(pos < minimal || pos > maximal) {
				continue
			}
			if(pos - left > interval) {
				valid = false
				break
			}

			left = pos
		}
		if(maximal - left > interval) {
			valid = false
		}

		var joins = []
		if(valid) {
			for(var i = 0; i < jarr.length; i++) {
				var jp = jarr[i]

				if(minimal < jp[0] && jp[0] < maximal) {
					joins.push(jp[1])
				}
			}

		} else {
			var distance = maximal - minimal
			,   total = Math.ceil(distance / interval) -1
			,   equal = distance / (total +1)
			for(var i = 0; i < total; i++) {
				var join = prev[i] || new ANode.Join

				join.obvPos.write(minimal + (i + 1) * equal)
				joins.push(join)
			}
		}

		return joins
	}
})

ANode.Join = f.unit(ANode, {
	unitName: 'ANode_Join',
	name: 'join',
	label: 'unit_joint',

	create: function() {
		this.obvPos    = new Observable().set(this, null, null, Geo.equalReals)
		this.obvPosMin = new Observable().set(this, this.readPosMin, null, Geo.equalReals)
		this.obvPosMax = new Observable().set(this, this.readPosMax, null, Geo.equalReals)

		this.obvMaterial = new Observable().set(this, this.readMaterial)

		this.options.pos = {
			type: 'number',
			hidden: true,
			value: this.obvPos,
			min: this.obvPosMin,
			max: this.obvPosMax
		}

		this.material = this.obvMaterial
	},

	writeJSON: function(json) {
		// compatibility
		if(typeof json === 'number') {
			this.obvPos.write(json)
			return
		}


		this.obvPos.write(json.p)

		if(json.m) {
			var material = this.obvMaterial.read()
			main.imagery.setMaterial(material.name, json.m || 0)
		}
	},

	readJSON: function() {
		var fabric = this.obvMaterial.read().obvFabric.read()

		return {
			p: this.round(this.obvPos.read()),
			m: fabric && fabric.id || 0
		}
	},

	onDestroy: function() {
		var material = this.obvMaterial.read()
		if(material) main.imagery.remSubmaterial(material.name)
	},

	readMaterial: function(prev) {
		var fabric = null
		,   material

		if(prev) {
			fabric = main.imagery.getUsedProduct(prev.name)
			main.imagery.remSubmaterial(prev.name)
		}

		var tile = this.obvParent.read()
		if(tile) {
			material = main.imagery.addSubmaterial(tile.obvMaterial.read().name)
			fabric = tile.obvJoinFabric.read()

		} else {
			material = main.imagery.addSubmaterial('join')
		}

		main.imagery.setMaterial(material.name, fabric)
		return material
	},

	readPosMin: function() {
		var tile = this.obvParent.read()
		if(!tile) return -Infinity

		var next = this.obvNextNode.read()
		,   limit = next ? next.obvPos.read() : tile.obvMaximal.read()
		,   interval = tile.obvInterval.read()

		return Math.max(limit - interval, tile.obvMinimal.read()) + 2*Geo.EPS
	},

	readPosMax: function() {
		var tile = this.obvParent.read()
		if(!tile) return Infinity

		var prev = this.obvPrevNode.read()
		,   limit = prev ? prev.obvPos.read() : tile.obvMinimal.read()
		,   interval = tile.obvInterval.read()

		return Math.min(limit + interval, tile.obvMaximal.read()) - 2*Geo.EPS
	}
})
