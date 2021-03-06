function Imagery() {
	this.get  = new Loader
	this.list = {}


	this.submaterialIndex = 0
	this.slotIndex = 0
	this.products = {}
	this.productsList = []

	this.obvMaterialsList = new Observable([])
	this.obvProductsLoaded = new Observable(false)

	this.pixel  = this.makePixel('white')
	this.bump   = this.makePixel('black')
	this.normal = this.makePixel('rgb(127, 127, 255)')

	this.buffer = document.createElement('canvas')
	this.btx    = this.buffer.getContext('2d')

	var i = this.pixel.image
	this.skybox = new THREE.CubeTexture([i, i, i, i, i, i]) // px nx, py ny, pz nz
	this.skybox.needsUpdate = true



	// var baseImages = {
	// 	stripe   : this.makePattern(2/3,   64,   64, this.drawStripe, '#dadada', 6, '#666'),
	// 	stripe2  : this.makePattern(1,     64,   64, this.drawStripe, '#dadada', 6, '#666', true),
	// 	noise    : this.makePattern(1/9, 1024, 1024, this.drawCloud, 0.2, 0.4),
	// 	checker  : this.makePattern(1/3,   64,   64, this.drawChecker, '#aaa', '#333'),
	// 	checker2 : this.makePattern(2/3,   64,   64, this.drawChecker, '#777', '#666')
	// }

	this.baseMaps = {
		// black : { color: 0x222222 },
		// gold  : { color: 0xf5f469, texture: baseImages.checker },
		// blue  : { color: 0x0a2689 },
		// white : { color: 0xFFFFFF },

		// wall    : { texture: baseImages.stripe   },
		// floor   : { texture: baseImages.noise    },
		// roof    : { texture: baseImages.checker  },
		// plinth  : { texture: baseImages.checker2 },
		// soffit  : { texture: baseImages.stripe2  },

		// cut     : { color: 0xF5F053 },
		// join    : { color: 0xDDDDDD, height: 100 },
		// drain   : { color: 0x555555 },
		// window  : { color: 0xA0A0A0 },
		// glass   : { color: 0x86a8e6 },
		// framing : { color: 0xEEEEEE },
		// decor   : { color: 0xEEEEEE },
		// door    : { color: 0x888888 },
		// corner  : { color: 0x444444 },
		// pcorner : { color: 0x777777 },

		norcon    : { color: 0xFFFFFF },
		subtract  : { color: 0xff3977 },
		connection: { color: 'black'  },
		wireframe : { color: 'black'  },
		normal    : {},
		void      : {}
	}

	this.sampleMaterials = []
	this.materials = {}
	this.usedProducts = {}

	for(var name in this.baseMaps) {
		this.addMaterial(name)
		this.setMaterial(name, null)
	}

	// this.materials.gold.specular.set(0x969659)
	// this.materials.gold.bumpScale = 0.07

	this.materials.flume = this.materials.pipe = this.materials.drain
	this.materials.flat  = this.materials.floor
	this.materials.slope = this.materials.roof

	this.materials.Material__26 = this.materials.black
	this.materials.wire_000000000 = this.materials.gold
	// this.materials.flat  = this.materials.floor
	// this.materials.slope = this.materials.roof
}

