Draw3D = f.unit({
	unitName: 'Draw3D',

	object: null,
	aliasOffset: 1e-3,

	init: function(node) {
		this.node   = node
		this.object = node.object

		this.subnodes = []

		this.branch = new THREE.Object3D
		this.branch.persistent = true

		this.object.add(this.branch)
	},

	destroyGeometry: function(geometry) {
		if(!geometry) return

		if(geometry.cachedInstances) {
			if(--geometry.cachedInstances === 0) {
				geometry.persistent = false
			}
		}

		if(!geometry.persistent) {
			geometry.dispose()

			if(Draw3D.cache[geometry.uuid]) {
				delete Draw3D.cache[geometry.uuid]
			}
		}
	},

	destroyMaterial: function(material) {
		if(!material) return

		if(!material.persistent) {
			material.dispose()
		}
	},

	destroyObject: function(object, recursive) {
		if(!object) return

		if(object.parent && !object.persistent) {
			object.parent.remove(object)
		}

		this.destroyGeometry(object.geometry)
		this.destroyMaterial(object.material)

		if(object.children && recursive) {
			for(var i = object.children.length -1; i >= 0; i--) {
				this.destroyObject(object.children[i], true)
			}
		}
	},

	destroySubnode: function(subnode) {
		if(!subnode) return
		this.destroyObject(subnode.object, true)
		this.remSubnode(subnode)
	},

	destroy: function() {
		this.destroyObject(this.branch, true)
		for(var i = this.subnodes.length -1; i >= 0; i--) {
			this.remSubnode(this.subnodes[i])
		}
		for(var name in this) {
			var item = this[name]

			if(item instanceof Observable) item.destroy()
		}
	},

	rebuild: function() {
		this.destroy()
		this.create && this.create()
	},


	makeGeometry: function() {
		var geometry = new THREE.Geometry
		geometry.faceVertexUvs[1] = geometry.faceVertexUvs[0]
		return geometry
	},

	makeCachedGeometry: function(id, source) {
		var geometry = Draw3D.cache[id]
		if(!geometry) {
			geometry = source ? source.clone() : this.makeGeometry()
			geometry.cachedInstances = 0
			geometry.persistent = true
			geometry.uuid = id

			Draw3D.cache[id] = geometry
		}
		geometry.cachedInstances++

		return geometry
	},

	makeMesh: function(geometry, material) {
		return new THREE.Mesh(
			geometry instanceof THREE.Geometry ? geometry : this.makeGeometry(),
			material instanceof THREE.Material ? material : main.imagery.materials.void)
	},

	addObject: function(object, root) {
		if(root) root.add(object)
		else this.branch.add(object)
	},

	remSubnode: function(subnode) {
		var index = subnode.owner.subnodes.indexOf(subnode)
		if(index === -1) return

		subnode.owner.subnodes.splice(index, 1)

		var root = this.node.obvRoot.read()
		Observable.inContext(null, root.remSubnodeFromPool, root, subnode)
	},

	addSubnode: function(object, type, oRoot, data, targets, overrideName) {
		var oSubnode

		if(object instanceof THREE.Object3D) {
			oSubnode = object

		} else {
			oSubnode = this.makeMesh(object)
			oSubnode.name = type
		}

		// var ancestors = this.node.obvAncestors.read()

		var subnode = {
			type: type,
			data: data,
			object: oSubnode,
			meshes: [],
			targets: f.merge(this.node.obvAncestors.read(), targets),
			// targets: targets ? f.merge(ancestors, targets) : ancestors,
			needsUpdate: true,
			owner: this
		}

		this.setSubnodeMaterial(oSubnode, type, overrideName)
		this.setSubnodeGeometry(oSubnode, subnode)

		if(oRoot) this.addObject(oSubnode, oRoot instanceof THREE.Object3D && oRoot)

		this.subnodes.push(subnode)

		var root = this.node.obvRoot.read()
		Observable.inContext(null, root.addSubnodeIntoPool, root, subnode)

		return subnode
	},

	setSubnodeMaterial: function(object, name, overrideName) {
		var ms = main.imagery.materials

		if(object.material) {
			if(overrideName) {
				object.material = ms[name] || object.material
			} else {
				object.material = ms[object.name] || ms[name] || object.material
			}
		}

		for(var i = 0; i < object.children.length; i++) {
			this.setSubnodeMaterial(object.children[i], name, overrideName)
		}
	},

	setSubnodeGeometry: function(object, subnode) {
		if(object.geometry) {
			var empty

			if(object.geometry instanceof THREE.BufferGeometry) {
				empty = !object.geometry.attributes.position.length

			} else {
				empty = !object.geometry.vertices.length
			}

			if(empty) {
				var stack = Error().stack
				console.log('addSubnode: empty geometry', subnode.type, '\n',
					stack.slice(stack.indexOf('addSubnode ')).split('\n')[1])

			} else {
				subnode.meshes.push(object)
			}
		}

		for(var i = 0; i < object.children.length; i++) {
			this.setSubnodeGeometry(object.children[i], subnode)
		}
	},

	addRect: function(geometry, one, two, low, high, oy, alpha) {
		var a = new THREE.Vector3(one.x, one.y + low,  one.z)
		,   b = new THREE.Vector3(two.x, two.y + low,  two.z)
		,   c = new THREE.Vector3(one.x, one.y + high, one.z)
		,   d = new THREE.Vector3(two.x, two.y + high, two.z)

		this.addTriangle(geometry, c, a, d, alpha, 1, oy)
		this.addTriangle(geometry, a, b, d, alpha, 1, oy)
	},

	extrudeLine: function(geometry, start, end, low, high, oy, alpha) {
		if(low >= high) return

		if(Math.abs(end.x - start.x) < Geo.EPS
		&& Math.abs(end.z - start.z) < Geo.EPS) return

		if(alpha == null) {
			alpha = Math.atan2(end.z - start.z, end.x - start.x)
		}

		var a = new THREE.Vector3(start.x, start.y + low,  start.z)
		,   b = new THREE.Vector3(  end.x,   end.y + low,    end.z)
		,   c = new THREE.Vector3(start.x, start.y + high, start.z)
		,   d = new THREE.Vector3(  end.x,   end.y + high,   end.z)

		this.addTriangle(geometry, c, a, d, alpha, 1, oy)
		this.addTriangle(geometry, a, b, d, alpha, 1, oy)
	},

	/**
	 *       minX  maxX
	 *  maxY C-----D
	 *       |    /|
	 *       |   / |
	 *       |  /  |
	 *       | /   |
	 *       |/    |
	 *  minY A-----B
	 */
	extrudeRect: function(geometry, minX, maxX, minY, maxY, uvX, uvY) {
		if(maxX - minX < Geo.EPS
		|| maxY - minY < Geo.EPS) return

		if(uvX == null) uvX = 0
		if(uvY == null) uvY = 0

		var vi = geometry.vertices.length

		var A = new THREE.Vector3(minX, minY, 0)
		,   B = new THREE.Vector3(maxX, minY, 0)
		,   C = new THREE.Vector3(minX, maxY, 0)
		,   D = new THREE.Vector3(maxX, maxY, 0)

		var fn = new THREE.Vector3(0, 0, 1)

		var fA = new THREE.Face3(vi +2, vi +0, vi +3, fn)
		,   fB = new THREE.Face3(vi +0, vi +1, vi +3, fn)

		var uA = new THREE.Vector2(minX + uvX, minY + uvY)
		,   uB = new THREE.Vector2(maxX + uvX, minY + uvY)
		,   uC = new THREE.Vector2(minX + uvX, maxY + uvY)
		,   uD = new THREE.Vector2(maxX + uvX, maxY + uvY)

		var uvA = [uC, uA, uD]
		,   uvB = [uA, uB, uD]

		geometry.vertices.push(A, B, C, D)
		geometry.faces.push(fA, fB)
		geometry.faceVertexUvs[0].push(uvA, uvB)
	},

	/**
	 *           D topR
	 *          /|          foldL     foldR
	 *         / |
	 *        /  |              D    C
	 *  topL C   |             /|    |\
	 *       |\  |            / |    | \
	 *       | \ |           /  |    |  \
	 *       |  \|          /   |    |   \
	 *  minY A---B         AC---B    A---BD
	 */
	extrudeTrapeze: function(geometry, minX, maxX, minY, topL, topR, uvX, uvY) {
		if(maxX - minX <  Geo.EPS
		|| topL - minY < -Geo.EPS
		|| topR - minY < -Geo.EPS) return

		var foldL = topL - minY < Geo.EPS
		,   foldR = topR - minY < Geo.EPS

		if(foldL && foldR) return

		if(uvX == null) uvX = 0
		if(uvY == null) uvY = 0

		var vi = geometry.vertices.length

		var A = new THREE.Vector3(minX, minY, 0)
		,   B = new THREE.Vector3(maxX, minY, 0)
		,   C = new THREE.Vector3(minX, topL, 0)
		,   D = new THREE.Vector3(maxX, topR, 0)

		var uA = new THREE.Vector2(minX + uvX, minY + uvY)
		,   uB = new THREE.Vector2(maxX + uvX, minY + uvY)
		,   uC = new THREE.Vector2(minX + uvX, topL + uvY)
		,   uD = new THREE.Vector2(maxX + uvX, topR + uvY)

		var uABC = [uA, uB, uC]
		,   uCBD = [uC, uB, uD]

		var fn = new THREE.Vector3(0, 0, 1)

		var fA = new THREE.Face3(vi +0, vi +1, vi +2, fn)
		,   fB = new THREE.Face3(vi +2, vi +1, vi +3, fn)

		if(foldL) {
			geometry.vertices.push(C, B, D)
			geometry.faces.push(fA)
			geometry.faceVertexUvs[0].push(uCBD)

		} else if(foldR) {
			geometry.vertices.push(A, B, C)
			geometry.faces.push(fA)
			geometry.faceVertexUvs[0].push(uABC)

		} else {
			geometry.vertices.push(A, B, C, D)
			geometry.faces.push(fA, fB)
			geometry.faceVertexUvs[0].push(uABC, uCBD)
		}
	},

	cutPlaneContour: function(box, points) {
		var minX = box.min.x
		,   minY = box.min.y
		,   maxX = box.max.x
		,   maxY = box.max.y

		var contour = []
		for(var j = 0, i = 1; i < points.length; j = i++) {
			var a = points[j]
			,   b = points[i]

			if(a.x > maxX && b.x > maxX) break
			if(a.x < minX && b.x < minX) continue
			if(a.y < minY && b.y < minY) continue

			var cxA = f.clamp(a.x, minX, maxX)
			,   cxB = f.clamp(b.x, minX, maxX)

			var inA = box.containsPoint(a)
			,   inB = box.containsPoint(b)

			var syL = Geo.splitEdgeST(minX, a.x, b.x, a.y, b.y)
			,   syR = Geo.splitEdgeST(maxX, a.x, b.x, a.y, b.y)
			,   sxD = Geo.splitEdgeST(minY, a.y, b.y, a.x, b.x)
			,   sxU = Geo.splitEdgeST(maxY, a.y, b.y, a.x, b.x)

			var isL = isFinite(minX) && minY < syL && syL < maxY
			,   isR = isFinite(maxX) && minY < syR && syR < maxY
			,   isD = isFinite(minY) && minX < sxD && sxD < maxX
			,   isU = isFinite(maxY) && minX < sxU && sxU < maxX

			if(syL < minY && syR < minY) continue

			var vnA = new THREE.Vector2(a.x,  a.y)
			,   vnB = new THREE.Vector2(b.x,  b.y)
			,   vsL = new THREE.Vector2(minX, syL)
			,   vsR = new THREE.Vector2(maxX, syR)
			,   vsD = new THREE.Vector2(sxD, minY)
			,   vsU = new THREE.Vector2(sxU, maxY)
			,   vcA = new THREE.Vector2(cxA, maxY)
			,   vcB = new THREE.Vector2(cxB, maxY)

			if(inA) {
				contour.push(vnA)
			} else if(isL) {
				contour.push(vsL)
			} else if(isD && a.y < minY) {
				contour.push(vsD)
			} else if(isU && a.y > maxY) {
				contour.push(vcA, vsU)
			} else {
				contour.push(vcA)
			}

			if(inB) {
				contour.push(vnB)
			} else if(isR) {
				contour.push(vsR)
			} else if(isD && b.y < minY) {
				contour.push(vsD)
			} else if(isU && b.y > maxY) {
				contour.push(vsU, vcB)
			} else {
				contour.push(vcB)
			}
		}

		Geo.filterContour2(contour)
		return contour
	},

	collectBoxHoles: function(holes, minX, maxX, minY, maxY, meta, pointsX, pointsY) {
		var EPS = Geo.EPS

		var fitHoles = []
		if(holes) for(var i = 0; i < holes.length; i++) {
			var hole = holes[i]

			var atL = hole.minX + EPS < maxX
			,   atR = hole.maxX - EPS > minX
			,   atD = hole.minY + EPS < maxY
			,   atU = hole.maxY - EPS > minY

			if(!atL || !atR || !atD || !atU) continue


			var inL = atL && hole.minX - EPS > minX
			,   inR = atR && hole.maxX + EPS < maxX
			,   inD = atD && hole.minY - EPS > minY
			,   inU = atU && hole.maxY + EPS < maxY

			if(pointsX && inL) pointsX.push(hole.minX)
			if(pointsX && inR) pointsX.push(hole.maxX)

			if(meta) {
				var hminX = f.clamp(hole.minX, minX, maxX)
				,   hmaxX = f.clamp(hole.maxX, minX, maxX)
				,   hminY = f.clamp(hole.minY, minY, maxY)
				,   hmaxY = f.clamp(hole.maxY, minY, maxY)

				var hdX = hmaxX - hminX
				,   hdY = hmaxY - hminY

				if(inL) meta.holeL += hdY
				if(inR) meta.holeR += hdY
				if(inD) meta.holeD += hdX
				if(inU) meta.holeU += hdX

				if(hminX === minX && hmaxX === maxX) meta.connectedH -= hdY
				if(hminY === minY && hmaxY === maxY) meta.connectedW -= hdX
			}

			fitHoles.push(hole)
		}

		return fitHoles
	},

	extrudeHoleyRect: function(geometry, minX, maxX, minY, maxY, holes, uvX, uvY) {
		var EPS = Geo.EPS

		var rdX = maxX - minX
		,   rdY = maxY - minY

		var meta = {
			minX: minX,
			maxX: maxX,
			minY: minY,
			maxY: maxY,

			connectedW: rdX,
			connectedH: rdY,

			totalW: rdX,
			totalH: rdY,

			holeL: 0,
			holeR: 0,
			holeU: 0,
			holeD: 0,

			edgeL: 0,
			edgeR: 0,
			edgeU: 0,
			edgeD: 0,

			area: 0
		}

		var pointsX = [minX, maxX]
		,   fitHoles = this.collectBoxHoles(holes, minX, maxX, minY, maxY, meta, pointsX)

		pointsX.sort(f.sub)

		for(var i = pointsX.length -1; i > 0; i--) {
			var ax = pointsX[i]
			,   bx = pointsX[i-1]

			if(Math.abs(ax - bx) < Geo.EPS) pointsX.splice(i, 1)
		}

		for(var i = 0; i < pointsX.length -1; i++) {
			var ax = pointsX[i]
			,   bx = pointsX[i +1]
			,   dx = bx - ax

			var h = []
			for(var j = 0; j < fitHoles.length; j++) {
				var hole = fitHoles[j]

				if(hole.minX < ax + Geo.EPS && ax + Geo.EPS < hole.maxX) {
					h.push([hole.minY, hole.maxY])
				}
			}
			h.sort(f.zerosort)

			var pointsY = []

			var l = h.length
			if(l) {
				if(h[0][0] - Geo.EPS > minY) {
					pointsY.push([minY, h[0][0]])
				}

				for(var j = 0; j < l -1; j++) {
					pointsY.push([h[j][1], h[j +1][0]])
				}

				if(h[l -1][1] + Geo.EPS < maxY) {
					pointsY.push([h[l -1][1], maxY])
				}

			} else {
				pointsY.push([minY, maxY])
			}

			for(var j = 0; j < pointsY.length; j++) {
				var ay = pointsY[j][0]
				,   by = pointsY[j][1]
				,   dy = by - ay

				this.extrudeRect(geometry, ax, bx, ay, by, uvX, uvY)
				if(ax === minX) meta.edgeL += dy
				if(bx === maxX) meta.edgeR += dy
				if(ay === minY) meta.edgeD += dx
				if(by === maxY) meta.edgeU += dx
				meta.area += dx * dy
			}
		}

		return meta
	},

	extrudeHoleyContour: function(geometry, minY, contour, holes) {
		var EPS = Geo.EPS

		var minX =  Infinity
		,   maxX = -Infinity
		,   maxY = -Infinity

		for(var i = 0; i < contour.length; i++) {
			var a = contour[i]

			if(a.x < minX) minX = a.x
			if(a.x > maxX) maxX = a.x
			if(a.y > maxY) maxY = a.y
		}

		var rdX = maxX - minX
		,   rdY = maxY - minY

		var meta = {
			minX: minX,
			maxX: maxX,
			minY: minY,
			maxY: maxY,

			connectedW: rdX,
			connectedH: rdY,

			totalW: rdX,
			totalH: rdY,

			holeL: 0,
			holeR: 0,
			holeU: 0,
			holeD: 0,

			edgeL: 0,
			edgeR: 0,
			edgeU: 0,
			edgeD: 0,

			area: 0,
		}

		var pointsX = []
		,   pointsT = []
		,   fitHoles = this.collectBoxHoles(holes, minX, maxX, minY, maxY, meta, pointsX)

		for(var i = 0; i < contour.length; i++) {
			pointsX.push(contour[i].x)
		}
		pointsX.sort(f.sub)

		for(var i = pointsX.length -1; i > 0; i--) {
			var ax = pointsX[i]
			,   bx = pointsX[i-1]

			if(Math.abs(ax - bx) < Geo.EPS) pointsX.splice(i, 1)
		}

		for(var i = 0; i < pointsX.length; i++) {
			var x = pointsX[i]

			for(var j = 0, k = 1; k < contour.length; j = k++) {
				var a = contour[j]
				,   b = contour[k]

				if(a.x > x || x > b.x) continue

				var y =
					x === a.x ? a.y :
					x === b.x ? b.y :
					Geo.splitEdgeST(x, a.x, b.x, a.y, b.y)

				pointsT.push(f.clamp(y, minY, maxY))
				break
			}
		}

		for(var i = 0; i < pointsX.length -1; i++) {
			var ax = pointsX[i]
			,   bx = pointsX[i +1]
			,   cx = (ax + bx) / 2
			,   dx = bx - ax

			var h = []
			for(var j = 0; j < fitHoles.length; j++) {
				var hole = fitHoles[j]

				if(hole.minX < cx && cx < hole.maxX) {
					h.push([hole.minY, hole.maxY])
				}
			}
			h.sort(f.zerosort)

			var pointsY = []

			var l = h.length
			if(l) {
				if(h[0][0] - Geo.EPS > minY) {
					pointsY.push([ minY, h[0][0] ])
				}

				for(var j = 0; j < l -1; j++) {
					pointsY.push([ h[j][1], h[j +1][0] ])
				}

				limitY = h[l -1][1]
			} else {
				limitY = minY
			}

			for(var j = 0; j < pointsY.length; j++) {
				var ay = pointsY[j][0]
				,   by = pointsY[j][1]
				,   dy = by - ay

				this.extrudeRect(geometry, ax, bx, ay, by)
				if(ax === minX) meta.edgeL += dy
				if(bx === maxX) meta.edgeR += dy
				if(ay === minY) meta.edgeD += dx
				if(by === maxY) meta.edgeU += dx
				meta.area += dx * (by - ay)
			}

			var ay = limitY
			,   ly = pointsT[i]
			,   ry = pointsT[i+1]

			if(ay - Geo.EPS > ly
			&& ay - Geo.EPS > ry) continue

			ay = Math.min(ay, ly, ry)

			if(ly === ry) {
				var dy = ry - ay

				this.extrudeRect(geometry, ax, bx, ay, ry)
				if(ry === maxY) meta.edgeU += dx
				meta.area += dx * dy

			} else {
				this.extrudeTrapeze(geometry, ax, bx, ay, ly, ry)

				var dy = Math.abs(ry - ly)
				meta.edgeU += Math.sqrt(dy * dy + dx * dx)
				meta.area += (dx * dy) / 2 + dx * (Math.min(ly, ry) - ay)
			}

			if(ax === minX) meta.edgeL += ly - ay
			if(bx === maxX) meta.edgeR += ry - ay
			if(ay === minY) meta.edgeD += dx
		}

		return meta
	},

	extrudeWallStripe: function(geometry, horizontal, box, wall, holes) {
		var meta = {
			connectedW: 0,
			connectedH: 0
		}

		if(!box.emptyEPS()) {

			if(wall instanceof ANode.Slope) {
				if(wall.obvGable.read()) {
					var contour = wall.obvPlaneContour.read()
					,   points = this.cutPlaneContour(box, contour)

					if(points.length > 1) {
						meta = this.extrudeHoleyContour(geometry, box.min.y, points, holes)
					}
				}

			} else {
				meta = this.extrudeHoleyRect(geometry, box.min.x, box.max.x, box.min.y, box.max.y, holes)
			}
		}

		meta.length = horizontal ? meta.connectedW : meta.connectedH

		return meta
	},

	/**
	 *       A
	 *      / \
	 *     /   \
	 *    /     \
	 *   B-------C
	 */
	addPlaneTriangle: function(geometry, a, b, c, uvX, uvY) {
		if(!a || !b || !c) throw Error('Invalid triangle point')

		if(uvX == null) uvX = 0
		if(uvY == null) uvY = 0

		var vi = geometry.vertices.length

		var fn = new THREE.Vector3(0, 0, 1)
		,   fa = new THREE.Face3(vi +0, vi +1, vi +2, fn)

		var ua = new THREE.Vector2(a.x + uvX, a.y + uvY)
		,   ub = new THREE.Vector2(b.x + uvX, b.y + uvY)
		,   uc = new THREE.Vector2(c.x + uvX, c.y + uvY)

		var uva = [ua, ub, uc]

		geometry.vertices.push(a, b, c)
		geometry.faces.push(fa)
		geometry.faceVertexUvs[0].push(uva)
	},

	addTriangle: function(geometry, a, b, c, alpha, ky, bottom, left) {
		if(!a || !b || !c) throw Error('Invalid triangle point')

		var vi = geometry.vertices.length
		,   kx = Math.cos(alpha)
		,   kz = Math.sin(alpha)

		var uvs = [
			this.uv(a, kx, ky, kz, left, bottom),
			this.uv(b, kx, ky, kz, left, bottom),
			this.uv(c, kx, ky, kz, left, bottom) ]

		geometry.vertices.push(a, b, c)
		geometry.faces.push(new THREE.Face3(vi +0, vi +1, vi +2))
		geometry.faceVertexUvs[0].push(uvs)
	},

	uv: function(point, kx, ky, kz, ox, oy) {
		if(kx == null) kx = 1 // Math.cos(0)
		if(ky == null) ky = 1 // Math.sin(Math.PI / 2)
		if(kz == null) kz = 0 // Math.sin(0)
		if(ox == null) ox = 0
		if(oy == null) oy = 0

		var x = ox + kx * point.x + kz * point.z
		,   y = oy + ky * point.y

		return new THREE.Vector2(x, y)
	},

	setGeometryPlaneUV: function(geometry, tx, ty, sx, sy) {
		var faces    = geometry.faces
		,   vertices = geometry.vertices
		,   uvs      = geometry.faceVertexUvs[0]

		if(tx == null) tx = 0
		if(ty == null) ty = 0
		if(sx == null) sx = 1
		if(sy == null) sy = 1

		for(var i = 0; i < faces.length; i++) {
			var f = faces[i]
			,   a = vertices[f.a]
			,   b = vertices[f.b]
			,   c = vertices[f.c]

			var uv = uvs[i]
			,   ua = uv[0]
			,   ub = uv[1]
			,   uc = uv[2]

			ua.x = a.x * sx + tx
			ua.y = a.y * sy + ty

			ub.x = b.x * sx + tx
			ub.y = b.y * sy + ty

			uc.x = c.x * sx + tx
			uc.y = c.y * sy + ty
		}

		geometry.uvsNeedUpdate = true
	},

	flipGeometryHorizontal: function(source) {
		var id = source.uuid +'/fx'

		var geometry = this.makeCachedGeometry(id, source)
		if(geometry.cachedInstances > 1) return geometry

		var matrix = new THREE.Matrix4
		matrix.elements[0] = -1

		geometry.applyMatrix(matrix)

		for(var i = 0; i < geometry.faces.length; i++) {
			var face = geometry.faces[i]

			var a = face.a
			,   b = face.b
			,   c = face.c

			face.a = a
			face.b = c
			face.c = b

			var a = face.vertexNormals[0]
			,   b = face.vertexNormals[1]
			,   c = face.vertexNormals[2]

			face.vertexNormals[0] = a
			face.vertexNormals[1] = c
			face.vertexNormals[2] = b
		}

		return geometry
	},

	trimGeometryVertical: function(source, trimHeight, trimBottom) {
		var id = source.uuid +'/'+ trimHeight + (trimBottom ? 'b' : 't')

		var geometry = this.makeCachedGeometry(id)
		if(geometry.cachedInstances > 1) return geometry


		var uv = new THREE.Vector2
		,   uvA = [uv, uv, uv]

		var i1, i2, i3

		for(var i = 0; i < source.faces.length; i++) {
			var face = source.faces[i]

			var vA = source.vertices[face.a]
			,   vB = source.vertices[face.b]
			,   vC = source.vertices[face.c]

			if(trimBottom) {
				var inA = vA.y + Geo.EPS > trimHeight
				,   inB = vB.y + Geo.EPS > trimHeight
				,   inC = vC.y + Geo.EPS > trimHeight

			} else {
				var inA = vA.y - Geo.EPS < trimHeight
				,   inB = vB.y - Geo.EPS < trimHeight
				,   inC = vC.y - Geo.EPS < trimHeight
			}


			if(!inA && !inB && !inC) {
				continue

			} else if(inA && inB && inC) {
				var ixA = Geo.pushPoint(geometry.vertices, vA)
				,   ixB = Geo.pushPoint(geometry.vertices, vB)
				,   ixC = Geo.pushPoint(geometry.vertices, vC)

				var fA = new THREE.Face3(ixA, ixB, ixC, face.normal)
				fA.vertexNormals = face.vertexNormals

				geometry.faces.push(fA)
				geometry.faceVertexUvs[0].push(uvA)
				continue

			} else if(inA && !inB && inC) {
				i1 = face.c
				i2 = face.a
				i3 = face.b

			} else if(!inA && !inB && inC) {
				i1 = face.c
				i2 = face.a
				i3 = face.b

			} else if(!inA && inB && inC) {
				i1 = face.b
				i2 = face.c
				i3 = face.a

			} else if(!inA && inB && !inC) {
				i1 = face.b
				i2 = face.c
				i3 = face.a

			} else if(inA && inB && !inC) {
				i1 = face.a
				i2 = face.b
				i3 = face.c

			} else if(inA && !inB && !inC) {
				i1 = face.a
				i2 = face.b
				i3 = face.c
			}

			var v1 = source.vertices[i1]
			,   v2 = source.vertices[i2]
			,   v3 = source.vertices[i3]


			/**
			 *  1-------2
			 *   \     /
			 * -----------
			 *     \ /
			 *      3
			 */
			if(inA + inB + inC === 2) {
				var v13 = new THREE.Vector3
				,   v23 = new THREE.Vector3

				v13.y = trimHeight
				v13.x = Geo.splitEdgeST(trimHeight, v1.y, v3.y, v1.x, v3.x)
				v13.z = Geo.splitEdgeST(trimHeight, v1.y, v3.y, v1.z, v3.z)

				v23.y = trimHeight
				v23.x = Geo.splitEdgeST(trimHeight, v2.y, v3.y, v2.x, v3.x)
				v23.z = Geo.splitEdgeST(trimHeight, v2.y, v3.y, v2.z, v3.z)

				var ix1  = Geo.pushPoint(geometry.vertices, v1)
				,   ix2  = Geo.pushPoint(geometry.vertices, v2)
				,   ix23 = Geo.pushPoint(geometry.vertices, v23)
				,   ix13 = Geo.pushPoint(geometry.vertices, v13)

				var fA = new THREE.Face3(ix1, ix2, ix23, face.normal)
				,   fB = new THREE.Face3(ix1, ix23, ix13, face.normal)

				geometry.faces.push(fA, fB)
				geometry.faceVertexUvs[0].push(uvA, uvA)

			/**
			 *      1
			 *     / \
			 * -----------
			 *   /     \
			 *  3-------2
			 */
			} else /* === 1 */ {
				var v13 = new THREE.Vector3
				,   v12 = new THREE.Vector3

				v13.y = trimHeight
				v13.x = Geo.splitEdgeST(trimHeight, v1.y, v3.y, v1.x, v3.x)
				v13.z = Geo.splitEdgeST(trimHeight, v1.y, v3.y, v1.z, v3.z)

				v12.y = trimHeight
				v12.x = Geo.splitEdgeST(trimHeight, v1.y, v2.y, v1.x, v2.x)
				v12.z = Geo.splitEdgeST(trimHeight, v1.y, v2.y, v1.z, v2.z)

				var ix1  = Geo.pushPoint(geometry.vertices, v1)
				,   ix12 = Geo.pushPoint(geometry.vertices, v12)
				,   ix13 = Geo.pushPoint(geometry.vertices, v13)

				var fA = new THREE.Face3(ix1, ix12, ix13, face.normal)

				geometry.faces.push(fA)
				geometry.faceVertexUvs[0].push(uvA)
			}
		}

		return geometry
	},

	debugPoint: function(point, fill, stroke) {
		var cvs = document.createElement('canvas')
		var ctx = cvs.getContext('2d')
		var size = cvs.width = cvs.height = 64

		ctx.lineWidth = 5
		ctx.strokeStyle = stroke || 'white'
		ctx.fillStyle = fill || 'tomato'

		ctx.beginPath()
		ctx.arc(size >> 1, size >> 1, 12, 0, 2*Math.PI)
		ctx.stroke()
		ctx.fill()

		var t = new THREE.Texture(cvs)
		t.needsUpdate = true

		var m = new THREE.SpriteMaterial({ map: t })
		,   s = new THREE.Sprite(m)

		s.scale.multiplyScalar(1/3)
		point && s.position.copy(point)

		this.addObject(s)
		return s
	},

	debugVector: function(point, vector, color) {
		var g = new THREE.Geometry
		var m = new THREE.LineBasicMaterial({
			color: color || f.rand(0xffffff),
			linewidth: 4
		})

		g.vertices.push(new THREE.Vector3, vector.clone())

		var l = new THREE.Line(g, m)
		l.position.copy(point)

		this.addObject(l)
		return l
	},

	debugLine: function(points, color, width, open) {
		var g = new THREE.Geometry
		var m = new THREE.LineBasicMaterial({
			color: color || f.rand(0xffffff),
			linewidth: width || 2
		})

		g.vertices = open ? points : points.concat(points[0])

		var l = new THREE.Line(g, m)

		this.addObject(l)
		return l
	},

	debugLabel: function(text, point, normal, fill, stroke, offset) {
		var cvs = document.createElement('canvas')
		,   ctx = cvs.getContext('2d')
		,   color = new THREE.Color

		var size = 64
		,   font = size +'px monospace'

		ctx.font = font

		var x = ctx.measureText(text).width
		,   p = 0
		,   h = size + 20
		,   w = 2 * p + x
		,   a = w / h

		cvs.width  = w
		cvs.height = h

		ctx.fillStyle = color.set(fill || 'white').getStyle()
		ctx.strokeStyle = color.set(stroke || 'black').getStyle()
		ctx.font = font
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'

		ctx.strokeText(text, w >> 1, h >> 1)
		ctx.fillText(text, w >> 1, h >> 1)

		var tSprite = new THREE.Texture(cvs)
		tSprite.needsUpdate = true
		tSprite.minFilter = THREE.LinearFilter

		var mSprite = new THREE.SpriteMaterial({ map: tSprite })
		,   oSprite = new THREE.Sprite(mSprite)

		oSprite.scale.set(a, 1, 1).multiplyScalar(1/2)

		var oWrap = new THREE.Object3D

		if(point) {
			oWrap.position.copy(point)
		}

		if(normal) {
			oSprite.position.copy(normal)
		} else {
			oSprite.position.set(0, 0, 1)
		}

		oSprite.position.setLength(offset || 0.3)

		if(point) {
			var gLine = new THREE.Geometry
			,   mLine = new THREE.LineBasicMaterial({ color: fill })
			,   oLine = new THREE.Line(gLine, mLine)

			gLine.vertices.push(new THREE.Vector3, oSprite.position)

			oWrap.add(oLine)
		}

		oWrap.add(oSprite)

		this.addObject(oWrap)
		return oWrap
	}
})

