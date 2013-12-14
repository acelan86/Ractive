define([
	'utils/isEqual',
	'utils/defineProperty',
	'shared/clearCache',
	'shared/notifyDependants',
	'shared/registerDependant',
	'shared/unregisterDependant',
	'render/shared/Evaluator/Reference',
	'render/shared/Evaluator/SoftReference'
], function (
	isEqual,
	defineProperty,
	clearCache,
	notifyDependants,
	registerDependant,
	unregisterDependant,
	Reference,
	SoftReference
) {

	'use strict';

	var Evaluator, cache = {};

	Evaluator = function ( root, keypath, functionStr, args, priority ) {
		var i, arg;

		this.root = root;
		this.keypath = keypath;
		this.priority = priority;

		this.fn = getFunctionFromString( functionStr, args.length );
		this.values = [];
		this.refs = [];

		i = args.length;
		while ( i-- ) {
			if ( arg = args[i] ) {
				if ( arg[0] ) {
					// this is an index ref... we don't need to register a dependant
					this.values[i] = arg[1];
				}

				else {
					this.refs[ this.refs.length ] = new Reference( root, arg[1], this, i, priority );
				}
			}
			
			else {
				this.values[i] = undefined;
			}
		}

		this.selfUpdating = ( this.refs.length <= 1 );
		this.update();
	};

	Evaluator.prototype = {
		bubble: function () {
			// If we only have one reference, we can update immediately...
			if ( this.selfUpdating ) {
				this.update();
			}

			// ...otherwise we want to register it as a deferred item, to be
			// updated once all the information is in, to prevent unnecessary
			// cascading. Only if we're already resolved, obviously
			else if ( !this.deferred ) {
				this.root._deferred.evals.push( this );
				this.deferred = true;
			}
		},

		update: function () {
			var value;

			// prevent infinite loops
			if ( this.evaluating ) {
				return this;
			}

			this.evaluating = true;
				
			try {
				value = this.fn.apply( null, this.values );
			} catch ( err ) {
				if ( this.root.debug ) {
					throw err;
				} else {
					value = undefined;
				}
			}

			if ( !isEqual( value, this.value ) ) {
				clearCache( this.root, this.keypath );
				this.root._cache[ this.keypath ] = value;
				notifyDependants( this.root, this.keypath );

				this.value = value;
			}

			this.evaluating = false;

			return this;
		},

		// TODO should evaluators ever get torn down? At present, they don't...
		teardown: function () {
			while ( this.refs.length ) {
				this.refs.pop().teardown();
			}

			clearCache( this.root, this.keypath );
			this.root._evaluators[ this.keypath ] = null;
		},

		// This method forces the evaluator to sync with the current model
		// in the case of a smart update
		refresh: function () {
			if ( !this.selfUpdating ) {
				this.deferred = true;
			}

			var i = this.refs.length;
			while ( i-- ) {
				this.refs[i].update();
			}

			if ( this.deferred ) {
				this.update();
				this.deferred = false;
			}
		},

		updateSoftDependencies: function ( softDeps ) {
			var i, keypath, ref;

			if ( !this.softRefs ) {
				this.softRefs = [];
			}

			// teardown any references that are no longer relevant
			i = this.softRefs.length;
			while ( i-- ) {
				ref = this.softRefs[i];
				if ( !softDeps[ ref.keypath ] ) {
					this.softRefs.splice( i, 1 );
					this.softRefs[ ref.keypath ] = false;
					ref.teardown();
				}
			}

			// add references for any new soft dependencies
			i = softDeps.length;
			while ( i-- ) {
				keypath = softDeps[i];
				if ( !this.softRefs[ keypath ] ) {
					ref = new SoftReference( this.root, keypath, this );
					this.softRefs[ this.softRefs.length ] = ref;
					this.softRefs[ keypath ] = true;
				}
			}

			this.selfUpdating = ( this.refs.length + this.softRefs.length <= 1 );
		}
	};

	return Evaluator;


	function getFunctionFromString ( str, i ) {
		var fn, args;

		str = str.replace( /\$\{([0-9]+)\}/g, '_$1' );

		if ( cache[ str ] ) {
			return cache[ str ];
		}

		args = [];
		while ( i-- ) {
			args[i] = '_' + i;
		}

		fn = new Function( args.join( ',' ), 'return(' + str + ')' );

		cache[ str ] = fn;
		return fn;
	}

});