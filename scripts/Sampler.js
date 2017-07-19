function Sampler() {
	this.get     = new Loader
	this.events  = new EventEmitter
	this.samples = {}
}

Sampler.prototype = {
	folder: '',

	setImagery: function(imagery) {
		this.imagery = imagery
	},

	addSample: function(def) {
		if(def.hide) return

		var sample = new Sample(def, this)

		if(sample.obj) {
			this.get.obj(this.folder + sample.obj, { saveTo: sample, saveAs: 'object' })

		} else if(sample.fbx) {
			var loader = new THREE.FBXLoader
			,   defer = new Defer

			loader.load(this.folder + sample.fbx, function(data) {
				// console.log(sample.fbx, data)
				sample.object = data
				defer.resolve(data)

			}, undefined, function(err) {
				console.error(sample.fbx, err)
				defer.reject(err)
			})

			this.get.wait(defer)

		} else if(sample.dae) {
			var loader = new THREE.ColladaLoader
			,   defer = new Defer

			loader.load(this.folder + sample.dae, function(data) {
				// console.log(sample.dae, data)
				sample.object = data.scene
				defer.resolve(data)

			}, undefined, function(err) {
				console.error(sample.dae, err)
				defer.reject(err)
			})

			this.get.wait(defer)

		} else if(sample.json) {
			this.get.json(this.folder + sample.json).defer.then(function(data) {
				var loader = new THREE.ObjectLoader
				console.log(sample.json, data, loader.parse(data))
				sample.object = loader.parse(data)
			}, this)
		}

		if(sample.awg) {
			if(window.config) {
				sample.config = config.awg[sample.awg]
			} else {
				this.get.json(this.folder + sample.awg, { saveTo: sample, saveAs: 'config' })
			}
		}

		this.samples[sample.id] = sample
	},

	getList: function(type) {
		var list = []
		for(var id in this.samples) {
			var sample = this.samples[id]
			if(!type || sample.type === type) list.push(sample.id)
		}
		return list.filter(f.uniq)
	},

	getSamples: function(type) {
		var list = this.getList(type)

		var samples = []
		for(var i = 0; i < list.length; i++) {
			samples.push(this.samples[list[i]])
		}

		return samples
	},

	fetch: function(samples) {
		samples.forEach(this.addSample, this)

		return this.get.ready(this.configureSamples, this)
	},

	configureSamples: function() {
		for(var sid in this.samples) this.samples[sid].configure()
		this.ready = true
	}
}



function Sample(def, parent) {
	for(var name in def) this[name] = def[name]

	var file = this.obj || this.fbx || this.dae || this.json
	if(file) this.name = file.replace(/\.[^\.]+$/, '').replace(/.*\//, '')

	this.parent = parent
	this.parent.events.emit('sample_new', this)
}

Sample.prototype = {

	configure: function() {
		this.configured = true

		if(!this.config) this.config = {}
		if(!this.object) this.object = new THREE.Object3D
		if(!this.width ) this.width  = this.config.width  || 1
		if(!this.height) this.height = this.config.height || 1
		if(!this.depth ) this.depth  = this.config.depth  || 1
		if(!this.meshes) this.meshes = this.config.meshes || []

		this.parts = []

		this.object.traverse(f.binds(this.configurePart, this))

		this.parent.events.emit('sample_ready', this)
	},

	configurePart: function(mesh) {
		var imagery = this.parent.imagery
		if(imagery) {
			var material = mesh.material && mesh.material.name
			if(material in imagery.materials) {
				mesh.material = imagery.materials[material]
			}
		}

		if(!mesh.geometry || !mesh.geometry.vertices) return

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

		mesh.geometry.persistent = true
		this.parts.push(part)

		if((AX && !useAX)
		|| (AY && !useAY)
		|| (AZ && !useAZ)) {
			this.dirty = true
		}
	},

	mold: function(object, options) {
		if(!this.configured) {
			console.warn('autoconfiguring sample', this.id)
			this.configure()
		}

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
		if(!this.configured) {
			console.warn('autoconfiguring sample', this.id)
			this.configure()
		}

		var object = this.clone()
		for(var i = 0; i < object.children.length; i++) {
			var mesh = object.children[i]

			mesh.geometry = mesh.geometry.clone()
		}

		return object
	},

	clone: function() {
		if(!this.configured) {
			console.warn('autoconfiguring sample', this.id)
			this.configure()
		}

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

	dump: function() {
		function alen(a) { return a ? a.length : 0 }

		var oname = f.max(this.object.children.map(f.prop('name')).map(f.prop('length')))
		,   aname = f.max(this.meshes.map(f.prop('name')).map(f.prop('length')))
		,   nsize = f.max([8, oname, aname])

		return 'sample: '+ this.id
			+['', 'obj:        '+ this.obj].concat(this.parts.map(function(p) {
				var g = p.mesh.geometry
				,   n = p.mesh.name || '[empty]'
				,   vl = g.vertices.length
				,   fl = g.faces.length
				,   fi = Array(nsize - n.length +1).join(' ')

				return n +': '+ fi + f.nformat(vl, 5) +'v '+ f.nformat(fl, 5) +'f'

			}), ['', 'awg:        '+ this.awg], this.meshes.map(function(m) {
				var fi = Array(nsize - m.name.length +1).join(' ')

				return m.name + [':'+ fi,
					f.nformat(alen(m.anchorX), 5) +'x',
					f.nformat(alen(m.anchorY), 5) +'y',
					f.nformat(alen(m.anchorZ), 5) +'z' ].join(' ')

			})).join('\n\t')
	}
}
