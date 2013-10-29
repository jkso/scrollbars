
var scrollbarSize = require('scrollbar-size');
var debounce = require('debounce');
var classes = require('classes');

module.exports = Scrollbars;

var positioned = ['relative', 'absolute', 'fixed'];

function Scrollbars(element) {
	if (!(this instanceof Scrollbars))
		return new Scrollbars(element);

	var self = this;

	this.elem = element;

	// inject the wrapper
	this.wrapper = document.createElement('div');
	// inherit the classes for styling
	// TODO: also make this work with styling based on id
	this.wrapper.className = this.elem.className;
	this.elem.parentNode.replaceChild(this.wrapper, this.elem);
	this.wrapper.appendChild(this.elem);

	// save the current style, so we can restore if necessary
	var style = getComputedStyle(this.elem);
	this.elemstyle = {
		position: style.position,
		top: style.top,
		right: style.right,
		bottom: style.bottom,
		left: style.left,
	};

	classes(this.elem).add('scrollbars-override');
	setPosition(this.elem, [0, -scrollbarSize, -scrollbarSize, 0]);

	style = this.wrapper.style;
	// set the wrapper to be positioned
	// but don’t mess with already positioned elements
	if (!~positioned.indexOf(this.elemstyle.position))
		style.position = 'relative';
	style.overflow = 'hidden';

	// and create scrollbar handles
	this.handleV = handle('vertical', [0, 0, 0, undefined]);
	this.wrapper.appendChild(this.handleV);
	this.handleH = handle('horizontal', [undefined, 0, 0, 0]);
	this.wrapper.appendChild(this.handleH);

	this.dragging = null;

	// hide after some inactivity
	this.hide = debounce(function () {
		if (!self.dragging || self.dragging.elem != self.handleV)
			self.handleV.firstChild.className = 'scrollbars-handle vertical';
		if (!self.dragging || self.dragging.elem != self.handleH)
			self.handleH.firstChild.className = 'scrollbars-handle horizontal';
	}, 1000);

	// hook them up to scroll events
	this.elem.addEventListener('scroll', function () {
		self.refresh();
	}, false);
	// and mouseenter
	this.elem.addEventListener('mouseenter', function () {
		self.refresh();
	}, false);

	[this.handleV, this.handleH].forEach(function (handle) {
		// don’t hide handle when hovering
		handle.firstChild.addEventListener('mouseenter', function (ev) {
			if (!self.dragging)
				self.dragging = {elem: handle};
		}, false);
		handle.firstChild.addEventListener('mouseleave', function (ev) {
			if (self.dragging && !self.dragging.handler)
				self.dragging = null;
		}, false);

		// and do the dragging
		handle.firstChild.addEventListener('mousedown', function (ev) {
			self._startDrag(handle, ev);
			ev.preventDefault();
		}, false);
	});

	this._endDrag = function () {
		document.removeEventListener('mousemove', self.dragging.handler);
		document.removeEventListener('mouseup', self._endDrag);
		self.dragging = null;
	};
}

Scrollbars.prototype._startDrag = function Scrollbars__startDrag(handle, ev) {
	var vertical = handle == this.handleV;
	var self = this;
	var handler = function (ev) {
		self._mouseMove(ev);
	};
	document.addEventListener('mousemove', handler, false);
	document.addEventListener('mouseup', this._endDrag, false);
	var rect = handle.getBoundingClientRect();
	this.dragging = {
		elem: handle,
		handler: handler,
		offset: vertical ? ev.pageY - rect.top : ev.pageX - rect.left
	};
	//console.log(ev, rect, this.dragging);
};

Scrollbars.prototype._mouseMove = function Scrollbars__mouseMove(ev) {
	//console.log(this.dragging, ev);
	var vertical = this.dragging.elem == this.handleV;
	var rect = this.elem.getBoundingClientRect();
	if (vertical) {
		var percentage = this.wrapper.clientHeight / this.elem.scrollHeight;
		var offset = ev.pageY - rect.top - this.dragging.offset;
		this.elem.scrollTop = offset / percentage;
	} else {
		percentage = this.wrapper.clientWidth / this.elem.scrollWidth;
		offset = ev.pageX - rect.left - this.dragging.offset;
		this.elem.scrollLeft = offset / percentage;
	}
	this.refresh();
};

/*
 * Refreshes (and shows) the scrollbars
 */
Scrollbars.prototype.refresh = function Scrollbars_refresh() {
	// vertical
	var percentage = this.elem.clientHeight / this.elem.scrollHeight;
	if (this.elem.scrollTopMax || percentage < 1) {
		var scrolledPercentage = this.elem.scrollTop / this.elem.scrollHeight;
		setPosition(this.handleV, [
			scrolledPercentage * this.elem.clientHeight,
			0,
			(1 - scrolledPercentage - percentage) * this.elem.clientHeight,
			undefined
		]);
		this.handleV.firstChild.className = 'scrollbars-handle vertical show';
	}

	// horizontal
	percentage = this.elem.clientWidth / this.elem.scrollWidth;
	if (this.elem.scrollLeftMax || percentage < 1) {
		scrolledPercentage = this.elem.scrollLeft / this.elem.scrollWidth;
		setPosition(this.handleH, [
			undefined,
			(1 - scrolledPercentage - percentage) * this.elem.clientWidth,
			0,
			scrolledPercentage * this.elem.clientWidth,
		]);
		this.handleH.firstChild.className = 'scrollbars-handle horizontal show';
	}

	this.hide();
};

Scrollbars.prototype.destroy = function Scrollbars_destroy() {
	var self = this;
	if (this.dragging && this.dragging.handler)
		this._endDrag(); // clear global events
	this.wrapper.removeChild(this.elem);
	this.wrapper.parentNode.replaceChild(this.elem, this.wrapper);
	classes(this.elem).remove('scrollbars-override');

	var style = this.elem.style;
	style.top = this.elemstyle.top;
	style.right = this.elemstyle.right;
	style.left = this.elemstyle.left;
	style.bottom = this.elemstyle.bottom;
};

// create a handle
function handle(klass, pos) {
	// a container that has the handles position
	var container = document.createElement('div');
	var style = container.style;
	style.position = 'absolute';
	setPosition(container, pos);

	// the handle itself
	var handle = document.createElement('div');
	handle.className = 'scrollbars-handle ' + klass;
	container.appendChild(handle);

	return container;
}

// set absolute positioning properties
var props = ['top', 'right', 'bottom', 'left'];
function setPosition(el, positions) {
	for (var i = 0; i < props.length; i++) {
		var prop = props[i];
		var pos = positions[i];
		if (typeof pos !== 'undefined')
			el.style[prop] = Math.round(pos) + 'px';
	}
}

function empty(el) {
	while (el.firstChild)
		el.removeChild(el.firstChild);
}
