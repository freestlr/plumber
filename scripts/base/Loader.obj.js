Loader.extend('obj', {
	transport: Loader.ajaxTransport,

	saveMetadata: false,
	computeBoundingBox: false,

	prepare: function(data) {
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
			if(index < 0) index = meta.vertices.length + index +1
			if(!meta.vertices[index]) console.warn('Loader.obj: undefined vertex '+ index)

			if(index < vertexOffset) {
				return geometry.vertices.push(meta.vertices[index]) -1
			} else {
				return index - vertexOffset
			}
		}

		function addMesh() {
			geometry = new THREE.Geometry
			material = new THREE.MeshBasicMaterial({ color: f.rand(0xFFFFFF) })
			mesh = new THREE.Mesh(geometry, material)

			vertexOffset = meta.vertices.length

			meta.meshes.push(mesh)
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

		var lines = data.split('\n')

		for(var i = 0; i < lines.length; i++) {
			var line = lines[i].replace(/#.*/, '').trim()
			if(!line) continue

			var parts = line.split(/\s+/)
			,   name  = parts[0]
			,   data  = parts.slice(1)
			switch(name) {
				case 'mtllib': // .mtl file
					// ignore
				break

				case 'usemtl': // material
					mesh.material.name = data.join(' ')
				break

				case 'g': // group
					mesh.name = data.join(' ')
				break

				case 'o': // object
					//    ignore
					// object = new THREE.Object3D
					// object.name = data.join(' ')
					// root.add(object)
				break

				case 's': // shading
					// ignore
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
					if(data.length === 4) { // split face4 into two face3: 1,2,4 and 2,3,4
						lines.splice(i +1, 0, ['f', data[1], data[2], data[3]].join(' '))
						data.splice(2, 1)
					}

					var vgroup = []
					,   ugroup = []
					,   ngroup = []
					for(var j = 0; j < 3; j++) {
						var fd = data[j].split('/')

						vgroup.push(addFaceVertex(parseInt(fd[0]) -1))
						ugroup.push(     meta.uvs[parseInt(fd[1]) -1])
						ngroup.push( meta.normals[parseInt(fd[2]) -1])
					}

					var vA = geometry.vertices[vgroup[0]]
					,   vB = geometry.vertices[vgroup[1]]
					,   vC = geometry.vertices[vgroup[2]]

					v1.subVectors(vC, vB)
					v2.subVectors(vA, vB)
					v1.cross(v2)

					if(!v1.x && !v1.y && !v1.z) {
						console.warn('[Loader.obj] collapsed face "'+ unit.url +'":', data.join(' '))
						continue
					}
					v1.normalize()


					var hasNR = ngroup[0] && ngroup[1] && ngroup[2]
					,   hasUV = ugroup[0] && ugroup[1] && ugroup[2]

					var face = new THREE.Face3(vgroup[0], vgroup[1], vgroup[2])

					face.normal.copy(v1)
					if(hasNR) face.vertexNormals = ngroup

					geometry.faceVertexUvs[0].push(hasUV ? ugroup : uv0)
					geometry.faces.push(face)

					createMesh = true
				break

				default:
					console.log('Loader.obj: unhandled "'+ line +'"')
			}
		}

		commitMesh()

		if(this.saveMetadata) {
			root.metadata = meta
		}

		return root
	}
})
