function Dialog(auto) {
	this.auto = auto

	this.shadowy = {}
	this.scaling = {}
	this.opacity = {}

	this.events = new EventEmitter

	this.easeShadowy = new TWEEN.Tween(this.shadowy)
		.easing(TWEEN.Easing.Cubic.InOut)
		.onUpdate(this._updateShadowy, this)

	this.easeScaling = new TWEEN.Tween(this.scaling)
		.easing(TWEEN.Easing.Cubic.InOut)
		.onUpdate(this._updateScaling, this)

	this.easeOpacity = new TWEEN.Tween(this.opacity)
		.easing(TWEEN.Easing.Cubic.InOut)
		.onUpdate(this._updateOpacity, this)

	this.__proceed = this._proceed.bind(this)

	this.setup()
	this.reset()
	Dialog.windows.push(this)

	if(this.parent) this.parent.appendChild(this.element)
}

Dialog.windows = []

Dialog.prototype = {

	auto  : false,
	opened: false,
	parent: null,
	OFF: { value: 0 },
	ON : { value: 1 },
	bgcolor: [0, 0, 0],

	shadowyDuration: 150,
	scalingDuration: 300,
	opacityDuration: 300,

	setup: function() {
		var modal = document.createElement('div'),
			outer = document.createElement('div'),
			inner = document.createElement('div'),
			close = document.createElement('div'),
			black = document.createElement('div')

		modal.className = 'dialog absmid'
		outer.className = 'dialog-outer absmid'
		inner.className = 'dialog-inner'
		close.className = 'dialog-close hand'
		black.className = 'dialog-black hand'

		modal.appendChild(black)
		modal.appendChild(outer)
		outer.appendChild(inner)
		outer.appendChild(close)

		black.addEventListener('tap', this.events.will('dismiss'), false)
		close.addEventListener('tap', this.events.will('dismiss'), false)

		if(this.auto) {
			this.events.on('dismiss', this.close, this)
		}

		this.element = modal
		this.content = inner
		this.elements = {
			modal: modal,
			outer: outer,
			inner: inner,
			close: close,
			black: black
		}
	},

	resize: function(w, h) {
		this.elements.outer.style.width  = w +'px'
		this.elements.outer.style.height = h +'px'
	},

	open: function() {
		if(this.opened) return

		this.reset()
		this.opened = true
		this.animation = this.showAnimation
		this.events.emit('open')
		this._proceed()
	},

	close: function() {
		if(!this.opened) return

		this.reset()
		this.opened = false
		this.animation = this.hideAnimation
		this.events.emit('close')
		this._proceed()
	},

	reset: function() {
		var value = this.opened ?        1  :       0,
			style = this.opened ? 'visible' : 'hidden'

		this.element.style.visibility = style

		clearTimeout(this.timer)

		this.easeShadowy.stop()
		this.easeOpacity.stop()
		this.easeScaling.stop()

		this.shadowy.value = value
		this.scaling.value = value
		this.opacity.value = value

		this._updateShadowy()
		this._updateScaling()
		this._updateOpacity()

		this.stage = -1

		if(this.animation) {
			delete this.animation
			this.events.emit(this.opened ? 'visible' : 'hidden')
		}
	},

	_proceed: function() {
		if(++this.stage < this.animation.length) {
			var delay = this.animation[this.stage].call(this)
			this.timer = setTimeout(this.__proceed, delay)

		} else {
			delete this.animation
			this.events.emit(this.opened ? 'visible' : 'hidden')
		}
	},

	showAnimation: [
		function() {
			this.elements.modal.style.visibility = 'visible'
			this.easeScaling.to(this.ON, this.scalingDuration).start()
			this.easeShadowy.to(this.ON, this.shadowyDuration).start()
			return this.scalingDuration
		},
		function() {
			this.easeOpacity.to(this.ON, this.opacityDuration).start()
			return this.opacityDuration
		}
	],

	hideAnimation: [
		function() {
			this.easeOpacity.to(this.OFF, this.opacityDuration).start()
			return this.opacityDuration
		},
		function() {
			this.easeScaling.to(this.OFF, this.scalingDuration).start()
			this.easeShadowy.to(this.OFF, this.shadowyDuration).start()
			return this.scalingDuration
		},
		function() {
			this.elements.modal.style.visibility = 'hidden'
			return 0
		}
	],

	_updateShadowy: function() {
		var color = this.bgcolor.concat(this.shadowy.value / 2)
		this.elements.modal.style.backgroundColor = 'rgba('+ color +')'
	},

	_updateScaling: function() {
		var style = this.elements.outer.style,
			scale = 'scaleY('+ this.scaling.value +')'

		style.webkitTransform = scale
		style.   mozTransform = scale
		style.    msTransform = scale
		style.     OTransform = scale
		style.      transform = scale
	},

	_updateOpacity: function() {
		this.elements.inner.style.opacity = this.opacity.value
	},

	constructor: Dialog
}
