TSerial = {
	sampler: null,

	toJSON: function(tree) {
		var types = []
		var typei = []
		var nodes = []
		tree.traverse(function(node) {
			var ti = types.indexOf(node.sample.src)
			if(ti === -1) {
				typei.push(types.length)
				types.push(node.sample.src)

			} else {
				typei.push(ti)
			}

			nodes.push(node)
		})

		var cons = tree.retrieveConnections({ connected: true, master: true }, true)
		var conj = []

		for(var i = 0; i < cons.length; i++) {
			var con = cons[i]

			conj.push({
				a: nodes.indexOf(con.node),
				ai: con.index,
				b: nodes.indexOf(con.connected.node),
				bi: con.connected.index
			})
		}

		return {
			types: types,
			nodes: typei,
			cons: conj
		}
	},

	fromJSON: function(json, animate) {
		var samples = []
		,   nodes   = []
		,   defers  = []

		for(var i = 0; i < json.types.length; i++) {
			var src = json.types[i]

			var sample = f.apick(TSerial.sampler.samples, 'src', src)
			if(!sample) {
				sample = TSerial.sampler.addSample({ src: src })
			}

			samples.push(sample)
			defers.push(sample.load())
		}

		return Defer.all(defers).then(function() {
			for(var i = 0; i < json.nodes.length; i++) {
				nodes.push(new TNode(samples[json.nodes[i]]))
			}

			for(var i = 0; i < json.cons.length; i++) {
				var con = json.cons[i]

				var nodeA = nodes[con.a]
				,   nodeB = nodes[con.b]

				var conA = nodeA.connections[con.ai]
				,   conB = nodeB.connections[con.bi]

				nodeA.connect(con.ai, nodeB, con.bi)

				if(animate) {
					conA.playConnection()
				}
			}

			return nodes[0]
		})
	},


	toString: function(json) {
		return JSON.stringify({
			t: json.types,
			n: json.nodes,
			c: json.cons.map(function(c) { return [c.a, c.ai, c.b, c.bi] })
		})
	},

	fromString: function(string) {
		var d = JSON.parse(string)

		return {
			types: d.t,
			nodes: d.n,
			cons: d.c.map(function(c) { return { a: c[0], ai: c[1], b: c[2], bi: c[3] } })
		}
	}
}
