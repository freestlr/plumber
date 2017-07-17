ANode.Slope = f.unit(ANode.Wall, {
	unitName: 'ANode_Slope',
	name: 'slope',
	label: 'node_label_slope',
	T3: Draw3D.Slope,

	create: function() {
		ANode.Wall.prototype.create.call(this)


		this.obvGable = new Observable
		this.obvAngle = new Observable(ANode.Roof.prototype.defAngle).set(this, null, null, Geo.equalReals)
		this.obvLedge = new Observable(ANode.Roof.prototype.defLedge).set(this, null, null, Geo.equalReals)
		this.obvClimb = new Observable().set(this, this.readClimb, null, Geo.equalVectors)

		this.obvNotGable = new Observable().set(this, this.readNotGable)

		this.obvPlaneAngle  = new Observable().set(this, this.readPlaneAngle, null, Geo.equalReals)
		this.obvLedgeAngle  = new Observable().set(this, this.readLedgeAngle, null, Geo.equalReals)
		this.obvLedgeOffset = new Observable().set(this, this.readLedgeOffset, null, Geo.equalReals)

		this.obvSlopeWidth  = new Observable().set(this, this.readSlopeWidth, null, Geo.equalReals)
		this.obvSlopeHeight = new Observable().set(this, this.readSlopeHeight, this.writeSlopeHeight, Geo.equalReals)
		this.obvSlopeHeightMin = new Observable().set(this, this.readSlopeHeightMin, null, Geo.equalReals)
		this.obvSlopeHeightMax = new Observable().set(this, this.readSlopeHeightMax, null, Geo.equalReals)


		this.obvBaseLeft  = new Observable().set(this, this.readBaseLeft, null, Geo.equalReals)
		this.obvBaseRight = new Observable().set(this, this.readBaseRight, null, Geo.equalReals)

		this.obvInnerPlane = new Observable().set(this, this.readInnerPlane, null, Geo.equalPlanes)
		this.obvOuterPlane = new Observable().set(this, this.readOuterPlane, null, Geo.equalPlanes)

		this.obvInnerSection = new Observable().set(this, this.readInnerSection)
		this.obvOuterSection = new Observable().set(this, this.readOuterSection)

		this.obvInnerContour = new Observable().set(this, this.readInnerContour)
		this.obvOuterContour = new Observable().set(this, this.readOuterContour)
		this.obvPlaneContour = new Observable().set(this, this.readPlaneContour)


		this.obvSections = new Observable().set(this, this.readSections)
		this.obvLedgeLine = new Observable().set(this, this.readLedgeLine, null, Geo.equalLines)
		this.obvLedgeWidth = new Observable().set(this, this.readLedgeWidth, null, Geo.equalReals)
		this.obvSlopeTopLeft  = new Observable().set(this, this.readSlopeTopLeft, null, Geo.equalVectors)
		this.obvSlopeTopRight = new Observable().set(this, this.readSlopeTopRight, null, Geo.equalVectors)
		this.obvArea = new Observable().set(this, this.readArea, null, Geo.equalReals)


		this.options.angle = {
			type: 'number',
			label: 'option_label_roof_angle',
			disabled: this.obvGable,
			value: this.obvAngle,
			min: ANode.Roof.prototype.minAngle,
			max: ANode.Roof.prototype.maxAngle
		}
		this.options.gable = {
			type: 'boolean',
			label: 'option_label_roof_gable',
			value: this.obvGable
		}
		this.options.ledge = {
			type: 'number',
			label: 'option_label_roof_ledge',
			disabled: this.obvNotGable,
			value: this.obvLedge,
			step: 0.1
		}
		this.options.gheight = {
			type: 'number',
			label: 'option_label_roof_gable_height',
			disabled: this.obvNotGable,
			value : this.obvSlopeHeight,
			min   : this.obvSlopeHeightMin,
			max   : this.obvSlopeHeightMax,
			step: 0.04
		}
		this.options.width.hidden = true
	},

	readNotGable: function() {
		return !this.obvGable.read()
	},

	readLedgeLine: function() {
		var section = this.obvOuterSection.read()
		var ledgeLine = new THREE.Line3

		if(this.obvGable.read()) {
			console.trace('wft?')
		}

		if(section) ledgeLine.set(
			section.lowLeft,
			section.lowRight)

		return ledgeLine
	},

	readLedgeWidth: function() {
		return this.obvLedgeLine.read().distance()
	},

	readSlopeWidth: function() {
		var contour = this.obvOuterContour.read()

		var slopeWidth = 0
		for(var i = 0, j = 1; j < contour.length; i = j++) {
			var a = contour[i]
			,   b = contour[j]

			slopeWidth += b.distanceTo(a)
		}

		return slopeWidth
	},

	readBaseLeft: function() {
		var bl = this.obvPrevVertex.read()
		,   tl = this.obvSlopeTopLeft.read()

		var ptl = this.getPlanePos(tl)
		,   pbl = this.getPlanePos(bl)

		return Math.abs(ptl - pbl)
	},

	readBaseRight: function() {
		var br = this.obvNextVertex.read()
		,   tr = this.obvSlopeTopRight.read()

		var pbr = this.getPlanePos(br)
		,   ptr = this.getPlanePos(tr)

		return Math.abs(ptr - pbr)
	},

	readSlopeHeight: function() {
		var contour = this.obvInnerContour.read()

		var slopeHeight = 0
		for(var i = 0; i < contour.length; i++) {
			slopeHeight = Math.max(slopeHeight, contour[i].y)
		}

		return slopeHeight
	},

	readHeight: function() {
		return this.obvSlopeHeight.read()
	},

	writeSlopeHeight: function(slopeHeight) {
		var prevSlope = this.obvPrevNode.read()
		,   nextSlope = this.obvNextNode.read()

		var baseL  = this.obvBaseLeft.read()
		,   baseR  = this.obvBaseRight.read()
		,   angleL = f.todeg(Math.atan(slopeHeight / baseL))
		,   angleR = f.todeg(Math.atan(slopeHeight / baseR))

		prevSlope.setOption('angle', angleL)
		nextSlope.setOption('angle', angleR)
	},

	readSlopeHeightMin: function() {
		var baseL = this.obvBaseLeft.read()
		,   baseR = this.obvBaseRight.read()

		var t = Math.tan(f.torad(ANode.Roof.prototype.minAngle))

		return Math.max(t * baseL, t * baseR)
	},

	readSlopeHeightMax: function() {
		var baseL = this.obvBaseLeft.read()
		,   baseR = this.obvBaseRight.read()

		var t = Math.tan(f.torad(ANode.Roof.prototype.maxAngle))

		return Math.min(t * baseL, t * baseR)
	},


	readPlaneAngle: function() {
		var gable = this.obvGable.read()
		if(gable) return Math.PI/2

		var angle = this.obvAngle.read()
		if(!angle) return Math.PI/4

		return f.torad(angle)
	},

	readLedgeAngle: function() {
		var gable = this.obvGable.read()
		if(gable) return Math.PI/4

		var angle = this.obvAngle.read()
		if(!angle) return Math.PI/4

		return f.torad(angle)
	},

	readLedgeOffset: function() {
		if(this.obvGable.read()) {
			return this.obvLedge.read()

		} else {
			var roof = this.obvParent.read()
			return roof.obvLedge.read() / this.obvLedgeAngle.read()
		}
	},

	readInnerPlane: function() {
		var m4 = new THREE.Matrix4

		return function readInnerPlane() {
			var plane = new THREE.Plane

			m4.makeRotationAxis(this.obvDirection.read(), this.obvPlaneAngle.read() - Math.PI/2)
			plane.normal.copy(this.obvNormal.read()).applyMatrix4(m4).normalize()
			plane.setFromNormalAndCoplanarPoint(plane.normal, this.obvCenter.read())

			return plane
		}
	}(),

	readOuterPlane: function() {
		var plane = this.obvInnerPlane.read().clone()

		if(this.obvGable.read()) {
			plane.constant -= this.obvLedgeOffset.read()
		}

		return plane
	},

	readClimb: function() {
		var m4 = new THREE.Matrix4

		return function readClimb() {
			var climb = new THREE.Vector3

			m4.makeRotationAxis(this.obvDirection.read(), -Math.PI/2)
			climb.copy(this.obvInnerPlane.read().normal).applyMatrix4(m4).normalize()
			return climb
		}
	}(),

	sortSections: function(a, b) {
		return a.level - b.level || a.order - b.order
	},

	readInnerSection: function() {
		var roof = this.obvParent.read()
		if(!roof) return null

		var slice = roof.obvInnerSlices.read() [0]
		if(!slice) return null

		var section = f.apick(slice.sections, 'wall', this)
		if(!section) return null

		return section
	},

	readOuterSection: function() {
		var roof = this.obvParent.read()
		if(!roof) return null

		var slice = roof.obvOuterSlices.read() [0]
		if(!slice) return null

		var section = f.apick(slice.sections, 'wall', this)
		if(!section) return null

		return section
	},

	addSection: function(section, list) {
		list.push(section)

		for(var i = 0; i < section.sections.length; i++) {
			this.addSection(section.sections[i], list)
		}
	},

	readSections: function() {
		var sections = []

		var outerSection = this.obvOuterSection.read()
		if(outerSection) {
			this.addSection(outerSection, sections)
		}

		return sections
	},

	readInnerContour: function() {
		var contour = []

		var gableSection = this.obvInnerSection.read()
		if(gableSection) {
			this.followSection(gableSection, contour)
			Geo.filterContour3(contour)
		}

		return contour
	},

	readOuterContour: function() {
		var contour = []

		var outerSection = this.obvOuterSection.read()
		if(outerSection) {
			this.followSection(outerSection, contour)
			Geo.filterContour3(contour)
		}

		return contour
	},

	readPlaneContour: function() {
		var contour = this.obvInnerContour.read()
		,   bottom = this.obvBottom.read()

		var planeContour = []
		for(var i = contour.length -1; i >= 0; i--) {
			var a = contour[i]
			,   x = this.getPlanePos(a)

			planeContour.push(new THREE.Vector2(x, a.y + bottom))
		}

		return planeContour
	},

	readSlopeTopLeft: function() {
		var contour = this.obvOuterContour.read()
		return contour[contour.length -2]
	},

	readSlopeTopRight: function() {
		var contour = this.obvOuterContour.read()
		return contour[1]
	},

	followSection: function(section, contour) {
		if(!section) return

		contour.push(section.lowRight)
		contour.push(section.highRight)

		section.sections.sort(f.nsort('order'))
		for(var i = 0; i < section.sections.length; i++) {
			this.followSection(section.sections[i], contour)
		}

		contour.push(section.highLeft)
		contour.push(section.lowLeft)
	},

	readArea: function() {
		var planeContour = this.obvPlaneContour.read()
		,   planeAngle   = this.obvPlaneAngle.read()

		return Geo.areaOfST(planeContour, null, 'xy') / Math.sin(planeAngle)
	},

	readWbox: function() {
		var planeContour = this.obvPlaneContour.read()
		return new THREE.Box2().setFromPoints(planeContour)
	},



	getWidthsAt: function(y) {
		var planeContour = this.obvPlaneContour.read()

		var xx = []
		for(var i = 0, j = 1; j < planeContour.length; i = j++) {
			var a = planeContour[j]
			,   b = planeContour[i]

			if(Math.abs(a.y - b.y) < Geo.EPS
			|| (a.y < y && b.y < y)
			|| (a.y > y && b.y > y)) continue

			xx.push((y - a.y) / (b.y - a.y) * (b.x - a.x) + a.x)
		}

		return xx
	},

	getHeightAt: function(x) {
		var planeContour = this.obvPlaneContour.read()

		for(var i = 0, j = 1; j < planeContour.length; i = j++) {
			var a = planeContour[j]
			,   b = planeContour[i]

			if(Math.abs(a.x - b.x) < Geo.EPS
			|| (a.x < x && b.x < x)
			|| (a.x > x && b.x > x)) continue

			return (x - a.x) / (b.x - a.x) * (b.y - a.y) + a.y
		}

		return planeContour[0].y
	}
})
