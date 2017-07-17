function EventHandler(func, item, data) {
	if(typeof func !== 'function') {
		throw Error('EventHandler expects function as 1st argument')
	}

	this.item = item
	this.func = func
	this.data = data
}

EventHandler.prototype = {
	handleEvent: function(e) {
		this.func.call(this.item, this.data, e)
	},

	call: function(item, data) {
		this.func.call(this.item, this.data, data)
	},

	apply: function(item, data) {
		this.func.apply(this.item, this.data.concat(data))
	}
}