Draw3D.cache = {}


Draw3D.Layer = f.unit(Draw3D, {
	unitName: 'Draw3D_Layer',

	init: function() {
		Draw3D.prototype.init.apply(this, arguments)

		this.obvFlatsH = new Observable().set(this, this.readFlatsH)
		this.obvFlatsL = new Observable().set(this, this.readFlatsL)
		this.obvBottom = new Observable().set(this, this.readBottom)
		this.obvHeight = new Observable().set(this, this.readHeight)
		this.obvPlinth = new Observable().set(this, this.readPlinth)

		this.wrapH = new THREE.Object3D
		this.wrapL = new THREE.Object3D

		this.addObject(this.wrapH)
		this.addObject(this.wrapL)
	},

	rebuild: function() {
		this.obvFlatsH.read()
		this.obvFlatsL.read()
		this.obvBottom.read()
		this.obvHeight.read()
		this.obvPlinth.read()
	},

	createFlats: function(flats, type, wrap, prev) {
		var next = []
		for(var i = 0; i < flats.length; i++) {
			var points = flats[i]
			,   gFlat = Draw3D.Contour.prototype.flooringGeometry(points)
			,   sFlat = this.addSubnode(gFlat, type, wrap, { points: points })

			next.push(sFlat)
		}

		if(prev) prev.forEach(this.destroySubnode, this)
		return next
	},

	readFlatsH: function(prev) {
		return this.createFlats(this.node.obvFlatsHigh.read(), 'flat', this.wrapH, prev)
	},

	readFlatsL: function(prev) {
		return this.createFlats(this.node.obvFlatsLow.read(), 'floor', this.wrapL, prev)
	},

	readBottom: function() {
		return this.object.position.y = this.node.obvBottom.read()
	},

	readHeight: function() {
		return this.wrapH.position.y = this.node.obvHeight.read()
	},

	readPlinth: function() {
		return this.wrapL.position.y = -this.node.obvPlinth.read()
	}
})


