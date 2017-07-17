function Database() {
	this.tables = {}
}

Database.EUNKNOWN = 0
Database.ETVERIFY = 1
Database.EBADTABL = 2
Database.EREWTABL = 3
Database.ENOTABLE = 4
Database.ENOFIELD = 5
Database.EMULTFLD = 6
Database.EBADCOMP = 7
Database.ENOTIMPL = 8
Database.EHNOTSTR = 9
Database.EHPERIOD = 10
Database.EHUNKOPT = 11
Database.EHNANINC = 12
Database.EHRETYPE = 13
Database.EHNEXIST = 14


Database.messages = []
Database.messages[Database.EUNKNOWN] = 'DB unknown error'
Database.messages[Database.ETVERIFY] = 'DB'
Database.messages[Database.EBADTABL] = 'DB table not found'
Database.messages[Database.EREWTABL] = 'DB table already exist'
Database.messages[Database.ENOTABLE] = 'DBQ no table selected'
Database.messages[Database.ENOFIELD] = 'DBQ field not found'
Database.messages[Database.EMULTFLD] = 'DBQ ambiguous field definition'
Database.messages[Database.EBADCOMP] = 'DBQ bad operator'
Database.messages[Database.ENOTIMPL] = 'DBQ method not implemented'
Database.messages[Database.EHNOTSTR] = 'DB column defn is not a string'
Database.messages[Database.EHPERIOD] = 'DB column defn contains dot'
Database.messages[Database.EHUNKOPT] = 'DB column defn has unknown option'
Database.messages[Database.EHNANINC] = 'DB non-number autoincrement column'
Database.messages[Database.EHRETYPE] = 'DB column type recast'
Database.messages[Database.EHNEXIST] = 'DB column name already exist'


