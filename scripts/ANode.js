ANode = f.unit({
	unitName: 'ANode',

	debug: false,

	removable: true,

	// virtual methods to be overriden by descendants
	create: function() {},
	onDestroy: function() {},
	readJSON: function() { return this.name },
	writeJSON: function() {},


	round: function(n) {
		return Geo.round(n)
	},

	init: function(source) {
		this.options  = []
		this.helpers  = {}

		this.obvJSON   = new Observable().set(this, this.readJSON, this.writeJSON, Geo.equalJSON)
		this.obvParent = new Observable().set(this, null, this.writeParentInContext)
		this.obvRoot   = new Observable().set(this, this.readRoot)
		this.obvBuild  = new Observable().set(this, this.readBuild)

		this.obvParents   = new Observable().set(this, this.readParents)
		this.obvAncestors = new Observable().set(this, this.readAncestors)
		this.obvRemovable = new Observable(this.removable)
		this.obvNoRemove  = new Observable().set(this, this.readNoRemove)
		this.obvChildren  = new Observable([])

		// mount array items
		this.obvMountProp  = new Observable
		this.obvMountList  = new Observable
		this.obvMountIndex = new Observable
		this.obvPrevNode   = new Observable
		this.obvNextNode   = new Observable

		// flags
		this.obvVisible = new Observable(true)
		this.obvValid   = new Observable(true)
		this.obvSelect  = new Observable(false)
		this.obvHover   = new Observable(false)
		this.obvBlank   = new Observable(false)

		this.events  = new EventEmitter
		this.object  = new THREE.Object3D
		this.visible = new Gate(Gate.AND, true)
		this.visible.events.on('change', this.onVisibleChange, this)

		this.create()

		this.thing = this.T3 ? new this.T3(this) : new Draw3D(this)

		this.options.remove = {
			type: 'action',
			label: 'option_label_remove',
			icon: 'i-delete',
			disabled: this.obvNoRemove,
			hidden: this.obvNoRemove,
			func: this.remove
		}

		for(var name in this.options) {
			this.options[name].node = this
			this.options[name].name = name
		}

		if(source != null) this.obvJSON.write(source)
	},



	// ---------------- MOUNTPOINTS ------------------
	mountProp: function(point) {
		return this.makeMountPoint(point, null, this.remountProp, this.unmountProp)
	},

	mountList: function(point) {
		return this.makeMountPoint(point, [], this.remountList, this.unmountList)
	},

	mountLoop: function(point) {
		return this.makeMountPoint(point, [], this.remountList, this.unmountList, true)
	},

	mountHash: function(point) {
		return this.makeMountPoint(point, {}, this.remountHash, this.unmountHash)
	},


	makeMountPoint: function(point, value, remount, unmount, options) {
		var mount = new Observable(value).set(this, readMount, writeMount)

		if(point) {
			point.value = value
		} else {
			point = new Observable(value)
		}

		mount.unmount = unmountNode
		mount.mountItem = point


		function unmountNode(node) {
			unmount.call(node, mount)
			delete node.mountPoint
		}

		function readMount(prev) {
			return remount.call(this, point.read(), prev, mount, options)
		}

		function writeMount(next, prev) {
			point.write(next)

			remount.call(this, point.read(), prev, mount, options)
		}

		return mount
	},


	remountProp: function(next, prev, mount) {
		if(prev === next) {
			return prev
		}
		if(prev) {
			prev.obvParent.write(null)
		}
		if(next) {
			next.obvParent.write(this)
			next.mountPoint = mount
		}
		return next
	},

	remountList: function(next, prev, mount, loop) {
		var diff = f.adiff(next, prev)
		,   nlen = next && next.length

		if(!diff.remc && !diff.addc) {
			if(!nlen) return prev

			var moved = false
			for(var i = 0; i < nlen; i++) {
				if(prev[i] !== next[i]) {
					moved = true
					break
				}
			}
			if(!moved) return prev
		}

		for(var i = 0; i < diff.remc; i++) {
			var node = diff.rem[i]

			node.obvParent.write(null)
			node.obvMountIndex.write(null)
			node.obvMountList.write(null)
			node.obvPrevNode.write(null)
			node.obvNextNode.write(null)
		}

		for(var i = 0; i < diff.addc; i++) {
			var node = diff.add[i]

			node.obvParent.write(this)
			node.mountPoint = mount
		}

		for(var i = 0; i < nlen; i++) {
			var node = next[i]

			node.obvMountIndex.write(i)
			node.obvMountList.write(next)
			node.obvPrevNode.write(next[loop ? (i || nlen) -1 : i -1])
			node.obvNextNode.write(next[loop ? (i +1) % nlen  : i +1])
		}

		return next
	},

	remountHash: function(next, prev, mount) {
		for(var key in prev) {
			var node = prev[key]

			if(!next[key]) {
				node.obvParent.write(null)
				node.obvMountIndex.write(null)
			}
		}

		for(var key in next) {
			var node = next[key]

			if(!prev[key]) {
				node.obvParent.write(this)
				node.mountPoint = mount
			}

			node.obvMountIndex.write(key)
		}

		return next
	},

	unmountProp: function(mount) {
		mount.write(null)
	},

	unmountList: function(mount) {
		mount.write(f.adrop(mount.read().slice(), this))
	},

	unmountHash: function(mount) {
		var hash = f.copy({}, mount.read())
		,   key  = this.obvMountIndex.read()

		delete hash[key]
		mount.write(hash)
	},


	writeParentInContext: function(next, prev) {
		Observable.inContext(null, this.writeParent, this, next, prev)
	},

	writeParent: function(next, prev) {
		if(next === prev) return

		if(prev) {
			prev.object.remove(this.object)
			prev.obvChildren.write(f.adrop(prev.obvChildren.read().slice(), this))

			if(!next) {
				var root = prev.obvRoot.read()
				if(root) root.remNode(this)
			}
		}

		if(next) {
			this.destroyed = false
			next.object.add(this.object)
			next.obvChildren.write(next.obvChildren.read().concat(this))

			if(!prev) {
				var root = next.obvRoot.read()
				if(root) root.addNode(this)
			}

		} else {
			this.destroy()
		}
	},

	readRoot: function() {
		if(this.root) return this

		var node = this.obvParent.read()
		return node ? node.obvRoot.read() : null
	},

	unmount: function() {
		if(this.mountPoint) this.mountPoint.unmount(this)
	},

	remove: function() {
		this.unmount()
		main.bus.emit('node_destroy', this)
	},



	// ----------- UTILITY -------------
	readNoRemove: function() {
		return !this.obvRemovable.read()
	},

	onVisibleChange: function(visible) {
		this.object.visible = visible
		this.obvVisible.write(visible)
	},

	getMaterial: function() {
		var material = Observable.unwrap(this.material)
		return material && material.name || Observable.unwrap(this.targetMaterial)
	},

	getFabric: function() {
		return main.imagery.getUsedProduct(this.getMaterial())
	},

	readBuild: function() {
		if(!this.destroyed) {
			this.thing.rebuild()
		}
		return NaN
	},

	readParents: function() {
		var node = this
		,   parents = []
		while(node) {
			parents.push(node)
			node = node.obvParent.read()
		}
		return parents
	},

	readAncestors: function() {
		var ancestors = {}

		var node = this
		while(node) {
			if(node.name) ancestors[node.name] = node
			node = node.obvParent.read()
		}

		return ancestors
	},

	destroy: function() {
		if(this.destroyed) return
		this.destroyed = true

		var children = this.obvChildren.read()
		for(var i = 0; i < children.length; i++) {
			children[i].destroy()
		}

		this.onDestroy()

		if(this.thing) {
			this.thing.destroy()
		}

		for(var name in this) {
			var item = this[name]

			if(item instanceof Observable) item.destroy()
			if(item.mountItem) item.mountItem.destroy()
		}
	},

	traverse: function(type, func, scope, data) {
		var list = []
		if(typeof func !== 'function') {
			func = null
		}

		!function traverseInner(node) {
			if(!type || node.constructor === type) {
				if(!func || func.call(scope, node, data)) list.push(node)
			}
			var children = node.obvChildren.read()
			for(var i = 0; i < children.length; i++) {
				traverseInner(children[i])
			}
		}(this)

		return list
	},

	readItemJSON: function(item) {
		return item.obvJSON.read()
	},




	// ----------- OPTIONS -------------
	validOption: function(option, value) {
		return this.clampOption(option, value) === value
	},

	clampOption: function(name, value) {
		var option = typeof name === 'string' ? this.options[name] : name
		if(!option) return false

		switch(option.type) {
			case 'number':
				var min = Observable.unwrap(option.min)
				,   max = Observable.unwrap(option.max)
				,   old = Observable.unwrap(option.value)

				if(isNaN(min)) min = -Infinity
				if(isNaN(max)) max =  Infinity

				if(min > max) {
					return (min + max) / 2
				}

				if(isNaN(value) || Math.abs(old - value) < Geo.EPS) {
					return old
				}

				return f.clamp(+value, min, max)

			default:
				return value
		}
	},

	setOption: function(name, value, related) {
		var option = typeof name === 'string' ? this.options[name] : name
		if(!option) return false

		if(Observable.unwrap(option.disabled)) return false

		if(option.type === 'action') {
			option.func.call(this)
			return true
		}

		var result = this.clampOption(option, value)
		if(option.strict && result !== value) return false

		if(option.related instanceof Observable) {
			option.related.write(related)

		} else {
			option.related = related
		}

		if(option.value instanceof Observable) {
			option.value.write(result)

		} else {
			option.value = result
		}

		return true
	},





	// ------- META -------
	dumpStrings: function() {
		var name = this.toString()
		var json = this.readJSON()
		var prop = []

		if(json instanceof Array) {
			prop.push(array(json))

		} else prop = Object.keys(json).map(function(k) {
			var v = json[k]

			return k +':'+ (v instanceof Array ? array(v) : v)
		})

		function array(a) {
			var l = a.length
			return '['+ (l && (l > 4 || +a[0] !== a[0]) ? l +'i' : a) +']'
		}

		function indent(string) { return '\t'+ string }

		var strings = [name +' '+ prop.filter(Boolean).join(' ')]
		,   children = this.obvChildren.read()
		for(var i = 0; i < children.length; i++) {
			strings = strings.concat(children[i].dumpStrings().map(indent))
		}
		return strings
	},

	dump: function() {
		return this.dumpStrings().join('\n')
	},

	path: function() {
		var path = []
		,   node = this

		next_parent:
		while(node) {
			var parent = node.obvParent.read()
			,   index  = node.obvMountIndex.read()
			,   mount  = node.mountPoint
			if(!mount) break

			for(var name in parent) if(parent[name] === mount) {
				path.push({
					name: name,
					index: index
				})
				node = parent
				continue next_parent
			}

			break
		}

		return path.reverse()
	},

	query: function(path) {
		if(!path) return null

		var node = this
		for(var i = 0; node && i < path.length; i++) {
			var point = path[i]

			var item = Observable.unwrap(node[point.name])
			if(!item) return null

			node = item instanceof ANode ? item : item[point.index]
		}

		return node
	},

	clone: function() {
		return new this.constructor(this.obvJSON.read())
	},

	toPath: function() {
		return this.obvParents.read().slice().reverse().join(' -> ')
	},

	toString: function() {
		var index = this.obvMountIndex.read()
		return this.unitName +(isNaN(index) ? '' : ' #'+ index)
	}
})
