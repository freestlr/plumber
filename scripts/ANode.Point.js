ANode.Point = f.unit(ANode, {
	unitName: 'ANode_Point',
	name: 'point',
	label: 'node_label_corner',
	targetMaterial: 'corner',
	T3: Draw3D.Corner,

	create: function() {
		this.obvVertex = new Observable(new THREE.Vector3).set(this, null, null, Geo.equalVectors)

		this.obvNormal = new Observable().set(this, this.readNormal, null, Geo.equalVectors)
		this.obvBeta   = new Observable().set(this, this.readBeta, null, Geo.equalReals)
		this.obvOuter  = new Observable().set(this, this.readOuter)
		this.obvDirect = new Observable().set(this, this.readDirect)

		this.obvPrevWall = new Observable().set(this, this.readPrevWall)
		this.obvNextWall = new Observable().set(this, this.readNextWall)
	},

	writeJSON: function(json) {
		var vertex = new THREE.Vector3(json[0], 0, json[1])

		this.obvVertex.write(vertex)
	},

	readJSON: function() {
		var vertex = this.obvVertex.read()

		return [this.round(vertex.x), this.round(vertex.z)]
	},

	readPrevWall: function() {
		var contour = this.obvParent.read()
		,   walls   = contour.obvWalls.read()
		,   prev    = this.obvPrevNode.read()
		,   index   = prev.obvMountIndex.read()

		return walls[index]
	},

	readNextWall: function() {
		var contour = this.obvParent.read()
		,   walls   = contour.obvWalls.read()
		,   index   = this.obvMountIndex.read()

		return walls[index]
	},

	readNormal: function() {
		var prevNode = this.obvPrevNode.read()
		,   nextNode = this.obvNextNode.read()

		var curr = this.obvVertex.read()
		,   prev = prevNode.obvVertex.read()
		,   next = nextNode.obvVertex.read()

		var ndx = next.x - curr.x
		,   ndz = next.z - curr.z
		,   pdx = curr.x - prev.x
		,   pdz = curr.z - prev.z

		var pdl = Math.sqrt(pdx * pdx + pdz * pdz)
		,   ndl = Math.sqrt(ndx * ndx + ndz * ndz)
		,   vp  = pdl > Geo.EPS
		,   vn  = ndl > Geo.EPS


		var normal = new THREE.Vector3

		if(!vp && !vn) {
			normal.set(0, 0, 1)

		} else if(!vp) {
			normal.set(-ndz / ndl, 0, ndx / ndl)

		} else if(!vn) {
			normal.set(-pdz / pdl, 0, pdx / pdl)

		} else {
			var nrx = pdx / pdl + ndx / ndl
			,   nrz = pdz / pdl + ndz / ndl
			,   nrl = Math.sqrt(nrx * nrx + nrz * nrz)

			normal.set(-nrz / nrl, 0, nrx / nrl)
		}

		return normal
	},

	readBeta: function() {
		var prevNode = this.obvPrevNode.read()
		,   nextNode = this.obvNextNode.read()

		var curr = this.obvVertex.read()
		,   prev = prevNode.obvVertex.read()
		,   next = nextNode.obvVertex.read()

		var ndx = next.x - curr.x
		,   ndz = next.z - curr.z
		,   pdx = curr.x - prev.x
		,   pdz = curr.z - prev.z

		var palpha = Math.atan2(pdz, pdx)
		,   nalpha = Math.atan2(ndz, ndx)

		var beta = palpha - nalpha
		if(Math.abs(beta) > Math.PI) {
			if(beta < 0) beta += Math.PI * 2
			else         beta -= Math.PI * 2
		}

		return beta
	},

	readOuter: function() {
		return this.obvBeta.read() > 0
	},

	readDirect: function() {
		return Math.abs(this.obvBeta.read() - Math.PI/2) < f.torad(5)
	}
})