Draw3D.Corner = f.unit(Draw3D, {
	unitName: 'Draw3D_Corner',

	cornerWidth: 150,
	cornerOffsetZ: 0.03,

	init: function() {
		Draw3D.prototype.init.apply(this, arguments)

		this.obvCornerFabric = new Observable().set(this, this.readCornerFabric)
		this.obvPlinthFabric = new Observable().set(this, this.readPlinthFabric)

		this.obvCornerPosition = new Observable().set(this, this.readCornerPosition)
		this.obvPlinthPosition = new Observable().set(this, this.readPlinthPosition)

		this.obvCornerSubnode = new Observable().set(this, this.readCornerSubnode)
		this.obvPlinthSubnode = new Observable().set(this, this.readPlinthSubnode)
	},

	rebuild: function() {
		this.obvCornerPosition.read()
		this.obvPlinthPosition.read()
	},


	readCornerFabric: function() {
		return main.imagery.materials.corner.obvFabric.read()
	},

	readPlinthFabric: function() {
		return main.imagery.materials.pcorner.obvFabric.read()
	},



	makeCornerPosition: function(frame, offset, y) {
		var vertex    = this.node.obvVertex.read()
		,   normal    = this.node.obvNormal.read()
		,   prevWall  = this.node.obvPrevWall.read()
		,   nextWall  = this.node.obvNextWall.read()
		,   prevAlpha = prevWall.obvAlpha.read()
		,   nextAlpha = nextWall.obvAlpha.read()

		frame.root.position.copy(normal).setLength(offset).add(vertex)
		frame.root.position.y += y
		frame.left .rotation.y = -Math.PI/2 - prevAlpha
		frame.right.rotation.y = +Math.PI/2 - nextAlpha
	},

	readCornerPosition: function() {
		var subnode = this.obvCornerSubnode.read()
		if(!subnode) return

		var fabric = this.obvCornerFabric.read()
		,   offset = fabric && fabric.sample ? this.aliasOffset : this.cornerOffsetZ

		this.makeCornerPosition(subnode.cornerFrame, offset, 0)
		return NaN
	},

	readPlinthPosition: function() {
		var subnode = this.obvPlinthSubnode.read()
		if(!subnode) return

		var fabric = this.obvPlinthFabric.read()
		,   offset = fabric && fabric.sample ? this.aliasOffset : this.cornerOffsetZ

		var contour = this.node.obvParent.read()
		this.makeCornerPosition(subnode.cornerFrame, offset, -contour.obvPlinth.read())
		return NaN
	},


	installForFabric: function(fabric) {
		var contour = this.node.obvParent.read()
		if(contour instanceof ANode.Roof) return false

		if(this.node.obvDirect.read()) return true
		if(!this.node.obvOuter.read()) return false

		return !fabric || fabric.unit === 'outer' || fabric.unit === 'fouter'
	},

	readCornerSubnode: function(prev) {
		var next = null

		var fabric = this.obvCornerFabric.read()
		if(this.installForFabric(fabric)) {
			var contour = this.node.obvParent.read()
			,   height  = contour.obvHeight.read()
			,   bottom  = contour.obvBottom.read()
			,   frame   = this.createFrame()

			this.createCorner(frame, fabric, height, bottom, 0)

			next = this.addSubnode(frame.root, 'corner', true, null, null, true)
			next.cornerFrame = frame
		}

		if(prev) this.destroySubnode(prev)
		return next
	},

	readPlinthSubnode: function(prev) {
		var next = null

		var contour = this.node.obvParent.read()
		,   plinth  = contour.obvPlinth.read()
		if(plinth) {

			var fabric = this.obvPlinthFabric.read()
			if(this.installForFabric(fabric)) {
				var frame = this.createFrame()

				this.createCorner(frame, fabric, plinth, 0, 0)

				next = this.addSubnode(frame.root, 'pcorner', true, null, null, true)
				next.cornerFrame = frame
			}
		}

		if(prev) this.destroySubnode(prev)
		return next
	},

	createFrame: function() {
		var root  = new THREE.Object3D
		,   left  = new THREE.Object3D
		,   right = new THREE.Object3D

		root.add(left)
		root.add(right)

		return { root: root, left: left, right: right }
	},

	createCorner: function(frame, fabric, height, bottom, oy) {
		return fabric && fabric.sample
			? this.cornerInstance(frame, fabric.sample, bottom - oy, height)
			: this.cornerGeometry(frame, 0, height, bottom, fabric)
	},

	cornerInstance: function(frame, sample, bottom, height) {
		var interimGeometries = []

		var size   = sample.height
		,   frDown = bottom / size % 1
		,   frUp   = (bottom + height) / size % 1

		if(frDown + Geo.EPS > 1) frDown = 0
		if(frUp   + Geo.EPS > 1) frUp   = 0

		var trimDown = Geo.round(frDown * size)
		,   trimUp   = Geo.round(frUp   * size)
		,   trimDownInv = Geo.round(size - trimDown)
		,   trimUpInv   = Geo.round(size - trimUp)
		,   trimUpFirst = trimUp && (size - trimDown > height + Geo.EPS)



		var y = -trimDown

		if(trimDown) {
			var oLeft = sample.clone()
			,   oRight = sample.clone()

			oRight.position.y = y
			oLeft.position.y = y

			if(sample.inverse) {
				oLeft.rotation.z = Math.PI
				oLeft.position.y += size
			}

			frame.right.add(oRight)
			frame.left.add(oLeft)


			y += trimUpFirst ? trimUp : size

			for(var i = 0; i < oLeft.children.length; i++) {
				var meshL = oLeft.children[i]
				,   meshR = oRight.children[i]

				meshR.geometry = this.trimGeometryVertical(meshR.geometry, trimDown, true)

				if(sample.inverse) {
					meshL.geometry = this.trimGeometryVertical(meshL.geometry, trimDownInv, false)

				} else {
					var flipX = this.flipGeometryHorizontal(meshL.geometry)
					meshL.geometry = this.trimGeometryVertical(flipX, trimDown, true)
					interimGeometries.push(flipX)
				}

				if(trimUpFirst) {
					meshR.geometry = this.trimGeometryVertical(meshR.geometry, trimUp, false)

					if(sample.inverse) {
						meshL.geometry = this.trimGeometryVertical(meshL.geometry, trimUpInv, true)

					} else {
						meshL.geometry = this.trimGeometryVertical(meshL.geometry, trimUp, false)
					}
				}
			}
		}

		while(y + size < height + Geo.EPS) {
			var oLeft  = sample.clone()
			,   oRight = sample.clone()

			oRight.position.y = y
			oLeft.position.y = y

			if(sample.inverse) {
				oLeft.rotation.z = Math.PI
				oLeft.position.y += size
			}

			frame.left.add(oLeft)
			frame.right.add(oRight)

			y += size

			for(var i = 0; i < oLeft.children.length; i++) {
				var meshL = oLeft.children[i]

				if(sample.inverse) {

				} else {
					meshL.geometry = this.flipGeometryHorizontal(meshL.geometry)
				}
			}
		}

		if(y + trimUp < height + Geo.EPS) {
			var oLeft = sample.clone()
			,   oRight = sample.clone()

			oLeft.position.y = y
			oRight.position.y = y

			if(sample.inverse) {
				oLeft.rotation.z = Math.PI
				oLeft.position.y += size
			}

			frame.right.add(oRight)
			frame.left.add(oLeft)

			y += trimUp

			for(var i = 0; i < oLeft.children.length; i++) {
				var meshL = oLeft.children[i]
				,   meshR = oRight.children[i]

				meshR.geometry = this.trimGeometryVertical(meshR.geometry, trimUp, false)

				if(sample.inverse) {
					meshL.geometry = this.trimGeometryVertical(meshL.geometry, trimUpInv, true)

				} else {
					var flipX = this.flipGeometryHorizontal(meshL.geometry)
					meshL.geometry = this.trimGeometryVertical(flipX, trimUp, false)
					interimGeometries.push(flipX)
				}
			}
		}

		for(var i = 0; i < interimGeometries.length; i++) {
			this.destroyGeometry(interimGeometries[i])
		}
	},

	cornerGeometry: function(frame, low, high, bottom, fabric) {
		var objectL = this.makeMesh()
		,   objectR = this.makeMesh()

		objectL.rotation.y = +Math.PI/2
		objectR.rotation.y = -Math.PI/2

		var textureWrapOffset = 0.001

		var width = (fabric.height || this.cornerWidth) / 1000
		,   scale = 1 / (width * 2 + textureWrapOffset)

		this.extrudeRect(objectL.geometry, -width, 0, low, high, 0, bottom)
		this.extrudeRect(objectR.geometry, 0,  width, low, high, 0, bottom)

		this.setGeometryPlaneUV(objectL.geometry, 0.5, 0, scale, 1)
		this.setGeometryPlaneUV(objectR.geometry, 0.5, 0, scale, 1)

		frame.left .add(objectL)
		frame.right.add(objectR)
	}
})


