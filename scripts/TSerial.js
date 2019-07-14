TSerial = {

	toJSON: function(tree) {
		if(!tree) return null

		var types = []
		,   typei = []
		,   nodes = []
		,   cons  = []
		tree.traverse(function(node) {
			var ti = types.indexOf(node.sample.src)
			if(ti === -1) {
				ti = types.length
				types.push(node.sample.src)
			}

			typei.push(ti)
			nodes.push(node)
			cons.push(node.upcon)
		})


		var data = []
		for(var i = 1; i < nodes.length; i++) {
			var upcon = cons[i]

			data.push({
				t: typei[i],
				a: nodes.indexOf(upcon.connected.node),
				ai: upcon.connected.index,
				bi: upcon.index,
				r: upcon.rotar
			})
		}

		return {
			types: types,
			nodes: data
		}
	},

	isComplex: function(json) {
		return json && json.types && json.types.length
	},

	fromJSON: function(json, sampler, animate) {
		return sampler.prepareComplex(json).then(function() {
			return TSerial.constructJSON(json, sampler, animate)
		})
	},

	constructJSON: function(json, sampler, animate) {
		if(!json) return null

		var samples = json.types.map(sampler.getSample, sampler)
		var root = new TNode(samples[0])

		if(json.nodes) {

			var nodes = [root]
			for(var i = 0; i < json.nodes.length; i++) {
				var n = json.nodes[i]

				nodes.push(new TNode(samples[n.t]))
			}

			for(var i = 0; i < json.nodes.length; i++) {
				var n = json.nodes[i]

				var nodeA = nodes[n.a]
				,   nodeB = nodes[i+1]

				var conA = nodeA.connections[n.ai]
				,   conB = nodeB.connections[n.bi]

				nodeA.connect(n.ai, nodeB, n.bi)

				if(n.r) {
					nodeB.rotate(n.r, animate)
				}

				if(animate) {
					conA.playConnection()
				}
			}
		}

		if(json.blacklist || json.whitelist) {
			for(var i = 0; i < nodes.length; i++) {
				var node = nodes[i]

				for(var j = node.connections.length -1; j >= 0; j--) {
					var con = node.connections[j]

					var black = false
					if(json.blacklist) for(var k = 0; k < json.blacklist.length; k++) {
						var jb = json.blacklist[k]

						if(jb.a === i && jb.ai === j) {
							black = true
							break
						}
					}

					var white = true
					if(json.whitelist) {
						for(var k = 0; k < json.whitelist.length; k++) {
							var jw = json.whitelist[k]

							if(jw.a === i && jw.ai === j) {
								break
							}
						}
						white = false
					}

					if(!white || black) {
						con.blocked = false
						node.connections.splice(j, 1)
					}
				}

			}
		}

		return root
	},


	// [0,1) range assumed
	rationalApproximate: function(number, limit, epsilon) {
		if(!number) return [0, 1]

		if(limit   == null) limit   = 1 << 16
		if(epsilon == null) epsilon = 1e-6

		var p1 = 0
		,   q1 = 1

		var p2 = 1
		,   q2 = 1

		var p3
		,   q3

		var pb
		,   qb
		,   eb = Infinity

		var approx, error

		do {
			p3 = p1 + p2
			q3 = q1 + q2
			approx = p3 / q3
			error = Math.abs(approx - number)

			if(eb > error) {
				eb = error
				pb = p3
				qb = q3
			}

			if(p3 > q3 * number) {
				p2 = p3
				q2 = q3
			} else {
				p1 = p3
				q1 = q3
			}

		} while(error > epsilon && q3 < limit)

		return [pb, qb]
	},

	toString: function(json) {
		var p2 = Math.PI * 2

		var tc = json.types.length
		,   nc = json.nodes.length
		,   cc = 0
		,   rv = []
		,   rq = []

		var primes = f.nextprime()
		for(var i = 0; i < json.nodes.length; i++) {
			var n = json.nodes[i]
			var r = n.r / p2 || 0

			cc = Math.max(cc, n.ai, n.bi)
			rv.push(r)
			rq.push(TSerial.rationalApproximate(r) [1])
		}

		var rl = f.lcm(rq)

		var ts = Math.ceil(Math.log2(tc))
		,   ns = Math.ceil(Math.log2(nc +1))
		,   cs = Math.ceil(Math.log2(cc +1))
		,   rs = Math.ceil(Math.log2(rl))

		var string = ''
		,   buffer = 0
		,   offset = 0
		function write(size, value) {
			if(!size) return

			buffer |= value << offset
			offset += size

			while(offset > 7) {
				string += String.fromCharCode(buffer & 0xFF)
				buffer >>= 8
				offset -= 8
			}
		}
		function writeEnd() {
			write(8 - offset, 0)
		}



		write(16, tc)
		for(var i = 0; i < tc; i++) {
			var t = json.types[i]

			write(16, t.length)
			for(var j = 0; j < t.length; j++) {
				write(8, t.charCodeAt(j))
			}
		}

		write(16, cc)
		write(16, nc)
		write(16, rl)
		for(var i = 0; i < nc; i++) {
			var n = json.nodes[i]

			write(ts, n.t)
			write(ns, n.a)
			write(cs, n.ai)
			write(cs, n.bi)
			write(rs, Math.round(rl * rv[i]))
		}

		writeEnd()

		return btoa(string)
	},

	fromString: function(data) {
		var p2 = Math.PI * 2

		var string = atob(data)


		var buffer = 0
		,   index  = 0
		,   have   = 0
		function read(size) {
			if(!size) return 0

			while(have < size) {
				buffer |= string.charCodeAt(index) << have
				have += 8
				index++
			}

			var value = buffer & ((1 << size) -1)

			buffer >>= size
			have -= size

			return value
		}

		var json = { types: [], nodes: [] }


		var tc = read(16)
		for(var i = 0; i < tc; i++) {
			var l = read(16)

			var type = ''
			for(var j = 0; j < l; j++) {
				type += String.fromCharCode(read(8))
			}

			json.types.push(type)
		}

		var cc = read(16)
		,   nc = read(16)
		,   rl = read(16)

		var ts = Math.ceil(Math.log2(tc))
		,   ns = Math.ceil(Math.log2(nc +1))
		,   cs = Math.ceil(Math.log2(cc +1))
		,   rs = Math.ceil(Math.log2(rl))

		for(var i = 0; i < nc; i++) {
			json.nodes.push({
				t: read(ts),
				a: read(ns),
				ai: read(cs),
				bi: read(cs),
				r: read(rs) / rl * p2
			})
		}

		return json
	}
}
