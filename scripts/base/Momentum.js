function Momentum() {
	this.events = new EventEmitter

	this.speed  = { x: 0, y: 0, z: 0 }
	this.point  = { x: 0, y: 0, z: 0 }
	this.delta  = { x: 0, y: 0, z: 0 }
	this.target = { x: 0, y: 0, z: 0 }

	this.points = []
}

Momentum.prototype = {

	pointsLength: 5,
	acceleration: 0.87,
	speedThreshold: 1e-5,

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

	updateAccel: function(acceleration) {
		this.accel = Math.pow(acceleration || this.acceleration, 60 / 1000)
		this.limit = 1 / (1 - this.accel)
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
		this.duration = Math.log(this.speedThreshold / this.speed0) / Math.log(this.accel)
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

		if(this.speed0 > this.speedThreshold) {
			this.updateAccel()
			this.updateTarget()
			this.updateDuration()
			this.updateDistance()

			this.start()
		}
	},

	to: function(t, x, y, z) {
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

			this.accel = Math.pow(this.speedThreshold / this.speed0, 1 / targetDuration)
			this.limit = 1 / (1 - this.accel)

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

		if(this.speed0 > this.speedThreshold) {
			this.start()
		}
	},

	update: function() {
		this.ended = false
		if(!this.active) return

		this.timeNow   = this.time()
		this.timeDelta = Math.round(this.timeNow - this.timeLast)
		this.timeLast += this.timeDelta


		var accelSum = 0
		for(var i = 0; i < this.timeDelta; i++) accelSum += Math.pow(this.accel, i)

		this.point.x += this.speed.x * accelSum
		this.point.y += this.speed.y * accelSum
		this.point.z += this.speed.z * accelSum

		var accelDelta = Math.pow(this.accel, this.timeDelta)

		this.speed.x *= accelDelta
		this.speed.y *= accelDelta
		this.speed.z *= accelDelta
		this.updateSpeed()

		if(this.speed0 < this.speedThreshold) {
			this.ended = true
			this.stop()
		}
	},

	start: function() {
		this.timeLast  = this.point.t
		this.timeStart = this.timeLast
		this.timeEnd   = this.timeStart + this.duration

		this.active = true
	},

	stop: function() {
		if(!this.active) return

		this.points = []
		this.active = false
		this.events.emit('stop')
	}
}
