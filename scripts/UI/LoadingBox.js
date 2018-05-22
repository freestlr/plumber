UI.LoadingBox = f.unit(Block, {
	unitName: 'UI_LoadingBox',
	ename: 'loading-box absmid out-03 hidden',

	progress: null,
	hidden: true,
	blocksCount: 10,

	create: function() {
		this.blocks = []
		for(var i = 0; i < this.blocksCount; i++) {
			this.blocks.push(dom.div('loading-block', this.element))
		}

		this.setProgress(0)
	},

	visibleMethod: function(element, visible) {
		dom.togclass(this.element, 'hidden', !visible)
	},

	setProgress: function(progress) {
		if(this.progress === progress) return
		this.progress = progress

		var blox = this.blocks.length
		,   prog = f.clamp(progress, 0, 1) * blox
		,   full = Math.floor(prog)
		,   frac = prog - full

		for(var i = 0; i < blox; i++) {
			this.blocks[i].style.opacity = i < full ? 1 : i > full ? 0 : frac
		}
	}
})
