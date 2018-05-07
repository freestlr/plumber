/**
 * @author zz85 / http://www.lab4games.net/zz85/blog
 *
 * Two pass Gaussian blur filter (horizontal and vertical blur shaders)
 * - described in http://www.gamerendering.com/2008/10/11/gaussian-blur-filter-shader/
 *   and used in http://www.cake23.de/traveling-wavefronts-lit-up.html
 *
 * - 9 samples per pass
 * - standard deviation 2.7
 * - "h" and "v" parameters should be set to "1 / width" and "1 / height"
 */

THREE.HorizontalBlurShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"width":    { value: 512.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float width;",

		"varying vec2 vUv;",

		"void main() {",

			"float h = 1.0 / width;",
			"vec4 sum = vec4( 0.0 );",

			"vec4 texn4 = texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) );",
			"vec4 texn3 = texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) );",
			"vec4 texn2 = texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) );",
			"vec4 texn1 = texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) );",
			"vec4 texc0 = texture2D( tDiffuse, vec2( vUv.x, vUv.y ) );",
			"vec4 texp1 = texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) );",
			"vec4 texp2 = texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) );",
			"vec4 texp3 = texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) );",
			"vec4 texp4 = texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) );",

			"vec4 col = max(texn4, max(texn3, max(texn2, max(texn1, max(texc0, max(texp1, max(texp2, max(texp3, texp4))))))));",

			// "gl_FragColor = sum;",
			"gl_FragColor = vec4(col.rgb, texc0.a * 0.1633",
				"+ texn4.a * 0.051 + texn3.a * 0.0918 + texn2.a * 0.12245 + texn1.a * 0.1531",
				"+ texp4.a * 0.051 + texp3.a * 0.0918 + texp2.a * 0.12245 + texp1.a * 0.1531);",

		"}"

	].join( "\n" )

};
