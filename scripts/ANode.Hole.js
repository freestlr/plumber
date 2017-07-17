ANode.Hole = f.unit(ANode, {
	unitName: 'ANode_Hole',
	name: 'hole',
	label: 'node_label_hole',

	typeLabels: {
		'hole'   : 'node_label_hole',
		'window' : 'node_label_window',
		'door'   : 'node_label_door',
	},

	targetMaterial: 'framing',
	T3: Draw3D.Hole,

	limitPos: 0.2,
	limitLow: 0.1,

	create: function() {
		this.obvWall   = new Observable
		this.obvPos    = new Observable().set(this, null, null, Geo.equalReals)
		this.obvWidth  = new Observable().set(this, null, null, Geo.equalReals)
		this.obvHeight = new Observable().set(this, null, null, Geo.equalReals)
		this.obvLow    = new Observable().set(this, null, null, Geo.equalReals)
		this.obvSid    = new Observable

		this.obvWidthMax  = new Observable().set(this, this.readWidthMax, null, Geo.equalReals)
		this.obvHeightMax = new Observable().set(this, this.readHeightMax, null, Geo.equalReals)
		this.obvLowMin    = new Observable().set(this, this.readLowMin, null, Geo.equalReals)
		this.obvLowMax    = new Observable().set(this, this.readLowMax, null, Geo.equalReals)
		this.obvLowHidden = new Observable().set(this, this.readLowHidden)
		this.obvPosMin    = new Observable().set(this, this.readPosMin, null, Geo.equalReals)
		this.obvPosMax    = new Observable().set(this, this.readPosMax, null, Geo.equalReals)

		this.obvCenter   = new Observable().set(this, this.readCenter, null, Geo.equalVectors)
		this.obvDelta    = new Observable().set(this, this.readDelta, null, Geo.equalVectors)
		this.obvBox      = new Observable().set(this, this.readBox, null, Geo.equalBox2)
		this.obvLine     = new Observable().set(this, this.readLine, null, Geo.equalLines)

		this.obvMinPoint = new Observable().set(this, this.readMinPoint, null, Geo.equalVectors)
		this.obvMaxPoint = new Observable().set(this, this.readMaxPoint, null, Geo.equalVectors)

		this.obvHigh   = new Observable().set(this, this.readHigh, null, Geo.equalReals)
		this.obvOffset = new Observable().set(this, this.readOffset, null, Geo.equalReals)
		this.obvLabel  = new Observable().set(this, this.readLabel)

		this.obvSample     = new Observable().set(this, this.readSample)
		this.obvSampleType = new Observable().set(this, this.readSampleType)
		this.obvMaterial   = new Observable().set(this, this.readMaterial)
		this.obvFabric     = new Observable().set(this, this.readFabric)
		this.obvTargetMat  = new Observable().set(this, this.readTargetMaterial)


		this.obvValid.set(this, this.readValid)


		this.label = this.obvLabel
		this.targetMaterial = this.obvTargetMat



		this.options.sid = {
			type: 'sample',
			label: 'option_label_sample',
			value: this.obvSid
		}
		this.options.width = {
			type: 'number',
			label: 'option_label_width',
			value: this.obvWidth,
			min: this.limitPos,
			max: this.obvWidthMax,
			step: 0.1
		}
		this.options.height = {
			type: 'number',
			label: 'option_label_height',
			value: this.obvHeight,
			min: this.limitLow,
			max: this.obvHeightMax,
			step: 0.1
		}
		this.options.low = {
			type: 'number',
			label: 'option_label_low',
			hidden: this.obvLowHidden,
			value: this.obvLow,
			min: this.obvLowMin,
			max: this.obvLowMax,
			step: 0.1
		}
		this.options.pos = {
			type: 'number',
			hidden: true,
			value: this.obvPos,
			min: this.obvPosMin,
			max: this.obvPosMax
		}


		this.helpers.width = new Helper2D.NodeWidth(this)
	},

	writeJSON: function(json) {
		this.obvWall   .write(json.i || 0)
		this.obvPos    .write(json.p || 0.5)
		this.obvWidth  .write(json.w || 1)
		this.obvHeight .write(json.h - json.l || 1)
		this.obvLow    .write(json.l || 0)
		this.obvSid    .write(json.t || 0)

		var material = this.obvMaterial.read()
		if(material) {
			main.imagery.setMaterial(material.name, json.m || 0)
		}
	},

	readJSON: function() {
		var wall = this.obvParent.read()

		var json = {
			i: wall ? wall.obvMountIndex.read() : 0,
			p: this.round(this.obvPos.read()),
			w: this.round(this.obvWidth.read()),
			l: this.round(this.obvLow.read()),
			h: this.round(this.obvHigh.read()),
			t: this.obvSid.read()
		}

		var material = this.obvMaterial.read()
		,   fabric = material && material.obvFabric.read()
		if(fabric && fabric.id) {
			json.m = fabric.id
		}

		return json
	},

	readHeightMax: function() {
		var wall = this.obvParent.read()
		if(!wall) return Infinity

		var page = wall.obvPage.read()
		if(!page) return Infinity

		var pbox = page.obvBox.read()
		,   bottom = wall.obvBottom.read()
		,   low = this.obvLow.read()

		return pbox.max.y - bottom - low
	},

	readWidthMax: function() {
		var wall = this.obvParent.read()
		if(!wall) return Infinity

		var width = wall.obvWidth.read()
		,   pos = this.obvPos.read()

		return Math.min(pos, 1 - pos) * width * 2 - this.limitPos / width
	},

	readLowMin: function() {
		var type = this.obvSampleType.read()
		if(type === 'door') return 0

		var wall = this.obvParent.read()
		if(!wall) return 0

		var page = wall.obvPage.read()
		,   pbox = page.obvBox.read()
		,   bottom = wall.obvBottom.read()

		return -bottom + pbox.min.y
	},

	readLowMax: function() {
		var type = this.obvSampleType.read()
		if(type === 'door') return 0

		var wall = this.obvParent.read()
		if(!wall) return 0

		var page   = wall.obvPage.read()
		,   pbox   = page.obvBox.read()
		,   bottom = wall.obvBottom.read()
		,   height = this.obvHeight.read()

		return pbox.max.y - height - bottom
	},

	readLowHidden: function() {
		return this.obvSampleType.read() === 'door'
	},

	readPosMin: function() {
		var wall = this.obvParent.read()
		if(!wall) return 0

		var width  = wall.obvWidth.read()
		,   offset = this.obvOffset.read()

		return offset + this.limitPos / width
	},

	readPosMax: function() {
		return 1 - this.obvPosMin.read()
	},

	readHigh: function() {
		return this.obvLow.read() + this.obvHeight.read()
	},

	readOffset: function() {
		var wall = this.obvParent.read()
		if(!wall) return 1

		return this.obvWidth.read() / wall.obvWidth.read() / 2
	},

	readCenter: function() {
		var center = new THREE.Vector3

		var wall = this.obvParent.read()
		if(!wall) return center

		center.copy(wall.obvDelta.read())
			.multiplyScalar(this.obvPos.read())
			.add(wall.obvLine.read().start)

		return center
	},

	readLine: function() {
		var line = new THREE.Line3

		var wall = this.obvParent.read()
		if(!wall) return line

		var delta  = wall.obvDelta.read()
		,   width  = this.obvWidth.read()
		,   center = this.obvCenter.read()

		line.start.copy(delta).setLength(-width / 2).add(center)
		line.  end.copy(delta).setLength(+width / 2).add(center)

		return line
	},

	readMinPoint: function() {
		return this.obvLine.read().start.clone()
	},

	readMaxPoint: function() {
		return this.obvLine.read().end.clone()
	},

	readDelta: function() {
		return this.obvLine.read().delta()
	},

	readBox: function() {
		var wall   = this.obvParent.read()
		,   low    = this.obvLow.read()
		,   pos    = this.obvPos.read()
		,   width  = this.obvWidth.read()
		,   height = this.obvHeight.read()

		var box = new THREE.Box2
		if(wall) {
			var pmin = wall.obvPmin.read()
			,   pwid = wall.obvWidth.read()
			,   pbot = wall.obvBottom.read()

			var px = pmin + pwid * pos
			,   py = pbot + low

			box.min.x = px - width /2
			box.max.x = px + width /2
			box.min.y = py
			box.max.y = py + height

		} else {
			box.min.x = 0
			box.max.x = width
			box.min.y = low
			box.max.y = low + height
		}

		return box
	},

	readValid: function() {
		var wall = this.obvParent.read()
		if(!wall) return false

		var page = wall.obvPage.read()
		if(!page) return false

		var pbox = page.obvBox.read()
		,   tbox = this.obvBox.read()

		if(tbox.max.x - Geo.EPS > pbox.max.x
		|| tbox.min.x + Geo.EPS < pbox.min.x
		|| tbox.max.y - Geo.EPS > pbox.max.y
		|| tbox.min.y + Geo.EPS < pbox.min.y) return false


		var poly = page.obvPoly.read()

		var pBL = new THREE.Vector2(tbox.min.x, tbox.min.y)
		,   pBR = new THREE.Vector2(tbox.max.x, tbox.min.y)
		,   pTR = new THREE.Vector2(tbox.max.x, tbox.max.y)
		,   pTL = new THREE.Vector2(tbox.min.x, tbox.max.y)

		var inPoly = false
		for(var i = 0; i < poly.length; i++) {
			if(Geo.pointInContourST(pBL, poly[i], null, 'xy', true)
			&& Geo.pointInContourST(pBR, poly[i], null, 'xy', true)
			&& Geo.pointInContourST(pTR, poly[i], null, 'xy', true)
			&& Geo.pointInContourST(pTL, poly[i], null, 'xy', true)) {
				inPoly = true
				break
			}
		}
		if(!inPoly) return false


		var holes = page.obvHoles.read()
		for(var i = 0; i < holes.length; i++) {
			if(holes[i] === this) continue

			var hbox = holes[i].obvBox.read()

			if(tbox.max.x - Geo.EPS > hbox.min.x
			&& tbox.min.x + Geo.EPS < hbox.max.x
			&& tbox.max.y - Geo.EPS > hbox.min.y
			&& tbox.min.y + Geo.EPS < hbox.max.y) return false
		}

		return true
	},

	readSample: function() {
		var sid = this.obvSid.read()

		this.sample = main.sampler.samples[sid]
		return main.sampler.samples[this.obvSid.read()]
	},

	readSampleType: function() {
		var sample = this.obvSample.read()
		return sample && sample.type
	},

	readLabel: function() {
		var type = this.obvSampleType.read()
		return this.typeLabels[type] || this.typeLabels.hole
	},

	readMaterial: function(prev) {
		var type = this.obvSampleType.read()
		,   material
		,   fabric

		if(prev) {
			fabric = prev.obvFabric.read()
			main.imagery.remSubmaterial(prev)
		}

		switch(type) {
			case 'door':
				material = main.imagery.addSubmaterial('door')
			break

			case 'window':
				material = main.imagery.addSubmaterial('framing')
			break

			default:
				material = null
			break
		}

		if(material && fabric) {
			main.imagery.setMaterial(material.name, fabric.id)
		}

		return material
	},

	readFabric: function() {
		var material = this.obvMaterial.read()
		if(!material) return 0

		return material.obvFabric.read() || 0
	},

	readTargetMaterial: function() {
		var material = this.obvMaterial.read()
		if(material) return material.name

		switch(this.obvSampleType.read()) {
			case 'window':
				return 'framing'

			default:
				return null
		}
	},

	onDestroy: function() {
		main.imagery.remSubmaterial(this.obvMaterial.read())
	}
})
