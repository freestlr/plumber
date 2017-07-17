function History(data) {
	this.events = new EventEmitter
	this.reset(data)

	for(var name in data) this[name] = data[name]

	this.events.when({
		'history:reload': this.reload,
		'history:undo': this.undo,
		'history:redo': this.redo,
		'history:save': this.save,
		'history:load': this.load
	}, this)
}

History.prototype = {
	records: 500,
	writeToStorage: true,

	reset: function(data) {
		this.data  = {}
		this.saves = []
		this.index = -1
	},

	read: function() {
		try {
			return this.unpack(localStorage.data)

		} catch(e) {
			this.writeToStorage = false
			return null
		}
	},

	write: function(token) {
		if(!this.writeToStorage) return

		try {
			localStorage.data = token

		} catch(e) {
			// localStorage disabled
			this.writeToStorage = false
		}
	},

	save: function(data) {
		var drop = Math.max(0, this.saves.length - this.records)

		this.token = this.pack(data || this.data)
		this.saves = this.saves.slice(drop, this.index +1).concat(this.token)
		this.limit = this.saves.length -1
		this.index = this.limit

		this.write(this.token)
	},

	load: function(index) {
		var token = this.saves[index]
		if(!token) return

		this.index = index
		this.token = token
		this.data  = this.unpack(token)
		this.write(this.token)

		this.events.emit('history:change', [this.data, this.index, this.token])
	},

	// LZW мне запили
	pack: function(data) {
		// return btoa(pako.deflate(JSON.stringify(data), { to: 'string' }))
		return btoa(JSON.stringify(data))
	},

	unpack: function(string) {
		// return JSON.parse(pako.inflate(atob(string), { to: 'string' }))
		return JSON.parse(atob(string))
	},

	replace: function() {
		this.index--
		this.save()
	},

	reload: function() {
		this.load(this.index)
	},

	undo: function() {
		this.load(this.index -1)
	},

	redo: function() {
		this.load(this.index +1)
	}
}
