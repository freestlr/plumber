function FileImport() {
	this.events = new EventEmitter
	this.readerJSON = new FileReader

	this.input = dom.input('file', 'file-import')
	this.input.setAttribute('accept', '.json')

	dom.on('load', this.readerJSON, this)
	dom.on('change', this.input, this)
	dom.on('drop', window, this)
}

FileImport.prototype = {
	handleEvent: function(e) {
		switch(e.type) {
			case 'load':   return this.onReaderLoad(e)
			case 'change': return this.onInputChange(e)
			case 'drop':   return this.onDrop(e)
		}
	},

	onReaderLoad: function() {
		try {
			var data = JSON.parse(this.readerJSON.result)
			var object = new THREE.ObjectLoader().parse(data)

		} catch(e) {
			console.warn('bad json file', e)
			return
		}

		this.events.emit('import', {
			id: this.file.name,
			name: this.file.name,
			object: object
		})
	},

	onInputChange: function(e) {
		var file = this.input.files[0]
		if(!file) return


		this.file = file
		// currently support json
		this.readerJSON.readAsText(file)
		this.input.value = null
	},

	onDrop: function(e) {
		console.log('drop', e)
	}
}
