THREE.DepthShader = {

	uniforms: {
		"normalDistance": { value: 1   }
	},

	// extensions: {
	// 	derivatives: true
	// },

	vertexShader: [
		'varying vec3 vPosition;',

		'void main() {',
			'vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );',

			// 'vPosition = vec3(modelMatrix * vec4( position, 1.0));',
			'vPosition = vec3(mvPosition);',

			'gl_Position = projectionMatrix * mvPosition;',
		'}'

	].join('\n'),

	fragmentShader: [

		'varying vec3 vPosition;',
		'uniform float normalDistance;',

		'//unpack a 32bit float from 4 8bit, [0;1] clamped floats',
		'float DecodeFloatRGBA( vec4 _packed)',
		'{',
			'vec4 rgba = 255.0 * _packed;',
			'float sign =  step(-128.0, -rgba[1]) * 2.0 - 1.0;',
			'float exponent = rgba[0] - 127.0;    ',
			'if (abs(exponent + 127.0) < 0.001)',
				'return 0.0;           ',
			'float mantissa =  mod(rgba[1], 128.0) * 65536.0 + rgba[2] * 256.0 + rgba[3] + float(0x800000);',
			'return sign *  exp2(exponent-23.0) * mantissa ;     ',
		'}',

		'//pack a 32bit float into 4 8bit, [0;1] clamped floats',
		'vec4 EncodeFloatRGBA(float f) {',
			'float F = abs(f); ',
			'if(F == 0.0)',
			'{',
				'return  vec4(0,0,0,0);',
			'}',
			'float Sign =  step(0.0, -f);',
			'float Exponent = floor( log2(F)); ',

			'float Mantissa = F/ exp2(Exponent); ',
			'if(Mantissa < 1.0)',
				'Exponent -= 1.0;',

			'Exponent +=  127.0;',

			'vec4 rgba;',
			'rgba[0] = Exponent;',
			'rgba[1] = 128.0 * Sign +  mod(floor(Mantissa * float(128.0)),128.0);',
			'rgba[2] = floor( mod(floor(Mantissa* exp2(float(23.0 - 8.0))), exp2(8.0)));',
			'rgba[3] = floor( exp2(23.0)* mod(Mantissa, exp2(-15.0)));',
			'return (1.0 / 255.0) * rgba;',
		'}',

		'void main(void) {',
			// 'gl_FragColor = vec4(30.0 * fwidth(length(vPosition)), 0.0, 0.0, 1.0);',
			// 'return;',

			// 'float distance = length(vPosition);',
			// 'distance += 2.0 * fwidth(length(vPosition));',

			// 'gl_FragColor = EncodeFloatRGBA(distance / normalDistance);',
			'gl_FragColor = EncodeFloatRGBA(gl_FragCoord.z / normalDistance);',

			// 'gl_FragColor = vec4(normalize(cross(dFdx(vPosition), dFdy(vPosition))) * 0.5 + 0.3, 1.0);',
			// 'gl_FragColor = vec4(length(vPosition.xyz) / normalDistance, 0.0, 0.0, 1.0);',
		'}'

	].join('\n')
}
