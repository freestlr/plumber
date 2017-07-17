Geo = {
	EPS: 1e-7,

	round: function(n) {
		var r, a, p = 0

		do {
			a = Math.pow(10, p++)
			r = Math.round(n * a) / a
		} while(Math.abs(r - n) > Geo.EPS)

		return r
	},

	encodePlid: function(alpha, distance) {
		return Math.round(distance * 1e6) + f.pround(alpha / Math.PI / 2 + 0.5, 6)
	},

	decodePlidAlpha: function(plid) {
		return ((plid % 1) - 0.5) * 2 * Math.PI
	},

	decodePlidDistance: function(plid) {
		return Math.floor(plid) / 1e6
	},

	makePointMap: function(points) {
		var map = []
		var length = points.length

		add_index:
		for(var i = 0; i < length; i++) {
			var p = points[i]

			for(var j = 0; j < i; j++) {
				var q = points[j]

				if(Geo.equalVectors(p, q)) {
					map.push(j)
					continue add_index
				}
			}
			map.push(i)
		}

		return map
	},

	closestPointToLine2: function(a, b, p, target) {

		var dx = b.x - a.x
		,   dy = b.y - a.y
		,   px = p.x - a.x
		,   py = p.y - a.y

		var dd = dx * dx + dy * dy
		,   dp = dx * px + dy * py

		var t = f.clamp(dp / dd, 0, 1)

		target = target || new THREE.Vector2
		target.x = dx * t + a.x
		target.y = dy * t + a.y
		return target
	},

	areaOf: function(contour, points) {
		var area = 0

		var l = contour.length
		for(var p = l -1, q = 0; q < l; p = q++) {
			var a = contour[p]
			,   b = contour[q]

			if(points) {
				a = points[a]
				b = points[b]
			}

			area += b.x * a.z - a.x * b.z
		}
		return area / 2
	},

	areaOfST: function(contour, points, plane) {
		if(!plane) plane = 'xz'
		var s = plane[0]
		,   t = plane[1]

		var area = 0

		var l = contour.length
		for(var p = l -1, q = 0; q < l; p = q++) {
			var a = contour[p]
			,   b = contour[q]

			if(points) {
				a = points[a]
				b = points[b]
			}

			area += b[s] * a[t] - a[s] * b[t]
		}
		return area / 2
	},

	equalJSON: function(a, b) {
		if(a === b) return true

		var at = typeof a
		,   bt = typeof b
		if(at !== bt) return false

		switch(at) {
			case 'boolean':
			case 'number':
			case 'string': return false
		}

		if(a.length !== b.length) return false

		var k
		for(k in a) if(k in b === false) return false
		for(k in b) if(!Geo.equalJSON(a[k], b[k])) return false

		return true
	},

	equalReals: function(a, b) {
		return Math.abs(a - b) < Geo.EPS
	},

	equalVectors2: function(a, b) {
		if(!a && !b) return true
		if(!a || !b) return false
		return Math.abs(a.x - b.x) < Geo.EPS
			&& Math.abs(a.y - b.y) < Geo.EPS
	},

	equalVectors: function(a, b) {
		if(!a && !b) return true
		if(!a || !b) return false
		return Math.abs(a.x - b.x) < Geo.EPS
			&& Math.abs(a.y - b.y) < Geo.EPS
			&& Math.abs(a.z - b.z) < Geo.EPS
	},

	equalLines: function(a, b) {
		if(!a && !b) return true
		if(!a || !b) return false
		return Geo.equalVectors(a.start, b.start)
			&& Geo.equalVectors(a.end,   b.end)
	},

	equalBox2: function(a, b) {
		if(!a && !b) return true
		if(!a || !b) return false
		return Geo.equalVectors2(a.min, b.min)
			&& Geo.equalVectors2(a.max, b.max)
	},

	equalBox3: function(a, b) {
		if(!a && !b) return true
		if(!a || !b) return false
		return Geo.equalVectors(a.min, b.min)
			&& Geo.equalVectors(a.max, b.max)
	},

	equalPlanes: function(a, b) {
		if(!a && !b) return true
		if(!a || !b) return false
		return Geo.equalVectors(a.normal, b.normal)
			&& Math.abs(a.constant - b.constant) < Geo.EPS
	},

	pointInRect: function(p, r1, r2, noy) {
		return Math.min(r1.x, r2.x) <= p.x + Geo.EPS
			&& (noy || Math.min(r1.y, r2.y) <= p.y + Geo.EPS)
			&& Math.min(r1.z, r2.z) <= p.z + Geo.EPS
			&& Math.max(r1.x, r2.x) >= p.x - Geo.EPS
			&& (noy || Math.max(r1.y, r2.y) >= p.y - Geo.EPS)
			&& Math.max(r1.z, r2.z) >= p.z - Geo.EPS
	},

	pointInRectXY: function(p, r1, r2) {
		return Math.min(r1.x, r2.x) <= p.x + Geo.EPS
			&& Math.min(r1.y, r2.y) <= p.y + Geo.EPS
			&& Math.max(r1.x, r2.x) >= p.x - Geo.EPS
			&& Math.max(r1.y, r2.y) >= p.y - Geo.EPS
	},

	pointInEdge: function(p, a, b) {
		var aa = Math.atan2(b.z - a.z, b.x - a.x)
		,   as = Math.sin(-aa)
		,   ac = Math.cos(-aa)

		var px = p.x * ac - p.z * as
		,   pz = p.x * as + p.z * ac
		,   ax = a.x * ac - a.z * as
		,   az = a.x * as + a.z * ac
		,   bx = b.x * ac - b.z * as
		// ,   bz = b.x * as + b.z * ac

		return Math.abs(pz - az) < Geo.EPS
			&& px - ax > -Geo.EPS
			&& bx - px > -Geo.EPS
	},

	pointFinite: function(p) {
		return isFinite(p.x)
			&& isFinite(p.y)
			&& isFinite(p.z)
	},

	triangulate: function(contour) {
		var n = contour.length
		if(n < 3) return []

		var indices = f.rangep(n, n - 1, -1)
		,   result  = []

		var u, v, w
		,   nv = n

		var count = 2 * nv

		for(v = nv - 1; nv > 2; ) {

			/* if we loop, it is probably a non-simple polygon */
			if(--count < 0) {

				//** Triangulate: ERROR - probable bad polygon!
				// Sometimes warning is fine, especially polygons are triangulated in reverse.
				console.warn('Geo.triangulate: Warning, unable to triangulate polygon!')

				return result
			}

			/* three consecutive vertices in current polygon, <u,v,w> */
			u = v;      if(nv <= u) u = 0     /* previous */
			v = u + 1;  if(nv <= v) v = 0     /* new v    */
			w = v + 1;  if(nv <= w) w = 0     /* next     */

			if(Geo.triangulateSnip(contour, u, v, w, nv, indices)) {

				result.push( [indices[u], indices[v], indices[w]] )

				/* remove v from the remaining polygon */
				for(var s = v, t = v + 1; t < nv; s++, t++) {
					indices[s] = indices[t]
				}

				nv--

				/* reset error detection counter */
				count = 2 * nv
			}
		}

		return result
	},

	triangulateSnip: function(points, u, v, w, n, indices) {
		var EPS = Geo.EPS

		var a = points[indices[u]]
		,   b = points[indices[v]]
		,   c = points[indices[w]]

		var ax = a.x
		,   az = a.z
		,   bx = b.x
		,   bz = b.z
		,   cx = c.x
		,   cz = c.z

		if((bx - ax) * (cz - az) - (bz - az) * (cx - ax) < EPS) return false

		var aX = cx - bx
		,   aZ = cz - bz
		,   bX = ax - cx
		,   bZ = az - cz
		,   cX = bx - ax
		,   cZ = bz - az

		for(var i = 0; i < n; i++) {
			var p  = points[indices[i]]
			,   px = p.x
			,   pz = p.z

			if((px === ax && pz === az)
			|| (px === bx && pz === bz)
			|| (px === cx && pz === cz)) continue

			if(aX * (pz - bz) - aZ * (px - bx) >= -EPS
			&& cX * (pz - az) - cZ * (px - ax) >= -EPS
			&& bX * (pz - cz) - bZ * (px - cx) >= -EPS) return false
		}

		return true
	},

	intersectEdges: function(a1, a2, b1, b2, expandA, expandB, target) {
		var EPS = Geo.EPS

		var adx = a2.x - a1.x
		,   ady = a2.y - a1.y
		,   adz = a2.z - a1.z
		,   bdx = b2.x - b1.x
		,   bdz = b2.z - b1.z
		,   idx = a1.x - b1.x
		,   idz = a1.z - b1.z

		var d = bdz * adx - bdx * adz

		if(Math.abs(d) < EPS) return null

		var m = (bdx * idz - bdz * idx) / d
		,   x = a1.x + m * adx
		,   y = a1.y + m * ady
		,   z = a1.z + m * adz

		if(!(expandA ||
			(  Math.min(a1.x, a2.x) < x + EPS
			&& Math.min(a1.z, a2.z) < z + EPS
			&& Math.max(a1.x, a2.x) > x - EPS
			&& Math.max(a1.z, a2.z) > z - EPS))) return

		if(!(expandB ||
			(  Math.min(b1.x, b2.x) < x + EPS
			&& Math.min(b1.z, b2.z) < z + EPS
			&& Math.max(b1.x, b2.x) > x - EPS
			&& Math.max(b1.z, b2.z) > z - EPS))) return

		target = target || new THREE.Vector3
		target.set(x, y, z)

		return target
	},

	/**
	 * y = Geo.splitEdgeST(x, ax, bx, ay, by)
	 * x = Geo.splitEdgeST(y, ay, by, ax, bx)
	 */
	splitEdgeST: function(s, as, bs, at, bt) {
		if(Math.abs(bs - as) < Geo.EPS) return at

		return (bt - at) * (s - as) / (bs - as) + at
	},

	splitContours: function(indices, points) {
		var inter  = Geo.intersectContours(indices, points)
		,   edges  = Geo.collectEdges(inter.contours)
		,   paths  = Geo.searchPaths(edges)
		,   chunks = Geo.collectChunks(paths, inter.points)

		Geo.dropChunks(chunks, false)
		Geo.findChunkOwners(chunks, inter.contours, inter.points)

		return {
			points: inter.points,
			chunks: chunks
		}
	},

	collectChunks: function(contours, points) {
		var chunks = []
		for(var i = 0; i < contours.length; i++) {
			var contour = contours[i]

			var area = Geo.areaOf(contour, points)
			if(area < 0) {
				contour.reverse()
				area *= -1
			}

			if(area > Geo.EPS) chunks.push({
				indices: contour,
				area: area
			})
		}
		return chunks
	},

	collectEdges: function(contours) {
		var edges = []
		for(var i = 0; i < contours.length; i++) {
			var indices = contours[i]
			,   length  = indices.length

			add_edge:
			for(var j = length - 1, k = 0; k < length; j = k++) {
				var a = indices[j]
				,   b = indices[k]

				for(var m = 0; m < edges.length; m++) {
					var c = edges[m][0]
					,   d = edges[m][1]

					if((a === c && b === d)
					|| (a === d && b === c)) continue add_edge
				}

				edges.push([a, b])
			}
		}

		return edges
	},

	haveCoincideEdges: function(path1, path2){
		var l1 = path1.length
		,   l2 = path2.length

		for(var i1 = 0; i1 < l1; i1++){
			var a1 = path1[i1]
			,   b1 = path1[(i1+1) % l1]

			for(var i2 = 0; i2 < l2; i2++){
				var a2 = path2[i2]
				,   b2 = path2[(i2+1) % l2]

				if(a1 === a2 && b1 === b2) return true
			}
		}

		return false
	},

	dropChunks: function(chunks, smallest) {
		var drop = []

		for(var i = chunks.length -1; i >= 0; i--) {
			var c1 = chunks[i]

			for(var j = i - 1; j >= 0; j--) {
				var c2 = chunks[j]

				var similar = Geo.haveCoincideEdges(c1.indices, c2.indices)
				if(!similar) continue

				drop[(c1.area > c2.area) ^ !!smallest ? i : j] = true
			}
		}

		for(var i = chunks.length -1; i >= 0; i--) {
			if(drop[i]) chunks.splice(i, 1)
		}
	},

	findChunkOwners: function(chunks, sources, points) {
		for(var i = 0; i < chunks.length; i++) {
			var chunk = chunks[i]
			chunk.owners = 0

			next_source:
			for(var j = 0; j < sources.length; j++) {
				var source = sources[j]

				var src = []
				,   dst = []
				,   xtr = []
				for(var k = 0; k < source.length; k++) {
					var x = source[k]

					if(chunk.indices.indexOf(x) !== -1) src.push(x)
				}
				for(var k = 0; k < chunk.indices.length; k++) {
					var x = chunk.indices[k]

					if(src.indexOf(x) !== -1) dst.push(x)
					else xtr.push(x)
				}

				if(dst.length > 2) {
					var start = dst.indexOf(src[0])

					dst = dst.slice(start).concat(dst.slice(0, start))
					if(dst.toString() !== src.toString()) {
						continue next_source
					}
				}

				if(xtr.length) {
					if(!Geo.pointInContourST(points[xtr[0]], source, points, null, false)) {
						continue next_source
					}
				}

				chunk.owners |= 1 << j
			}
		}
	},

	pointInContourST: function(point, contour, points, plane, inclusive) {
		if(!plane) plane = 'xz'

		var odd = false

		var s = plane[0]
		,   t = plane[1]

		var ps = point[s]
		,   pt = point[t]

		var l = contour.length
		for(var i = l - 1, j = 0; j < l; i = j++) {
			var a = contour[i]
			,   b = contour[j]

			if(points) {
				a = points[a]
				b = points[b]
			}

			var as = a[s]
			,   at = a[t]
			,   bs = b[s]
			,   bt = b[t]

			var minT = at < bt ? at : bt
			,   maxT = at > bt ? at : bt
			,   minS = as < bs ? as : bs
			,   maxS = as > bs ? as : bs

			if(Math.abs(at - bt) < Geo.EPS) {
				if(Math.abs(at - pt) < Geo.EPS) {

					if(minS < ps + Geo.EPS && ps - Geo.EPS < maxS) {
						return !!inclusive
					}
				}

			} else if(minT < pt && pt <= maxT) {
				var xs = bs + (pt - bt) / (at - bt) * (as - bs)

				if(Math.abs(xs - ps) < Geo.EPS) {
					return !!inclusive

				} else if(xs < ps) odd = !odd
			}
		}

		return odd
	},


	filterContour2: function() {
		var vP = new THREE.Vector2
		,   vN = new THREE.Vector2

		return function filterContour2(contour) {
			for(var i = contour.length -1; i > 0; i--) {
				var a = contour[i-1]
				,   b = contour[i]

				if(a === b || Geo.equalVectors2(a, b)) {
					contour.splice(i, 1)
				}
			}

			if(contour.length <3) return

			for(var i = contour.length -2; i > 0; i--) {
				var a = contour[i-1]
				,   b = contour[i]
				,   c = contour[i+1]

				vP.subVectors(b, a).normalize()
				vN.subVectors(c, b).normalize()

				if(Geo.equalVectors2(vP, vN)) contour.splice(i, 1)
			}
		}
	}(),

	filterContour3: function() {
		var vP = new THREE.Vector3
		,   vN = new THREE.Vector3

		return function filterContour3(contour) {
			for(var i = contour.length -1; i > 0; i--) {
				var a = contour[i-1]
				,   b = contour[i]

				if(a === b || Geo.equalVectors(a, b)) {
					contour.splice(i, 1)
				}
			}

			if(contour.length <3) return

			for(var i = contour.length -2; i > 0; i--) {
				var a = contour[i-1]
				,   b = contour[i]
				,   c = contour[i+1]

				vP.subVectors(b, a).normalize()
				vN.subVectors(c, b).normalize()

				if(Geo.equalVectors(vP, vN)) contour.splice(i, 1)
			}
		}
	}(),

	mergeAlignedContoursXY: function(contours) {
		var an = new THREE.Vector2
		,   bn = new THREE.Vector2

		for(var i = 0; i < contours.length; i++) {
			var ap = contours[i]

			find_merge:
			for(var j = contours.length -1; j > i; j--) {
				var bp = contours[j]
				,   bl = bp.length
				,   al = ap.length

				for(var i1 = 0; i1 < al; i1++) {
					var i2 = (i1 + 1) % al
					,   a1 = ap[i1]
					,   a2 = ap[i2]

					an.subVectors(a2, a1).normalize()

					var a1p =  a1.x * an.x + a1.y * an.y
					,   a2p =  a2.x * an.x + a2.y * an.y
					,   a1n = -a1.x * an.y + a1.y * an.x

					for(var j1 = 0; j1 < bl; j1++) {
						var j2 = (j1 + 1) % bl
						,   b1 = bp[j1]
						,   b2 = bp[j2]

						bn.subVectors(b1, b2).normalize()

						if(!Geo.equalVectors2(an, bn)) continue

						var b1n = -b1.x * an.y + b1.y * an.x
						if(Math.abs(a1n - b1n) > Geo.EPS) continue

						var b1p = b1.x * an.x + b1.y * an.y
						,   b2p = b2.x * an.x + b2.y * an.y

						if(Math.max(b1p, b2p) - Geo.EPS < Math.min(a1p, a2p)
						|| Math.min(b1p, b2p) + Geo.EPS > Math.max(a1p, a2p)) continue


						var xe1 = Math.abs(a1p - b1p) < Geo.EPS
						,   xe2 = Math.abs(a2p - b2p) < Geo.EPS

						ap = contours[i] = [].concat(
							ap.slice(0, xe1 ? i1 : i2),
							bp.slice(j2),
							bp.slice(0, xe2 ? j1 : j2),
							ap.slice(i2))

						contours.splice(j, 1)
						j = contours.length
						continue find_merge
					}
				}
			}

			Geo.filterContour2(ap)
		}

		return contours
	},

	intersectTwoConvex: function(contourA, contourB) {
		var lenA = contourA.length
		,   lenB = contourB.length

		function swap() {
			var temp = contourA
			contourA = contourB
			contourB = temp

			temp = lenA
			lenA = lenB
			lenB = temp
		}

		function findStart() {
			for(var i = 0; i < lenA; i++) {
				if(Geo.pointInContourST(contourA[i], contourB, null, null, true)) return i
			}
			return -1
		}

		var index = findStart()
		if(index === -1) {
			swap()
			index = findStart()
		}
		if(index === -1) return

		var result = []
		,   point  = contourA[index]

		next_edge:
		while(point !== result[0]) {
			result.push(point)

			var index1 = (index +1) % lenA
			,   a1 = contourA[index]
			,   a2 = contourA[index1]

			for(var i = 0; i < lenB; i++) {
				var b1 = contourB[i]
				,   b2 = contourB[(i +1) % lenB]

				var x = Geo.intersectEdges(a1, a2, b1, b2)
				if(!x || Geo.equalVectors(x, point)) continue

				index = i
				point = x
				swap()

				continue next_edge
			}
			index = index1
			point = a2
		}

		return result
	},

	intersectContours: function(contours, points, map) {
		if(!map) map = Geo.makePointMap(points)

		var chain = []
		for(var i = 0; i < contours.length; i++) {
			var c = contours[i]

			chain.push(null)
			for(var j = 0; j < c.length; j++) chain.push(map[c[j]])
			chain.push(map[c[0]])
		}

		var an = new THREE.Vector3
		,   bn = new THREE.Vector3

		for(var i = 0; i < chain.length; i++) {
			var i0 = chain[i]
			,   i1 = chain[i+1]
			,   a0 = points[i0]
			,   a1 = points[i1]
			if(!a0 || !a1) continue

			if(a0 === a1) {
				chain.splice(i--, 1)
				continue
			}

			an.subVectors(a1, a0).normalize().set(-an.z, an.y, an.x)

			for(var j = i+2; j < chain.length -1; j++) {
				var j0 = chain[j]
				,   j1 = chain[j+1]
				,   b0 = points[j0]
				,   b1 = points[j1]
				if(!b0 || !b1) continue

				if(b0 === b1) {
					chain.splice(j--, 1)
					continue
				}

				if(a0 === b0 || a0 === b1
				|| a1 === b0 || a1 === b1) continue

				bn.subVectors(b1, b0).normalize().set(-bn.z, bn.y, bn.x)

				var reverse = false
				,   parallel = Geo.equalVectors(an, bn)
				if(!parallel) {
					parallel = Geo.equalVectors(an, bn.negate())
					reverse = true
				}

				if(parallel && Math.abs(a0.dot(an) - b0.dot(bn)) < Geo.EPS) {

					var xa0 = Geo.pointInRect(a0, b0, b1)
					,   xa1 = Geo.pointInRect(a1, b0, b1)
					,   xb0 = Geo.pointInRect(b0, a0, a1)
					,   xb1 = Geo.pointInRect(b1, a0, a1)

					if(xa0 && xa1) {
						chain.splice(j+1, 0, reverse ? i1 : i0, reverse ? i0 : i1)
						j+=2
						continue

					} else if(xb0 && xb1) {
						chain.splice(i+1, 0, reverse ? j1 : j0, reverse ? j0 : j1)
						i--
						break

					} else if(xa0) {
						chain.splice(j+1, 0, i0)
						chain.splice(i+1, 0, reverse ? j0 : j1)
						i--
						break

					} else if(xa1) {
						chain.splice(j+1, 0, i1)
						chain.splice(i+1, 0, reverse ? j1 : j0)
						i--
						break
					}
				}

				var x = Geo.intersectEdges(a0, a1, b0, b1)
				if(!x) continue

				var index = Geo.pushPoint(points, x, true, map)

				if(index !== j0 && index !== j1) {
					chain.splice(j+1, 0, index)
					j++
				}
				if(index !== i0 && index !== i1) {
					chain.splice(i+1, 0, index)
					i--
					break
				}
			}
		}

		var result = []
		for(var i = chain.length -1; i >= 0; i--) if(chain[i] === null) {
			result.unshift(chain.slice(i + 1, -1))
			chain = chain.slice(0, i)
		}

		return {
			contours: result,
			intersect: f.aflat(result).filter(f.uniqi),
			pointMap: map,
			points: points
		}
	},

	pushPoint: function(points, point, eps, map) {
		for(var i = 0; i < points.length; i++) {
			if(map && map[i] !== i) continue

			if(eps
				? Geo.equalVectors(points[i], point)
				: points[i] === point
			) return i
		}

		points.push(point)
		if(map) map.push(i)
		return i
	},

	searchPaths: function(edges) {
		if(!edges || !edges.length) return []

		var branches = []
		,   contours = []
		,   strings  = []

		var branch = {
			path: [edges[0][0]],
			ways: edges.slice()
		}

		while(branch) {
			var last_index = branch.path.length -1
			,   last       = branch.path[last_index]
			,   prev_index = branch.path.indexOf(last)

			if(prev_index !== last_index) {
				var indices = branch.path.slice(prev_index, -1)
				,   contour = Geo.normalizeContour(indices)
				,   string  = contour.join()

				if(indices.length > 2 && !~strings.indexOf(string)) {
					strings.push(string)
					contours.push(contour)
				}

			} else for(var i = 0; i < branch.ways.length; i++) {
				var e = branch.ways[i]
				,   a = e[0]
				,   b = e[1]

				if(a !== last && b !== last) continue

				var item = a === last ? b : a
				,   ways = branch.ways.slice()

				ways.splice(i, 1)

				branches.push({
					path: branch.path.concat(item),
					ways: ways
				})
			}

			if(!branches.length && branch.ways.length) {
				branches.push({
					path: branch.ways[0],
					ways: branch.ways.slice(1)
				})
			}

			branch = branches.pop()
		}

		return contours
	},

	normalizeContour: function(contour) {
		var min = Math.min.apply(null, contour)
		,   clength = contour.length

		,   imin   = contour.indexOf(min)
		,   ileft  = (imin || clength) - 1
		,   iright = (imin + 1) % clength

		if(contour[ileft] < contour[iright]) {
			contour = contour.reverse()
			imin = contour.indexOf(min)
		}
		return contour.slice(imin).concat(contour.slice(0, imin))
	}
}
