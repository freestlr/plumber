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


		// this.label = dom.div('marker-info', this.content)
		// dom.text(this.label, node.sample.src)
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
			},

			items: [{
				action: 'node_explode',
				eicon: 'i-explode',
				reset: false,
				hidden: !upcon,
				active: upcon && !upcon.connected.tween.target.connected,
				events: { 'hover': this.onHoverButton }

			}, {
				action: 'node_rotate',
				eicon: 'i-rotate',
				events: { 'hover': this.onHoverButton }

			}, {
				action: 'node_delete',
				eicon: 'i-delete'

			}, {
				eicon: 'i-info',
				hidden: !this.node.sample.link,
				etag: 'a',
				attr: {
					'href': this.node.sample.link,
					'target': '_blank'
				}
			}]
		})
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