Imagery.prototype = {

	folders: {
		thumbs   : 'images/thumbs/',
		textures : 'images/textures/'
	},

	types: {
		alpha   : 1,
		normal  : 2,
		texture : 3,

		logo    : 11,
		thumb   : 12,

		icon    : 21
	},

	materialOptions: {
		defaults: {
			factory: THREE.MeshPhongMaterial,
			makeMap: true,
			side: THREE.DoubleSide
		},

		norcon: {
			makeMap: false,
			factory: THREE.LineBasicMaterial,
			vertexColors: THREE.VertexColors,
			linewidth: 2,
			visible: false
		},

		subtract: {
			visible: false,
			transparent: true,
			opacity: 0.5
		},

		blue: {
			makeEnv: true,
			reflectivity: 0.25,
			shininess: 22
		},

		gold: {
			makeEnv: true,
			makeBump: true,
			reflectivity: 0.8,
			shininess: 95
		},

		black: {
			makeEnv: true,
			reflectivity: 0.3,
			shininess: 70
		},


		glass: {
			makeEnv: true,
			transparent: true,
			opacity: 0.9,
			reflectivity: 0.8,
			side: THREE.FrontSide
		},

		connection: {
			makeMap: false,
			factory: THREE.LineBasicMaterial,
			transparent: true,
			opacity: 0.5
		},

		normal: {
			factory: THREE.MeshNormalMaterial,
			makeMap: false
		},

		wireframe: {
			factory: THREE.MeshBasicMaterial,
			wireframe: true,
			color: 0
		}
	},

	textureOptions: {

	},

	makeTexture: function(options) {
		var t = new THREE.Texture()
		t.wrapS = THREE.RepeatWrapping
		t.wrapT = THREE.RepeatWrapping
		t.minFilter = THREE.LinearMipMapLinearFilter
		t.magFilter = THREE.LinearFilter
		t.anisotropy = 4
		t.image = this.pixel.image
		f.copy(t, options)
		t.needsUpdate = true
		return t
	},

	makeMaterial: function(name, root) {
		var mOpts = f.merge(
			this.materialOptions.defaults,
			this.materialOptions[name] ||
			this.materialOptions[root],
			{ name: name })

		var tOpts = f.copy({},
			this.textureOptions[name] ||
			this.textureOptions[root])


		if(mOpts.makeMap) {
			mOpts.map = this.makeTexture(tOpts)
		}
		if(mOpts.makeAlpha) {
			mOpts.alphaMap = this.makeTexture(tOpts)
		}
		if(mOpts.makeNormal) {
			mOpts.normalMap = this.makeTexture(tOpts)
			mOpts.normalMap.image = this.normal.image
		}
		if(mOpts.makeBump) {
			mOpts.bumpMap = this.makeTexture(tOpts)
			mOpts.bumpMap.image = this.bump.image
		}
		if(mOpts.makeEnv) {
			mOpts.envMap = this.skybox
		}

		var MaterialFactory = mOpts.factory


		delete mOpts.makeMap
		delete mOpts.makeAlpha
		delete mOpts.makeNormal
		delete mOpts.makeBump
		delete mOpts.makeEnv
		delete mOpts.factory



		var m = new MaterialFactory(mOpts)

		m.persistent = true
		m.implicit = true
		m.needsUpdate = true

		m.obvImplicit = new Observable(m.implicit)
		m.obvFabric   = new Observable
		m.obvLoaded   = new Observable().set(this, function() {
			this.setMaterialProduct(m, this.getLoadedProduct(m))
		})

		return m
	},

	configureSampleMaterial: function(mesh) {
		if(!mesh || !mesh.material) return

		if(mesh.name === 'subtract') {
			mesh.material = this.materials.subtract
			return
		}

		var m = mesh.material

		if(this.sampleMaterials.indexOf(m) !== -1) {
			return
		}
		this.sampleMaterials.push(m)


		var maps = [
			m.map,
			m.bumpMap,
			m.normalMap
		].filter(Boolean)

		for(var i = 0; i < maps.length; i++) {
			var texture = maps[i]
			if(!texture.image) continue

			var data = { image: texture.image }

			this.tileTexture(data)

			texture.wrapS = THREE.RepeatWrapping
			texture.wrapT = THREE.RepeatWrapping
			texture.image = data.image
			texture.repeat.x *= data.repeatX
			texture.repeat.y *= data.repeatY
		}

		m.envMap = this.skybox
		m.needsUpdate = true




		// if(m.name in this.materials) {
		// 	mesh.material = this.materials[m.name]
		// }
	},

	readMaterialLoaded: function() {
		this.materials[m.name]
		this.usedProducts[m.name]
	},

	addMaterial: function(name, root) {
		var material = this.materials[name] = this.makeMaterial(name, root)
		Observable.inContext(null, this.addMaterialInContext, this, material)
		return material
	},

	addMaterialInContext: function(material) {
		this.obvMaterialsList.write(this.obvMaterialsList.read().concat(material))
	},

	remMaterialInContext: function(material) {
		this.obvMaterialsList.write(f.adrop(this.obvMaterialsList.read().slice(), material))
	},

	copyMaterial: function(dstmat, srcmat) {
		if(!dstmat || !srcmat) return

		if(dstmat.implicit) {
			this.setMaterial(dstmat, null)
		} else {
			this.setMaterial(dstmat, this.usedProducts[srcmat.name])
		}
	},

	rootMaterial: function(name) {
		var material = this.materials[name]
		if(!material) return

		while(material.parent) material = material.parent
		return material.name
	},

	addSubmaterial: function(parentName) {
		var parent = this.materials[parentName]
		if(!parent) return

		if(!parent.submaterials) {
			parent.submaterials = []
		}

		var root = this.rootMaterial(parentName)
		var name = parent.name +'-'+ ++this.submaterialIndex
		var material = this.addMaterial(name, root)

		parent.submaterials.push(material)

		material.parent = parent

		this.setMaterial(material, this.usedProducts[parentName])

		return material
	},

	remSubmaterial: function(mat) {
		var material = mat instanceof THREE.Material ? mat : this.materials[mat]
		if(!material) return

		if(material.parent) {
			f.adrop(material.parent.submaterials, material)
		}

		material.dispose()

		delete this.usedProducts[material.name]
		delete this.materials[material.name]

		Observable.inContext(null, this.remMaterialInContext, this, material)
	},

	setMapImage: function(map, data, norepeatx) {
		if(!map || !data) return

		if(map.image !== data.image) {
			map.image = data.image
			map.needsUpdate = true
		}

		map.repeat.x = data.repeatX || 1
		map.repeat.y = data.repeatY || 1

		if(norepeatx) {
			map.repeat.x = 1 / (data.cloneX || 1)
		}
	},

	setMaterialProduct: function(material, product) {
		if(!material || !product) return

		if(material.obvFabric) {
			material.obvFabric.write(product)
		}

		if(material.color) {
			material.color.set(product.color || 0xFFFFFF)
		}

		var norepeatx = ['outer', 'fouter'].indexOf(product.unit) !== -1

		this.setMapImage(material.map,       product.texture || this.pixel,  norepeatx)
		this.setMapImage(material.bumpMap,   product.bump    || this.bump,   norepeatx)
		this.setMapImage(material.normalMap, product.normal  || this.normal, norepeatx)
		this.setMapImage(material.alphaMap,  product.alpha   || this.pixel,  norepeatx)

		if(material.submaterials) for(var i = 0; i < material.submaterials.length; i++) {
			var submat = material.submaterials[i]
			if(!submat.implicit) continue

			this.setMaterialProduct(submat, product)
		}
	},

	setImplicitProduct: function(material, product) {
		if(product) {
			var source = material.parent
			while(source && source.implicit) source = source.parent

			material.implicit = !!source && product === this.usedProducts[source.name]

		} else {
			material.implicit = true
		}

		if(material.implicit) {
			product = null
		}

		material.obvImplicit.write(material.implicit)

		this.usedProducts[material.name] = product

		var submats = material.submaterials
		if(submats) for(var i = 0; i < submats.length; i++) {
			var submat = submats[i]

			this.setImplicitProduct(submat, this.usedProducts[submat.name])
		}
	},

	isProductLoaded: function(product) {
		return product
			&& (!product.texture || Observable.unwrap(product.texture.loaded))
			&& (!product. normal || Observable.unwrap(product. normal.loaded))
			&& (!product.  alpha || Observable.unwrap(product.  alpha.loaded))
	},

	getLoadedProduct: function(place) {
		var material = typeof place === 'object' ? place : this.materials[place]

		while(material) {
			var product = this.usedProducts[material.name]

			if(this.isProductLoaded(product)) {
				return product
			}

			if(!material.parent) {
				return this.baseMaps[material.name]
			}

			material = material.parent
		}
	},

	getUsedProduct: function(place) {
		var material = typeof place === 'object' ? place : this.materials[place]

		while(material) {
			var product = this.usedProducts[material.name]

			if(product) {
				return product
			}

			if(!material.parent) {
				return this.baseMaps[material.name]
			}

			material = material.parent
		}
	},

	setMaterial: function(place, product) {
		var material = typeof place === 'object' ? place : this.materials[place]
		if(!material) return

		if(typeof product !== 'object') {
			product = this.products[product]
		}
		if(product && !product.id) {
			product = null
		}

		this.setImplicitProduct(material, product)
		this.setMaterialProduct(material, this.getLoadedProduct(material))
	},


	textureColor: function(image, w, h) {
		if(!w || !h) return 0

		this.buffer.width  = w
		this.buffer.height = h

		this.btx.drawImage(image, 0, 0)

		var p = this.btx.getImageData(0, 0, w, h)
		,   d = p.data
		,   l = d.length
		,   s = 1 / (w * h)

		var r = 0
		,   g = 0
		,   b = 0
		for(var i = 0; i < l; i += 4) {
			r += d[i +0]
			g += d[i +1]
			b += d[i +2]
		}

		return (r*s) << 16 ^ (g*s) << 8 ^ (b*s) << 0
	},

	tileTexture: function(data) {
		if(!data || !data.image) return

		var source = data.image

		// data.loaded.write(true)
		data.width  = source.naturalWidth  || source.width
		data.height = source.naturalHeight || source.height
		data.color  = this.textureColor(source, data.width, data.height)

		var scale  = 512 // for 1 meter
		,   normal = scale / data.height
		,   aspect = data.height / data.width

		data.cloneX  = 1
		data.cloneY  = 1
		data.repeatX = (data.resolution || 1) * normal * aspect
		data.repeatY = (data.resolution || 1) * normal

		var wpot = !(data.width  & (data.width  -1))
		,   hpot = !(data.height & (data.height -1))

		if(wpot && hpot) return


		var fit = this.fitTileSize(data.width, data.height, 10)
		,   ctx = this.makeCanvas(fit.spaceX, fit.spaceY)

		for(var x = 0; x < fit.cloneX; x++)
		for(var y = 0; y < fit.cloneY; y++) {
			ctx.drawImage(source, 0, 0, fit.sourceX, fit.sourceY,
				x * fit.sizeX, y * fit.sizeY, fit.sizeX, fit.sizeY)
		}

		data.image  = ctx.canvas
		data.width  = fit.spaceX
		data.height = fit.spaceY
		data.cloneX = fit.cloneX
		data.cloneY = fit.cloneY

		data.repeatX /= fit.cloneX
		data.repeatY /= fit.cloneY

		this.debugFit(fit, data)
	},

	fitTileSize: function(sourceX, sourceY, range) {
		var fit = {
			sourceX : sourceX,
			sourceY : sourceY,
			score   : Infinity
		}
		for(var i = 0; i <= range; i++) {
			var spaceX = 1 << i
			,   cloneX = Math.round(spaceX / sourceX)
			,   errorX = (spaceX - sourceX * cloneX) / sourceX

			if(!cloneX) continue

			for(var j = 0; j <= range; j++) {
				var spaceY  = 1 << j
				,   cloneY = Math.round(spaceY / sourceY)
				,   errorY  = (spaceY - sourceY * cloneY) / sourceY

				var aeX = Math.abs(errorX)
				,   aeY = Math.abs(errorY)
				,   aeD = Math.abs(errorX - errorY)
				,   inc = Math.sqrt(cloneX * cloneY)

				var score = aeX + aeY + aeD / 2 + inc / 10

				if(cloneY && score < fit.score) {
					fit.sizeX  = spaceX / cloneX
					fit.sizeY  = spaceY / cloneY
					fit.cloneX = cloneX
					fit.cloneY = cloneY
					fit.spaceX = spaceX
					fit.spaceY = spaceY
					fit.errorX = errorX
					fit.errorY = errorY
					fit.error  = aeD
					fit.score  = score
				}
			}
		}

		return fit
	},

	debugFit: function(fit, data) {
		var print
		if(fit.error > 0.4) {
			print = console.error
		} else if(Math.abs(fit.errorX) > 0.4 || Math.abs(fit.errorY) > 0.4) {
			print = console.warn
		} else if(this.debug) {
			print = console.log
		}

		if(print) print.call(console,
			'tile:', fit.sourceX +'x'+ fit.sourceY, '->', Math.round(fit.sizeX) +'x'+ Math.round(fit.sizeY),
			'('+ fit.spaceX +'x'+ fit.spaceY +',', fit.cloneX +'x'+ fit.cloneY +')',
			'errors:', +fit.errorX.toFixed(2), '-', +fit.errorY.toFixed(2), '=', fit.error,
			'\n', data.url)
	},

	normalColor: function(x, y, z) {
		return 'rgb('+ new THREE.Vector3(x, y, z)
			.normalize()
			.multiplyScalar(127)
			.addScalar(127)
			.toArray()
			.map(Math.round)
		+')'
	},

	displayImage: function(image, duration) {
		if(this.displayedImage) {
			dom.remove(this.displayedImage)
			delete this.displayedImage
		}

		this.displayedImage = image

		if(!this.displayRoot) {
			this.displayRoot = this.createDisplayRoot()
		}

		if(image) {
			image.style.cssFloat = 'left'
			image.style.imageRendering = 'pixelated'
			dom.append(this.displayRoot, image)

			if(duration) setTimeout(dom.remove, duration, image)
		}
	},

	createDisplayRoot: function() {
		var root = dom.div('display-root', document.body)
		var scale = 1

		f.copy(root.style, {
			position: 'absolute',
			backgroundColor: 'black',
			border: '1px dashed white',
			zIndex: 1
		})

		new EventHandler(reset, this).listen('tap', root)
		new EventHandler(wheel, this).listen('wheel', root)

		function wheel(e) {
			var delta = e.wheelDeltaY || -e.deltaY
			,   value = delta / Math.abs(delta)
			if(isNaN(value)) return

			zoom.call(this, Math.pow(2, Math.ceil(Math.log2(scale)) + value))
		}

		function reset() {
			dom.remove(this.displayedImage)
			delete this.displayedImage
			zoom.call(this, 1)
		}

		function zoom(s) {
			var img = this.displayedImage
			if(!img) return

			var w = img.naturalWidth || img.width
			img.style.width = (w * s) +'px'

			scale = s
		}

		return root
	},

	unwrapCubemap3x2: function(image) {
		var s = image.height / 2

		var images = []
		for(var y = 0; y < 2; y++)
		for(var x = 0; x < 3; x++) {
			var c = this.makeCanvas(s, s)

			c.drawImage(image, x * s, y * s, s, s, 0, 0, s, s)
			images.push(c.canvas)
		}

		var skybox = [
			images[2], images[0],
			images[4], images[3],
			images[5], images[1]
		]

		this.skybox.image = skybox
		this.skybox.needsUpdate = true
	},

	makeCanvas: function(w, h) {
		var cvs = document.createElement('canvas')
		cvs.width  = w
		cvs.height = h
		return cvs.getContext('2d')
	},

	makePixel: function(color) {
		var ctx = this.makeCanvas(1, 1)
		ctx.fillStyle = color
		ctx.fillRect(0, 0, 1, 1)

		return {
			image: ctx.canvas
		}
	},

	makePattern: function(resolution, width, height, draw) {
		var ctx = this.makeCanvas(width, height)

		if(typeof draw === 'function') {
			draw.apply(this, [ctx, width, height].concat([].slice.call(arguments, 4)))
		}

		var repeat = resolution * 512 / height

		return {
			loaded: true,
			width: width,
			height: height,
			repeatX: repeat,
			repeatY: repeat,
			image: ctx.canvas
		}
	},

	drawDash: function(ctx, w, h, back, line, front) {
		ctx.fillStyle = back
		ctx.fillRect(0, 0, w, h)

		ctx.lineWidth = line
		ctx.strokeStyle = front
		ctx.beginPath()
		ctx.moveTo(2*w,  -h)
		ctx.lineTo( -w, 2*h)
		ctx.moveTo(2*w,   0)
		ctx.lineTo(  0, 2*h)
		ctx.moveTo(  w,  -h)
		ctx.lineTo( -w,   h)
		ctx.stroke()
	},

	drawGrid: function(ctx, w, h, back, line, front) {
		ctx.fillStyle = back
		ctx.fillRect(0, 0, w, h)
		ctx.fillStyle = front
		ctx.fillRect(0, 0, w, line)
		ctx.fillRect(0, 0, line, h)
	},

	drawStripe: function(ctx, w, h, back, line, front, vertical) {
		ctx.fillStyle = back
		ctx.fillRect(0, 0, w, h)
		ctx.fillStyle = front
		ctx.fillRect(0, 0, vertical ? line : w, vertical ? h : line)
	},

	drawChecker: function(ctx, w, h, back, front) {
		var hw = w >> 1
		,   hh = h >> 1

		ctx.fillStyle = back || 'white'
		ctx.fillRect(0, 0, w, h)
		ctx.fillStyle = front || 'black'
		ctx.fillRect( 0,  0, hw, hh)
		ctx.fillRect(hw, hh, hw, hh)
	},

	drawCloud: function(ctx, w, h, scatter, base) {
		this.drawRandom(ctx, w, h, scatter, base)
		ctx.save()
		ctx.globalAlpha = 0.4
		ctx.scale(4, 4)
		ctx.drawImage(ctx.canvas, 0, 0)

		ctx.scale(4, 4)
		ctx.drawImage(ctx.canvas, 0, 0)

		ctx.restore()
		return
	},

	drawRandom: function(ctx, w, h, scatter, base) {
		var x = ctx.getImageData(0, 0, w, h)
		,   d = x.data
		,   a = scatter * 255 |0
		,   b = base    * 255 |0
		for(var i = 0; i < d.length; i += 4) {
			d[i + 0] = d[i + 1] = d[i + 2] = f.rand(a) + b
			d[i + 3] = 255
		}
		ctx.putImageData(x, 0, 0)
	}
}
