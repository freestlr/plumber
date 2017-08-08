function FileImport() {
	this.element = dom.div('file-import hand')
	this.events = new EventEmitter

	this.input = dom.input('file')
	this.input.setAttribute('accept', '.json')


	Atlas.set(this.element, 'i-file-load', 'absmid')

	dom.on('change', this.input, f.binds(this.onInputChange, this))
	dom.on('tap', this.element, f.binds(this.input.click, this.input))
}

FileImport.prototype = {
	onInputChange: function() {
		var file = this.input.files[0]
		if(!file) return

		this.events.emit('import', file)
		this.input.value = null
	}
}
