import d3 from 'd3';
import { TweenMax, TimelineMax } from "gsap";
import appStrings from '../appStrings.js';

import timeline from './timeline.js';

/**
 * Represents the Block Diagram aspect of the visualization
 */

export default class BlockDiagram {

	getRefractoryBlocks() {
		return [
			this.getBlockByName( 'precondition' ),
			this.getBlockByName( 'perceptual-database' ),
			this.getBlockByName( 'mental-changes' ),
			this.getBlockByName( 'physical-changes' ),
			this.getBlockByName( 'constructive-response' ),
			this.getBlockByName( 'ambiguous-response' )
		];
	}

	getBlockByName( name ) {
		return timeline.select( '#' + name + '-block', this.element );
	}

	getBlockString( element ) {
		return element.id.match( /(.+)-block/ )[ 1 ].replace( '-', '_' );
	}

	getBlockForElement( element ) {
		return timeline.select( '#' + element.getAttribute( 'id' ) + '-block', this.element );
	}

	getCaptionForElement( element ) {
		return timeline.select( '#' + element.getAttribute( 'id' ) + '-caption', timeline.sectionContainer );
	}

	getActiveCaption() {
		return timeline.select( '.diagram-caption.active', timeline.sectionContainer );
	}

	toggleElement( element ) {

		let block = this.getBlockForElement( element );

		let transitionTime = 1;
		if ( block.style.visibility == 'hidden' ) {
			TweenMax.to( block, transitionTime, { autoAlpha: 1, ease: Power2.easeOut } );
			TweenMax.to( element, transitionTime, { autoAlpha: 0, ease: Power2.easeOut } );
		} else {
			TweenMax.to( block, transitionTime, { autoAlpha: 0, ease: Power2.easeOut } );
			TweenMax.to( element, transitionTime, { autoAlpha: 1, ease: Power2.easeOut } );
		}

		setTimeout( function () {
			this.checkCompletion();
		}.bind( this ), (transitionTime + 0.1) * 1000 );
	}

	mouseOverHandler( element ) {
		let activeCaption = this.getActiveCaption();
		let caption = this.getCaptionForElement( element );
		//show and hide captions
		if ( activeCaption ) {
			timeline.removeClass( activeCaption, 'active' );
		}
		if ( caption ) {
			timeline.addClass( caption, 'active' );
		}
	}

	mouseOutHandler( element ) {
		let activeCaption = this.getActiveCaption();
		if ( activeCaption ) {
			timeline.removeClass( activeCaption, 'active' );
		}
	}

	addHoverHandler( element ) {
		element.addEventListener( 'mouseover', function () {
			this.mouseOverHandler.call( this, element );
		}.bind( this ) );
		this.getBlockForElement( element ).addEventListener( 'mouseover', function () {
			this.mouseOverHandler.call( this, element );
		}.bind( this ) );
		element.addEventListener( 'mouseout', function () {
			this.mouseOutHandler.call( this, element );
		}.bind( this ) );
		this.getBlockForElement( element ).addEventListener( 'mouseout', function () {
			this.mouseOutHandler.call( this, element );
		}.bind( this ) );
	}

	checkCompletion() {
		let complete = true;
		for ( let i = 0; i < this.blocks.length; i++ ) {
			if ( this.blocks[ i ].style.visibility == 'hidden' ) {
				complete = false;
			}
		}
		if ( complete ) {
			this.onComplete && this.onComplete();
		}
	}

	addMouseHandlers( elements ) {
		for ( let i = 0; i < elements.length; i++ ) {
			this.addClickHandler( elements[ i ] );
			this.addHoverHandler( elements[ i ] );
		}
	}

	addClickHandler( element ) {
		element.addEventListener( 'click', function () {
			this.toggleElement( element );
		}.bind( this ) );
		this.getBlockForElement( element ).addEventListener( 'click', function () {
			this.toggleElement( element );
		}.bind( this ) );
		timeline.addClass( element, 'clickable' );
	}


	/**
	 * Builds the block diagram behavior based on the svg and the dom
	 * @param element The element that contains the block diagram
	 * @param parent The element that contains the episode
	 * @constructor
	 */
	constructor( element, parent ) {

		this.element = element;

		this.parent = parent;

		this.blocks = timeline.getChildren( element );

		for ( let i = 0; i < this.blocks.length; i++ ) {

			this.blocks[ i ].style.visibility = 'hidden';


			let blockAppString = this.getBlockString( this.blocks[ i ] );
			let label = appStrings().getStr( `emotionsData.metadata.timeline.secondary.blocks.labels.${ blockAppString }` );
			let childNodes = [].slice.call( this.blocks[ i ].childNodes );

			// order is important here, because uppercase changes the computed text length
			let tspans = d3.select( this.blocks[ i ] ).selectAll( 'tspan' );
			tspans
				.attr( 'text-anchor', 'middle' )
				.attr( 'x', function () {
					return parseFloat( this.getComputedTextLength() ) / 2 + parseFloat( this.getAttribute( 'x' ) );
				} )
				.text( function ( d, i ) {
					if ( tspans[ 0 ].length > 1 ) {
						//heuristic for 'emotional state'
						//split label into words and put each word in its corresponding tspan
						let words = label.split( ' ' );
						return words[ i ];
					} else {
						return label;
					}
				} );
			if ( this.blocks[ i ].id != 'state-block' ) {
				this.blocks[ i ].style.textTransform = 'uppercase';
			}

		}
	}

}