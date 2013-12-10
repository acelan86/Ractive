define([
	'config/types',
	'utils/matches',
	'render/shared/initMustache',
	'render/shared/updateMustache',
	'render/shared/resolveMustache',
	'render/DomFragment/shared/insertHtml',
	'shared/teardown'
], function (
	types,
	matches,
	initMustache,
	updateMustache,
	resolveMustache,
	insertHtml,
	teardown
) {
	
	'use strict';

	var DomTriple = function ( options, docFrag ) {
		this.type = types.TRIPLE;

		if ( docFrag ) {
			this.nodes = [];
			this.docFrag = document.createDocumentFragment();
		}

		this.initialising = true;
		initMustache( this, options );
		if ( docFrag ) {
			docFrag.appendChild( this.docFrag );
		}
		this.initialising = false;
	};

	DomTriple.prototype = {
		update: updateMustache,
		resolve: resolveMustache,

		detach: function () {
			while ( this.nodes.length ) {
				this.docFrag.appendChild( this.nodes.pop() );
			}

			return this.docFrag;
		},

		teardown: function ( destroy ) {
			if ( destroy ) {
				this.detach();
				this.docFrag = this.nodes = null;
			}

			teardown( this );
		},

		firstNode: function () {
			if ( this.nodes[0] ) {
				return this.nodes[0];
			}

			return this.parentFragment.findNextNode( this );
		},

		render: function ( html ) {
			var node;

			if ( !this.nodes ) {
				// looks like we're in a server environment...
				// nothing to see here, move along
				return;
			}

			// remove existing nodes
			while ( this.nodes.length ) {
				node = this.nodes.pop();
				node.parentNode.removeChild( node );
			}

			if ( html === undefined ) {
				this.nodes = [];
				return;
			}

			// get new nodes
			this.nodes = insertHtml( html, this.pNode.tagName, this.docFrag );

			if ( !this.initialising ) {
				this.pNode.insertBefore( this.docFrag, this.parentFragment.findNextNode( this ) );
			}
		},

		toString: function () {
			return ( this.value !== undefined ? this.value : '' );
		},

		find: function ( selector ) {
			var i, len, node, queryResult;

			len = this.nodes.length;
			for ( i = 0; i < len; i += 1 ) {
				node = this.nodes[i];

				if ( node.nodeType !== 1 ) {
					continue;
				}

				if ( matches( node, selector ) ) {
					return node;
				}

				if ( queryResult = node.querySelector( selector ) ) {
					return queryResult;
				}
			}

			return null;
		},

		findAll: function ( selector, queryResult ) {
			var i, len, node, queryAllResult, numNodes, j;

			len = this.nodes.length;
			for ( i = 0; i < len; i += 1 ) {
				node = this.nodes[i];

				if ( node.nodeType !== 1 ) {
					continue;
				}

				if ( matches( node, selector ) ) {
					queryResult.push( node );
				}

				if ( queryAllResult = node.querySelectorAll( selector ) ) {
					numNodes = queryAllResult.length;
					for ( j = 0; j < numNodes; j += 1 ) {
						queryResult.push( queryAllResult[j] );
					}
				}
			}
		}
	};

	return DomTriple;

});