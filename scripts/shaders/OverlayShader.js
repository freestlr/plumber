
THREE.OverlayShader = {

	uniforms: {
		'tDiffuse': { value: null },
		'resolution': { value: new THREE.Vector2( 1/1024, 1/512 ) },
		'drawColor': { value: new THREE.Color(1, 1, 1) },
		'drawAlpha': { value: 1.0 },
		'lineAlpha': { value: 0.4 },
		'lineAngle': { value: 0.0 },
		'edgeAlpha': { value: 0.8 },
		'fillAlpha': { value: 0.1 }
	},

	vertexShader: [

		'void main() {',
			// 'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
			'gl_Position = vec4(position, 1.0);',
		'}'

	].join('\n'),

	fragmentShader: [

		'uniform sampler2D tDiffuse;',
		'uniform vec2 resolution;',
		'uniform vec3  drawColor;',
		'uniform float drawAlpha;',
		'uniform float lineAlpha;',
		'uniform float lineAngle;',
		'uniform float fillAlpha;',
		'uniform float edgeAlpha;',

		/*

		'float edgeBasic(sampler2D image, vec2 pixel) {',
			'vec4 mtl = texture2D(image, pixel + resolution * vec2(-1.0,  1.0));',
			'vec4 mtc = texture2D(image, pixel + resolution * vec2( 0.0,  1.0));',
			'vec4 mtr = texture2D(image, pixel + resolution * vec2( 1.0,  1.0));',
			'vec4 mcl = texture2D(image, pixel + resolution * vec2(-1.0,  0.0));',
			'vec4 mcc = texture2D(image, pixel + resolution * vec2( 0.0,  0.0));',
			'vec4 mcr = texture2D(image, pixel + resolution * vec2( 1.0,  0.0));',
			'vec4 mbl = texture2D(image, pixel + resolution * vec2(-1.0, -1.0));',
			'vec4 mbc = texture2D(image, pixel + resolution * vec2( 0.0, -1.0));',
			'vec4 mbr = texture2D(image, pixel + resolution * vec2( 1.0, -1.0));',

			'float dtl = abs(mtl.r - mcc.r) / 2.0;',
			'float dtc = abs(mtc.r - mcc.r) / 1.0;',
			'float dtr = abs(mtr.r - mcc.r) / 2.0;',
			'float dcl = abs(mcl.r - mcc.r) / 1.0;',
			'float dcr = abs(mcr.r - mcc.r) / 1.0;',
			'float dbl = abs(mbl.r - mcc.r) / 2.0;',
			'float dbc = abs(mbc.r - mcc.r) / 1.0;',
			'float dbr = abs(mbr.r - mcc.r) / 2.0;',

			'return 0.4 * (dtl + dtc + dtr + dcl + dcr + dbl + dbc + dbr);',
		'}',

		'float edgeFreiChen(sampler2D image, vec2 pixel) {',
			'float n1 = 0.3535533845424652;',
			'float n2 = 0.1666666716337204;',
			'float n3 = 0.1666666716337204;',
			'float n4 = 0.6666666865348816;',

			"mat3 I;",
			"mat3 G[9];",
			"G[0] = mat3( n1, 0, -n1, 0.5, 0, -0.5, n1, 0, -n1 );",
			"G[1] = mat3( n1, 0.5, n1, 0, 0, 0, -n1, -0.5, -n1 );",
			"G[2] = mat3( 0, n1, -0.5, -n1, 0, n1, 0.5, -n1, 0 );",
			"G[3] = mat3( 0.5, -n1, 0, -n1, 0, n1, 0, n1, -0.5 );",
			"G[4] = mat3( 0, -0.5, 0, 0.5, 0, 0.5, 0, -0.5, 0 );",
			"G[5] = mat3( -0.5, 0, 0.5, 0, 0, 0, 0.5, 0, -0.5 );",
			"G[6] = mat3( n2, -n3, n2, -n3, n4, -n3, n2, -n3, n2 );",
			"G[7] = mat3( -n3, n2, -n3, n2, n4, n2, -n3, n2, -n3 );",
			"G[8] = mat3( n3, n3, n3, n3, n3, n3, n3, n3, n3 );",

			// fetch the 3x3 neighbourhood and use the RGB vector's length as intensity value
			"vec3 sample;",
			"for (float i=0.0; i<3.0; i++) {",
				"for (float j=0.0; j<3.0; j++) {",
					"sample = texture2D(image, pixel + resolution * vec2(i-1.0,j-1.0) ).rgb;",
					"I[int(i)][int(j)] = length(sample);",
				"}",
			"}",

			// calculate the convolution values for all the masks
			"float cnv[9];",
			"for (int i=0; i<9; i++) {",
				"float dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);",
				"cnv[i] = dp3 * dp3;",
			"}",

			"float M = (cnv[0] + cnv[1]) + (cnv[2] + cnv[3]);",
			"float S = (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]) + (cnv[8] + M);",

			"return sqrt(M / S);",
		'}',

		'float edgeSobel(sampler2D image, vec2 pixel) {',
			"mat3 I;",
			"mat3 G[2];",
			"G[0] = mat3( 1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0 );",
			"G[1] = mat3( 1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0 );",

			// fetch the 3x3 neighbourhood and use the RGB vector's length as intensity value
			"vec3 sample;",
			"for (float i=0.0; i<3.0; i++)",
			"for (float j=0.0; j<3.0; j++) {",
				"sample = texture2D(image, pixel + resolution * vec2(i-1.0,j-1.0) ).rgb;",
				"I[int(i)][int(j)] = length(sample);",
			"}",

			// calculate the convolution values for all the masks
			"float cnv[2];",
			"for (int i=0; i<2; i++) {",
				"float dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);",
				"cnv[i] = dp3 * dp3; ",
			"}",

			"return 0.017 * sqrt(cnv[0]*cnv[0]+cnv[1]*cnv[1]);",
		'}',

		*/

		'float drawLine(float angle, float step, float thick) {',
			'float pi = 3.141592653589793;',

			'float kx = cos(angle / 180.0 * pi);',
			'float ky = sin(angle / 180.0 * pi);',
			'float ks = thick / step;',
			'float len = dot(gl_FragCoord.xy, vec2(kx, ky));',
			'float dist = abs((2.0 * mod(len, step) / step) - 1.0);',

			'return clamp((ks - dist) * (1.0 / ks), 0.0, 1.0);',
		'}',

		'void main() {',
			'vec2 pixel = gl_FragCoord.xy * resolution;',

			'vec4 mtl = texture2D(tDiffuse, pixel + resolution * vec2(-1.0,  1.0));',
			'vec4 mtc = texture2D(tDiffuse, pixel + resolution * vec2( 0.0,  1.0));',
			'vec4 mtr = texture2D(tDiffuse, pixel + resolution * vec2( 1.0,  1.0));',
			'vec4 mcl = texture2D(tDiffuse, pixel + resolution * vec2(-1.0,  0.0));',
			'vec4 mcc = texture2D(tDiffuse, pixel + resolution * vec2( 0.0,  0.0));',
			'vec4 mcr = texture2D(tDiffuse, pixel + resolution * vec2( 1.0,  0.0));',
			'vec4 mbl = texture2D(tDiffuse, pixel + resolution * vec2(-1.0, -1.0));',
			'vec4 mbc = texture2D(tDiffuse, pixel + resolution * vec2( 0.0, -1.0));',
			'vec4 mbr = texture2D(tDiffuse, pixel + resolution * vec2( 1.0, -1.0));',

			'vec4 hi = max(mtl, max(mtc, max(mtr,',
			          'max(mcl, max(mcc, max(mcr,',
			          'max(mbl, max(mbc,     mbr))))))));',

			'vec3 pcc = mcc.rgb;',
			'float dtl = length(mtl.rgb - pcc) > 0.0 ? 1.0 : 0.0;',
			'float dtc = length(mtc.rgb - pcc) > 0.0 ? 1.0 : 0.0;',
			'float dtr = length(mtr.rgb - pcc) > 0.0 ? 1.0 : 0.0;',
			'float dcl = length(mcl.rgb - pcc) > 0.0 ? 1.0 : 0.0;',
			'float dcr = length(mcr.rgb - pcc) > 0.0 ? 1.0 : 0.0;',
			'float dbl = length(mbl.rgb - pcc) > 0.0 ? 1.0 : 0.0;',
			'float dbc = length(mbc.rgb - pcc) > 0.0 ? 1.0 : 0.0;',
			'float dbr = length(mbr.rgb - pcc) > 0.0 ? 1.0 : 0.0;',

			'float edge = 0.4 * (dtl * 0.5 + dtc + dtr * 0.5 + dcl + dcr + dbl * 0.5 + dbc + dbr * 0.5);',

			'float fill = mcc.a > 0.0 ? 1.0 : 0.0;',
			'float line1 = drawLine(-30.0 + lineAngle, 10.0, 2.0);',
			'float line2 = drawLine( 80.0 + lineAngle, 20.0, 2.0);',

			'float level = 0.0;',
			// 'level += edgeAlpha * edgeBasic(tDiffuse, pixel);',
			'level += edgeAlpha * edge;',
			'level += lineAlpha * max(fill * line1 * 0.9, fill * line2 * 0.3);',
			'level += fillAlpha * fill;',

			'if(level > 0.0) {',
				// 'gl_FragColor = vec4(drawColor, drawAlpha * level);',
				'gl_FragColor = vec4(mix(hi.rgb, mcc.rgb, fill), hi.a * level);',
			'} else {',
				'gl_FragColor = vec4(0.0);',
			'}',
		'}'

	].join('\n')
}
