Loader.extend('obj', {
	transport: Loader.ajaxTransport,

	saveMetadata: false,
	computeBoundingBox: false,
	randomColor: true,
	verbose: false,

	prepare: function(text) {
		var unit = this

		var meta = {
			vertices: [],
			normals: [],
			meshes: [],
			uvs: []
		}

		var vertexOffset = 0
		,   createMesh = true

		var object = new THREE.Object3D
		,   root = object
		,   geometry, material, mesh

		var v0 = new THREE.Vector2
		,   v1 = new THREE.Vector3
		,   v2 = new THREE.Vector3
		,   uv0 = [v0, v0, v0]


		function addFaceVertex(index) {
			if(index < 0) {
				index = meta.vertices.length + index +1
			}

			if(!meta.vertices[index]) {
				if(unit.verbose) console.warn('Loader.obj: undefined vertex '+ index)
			}

			if(index < vertexOffset) {
				return geometry.vertices.push(meta.vertices[index]) -1
			} else {
				return index - vertexOffset
			}
		}

		function addMesh() {
			geometry = new THREE.Geometry
			material = new THREE.MeshBasicMaterial
			mesh = new THREE.Mesh(geometry, material)

			if(unit.randomColor) {
				material.color.set(Math.round(Math.random() * 0xFFFFFF))
			}

			vertexOffset = meta.vertices.length

			meta.meshes.push(mesh)
		}

		function addFace(a, b, c, index, uv, normal, vertex, hasUV, hasNR, line) {
			v1.subVectors(vertex[c], vertex[b])
			v2.subVectors(vertex[a], vertex[b])
			v1.cross(v2)

			if(!v1.x && !v1.y && !v1.z) {
				if(unit.verbose) console.warn('[Loader.obj] collapsed face "'+ unit.url +'":', line, [a, b, c])
				return
			}
			v1.normalize()

			var face = new THREE.Face3(index[a], index[b], index[c])
			face.normal.copy(v1)
			if(hasNR) face.vertexNormals.push(normal[a], normal[b], normal[c])

			geometry.faceVertexUvs[0].push(hasUV ? [uv[a], uv[b], uv[c]] : uv0)
			geometry.faces.push(face)
		}

		function commitMesh() {
			if(!geometry || !geometry.vertices.length) return

			if(unit.computeBoundingBox) geometry.computeBoundingBox()

			object.add(mesh)
		}

		function addMeshIfNeeded() {
			if(!createMesh) return
			createMesh = false

			commitMesh()
			addMesh()
		}

		var lineNo = -1
		var index = 0
		while(index !== -1) {
			var nextIndex = text.indexOf('\n', index +1)
			var line = text.substr(index, nextIndex - index).replace(/#.*/, '').trim()

			lineNo++
			index = nextIndex
			if(!line) continue

			var parts = line.split(/\s+/)
			,   name  = parts[0]
			,   data  = parts.slice(1)
			switch(name) {
				case 'mtllib': // .mtl file
					// ignore
				break

				case 'o': // object
					// ignore
				break

				case 's': // shading
					// ignore
				break

				case 'usemtl': // material
					mesh.material.name = data.join(' ')
				break

				case 'g': // group
					mesh.name = data.join(' ')
				break

				case 'v': // vertex
					addMeshIfNeeded()

					var v = new THREE.Vector3(
						parseFloat(data[0]),
						parseFloat(data[1]),
						parseFloat(data[2]))

					meta.vertices.push(v)
					geometry.vertices.push(v)
				break

				case 'vn': // normal
					meta.normals.push(new THREE.Vector3(
						parseFloat(data[0]),
						parseFloat(data[1]),
						parseFloat(data[2])))
				break

				case 'vt': // uv
					meta.uvs.push(new THREE.Vector2(
						parseFloat(data[0]),
						parseFloat(data[1])))
				break

				case 'f': // face: vertex/uv/normal
					var vertices = data.length

					var hasNR = true
					,   hasUV = true

					var igroup = []
					,   ugroup = []
					,   ngroup = []
					,   vgroup = []
					for(var j = 0; j < vertices; j++) {
						var fd = data[j].split('/')

						var ig = addFaceVertex(parseInt(fd[0]) -1)
						,   ug =      meta.uvs[parseInt(fd[1]) -1]
						,   ng =  meta.normals[parseInt(fd[2]) -1]

						igroup.push(ig)
						ugroup.push(ug)
						ngroup.push(ng)
						vgroup.push(geometry.vertices[ig])

						hasUV &= !!ug
						hasNR &= !!ng
					}

					if(vertices === 4) {
						addFace(0, 1, 3, igroup, ugroup, ngroup, vgroup, hasUV, hasNR, lineNo)
						addFace(1, 2, 3, igroup, ugroup, ngroup, vgroup, hasUV, hasNR, lineNo)

					} else if(vertices === 3) {
						addFace(0, 1, 2, igroup, ugroup, ngroup, vgroup, hasUV, hasNR, lineNo)

					} else {
						if(unit.verbose) console.warn('[Loader.obj] unknown face with', vertices, 'vertices')
						continue
					}

					createMesh = true
				break

				default:
					if(unit.verbose) console.log('Loader.obj: unhandled "'+ line +'"')
				break
			}
		}

		commitMesh()

		if(this.saveMetadata) {
			root.metadata = meta
		}

		return root
	}
})
