THREE.Plane.prototype.intersectPlane = function ( plane, optionalTarget ) {
	var EPS = 1e-9

	var ax = this.normal.toArray()
	,   ad = this.constant
	,   bx = plane.normal.toArray()
	,   bd = plane.constant

	for(var i = 0; i < 6; i++) {
		var f = i < 2 ? 1 : 0
		,   l = i < 4 ? 2 : 1

		var ai = i >> 1
		,   bi = i % 2 ? f : l
		,   zi = i % 2 ? l : f

		var aa = ax[ai]
		,   ab = ax[bi]
		,   ba = bx[ai]
		,   bb = bx[bi]

		var dv = (bb * aa - ab * ba)
		,   bv = (ba * ad - aa * bd) / dv
		,   av = - (ab * bv + ad) / aa

		if(Math.abs(aa) > EPS && Math.abs(dv) > EPS) {

			var result = optionalTarget || new THREE.Ray()
			result.direction.crossVectors( this.normal, plane.normal ).normalize()

			result.origin.setComponent(ai, av)
			result.origin.setComponent(bi, bv)
			result.origin.setComponent(zi, 0)

			return result
		}
	}

	return null
}

THREE.Box2.prototype.emptyEPS = function() {
	var EPS = 1e-9
	return this.max.x - this.min.x < EPS
		|| this.max.y - this.min.y < EPS
}

THREE.Ray.prototype.atY = function( y, optionalTarget ) {

	if(optionalTarget == null) optionalTarget = new THREE.Vector3

	var length = (y - this.origin.y) / this.direction.y;

	return this.at(length, optionalTarget);
}

THREE.Ray.prototype.distanceToPlane = function ( plane, extend ) {

	var denominator = plane.normal.dot( this.direction );
	if ( denominator == 0 ) {

		// line is coplanar, return origin
		if ( plane.distanceToPoint( this.origin ) == 0 ) {

			return 0;
		}
		return null;
	}

	var t = - ( this.origin.dot( plane.normal ) + plane.constant ) / denominator;

	return extend || t >= 0 ? t :  null;

}

THREE.Ray.prototype.intersectPlane = function ( plane, optionalTarget, extend ) {

	if(optionalTarget == null) optionalTarget = new THREE.Vector3

	var t = this.distanceToPlane( plane, extend );

	if ( t === null ) {
		return null;
	}

	return this.at( t, optionalTarget );
}

THREE.Sphere.prototype.expandByPoint = function ( point ) {
	this.center.sub( point );

	var l1 = this.center.length() + this.radius;

	this.radius = l1 / 2;
	this.center.setLength( l1 );
	this.center.add( point );

	return this;

}

THREE.Sphere.prototype.union = function ( sphere ) {
	this.center.sub( sphere.center );

	var l1 = this.center.length() + this.radius;
	var l2 = l1 + sphere.radius;

	this.radius = l2 / 2;
	this.center.setLength( l1 );
	this.center.add( sphere.center );
	this.center.lerp( sphere.center, l2 / l1 );

	return this;

}


!function() {

var objectTypeMap = {
	Scene            : 'SC',
	Sprite           : 'SP',
	PerspectiveCamera: 'PC',
	Group            : 'GR',
	Object3D         : 'O3',
	Mesh             : 'MS',
	Line             : 'LN',
	LineSegments     : 'LS',
	LineLoop         : 'LL',
	Points           : 'PT',
	AmbientLight     : 'AL',
	PointLight       : 'PL',
	DirectionalLight : 'DL'
}
function describeObject(object, options) {
	var fields = []

	var map = options.map || 'tnmglprs'
	for(var i = 0; i < map.length; i++) {
		if(i > 0) fields.push(' ')

		switch(map[i]) {

		case 't': fields.push(
			objectTypeMap[object.type] || object.type)
		break

		case 'n': fields.push(
			'{'+ (object.name || '') +'}')
		break

		case 'm': fields.push(
			object.material ? '<'+ (object.material instanceof Array
				? '['+ object.material.map(function(m) { return m.name || '' }).join(',') +']'
				: object.material.name || '') +'>'
			: '')
		break

		case 'g': fields.push(
			object.geometry
				? (object.geometry instanceof THREE.BufferGeometry
					? object.geometry.attributes.position && object.geometry.attributes.position.count || 0
					: object.geometry.vertices.length) +'v'
				: '')
		break

		case 'l': fields.push(
			object.layers.mask +'=')
		break

		case 'p': fields.push(
			'[',
			f.mround(object.position.x, 3) +', ',
			f.mround(object.position.y, 3) +', ',
			f.mround(object.position.z, 3), ']')
		break

		case 'r': fields.push(
			'[',
			f.hround(f.xdeg * object.rotation.x) +', ',
			f.hround(f.xdeg * object.rotation.y) +', ',
			f.hround(f.xdeg * object.rotation.z), ']')
		break

		case 's': fields.push(
			'[',
			f.mround(object.scale.x, 3) +', ',
			f.mround(object.scale.y, 3) +', ',
			f.mround(object.scale.z, 3), ']')
		break

		}
	}

	return fields
}

THREE.Object3D.prototype.describe = function(options) {
	f.tmap(this, describeObject, null, f.copy({
		property: 'children',
		print: true,
		align: [1,1,1]
	}, options))
}

}()
