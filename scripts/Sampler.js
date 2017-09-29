function Sampler() {
	this.samples = []
}

Sampler.prototype = {
	folder: '',

	setImagery: function(imagery) {
		this.imagery = imagery
	},

	addSample: function(def) {
		if(!def || def.hide) return
		if(!def.object && !def.src) return

		var sample = new Sample(def, this)

		var prev = f.apick(this.samples, 'id', sample.id)
		if(prev) {
			f.adrop(this.samples, prev)
			console.warn('Sample with id', sample.id, 'already exists')
		}

		this.samples.push(sample)
		return sample
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
				id: file.name,
				src: file.name,
				object: object
			})

		}, this)
	}
}



function Sample(def, parent) {
	for(var name in def) this[name] = def[name]

	this.progress = 0
	this.parent = parent
	this.joints = []
	this.meshes = []

	this.box       = new THREE.Box3
	this.boxSize   = new THREE.Vector3
	this.boxCenter = new THREE.Vector3
	this.boxLength = 1

	if(this.id == null) {
		this.id = f.range(10).map(f.randchar).join('')
	}

	if(this.src) {
		this.name = this.src.replace(/\.[^\.]*$/, '').split('/').pop()
	}

	if(this.object) {
		this.configure(this.object)

	} else if(this.src) {
		this.format = this.src.replace(/^.*\.([^.]+)$/, '$1').toLowerCase()
		// this.load()
	}
}

