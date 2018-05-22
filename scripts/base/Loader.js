function Loader() {
	this.reset()
	this.data = {}
}

Loader.prototype = {
	randomize: false,

	reset: function() {
		this.units  = []
		this.defers = []
	},

	wait: function(defer) {
		this.defers.push(defer)
	},

	abort: function(unit) {
		if(unit) unit.abort()
		else {
			this.units.forEach(this.abort, this)
			this.reset()
		}
	},

	load: function(type, url, opt) {
		var def = Loader.Resource.types[type]
		if(!def) throw TypeError('Loader: unknown type: '+ type)


		var config = {}
		for(var name in def) config[name] = def[name]
		for(var name in opt) config[name] = opt[name]

		var unit = new Loader.Resource(url, config, this)

		this.units.push(unit)
		this.defers.push(unit.deferTail)

		unit.transport()

		return unit.defer
	},

	ready: function() {
		return Defer.all(this.defers, Loader.commonProgress)
	}
}

Loader.commonProgress = function(list) {
	var bytesTotal  = 0
	,   bytesLoaded = 0

	for(var i = 0; i < list.length; i++) {
		var e = list[i]
		if(!e || !e.lengthComputable) continue

		bytesLoaded += e.loaded
		bytesTotal  += e.total
	}

	return bytesTotal ? bytesLoaded / bytesTotal : 0
}

Loader.imageTransport = function() {
	var unit  = this
	,   image = new Image

	unit.data = image

	image.onload = function() {
		unit.deferHead.resolve(image)
	}
	image.onerror = function(e) {
		unit.deferHead.reject(e)
	}
	image.onprogress = function(e) {
		unit.deferHead.progress(e)
	}
	image.src = unit.source
}

Loader.ajaxTransport = function() {
	var unit = this
	,   req  = new XMLHttpRequest

	var query = []
	for(var param in unit.query) {
		query.push(
			encodeURIComponent(param) +'='+
			encodeURIComponent(unit.query[param]))
	}
	var querystring = query.join('&')


	unit.request = req
	unit.requestType = unit.requestType ? unit.requestType.toUpperCase() : 'GET'

	if(unit.requestType === 'GET' && querystring) {
		unit.source += '?'+ querystring
	}

	req.open(unit.requestType, unit.source, true)
	req.responseType = unit.responseType || ''

	for(var name in unit.headers) {
		req.setRequestHeader(name, unit.headers[name])
	}
	req.onreadystatechange = function() {
		if(req.readyState === 4) {

			if(200 <= req.status && req.status < 400) {
				unit.data = req[unit.responseName || 'responseText']
				unit.deferHead.resolve(unit.data)

			} else {
				unit.deferHead.reject('HTTP '+ req.status)
			}
		}
	}
	req.onprogress = function(e) {
		unit.deferHead.progress(e)
	}

	req.send(unit.requestType === 'POST' ? querystring : null)
}

Loader.extend = function(type, def) {
	if(Loader.prototype[type]) {
		console.warn('Loader.extend: overwriting '+ type)
	}
	Loader.Resource.types[type] = def
	Loader.prototype[type] = function(url, opt) {
		return this.load(type, url, opt)
	}
}




Loader.Resource = function(url, def, loader) {
	for(var name in def) this[name] = def[name]

	this.url = url
	this.loader = loader

	this.bytesTotal  = 0
	this.bytesLoaded = 0

	this.source = (this.url +'').replace(/#.*$/, '')
	if(this.randomize || loader.randomize) {
		this.source += '&?'[+!~this.source.indexOf('?')] + Math.random()
	}

	this.deferHead = new Defer(this.prepare, this)

	if(this.saveAs || this.saveTo) {
		this.defer = this.deferHead.then(this.save, this)
	} else {
		this.defer = this.deferHead.then()
	}

	this.deferTail = this.defer
}

Loader.Resource.prototype = {

	save: function(data) {
		var item = this.saveTo || this.loader.data
		,   name = this.saveAs || 'data'

		return item[name] = data
	},

	abort: function() {
		if(this.request) this.request.abort()
		this.deferHead.init(null)
		this.deferTail.init(null)
		return this
	}
}

Loader.Resource.types = {}

!function() {
	var types = {
		image: {
			transport: Loader.imageTransport
		},
		text: {
			transport: Loader.ajaxTransport
		},
		post: {
			transport: Loader.ajaxTransport,
			requestType: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			query: null
		},
		json: {
			transport: Loader.ajaxTransport,
			prepare: JSON.parse
		},
		xml: {
			responseName: 'responseXML',
			transport: Loader.ajaxTransport
		},
		buffer: {
			responseType: 'arraybuffer',
			responseName: 'response',
			transport: Loader.ajaxTransport
		}
	}

	for(var name in types) Loader.extend(name, types[name])
}()
