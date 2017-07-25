UI.ElementHint = f.unit(Block, {
	unitName: 'UI_ElementHint',
	ename: 'element-hint',

	target: null,
	animationTime: 500,

	create: function() {
		this.initPosition = {}
		this.createTweens()

		this.top    = dom.div('hint-disabled-zone', this.element)
		this.right  = dom.div('hint-disabled-zone', this.element)
		this.bottom = dom.div('hint-disabled-zone', this.element)
		this.left   = dom.div('hint-disabled-zone', this.element)

		dom.on('resize', window, f.binds(this.resize, this))
	},

	createTweens: function() {
		this.transitionTween = new TWEEN.Tween({})
			.easing(TWEEN.Easing.Cubic.Out)
			.to({}, this.animationTime)
			.onUpdate(this.updateTween, this)
			.onComplete(this.onAnimationEnd, this)
	},

	updateTween: function() {
		var pos = this.transitionTween.source

		var st = this.top.style
		,   sr = this.right.style
		,   sb = this.bottom.style
		,   sl = this.left.style

		st.width  = pos.tw +'px'
		st.height = pos.th +'px'
		st.left   = pos.tx +'px'
		st.top    = pos.ty +'px'

		sr.width  = pos.rw +'px'
		sr.height = pos.rh +'px'
		sr.left   = pos.rx +'px'
		sr.top    = pos.ry +'px'

		sb.width  = pos.bw +'px'
		sb.height = pos.bh +'px'
		sb.left   = pos.bx +'px'
		sb.top    = pos.by +'px'

		sl.width  = pos.lw +'px'
		sl.height = pos.lh +'px'
		sl.left   = pos.lx +'px'
		sl.top    = pos.ly +'px'
	},

	open: function(target) {
		if(!this.target && !target) return

		if(!this.target) {
			this.getWindowSize()
			f.copy(this.transitionTween.source, this.initPosition)
		}

		this.target = target

		if(this.target) {
			this.updateDisplay()
		}

		this.getTargetPosition()
		this.transitionTween.start()
	},

	getWindowSize: function() {
		var ww = window.innerWidth
		,   wh = window.innerHeight
		,   pos = this.initPosition

		pos.tx = 0
		pos.ty = 0
		pos.rx = ww
		pos.ry = 0
		pos.bx = 0
		pos.by = wh
		pos.lx = 0
		pos.ly = 0

		pos.tw = ww
		pos.th = 0
		pos.rw = 0
		pos.rh = wh
		pos.bw = ww
		pos.bh = 0
		pos.lw = 0
		pos.lh = wh
	},

	getTargetPosition: function() {
		this.getWindowSize()

		var pos = this.transitionTween.target

		if(this.target) {
			var targetOffset = dom.offset(this.target, null, true)

			var tx = targetOffset.x
			,   ty = targetOffset.y
			,   tw = this.target.offsetWidth
			,   th = this.target.offsetHeight
			,   ww = window.innerWidth
			,   wh = window.innerHeight


			pos.tw = pos.bw = tw
			pos.lh = pos.rh = wh

			pos.th = ty
			pos.rw = ww - tx - tw
			pos.bh = wh - ty - th
			pos.lw = tx

			pos.ty = 0
			pos.tx = tx

			pos.ry = 0
			pos.rx = tx + tw

			pos.by = ty + th
			pos.bx = tx

			pos.ly = 0
			pos.lx = 0

		} else {
			f.copy(pos, this.initPosition)
		}
	},

	resize: function() {
		if(this.target) {
			this.getTargetPosition()
			f.copy(this.transitionTween.source, this.transitionTween.target)
			this.updateTween()
		}
	},

	updateDisplay: function() {
		var display = this.target ? 'block' : 'none'

		this.top.style.display    = display
		this.right.style.display  = display
		this.bottom.style.display = display
		this.left.style.display   = display
	},

	onAnimationEnd: function() {
		this.updateDisplay()
		this.events.emit('hint_animation_end')
	}
})