Sample.prototype = {

	traverse: function(object, func, scope, data, inc, level) {
		if(!object) return

		if(level == null) level = 0

		func.call(scope || this, object, data, level)

		if(!object.children) return

		var l = object.children.length
		for(var i = inc ? 0 : l - 1; inc ? i < l : i >= 0; inc ? i++ : i--) {
			this.traverse(object.children[i], func, scope, data, inc, level +1)
		}
	},

	load: function() {
		if(this.object) {
			this.deferLoad = new Defer().resolve(this)
		}

		if(this.deferLoad) return this.deferLoad

		var defer = new Defer
		,   url = this.parent.folder + this.src

		if(!this.src) {
			defer.resolve(null)
			return defer
		}

		switch(this.format) {
			case 'obj':
				var loader = new Loader
				loader.obj(url).defer.push(defer)
			break

			case 'fbx':
				var loader = new THREE.FBXLoader
				loader.load(url, function(data) {
					defer.resolve(data)

				}, undefined, function(err) {
					defer.reject(err)
				})
			break

			default:
			case 'json':
				var loader = new Loader
				loader.onProgress(function() {
					if(!this.broken) this.progress = loader.bytesLoaded / loader.bytesTotal
				}, this)

				loader.json(url).defer.then(function(data) {
					var loader = new THREE.ObjectLoader
					// return loader.parse(data)
					var defer = new Defer
					loader.parse(data, function(object) {
						defer.resolve(object)
					})
					return defer

				}, this).push(defer)
			break
		}

		this.deferLoad = defer.then(this.configure, this.loadError, this)
		return this.deferLoad
	},

	loadError: function(err) {
		this.broken = true
		this.progress = 1
		console.warn('Sample load error', this.src || this.id, err)
		throw err
	},

	configure: function(object) {
		if(!object) return

		if(object.position.length()) {
			console.error('sample', this.src || this.id, 'not zero position:', object.position)
		}

		this.progress = 1
		this.object = object
		this.object.updateMatrixWorld()

		if(!this.config) this.config = {}
		if(!this.width ) this.width  = this.config.width  || 1
		if(!this.height) this.height = this.config.height || 1
		if(!this.depth ) this.depth  = this.config.depth  || 1
		if(!this.meshes) this.meshes = this.config.meshes || []

		this.parts = []

		this.box.makeEmpty()
		this.object.updateMatrixWorld()
		this.traverse(this.object, this.configureObject)
		this.box.getCenter(this.boxCenter)
		this.box.getSize(this.boxSize)
		this.boxLength = this.boxSize.length()

		return this
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
	},


	configureSubtract: function(mesh) {
		mesh.parent.remove(mesh)

		if(!mesh.geometry) {
			console.error('sample', this.src || this.id, 'subtract mesh without geometry')
			return
		}

		if(this.subtractMesh) {
			console.warn('sample', this.src || this.id, 'has multiple subtract meshes')
		}

		this.subtractMesh = mesh
		mesh.visible = true
	},

	configureObject: function(object) {
		var imagery = this.parent.imagery

		if(object.name.indexOf(':') === 0) {
			object.visible = false

			var joint = new SampleJoint(object)

			if(joint.makeDebugLine) {
				var line = joint.makeDebugLine()
				if(imagery) line.material = imagery.materials.norcon
				this.object.add(line)
			}

			this.joints.push(joint)
			return
		}

		if(object.name === 'subtract') {
			this.configureSubtract(object)
			return
		}


		if(object.geometry) {
			if(imagery) imagery.configureSampleMaterial(object)


			object.geometry.persistent = true

			if(!object.geometry.boundingBox) {
				object.geometry.computeBoundingBox()
			}

			var tempBox = new THREE.Box3
			tempBox.copy(object.geometry.boundingBox).applyMatrix4(object.matrixWorld)
			this.box.union(tempBox)


			// object.geometry = this.smoothShadeGeometry(object.geometry)
			// object.geometry.computeVertexNormals()
		}
	},

	smoothShadeGeometry: function(geometry) {
		var g = new THREE.Geometry

		if(geometry instanceof THREE.BufferGeometry) {
			g.fromBufferGeometry(geometry)
		} else {
			g.copy(geometry)
		}

		g.mergeVertices()
		g.computeVertexNormals()
		g.computeFaceNormals()

		return g
	},

	clone: function() {
		if(this.object) return this.object.clone(true)
	},

	describeObject: function(object, data, level) {
		var fields = []
		if(level) {
			fields.push(Array(level +1).join('\t'))
		}

		fields.push(object.type)
		fields.push('name: {'+ object.name +'}')

		if(object.material) {
			fields.push('mat: {'+ object.material.name +'}')
		}

		if(object.geometry) {
			fields.push('v:', object.geometry instanceof THREE.BufferGeometry
				? object.geometry.attributes.position.count
				: object.geometry.vertices.length)
		}

		fields.push('pos: ['+ [
			f.mround(object.position.x, 3),
			f.mround(object.position.y, 3),
			f.mround(object.position.z, 3),
		].join(', ') +']')

		fields.push('rot: ['+ [
			f.hround(f.xdeg * object.rotation.x),
			f.hround(f.xdeg * object.rotation.y),
			f.hround(f.xdeg * object.rotation.z),
		].join(', ') +']')

		console.log.apply(console, fields)
	},

	describe: function() {
		console.log('sample id: {'+ this.id +'} src: {'+ (this.src || '') +'}')
		this.traverse(this.object, this.describeObject, this, null, true)
	}
}



function SampleJoint(object) {
	var parts = object.name.slice(1).split('_')

	this.object = object
	this.name   = object.name

	this.parts  = parts
	this.id     = parts[0]
	this.param  = parts[1]
	this.extra  = parts[2]
	this.depth  = parts[3]

	this.point  = new THREE.Vector3
	this.normal = new THREE.Vector3
	this.up     = new THREE.Vector3
	this.matrix = new THREE.Matrix4

	this.setFromMatrix(object.matrixWorld)
}

SampleJoint.prototype = {

	setFromMatrix: function(matrix) {
		this.matrix.copy(matrix)
		this.point.setFromMatrixPosition(this.matrix)
		this.normal.set(1, 0, 0).applyMatrix4(this.matrix).sub(this.point)
		this.up.set(0, 1, 0).applyMatrix4(this.matrix).sub(this.point)
	},

	clone: function() {
		return new SampleJoint(this.object)
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
