!function() {
	var nextFrame =
		window.      requestAnimationFrame ||
		window.     ORequestAnimationFrame ||
		window.    msRequestAnimationFrame ||
		window.   mozRequestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		function(fn) { return setTimeout(fn, 1000 / 60) }

	var frameCount = 0
	,   frameStart = 0

	function loop() {
		nextFrame(loop)
		frameCount++

		var frameTime  = Date.now()
		,   frameDelta = frameTime - frameStart

		if(frameDelta > 1000) {
			document.title = (frameCount / frameDelta * 1000 |0) +' fps'

			frameCount = 0
			frameStart = frameTime
		}
	}

	loop()
}()