Draw3D.Contour = f.unit(Draw3D, {
	unitName: 'Draw3D_Contour',

	init: function() {
		Draw3D.prototype.init.apply(this, arguments)

		this.obvBaseGeometry  = new Observable().set(this, this.readBaseGeometry)
		this.obvBaseSubnodeH  = new Observable().set(this, this.readBaseSubnode)
		this.obvBaseSubnodeL  = new Observable().set(this, this.readBaseSubnode)
		this.obvBaseSubnodeP  = new Observable().set(this, this.readBaseSubnodeP)
		this.obvPlinthSubnode = new Observable().set(this, this.readPlinthSubnode)
		this.obvBasePositionH = new Observable().set(this, this.readBasePositionH)
	},

	rebuild: function() {
		// this.obvBaseSubnodeH.read()
		// this.obvBaseSubnodeL.read()
		// this.obvBaseSubnodeP.read()
		// this.obvBasePositionH.read()
		this.obvPlinthSubnode.read()
	},

	readBaseGeometry: function() {
		var vertices  = this.node.obvVertices.read()
		,   triangles = this.node.obvTriangles.read()

		return this.flooringGeometry(vertices, triangles)
	},

	readBaseSubnode: function(prev) {
		var gBase = this.obvBaseGeometry.read()

		if(prev) this.destroySubnode(prev)
		return this.addSubnode(gBase, 'floor', true)
	},

	readBaseSubnodeP: function(prev) {
		var next = null

		var plinth = this.node.obvPlinth.read()
		if(plinth) {
			var gBase = this.obvBaseGeometry.read()

			next = this.addSubnode(gBase, 'floor', true)
			next.object.position.y = -plinth
		}

		if(prev) this.destroySubnode(prev)
		return next
	},

	readPlinthSubnode: function(prev) {
		var next = null

		var plinth = this.node.obvPlinth.read()
		if(plinth) {
			var vertices = this.node.obvVertices.read()
			,   gPlinth = this.contourGeometry(vertices, -plinth, 0)

			next = this.addSubnode(gPlinth, 'plinth', true)
		}

		if(prev) this.destroySubnode(prev)
		return next
	},

	readBasePositionH: function() {
		var sBaseH = this.obvBaseSubnodeH.read()
		if(!sBaseH) return null

		var height = this.node.obvHeight.read()
		return sBaseH.object.position.y = height - this.aliasOffset
	},

	contourGeometry: function(points, low, high, bottom) {
		var geometry = this.makeGeometry()

		for(var i = 0, l = points.length; i < l; i++) {
			var j = (i + 1) % l

			this.extrudeLine(geometry, points[i], points[j], low, high, bottom)
		}

		geometry.computeFaceNormals()
		return geometry
	},

	flooringGeometry: function(points, triangles) {
		var geometry  = this.makeGeometry()
		,   normal    = new THREE.Vector3(0, -1, 0)
		,   vertices2 = []

		if(!triangles) triangles = Geo.triangulate(points)

		for(var i = 0; i < points.length; i++) {
			var p = points[i]

			vertices2.push(new THREE.Vector2(p.x, p.z))
		}

		for(var i = 0; i < triangles.length; i++) {
			var a = triangles[i][0]
			,   b = triangles[i][1]
			,   c = triangles[i][2]

			var face = new THREE.Face3(a, b, c, normal)
			,   uvs  = [ vertices2[a], vertices2[b], vertices2[c] ]

			geometry.faces.push(face)
			geometry.faceVertexUvs[0].push(uvs)
		}

		geometry.vertices = points
		// geometry.computeFaceNormals()
		return geometry
	}
})


