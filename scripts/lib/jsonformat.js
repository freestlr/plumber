function jsonformat(object, tab, size, level, field, drop) {
	level = level |0
	tab   = tab  || '\t'
	size  = size || 100
	drop  = drop || []

	var indent = Array(level +1).join(tab || '\t')
	,   string

	if(object && typeof object === 'object') {
		if(typeof Node !== 'undefined' && object instanceof Node) {
			return null
		}
		if(drop.indexOf(object) !== -1) {
			return null
		}
		drop.push(object)

		try {
			var split = JSON.stringify(object).length > size

		} catch(e) { return null }


		var fields = []
		,   joint = split ? ',\n': ', '
		,   lnext = split ? level +1 : 0
		,   brackets

		if(object instanceof Array) {
			brackets = '[]'
			for(var i = 0; i < object.length; i++) {
				var item = jsonformat(object[i], tab, size, lnext, null, drop)
				fields.push(item)
			}

		} else {
			brackets = '{}'
			for(var name in object) {
				var item = jsonformat(object[name], tab, size, lnext, name, drop)
				if(item) fields.push(item)
			}
		}

		if(split) {
			string = brackets[0] +'\n'+ fields.join(joint) +'\n'+ indent + brackets[1]

		} else {
			string = brackets[0] + fields.join(joint) + brackets[1]
		}

	} else switch(typeof object) {

		case 'object':
		case 'boolean':
		case 'number':
			string = object
		break

		case 'string':
			string = JSON.stringify(object)
		break

		default:
		case 'function':
		case 'undefined':
			return null
	}

	return indent +(field ? JSON.stringify(field) +': ' : '')+ string
}
