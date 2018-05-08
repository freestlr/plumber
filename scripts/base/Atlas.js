Atlas = {
	svg: null,
	list: null,
	items: [],

	setSource: function(svg) {
		if(!svg) return

		Atlas.svg = svg.documentElement || svg
        Atlas.svg.removeAttribute('width')
        Atlas.svg.removeAttribute('height')

		Atlas.list = {}

		var elements = Atlas.svg.getElementsByTagName('*')
		for(var i = 0; i < elements.length; i++) {
			var element = elements[i]
			,   nodeName = element.nodeName.toLowerCase()

			if(nodeName === 'metadata') {
				if(element.parentNode) element.parentNode.removeChild(element)

			} else if(element.id) {
				element.removeAttribute('visibility')
				Atlas.list[element.id] = element
			}
		}

		Atlas.update()
	},

	update: function() {
		Atlas.items.forEach(Atlas.updateItem)
	},

	set: function(element, id, name) {
		var item = Atlas.pickItem(element)
		item.id = id
		item.name = name

		if(Atlas.svg) Atlas.updateItem(item)

		return element
	},

	free: function(element) {
		for(var i = Atlas.items.length -1; i >= 0; i--) {
			var item = Atlas.items[i]

			if(!element || item.element === element) {
				item.element.removeChild(item.icon)
				Atlas.items.splice(i, 1)
			}
		}
	},

	pickItem: function(element) {
		for(var i = 0; i < Atlas.items.length; i++) {
			var item = Atlas.items[i]
			if(item.element === element) return item
		}
		item = { element: element }
		Atlas.items.push(item)
		return item
	},

	updateItem: function(item) {
		var icon = Atlas.clone(item.id)

		if(icon) {
			if(item.name) icon.className.baseVal += ' '+ item.name

		} else {
			icon = document.createElement('div')
			icon.className = item.id +' '+ item.name
			if(Atlas.svg) icon.textContent = item.id
		}

		if(item.icon) {
			item.element.insertBefore(icon, item.icon)
			item.element.removeChild(item.icon)

		} else {
			item.element.appendChild(icon)
		}

		item.icon = icon
	},

	clone: function(id) {
		var icon = Atlas.list && Atlas.list[id]
		if(!icon) return null

		var svg = Atlas.svg.cloneNode(false)
		svg.appendChild(icon.cloneNode(true))
		svg.className.baseVal = id
		return svg
	}
}