Draw3D.Wall = f.unit(Draw3D, {
	unitName: 'Draw3D_Wall',

	init: function() {
		Draw3D.prototype.init.apply(this, arguments)

		this.obvWrap         = new Observable().set(this, this.readWrap)
		this.obvWallSubnodes = new Observable().set(this, this.readWallSubnodes)
		this.obvDebug        = new Observable().set(this, this.readDebug)

		this.wrap = new THREE.Object3D
		this.addObject(this.wrap)
	},

	rebuild: function() {
		this.obvWrap.read()
		this.obvWallSubnodes.read()
		this.obvDebug.read()
	},

	readWrap: function() {
		var start = this.node.obvPrevVertex.read()
		,   alpha = this.node.obvAlpha.read()

		this.wrap.position.copy(start)
		this.wrap.rotation.y = -alpha

		return NaN
	},

	readWallSubnodes: function(prev) {
		var bottom = this.node.obvBottom.read()
		,   left   = this.node.obvPmin.read()
		,   holes  = this.node.obvHoleBoxes.read()
		,   plid   = this.node.obvPlid.read()
		,   wbox   = this.node.obvWbox.read()
		,   page   = this.node.obvPage.read()
		,   pieces = page.obvPieces.read()

		var boxes = []
		,   targets = []
		for(var i = 0; i < pieces.length; i++) {
			var piece = pieces[i]

			boxes.push(piece.obvBox.read())
			targets.push(piece.obvAncestors.read())
		}

		var next = []
		,   ibox = new THREE.Box2
		for(var i = 0; i < boxes.length; i++) {
			var pbox = boxes[i]
			,   piece = pieces[i]

			ibox.copy(wbox).intersect(pbox)
			if(ibox.emptyEPS()) continue

			var gWall = this.makeGeometry()
			,   mWall = this.extrudeHoleyRect(gWall, ibox.min.x, ibox.max.x, ibox.min.y, ibox.max.y, holes)
			if(!gWall.vertices.length) continue

			var sWall = this.addSubnode(gWall, 'wall', this.wrap, mWall, targets[i])

			mWall.hasL = ibox.min.x === pbox.min.x
			mWall.hasR = ibox.max.x === pbox.max.x
			mWall.hasD = ibox.min.y === pbox.min.y
			mWall.hasU = ibox.max.y === pbox.max.y
			mWall.material = piece.material
			mWall.plid = plid

			sWall.object.position.x -= left
			sWall.object.position.y -= bottom
			sWall.object.material = piece.material

			next.push(sWall)
		}

		if(prev) prev.forEach(this.destroySubnode, this)
		return next
	},

	readDebug: function(prev) {
		if(prev) this.destroyObject(prev, true)

		if(!main.obvDebug.read()) return

		var index  = this.node.obvMountIndex.read()
		,   center = this.node.obvCenter.read()
		,   normal = this.node.obvNormal.read()

		return this.debugLabel('w'+ index, center, normal, 'skyblue')
	}
})


Draw3D.Roof = f.unit(Draw3D.Contour, {
	unitName: 'Draw3D_Roof',

	init: function() {
		Draw3D.prototype.init.apply(this, arguments)

		this.obvGround        = new Observable().set(this, this.readGround)
		this.obvBaseSubnode   = new Observable().set(this, this.readBaseSubnode)
		this.obvBreakSubnodes = new Observable().set(this, this.readBreakSubnodes)
		this.obvDebug         = new Observable().set(this, this.readDebug)
	},

	rebuild: function() {
		this.obvGround.read()
		// this.obvBaseSubnode.read()
		this.obvBreakSubnodes.read()
		this.obvDebug.read()
	},

	readGround: function() {
		return this.object.position.y = this.node.obvGround.read()
	},

	readBaseSubnode: function(prev) {
		var vertices  = this.node.obvVertices.read()
		,   triangles = this.node.obvTriangles.read()

		var gBase = this.flooringGeometry(vertices, triangles)
		,   sBase = this.addSubnode(gBase, 'floor', true)

		if(prev) this.destroySubnode(prev)
		return sBase
	},

	readBreakSubnodes: function(prev) {
		var breaks = this.node.obvBreaks.read()

		var next = []
		for(var i = 0; i < breaks.length; i++) {
			var slice  = breaks[i]
			,   dBreak = { points: slice.points, roof: this.node }
			,   gBreak = this.flooringGeometry(slice.points)
			,   sBreak = this.addSubnode(gBreak, 'flat', true, dBreak)

			next.push(sBreak)
		}

		if(prev) prev.forEach(this.destroySubnode, this)
		return next
	},

	readDebug: function(prev) {
		if(prev) for(var i = 0; i < prev.length; i++) {
			this.destroyObject(prev[i], true)
		}

		if(!main.obvDebug.read()) return

		var plank  = this.node.obvPlank.read()
		,   slices = this.node.obvOuterSlices.read()
		,   next = []
		for(var i = 0; i < slices.length; i++) {
			var s = slices[i]

			var colr = f.rgb(f.softcolor(i / slices.length))
			,   line = this.debugLine(s.points, colr)
			,   labl = this.debugLabel('r'+ i, s.points[0], s.planes[0].normal, colr)

			line.position.y += plank
			labl.position.y += plank
			next.push(line, labl)
		}

		return next
	}
})


Draw3D.Slope = f.unit(Draw3D, {
	unitName: 'Draw3D_Slope',

	create: function() {
		if(this.node.obvGable.read()) {
			this.createGable()

		} else {
			this.createSlope()

			var roof = this.node.obvParent.read()
			if(roof.obvSoffit.read()) {
				this.createSoffit()
			}
		}

		if(main.debug) {
			var index  = this.node.obvMountIndex.read()
			,   center = this.node.obvCenter.read()
			,   normal = this.node.obvNormal.read()

			this.debugLabel('s'+ index, center, normal, 'lime')
		}
	},

	createGable: function() {
		var roof   = this.node.obvParent.read()
		,   start  = this.node.obvPrevVertex.read()
		,   alpha  = this.node.obvAlpha.read()
		,   left   = this.node.obvPmin.read()
		,   width  = this.node.obvWidth.read()
		,   holes  = this.node.obvHoleBoxes.read()
		,   plid   = this.node.obvPlid.read()
		,   bottom = roof.obvBottom.read()
		,   planeContour = this.node.obvPlaneContour.read()

		var oWrap = new THREE.Object3D
		this.node.getPlanePoint(0, oWrap.position)
		oWrap.position.y -= bottom
		oWrap.rotation.y = -alpha


		var root   = this.node.obvRoot.read()
		,   cutter = root.obvCutter.read()
		,   page   = cutter.getPage(plid)
		,   pieces = page.obvPieces.read()
		,   wbox   = this.node.obvWbox.read()
		,   ibox   = new THREE.Box2
		for(var i = 0; i < pieces.length; i++) {
			var piece = pieces[i]
			var pbox = piece.obvBox.read()

			ibox.copy(piece.obvBox.read()).intersect(wbox)
			if(ibox.emptyEPS()) continue

			var points = this.cutPlaneContour(ibox, planeContour)
			if(points.length <2) continue

			var gGable = this.makeGeometry()
			,   mGable = this.extrudeHoleyContour(gGable, ibox.min.y, points, holes)
			if(!gGable.vertices.length) continue

			var sGable = this.addSubnode(gGable, 'wall', oWrap, mGable, piece.obvAncestors.read())

			mGable.hasL = ibox.min.x === pbox.min.x
			mGable.hasR = ibox.max.x === pbox.max.x
			mGable.hasD = ibox.min.y === pbox.min.y
			mGable.hasU = ibox.max.y === pbox.max.y
			mGable.material = piece.material
			mGable.plid = plid

			sGable.object.material = piece.material
		}

		this.addObject(oWrap)
	},

	createSlope: function() {
		var roof    = this.node.obvParent.read()
		,   plank   = roof.obvPlank.read()
		,   bottom  = roof.obvBottom.read()
		,   contour = this.node.obvOuterContour.read()

		var gSlope  = this.slopeGeometry()
		,   gPlank  = Draw3D.Contour.prototype.contourGeometry(contour, 0, plank, bottom)
		,   sSlopeH = this.addSubnode(gSlope, 'slope', true)
		,   sSlopeL = this.addSubnode(gSlope, 'slope', true)
		,   sPlank  = this.addSubnode(gPlank, 'slope', true)

		sSlopeH.object.position.y += plank
	},

	createSoffit: function() {
		var roof    = this.node.obvParent.read()
		,   bottom  = roof.obvBottom.read()
		,   alpha   = this.node.obvAlpha.read()
		,   line    = this.node.obvLine.read()
		,   ledge   = this.node.obvLedgeLine.read()

		var gSoffit = this.soffitGeometry(line, ledge, ledge.start.y, alpha, bottom)
		,   sSoffit = this.addSubnode(gSoffit, 'soffit', true)
	},

	soffitGeometry: function(near, far, h, alpha, bottom) {
		var geometry = this.makeGeometry()

		var a = new THREE.Vector3
		,   b = new THREE.Vector3
		,   c = new THREE.Vector3
		,   d = new THREE.Vector3

		a.copy(near.start).setY(h)
		b.copy(near.end  ).setY(h)
		c.copy(far.start ).setY(h)
		d.copy(far.end   ).setY(h)

		this.addTriangle(geometry, c, a, d, alpha, 1, bottom)
		this.addTriangle(geometry, a, b, d, alpha, 1, bottom)

		geometry.computeFaceNormals()
		return geometry
	},

	slopeGeometry: function() {
		var roof   = this.node.obvParent.read()
		,   alpha  = this.node.obvAlpha.read()
		,   climb  = this.node.obvClimb.read()
		,   plank  = roof.obvPlank.read()
		,   ledge  = roof.obvLedge.read()
		,   bottom = roof.obvBottom.read()

		var ky = 1 / climb.y
		,   oy = bottom + (ky - 1) * ledge + plank

		var geometry = this.makeGeometry()

		var sections = this.node.obvSections.read()
		for(var i = 0; i < sections.length; i++) {
			var section = sections[i]

			var a = section.lowLeft
			,   b = section.lowRight
			,   c = section.highLeft
			,   d = section.highRight

			if(c === d) {
				this.addTriangle(geometry, a, b, c, alpha, ky, oy)

			} else {
				this.addTriangle(geometry, a, b, c, alpha, ky, oy)
				this.addTriangle(geometry, d, c, b, alpha, ky, oy)
			}
		}

		geometry.computeFaceNormals()
		return geometry
	}
})


