UI.NodeMarker = f.unit(UI.Marker, {
	unitName: 'UI_NodeMarker',
	ename: 'node-marker marker hand',

	node: null,
	align: 'bottom',
	integerPosition: true,
	undisposable: true,

	create: function() {
		dom.remclass(this.content, 'marker-interactive')

		var upcon = this.node.upcon


		dom.text(this.elemInfo, '['+ this.node.id +'] '+ this.node.sample.src)
		dom.addclass(this.elemInfo, 'marker-label')

		this.buttons = new Block.List({
			element: this.content,

			events: { 'block_add': this.onAddButton },
			eventScope: this,

			template: {
				factory: Block.Toggle,
				ename: 'marker-action out-02',
				einam: '',
				eventScope: this,
				reset: true
			}
		})

		if(upcon) {
			this.buttons.addItem({
				action: 'node_explode',
				attr: { icon: 'i-explode' },
				reset: false,
				active: !upcon.connected.connTween.target.connected,
				events: { 'hover': this.onHoverButton }
			})
			this.buttons.addItem({
				action: 'node_rotate',
				attr: { icon: 'i-rotate' },
				events: { 'hover': this.onHoverButton }
			})
		}
		if(true) {
			this.buttons.addItem({
				action: 'node_delete',
				attr: { icon: 'i-delete' }
			})
		}
		if(this.node.sample.link) {
			this.buttons.addItem({
				etag: 'a',
				attr: {
					'icon': 'i-info',
					'href': this.node.sample.link,
					'target': '_blank'
				}
			})
		}
	},

	onAddButton: function(block) {
		if(block.action) {
			block.events.on(
				block.reset ? 'active' : 'change',
				this.events.will(block.action, this.node))
		}
	},

	onHoverButton: function(enabled) {
		this.events.emit('node_parent', [this.node, enabled])
	}
})
