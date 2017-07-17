Locale = {
	name: null,
	data: null,

	counter: 0,
	assets: {},
	items: [],

	add: function(name, data) {
		var asset = Locale.assets[name]
		if(!asset) {
			asset = Locale.assets[name] = {}
		}
		for(var token in data) {
			asset[token] = data[token]
		}
	},

	get: function(token) {
		return Locale.data && token in Locale.data
			? Locale.data[token]
			: Locale.name +'/'+ token
	},

	set: function(name) {
		Locale.name = name
		Locale.data = Locale.assets[Locale.name]
		if(Locale.data) Locale.update()
	},

	update: function() {
		Locale.items.forEach(Locale.updateItem)
	},

	updateItem: function(item) {
		item.func.call(item.scope, Locale.get(item.token), item.data)
	},


	watch: function(token, func, scope, data) {
		var item = {
			id: ++Locale.counter,
			token: token,
			func: func,
			scope: scope,
			data: data
		}

		Locale.items.push(item)
		Locale.updateItem(item)
		return item.id
	},

	unwatch: function(id) {
		for(var i = Locale.items.length -1; i >= 0; i--) {

			if(Locale.items[i].id === id) {
				Locale.items.splice(i, 1)
				return
			}
		}
	},


	setText: function(element, token) {
		return Locale.watch(token, Locale._setText, null, element)
	},

	setTitle: function(element, token) {
		return Locale.watch(token, Locale._setAttribute, null, {
			element: element,
			name: 'title'
		})
	},

	setAttribute: function(name, element, token) {
		return Locale.watch(token, Locale._setAttribute, null, {
			element: element,
			name: name
		})
	},

	setHtml: function(element, token) {
		return Locale.watch(token, Locale._setHtml, null, element)
	},


	_setAttribute: function(value, object) {
		object.element.setAttribute(object.name, value)
	},

	_setText: function(value, element) {
		dom.text(element, value)
	},

	_setHtml: function(value, element) {
		dom.html(element, value)
	}
}
