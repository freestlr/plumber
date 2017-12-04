function Defer() {
	this.set.apply(this, arguments)
	this.pending = true
}

Defer.all = function(list) {
	var defer  = new Defer
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
			item.then(check, check, item)

		} else {
			result[i] = item
			loaded++
		}
	}

	function check(value, success) {
		var index = list.indexOf(this)

		if(value instanceof Defer) {
			list[index] = value
			value.then(check, check)
			return
		}

		success ? ++loaded : ++failed
		if(success) result[index] = value

		if(loaded + failed >= length) {
			setTimeout(function() {
				defer.transition(!failed, result)
			}, 0)
		}
	}

	return defer
}

Defer.complete = function(success, value) {
	var defer = new Defer
	defer.success = success
	defer.value = value

	return defer
}

Defer.timer = function(duration) {
	function func(value, success) {
		var defer = new Defer

		setTimeout(function() {
			defer.transition(value, success)
		}, duration || 0)

		return defer
	}

	return new Defer(func, func)
}

Defer.prototype = {
	unsafe: false,
	soft: false,

	set: function(onresolve, onreject, scope, unsafe) {
		this.onresolve = typeof onresolve === 'function' ? onresolve : null
		this.onreject  = typeof onreject  === 'function' ? onreject  : null
		this.scope  = this.onreject ? scope  : onreject || scope
		this.unsafe = !!unsafe
		this.unsafe = 1
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

	delay: function(duration) {
		return this.push(Defer.timer(duration))
	},

	push: function(defer) {
		if(this.tail) {
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

	transition: function(success, value) {
		if(this.debug) {
			console.log('defer', this.debug, success ? 'resolve' : 'reject', this.pending ? 'ok' : 'no', value)
		}

		if(!this.pending) return this
		this.pending = false

		var func = success ? this.onresolve : this.onreject
		if(func) {
			if(this.unsafe) {
				this.value   = func.call(this.scope, value, success)
				this.success = true

			} else try {
				this.value   = func.call(this.scope, value, success)
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
		delete this.tail

		if(defer) {
			if(this.value instanceof Defer) {
				this.value.push(defer)

			} else while(defer) {
				defer.transition(this.success, this.value, this)
				defer = defer.next
			}

		} else if(!this.success && !this.soft) {
			throw this.value
		}

		return this
	}
}
