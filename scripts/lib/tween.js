/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

var TWEEN = {
	tweens: [],

	getAll: function() {
		return TWEEN.tweens
	},

	removeAll: function() {
		for(var i = TWEEN.tweens.length -1; i >= 0; i--) {
			TWEEN.tweens[i].drop = true
		}
	},

	add: function(tween) {
		tween.drop = false
		TWEEN.tweens.push(tween)
	},

	remove: function(tween) {
		tween.drop = true
	},

	update: function(time) {
		var length = TWEEN.tweens.length

		if(length === 0) {
			return false
		}

		time = isNaN(time) ? window.performance.now() : +time

		for(var i = length -1; i >= 0; i--) {
			var tween = TWEEN.tweens[i]

			if(tween.drop || !tween.update(time)) {
				TWEEN.tweens.splice(i, 1)
			}
		}

		return true
	}
}

TWEEN.Tween = function(object) {
	this.source = null
	this.target = null

	this.durationTime = 1000
	this.delayTime = 0
	this.startTime = null
	this.repeatTimes = 0
	this.enableYoyo = false
	this.reversed = false

	this.easingFunction = TWEEN.Easing.Linear.None
	this.interpolationFunction = TWEEN.Interpolation.Linear
	this.chainedTweens = []

	this.onStartCallbackFired = false
	this.onStartCallback = null
	this.onStartScope = null

	this.onUpdateCallback = null
	this.onUpdateScope = null

	this.onCompleteCallback = null
	this.onCompleteScope = null

	this.onStopCallback = null
	this.onStopScope = null

	this.playing = false

	this.setSource(object)
}

TWEEN.Tween.prototype = {

	setSource: function(object) {
		this.source = object
		return this
	},

	setTarget: function(object) {
		this.target = object
		return this
	},

	duration: function(duration) {
		this.durationTime = duration
		return this
	},

	to: function(object, duration) {
		if(duration != null) {
			this.durationTime = duration
		}

		this.setTarget(object)
		return this
	},

	delay: function(amount) {
		this.delayTime = amount
		return this
	},

	repeat: function(times) {
		this.repeatTimes = times
		return this
	},

	yoyo: function(enableYoyo) {
		this.enableYoyo = enableYoyo
		return this
	},

	easing: function(easingFunction) {
		this.easingFunction = easingFunction
		return this
	},

	interpolation: function(interpolation) {
		this.interpolationFunction = interpolation
		return this
	},

	chain: function() {
		this.chainedTweens = arguments
		return this
	},

	onStart: function(callback, scope) {
		this.onStartCallback = callback
		this.onStartScope = scope
		return this
	},

	onUpdate: function(callback, scope) {
		this.onUpdateCallback = callback
		this.onUpdateScope = scope
		return this
	},

	onComplete: function(callback, scope) {
		this.onCompleteCallback = callback
		this.onCompleteScope = scope
		return this
	},

	onStop: function(callback, scope) {
		this.onStopCallback = callback
		this.onStopScope = scope
		return this
	},


	stop: function() {
		TWEEN.remove(this)

		this.playing = false

		if(this.onStopCallback !== null) {
			this.onStopCallback.call(this.onStopScope, this.source)
		}

		this.stopChainedTweens()
		return this
	},

	stopChainedTweens: function() {
		for(var i = this.chainedTweens.length -1; i >= 0; i--) {
			this.chainedTweens[i].stop()
		}
	},

	updateSource: function() {
		this.valuesSource = {}

		for(var property in this.source) {
			var valueSource = this.source[property]
			,   valueSourceNumber = parseFloat(valueSource, 10)

			if(!isFinite(valueSourceNumber)) continue

			this.valuesSource[property] = valueSourceNumber
		}

		return this
	},

	updateTarget: function() {
		this.valuesRelative = {}
		this.valuesTarget = {}

		for(var property in this.target) {
			if(property in this.valuesSource === false) continue

			var valueTarget = this.target[property]
			,   valueSource = this.valuesSource[property]

			if(valueTarget instanceof Array) {
				if(valueTarget.length) {
					this.valuesTarget[property] = [valueSource].concat(valueTarget)
				}

			} else if(typeof valueTarget === 'string') {
				// Parses relative end values with start as base (e.g.: +10, -3)
				var valueTargetNumber = parseFloat(valueTarget, 10)

				if(isFinite(valueTargetNumber)) {
					this.valuesRelative[property] = valueTargetNumber
					this.valuesTarget[property] = valueSource + valueTargetNumber
				}

			} else if(typeof valueTarget === 'number') {
				if(isFinite(valueTarget)) {
					this.valuesTarget[property] = valueTarget
				}
			}
		}

		return this
	},

	start: function(time) {
		TWEEN.add(this)

		this.onStartCallbackFired = false

		this.startTime = isNaN(time) ? window.performance.now() : +time
		this.startTime += this.delayTime

		this.updateSource()
		this.updateTarget()

		return this
	},

	update: function(time) {
		if(time < this.startTime) {
			return true
		}

		if(this.onStartCallbackFired === false) {
			this.onStartCallbackFired = true
			this.playing = true

			if(this.onStartCallback !== null) {
				this.onStartCallback.call(this.onStartScope, this.source)
			}
		}

		var elapsed = (time - this.startTime) / this.durationTime
		elapsed = elapsed > 1 ? 1 : elapsed

		var value = this.easingFunction(elapsed)

		for(var property in this.valuesTarget) {
			var valueTarget = this.valuesTarget[property]
			,   valueSource = this.valuesSource[property]

			if(valueTarget instanceof Array) {
				this.source[property] = this.interpolationFunction(valueTarget, value)
			} else {
				this.source[property] = valueSource + (valueTarget - valueSource) * value
			}
		}

		if(this.onUpdateCallback !== null) {
			this.onUpdateCallback.call(this.onUpdateScope, value, this.source)
		}


		if(elapsed === 1) {

			if(this.repeatTimes > 0) {
				this.repeatTimes--

				// Reassign starting values, restart by making startTime = now
				for(var property in this.valuesSource) {
					var valueSource = this.valuesSource[property]
					,   valueTarget = this.valuesTarget[property]

					if(property in this.valuesRelative) {
						valueSource += this.valuesRelative[property]
					}

					if(this.enableYoyo) {
						this.valuesTarget[property] = valueSource
						valueSource = valueTarget
					}

					this.valuesSource[property] = valueSource
				}

				if(this.enableYoyo) {
					this.reversed = !this.reversed
				}

				this.startTime = time + this.delayTime

				return true


			} else {

				if(this.onCompleteCallback !== null) {
					this.onCompleteCallback.call(this.onCompleteScope, this.source)
				}

				for(var i = this.chainedTweens.length -1; i >= 0; i--) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					this.chainedTweens[i].start(this.startTime + this.durationTime)
				}

				this.playing = false
				return false
			}
		}

		return true
	}
}


