function FileImport() {
	this.element = dom.div('file-import hand')
	this.events = new EventEmitter
	this.readerJSON = new FileReader

	this.input = dom.input('file', 'file-import')
	this.input.setAttribute('accept', '.json')


	Atlas.set(this.element, 'i-file-load', 'absmid')

	dom.on('load', this.readerJSON, this)
	dom.on('change', this.input, this)
	dom.on('tap', this.element, this)
	// dom.on('drop', window, this)
}

FileImport.prototype = {
	handleEvent: function(e) {
		switch(e.type) {
			case 'load':   return this.onReaderLoad(e)
			case 'change': return this.onInputChange(e)
			case 'drop':   return this.onDrop(e)
			case 'tap':    return this.onTap(e)
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
			src: this.file.name,
			object: object
		})
	},

	onInputChange: function(e) {
		var file = this.input.files[0]
		if(!file) return

		// currently support json
		this.importJSON(file)
		this.input.value = null
	},

	importJSON: function(file) {
		this.file = file
		this.readerJSON.readAsText(file)
	},

	onTap: function() {
		this.input.click()
	},

	onDrop: function(e) {
		console.log('drop', e)
	}
}
