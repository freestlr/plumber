function Sampler() {
	this.samples = []
}

Sampler.prototype = {
	folder: '',

	setImagery: function(imagery) {
		this.imagery = imagery
	},

	addSample: function(def) {
		var sample = new Sample(def, this)

		var prev = f.apick(this.samples, 'src', sample.src)
		if(prev) {
			f.adrop(this.samples, prev)
			console.warn('Overwrite sample with src:', sample.src)
		}

		this.samples.push(sample)
		return sample
	},

	remSample: function(src) {
		var sample = f.apick(this.samples, 'src', src)
		if(sample) f.adrop(this.samples, sample)
	},

	getSample: function(src) {
		var sample = f.apick(this.samples, 'src', src)
		if(!sample) {
			sample = this.addSample({
				src    :  src,
				name   : (src +'').replace(/\.[^\.]*$/, '').split('/').pop(),
				format : (src +'').replace(/^.*\.([^.]+)$/, '$1').toLowerCase()
			})
		}
		return sample
	},

	prepare: function(src) {
		if(!src) {
			return Defer.complete(false, 'no source')
		}
		if(TSerial.isComplex(src)) {
			return this.prepareComplex(src)
		}
		var sample = this.getSample(src)
		if(!sample.defer) {
			sample.defer = this.loadSample(sample)
		}
		return sample.defer
	},

	prepareComplex: function(complex) {
		if(!TSerial.isComplex(complex)) {
			return Defer.complete(true, null)
		}

		return Defer.all(complex.types.map(this.prepare, this)).then(function() {
			return complex
			// return TSerial.constructJSON(complex, this)
		}, this)
	},

	loadSample: function(sample) {
		var url = this.folder + sample.src

		var defer = new Defer(function(data) {
			sample.setData(data)
			return sample

		}, function(err) {
			console.error('Sample load error', sample.src, err)
		}, this)


		var loader = null
		switch(sample.format) {
			case 'obj':
				loader = new Loader
				loader.obj(url).push(defer)
			break

			case 'fbx':
				loader = new THREE.FBXLoader
				loader.load(url,
					defer.willResolve(),
					defer.willProgress(),
					defer.willReject())
			break

			default:
			case 'json':
				loader = new Loader
				loader.json(url).then(function(data) {
					if(TSerial.isComplex(data)) {
						return this.prepareComplex(data)

					} else {
						var loader = new THREE.ObjectLoader
						,   defer = new Defer

						loader.parse(data, defer.willResolve())
						return defer
					}

				}, this).push(defer)
			break
		}

		return defer
	},

	checkCirculars: function(src, types) {
		var types_checked = []
		,   types_tocheck = [src]

		while(types_tocheck.length) {
			var type = types_tocheck.shift()

			if(types_checked.indexOf(type) !== -1) {
				return true
			}

			var sample = this.getSample(src)
			if(!sample.data) {
				console.error('checkCirculars cant prove not loaded samples')

			} else if(TSerial.isComplex(sample.data)) {
				types_tocheck = f.sor(types_tocheck, sample.data.types)
			}

			types_checked.push(type)
		}

		return false
	},

	readFile: function(file) {
		var reader = new FileReader

		var defer = new Defer(function() {
			return JSON.parse(reader.result)
		})

		dom.on('load', reader, f.binds(defer.resolve, defer))
		reader.readAsText(file)

		return defer.then(function(json) {
			var loader = new THREE.ObjectLoader
			,   defer = new Defer

			loader.parse(json, function(object) { defer.resolve(object) })
			return defer

		}).then(function(object) {
			return this.addSample({
				src: file.name,
				object: object
			})

		}, this)
	}
}



function Sample(def, sampler) {
	for(var name in def) this[name] = def[name]

	this.parentSampler = sampler
	this.dim = new TDimensions

	this.joints = []
	this.meshes = []

	if(this.object) this.setData(this.object)
}

