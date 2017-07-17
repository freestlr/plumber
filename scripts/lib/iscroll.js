/*!
 * iScroll v4.2.5 ~ Copyright (c) 2012 Matteo Spinelli, http://cubiq.org
 * Released under MIT license, http://cubiq.org/license
 */
(function(window, doc){
var m = Math,
	dummyStyle = doc.createElement('div').style,
	vendor = (function () {
		var vendors = {
			''       : 'transform',
			'O'      : 'OTransform',
			'ms'     : 'msTransform',
			'Moz'    : 'MozTransform',
			'webkit' : 'webkitTransform'
		}
		for(var vendor in vendors) {
			if(vendors[vendor] in dummyStyle) return vendor
		}
		return false
	})(),
	cssVendor = vendor ? '-' + vendor.toLowerCase() + '-' : '',

	// Style properties
	transform = prefixStyle('transform'),
	transitionProperty = prefixStyle('transitionProperty'),
	transitionDuration = prefixStyle('transitionDuration'),
	transformOrigin = prefixStyle('transformOrigin'),
	transitionTimingFunction = prefixStyle('transitionTimingFunction'),
	transitionDelay = prefixStyle('transitionDelay'),

    // Browser capabilities
	isAndroid = (/android/gi).test(navigator.appVersion),
	isIDevice = (/iphone|ipad/gi).test(navigator.appVersion),
	isTouchPad = (/hp-tablet/gi).test(navigator.appVersion),
	isDesktop = !isAndroid && !isIDevice && !isTouchPad,

    has3d = prefixStyle('perspective') in dummyStyle,
    hasTransform = vendor !== false,
    hasTransitionEnd = prefixStyle('transition') in dummyStyle,

	RESIZE_EV = 'onorientationchange' in window ? 'orientationchange' : 'resize',
	TRNEND_EV = vendor === false ? false : {
		''        : 'transitionend',
		'webkit'  : 'webkitTransitionEnd',
		'Moz'     : 'transitionend',
		'O'       : 'otransitionend',
		'ms'      : 'MSTransitionEnd'
	} [vendor],

	nextFrame = window.requestAnimationFrame
			|| window.oRequestAnimationFrame
			|| window.msRequestAnimationFrame
			|| window.mozRequestAnimationFrame
			|| window.webkitRequestAnimationFrame
			|| function(callback) { return setTimeout(callback, 1000 / 60) },

	cancelFrame = window.cancelAnimationFrame
			|| window.oCancelAnimationFrame
			|| window.msCancelAnimationFrame
			|| window.mozCancelAnimationFrame
			|| window.webkitCancelAnimationFrame
			|| window.cancelRequestAnimationFrame
			|| window.oCancelRequestAnimationFrame
			|| window.msCancelRequestAnimationFrame
			|| window.mozCancelRequestAnimationFrame
			|| window.webkitCancelRequestAnimationFrame
			|| clearTimeout,

	// Helpers
	translateZ = has3d ? ' translateZ(0)' : '',

	// Constructor
	iScroll = function (el, options) {
		var that = this,
			i;

		that.wrapper = typeof el == 'object' ? el : doc.getElementById(el);
		that.wrapper.style.overflow = 'hidden';
		that.scroller = that.wrapper.children[0];

		// Default options
		that.options = {
			hScroll: true,
			vScroll: true,
			x: 0,
			y: 0,
			bounce: true,
			bounceLock: false,
			momentum: true,
			lockDirection: true,
			useTransform: true,
			useTransition: false,
			checkDOMChanges: false,		// Experimental
			handleClick: true,
			speed: 500,
			speedMax: Infinity,

			// Scrollbar
			hScrollbar: true,
			vScrollbar: true,
			fixedScrollbar: isAndroid,
			hideScrollbar: isDesktop || isIDevice,
			fadeScrollbar: (isDesktop || isIDevice) && has3d,
			scrollbarClass: '',

			// Zoom
			zoom: false,
			zoomMin: 1,
			zoomMax: 4,
			doubleTapZoom: 2,
			wheelAction: 'scroll',
			wheelSpeed: 250,
			wheelTime: 300,
			wheelZoom: 10,
			wheelCapture: true,
			macWheel: false,

			// Snap
			snap: false,
			snapThreshold: 1,

			// Events
			onRefresh: null,
			onBeforeScrollStart: function (e) { e.preventDefault(); },
			onScrollStart: null,
			onBeforeScrollMove: null,
			onScrollMove: null,
			onBeforeScrollEnd: null,
			onScrollEnd: null,
			onTouchEnd: null,
			onAnimationStart: null,
			onAnimationEnd: null,
			onPosition: null,
			onDestroy: null,
			onZoomStart: null,
			onZoom: null,
			onZoomEnd: null
		};

		that.options.hideScrollbar = true
		that.options.fadeScrollbar = true

		that.momentum = new Momentum
		that.momentum.speedThreshold = 3e-3
		that.momentum.acceleration = 0.92

		// User defined options
		for (i in options) that.options[i] = options[i];

		// Set starting position
		that.x = that.options.x;
		that.y = that.options.y;

		// Normalize options
		that.options.useTransform = hasTransform && that.options.useTransform;
		that.options.hScrollbar = that.options.hScroll && that.options.hScrollbar;
		that.options.vScrollbar = that.options.vScroll && that.options.vScrollbar;
		that.options.zoom = that.options.useTransform && that.options.zoom;
		that.options.useTransition = hasTransitionEnd && that.options.useTransition;

		// Helpers FIX ANDROID BUG!
		// translate3d and scale doesn't work together!
		// Ignoring 3d ONLY WHEN YOU SET that.options.zoom
		if ( that.options.zoom && isAndroid ){
			translateZ = '';
		}
		
		// Set some default styles
		that.scroller.style[transitionProperty] = that.options.useTransform ? cssVendor + 'transform' : 'top left';
		that.scroller.style[transitionDuration] = '0';
		that.scroller.style[transformOrigin] = '0 0';
		if (that.options.useTransition) that.scroller.style[transitionTimingFunction] = 'cubic-bezier(0.33,0.66,0.66,1)';
		
		if (that.options.useTransform) that.scroller.style[transform] = 'translate(' + that.x + 'px,' + that.y + 'px)' + translateZ;
		else that.scroller.style.cssText += ';position:absolute;top:' + that.y + 'px;left:' + that.x + 'px';

		if (that.options.useTransition) that.options.fixedScrollbar = true;

		that.refresh();

		that._bind(RESIZE_EV, window);
		that._bind('touchstart', that.wrapper);
		that._bind('mousedown', that.wrapper);
		if (that.options.wheelAction != 'none') {
			that._bind('DOMMouseScroll', that.wrapper);
			that._bind('mousewheel', that.wrapper);
		}

		if (that.options.checkDOMChanges) that.checkDOMTime = setInterval(function () {
			that._checkDOMChanges();
		}, 500);
	};

// Prototype
iScroll.prototype = {
	enabled: true,

	scale: 1,

	x: 0,
	y: 0,
	targetX: 0,
	targetY: 0,

	currentPageX: 0,
	currentPageY: 0,
	targetPageX: 0,
	targetPageY: 0,

	pagesX: [],
	pagesY: [],

	steps: [],

	aniTime: null,
	wheelZoomCount: 0,

	handleEvent: function (e) {
		var that = this;
		switch(e.type) {
			case 'touchstart':
			case 'mousedown':
				if(e.touches || e.button === 0) that._start(e);
			break;

			case 'touchmove':
			case 'mousemove':
				that._move(e);
			break;

			case 'touchend':
			case 'touchcancel':
			case 'mouseup':
				that._end(e);
			break;

			case RESIZE_EV: that._resize();
			break;

			case 'DOMMouseScroll':
			case 'mousewheel': that._wheel(e);
			break;

			case TRNEND_EV: that._transitionEnd(e);
			break;
		}
	},
	
	_checkDOMChanges: function () {
		if (this.moved || this.zoomed || this.animating ||
			(this.scrollerW == this.scroller.offsetWidth * this.scale && this.scrollerH == this.scroller.offsetHeight * this.scale)) return;

		this.refresh();
	},
	
	_scrollbar: function (dir) {
		var that = this,
			bar;

		if (!that[dir + 'Scrollbar']) {
			if (that[dir + 'ScrollbarWrapper']) {
				if (hasTransform) that[dir + 'ScrollbarIndicator'].style[transform] = '';
				that[dir + 'ScrollbarWrapper'].parentNode.removeChild(that[dir + 'ScrollbarWrapper']);
				that[dir + 'ScrollbarWrapper'] = null;
				that[dir + 'ScrollbarIndicator'] = null;
			}

			return;
		}

		if (!that[dir + 'ScrollbarWrapper']) {
			// Create the scrollbar wrapper
			bar = doc.createElement('div');

			if (that.options.scrollbarClass) bar.className = that.options.scrollbarClass + dir.toUpperCase();
			else bar.style.cssText = 'position:absolute;z-index:100;' + (dir == 'h' ? 'height:7px;bottom:1px;left:2px;right:' + (that.vScrollbar ? '7' : '2') + 'px' : 'width:7px;bottom:' + (that.hScrollbar ? '7' : '2') + 'px;top:2px;right:1px');

			bar.style.cssText += ';pointer-events:none;' + cssVendor + 'transition-property:opacity;' + cssVendor + 'transition-duration:' + (that.options.fadeScrollbar ? '350ms' : '0') + ';overflow:hidden;opacity:' + (that.options.hideScrollbar ? '0' : '1');

			that.wrapper.appendChild(bar);
			that[dir + 'ScrollbarWrapper'] = bar;

			// Create the scrollbar indicator
			bar = doc.createElement('div');
			if (!that.options.scrollbarClass) {
				bar.style.cssText = 'position:absolute;z-index:100;background:rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.5);' + cssVendor + 'background-clip:padding-box;' + cssVendor + 'box-sizing:border-box;' + (dir == 'h' ? 'height:100%' : 'width:100%') + ';' + cssVendor + 'border-radius:3px;border-radius:3px';
			}
			bar.style.cssText += ';pointer-events:none;' + cssVendor + 'transition-property:' + cssVendor + 'transform;' + cssVendor + 'transition-timing-function:cubic-bezier(0.33,0.66,0.66,1);' + cssVendor + 'transition-duration:0;' + cssVendor + 'transform: translate(0,0)' + translateZ;
			if (that.options.useTransition) bar.style.cssText += ';' + cssVendor + 'transition-timing-function:cubic-bezier(0.33,0.66,0.66,1)';

			that[dir + 'ScrollbarWrapper'].appendChild(bar);
			that[dir + 'ScrollbarIndicator'] = bar;
		}

		if (dir == 'h') {
			that.hScrollbarSize = that.hScrollbarWrapper.clientWidth;
			that.hScrollbarIndicatorSize = m.max(m.round(that.hScrollbarSize * that.hScrollbarSize / that.scrollerW), 8);
			that.hScrollbarIndicator.style.width = that.hScrollbarIndicatorSize + 'px';
			that.hScrollbarMaxScroll = that.hScrollbarSize - that.hScrollbarIndicatorSize;
			that.hScrollbarProp = that.hScrollbarMaxScroll / that.maxScrollX;
		} else {
			that.vScrollbarSize = that.vScrollbarWrapper.clientHeight;
			that.vScrollbarIndicatorSize = m.max(m.round(that.vScrollbarSize * that.vScrollbarSize / that.scrollerH), 8);
			that.vScrollbarIndicator.style.height = that.vScrollbarIndicatorSize + 'px';
			that.vScrollbarMaxScroll = that.vScrollbarSize - that.vScrollbarIndicatorSize;
			that.vScrollbarProp = that.vScrollbarMaxScroll / that.maxScrollY;
		}

		// Reset position
		that._scrollbarPos(dir, true);
	},
	
	_resize: function () {
		var that = this;
		setTimeout(function () { that.refresh(); }, isAndroid ? 200 : 0);
	},
	
	_pos: function (x, y) {
		if (this.zoomed) return;

		x = this.hScroll ? x : 0;
		y = this.vScroll ? y : 0;

		if (this.options.useTransform) {
			this.scroller.style[transform] = 'translate('+ x +'px,'+ y +'px) scale('+ this.scale +')'+ translateZ;

		} else {
			this.scroller.style.left = m.round(x) + 'px';
			this.scroller.style.top = m.round(y) + 'px';
		}

		this.x = x;
		this.y = y;

		this.currentPageX = this._getPage(this.x, this.pagesX)
		this.currentPageY = this._getPage(this.y, this.pagesY)

		if(this.options.onPosition) {
			this.options.onPosition.call(this)
		}

		this._scrollbarPos('h');
		this._scrollbarPos('v');
	},

	_scrollbarPos: function (dir, hidden) {
		var that = this,
			pos = dir == 'h' ? that.x : that.y,
			size;

		if (!that[dir + 'Scrollbar']) return;

		pos = that[dir + 'ScrollbarProp'] * pos;

		if (pos < 0) {
			if (!that.options.fixedScrollbar) {
				size = that[dir + 'ScrollbarIndicatorSize'] + m.round(pos * 3);
				if (size < 8) size = 8;
				that[dir + 'ScrollbarIndicator'].style[dir == 'h' ? 'width' : 'height'] = size + 'px';
			}
			pos = 0;
		} else if (pos > that[dir + 'ScrollbarMaxScroll']) {
			if (!that.options.fixedScrollbar) {
				size = that[dir + 'ScrollbarIndicatorSize'] - m.round((pos - that[dir + 'ScrollbarMaxScroll']) * 3);
				if (size < 8) size = 8;
				that[dir + 'ScrollbarIndicator'].style[dir == 'h' ? 'width' : 'height'] = size + 'px';
				pos = that[dir + 'ScrollbarMaxScroll'] + (that[dir + 'ScrollbarIndicatorSize'] - size);
			} else {
				pos = that[dir + 'ScrollbarMaxScroll'];
			}
		}

		that[dir + 'ScrollbarWrapper'].style[transitionDelay] = '0';
		that[dir + 'ScrollbarWrapper'].style.opacity = hidden && that.options.hideScrollbar ? '0' : '1';
		that[dir + 'ScrollbarIndicator'].style[transform] = 'translate(' + (dir == 'h' ? pos + 'px,0)' : '0,' + pos + 'px)') + translateZ;
	},

	_hideScrollbar: function() {
		var that = this

		if(!that.options.hideScrollbar) return

		if (that.hScrollbar) {
			if (vendor == 'webkit') that.hScrollbarWrapper.style[transitionDelay] = '300ms';
			that.hScrollbarWrapper.style.opacity = '0';
		}
		if (that.vScrollbar) {
			if (vendor == 'webkit') that.vScrollbarWrapper.style[transitionDelay] = '300ms';
			that.vScrollbarWrapper.style.opacity = '0';
		}
	},

	_start: function (e) {
		var that = this,
			point = e.touches ? e.touches[0] : e,
			matrix, x, y,
			c1, c2;

		if (!that.enabled) return;


		if (that.options.onBeforeScrollStart) that.options.onBeforeScrollStart.call(that, e);

		if (that.options.useTransition || that.options.zoom) that._transitionTime(0);

		that.moved = false;
		that.animating = false;
		that.zoomed = false;
		that.distX = 0;
		that.distY = 0;
		that.absDistX = 0;
		that.absDistY = 0;
		that.dirX = 0;
		that.dirY = 0;

		// Gesture start
		if (that.options.zoom && e.touches && e.touches.length > 1) {
			c1 = m.abs(e.touches[0].pageX-e.touches[1].pageX);
			c2 = m.abs(e.touches[0].pageY-e.touches[1].pageY);
			that.touchesDistStart = m.sqrt(c1 * c1 + c2 * c2);

			that.originX = m.abs(e.touches[0].pageX + e.touches[1].pageX - that.wrapperOffsetLeft * 2) / 2 - that.x;
			that.originY = m.abs(e.touches[0].pageY + e.touches[1].pageY - that.wrapperOffsetTop * 2) / 2 - that.y;

			if (that.options.onZoomStart) that.options.onZoomStart.call(that, e);
		}

		if (that.options.momentum) {
			var style = getComputedStyle(that.scroller, null)

			if (that.options.useTransform) {
				// Very lame general purpose alternative to CSSMatrix
				matrix = style[transform].replace(/[^0-9.,-]+/g, '').split(',');
				x = parseInt(matrix[12] || matrix[4], 10);
				y = parseInt(matrix[13] || matrix[5], 10);
			} else {
				x = parseInt(style.left, 10);
				y = parseInt(style.top, 10);
			}
			
			if (x != that.x || y != that.y) {
				if (that.options.useTransition) that._unbind(TRNEND_EV);
				else cancelFrame(that.aniTime);
				that.steps = [];
				that._pos(x, y);
				if (that.options.onScrollEnd) that.options.onScrollEnd.call(that);
			}
		}

		that.absStartX = that.x;	// Needed by snap threshold
		that.absStartY = that.y;

		that.mouseX = that.pointX = point.pageX;
		that.mouseY = that.pointY = point.pageY;

		that.momentum.push(that.x, that.y)

		if (that.options.onScrollStart) that.options.onScrollStart.call(that, e);

		that._bind('touchmove', window);
		that._bind('mousemove', window);
		that._bind('touchend', window);
		that._bind('mouseup', window);
		that._bind('touchcancel', window);
	},
	
	_move: function (e) {
		var that = this,
			point = e.touches ? e.touches[0] : e

		that.mouseX = point.pageX;
		that.mouseY = point.pageY;

		var deltaX = that.mouseX - that.pointX,
			deltaY = that.mouseY - that.pointY,
			newX = that.x + deltaX,
			newY = that.y + deltaY,
			clampX, clampY,
			c1, c2, scale


		if (that.options.onBeforeScrollMove) that.options.onBeforeScrollMove.call(that, e);

		// Zoom
		if (that.options.zoom && e.touches && e.touches.length > 1) {
			c1 = m.abs(e.touches[0].pageX - e.touches[1].pageX);
			c2 = m.abs(e.touches[0].pageY - e.touches[1].pageY);
			that.touchesDist = m.sqrt(c1*c1+c2*c2);

			that.zoomed = true;

			scale = 1 / that.touchesDistStart * that.touchesDist * this.scale;

			if (scale < that.options.zoomMin) scale = 0.5 * that.options.zoomMin * Math.pow(2.0, scale / that.options.zoomMin);
			else if (scale > that.options.zoomMax) scale = 2.0 * that.options.zoomMax * Math.pow(0.5, that.options.zoomMax / scale);

			that.lastScale = scale / this.scale;

			newX = this.originX - this.originX * that.lastScale + this.x,
			newY = this.originY - this.originY * that.lastScale + this.y;

			this.scroller.style[transform] = 'translate(' + newX + 'px,' + newY + 'px) scale(' + scale + ')' + translateZ;

			if (that.options.onZoom) that.options.onZoom.call(that, e);
			return;
		}

		that.pointX = that.mouseX;
		that.pointY = that.mouseY;

		// Slow down if outside of the boundaries
		clampX = that._clampX(newX)
		if(newX !== clampX) {
			newX = that.options.bounce ? that.x + (deltaX / 2) : clampX
		}

		clampY = that._clampY(newY)
		if(newY !== clampY) {
			newY = that.options.bounce ? that.y + (deltaY / 2) : clampY
		}

		that.distX += deltaX;
		that.distY += deltaY;
		that.absDistX = m.abs(that.distX);
		that.absDistY = m.abs(that.distY);

		if (that.absDistX < 6 && that.absDistY < 6) {
			return;
		}

		// Lock direction
		if (that.options.lockDirection) {
			if (that.absDistX > that.absDistY + 5) {
				newY = that.y;
				deltaY = 0;
			} else if (that.absDistY > that.absDistX + 5) {
				newX = that.x;
				deltaX = 0;
			}
		}

		that.moved = true;
		that._pos(newX, newY);
		that.targetX = that.x
		that.targetY = that.y
		that.targetPageX = that.currentPageX
		that.targetPageY = that.currentPageY
		that.dirX = deltaX > 0 ? -1 : deltaX < 0 ? 1 : 0;
		that.dirY = deltaY > 0 ? -1 : deltaY < 0 ? 1 : 0;

		that.momentum.push(that.x, that.y)

		if (that.options.onScrollMove) that.options.onScrollMove.call(that, e);
	},
	
	_end: function (e) {
		if (e.touches && e.touches.length !== 0) return;

		var that = this,
			point = e.changedTouches ? e.changedTouches[0] : e,
			target, ev,
			momDistX = 0,
			momDistY = 0,
			newPosX = that.x,
			newPosY = that.y,
			distX, distY,
			newDuration,
			scale;

		that._unbind('touchmove', window);
		that._unbind('mousemove', window);
		that._unbind('touchend', window);
		that._unbind('mouseup', window);
		that._unbind('touchcancel', window);

		if (that.options.onBeforeScrollEnd) that.options.onBeforeScrollEnd.call(that, e);

		if (that.zoomed) {
			scale = that.scale * that.lastScale;
			scale = Math.max(that.options.zoomMin, scale);
			scale = Math.min(that.options.zoomMax, scale);
			that.lastScale = scale / that.scale;
			that.scale = scale;

			that.x = that.originX - that.originX * that.lastScale + that.x;
			that.y = that.originY - that.originY * that.lastScale + that.y;
			
			that.scroller.style[transitionDuration] = '200ms';
			that.scroller.style[transform] = 'translate(' + that.x + 'px,' + that.y + 'px) scale(' + that.scale + ')' + translateZ;
			
			that.zoomed = false;
			that.refresh();

			if (that.options.onZoomEnd) that.options.onZoomEnd.call(that, e);
			return;
		}


		if (!that.moved) {
			if (e.touches) {
				if (that.doubleTapTimer && that.options.zoom) {
					// Double tapped
					clearTimeout(that.doubleTapTimer);
					that.doubleTapTimer = null;
					if (that.options.onZoomStart) that.options.onZoomStart.call(that, e);
					that.zoom(that.pointX, that.pointY, that.scale == 1 ? that.options.doubleTapZoom : 1);
					if (that.options.onZoomEnd) {
						setTimeout(function() {
							that.options.onZoomEnd.call(that, e);
						}, 200); // 200 is default zoom duration
					}

				} else if (this.options.handleClick) {
					that.doubleTapTimer = setTimeout(function () {
						that.doubleTapTimer = null;

						// Find the last touched element
						target = point.target;
						while (target.nodeType != 1) target = target.parentNode;

						if (target.tagName != 'SELECT' && target.tagName != 'INPUT' && target.tagName != 'TEXTAREA') {
							ev = doc.createEvent('MouseEvents');
							ev.initMouseEvent('click', true, true, e.view, 1,
								point.screenX, point.screenY, point.clientX, point.clientY,
								e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
								0, null);
							ev._fake = true;
							target.dispatchEvent(ev);
						}
					}, that.options.zoom ? 250 : 0);
				}
			}

			that._resetPos(400);


		} else if(that.options.momentum) {
			that.momentum.push(that.x, that.y)
			that.momentum.go()


			newDuration = that.momentum.duration

			newPosX = Math.round(that.momentum.target.x)
			newPosY = Math.round(that.momentum.target.y)

			momDistX = newPosX - that.x
			momDistY = newPosY - that.y

			if((that.x > 0 && newPosX > 0)
			|| (that.x < that.maxScrollX && newPosX < that.maxScrollX)) {
				momDistX = 0
			}
			if((that.y > 0 && newPosY > 0)
			|| (that.y < that.maxScrollY && newPosY < that.maxScrollY)) {
				momDistY = 0
			}
		}

		if (momDistX || momDistY) {
			newDuration = m.max(newDuration, 10);

			// Do we need to snap?
			if (that.options.snap) {
				distX = newPosX - that.absStartX;
				distY = newPosY - that.absStartY;

				if(m.abs(distX) < that.options.snapThreshold
				&& m.abs(distY) < that.options.snapThreshold) {
					newPosX = that.absStartX
					newPosY = that.absStartY
					newDuration = 200

				} else {
					newPosX = that._snapX(newPosX)
					newPosY = that._snapY(newPosY)
					newDuration = null
				}
			}

			that.scrollTo(m.round(newPosX), m.round(newPosY), newDuration);


		} else if(that.options.snap) {
			distX = newPosX - that.absStartX
			distY = newPosY - that.absStartY

			if(m.abs(distX) < that.options.snapThreshold
			&& m.abs(distY) < that.options.snapThreshold) {
				that.scrollTo(that.absStartX, that.absStartY, 200)

			} else {
				newPosX = that._snapX(that.x)
				newPosY = that._snapY(that.y)

				if(newPosX !== that.x || newPosY !== that.y) {
					that.scrollTo(newPosX, newPosY)
				}
			}


		} else {
			that._resetPos(200);
		}

		if(that.options.onTouchEnd) that.options.onTouchEnd.call(that, e);
	},

	_clampX: function(x) {
		return x > 0 ? 0 : x < this.maxScrollX ? this.maxScrollX : x
	},

	_clampY: function(y) {
		return y > 0 ? 0 : y < this.maxScrollY ? this.maxScrollY : y
	},

	_resetPos: function (time) {
		var that = this,
			resetX = that._clampX(that.x)
			resetY = that._clampY(that.y)

		if(resetX == that.x && resetY == that.y) {
			if (that.moved) {
				that.moved = false;
				// Execute custom code on scroll end
				if (that.options.onScrollEnd) that.options.onScrollEnd.call(that);
			}

			that._hideScrollbar()

		} else {
			that.scrollTo(resetX, resetY, time || 0);
		}
	},

	_wheel: function (e) {
		var that = this,
			dirX, dirY,
			wheelDeltaX,
			wheelDeltaY,
			wheelStepX,
			wheelStepY,
			velocityX, velocityY,
			distanceX, distanceY,
			targetX, targetY,
			deltaX, deltaY, deltaMax,
			deltaScale;

		if(!that.enabled) return

		if ('wheelDeltaX' in e) {
			distanceX = e.wheelDeltaX || 0
			distanceY = e.wheelDeltaY || 0

		} else if('wheelDelta' in e) {
			distanceX = distanceY = e.wheelDelta || 0

		} else if ('deltaX' in e) {
			distanceX = e.deltaX || 0
			distanceY = e.deltaY || 0

		} else if ('detail' in e) {
			distanceX = distanceY = -e.detail || 0

		} else return

		velocityX = Math.abs(distanceX)
		velocityY = Math.abs(distanceY)

		dirX = distanceX ? distanceX / velocityX : 0
		dirY = distanceY ? distanceY / velocityY : 0

		if (that.options.wheelAction == 'zoom') {
			deltaScale = that.scale * Math.pow(2, 1/3 * dirY);
			if (deltaScale < that.options.zoomMin) deltaScale = that.options.zoomMin;
			if (deltaScale > that.options.zoomMax) deltaScale = that.options.zoomMax;

			if (deltaScale != that.scale) {
				if (!that.wheelZoomCount && that.options.onZoomStart) that.options.onZoomStart.call(that, e);
				that.wheelZoomCount++;

				that.zoom(e.pageX, e.pageY, deltaScale, that.options.wheelTime);

				setTimeout(function() {
					that.wheelZoomCount--;
					if (!that.wheelZoomCount && that.options.onZoomEnd) that.options.onZoomEnd.call(that, e);
				}, that.options.wheelTime);
			}

		} else if (that.options.wheelAction == 'scroll') {
			if(!that.hScroll && !that.vScroll) return

			if(this.options.macWheel) {
				wheelStepX = velocityX / 3
				wheelStepY = velocityY / 3
			} else {
				wheelStepX = that.options.wheelSpeed
				wheelStepY = that.options.wheelSpeed
			}

			deltaX = dirX * wheelStepX
			deltaY = dirY * wheelStepY
			deltaMax = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY

			if(that.options.hScroll && that.options.vScroll) {
				wheelDeltaX = deltaX
				wheelDeltaY = deltaY

			} else if(that.options.hScroll) {
				wheelDeltaX = deltaMax
				wheelDeltaY = 0

			} else if(that.options.vScroll) {
				wheelDeltaX = 0
				wheelDeltaY = deltaMax
			}

			targetX = that._clampX(that.targetX + wheelDeltaX)
			targetY = that._clampY(that.targetY + wheelDeltaY)

			that.dirX = wheelDeltaX ? -wheelDeltaX / Math.abs(wheelDeltaX) : 0
			that.dirY = wheelDeltaY ? -wheelDeltaY / Math.abs(wheelDeltaY) : 0

			if(that.options.snap) {
				targetX = that._snapX(targetX)
				targetY = that._snapY(targetY)
			}

			if(that.options.macWheel) {
				that._startMacWheelAni()

			} else {
				that.scrollTo(targetX, targetY)
			}

			// e.preventDefault()
		}

		if(this.options.wheelCapture) {
			e.preventDefault()
		}
	},

	_transitionEnd: function (e) {
		var that = this;

		if (e.target != that.scroller) return;

		that._unbind(TRNEND_EV);
		that._startAni();
	},


	/**
	*
	* Utilities
	*
	*/
	_startAni: function () {
		var that = this,
			startX = that.x, startY = that.y,
			step, animate;

		if (that.animating) return;
		
		if (!that.steps.length) {
			that._resetPos(400);
			return;
		}
		
		step = that.steps.shift();
		
		if (step.x == startX && step.y == startY) step.time = 0;

		if(step.time < 10) {
			that._pos(step.x, step.y)
			that._startAni()
			return
		}

		if(that.options.onAnimationStart) {
			that.options.onAnimationStart.call(that)
		}

		that.animating = true;
		that.moved = true;
		
		if (that.options.useTransition) {
			that._transitionTime(step.time);
			that._pos(step.x, step.y);
			that.animating = false;
			if (step.time) that._bind(TRNEND_EV);
			else that._resetPos(0);
			return;
		}

		that.momentum.push(that.x, that.y)
		that.momentum.to(step.time, step.x, step.y)

		var outOfBorders =
			that.x !== that._clampX(that.x) ||
			that.y !== that._clampY(that.y)

		animate = function () {

			if(that.momentum.active) {
				that.momentum.update()

				var x = that.momentum.point.x
				,   y = that.momentum.point.y
				that._pos(x, y)

				if(!outOfBorders && (x !== that._clampX(x) || y !== that._clampY(y))) {
					outOfBorders = true

					that.momentum.updateAccel(0.5)
					that.momentum.updateTarget()
					that.momentum.updateDuration()

					step.x = Math.round(that.momentum.target.x)
					step.y = Math.round(that.momentum.target.y)
				}

				that.aniTime = nextFrame(animate)

			} else {
				that._pos(step.x, step.y)
				that.animating = false

				// Execute custom code on animation end
				if (that.options.onAnimationEnd) that.options.onAnimationEnd.call(that);
				that._startAni();
			}
		};

		animate();
	},

	_startMacWheelAni: function() {
		var that = this,
			lastTime = Date.now(),
			time

		if(that.macWheelAnimated) return
		that.macWheelAnimated = true

		function macWheelAni() {
			time = Date.now()

			var dx = that.targetX - that.x
			,   dy = that.targetY - that.y

			var moved = dx * dx + dy * dy > 1

			if(!moved && time - lastTime > 300) {
				that._resetPos(400);
				that.macWheelAnimated = false
				return
			}

			that.aniTime = requestAnimationFrame(macWheelAni)

			if(moved) {
				that._pos(that.targetX, that.targetY)
				lastTime = time
			}
		}

		macWheelAni()
	},

	_transitionTime: function (time) {
		time += 'ms';
		this.scroller.style[transitionDuration] = time;
		if (this.hScrollbar) this.hScrollbarIndicator.style[transitionDuration] = time;
		if (this.vScrollbar) this.vScrollbarIndicator.style[transitionDuration] = time;
	},

	_momentum: function (dist, time, maxDistUpper, maxDistLower, size) {
		var deceleration = 0.004,
			speed = m.abs(dist) / time,
			newDist = (speed * speed) / (2 * deceleration),
			outsideK = 6,
			newTime = 0, outsideDist = 0;

		// Proportinally reduce speed if we are outside of the boundaries
		if (dist > 0 && newDist > maxDistUpper) {
			outsideDist = size / (outsideK / (newDist / speed * deceleration));
			maxDistUpper = maxDistUpper + outsideDist;
			speed = speed * maxDistUpper / newDist;
			newDist = maxDistUpper;
		} else if (dist < 0 && newDist > maxDistLower) {
			outsideDist = size / (outsideK / (newDist / speed * deceleration));
			maxDistLower = maxDistLower + outsideDist;
			speed = speed * maxDistLower / newDist;
			newDist = maxDistLower;
		}

		newDist = newDist * (dist < 0 ? -1 : 1);
		newTime = speed / deceleration;

		return { dist: newDist, time: m.round(newTime) };
	},

	_offset: function (el, relative) {
		var left = 0
		,   top  = 0

		while(el && (!relative || el !== this.wrapper)) {
			left -= el.offsetLeft
			top -= el.offsetTop
			el = el.offsetParent
		}

		if (relative) {
			left *= this.scale;
			top *= this.scale;
		}

		return { left: left, top: top };
	},


	_getPage: function(v, pages) {
		for(var i = 0; i < pages.length; i++) {
			var prev = pages[i-1] ||  Infinity
			,   curr = pages[i  ]
			,   next = pages[i+1] || -Infinity

			var min = (curr + prev) / 2
			,   max = (curr + next) / 2

			if(max < v && v < min) return i
		}
	},

	_getPageForX: function(x) {
		return this._getPage(x, this.pagesX)
	},

	_getPageForY: function(y) {
		return this._getPage(y, this.pagesY)
	},


	_snap: function(v, dir, currPage, pages) {
		var that = this

		if(dir) {
			var last = pages.length -1
			,   page = that._getPage(v, pages)

			if(page === currPage) page += dir
			if(page < 0   ) page = 0
			if(page > last) page = last

			return pages[page]

		} else {
			return v
		}
	},

	_snapX: function(x) {
		return this._snap(x, this.dirX, this.targetPageX, this.pagesX)
	},

	_snapY: function(y) {
		return this._snap(y, this.dirY, this.targetPageY, this.pagesY)
	},


	_bind: function (type, el, bubble) {
		(el || this.scroller).addEventListener(type, this, !!bubble);
	},

	_unbind: function (type, el, bubble) {
		(el || this.scroller).removeEventListener(type, this, !!bubble);
	},


	/**
	*
	* Public methods
	*
	*/
	destroy: function () {
		var that = this;

		that.scroller.style[transform] = '';
		that.scroller.style[transformOrigin] = '';
		that.scroller.style[transitionDuration] = '';
		that.scroller.style[transitionProperty] = '';
		that.scroller.style[transitionTimingFunction] = '';

		// Remove the scrollbars
		that.hScrollbar = false;
		that.vScrollbar = false;
		that._scrollbar('h');
		that._scrollbar('v');

		// Remove the event listeners
		that._unbind(RESIZE_EV, window);
		that._unbind('touchstart');
		that._unbind('mousedown');
		that._unbind('touchend', window);
		that._unbind('mouseup', window);
		that._unbind('touchcancel', window);

		that._unbind('DOMMouseScroll');
		that._unbind('mousewheel');

		if (that.options.useTransition) that._unbind(TRNEND_EV);
		if (that.options.checkDOMChanges) clearInterval(that.checkDOMTime);
		if (that.options.onDestroy) that.options.onDestroy.call(that);
	},

	refresh: function () {
		var that = this,
			offset,
			i, l,
			x, y,
			els, pos

		if (that.scale < that.options.zoomMin) that.scale = that.options.zoomMin;
		that.wrapperW = that.wrapper.clientWidth  || 1;
		that.wrapperH = that.wrapper.clientHeight || 1;

		that.scrollerW = m.round((that.scroller.offsetWidth  || 1) * that.scale);
		that.scrollerH = m.round((that.scroller.offsetHeight || 1) * that.scale);

		that.maxScrollX = Math.min(0, that.wrapperW - that.scrollerW)
		that.maxScrollY = Math.min(0, that.wrapperH - that.scrollerH)

		that.dirX = 0;
		that.dirY = 0;

		if (that.options.onRefresh) that.options.onRefresh.call(that);

		that.hScroll = that.options.hScroll && that.maxScrollX < 0;
		that.vScroll = that.options.vScroll && (!that.options.bounceLock && !that.hScroll || that.scrollerH > that.wrapperH);

		that.hScrollbar = that.hScroll && that.options.hScrollbar;
		that.vScrollbar = that.vScroll && that.options.vScrollbar && that.scrollerH > that.wrapperH;

		offset = that._offset(that.wrapper);
		that.wrapperOffsetLeft = -offset.left;
		that.wrapperOffsetTop = -offset.top;

		that.pagesX = []
		that.pagesY = []

		if(typeof that.options.snap == 'string') {
			els = that.scroller.querySelectorAll(that.options.snap)

			for(i=0, l=els.length; i<l; i++) {
				pos = that._offset(els[i], true);

				x = pos.left < that.maxScrollX ? that.maxScrollX : pos.left * that.scale;
				y = pos.top < that.maxScrollY ? that.maxScrollY : pos.top * that.scale;

				if(that.pagesX.indexOf(x) === -1) that.pagesX.push(x)
				if(that.pagesY.indexOf(y) === -1) that.pagesY.push(y)
			}

		} else {
			pos = 0
			while(pos >= that.maxScrollX) {
				that.pagesX.push(pos);
				pos -= that.wrapperW;
			}
			if(that.maxScrollX % that.wrapperW) {
				that.pagesX.push(that.maxScrollX)
			}

			pos = 0
			while(pos >= that.maxScrollY) {
				that.pagesY.push(pos)
				pos -= that.wrapperH;
			}
			if(that.maxScrollY % that.wrapperH) {
				that.pagesY.push(that.maxScrollY)
			}
		}

		// Prepare the scrollbars
		that._scrollbar('h');
		that._scrollbar('v');

		if (!that.zoomed) {
			that.scroller.style[transitionDuration] = '0';
			that._resetPos(400);
		}
	},

	scrollTo: function(x, y, time, relative) {
		var that = this

		that.targetX = relative ? that.targetX - x : x
		that.targetY = relative ? that.targetY - y : y

		if(that.targetX === that.x
		&& that.targetY === that.y) return

		if(time == null) {
			var dx = m.abs(that.targetX - that.x)
			,   dy = m.abs(that.targetY - that.y)

			time = that.options.speed * m.max(dx / that.wrapperW, dy / that.wrapperH)
			time = Math.max(200, Math.round(time))
		}

		that.stop()

		that.targetPageX = that._getPage(that.targetX, that.pagesX)
		that.targetPageY = that._getPage(that.targetY, that.pagesY)

		that.steps.push({
			x: that.targetX,
			y: that.targetY,
			time: Math.min(time, that.options.speedMax)
		})

		that._startAni()
	},

	scrollToElement: function(el, time) {
		var that = this, pos;
		el = el.nodeType ? el : that.scroller.querySelector(el);
		if (!el) return;

		pos = that._offset(el, true);

		var x = that._clampX(pos.left)
		,   y = that._clampY(pos.top)

		that.scrollTo(x, y, time)
	},

	scrollToPage: function (pageX, pageY, time, relative) {
		var that = this, x, y;

		if (that.options.onScrollStart) {
			that.options.onScrollStart.call(that);
		}

		if (that.options.snap) {
			if(relative) {
				pageX += that.currentPageX
				pageY += that.currentPageY
			}

			pageX = pageX < 0 ? 0 : pageX > that.pagesX.length-1 ? that.pagesX.length-1 : pageX;
			pageY = pageY < 0 ? 0 : pageY > that.pagesY.length-1 ? that.pagesY.length-1 : pageY;

			that.currentPageX = pageX;
			that.currentPageY = pageY;
			x = that.pagesX[pageX];
			y = that.pagesY[pageY];

		} else {
			x = that._clampX(-that.wrapperW * pageX);
			y = that._clampY(-that.wrapperH * pageY);
		}

		that.scrollTo(x, y, time);
	},

	disable: function () {
		this.stop();
		this._resetPos(0);
		this.enabled = false;

		// If disabled after touchstart we make sure that there are no left over events
		this._unbind('touchmove', window);
		this._unbind('mousemove', window);
		this._unbind('touchend', window);
		this._unbind('mouseup', window);
		this._unbind('touchcancel', window);
	},
	
	enable: function () {
		this.enabled = true;
	},
	
	stop: function () {
		if (this.options.useTransition) this._unbind(TRNEND_EV);
		else cancelFrame(this.aniTime);
		this.steps = [];
		this.moved = false;
		this.animating = false;
		this.momentum.stop()
	},
	
	zoom: function (x, y, scale, time) {
		var that = this,
			relScale = scale / that.scale;

		if (!that.options.useTransform) return;

		that.zoomed = true;
		time = time === undefined ? 200 : time;
		x = x - that.wrapperOffsetLeft - that.x;
		y = y - that.wrapperOffsetTop - that.y;
		that.x = x - x * relScale + that.x;
		that.y = y - y * relScale + that.y;

		that.scale = scale;
		that.refresh();

		that.x = that._clampX(that.x)
		that.y = that._clampY(that.y)

		that.scroller.style[transitionDuration] = time + 'ms';
		that.scroller.style[transform] = 'translate(' + that.x + 'px,' + that.y + 'px) scale(' + scale + ')' + translateZ;
		that.zoomed = false;
	}
};

function prefixStyle(style) {
	return vendor ? vendor + style.charAt(0).toUpperCase() + style.substr(1) : style
}

dummyStyle = null;	// for the sake of it

if (typeof exports !== 'undefined') exports.iScroll = iScroll;
else window.iScroll = iScroll;

})(window, document);
