THREE.FillShader = {

	uniforms: {
		'color': { value: new THREE.Color(1, 1, 1) },
		'alpha': { value: 1.0 },
		'lineAlpha': { value: 1.0 },
		'fillAlpha': { value: 0.2 },
	},

	vertexShader: [

		'void main() {',
			'gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
			// 'gl_Position = vec4(position, 1.0);',
		'}'

	].join('\n'),

	fragmentShader: [
		'uniform vec3  color;',
		'uniform float alpha;',
		'uniform float lineAlpha;',
		'uniform float fillAlpha;',

		'#define PI 3.141592653589793',
		'#define XRAD 0.017453292519943295',

		'float drawLine(float angle, float step, float thick) {',
			'float a = angle * XRAD;',
			'float ks = thick / step;',
			'float len = dot(gl_FragCoord.xy, vec2(cos(a), sin(a)));',
			'float dist = abs((2.0 * mod(len, step) / step) - 1.0);',

			'return clamp((ks - dist) / ks, 0.0, 1.0);',
		'}',

		'void main() {',
			'gl_FragColor = vec4(color, alpha);',
			'return;',
			// 'vec2 pixel = gl_FragCoord.xy * resolution;',

			'float line1 = drawLine(-30.0, 10.0, 2.0);',
			'float line2 = drawLine(80.0, 20.0, 2.0);',
			'float level = fillAlpha + lineAlpha * max(line1 * 0.9, line2 * 0.3);',

			'gl_FragColor = vec4(color, alpha * level);',
		'}'

	].join('\n')
}
