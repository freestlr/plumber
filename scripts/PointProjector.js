function PointProjector(camera) {
	this.camera   = camera

	this.points   = []
	this.matrix   = new THREE.Matrix4
	this.inverse  = new THREE.Matrix4
	this.viewport = new THREE.Vector3
}

PointProjector.prototype = {

	clear: function() {
		this.points = []
	},

	addPoint: function(local) {
		var point = {
			world   : new THREE.Vector3,
			screen  : new THREE.Vector2,
			local   : !!local,
			visible : false
		}

		this.points.push(point)
		return point
	},

	remPoint: function(point) {
		var index = this.points.indexOf(point)
		if(~index)  this.points.splice(index, 1)
	},



	/**
	 * -inf <  world    <  inf
	 *   -1 <= viewport <= 1
	 *    0 <= screen   <= width
	 */

	viewportToWorld: function(viewport, world, local) {
		if(!world) world = new THREE.Vector3

		world.copy(viewport)
		world.applyMatrix4(this.inverse)
		if(local) world.sub(this.camera.position)

		return world
	},

	worldToViewport: function(world, viewport, local) {
		if(!viewport) viewport = new THREE.Vector3

		viewport.copy(world)
		if(local) viewport.add(this.camera.position)
		viewport.applyMatrix4(this.matrix)

		return viewport
	},

	viewportToScreen: function(viewport, screen) {
		if(!screen) screen = new THREE.Vector2

		screen.x = ( viewport.x / 2 + 0.5) * this.width
		screen.y = (-viewport.y / 2 + 0.5) * this.height

		return screen
	},

	screenToViewport: function(screen, viewport) {
		if(!viewport) viewport = new THREE.Vector3

		viewport.x =  (screen.x / this.width  * 2 - 1)
		viewport.y = -(screen.y / this.height * 2 - 1)
		viewport.z = -1

		return viewport
	},

	screenToWorld: function(screen, world, local) {
		this.screenToViewport(screen, this.viewport)
		return this.viewportToWorld(this.viewport, world, local)
	},

	worldToScreen: function(world, screen, local) {
		this.worldToViewport(world, this.viewport, local)
		return this.viewportToScreen(this.viewport, screen)
	},



	resize: function(w, h) {
		this.width  = w
		this.height = h
	},


	updateMatrices: function() {
		this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld)
		this.matrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)

		this.inverse.getInverse(this.camera.projectionMatrix)
		this.inverse.multiplyMatrices(this.camera.matrixWorld, this.inverse)
	},

	updatePoint: function(point) {
		this.worldToViewport(point.world, this.viewport, point.local)
		this.viewportToScreen(this.viewport, point.screen)

		if(point.local) {
			point.distance = point.world.length()

		} else {
			point.distance = point.world.distanceTo(this.camera.position)
		}

		point.visible =
			-1 <= this.viewport.x && this.viewport.x <= 1 &&
			-1 <= this.viewport.y && this.viewport.y <= 1 &&
			-1 <= this.viewport.z && this.viewport.z <= 1
	},

	update: function() {
		// this.updateMatrices()
		this.points.forEach(this.updatePoint, this)
	}
}
