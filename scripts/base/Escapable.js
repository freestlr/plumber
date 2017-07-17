function Observable(value, scope, reader, writer, equals) {
	this.id = ++Observable.count

	this.value = value
	this.escapable = true

	this.observers = {}
	this.signalled = {}
	this.touchers  = {}
	this.sources   = []

	this.set(scope, reader, writer, equals)
}

Observable.count = 0
Observable.stack = []
Observable.context = null
Observable.UNCHANGED = {}

Observable.unwrap = function(value) {
	return value instanceof Observable ? value.read() : value
}

Observable.inContext = function(context, func, scope, primary, secondary) {
	Observable.stack.push(Observable.context)
	Observable.context = context

	try {
		return func.call(scope, primary, secondary)

	} catch(e) {
		if(e === Observable.UNCHANGED) {
			return context && context.value

		} else throw e

	} finally {
		Observable.context = Observable.stack.pop()
	}
}

Observable.escapeContext = function() {
	var context = Observable.context
	if(!context || Observable.stack.length <3) {
		return
	}
	for(var id in context.touchers) {
		return
	}
	// console.log('OB escape to', context.id)

	throw Observable.UNCHANGED
}

Observable.prototype = {

	set: function(scope, reader, writer, equals) {
		this.reader = 'function' === typeof reader ? reader : null
		this.writer = 'function' === typeof writer ? writer : null
		this.equals = 'function' === typeof equals ? equals : null
		this.scope  = scope

		this.touchers[this.id] = this

		return this
	},

	differ: function(a, b) {
		if(a === b) return false
		if(this.equals) {
			return !this.equals(a, b)
		}
		return true
	},

	read: function() {
		var that = Observable.context
		if(that && that.id !== this.id) {
			this.observers[that.id] = that
			if(this.signalled[that.id]) {
				delete this.signalled[that.id].touchers[this.id]
				delete this.signalled[that.id]
			}
			if(that.sources.indexOf(this.id) === -1) that.sources.push(this.id)
		}

		for(var id in this.touchers) {

			if(this.reader) {
				this.sources = []

				var value = Observable.inContext(this, this.reader, this.scope, this.value)

				if(!this.void) {
					if(this.value !== value && (!this.equals || !this.equals(this.value, value))) {
					// if(this.differ(this.value, value)) {
						if(this.debug) console.log('OB', this.id, 'read', this.value, '->', value, 'deps:', this.sources)
						this.value = value

					} else {
						if(this.debug) console.log('OB', this.id, 'read UNCHANGED')

						this.touchers = {}
						this.untouch()
						// Observable.escapeContext()
					}
				}
			}

			this.touchers = {}
			break
		}

		return this.value
	},

	write: function(value) {
		if(this.value !== value && (!this.equals || !this.equals(this.value, value))) {
		// if(this.differ(this.value, value)) {
			if(this.writer) {
				this.writer.call(this.scope, value, this.value)
			}
			if(this.debug) console.log('OB', this.id, 'write ok', this.value, '->', value)
			this.value = value
			this.touch()

		} else {
			if(this.debug) console.log('OB', this.id, 'write miss', value)
		}

		return this
	},

	untouch: function() {
		if(this.debug) console.log('OB', this.id, 'untouch')

		for(var id in this.touchers) {
			return
		}
		for(var id in this.signalled) {
			var that = this.signalled[id]
			if(this.debug) console.log('---> OB', that.id)

			this.observers[that.id] = that
			delete this.signalled[id].touchers[this.id]
			delete this.signalled[id]
			that.untouch()
		}
	},

	touch: function() {
		if(this.debug) console.log('OB', this.id, 'touch')

		var trace = this.debug
		for(var id in this.observers) {
			var that = this.observers[id]

			delete this.observers[that.id]
			this.signalled[that.id] = that
			this.signalled[that.id].touchers[this.id] = this
			// that.touchers[this.id] = this

			trace |= that.touch()
		}

		// if(trace) console.log('---> OB', this.id)
		return trace
	}
}
