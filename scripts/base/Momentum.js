function Momentum() {
	this.speed  = { x: 0, y: 0, z: 0 }
	this.point  = { x: 0, y: 0, z: 0 }
	this.delta  = { x: 0, y: 0, z: 0 }
	this.target = { x: 0, y: 0, z: 0 }

	this.points = []
}

Momentum.prototype = {

	pointsLength: 5,
	friction: Math.pow(0.87, 60 / 1000),
	threshold: 1e-5,

	time: function() {
		return window.performance && window.performance.now ? window.performance.now()
			:  Date.now ? Date.now()
			:  new Date().getTime()
	},

	push: function(x, y, z) {
		this.point.x = +x || 0
		this.point.y = +y || 0
		this.point.z = +z || 0
		this.point.t = this.time()

		this.points.push({
			x: this.point.x,
			y: this.point.y,
			z: this.point.z,
			t: this.point.t
		})

		var oversize = this.points.length - this.pointsLength
		if(oversize > 0) this.points.splice(0, oversize)
	},

	updateSpeed: function() {
		this.speed0 = Math.sqrt(
			this.speed.x * this.speed.x +
			this.speed.y * this.speed.y +
			this.speed.z * this.speed.z)
	},

	updateAccel: function(friction) {
		this.limit = 1 / (1 - this.friction)
	},

	updateTarget: function() {
		this.target.x = this.point.x + this.speed.x * this.limit
		this.target.y = this.point.y + this.speed.y * this.limit
		this.target.z = this.point.z + this.speed.z * this.limit
	},

	updateDistance: function() {
		this.delta.x = this.target.x - this.point.x
		this.delta.y = this.target.y - this.point.y
		this.delta.z = this.target.z - this.point.z

		this.distance = Math.sqrt(
			this.delta.x * this.delta.x +
			this.delta.y * this.delta.y +
			this.delta.z * this.delta.z)
	},

	updateDuration: function() {
		this.duration = Math.log(this.threshold / this.speed0) / Math.log(this.friction)
	},

	go: function() {
		if(this.points.length <2) return

		var point0 = this.points[0]

		var dx = this.point.x - point0.x
		,   dy = this.point.y - point0.y
		,   dz = this.point.z - point0.z
		,   dt = this.point.t - point0.t

		this.speed.x = dx / dt
		this.speed.y = dy / dt
		this.speed.z = dz / dt

		this.updateSpeed()
		this.updateAccel()
		this.updateTarget()
		this.updateDuration()
		this.updateDistance()

		this.start()
	},

	to: function(x, y, z) {
		this.target.x = +x || 0
		this.target.y = +y || 0
		this.target.z = +z || 0

		this.updateDistance()
		this.updateAccel()

		this.speed.x = this.delta.x / this.limit
		this.speed.y = this.delta.y / this.limit
		this.speed.z = this.delta.z / this.limit
		this.updateSpeed()
		this.updateDuration()

		this.start()
	},

	tot: function(t, x, y, z) {
		this.duration = +t || 0
		this.target.x = +x || 0
		this.target.y = +y || 0
		this.target.z = +z || 0

		this.updateDistance()
		this.updateAccel()

		var targetDuration = this.duration
		,   targetDistance = this.distance


		this.speed.x = this.delta.x / this.limit
		this.speed.y = this.delta.y / this.limit
		this.speed.z = this.delta.z / this.limit
		this.updateSpeed()
		this.updateDuration()

		this.updateTarget()
		this.updateDistance()

		var i = 0
		while( Math.abs(targetDuration - this.duration) / targetDuration > 1e-4
			|| Math.abs(targetDistance - this.distance) / targetDistance > 1e-4) {

			this.friction = Math.pow(this.threshold / this.speed0, 1 / targetDuration)
			this.limit = 1 / (1 - this.friction)

			this.updateTarget()
			this.updateDistance()

			var scale = targetDistance / this.distance
			this.speed.x *= scale
			this.speed.y *= scale
			this.speed.z *= scale

			this.updateSpeed()
			this.updateDuration()

			if(++i > 10) break
		}

		this.updateTarget()
		this.updateDistance()

		this.start()
	},

	update: function() {
		this.ended = false
		if(!this.active) return

		this.timeNow   = this.time()
		this.timeDelta = Math.round(this.timeNow - this.timeLast)
		this.timeLast += this.timeDelta


		for(var a = 0, i = 0; i < this.timeDelta; i++) {
			a += Math.pow(this.friction, i)
		}

		this.delta.x = this.speed.x * a
		this.delta.y = this.speed.y * a
		this.delta.z = this.speed.z * a

		this.point.x += this.delta.x
		this.point.y += this.delta.y
		this.point.z += this.delta.z

		var accelDelta = Math.pow(this.friction, this.timeDelta)

		this.speed.x *= accelDelta
		this.speed.y *= accelDelta
		this.speed.z *= accelDelta
		this.updateSpeed()

		if(this.speed0 < this.threshold) {
			this.ended = true
			this.stop()
		}
	},

	start: function() {
		this.updateSpeed()

		if(this.debug) {
			console.log(this.debug, 'start', this.speed0 < this.threshold)
		}

		if(this.speed0 < this.threshold) return

		this.timeLast  = this.time()
		this.timeStart = this.timeLast
		this.timeEnd   = this.timeStart + this.duration

		this.active = true
	},

	stop: function() {
		if(this.debug) {
			console.log(this.debug, 'stop', this.active)
		}

		if(!this.active) return

		this.points = []
		this.active = false
	}
}
