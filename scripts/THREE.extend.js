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
}

THREE.Box2.prototype.emptyEPS = function() {
	var EPS = 1e-9
	return this.max.x - this.min.x < EPS
		|| this.max.y - this.min.y < EPS
}

THREE.Ray.prototype.atY = function( y, optionalTarget ) {

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

	var t = this.distanceToPlane( plane, extend );

	if ( t === null ) {
		return null;
	}

	return this.at( t, optionalTarget );
}