Database.prototype = {

	queryCount: 0,
	loglevel: 2,

	typecast: function(type, value) {
		switch(type) {
			case 'string':
				return value +''

			case 'number':
				return +value

			case 'integer':
				return value |0

			default:
			case 'any':
				return value
		}
	},

	error: function(level, eid, extra) {
		if(level < this.loglevel) return

		var msg = Database.messages[eid]
		if(!msg) {
			msg = Database.messages[eid = Database.EUNKNOWN]
		}

		var val
		if(extra instanceof Array) {
			val = this.path(extra)
		} else if(eid === Database.ETVERIFY) {
			val = extra
		} else if(extra) {
			val = JSON.stringify(extra)
		}

		switch(level) {
			case 3: throw Error(val ? msg +': '+ val : msg)
			break

			case 2: console.error(msg, val)
			break

			case 1: console.warn(msg, val)
			break

			default:
			case 0: console.log(msg, val)
			break
		}
	},

	path: function(array) {
		var parts = []

		if(array[0] != null) {
			parts.push('table '+ JSON.stringify(array[0]))
		}

		if(array[1] != null) {
			parts.push('row '+ JSON.stringify(array[1]))
		}

		if(array[2] != null) {
			parts.push('col '+ JSON.stringify(array[2]))
		}

		if(array[3] != null) {
			parts.push(array[3])
		}

		return parts.join(' :: ')
	},

	createTable: function(tname, thead) {
		var t_t = 'table "'+ tname +'"'

		var tdata = [thead]
		,   tidix = thead.indexOf('id')
		,   tsize = thead.length

		if(tidix === -1) {
			this.error(2, Database.ETVERIFY, t_t +' :: no "id" field')
			return
		}

		for(var i = 0; i < tsize; i++) {
			if(typeof thead[i] !== 'string') {
				this.error(1, Database.EHNOTSTR, thead[i])
			}
		}

		this.tables[tname] = tdata
	},

	importTable: function(tname, tdata) {
		var t_t = 'table "'+ tname +'"'

		if(!tdata) {
			return this.error(2, Database.ETVERIFY, t_t +' :: empty')
		}

		var last = tdata[tdata.length -1]
		if(!last.length) tdata.splice(-1, 1)

		var thead = tdata[0]
		,   tidix = thead.indexOf('id')
		,   tsize = thead.length

		if(tidix === -1) {
			return this.error(2, Database.ETVERIFY, t_t +' :: no "id" field')
		}

		for(var i = 0; i < tsize; i++) {
			var fname = thead[i]

			if(typeof fname !== 'string') {
				this.error(1, Database.EHNOTSTR, fname)

			} else if(fname.indexOf('.') !== -1) {
				this.error(1, Database.EHPERIOD, fname)
			}
		}

		for(var i = tdata.length -1; i >= 1; i--) {
			var row = tdata[i]
			,   t_r = t_t +' row '+ i

			if(!row) {
				this.error(2, Database.ETVERIFY, t_r +' :: empty row')
				tdata.splice(i, 1)
				continue
			}

			var id = row[tidix]

			for(var j = tdata.length -1; j > i; j--) {
				if(id === tdata[j][tidix]) {
					this.error(2, Database.ETVERIFY, t_r +', '+ j +' :: duplicate id "'+ id +'"')
				}
			}

			if(row.length < tsize) {
				this.error(1, Database.ETVERIFY, t_r +' :: row smaller than header')

			} else if(row.length > tsize) {
				this.error(0, Database.ETVERIFY, t_r +' :: row larger than header')
			}

			for(var j = 1; j < tsize; j++) {
				var value = row[j]
				var t_f = t_r +' field "'+ thead[j] +'"'

				if(!value) {
					this.error(0, Database.ETVERIFY, t_f +' :: void value')

				} else if(typeof value === 'object') {
					this.error(1, Database.ETVERIFY, t_f +' :: complex value')
				}
			}
		}

		this.tables[tname] = tdata
	},

	exportTable: function(tname, fgroup) {
		var tdata = this.tables[tname]
		if(!tdata && typeof tname === 'object') tdata = tname

		if(!tdata) {
			return this.error(2, Database.EBADTABL, tname)
		}

		var trows = tdata.length
		,   thead = tdata[0]
		,   tsize = thead.length
		,   group = thead.indexOf(fgroup || 'id')
		,   fsize = f.rangep(tsize, 0, 0)
		,   talig = []

		for(var i = 0; i < trows; i++) {
			var rdata = tdata[i]
			,   ralig = []

			for(var j = 0; j < tsize; j++) {
				var value = JSON.stringify(rdata[j] || 0)
				fsize[j] = Math.max(fsize[j], value.length)
				ralig.push(value)
			}

			talig.push(ralig)
		}

		for(var i = 0; i < trows; i++) {
			var ralig = talig[i]

			for(var j = 0; j < tsize; j++) {
				var value = ralig[j]
				,   vsize = fsize[j]

				ralig[j] = Array(vsize +1 - value.length).join(' ') + value
			}
		}

		var string = []
		for(var i = 0; i < trows; i++) {
			var ralig = talig[i]
			,   nl = false

			if(i === 1) nl = true

			if(i && !nl && group !== -1) {
				var gcurr = tdata[i  ][group]
				,   gprev = tdata[i-1][group]

				if(typeof gcurr === 'number' && gcurr - gprev > 1) {
					nl = true
				}
			}

			string.push(
				(nl ? '\n' : '')+
				(i ? '  [' : '[ [')+
				ralig.join(', ') +']'+
				(i === trows -1 ? ']' : ','))
		}

		return string.join('\n')
	},

	query: function() {
		this.queryCount++
		return new DatabaseQuery(this, this.queryCount)
	}
}





function DatabaseQuery(db, id) {
	this.db = db
	this.id = id

	this.talias = {}
	this.falias = {}

	this.tables = []
	this.values = []
}

