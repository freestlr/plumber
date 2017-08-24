TSerial = {
	sampler: null,

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
		for(var i = 0; i < nodes.length; i++) {
			var upcon = cons[i]

			if(upcon) {
				var a  = nodes.indexOf(upcon.connected.node)
				,   ai = upcon.connected.index
				,   bi = upcon.index

			} else {
				var a  = i
				,   ai = 0
				,   bi = 0
			}

			data.push({
				t: typei[i],
				a: a,
				ai: ai,
				bi: bi
			})
		}

		return {
			types: types,
			nodes: data
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
				nodes.push(new TNode(samples[json.nodes[i].t]))
			}

			var root
			for(var i = 0; i < json.nodes.length; i++) {
				var n = json.nodes[i]
				if(n.a === i) {
					root = nodes[i]
					continue
				}

				var nodeA = nodes[n.a]
				,   nodeB = nodes[i]

				var conA = nodeA.connections[n.ai]
				,   conB = nodeB.connections[n.bi]

				nodeA.connect(n.ai, nodeB, n.bi)

				if(animate) {
					conA.playConnection()
				}
			}

			if(!root) {
				console.error('bad json', json)
			}

			return root
		})
	},


	toString: function(json) {
		return JSON.stringify({
			t: json.types,
			n: json.nodes.map(function(n) { return [n.t, n.a, n.ai, n.bi] })
		})
	},

	fromString: function(string) {
		var d = JSON.parse(string)

		return {
			types: d.t,
			nodes: d.n.map(function(n) { return { t: n[0], a: n[1], ai: n[2], bi: n[3] } })
		}
	}
}