TWEEN.Easing = {

	Linear: {

		None: function (k) {

			return k;

		}

	},

	Quadratic: {

		In: function (k) {

			return k * k;

		},

		Out: function (k) {

			return k * (2 - k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return - 0.5 * (--k * (k - 2) - 1);

		}

	},

	Cubic: {

		In: function (k) {

			return k * k * k;

		},

		Out: function (k) {

			return --k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);

		}

	},

	Quartic: {

		In: function (k) {

			return k * k * k * k;

		},

		Out: function (k) {

			return 1 - (--k * k * k * k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return - 0.5 * ((k -= 2) * k * k * k - 2);

		}

	},

	Quintic: {

		In: function (k) {

			return k * k * k * k * k;

		},

		Out: function (k) {

			return --k * k * k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);

		}

	},

	Sinusoidal: {

		In: function (k) {

			return 1 - Math.cos(k * Math.PI / 2);

		},

		Out: function (k) {

			return Math.sin(k * Math.PI / 2);

		},

		InOut: function (k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));

		}

	},

	Exponential: {

		In: function (k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);

		},

		Out: function (k) {

			return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);

		}

	},

	Circular: {

		In: function (k) {

			return 1 - Math.sqrt(1 - k * k);

		},

		Out: function (k) {

			return Math.sqrt(1 - (--k * k));

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			return - (a * Math.pow(2, 10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p));

		},

		Out: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			return (a * Math.pow(2, - 10 * k) * Math.sin((k - s) * (2 * Math.PI) / p) + 1);

		},

		InOut: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			if ((k *= 2) < 1) {
				return - 0.5 * (a * Math.pow(2, 10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p));
			}

			return a * Math.pow(2, -10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;

		}

	},

	Back: {

		In: function (k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);

		},

		Out: function (k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;

		},

		InOut: function (k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);

		}

	},

	Bounce: {

		In: function (k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);

		},

		Out: function (k) {

			if (k < (1 / 2.75)) {
				return 7.5625 * k * k;
			} else if (k < (2 / 2.75)) {
				return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
			} else if (k < (2.5 / 2.75)) {
				return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
			} else {
				return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
			}

		},

		InOut: function (k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

	},

	Bezier: function (v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;

	},

	CatmullRom: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

		}

	},

	Utils: {

		Linear: function (p0, p1, t) {

			return (p1 - p0) * t + p0;

		},

		Bernstein: function (n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);

		},

		Factorial: (function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;

			};

		})(),

		CatmullRom: function (p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

		}

	}

};

// UMD (Universal Module Definition)
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return TWEEN;
		});

	} else if (typeof exports === 'object') {

		// Node.js
		module.exports = TWEEN;

	} else {

		// Global variable
		root.TWEEN = TWEEN;

	}

})(this);