Draw3D.Drain = f.unit(Draw3D, {
	unitName: 'Draw3D_Drain',
	drainTop: 0.13,

	create: function() {
		var roof    = this.node.obvParent.read()
		,   corners = roof.obvPoints.read()
		,   slopes  = roof.obvWalls.read()

		for(var i = 0; i < corners.length; i++) {
			var corner = corners[i]

			var prev = corner.obvPrevWall.read()
			,   next = corner.obvNextWall.read()

			var prevGable = prev.obvGable.read()
			,   nextGable = next.obvGable.read()

			if(prevGable && nextGable) {
				// move along
			} else if(prevGable) {
				this.createFlumeEnd(corner, next, next.obvLedgeLine.read().start)
			} else if(nextGable) {
				this.createFlumeEnd(corner, prev, prev.obvLedgeLine.read().end)
			} else {
				this.createDrainElbow(corner)
			}
		}

		for(var i = 0; i < slopes.length; i++) {
			var slope = slopes[i]

			if(!slope.obvGable.read()) this.createFlume(slope)
		}
	},

	createFlume: function(slope) {
		var xFlume = main.sampler.samples.flume

		var ledgeWidth = slope.obvLedgeWidth.read()
		,   ledgeLine  = slope.obvLedgeLine.read()
		,   alpha      = slope.obvAlpha.read()


		var oDrain = new THREE.Object3D
		oDrain.position.copy(ledgeLine.start)
		oDrain.position.y -= this.drainTop
		oDrain.rotation.y -= alpha

		this.addObject(oDrain)

		var prevNode = slope.obvPrevNode.read()
		,   nextNode = slope.obvNextNode.read()
		,   prevGable = prevNode.obvGable.read()
		,   nextGable = nextNode.obvGable.read()

		var prevPoint = slope.obvPrevPoint.read()
		,   nextPoint = slope.obvNextPoint.read()
		,   prevBeta  = Math.abs(prevPoint.obvBeta.read())
		,   nextBeta  = Math.abs(nextPoint.obvBeta.read())

		var fwidth = xFlume.width
		,   prevOffset = prevGable ? 0 : fwidth / 2 * Math.tan(prevBeta / 2)
		,   nextOffset = nextGable ? 0 : fwidth / 2 * Math.tan(nextBeta / 2)
		,   size = ledgeWidth - prevOffset - nextOffset

		var oFlume = xFlume.bake({ depth: size })
		oFlume.position.x = prevOffset
		oFlume.rotation.y = Math.PI / 2

		this.addSubnode(oFlume, 'flume', oDrain, {
			length: size

		}, { slope: slope })
	},

	createFlumeEnd: function(corner, wall, point) {
		var xEnd = main.sampler.samples.flume_end
		,   oEnd = xEnd.bake()

		oEnd.position.copy(point)
		oEnd.position.y -= this.drainTop + this.aliasOffset
		oEnd.rotation.y = -wall.obvAlpha.read() + Math.PI/2

		this.addSubnode(oEnd, 'drain', true)
	},

	createDrainElbow: function(corner) {
		var xFlelb = main.sampler.samples.flume_elbow
		,   xFlume = main.sampler.samples.flume

		var wall   = corner.obvPrevWall.read()
		,   normal = corner.obvNormal.read()
		,   outer  = corner.obvOuter.read()
		,   beta   = corner.obvBeta.read()

		var alpha     = wall.obvAlpha.read()
		,   ledgeLine = wall.obvLedgeLine.read()

		var bend  = f.torad(xFlelb.bend)
		,   width = xFlelb.width
		,   flw   = xFlume.width / 2
		,   absb  = Math.abs(beta)
		,   times = Math.ceil(absb / bend)
		,   delta = times * bend - absb

		var oWrap = new THREE.Object3D


		oWrap.position.copy(normal)
		oWrap.position.multiplyScalar(-flw / Math.cos(absb / 2) - this.aliasOffset)
		oWrap.rotation.y = bend / 2 - delta / 2 - alpha + Math.PI/2

		if(!outer) {
			oWrap.position.negate()
			oWrap.rotation.y += Math.PI + beta
		}
		oWrap.position.add(ledgeLine.end)
		oWrap.position.y -= this.drainTop + this.aliasOffset
		oWrap.scale.multiplyScalar(1.03)

		for(var i = 0; i < times; i++) {
			var oElbow = xFlelb.bake()

			var gamma = i * bend
			oElbow.position.x -= Math.cos(gamma) * width / 2
			oElbow.position.z += Math.sin(gamma) * width / 2
			oElbow.rotation.y += gamma

			this.addSubnode(oElbow, 'drain', oWrap)
		}

		this.addObject(oWrap)
	}
})


Draw3D.DrainPipe = f.unit(Draw3D, {
	unitName: 'Draw3D_DrainPipe',

	init: function() {
		Draw3D.prototype.init.apply(this, arguments)

		this.obvPosition = new Observable().set(this, this.readPosition)
		this.obvRotation = new Observable().set(this, this.readRotation)

		this.obvPipeVisible  = new Observable().set(this, this.readPipeVisible)
		this.obvPipeStub     = new Observable().set(this, this.readPipeStub)
		this.obvPipeSubnode  = new Observable().set(this, this.readPipeSubnode)
		this.obvPipePosition = new Observable().set(this, this.readPipePosition)
	},

	rebuild: function() {
		this.obvPosition.read()
		this.obvRotation.read()
		this.obvPipeSubnode.read()
		this.obvPipePosition.read()
	},

	readPosition: function() {
		var slope = this.node.obvSlope.read()
		,   gable = slope.obvGable.read()

		if(!gable) {
			var line = slope.obvLedgeLine.read()

			this.object.position.copy(line.start)
			this.object.position.y -= Draw3D.Drain.prototype.drainTop
		}

		return NaN
	},

	readRotation: function() {
		var slope = this.node.obvSlope.read()
		,   alpha = slope.obvAlpha.read()

		return this.object.rotation.y = -alpha
	},

	readPipePosition: function() {
		var sPipe = this.obvPipeSubnode.read()
		if(!sPipe) return null

		var fract = this.node.obvFract.read()
		,   slope = this.node.obvSlope.read()
		,   width = slope.obvLedgeWidth.read()

		return sPipe.object.position.x = fract * width
	},

	readPipeVisible: function() {
		var slope = this.node.obvSlope.read()
		,   visible = slope && !slope.obvGable.read()
		,   pipe = this.obvPipeStub.read()

		pipe.oWrap.visible = visible

		return visible
	},

	readPipeStub: function(prev) {
		// ensures read occurs again if object got destroyed somehow
		var drain = this.node.obvParent.read()

		var p1 = Math.PI
		,   p2 = Math.PI / 2

		var xPipe   = main.sampler.samples.pipe
		,   xPiend  = main.sampler.samples.pipe_end
		,   xPielb  = main.sampler.samples.elbow
		,   xFunnel = main.sampler.samples.funnel

		var pipe = {}

		pipe.oFunn = xFunnel.bake()
		pipe.oElbh = xPielb.bake()
		pipe.oPiph = xPipe.bake()
		pipe.oElbl = xPielb.bake()
		pipe.oPipl = xPipe.bake()
		pipe.oPend = xPiend.bake()

		pipe.oFunn.rotation.y = p2
		pipe.oElbh.rotation.y = -p2
		pipe.oElbl.rotation.x = p1
		pipe.oElbl.rotation.y = -p2
		pipe.oPipl.rotation.x = p1
		pipe.oPend.rotation.y = p2

		pipe.oWrap = new THREE.Object3D
		pipe.oWrap.add(pipe.oFunn)
		pipe.oWrap.add(pipe.oElbh)
		pipe.oWrap.add(pipe.oPiph)
		pipe.oWrap.add(pipe.oElbl)
		pipe.oWrap.add(pipe.oPipl)
		pipe.oWrap.add(pipe.oPend)

		return pipe
	},

	readPipeSubnode: function(prev) {
		if(!this.obvPipeVisible.read()) {
			if(prev) this.remSubnode(prev)
			return null
		}

		var slope   = this.node.obvSlope.read()
		,   roof    = slope.obvParent.read()
		,   loffset = slope.obvLedgeOffset.read()
		,   ledge   = roof.obvLedge.read()
		,   bottom  = roof.obvBottom.read()
		,   pipe    = this.obvPipeStub.read()

		var xPipe   = main.sampler.samples.pipe
		,   xPiend  = main.sampler.samples.pipe_end
		,   xPielb  = main.sampler.samples.elbow
		,   xFunnel = main.sampler.samples.funnel

		var dtop = Draw3D.Drain.prototype.drainTop
		,   bend = f.torad(xPielb.bend)
		,   fdy  = xFunnel.deltaY
		,   pw   = xPipe.width
		,   eh   = xPielb.height
		,   edx  = xPielb.deltaX
		,   edy  = xPielb.deltaY
		,   ecy  = xPielb.centerY

		,   esh  = edy - ecy
		,   esl  = esh / Math.sin(bend)

		,   zwid = loffset - pw
		,   ywid = zwid / Math.tan(bend)
		,   swid = zwid / Math.cos(bend)


		var yfunn = 0
		,   yelbh = yfunn - fdy
		,   ypiph = yelbh - ecy
		,   hpiph = swid - esl * 2
		,   yelbl = ypiph - ywid
		,   ypipl = yelbl - ecy
		,   hpipl = bottom + ypipl - ledge - dtop - eh
		,   ypend = ypipl - hpipl

		xPipe.mold(pipe.oPiph, { height: hpiph })
		xPipe.mold(pipe.oPipl, { height: hpipl })

		pipe.oFunn.position.y = yfunn
		pipe.oElbh.position.y = yelbh
		pipe.oPiph.position.y = ypiph - esh
		pipe.oPiph.position.z = -edx
		pipe.oPiph.rotation.x = Math.PI + bend
		pipe.oElbl.position.y = yelbl - ecy
		pipe.oElbl.position.z = -zwid
		pipe.oPipl.position.y = ypipl
		pipe.oPipl.position.z = -zwid
		pipe.oPend.position.y = ypend
		pipe.oPend.position.z = -zwid

		if(prev) this.remSubnode(prev)
		return this.addSubnode(pipe.oWrap, 'pipe', true, { length: hpiph + hpipl })
	}
})


