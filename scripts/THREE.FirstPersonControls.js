THREE.FirstPersonControls = function(object, element) {
	this.object   = object
	this.element  = element
	this.events   = new EventEmitter
	this.buttons  = new THREE.Vector3
	this.force    = new THREE.Vector3
	this.velocity = new THREE.Vector3
	this.delta    = new THREE.Vector3
	this.rotation = new THREE.Vector3
	this.direct   = new THREE.Matrix4

	this.object.rotation.set(0, 0, 0, "YXZ")
	this.needsUpdateForce = true

	document.addEventListener('pointerlockchange', this)
}

THREE.FirstPersonControls.prototype = {
	enabled: false,
	changed: false,

	speed: 2,
	acceleration: 0,
	friction: Math.pow(0.8, 60 / 1000),
	rotationSpeed: 0.002,

	capture: function() {
		if(this.element.requestPointerLock) {
			this.element.requestPointerLock()
		}
	},

	handleEvent: function(e) {
		switch(e.type) {
			case 'pointerlockchange':
				this.enabled = document.pointerLockElement === this.element
				this.events.emit('capture', this.enabled)

				if(this.enabled) {
					window.addEventListener('mousemove', this)
					// window.addEventListener('wheel', this)

				} else {
					window.removeEventListener('mousemove', this)
					// window.removeEventListener('wheel', this)
				}
			break

			case 'wheel': this.onWheel(e)
			break

			case 'mousemove': this.onMove(e)
			break
		}
	},

	reset: function() {
		this.buttons.set(0, 0, 0)
		this.force.set(0, 0, 0)
		this.velocity.set(0, 0, 0)
	},

	update: function(dt) {
		if(this.rotation.distanceToSquared(this.object.rotation) > 1e-7) {
			this.rotation.copy(this.object.rotation)
			this.needsUpdateForce = true
		}

		if(this.needsUpdateForce) {
			this.needsUpdateForce = false
			this.updateForce()
		}

		var accelSum = 0
		for(var i = 0; i < dt; i++) accelSum += Math.pow(this.friction, i)

		this.delta.copy(this.force).multiplyScalar(accelSum)

		this.velocity.add(this.delta)
		this.velocityLength = this.velocity.length()

		this.moving = this.velocityLength > 1e-5
		if(this.moving) {
			this.delta.copy(this.velocity).multiplyScalar(accelSum)
			this.object.position.add(this.delta)
			this.velocity.multiplyScalar(Math.pow(this.friction, dt))

			this.changed = true
		}
	},

	updateForce: function() {
		this.acceleration = this.speed / 100000
		this.friction = Math.pow(0.75 + Math.min(this.speed / 20, 1) * 0.2, 60 / 1000)

		this.force.copy(this.buttons)
		if(this.force.lengthSq()) {
			this.direct.makeRotationFromEuler(this.object.rotation)
			this.force.applyMatrix4(this.direct)
			this.force.setLength(this.acceleration)
		}
	},

	rotate: function(yaw, pitch, roll) {
		if(!yaw && !pitch && !roll) return

		var rotation = this.object.rotation

		rotation.x -= this.rotationSpeed * pitch
		rotation.y -= this.rotationSpeed * yaw
		rotation.z -= this.rotationSpeed * roll

		this.needsUpdateForce = true
		this.changed = true
	},

	onWheel: function(e) {
		var delta = e.wheelDeltaY || -e.deltaY
		,   value = delta / Math.abs(delta)

		this.speed = THREE.Math.clamp(this.speed + value, 0, 5)
		this.needsUpdateForce = true
	},

	onMove: function(e) {
		var mx = e.movementX || 0
		,   my = e.movementY || 0
		,   mz = 0

		var x = this.object.rotation.x / (2 * Math.PI)
		if((((((x % 1) + 1) % 1) + 0.25) % 1) > 0.5) mx *= -1

		this.rotate(mx, my, mz)
	},

	onKey: function() {
		var left   = kbd.state.L_ARR || kbd.state.a
		,   right  = kbd.state.R_ARR || kbd.state.d
		,   up     = kbd.state.U_ARR || kbd.state.w
		,   down   = kbd.state.D_ARR || kbd.state.s
		,   jump   = kbd.state.SPACE
		,   crouch = kbd.state.SHIFT

		this.buttons.x = right - left
		this.buttons.y = jump - crouch
		this.buttons.z = down - up
		this.needsUpdateForce = true
	}
}
