function EventQueueLinked() {
	this.lists = {}
	this.queue = {}
	this.links = {}
}

EventQueueLinked.ADD = {}
EventQueueLinked.DEL = {}

EventQueueLinked.prototype = {

	_add: function(list, item) {
		if(list.tail) {
			item.prev = list.tail
			list.tail = list.tail.next = item
		} else {
			list.head = list.tail = item
		}
	},

	_rem: function(list, item) {
		if(item.prev) {
			item.prev.next = item.next
		} else {
			list.head = item.next
		}

		if(item.next) {
			item.next.prev = item.prev
		} else {
			list.tail = item.prev
		}
	},

	when: function(list, scope, data, once) {
		for(var type in list) {
			this.on(type, list[type], scope, data, once)
		}
	},

	once: function(type, func, scope, data) {
		this.on(type, func, scope, data, true)
	},

	on: function(type, func, scope, data, once) {
		if('function' !== typeof func) return

		this.emit(EventQueueLinked.ADD, {
			type  : type,
			func  : func,
			scope : scope,
			data  : data == null ? [] : [].concat(data),
			once  : once
		})
	},

	off: function(type, func, scope) {

		this.emit(EventQueueLinked.DEL, {
			type  : type,
			func  : func,
			scope : scope
		})
	},

	will: function(type, data) {
		var self  = this
		,   bound = data == null ? [] : [].concat(data)

		return function() {
			var args = bound.slice()
			for(var i = 0; i < arguments.length; i++) args.push(arguments[i])
			self.emit(type, args)
		}
	},

	emit: function(type, data) {
		if(this.debug) {
			console.log(this.debug, type, data)
		}

		this._add(this.queue, {
			type: type,
			data: data == null ? [] : data
		})

		if(!this.processing) {
			this.processing = true

			while(this.queue.head) {
				this.dispatch(this.queue.head)
				this._rem(this.queue, this.queue.head)
			}
			this.processing = false
		}
	},

	dispatch: function(event) {
		var type = event.type
		,   data = event.data

		switch(type) {
			case EventQueueLinked.ADD:
				this._add(this.lists[data.type] || (this.lists[data.type] = {}), data)
			break

			case EventQueueLinked.DEL:
				var list = this.lists[data.type]
				if(list) for(var item = list.head; item; item = item.next) {
					if((data.func  == null || data.func  === item.func)
					&& (data.scope == null || data.scope === item.scope)) {
						this._rem(list, item)
					}
				}
			break

			default:
				var list = this.lists[type]
				if(list) for(var item = list.head; item; item = item.next) {
					item.func.apply(item.scope, item.data.concat(data))
					if(item.once) this._rem(list, item)
				}

				for(var link = this.links.head; link; link = link.next) {
					link.emitter.emit(
						link.prefix ? link.prefix + type : type,
						link.data.concat(data))
				}
			break
		}
	},

	link: function(emitter, prefix, data) {
		this._add(this.links, {
			emitter : emitter,
			prefix  : prefix,
			data    : data == null ? [] : [].concat(data)
		})
	},

	unlink: function(emitter, prefix) {
		for(var link = this.links.head; link; link = link.next) {
			if((emitter == null || emitter === link.emitter)
			&& (prefix  == null || prefix  === link.prefix )) this._rem(this.links, link)
		}
	},

	clone: function() {
		var emitter = new EventQueueLinked
		for(var name in this.lists) {
			emitter.lists[name] = this.lists[name]
		}
		return emitter
	}
}
