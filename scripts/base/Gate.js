function Gate(method, value) {
	this.inputs = {}
	this.method = method
	this.value  = value
	this.events = new EventEmitter
}

Gate.prototype = {

	on: function(pin) {
		this.inputs[pin] = true
		this.check()
	},

	off: function(pin) {
		this.inputs[pin] = false
		this.check()
	},

	set: function(state, pin) {
		this.inputs[pin] = state
		this.check()
	},

	will: function(state, pin) {
		var self = this
		return function() { self.set(state, pin) }
	},

	check: function(force) {
		var value
		for(var pin in this.inputs) {
			if(undefined === value) value = this.inputs[pin]
			else value = this.method(value, this.inputs[pin])
		}

		if(undefined === value) {
			value = this.value
		}

		if(!this.value !== !value || force) {
			this.events.emit(value ? 'opened' : 'closed', !!value)
		}

		if(this.value !== value || force) {
			this.value = value
			this.events.emit('change', value)
		}
	},

	constructor: Gate
}

Gate.MULTIPLY = function(a, b) { return a *  b }
Gate.ADD      = function(a, b) { return a +  b }
Gate.AND      = function(a, b) { return a && b }
Gate.OR       = function(a, b) { return a || b }
