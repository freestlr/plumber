function FileImport() {
	this.element = dom.div('file-import hand')
	this.events = new EventEmitter

	this.input = dom.input('file')
	this.input.setAttribute('accept', '.json, .fbx, .obj')
	this.input.setAttribute('multiple', 'multiple')


	Atlas.set(this.element, 'i-file-load', 'absmid')

	dom.on('change', this.input, f.binds(this.onInputChange, this))
	dom.on('tap', this.element, f.binds(this.input.click, this.input))
}

FileImport.prototype = {
	onInputChange: function() {
		for(var i = 0; i < this.input.files.length; i++) {
			this.events.emit('import', this.input.files[i])
		}

		this.input.value = null
	}
}
