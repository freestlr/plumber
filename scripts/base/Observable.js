function Observable(value, scope, reader, writer, equals) {
	this.id = ++Observable.count

	this.value = value
	this.targets = {}
	this.sources = {}

	this.set(scope, reader, writer, equals)
}

Observable.count = 0
Observable.stack = []
Observable.context = null

Observable.unwrap = function(value) {
	return value instanceof Observable ? value.read() : value
}

Observable.inContext = function(context, func, scope, primary, secondary) {
	Observable.stack.push(Observable.context)
	Observable.context = context

	try {
		return func.call(scope, primary, secondary)

	} finally {
		Observable.context = Observable.stack.pop()
	}
}

Observable.prototype = {

	set: function(scope, reader, writer, equals) {
		this.reader = 'function' === typeof reader ? reader : null
		this.writer = 'function' === typeof writer ? writer : null
		this.equals = 'function' === typeof equals ? equals : null
		this.scope  = scope
		this.stale  = true

		return this
	},

	read: function() {
		var caller = Observable.context
		if(caller && caller.id !== this.id) {
			this.targets[caller.id] = caller
			caller.sources[this.id] = this
		}

		if(this.stale) {
			this.stale = false

			if(this.reader) {
				this.sources = {}
				var value = this.value
				this.value = Observable.inContext(this, this.reader, this.scope, this.value)
				if(this.debug) console.log('OB', this.id, 'read', value, '->', this.value, 'deps:', Object.keys(this.sources).map(Number))

			} else {
				if(this.debug) console.log('OB', this.id, 'read stale no reader', this.value)
			}
		} else {
			if(this.debug) console.log('OB', this.id, 'read utmost', this.value)
		}

		return this.value
	},

	write: function(value) {
		if(this.value !== value) {

			if(this.writer) {
				this.writer.call(this.scope, value, this.value)
			}
			if(this.debug) console.log('OB', this.id, 'write ok', this.value, '->', value)
			this.value = value
			this.touch()

		} else {
			if(this.debug) console.log('OB', this.id, 'write fail', value)
		}

		return this
	},

	touch: function(stale) {
		this.stale = true

		if(this.debug) console.trace('OB', this.id, 'touched')

		var trace = this.debug
		for(var id in this.targets) {
			var caller = this.targets[id]

			delete this.targets[id]

			trace |= caller.touch()
		}

		if(trace) console.log('---> OB', this.id)
		return trace
	},

	destroy: function() {
		for(var id in this.sources) {
			delete this.sources[id].targets[this.id]
			delete this.sources[id]
		}
		this.touch()
	}
}
