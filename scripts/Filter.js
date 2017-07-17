function Filter() {
	this.events = new EventEmitter();
	this.arr_house = [];

	this.dialog = new Dialog(true)
	dom.addclass(this.dialog.element, 'template-dialog')
	dom.addclass(this.dialog.elements.outer, 'popup-filter');

	var cont  = dom.div('filter-cont'),
		left  = dom.div('left_path', cont),
		right = dom.div('right_path', cont),
		cont_result = dom.div('cont_res', right),
		filter = dom.div('filter', left),
		cont_filter = dom.div('cont_filter', filter)

	this.left_path = left;
	this.cont_filter = cont_filter;
	this.cont_result = cont_result;
	this.content = cont;

	dom.append(this.dialog.content, this.content);

	main.bus.on('tpl_filter', this.dialog.open, this.dialog)
	main.bus.on('tpl_change', this.dialog.close, this.dialog)
};
Filter.prototype = {

	createElemFilter: function(parent, min, max, str, layer){
		var elem = dom.div('item-flt', parent),
		   title = dom.div('item-tlt', elem);

		Locale.setText(title, str)

		var root_range = dom.div('range', elem);
		var elem_range = dom.div('parent-range', root_range);
		var child = dom.div('child-range', elem_range);
		var cont_child = dom.div('cont-child-range', child);
		var first_range = dom.div('first-range hand', elem_range);
		var second_range = dom.div('second-range hand', elem_range);
		var cont_range1 = dom.div('cont_range_text', first_range);
		var cont_range2 = dom.div('cont_range_text', second_range);

		child.style.left = '0%';
		child.style.right = '50%';
		var range = {
			parent: root_range,
			elem_range: elem_range,
			child_range: child,
			first_range: first_range,
			second_range: second_range,
			cont_child: cont_child,
			cont_first_range: cont_range1,
			cont_second_range: cont_range2,
			drag1: new Drag(first_range),
			drag2: new Drag(second_range)
		}

		if(layer) {
			var elem_radio = this.createElemLayer(min, max);
			dom.append(root_range, elem_radio);
		} else {
			var elem_range_val = this.createRangeVal(range, min, max);
			dom.append(root_range, elem_range_val);
		}

		range.min = min;
		range.max = max;

		var scale = (max - min)/root_range.offsetWidth
		var s_x = min + Math.floor((max - min)/2);

		range.drag2.min.x = range.drag1.min.x = min;
		range.drag1.max.x = range.drag2.max.x = max;
		range.drag1.scale = range.drag2.scale = scale;

		if(range.elem_val) {
			dom.text(range.elem_val.first, min);
			dom.text(range.elem_val.second, s_x);
		}

		range.drag1.events.on('drag', this.onDragMove, this, range);
		range.drag2.events.on('drag', this.onDragMove, this, range);

		return range
	},

	onDragMove: function(obj) {
		this.posElem(obj)
		this.endDraw()
	},

	createFilter: function(){
		var parent = this.cont_filter;
		var max = this.max_val;
		var min = this.min_val;
		var min_f = 1
		var max_f = Math.max(4, max.f);
		this.range_floor = this.createElemFilter(parent, min_f, max_f, 'filter_title_floor', true);
		this.range_floor.drag1.offset.x = min_f;
		this.range_floor.drag2.offset.x = min_f + Math.floor(3/4 * (max_f - min_f));
		this.posElem(this.range_floor)

		var elem_figure = dom.div('item-flt', parent),
			tlt_elem_figure = dom.div('item-tlt', elem_figure)

		Locale.setText(tlt_elem_figure, 'filter_title_figure')

		this.list = new Block.Menu({
			iname: 'filter-tool-menu',
			eroot: elem_figure,
			cname: 'filter-tool-itel',
			icons: [
				'tf-square',
				'tf-rcorn',
				'tf-cross',
				'tf-tlike',
				'tf-poly'
			],
			labels: [
				null,
				null,
				null,
				null,
				null,
				'filter_shape_any'
			],
			items: [
				'square',
				'rcorn',
				'cross',
				'tlike',
				'poly',
				'any'
			]
		});

		this.range_perimetr = this.createElemFilter(parent, min.p, max.p, 'filter_title_perimetr');
		this.range_perimetr.drag1.offset.x = min.p;
		this.range_perimetr.drag2.offset.x = min.p + Math.floor(3/4 * (max.p - min.p));
		this.posElem(this.range_perimetr)

		this.range_s = this.createElemFilter(parent, min.s, max.s, 'filter_title_area');
		this.range_s.drag1.offset.x = min.s;
		this.range_s.drag2.offset.x = min.s + Math.floor(3/4 * (max.s - min.s));
		this.posElem(this.range_s)

		this.list.set(5);
		this.list.events.on('change', this.endDraw, this);

		this.endDraw()
	},

	posElem: function(obj){
		var min_x = Math.round(Math.min(obj.drag1.offset.x, obj.drag2.offset.x));
		var max_x = Math.round(Math.max(obj.drag1.offset.x, obj.drag2.offset.x));
		var diff = obj.max - obj.min;

		var r = Math.round(((obj.max - max_x)/diff)*100);
		var l = Math.round(((min_x - obj.min)/diff)*100);
		var l_1 = Math.floor(((Math.round(obj.drag1.offset.x) - obj.min)/diff)*100);
		var l_2 = Math.floor(((Math.round(obj.drag2.offset.x) - obj.min)/diff)*100);

		obj.child_range.style.left = l+'%';
		obj.child_range.style.right = r+'%';

		obj.drag1.element.style.left = l_1 + '%';
		obj.drag2.element.style.left = l_2 + '%';

		if(obj.elem_val) {
			dom.text(obj.elem_val.first, Math.round(obj.drag1.offset.x));
			dom.text(obj.elem_val.second, Math.round(obj.drag2.offset.x));
		};
	},

	endDraw: function(){
		var f = this.range_floor;
		var p = this.range_perimetr;
		var s = this.range_s;

		var obj = {
			f_from: Math.round(Math.min(f.drag1.offset.x, f.drag2.offset.x)),
			f_to:   Math.round(Math.max(f.drag1.offset.x, f.drag2.offset.x)),
			p_from: Math.min(p.drag1.offset.x, p.drag2.offset.x),
			p_to:   Math.max(p.drag1.offset.x, p.drag2.offset.x),
			s_from: Math.min(s.drag1.offset.x, s.drag2.offset.x),
			s_to:   Math.max(s.drag1.offset.x, s.drag2.offset.x),
			figure: this.list.activeItem
		};

		for(var i = 0, l = this.arr_house.length; i < l; i++){
			var elem = this.arr_house[i];
			var res = this.checkHouse(elem, obj);

			dom.togclass(elem.element, 'hide', !res);
		};
	},

	createRangeVal: function(obj, min, max){

		var elem = dom.div('val_range');
		var cont_elem = dom.div('cont_val_range hand', elem);
		var f_val = dom.div('val first_val ', obj.cont_first_range);
		var s_val = dom.div('val secont_val ', obj.cont_second_range);

		var min_val = dom.div('val min_val', cont_elem);
		var max_val = dom.div('val max_val', cont_elem);

		dom.text(min_val, min);
		dom.text(max_val, max);

		obj.elem_val = {
			first : f_val,
			second: s_val
		};
		return elem
	},

	createElemLayer: function(min, max){
		var num_input = max - min + 1;

		var parent = dom.div('cont_elem_label');
		var width = 100/(num_input - 1);
		for(var i = 0; i < num_input; i++) {
			var div = dom.div('cont_itm_lbl', parent),
				elem = dom.div('item', div),
				text = dom.div('num_floor', div)

			dom.addclass(elem, 'stripe')
			div.style.left = (i * width) +'%'
			dom.text(text, min + i);
		}

		return parent;
	},

	checkHouse: function(h_obj, s_obj){

		if(h_obj.s_house < s_obj.s_from || h_obj.s_house > s_obj.s_to) {
			return false
		}
		if(h_obj.p_first_floot < s_obj.p_from || h_obj.p_first_floot > s_obj.p_to) {
			return false
		}
		if(h_obj.floot < s_obj.f_from || h_obj.floot > s_obj.f_to) {
			return false
		}
		if(s_obj.figure !== 'any' && h_obj.figure !== 'any' && h_obj.figure !== s_obj.figure) {
			return false
		}
		return true
	},

	createElemHouse: function(obj, i){
		var elem = dom.div('item-house hand'),
			cont = dom.div('cont-img', elem),
			img  = dom.img(null, 'img-house', cont),
			cont_tlt = dom.div('cont-title', elem),
			title = dom.div('title', cont_tlt);

		img.src = obj.thumb
		Locale.setText(title, obj.desc);
		dom.on('tap', elem, main.bus.will('tpl_change', i))

		obj.element = elem

		this.min_val.s = Math.min(obj.s_house, this.min_val.s);
		this.max_val.s = Math.max(obj.s_house, this.max_val.s);

		this.min_val.p = Math.min(obj.p_first_floot, this.min_val.p);
		this.max_val.p = Math.max(obj.p_first_floot, this.max_val.p);

		this.min_val.f = Math.min(obj.floot, this.min_val.f);
		this.max_val.f = Math.max(obj.floot, this.max_val.f);

		dom.append(this.cont_result, elem);

		this.arr_house.push(obj);
	},
	createHouse: function(arr){

		this.max_val = {
			s: 0,
			p: 0,
			f: 0
		};
		this.min_val = {
			s: 10000,
			p: 10000,
			f: 10000
		};

		for(var i = 0; i < arr.length; i++){
			this.createElemHouse(arr[i], i);
		};
		for(var key in this.max_val) {
			var num = this.max_val[key];
			var t = Math.pow(10, f.exp(num)),
			    new_num = Math.ceil(num/t) * t;
			this.max_val[key] = Math.ceil(new_num);
		}
		for(var key in this.min_val) {
			var num = this.min_val[key];
			var t = Math.pow(10, f.exp(num)),
			    new_num = Math.floor(num/t) * t;
			this.min_val[key] = Math.floor(new_num);
		}

		this.createFilter()
		this.resizeForm()
	},

	resizeForm: function(){
		var f = this.range_floor;
		var p = this.range_perimetr;
		var s = this.range_s;
		var arr = [f, s, p];
		for(var i = 0, l = arr.length; i < l; i++){
			var obj = arr[i];

			var width = obj.parent.offsetWidth;
			var scale = (obj.max - obj.min)/width;
			obj.drag1.scale = obj.drag2.scale = scale;
		}
	}

};
