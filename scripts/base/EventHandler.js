function EventHandler(func, item, data) {
	if(typeof func !== 'function') {
		throw Error('EventHandler expects function as 1st argument')
	}

	this.item = item
	this.func = func
	this.data = data

	this.listens = []
}

EventHandler.prototype = {
	handleEvent: function(e) {
        if(this.data) this.func.call(this.item, this.data, e)
        else this.func.call(this.item, e)
	},

	call: function(item, data) {
		return this.func.call(this.item, this.data, data)
	},

	apply: function(item, data) {
		return this.func.apply(this.item, [].concat(this.data, data))
	},

	listen: function(type, element, capture) {
		if(this.element) this.release()

		this.type    = type
		this.capture = !!capture
		this.element = element

		this.element.addEventListener(this.type, this, this.capture)
		return this
	},

	release: function() {
		if(!this.element) return

		this.element.removeEventListener(this.type, this, this.capture)
		delete this.element
		return this
	}
}