Draw3D.Hole = f.unit(Draw3D, {
	unitName: 'Draw3D_Hole',

	init: function() {
		Draw3D.prototype.init.apply(this, arguments)

		this.wrap = new THREE.Object3D
		this.object.add(this.wrap)

		this.obvDebug    = new Observable().set(this, this.readDebug)
		this.obvPosition = new Observable().set(this, this.readPosition)
		this.obvOffset   = new Observable().set(this, this.readOffset)

		this.obvChunks     = new Observable().set(this, this.readChunks)
		this.obvHoleChunks = new Observable([])
		this.obvWallChunks = new Observable([])

		this.obvHoleSubs = new Observable().set(this, this.readHoleSubs)
		this.obvWallSubs = new Observable().set(this, this.readWallSubs)
	},

	rebuild: function() {
		this.obvChunks.read()

		this.obvHoleSubs.read()
		this.obvWallSubs.read()

		this.obvPosition.read()
		this.obvOffset.read()

		this.obvDebug.read()
	},

	readPosition: function() {
		var start  = this.node.obvMinPoint.read()
		,   low    = this.node.obvLow.read()
		,   wall   = this.node.obvParent.read()
		,   alpha  = wall.obvAlpha.read()
		,   bottom = wall.obvBottom.read()
		,   left   = wall.getPlanePos(start)
		,   subs   = this.obvHoleSubs.read()

		var oy = low || this.aliasOffset
		for(var i = 0; i < subs.length; i++) {
			// this.setGeometryPlaneUV(subs[i].object, left, bottom + oy)
		}

		this.object.position.copy(start)
		this.object.position.y += oy
		this.object.rotation.y = -alpha

		return NaN
	},

	readOffset: function() {
		var valid = this.node.obvValid.read()
		,   blank = this.node.obvBlank.read()

		var z = 0
		if(!valid || blank) {
			z = 0.2 + this.node.obvMountIndex.read() * this.aliasOffset
		}

		return this.wrap.position.z = z
	},

	readChunks: function(prev) {
		var width  = this.node.obvWidth.read()
		,   height = this.node.obvHeight.read()
		,   sample = this.node.obvSample.read()

		var nextChunks = []
		,   holeChunks = []
		,   wallChunks = []
		if(sample && sample.configured) {
			var object = sample.bake({ width: width, height: height })

			for(var i = 0; i < object.children.length; i++) {
				var mesh = object.children[i]

				nextChunks.push(mesh)
				if(mesh.name === 'wall') {
					wallChunks.push(mesh)
				} else {
					holeChunks.push(mesh)
				}
			}

		} else {
			var type  = this.node.obvSampleType.read()
			,   mHole = this.makeMesh()

			mHole.name = type === 'window' ? 'glass' : 'door'

			this.extrudeRect(mHole.geometry, 0, width, 0, height, 0, 0)

			nextChunks.push(mHole)
			holeChunks.push(mHole)
		}

		if(prev) for(var i = 0; i < prev.length; i++) {
			this.destroyObject(prev[i], true)
		}

		this.obvHoleChunks.write(holeChunks)
		this.obvWallChunks.write(wallChunks)
		return nextChunks
	},

	readHoleSubs: function(prev) {
		var chunks = this.obvHoleChunks.read()
		,   material = this.node.obvMaterial.read()
		,   applicable = ['door', 'framing']

		var wall = this.node.obvParent.read()

		var next = []
		for(var i = 0; i < chunks.length; i++) {
			var mesh = chunks[i]
			,   subnode = this.addSubnode(mesh, 'hole', this.wrap)

			if(material && applicable.indexOf(mesh.name) !== -1) {
				mesh.material = material
			}

			next.push(subnode)
		}

		if(prev) prev.forEach(this.remSubnode, this)
		return next
	},

	readWallSubs: function(prev) {
		var valid = this.node.obvValid.read()
		,   blank = this.node.obvBlank.read()
		,   chunks = this.obvWallChunks.read()

		var next = []
		if(valid && !blank && chunks.length) {
			var wall   = this.node.obvParent.read()
			,   low    = this.node.obvLow.read()
			,   root   = this.node.obvRoot.read()
			,   start  = this.node.obvMinPoint.read()
			,   bottom = wall.obvBottom.read() + low
			,   plid   = wall.obvPlid.read()
			,   left   = wall.getPlanePos(start)
			,   page   = root.getCutpage(plid)
			,   pieces = page.obvPieces.read()
			,   chunks = this.obvWallChunks.read()

			var boxes = []
			,   tiles = []
			for(var i = 0; i < pieces.length; i++) {
				boxes.push(pieces[i].obvBox.read())
				tiles.push(pieces[i].obvTile.read())
			}

			var big  = 1e8
			,   min  = new THREE.Vector2
			,   max  = new THREE.Vector2
			for(var i = 0; i < pieces.length; i++) {
				var piece = pieces[i]
				,   box = boxes[i]

				min.x = isFinite(box.min.x) ? box.min.x - left   : -big
				min.y = isFinite(box.min.y) ? box.min.y - bottom : -big
				max.x = isFinite(box.max.x) ? box.max.x - left   :  big
				max.y = isFinite(box.max.y) ? box.max.y - bottom :  big

				this.createWallPiece(chunks, piece, min, max, left, bottom, next)
			}
		}

		if(prev) prev.forEach(this.destroySubnode, this)
		return next
	},

	createWallPiece: function(chunks, piece, min, max, left, bottom, wallSubnodes) {
		var gWall = this.makeGeometry()
		,   gHcut = this.makeGeometry()
		,   gVcut = this.makeGeometry()

		var hcut  = piece.obvDCut.read()
		,   vcut  = piece.obvLCut.read()
		,   fsize = Draw3D.Cut.prototype.thickness / 2

		var delta = new THREE.Vector3

		for(var i = 0; i < chunks.length; i++) {
			var mesh = chunks[i]
			,   vertices = mesh.geometry.vertices
			,   faces = mesh.geometry.faces

			for(var j = 0; j < faces.length; j++) {
				var face = faces[j]

				var vA = vertices[face.a]
				,   vB = vertices[face.b]
				,   vC = vertices[face.c]

				var area = Geo.areaOfST([vA, vB, vC], null, 'xy')
				if(Math.abs(area) < Geo.EPS) continue

				var xA = Geo.pointInRectXY(vA, min, max)
				,   xB = Geo.pointInRectXY(vB, min, max)
				,   xC = Geo.pointInRectXY(vC, min, max)

				if(xA && xB && xC) {
					this.addPlaneTriangle(gWall, vA, vB, vC, left, bottom)

				} else {
					var vBL = new THREE.Vector3(min.x, 0, min.y)
					,   vBR = new THREE.Vector3(max.x, 0, min.y)
					,   vTL = new THREE.Vector3(min.x, 0, max.y)
					,   vTR = new THREE.Vector3(max.x, 0, max.y)

					var vA3 = new THREE.Vector3(vA.x, 0, vA.y)
					,   vB3 = new THREE.Vector3(vB.x, 0, vB.y)
					,   vC3 = new THREE.Vector3(vC.x, 0, vC.y)

					var rect   = [vBL, vTL, vTR, vBR]
					,   tri    = [vA3, vC3, vB3]

					var points = Geo.intersectTwoConvex(rect, tri)
					if(!points) continue

					for(var k = 0; k < points.length; k++) {
						var v = points[k]

						v.set(v.x, v.z, 0)
					}

					for(var k = 0; k < points.length; k++) {
						var l = (k +1) % points.length

						var a = points[k]
						,   b = points[l]

						delta.subVectors(b, a)

						if(hcut && Math.abs(delta.y) < Geo.EPS && Math.abs(a.y - min.y) < Geo.EPS) {
							var minX = Math.min(a.x, b.x)
							,   maxX = Math.max(a.x, b.x)

							this.extrudeRect(gHcut, minX, maxX, min.y - fsize, min.y + fsize, left, bottom)
						}

						if(vcut && Math.abs(delta.x) < Geo.EPS && Math.abs(a.x - min.x) < Geo.EPS) {
							var minY = Math.min(a.y, b.y)
							,   maxY = Math.max(a.y, b.y)

							this.extrudeRect(gVcut, min.x - fsize, min.x + fsize, minY, maxY, left, bottom)
						}
					}

					var vA = points[0]
					for(var k = 1; k < points.length -1; k++) {
						var vB = points[k]
						,   vC = points[k+1]

						this.addPlaneTriangle(gWall, vA, vC, vB, left, bottom)
					}
				}
			}
		}

		if(0&& gHcut.vertices.length) {
			var sHcut = this.addSubnode(gHcut, 'cut', true)

			sHcut.object.position.z = Draw3D.Cut.prototype.cutOffsetZ
			wallSubnodes.push(sHcut)
		}

		if(0&& gVcut.vertices.length) {
			var sVcut = this.addSubnode(gVcut, 'cut', true)

			sVcut.object.position.z = Draw3D.Cut.prototype.cutOffsetZ
			wallSubnodes.push(sVcut)
		}

		if(gWall.vertices.length) {
			var targets = f.merge(piece.obvAncestors.read(), { hole: null })

			var sWall = this.addSubnode(gWall, 'wall', true, null, targets)

			sWall.object.material = piece.material

			wallSubnodes.push(sWall)
		}
	},

	readDebug: function(prev) {
		var next = null
		if(main.obvDebug.read()) {
			var index  = this.node.obvMountIndex.read()
			,   width  = this.node.obvWidth.read()
			,   height = this.node.obvHeight.read()
			,   point  = new THREE.Vector3(width/2, height/2, 0)

			next = this.debugLabel('h'+ index, point, null, 'white')
		}

		if(prev) this.destroyObject(prev, true)
		return next
	}
})


