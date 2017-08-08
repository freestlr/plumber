function Sampler() {
	this.samples = {}
	this.keyIndex = []
}

Sampler.prototype = {
	folder: '',

	setImagery: function(imagery) {
		this.imagery = imagery
	},

	addSample: function(def) {
		if(!def || def.hide) return

		var sample = new Sample(def, this)
		if(this.samples[sample.id]) {
			console.warn('Sample with id', sample.id, 'already exists')
		}

		this.samples[sample.id] = sample
		return sample
	},

	addSampleList: function(samples) {
		samples.forEach(this.addSample, this)
	},

	getList: function() {
		return Object.keys(this.samples)
	}
}



function Sample(def, parent) {
	for(var name in def) this[name] = def[name]

	this.progress = 0
	this.parent = parent
	this.joints = []

	this.box    = new THREE.Box3
	this.size   = new THREE.Vector3
	this.sphere = new THREE.Sphere


	if(this.hide) {
		return
	}

	if(this.src) {
		this.name = this.src.replace(/\.[^\.]*$/, '')
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

		var sample = this
		,   defer = new Defer
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

			case 'dae':
				var loader = new THREE.ColladaLoader
				loader.load(url, function(data) {
					defer.resolve(data.scene)

				}, undefined, function(err) {
					defer.reject(err)
				})
			break

			default:
			case 'json':
				var loader = new Loader
				loader.onProgress(function() {
					this.progress = loader.bytesLoaded / loader.bytesTotal
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

		// if(this.awg) {
		// 	if(window.config) {
		// 		this.config = config.awg[this.awg]
		// 	} else {
		// 		this.get.json(this.folder + this.awg, { saveTo: this, saveAs: 'config' })
		// 	}
		// }

		this.deferLoad = defer.then(this.configure, this.loadError, this)
		return this.deferLoad
	},

	loadError: function(err) {
		console.warn('Sample load error', this.src || this.id, err)
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
		this.sphere.radius = -1
		this.traverse(this.object, this.configureObject)
		this.box.getSize(this.size)

		return this
	},

	configureJoint: function(object) {
		var parts = object.name.slice(1).split('_')

		var joint = {
			id     : parts[0],
			param  : parts[1],
			extra  : parts[2],
			depth  : parts[3],
			parts  : parts,
			point  : new THREE.Vector3,
			normal : new THREE.Vector3,
			object : object
		}

		joint.point.setFromMatrixPosition(object.matrix)
		joint.normal.set(1, 0, 0).applyMatrix4(object.matrix).sub(joint.point)


		var normalMaterial = this.parent.imagery && this.parent.imagery.materials.norcon

		var line = new THREE.Line(new THREE.Geometry, normalMaterial)
		line.geometry.vertices.push(new THREE.Vector3, joint.normal.clone().setLength(20))
		line.geometry.colors.push(new THREE.Color(0, 0, 0), new THREE.Color(1, 0, 0))
		line.position.copy(joint.point)
		line.name = 'debug-connection-normal'

		this.object.add(line)
		this.joints.push(joint)
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

	configureObject: function(mesh) {
		if(this.parent.imagery) {
			this.parent.imagery.configureSampleMaterial(mesh)
		}

		if(/^:/.test(mesh.name)) {
			this.configureJoint(mesh)
			return
		}

		if(mesh.name === 'subtract') {
			this.configureSubtract(mesh)
			return
		}


		if(!mesh.geometry) return

		mesh.userData.stencilWrite = true
		mesh.geometry.persistent = true

		if(!mesh.geometry.boundingBox) {
			mesh.geometry.computeBoundingBox()
		}

		if(!mesh.geometry.boundingSphere) {
			mesh.geometry.computeBoundingSphere()
		}

		if(this.sphere.radius > 0) {
			this.sphere.union(mesh.geometry.boundingSphere)
		} else {
			this.sphere.copy(mesh.geometry.boundingSphere)
		}
		this.box.union(mesh.geometry.boundingBox)


		// mesh.geometry = this.smoothShadeGeometry(mesh.geometry)
		// mesh.geometry.computeVertexNormals()



		// this.configureAnchors(mesh)
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

	configureAnchors: function(mesh) {
		var sx = this.width
		,   sy = this.height
		,   sz = this.depth

		var size = mesh.geometry.vertices.length
		,   conf = f.apick(this.meshes, 'name', mesh.name) || {}

		var part = {
			ax: conf.anchorX || [],
			ay: conf.anchorY || [],
			az: conf.anchorZ || [],

			anchors: [],
			offsets: [],

			size: size,
			mesh: mesh
		}

		var AX = part.ax.length
		,   AY = part.ay.length
		,   AZ = part.az.length

		var useAX = AX === size
		,   useAY = AY === size
		,   useAZ = AZ === size

		for(var j = 0; j < size; j++) {
			var v = mesh.geometry.vertices[j]

			,   ax = useAX ? conf.anchorX[j] : v.x / sx
			,   ay = useAY ? conf.anchorY[j] : v.y / sy
			,   az = useAZ ? conf.anchorZ[j] : v.z / sz

			,   ox = v.x - ax * sx
			,   oy = v.y - ay * sy
			,   oz = v.z - az * sz

			part.anchors.push(new THREE.Vector3(ax, ay, az))
			part.offsets.push(new THREE.Vector3(ox, oy, oz))
		}

		this.parts.push(part)

		if((AX && !useAX)
		|| (AY && !useAY)
		|| (AZ && !useAZ)) {
			this.dirty = true
		}
	},

	mold: function(object, options) {
		if(!object) return

		if(!options) options = {}

		var width  = options.width  || this.width
		,   height = options.height || this.height
		,   depth  = options.depth  || this.depth

		for(var i = 0; i < this.parts.length; i++) {
			var part = this.parts[i]
			,   mesh = object.children[i]

			for(var j = 0; j < mesh.geometry.vertices.length; j++) {
				var v = mesh.geometry.vertices[j]
				,   a = part.anchors[j]
				,   o = part.offsets[j]

				v.x = o.x + a.x * width
				v.y = o.y + a.y * height
				v.z = o.z + a.z * depth
			}

			mesh.geometry.verticesNeedUpdate = true
		}

		object.userData.width  = width
		object.userData.height = height
		object.userData.depth  = depth

		return object
	},

	raw: function() {
		if(!this.object) return

		var object = this.clone()
		for(var i = 0; i < object.children.length; i++) {
			var mesh = object.children[i]

			mesh.geometry = mesh.geometry.clone()
		}

		return object
	},

	clone: function() {
		if(!this.object) return

		return this.object.clone(true)

		var object = new THREE.Object3D

		for(var i = 0; i < this.parts.length; i++) {
			object.add(this.parts[i].mesh.clone())
		}

		return object
	},

	bake: function(options) {
		return this.mold(this.raw(), options)
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
