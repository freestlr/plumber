function Defer() {
	this.set.apply(this, arguments)
	this.pending = true
}

Defer.all = function(list) {
	var defer  = new Defer(check, check)
	,   length = list && list.length || 0
	,   result = new Array(list.length)
	,   loaded = 0
	,   failed = 0

	if(!length) {
		defer.resolve(result)
		return defer
	}

	for(var i = 0; i < length; i++) {
		var item = list[i]
		if(item instanceof Defer) {
			item.push(defer)

		} else {
			result[i] = item
			loaded++
		}
	}

	function check(value, success, item) {
		success ? ++loaded : ++failed

		result[list.indexOf(item)] = value

		if(loaded + failed < length) {
			defer.pending = true

		} else {
			if(failed) throw result
			else      return result
		}
	}

	return defer
}

Defer.wait = function(duration) {
	return function(value) {
		return Defer.timer(duration, value)
	}
}
Defer.timer = function(duration, value) {
	var defer = new Defer

	setTimeout(function() { defer.resolve(value) }, duration)

	return defer
}

Defer.prototype = {
	unsafe: false,

	set: function(onresolve, onreject, scope, unsafe) {
		this.onresolve = typeof onresolve === 'function' ? onresolve : null
		this.onreject  = typeof onreject  === 'function' ? onreject  : null
		this.scope  = this.onreject ? scope  : onreject || scope
		this.unsafe = !!unsafe
		return this
	},

	abort: function() {
		delete this.head
		delete this.tail
		return this.set(null)
	},

	then: function(onresolve, onreject, scope, unsafe) {
		return this.push(new Defer(onresolve, onreject, scope, unsafe))
	},

	anyway: function(func, scope, unsafe) {
		return this.push(new Defer(func, func, scope, unsafe))
	},

	detach: function(func, scope) {
		this.push(new Defer(function(value) {
			setTimeout(function() { func.call(scope, value) }, 0)
		}))
	},

	push: function(defer) {
		if(this.head) {
			this.tail = this.tail.next = defer
		} else {
			this.head = this.tail = defer
		}

		this.dispatch()
		return defer
	},

	resolve: function(value, defer) {
		return this.transition(true, value, defer)
	},

	reject: function(value, defer) {
		return this.transition(false, value, defer)
	},

	transition: function(success, value, defer) {
		if(this.debug) {
			console.log('defer', this.debug, success ? 'resolve' : 'reject', this.pending ? 'ok' : 'no', value)
		}

		if(!this.pending) return this
		this.pending = false

		var func = success ? this.onresolve : this.onreject
		if(func) {
			if(this.unsafe) {
				this.value   = func.call(this.scope, value, success, defer)
				this.success = true

			} else try {
				this.value   = func.call(this.scope, value, success, defer)
				this.success = true

			} catch(e) {
				this.value   = e
				this.success = false
			}

		} else {
			this.success = success
			this.value   = value
		}

		this.dispatch()
		return this
	},

	dispatch: function() {
		if(this.pending) return this

		var defer = this.head
		delete this.head

		if(defer) {
			if(this.value instanceof Defer) {
				this.value.push(defer)

			} else while(defer) {
				defer.transition(this.success, this.value, this)
				defer = defer.next
			}

		} else if(!this.success) {
			throw this.value
		}

		return this
	}
}
