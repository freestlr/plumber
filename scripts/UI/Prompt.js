UI.Prompt = f.unit(Block.Tip, {
	unitName: 'Block_Tip',
	ename: 'prompt prompt-tip tip',

	integerPosition: true,
	distance: 8,
	arrowPadding: 8,
	animationTime: 200,

	buttonsTemplate: {
		ename: 'prompt-button'
	},


	create: function() {
		// var text = dom.div('prompt-text', this.content)
		// ,   ok   = dom.div('prompt-button hand prompt-button-ok', this.content)
		// ,   no   = dom.div('prompt-button hand prompt-button-cancel', this.content)

		// dom.text(ok, 'Yes')
		// dom.text(no, 'No')

		// this.watchEvents.push(
		// 	new EventHandler(this.deleteNode, this).listen('tap', ok),
		// 	new EventHandler(this.closeDeletePrompt, this).listen('tap', no))

		this.buttons = new Block.Menu({
			eroot: this.content,
			ename: 'prompt-button-list',

			template: this.protomerge('buttonsTemplate'),
			items: this.buttons
		})

	},

	createPost: function() {
		dom.append(this.content, this.buttons.element)
	}
})