Draw3D.Cutpage = f.unit(Draw3D, {
	unitName: 'Draw3D_Cutpage',

	create: function() {
		this.node.obvTiles.read()

		var wall0 = this.node.obvWall0.read()
		if(!wall0) return

		wall0.getPlanePoint(0, this.object.position)
		this.object.rotation.y = -wall0.obvAlpha.read()


		var hcuts = this.node.obvHCuts.read()
		,   vcuts = this.node.obvVCuts.read()
		,   walls = this.node.obvWalls.read()

		var cbox = new THREE.Box2
		,   ibox = new THREE.Box2

		/**
		 *      vcut0     vcut1
		 *
		 *          |         |
		 *      vseg2     vseg2
		 *          |         |
		 * --hseg0--o--hseg1--o--hseg2-- hcut1
		 *          |         |
		 *      vseg1     vseg1
		 *          |         |
		 * --hseg0--o--hseg1--o--hseg2-- hcut0
		 *          |         |
		 *      vseg0     vseg0
		 *          |         |
		 */
		for(var i = 0; i < hcuts.length; i++) {
			var hcut  = hcuts[i]
			,   hpos  = hcut.obvPos.read()
			,   hsegs = hcut.obvSegments.read()

			for(var j = 0; j < vcuts.length; j++) {
				var vcut  = vcuts[j]
				,   vpos  = vcut.obvPos.read()
				,   vsegs = vcut.obvSegments.read()

				var lseg = hsegs[j]
				,   rseg = hsegs[j+1]
				,   dseg = vsegs[i]
				,   useg = vsegs[i+1]

				var hasL = lseg.obvInstall.read()
				,   hasR = rseg.obvInstall.read()
				,   hasD = dseg.obvInstall.read()
				,   hasU = useg.obvInstall.read()

				var segment =
					hasL ? lseg :
					hasR ? rseg :
					hasD ? dseg :
					hasU ? useg : null

				if(!segment) continue

				var fabric = segment.material.obvFabric.read()
				,   half = (fabric.height || main.imagery.baseMaps.join.height) / 1000 / 2

				var seg_ancestors = segment.obvAncestors.read()

				var horizontal = segment === lseg || segment === rseg

				cbox.min.x = vpos - half
				cbox.max.x = vpos + half
				cbox.min.y = hpos - half
				cbox.max.y = hpos + half

				for(var k = 0; k < walls.length; k++) {
					var wall = walls[k]

					ibox.copy(wall.obvWbox.read()).intersect(cbox)
					if(ibox.emptyEPS()) continue

					var gSeg = this.makeGeometry()
					,   mSeg = this.extrudeWallStripe(gSeg, false, ibox, wall, wall.obvHoleBoxes.read())

					if(gSeg.vertices.length) {
						var targets = f.merge(wall.obvAncestors.read(), seg_ancestors)
						var sSeg = this.addSubnode(gSeg, 'join', true, mSeg, targets)

						mSeg.material = segment.material

						sSeg.object.position.z += Draw3D.Cutsegment.prototype.segmentOffsetZ
						sSeg.object.material = segment.material
					}
				}
			}
		}
	}
})


Draw3D.Cut = f.unit(Draw3D, {
	unitName: 'Draw3D_Cut',
	thickness: 0.1,
	cutOffsetZ: 0.05,

	init: function() {
		Draw3D.prototype.init.apply(this, arguments)

		this.obvCutSubnode = new Observable().set(this, this.readCutSubnode)
		this.obvMinX       = new Observable(0)
		this.obvMinY       = new Observable(0)
		this.obvDebug      = new Observable().set(this, this.readDebug)
	},

	rebuild: function() {
		this.obvCutSubnode.read()
		this.obvDebug.read()

		this.node.obvSegments.read()
	},

	readCutSubnode: function(prev) {
		var next = null

		var horizontal = this.node instanceof ANode.HCut
		if(horizontal && this.node.obvGlobal.read()) {
			if(prev) this.destroySubnode(prev)
			return next
		}

		var master = this.node.obvMaster.read()
		,   offset = master.obvSelect.read() ? 0.056
		           : master.obvHover.read()  ? 0.053
		           :                           0.050

		var page  = this.node.obvParent.read()
		,   pos   = this.node.obvPos.read()
		,   walls = page.obvWalls.read()

		var good_walls = []
		,   good_boxes = []
		for(var i = 0; i < walls.length; i++) {
			var wall = walls[i]

			if(wall instanceof ANode.Slope && !wall.obvGable.read()) continue

			good_walls.push(wall)
			good_boxes.push(wall.obvWbox.read())
		}

		var cbox = new THREE.Box2
		,   ibox = new THREE.Box2

		var pmin = pos - this.thickness / 2
		,   pmax = pos + this.thickness / 2

		cbox.min.x =  horizontal ? -Infinity : pmin
		cbox.max.x =  horizontal ?  Infinity : pmax
		cbox.min.y = !horizontal ? -Infinity : pmin
		cbox.max.y = !horizontal ?  Infinity : pmax


		var gCut = this.makeGeometry()

		var minX = Infinity
		,   minY = Infinity
		for(var i = 0; i < good_walls.length; i++) {
			var wall = good_walls[i]

			ibox.copy(good_boxes[i])

			if(horizontal) {
				var prevPoint = wall.obvPrevPoint.read()
				,   nextPoint = wall.obvNextPoint.read()

				var prevBeta  = Math.abs(prevPoint.obvBeta.read())
				,   nextBeta  = Math.abs(nextPoint.obvBeta.read())

				var prevOuter = prevPoint.obvOuter.read()
				,   nextOuter = nextPoint.obvOuter.read()

				ibox.min.x -= offset * Math.tan(prevBeta / 2) * (prevOuter ? 1 : -1)
				ibox.max.x += offset * Math.tan(nextBeta / 2) * (nextOuter ? 1 : -1)
			}

			ibox.intersect(cbox)
			if(ibox.emptyEPS()) continue

			minX = Math.min(minX, ibox.min.x)
			minY = Math.min(minY, ibox.min.y)

			this.extrudeWallStripe(gCut, horizontal, ibox, wall)
		}

		this.obvMinX.write(minX)
		this.obvMinY.write(minY)

		if(gCut.vertices.length) {
			var targets = horizontal ? { cut: master } : null

			next = this.addSubnode(gCut, 'cut', true, null, targets)
			next.object.position.z = offset
		}

		if(prev) this.destroySubnode(prev)
		return next
	},

	readDebug: function(prev) {
		var horizontal = this.node instanceof ANode.HCut
		if(horizontal && this.node.obvGlobal.read()) return

		if(prev) this.destroyObject(prev)

		if(!main.obvDebug.read()) return null

		var index = this.node.obvMountIndex.read()
		,   minX  = this.obvMinX.read()
		,   minY  = this.obvMinY.read()

		if(!isFinite(minX) || !isFinite(minY)) {
			return
		}

		var point = new THREE.Vector3(minX, minY, 0)
		return this.debugLabel((horizontal ? 'hc' : 'vc')+ index, point, null, 'royalblue')
	}
})

Draw3D.Cutsegment = f.unit(Draw3D, {
	unitName: 'Draw3D_Cutsegment',

	segmentOffsetZ: 0.022,

	init: function() {
		Draw3D.prototype.init.apply(this, arguments)

		this.obvSubnodeList = new Observable().set(this, this.readSubnodeList)
	},

	rebuild: function() {
		this.obvSubnodeList.read()
	},

	readSubnodeList: function(prev) {
		var next = []
		if(this.node.obvInstall.read()) {
			this.createSegments(next)
		}

		if(prev) prev.forEach(this.destroySubnode, this)
		return next
	},

	createSegments: function(list) {
		var currCut = this.node.obvParent.read()
		,   prevCut = this.node.obvPrevCut.read()
		,   nextCut = this.node.obvNextCut.read()
		,   page  = currCut.obvParent.read()
		,   walls = page.obvWalls.read()

		var horizontal = currCut instanceof ANode.HCut

		var fabric = this.node.material.obvFabric.read()

		var size = (fabric && fabric.height || main.imagery.baseMaps.join.height) / 1000
		,   half = size / 2

		var posS = currCut.obvPos.read()
		,   minS = posS - half
		,   maxS = posS + half
		,   minT = prevCut ? prevCut.obvPos.read() + half : -Infinity
		,   maxT = nextCut ? nextCut.obvPos.read() - half :  Infinity

		var good_walls = []
		,   good_boxes = []
		,   good_holes = []
		for(var i = 0; i < walls.length; i++) {
			var wall = walls[i]
			if(wall instanceof ANode.Slope && !wall.obvGable.read()) continue

			good_walls.push(wall)
			good_boxes.push(wall.obvWbox.read())
			good_holes.push(wall.obvHoleBoxes.read())
		}



		var cbox = new THREE.Box2
		,   ibox = new THREE.Box2

		cbox.min.x =  horizontal ? minT : minS
		cbox.max.x =  horizontal ? maxT : maxS
		cbox.min.y = !horizontal ? minT : minS
		cbox.max.y = !horizontal ? maxT : maxS

		for(var i = 0; i < good_walls.length; i++) {
			var wall = good_walls[i]

			ibox.copy(good_boxes[i]).intersect(cbox)
			if(ibox.emptyEPS()) continue

			var wall_ancestors = wall.obvAncestors.read()

			var gSeg = this.makeGeometry()
			,   mSeg = this.extrudeWallStripe(gSeg, horizontal, ibox, wall, good_holes[i])
			,   sSeg = this.addSubnode(gSeg, 'join', true, mSeg, wall_ancestors)

			mSeg.material = this.node.material

			sSeg.object.position.z += this.segmentOffsetZ
			sSeg.object.material = this.node.material

			list.push(sSeg)
		}
	}
})


Draw3D.Jointile = f.unit(Draw3D, {
	unitName: 'Draw3D_Jointile',

	jointileOffsetZ: 0.02,

	create: function() {
		var joins = this.node.obvJoins.read()
		if(!joins.length) return

		var page  = this.node.obvParent.read()
		,   walls = page.obvWalls.read()

		var vertical = this.node.obvVertical.read()
		,   pieces   = this.node.obvPieces.read()


		var ibox = new THREE.Box2
		,   jbox = new THREE.Box2
		for(var j = 0; j < walls.length; j++) {
			var wall = walls[j]
			if(wall instanceof ANode.Slope && !wall.obvGable.read()) continue

			var pmin   = wall.obvPmin.read()
			,   wbox   = wall.obvWbox.read()
			,   width  = wall.obvWidth.read()
			,   holes  = wall.obvHoleBoxes.read()
			,   bottom = wall.obvBottom.read()

			var wall_ancestors = wall.obvAncestors.read()

			for(var i = 0; i < pieces.length; i++) {
				var piece = pieces[i]
				,   pbox = piece.obvBox.read()

				ibox.copy(pbox).intersect(wbox)
				if(ibox.emptyEPS()) continue

				var piece_ancestors = piece.obvAncestors.read()


				for(var k = 0; k < joins.length; k++) {
					var join = joins[k]
					,   pos = join.obvPos.read()
					,   material = join.obvMaterial.read()
					,   fabric = material.obvFabric.read()

					var half = (fabric.height || main.imagery.baseMaps.join.height) / 1000 / 2

					jbox.min.x =  vertical ? -Infinity : pos - half
					jbox.max.x =  vertical ?  Infinity : pos + half
					jbox.min.y = !vertical ? -Infinity : pos - half
					jbox.max.y = !vertical ?  Infinity : pos + half
					jbox.intersect(ibox)

					if(jbox.emptyEPS()) continue



					var gJoin = this.makeGeometry()
					,   mJoin = this.extrudeWallStripe(gJoin, vertical, jbox, wall, holes)

					if(!gJoin.vertices.length) continue


					var targets = f.merge(piece_ancestors, wall_ancestors, {
						join: join
					})

					var sJoin = this.addSubnode(gJoin, 'join', true, mJoin, targets)

					mJoin.material = material

					sJoin.object.position.z += this.jointileOffsetZ
					sJoin.object.material = material
				}
			}
		}
	}
})