DatabaseQuery.prototype = {

	reAlias: /\s+as\s+/i,

	fieldOps: {
		EQS   : function(value, sample) { return value === sample },
		EQ    : function(value, sample) { return value == sample },
		NE    : function(value, sample) { return value != sample },
		LT    : function(value, sample) { return value <  sample },
		LE    : function(value, sample) { return value <= sample },
		GT    : function(value, sample) { return value >  sample },
		GE    : function(value, sample) { return value >= sample },
		IN    : function(value, sample) { return sample.indexOf(value) !== -1 },
		LIKE  : function(value, sample) { return (value +'').indexOf(sample) !== -1 },
		MATCH : function(value, sample) { return sample.test(value) }
	},

	clone: function() {
		var query = this.db.query()

		for(var name in this.talias) query.talias[name] = this.talias[name]
		for(var name in this.falias) query.falias[name] = this.falias[name]

		query.tables = this.tables.slice()

		for(var i = 0; i < this.values.length; i++) {
			var rptr = this.values[i]

			query.values.push(rptr.slice())
		}

		return query
	},

	profile: function() {
		this.profileTime = Date.now()

		return this
	},

	profileEnd: function() {
		if(this.profileTime) {
			console.log('DBQ '+ this.id +':', Date.now() - this.profileTime)
			delete this.profileTime
		}

		return this
	},

	extractField: function(rptr, fptr) {
		if(!rptr || !fptr) return null

		var tindex = fptr[0]
		,   findex = fptr[1]
		,   rindex = rptr[tindex]

		if(rindex === -1) return null

		var table  = this.tables[tindex]
		,   tname  = this.talias[table] || table
		,   tdata  = this.db.tables[tname]

		return tdata[rindex][findex]
	},

	resolveField: function(field) {
		var pindex = field.indexOf('.')
		,   tindex = -1
		,   findex = -1

		if(pindex === -1) {
			for(var i = 0; i < this.tables.length; i++) {
				var tname = this.tables[i]
				,   tdata = this.db.tables[tname]
				,   thead = tdata[0]

				var cindex = thead.indexOf(field)
				if(cindex !== -1) {
					if(findex === -1) {
						tindex = i
						findex = cindex

					} else {
						return this.db.error(3, Database.EMULTFLD, field)
					}
				}
			}

		} else {
			var table = field.slice(0, pindex)
			,   fname = field.slice(pindex +1)

			var tindex = this.tables.indexOf(table)

			if(tindex === -1) {
				return this.db.error(3, Database.ENOFIELD, field)
			}

			var tname = this.talias[table] || table
			,   tdata  = this.db.tables[tname]
			,   thead  = tdata[0]

			findex = thead.indexOf(fname)
		}


		if(findex === -1) {
			return this.db.error(3, Database.ENOFIELD, field)
		}

		return [tindex, findex]
	},

	resolveFieldList: function(fields) {
		var fptrs = []

		if(!fields.length) {

		} else if(fields.length === 1 && fields[0] === '*') {
			for(var i = 0; i < this.tables.length; i++) {
				var table = this.tables[i]
				,   tname = this.talias[table] || table
				,   tdata = this.db.tables[tname]
				,   thead = tdata[0]

				for(var j = 0; j < thead.length; j++) {
					fptrs.push([i, j, tname +'.'+ thead[j]])
				}
			}

		} else if(fields.length === 1 && typeof fields[0] === 'object') {
			for(var falias in fields[0]) {
				var field = fields[0][falias]
				,   fptr  = this.resolveField(field)

				if(!fptr) continue

				fptr.push(falias)
				fptrs.push(fptr)
			}

		} else for(var i = 0; i < fields.length; i++) {
			var fpart  = fields[i].split(this.reAlias)
			,   field  = fpart[0]
			,   falias = fpart[1]
			,   fptr   = this.resolveField(field)

			if(!fptr) continue

			fptr.push(falias || field)
			fptrs.push(fptr)
		}

		return fptrs
	},

	pushTable: function(table) {
		var parts = table.split(this.reAlias)
		,   tname = parts[0]
		,   alias = parts[1]

		if(!this.db.tables[tname]) {
			this.db.error(3, Database.EBADTABL, table)
		}

		if(this.tables.indexOf(alias || tname) !== -1) {
			this.db.error(3, Database.ETDUPLIC, table)
		}

		if(alias) this.talias[alias] = tname

		this.tables.push(alias || tname)

		return this.db.tables[tname]
	},

	from: function(tableA) {
		this.tables = []
		this.values = []

		var dataA = this.pushTable(tableA)

		for(var i = 1; i < dataA.length; i++) {
			this.values.push([i])
		}

		return this
	},

	// A and B
	joinInner: function(tableB, fieldA, fieldB) {
		var dataB = this.pushTable(tableB)
		,   fptrA = this.resolveField(fieldA)
		,   fptrB = this.resolveField(fieldB)

		if(!fptrA || !fptrB) return

		next_row:
		for(var i = this.values.length -1; i >= 0; i--) {
			var rptr = this.values[i]
			,   valueA = this.extractField(rptr, fptrA)

			for(var j = 1; j < dataB.length; j++) {
				var valueB = dataB[j][fptrB[1]]

				if(valueA === valueB) {
					// rptr[fptrB[0]] = j
					rptr.push(j)
					continue next_row
				}
			}

			this.values.splice(i, 1)
		}

		return this
	},

	// A
	joinLeft: function(tableB, fieldA, fieldB) {
		var dataB = this.pushTable(tableB)
		,   fptrA = this.resolveField(fieldA)
		,   fptrB = this.resolveField(fieldB)

		if(!fptrA || !fptrB) return

		next_row:
		for(var i = this.values.length -1; i >= 0; i--) {
			var rptr = this.values[i]
			,   valueA = this.extractField(rptr, fptrA)

			for(var j = 1; j < dataB.length; j++) {
				var valueB = dataB[j][fptrB[1]]

				if(valueA === valueB) {
					// rptr[fptrB[0]] = j
					rptr.push(j)
					continue next_row
				}
			}

			rptr[fptrB[0]] = -1
		}

		return this
	},

	// B
	joinRight: function(tableB, fieldA, fieldB) {
		var dataB = this.pushTable(tableB)
		,   fptrA = this.resolveField(fieldA)
		,   fptrB = this.resolveField(fieldB)

		if(!fptrA || !fptrB) return

		var valuesA = this.values
		,   valuesB = dataB.slice()

		var lengthA = valuesA.length
		,   lengthB = valuesB.length

		this.values = []
		for(var i = 0; i < lengthA; i++) {
			var rptr = valuesA[i]
			,   valueA = this.extractField(rptr, fptrA)

			for(var j = 1; j < lengthB; j++) {
				var rowB = valuesB[j]
				if(!rowB) continue

				var valueB = rowB[fptrB[1]]

				if(valueA === valueB) {
					this.values.push(rptr.concat(j))
					valuesB[j] = null
				}
			}
		}

		var empty = f.rangep(this.tables.length -1, -1, 0)

		for(var i = 1; i < lengthB; i++) {
			if(valuesB[i]) this.values.push(empty.concat(i))
		}

		return this
	},

	// A or B
	joinOuter: function(tableB, fieldA, fieldB) {
		this.db.error(2, Database.ENOTIMPL, 'joinOuter')

		return this
	},

	// A x B
	joinCross: function(tableB) {
		var dataB  = this.pushTable(tableB)
		,   values = this.values

		this.values = []

		for(var i = 0; i < values.length; i++) {
			var rptr = values[i]

			for(var j = 1; j < dataB.length; j++) {
				this.values.push(rptr.concat(j))
			}
		}

		return this
	},

	where: function(field, op, sample) {

		var compare = this.fieldOps[(op +'').toUpperCase()]
		if(!compare) {
			return this.db.error(2, Database.EBADCOMP, op)
		}

		var fptr = this.resolveField(field)
		if(!fptr) return

		for(var i = this.values.length -1; i >= 0; i--) {
			var value = this.extractField(this.values[i], fptr)

			if(!compare(value, sample)) this.values.splice(i, 1)
		}

		return this
	},

	groupBy: function() {
		var fptrs = this.resolveFieldList(arguments)
		if(!fptrs.length) return this

		var values = []
		for(var i = 0; i < this.values.length; i++) {
			var row = []

			for(var j = 0; j < fptrs.length; j++) {
				row.push(this.extractField(this.values[i], fptrs[j]))
			}

			values.push(row)
		}

		next_a:
		for(var i = values.length -1; i >= 0; i--) {
			var rowA = values[i]

			next_b:
			for(var j = 0; j < i; j++) {
				var rowB = values[j]

				for(var k = 0; k < fptrs.length; k++) {
					if(rowA[k] !== rowB[k]) continue next_b
				}

				this.values.splice(i, 1)
				continue next_a
			}
		}

		return this
	},

	orderBy: function(field, order) {

		var fptr = this.resolveField(field)
		if(!fptr) return

		var dir = order === 'desc' ? -1 : 1

		var self = this
		this.values.sort(function(rptrA, rptrB) {
			var av = self.extractField(rptrA, fptr)
			,   bv = self.extractField(rptrB, fptr)

			return (av < bv ? -1 : av > bv ? 1 : 0) * dir
		})

		return this
	},

	limit: function(items) {
		items = +items || 0

		if(this.values.length > items) {
			this.values.splice(items, this.values.length - items)
		}

		return this
	},

	select: function() {
		var fptrs = this.resolveFieldList(arguments)
		,   result = []

		for(var i = 0; i < this.values.length; i++) {
			var rptr = this.values[i]
			,   obj = {}

			for(var j = 0; j < fptrs.length; j++) {
				var fptr  = fptrs[j]
				,   fname = fptr[2]

				obj[fname] = this.extractField(rptr, fptr)
			}

			result.push(obj)
		}

		this.profileEnd()
		return result
	},

	print: function() {
		var fptrs  = this.resolveFieldList(arguments)
		,   head   = []
		,   result = [head]

		for(var i = 0; i < fptrs.length; i++) {
			head.push(fptrs[i][2])
		}

		for(var i = 0; i < this.values.length; i++) {
			var rptr = this.values[i]
			,   row = []

			for(var j = 0; j < fptrs.length; j++) {
				row.push(this.extractField(rptr, fptrs[j]))
			}

			result.push(row)
		}

		this.profileEnd()
		console.log(this.db.exportTable(result))
		return this
	},

	selectField: function(field) {
		var fptr = this.resolveField(field)
		if(!fptr) return

		var data = []
		for(var i = 0; i < this.values.length; i++) {
			data.push(this.extractField(this.values[i], fptr))
		}
		return data
	},

	selectOne: function() {
		this.limit(1)
		return this.select.apply(this, arguments) [0]
	},


	into: function(tname) {
		if(!this.db.tables[tname]) {
			return this.db.error(3, Database.EBADTABL, table)
		}

		this.usetable = tname

		return this
	},

	addColumn: function(fname, before, value) {
		if(!this.usetable) {
			return this.db.error(3, Database.ENOTABLE)
		}

		if(typeof fname !== 'string') {
			this.db.error(1, Database.EHNOTSTR, fname)

		} else if(fname.indexOf('.') !== -1) {
			this.db.error(1, Database.EHPERIOD, fname)
		}

		var tdata = this.db.tables[this.usetable]
		,   thead = tdata[0]
		,   index = before ? thead.indexOf(before) : thead.length

		if(value == null) {
			value = null
		}

		if(index === -1) {
			this.db.error(2, Database.ENOFIELD, before)
			index = thead.length
		}

		thead.splice(index, 0, fname)

		for(var i = 1; i < tdata.length; i++) {
			tdata[i].splice(index, 0, value)
		}

		return this
	},

	remColumn: function(fname) {
		if(!this.usetable) {
			return this.db.error(3, Database.ENOTABLE)
		}

		if(typeof fname !== 'string') {
			return this.db.error(1, Database.EHNOTSTR, fname)
		}

		var tdata = this.db.tables[this.usetable]
		,   thead = tdata[0]
		,   index = thead.indexOf(fname)

		if(index === -1) {
			return this.db.error(3, Database.ENOFIELD, fname)
		}

		for(var i = 0; i < tdata.length; i++) {
			tdata[i].splice(index, 1)
		}

		return this
	},

	insert: function(values) {
		if(!this.usetable) {
			return this.db.error(3, Database.ENOTABLE)
		}

		this.db.error(2, Database.ENOTIMPL, 'insert')

		return this
	},

	update: function(field, value) {
		var fptr = this.resolveField(field)
		if(!fptr) return

		var table = this.tables[fptr[0]]
		,   tname = this.talias[table] || table
		,   tdata = this.db.tables[tname]

		for(var i = 0; i < this.values.length; i++) {
			var rptr = this.values[i]
			,   rix = rptr[fptr[0]]
			,   rdt = tdata[rix]

			rdt[fptr[1]] = value
		}

		return this
	}
}
