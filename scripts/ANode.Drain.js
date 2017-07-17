ANode.Drain = f.unit(ANode, {
	unitName: 'ANode_Drain',
	name: 'drain',
	label: 'node_label_drain',
	targetMaterial: 'drain',
	T3: Draw3D.Drain,

	create: function() {
		this.obvPipes = this.mountList()
	},

	writeJSON: function(json) {
		var pipes = []
		for(var i = 0; i < json.length; i++) {
			pipes.push(new ANode.DrainPipe(json[i]))
		}

		this.obvPipes.write(pipes)
	},

	readJSON: function() {
		var pipes = this.obvPipes.read()
		return pipes.length ? pipes.map(this.readItemJSON) : 1
	}
})

ANode.DrainPipe = f.unit(ANode, {
	unitName: 'ANode_DrainPipe',
	name: 'pipe',
	label: 'node_label_pipe',
	targetMaterial: 'drain',
	T3: Draw3D.DrainPipe,

	fractAlign: 0.07,

	create: function() {
		this.obvIndex    = new Observable
		this.obvFract    = new Observable().set(this, null, null, Geo.equalReals)
		this.obvFractMin = new Observable().set(this, this.readFractMin, null, Geo.equalReals)
		this.obvFractMax = new Observable().set(this, this.readFractMax, null, Geo.equalReals)

		this.obvSlope       = new Observable().set(this, this.readSlope)
		this.obvSampleFlume = new Observable().set(this, this.readSampleFlume)

		this.options.fract = {
			type   : 'number',
			hidden : true,
			value  : this.obvFract,
			min    : this.obvFractMin,
			max    : this.obvFractMax,
			step   : 0.1
		}
	},

	writeJSON: function(json) {
		this.obvIndex.write(Math.floor(json))
		this.obvFract.write(json %1)
	},

	readJSON: function() {
		return this.round(this.obvIndex.read() + this.obvFract.read())
	},


	readSampleFlume: function() {
		return main.sampler.samples.flume
	},

	readSlope: function() {
		var drain = this.obvParent.read()
		if(!drain) return

		var roof = drain.obvParent.read()
		if(!roof) return

		var walls = roof.obvWalls.read()
		if(!walls) return

		return walls[this.obvIndex.read()]
	},

	readFractMin: function() {
		var slope = this.obvSlope.read()
		,   width = slope.obvWidth.read()
		,   point = slope.obvPrevPoint.read()

		var offset = this.fractAlign
		if(point.outer) {
			offset += slope.obvPrevNode.read().ledgeOffset
		} else {
			offset += this.obvSampleFlume.read().width
		}

		return offset / width
	},

	readFractMax: function() {
		var slope = this.obvSlope.read()
		,   width = slope.obvWidth.read()
		,   point = slope.obvNextPoint.read()

		var offset = this.fractAlign
		if(point.outer) {
			offset += slope.obvNextNode.read().ledgeOffset
		} else {
			offset += this.obvSampleFlume.read().width
		}

		return 1 - offset / width
	}
})
