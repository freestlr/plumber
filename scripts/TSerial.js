TSerial = {

	toJSON: function(tree) {
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
				bi: upcon.index
			})
		}

		return {
			types: types,
			nodes: data
		}
	},

	fromJSON: function(json, animate) {
		var samples = TSerial.prepareSamples(json.types)

		return Defer.all(samples.map(f.func('load'))).then(function() {
			return TSerial.constructJSON(json, samples, animate)
		})
	},

	prepareSamples: function(types, sampler) {
		return types.map(function(src) {
			return f.apick(sampler.samples, 'src', src) || sampler.addSample({ src: src })
		})
	},

	constructJSON: function(json, samples, animate) {
		var root = new TNode(samples[0])

		if(json && json.nodes) {

			var nodes = [root]
			for(var i = 0; i < json.nodes.length; i++) {
				nodes.push(new TNode(samples[json.nodes[i].t]))
			}

			for(var i = 0; i < json.nodes.length; i++) {
				var n = json.nodes[i]

				var nodeA = nodes[n.a]
				,   nodeB = nodes[i+1]

				var conA = nodeA.connections[n.ai]
				,   conB = nodeB.connections[n.bi]

				nodeA.connect(n.ai, nodeB, n.bi)

				if(animate) {
					conA.playConnection()
				}
			}
		}

		return root
	},


	toString: function(json) {
		var tc = json.types.length
		,   nc = json.nodes.length
		,   cc = 0

		for(var i = 0; i < json.nodes.length; i++) {
			var n = json.nodes[i]

			cc = Math.max(cc, n.ai, n.bi)
		}

		var ts = Math.ceil(Math.log2(tc))
		,   ns = Math.ceil(Math.log2(nc +1))
		,   cs = Math.ceil(Math.log2(cc +1))

		var string = ''
		,   buffer = 0
		,   offset = 0
		function write(size, value) {
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
		for(var i = 0; i < nc; i++) {
			var n = json.nodes[i]

			write(ts, n.t)
			write(ns, n.a)
			write(cs, n.ai)
			write(cs, n.bi)
		}

		writeEnd()

		return btoa(string)
	},

	fromString: function(data) {
		var string = atob(data)


		var buffer = 0
		,   index  = 0
		,   have   = 0
		function read(size) {
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

		var ts = Math.ceil(Math.log2(tc))
		,   ns = Math.ceil(Math.log2(nc +1))
		,   cs = Math.ceil(Math.log2(cc +1))

		for(var i = 0; i < nc; i++) {
			json.nodes.push({
				t: read(ts),
				a: read(ns),
				ai: read(cs),
				bi: read(cs)
			})
		}

		return json
	}
}