Sample.prototype = {

	src: null,
	name: null,
	format: null,

	data: null,
	object: null,
	progress: 0,

	traverse: function(object, func, scope, data, inc, level) {
		if(!object) return

		if(level == null) level = 0

		func.call(scope || this, object, data, level)

		if(!object.children) return

		var l = object.children.length
		for(var i = inc ? 0 : l - 1; inc ? i < l : i >= 0; inc ? i++ : i--) {
			Sample.prototype.traverse(object.children[i], func, scope, data, inc, level +1)
		}
	},

	isLoaded: function() {
		return this.complex ? this.complex.types.every(function(src) {
			return this.parentSampler.getSample(src).isLoaded()
		}, this) : !!this.data
	},

	setData: function(data) {
		this.data = data
		this.joints = []
		this.meshes = []

		if(TSerial.isComplex(data)) {
			this.setComplex(data)
		} else {
			this.setObject(data)
		}
	},

	setComplex: function(complex) {
		this.complex = complex
		this.node = TSerial.constructJSON(complex, this.parentSampler, false)
		this.object = this.node.object
		this.object.updateMatrixWorld()

		this.node.getDimensions(this.dim)

		this.node.traverse(function(node) {
			this.meshes = this.meshes.concat(node.meshes)
		}, this)
	},

	setObject: function(object) {
		var tempBox = new THREE.Box3

		this.dim.box.makeEmpty()

		this.object = object
		this.object.updateMatrixWorld()
		this.traverse(this.object, this.configureObject, this, tempBox)

		this.dim.box.getCenter(this.dim.center)
		this.dim.box.getSize(this.dim.size)
		this.dim.length = this.dim.size.length()
	},

	configureObject: function(object, tempBox) {
		var imagery = this.parentSampler.imagery

		if(object.name.indexOf(':') === 0) {
			this.joints.push(new SampleJoint(object.name, object.matrixWorld))

		} else if(object.name === 'subtract') {

		} else if(object.geometry) {
			if(imagery) imagery.configureSampleMaterial(object)

			if(!object.geometry.boundingBox) {
				object.geometry.computeBoundingBox()
			}

			tempBox.copy(object.geometry.boundingBox)
				.applyMatrix4(object.matrixWorld)

			this.dim.box.union(tempBox)

			this.meshes.push(object)
		}
	},

	canReplace: function(connected) {
		var available = this.joints.slice()

		loop_connected:
		for(var i = 0; i < connected.length; i++) {
			var jointA = connected[i]

			for(var j = available.length -1; j >= 0; j--) {
				var jointB = available[j]

				if(jointA.canConnect(jointB)) {
					available.splice(j, 1)
					continue loop_connected
				}
			}

			return false
		}

		return true
	}
}



function SampleJoint(name, matrix) {
	this.point  = new THREE.Vector3
	this.normal = new THREE.Vector3
	this.up     = new THREE.Vector3
	this.matrix = new THREE.Matrix4

	this.setName(name)
	this.setMatrix(matrix)
}

SampleJoint.prototype = {

	setName: function(name, matrix) {
		this.name   = name
		this.parts  = this.name.slice(1).split('_')
		this.id     = this.parts[0]
		this.param  = this.parts[1]
		this.extra  = this.parts[2]
		this.depth  = this.parts[3]
	},

	setMatrix: function(matrix) {
		this.matrix.copy(matrix)
		this.point.setFromMatrixPosition(this.matrix)
		this.normal.set(1, 0, 0).applyMatrix4(this.matrix).sub(this.point).normalize()
		this.up    .set(0, 1, 0).applyMatrix4(this.matrix).sub(this.point).normalize()
	},

	clone: function() {
		return new SampleJoint(this.name, this.matrix)
	},

	paramPairsAllow: [
		['f', 'm'],
		['u', 'u'],
		['u', 'f'],
		['u', 'm'],
		['FP', 'MP'],
		['female', 'male'],
		['uniform', 'uniform'],
		['uniform', 'female'],
		['uniform', 'male'],
		['in', 'out'],
		['inner', 'outer'],
		['internal', 'external']
	],

	paramPairsEqual: function(pair) {
		return f.seq(pair, this)
	},

	canConnect: function(joint) {
		if(this.id !== joint.id) return false

		return this.paramPairsAllow.some(this.paramPairsEqual, [this.param, joint.param])
	},

	canConnectList: function(list) {
		return list.filter(this.canConnect, this)
	},



	makeDebugTip: function() {
		var l = 6

		var geom = new THREE.BufferGeometry

		var pos = new Float32Array(l * 3)
		,   col = new Float32Array(l * 3)

		var v = new THREE.Vector3
		,   c = new THREE.Color

		v.set(0,  2,  0).toArray(pos,  0)
		v.set(5,  0,  0).toArray(pos,  3)
		v.set(0,  0, -1).toArray(pos,  6)
		v.set(0,  0,  1).toArray(pos,  9)
		v.set(0,  2,  0).toArray(pos, 12)
		v.set(5,  0,  0).toArray(pos, 15)

		c.set(0x00FF00).toArray(col,  0)
		c.set(0xFF0000).toArray(col,  3)
		c.set(0x000000).toArray(col,  6)
		c.set(0x000000).toArray(col,  9)
		c.set(0x00FF00).toArray(col, 12)
		c.set(0xFF0000).toArray(col, 15)

		geom.addAttribute('position', new THREE.BufferAttribute(pos, 3))
		geom.addAttribute('color',    new THREE.BufferAttribute(col, 3))

		var mat = new THREE.MeshBasicMaterial({
			vertexColors: THREE.VertexColors,
			side: THREE.DoubleSide
		})

		var mesh = new THREE.Mesh(geom, mat)
		mesh.drawMode = THREE.TriangleStripDrawMode

		return mesh
	},

	makeDebugLine: function() {
		var debugLine = new THREE.Line(new THREE.Geometry)

		debugLine.name = 'debug-connection-normal'

		debugLine.geometry.vertices.push(
			new THREE.Vector3,
			this.normal.clone().setLength(20))

		debugLine.geometry.colors.push(
			new THREE.Color(0, 0, 0),
			new THREE.Color(1, 0, 0))

		debugLine.position.copy(this.point)

		return debugLine
	}
}
