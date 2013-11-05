define([
	'config/types',
	'render/shared/initFragment',
	'render/DomFragment/shared/insertHtml',
	'render/DomFragment/Text',
	'render/DomFragment/Interpolator',
	'render/DomFragment/Section',
	'render/DomFragment/Triple',
	'render/DomFragment/Element/_index',
	'render/DomFragment/Partial/_index',
	'render/DomFragment/Component/_index',
	'render/DomFragment/Comment'
], function (
	types,
	initFragment,
	insertHtml,
	Text,
	Interpolator,
	Section,
	Triple,
	Element,
	Partial,
	Component,
	Comment
) {

	'use strict';

	var DomFragment = function ( options ) {
		if ( options.parentNode ) {
			this.docFrag = document.createDocumentFragment();
		}

		// if we have an HTML string, our job is easy.
		if ( typeof options.descriptor === 'string' ) {
			this.html = options.descriptor;

			if ( this.docFrag ) {
				this.nodes = insertHtml( options.descriptor, options.parentNode.tagName, this.docFrag );
			}
			
			return; // prevent the rest of the init sequence
		}

		// otherwise we need to make a proper fragment
		initFragment( this, options );
	};

	DomFragment.prototype = {
		createItem: function ( options ) {
			if ( typeof options.descriptor === 'string' ) {
				return new Text( options, this.docFrag );
			}

			switch ( options.descriptor.t ) {
				case types.INTERPOLATOR: return new Interpolator( options, this.docFrag );
				case types.SECTION:      return new Section( options, this.docFrag );
				case types.TRIPLE:       return new Triple( options, this.docFrag );
				case types.ELEMENT:      return new Element( options, this.docFrag );
				case types.PARTIAL:      return new Partial( options, this.docFrag );
				case types.COMPONENT:    return new Component( options, this.docFrag );
				case types.COMMENT:      return new Comment( options, this.docFrag );

				default: throw new Error( 'WTF? not sure what happened here...' );
			}
		},

		teardown: function ( detach ) {
			var node;

			// if this was built from HTML, we just need to remove the nodes
			if ( detach && this.nodes ) {
				while ( this.nodes.length ) {
					node = this.nodes.pop();
					node.parentNode.removeChild( node );
				}
				return;
			}

			// otherwise we need to do a proper teardown
			if ( !this.items ) {
				return;
			}

			while ( this.items.length ) {
				this.items.pop().teardown( detach );
			}
		},

		firstNode: function () {
			if ( this.items && this.items[0] ) {
				return this.items[0].firstNode();
			} else if ( this.nodes ) {
				return this.nodes[0] || null;
			}

			return null;
		},

		findNextNode: function ( item ) {
			var index = item.index;

			if ( this.items[ index + 1 ] ) {
				return this.items[ index + 1 ].firstNode();
			}

			// if this is the root fragment, and there are no more items,
			// it means we're at the end
			if ( this.owner === this.root ) {
				return null;
			}

			return this.owner.findNextNode( this );
		},

		toString: function () {
			var html, i, len, item;
			
			if ( this.html ) {
				return this.html;
			}

			html = '';

			if ( !this.items ) {
				return html;
			}

			len = this.items.length;

			for ( i=0; i<len; i+=1 ) {
				item = this.items[i];
				html += item.toString();
			}

			return html;
		}
	};

	return DomFragment;

});