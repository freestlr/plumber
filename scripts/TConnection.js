TConnection = f.unit({
	unitName: 'TConnection',

	transitionStages: null,
	transitionTime: null,

	transitionStageDuration: {
		approachDelay: 100,
		approachTime: 1200,
		screwDelay: 100,
		screwTime: 1200
	},

	init: function(node, joint, index) {
		this.node   = node
		this.index  = index
		this.target = null
		this.master = null
		this.connected = null
		this.blocked = false

		this.inactive = new Gate(Gate.AND, false)

		this.events = new EventEmitter
		this.object = new THREE.Object3D
		this.object.name = 'TN'+ this.node.id + '-TC'+ this.index

		this.joint = joint.clone()

		this.depth = parseFloat(this.joint.depth) || 0
		this.screw = this.joint.extra === 'screw'
		this.rotar = 0

		this.connTween = new TWEEN.Tween({ connected: 1 })
			.to({ connected: 1 }, 1000)
			.easing(TWEEN.Easing.Linear.None)
			.onStart(this.onTweenStart, this)
			.onUpdate(this.onTweenUpdate, this)
			.onComplete(this.onTweenComplete, this)
			.onStop(this.onTweenComplete, this)

		this.rotaTween = new TWEEN.Tween({ angle: 0 })
			.to({ angle: 0 }, 277)
			.easing(TWEEN.Easing.Cubic.Out)
			.onStart(this.onTweenStart, this)
			.onUpdate(this.onRotaTweenUpdate, this)
			.onComplete(this.onTweenComplete, this)
			.onStop(this.onTweenComplete, this)

		this.marker = new UI.Marker({
			connection: this
		})


		this.pointInner = new THREE.Vector3
		this.pointOuter = new THREE.Vector3


		// this.connectionTip = this.joint.makeDebugTip(main.imagery.materials.normat)
		// this.joint.matrix.decompose(
		// 	this.connectionTip.position,
		// 	this.connectionTip.rotation,
		// 	this.connectionTip.scale)

		// this.node.object.add(this.connectionTip)

		this.updatePosition()
	},

	updatePosition: function() {
		this.pointInner.copy(this.joint.point)
		this.pointOuter.copy(this.joint.normal).setLength(this.depth).add(this.joint.point)
	},


	onTweenUpdate: function() {
		this.transitionProgress(this.connTween.source.connected)
	},

	onTweenStart: function() {
		this.animating = true
		this.events.emit('animate_start', this)
	},

	onTweenComplete: function() {
		this.animating = false
		this.events.emit('animate_end', this)
	},



	getTransitionStages: function() {
		if(!this.connected || !this.master) return [0]

		var depth = this.depth + this.connected.depth
		var dur = this.transitionStageDuration

		if(depth > 0) {
			return [dur.approachDelay, dur.approachTime, dur.screwDelay, dur.screwTime]

		} else {
			return [dur.approachDelay, dur.approachTime]
		}
	},

	transitionProgress: function(progress) {
		if(!this.connected || !this.master || !this.transitionTime) return

		var master = this
		,   slave = this.connected

		var timeNow = Math.max(0, Math.min(1, progress)) * this.transitionTime

		var stages = this.transitionStages
		,   stageTime = 0
		,   stageIndex = -1
		,   stageProgress = 0

		var easing = TWEEN.Easing.Cubic.InOut
		for(var i = 0; i < stages.length; i++) {
			stageTime = stages[i]

			if(timeNow <= stageTime) {
				stageIndex = i
				stageProgress = easing(timeNow / stageTime)
				break
			}

			timeNow -= stageTime
		}


		// var d0 = master.depth
		// ,   d1 = slave.depth

		// var depth = d0 && d1 ? Math.min(d0, d1) : d0 + d1

		var depth = master.depth + slave.depth
		,   screw = master.screw || slave.screw ? Math.PI * 2 : 0
		,   distance = (master.node.sample.dim.length + slave.node.sample.dim.length) /4


		var par_distance = 0
		,   par_screw = 0
		switch(stageIndex) {
			case -1: return

			case 0:
				par_distance = depth + distance
				par_screw = screw
			break

			case 1:
				par_distance = depth + distance * (1 - stageProgress)
				par_screw = screw
			break

			case 2:
				par_distance = depth
				par_screw = screw
			break

			case 3:
				par_distance = depth * (1 - stageProgress)
				par_screw = screw * (1 - stageProgress)
			break
		}

		master.object.quaternion.setFromAxisAngle(master.joint.normal, par_screw)
		slave.object.position.copy(master.joint.normal).setLength(par_distance)
	},

	playConnection: function(to, from, timeScale) {
		if(!this.connected || !this.master) return

		var duration = this.transitionStages.reduce(f.sum)
		if(!isNaN(timeScale)) {
			duration *= timeScale
		}

		if(to != null) {
			this.connTween.target.connected = +to
		} else {
			this.connTween.target.connected = 1
		}
		if(from != null) {
			this.connTween.source.connected = +from
		}

		this.onTweenUpdate()

		if(duration) {
			this.connTween.duration(duration).start()

		} else {
			this.object.updateMatrixWorld()
		}
	},



	getOuterPosition: function(target) {
		if(!target) target = new THREE.Vector3

		target.copy(this.pointOuter).applyMatrix4(this.node.object.matrixWorld)
		return target
	},

	getInnerPosition: function(target) {
		if(!target) target = new THREE.Vector3

		target.copy(this.pointInner).applyMatrix4(this.node.object.matrixWorld)
		return target
	},


	canConnect: function(con) {
		return !this.blocked && this.joint.canConnect(con.joint)
	},

	canConnectList: function(list) {
		return list.filter(this.canConnect, this)
	},

	/**             |--- d ----|
	 *
	 * node --- master --||-- slave  -
	 *                      \    \    \ d
	 *                       r -  \    \
	 *                           node  -
	 *
	 */
	connect: function(node) {
		if(this.connected) return

		this.setConnection(this, node, true, true)
	},

	disconnect: function() {
		if(!this.connected) return

		var master = this.master ? this : this.connected
		,   slave = this.master ? this.connected : this

		this.setConnection(master, slave, false, true)
	},

	setConnection: function(master, slave, on, emitEvent) {
		if(on) {
			var slaveIn = new THREE.Vector3
			,   slaveUp = new THREE.Vector3

			master.node.object.add(master.object)

			master.object.position.copy(master.joint.point)
			master.object.quaternion.set(0, 0, 0, 1)
			master.object.add(slave.object)

			slaveIn.copy(slave.joint.normal).negate()
			slave.object.position.set(0, 0, 0)
			slave.object.quaternion.setFromUnitVectors(slaveIn, master.joint.normal)
			slaveUp.copy(slave.joint.up).applyQuaternion(slave.object.quaternion)
			slave.object.rotateOnAxis(slaveIn, -master.joint.up.angleTo(slaveUp))
			slave.object.add(slave.node.object)

			slave.node.object.position.copy(slave.joint.point).negate()
			slave.node.object.quaternion.set(0, 0, 0, 1)

		} else {
			master.object.remove(slave.object)
		}


		master.master    = on ? true       : null
		master.connected = on ? slave      : null
		master.target    = on ? slave.node : null

		slave.master      = on ? false       : null
		slave.connected   = on ? master      : null
		slave.target      = on ? master.node : null

		slave.node.upcon  = on ? slave       : null
		slave.node.upnode = on ? master.node : null

		if(on) {
			this.transitionStages = this.getTransitionStages()
			this.transitionTime = this.transitionStages.reduce(f.sum)
		}

		master.node.events.unlink(slave.node.events)
		if(on) {
			slave.node.events.link(master.node.events)
		} else {
			slave.node.events.unlink(master.node.events)
		}

		if(emitEvent) {
			master.events.emit(on ? 'connect' : 'disconnect', [master, slave])
			slave .events.emit(on ? 'connect' : 'disconnect', [slave, master])
		}
	},

	goMaster: function() {
		if(!this.connected || this.master) return

		var angle = this.rotar
		this.rotate(-angle)
		this.setConnection(this, this.connected, true)
		this.connected.rotate(angle)

		this.connTween
			.from(this.connected.connTween.source)
			.to(this.connected.connTween.target)

		if(this.connected.connTween.playing) {
			this.connected.connTween.stop()

			this.connTween.start()
		}

		this.onTweenUpdate()
	},

	rotate: function(angle, animate) {
		if(!this.connected) return

		if(this.master) {
			return this.connected.rotate(angle, animate)
		}

		this.rotar += angle
		this.rotaTween.target.angle = this.rotar

		if(animate) {
			this.rotaTween.start()

		} else {
			this.rotaTween.source.angle = this.rotar
			this.object.rotateOnAxis(this.joint.normal, angle)
			this.object.updateMatrixWorld()
		}
	},

	onRotaTweenUpdate: function() {
		this.object.rotateOnAxis(this.joint.normal, this.rotaTween.delta.angle)
	},

	destroy: function() {
		this.marker.destroy()
	},



	attachControl: function(control) {
		if(!control) return

		this.control = control
		this.controlObject = new THREE.Object3D

		this.joint.matrix.decompose(
			this.controlObject.position,
			this.controlObject.rotation,
			this.controlObject.scale)


		this.node.object.add(this.controlObject)

		control.attach(this.controlObject)
	},

	updateControl: function() {
		if(!this.controlObject) return

		this.joint.setMatrix(this.controlObject.matrix)
		this.updatePosition()


		var con = this.connected
		if(con) {
			if(this.master) this.connect(con)
			else con.connect(this)
		}
	},

	detachControl: function() {
		if(!this.control) return

		this.control.detach()
		this.node.object.remove(this.controlObject)

		delete this.controlObject
		delete this.control
	}
})
