Atlas = {
	svg: null,
	items: [],

	setSource: function(svg) {
		if(!svg) return

		Atlas.svg = svg.documentElement || svg
        Atlas.svg.removeAttribute('width')
        Atlas.svg.removeAttribute('height')
		Atlas.update()
	},

	update: function() {
		Atlas.items.forEach(Atlas.updateItem)
	},

	set: function(element, id, name) {
		var item = f.apick(Atlas.items, 'element', element)
		if(!item) {
			item = { element: element }
			Atlas.items.push(item)
		}
		item.id = id
		item.name = name

		if(Atlas.svg) Atlas.updateItem(item)

		return element
	},

	free: function(element) {
		for(var i = Atlas.items.length -1; i >= 0; i--) {
			var item = Atlas.items[i]

			if(item.element === element) {
				dom.remove(item.icon)
				Atlas.items.splice(i, 1)
				return
			}
		}
	},

	updateItem: function(item) {
		var icon = Atlas.get(item.id)

		if(icon) {
			if(item.name) icon.className.baseVal += ' '+ item.name

		} else {
			icon = dom.div(item.name)
			dom.text(icon, item.id)
		}

		if(item.icon) {
			dom.insert(item.element, icon, item.icon)
			dom.remove(item.icon)

		} else {
			dom.append(item.element, icon)
		}

		item.icon = icon
	},

	get: function(id) {
		if(!Atlas.svg) return null

		var icon = Atlas.svg.getElementById(id)
		if(!icon) return null

		var svg = Atlas.svg.cloneNode(false)
		svg.appendChild(icon.cloneNode(true))
		svg.className.baseVal = id
		return svg
	}
}
