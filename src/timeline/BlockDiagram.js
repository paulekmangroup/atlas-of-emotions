import timeline from './timeline.js';
import { TweenMax, TimelineMax } from "gsap";


/**
 * Represents the Block Diagram aspect of the visualization
 * @param element The element that contains the block diagram
 * @param parent The element that contains the episode
 * @constructor
 */

export default function BlockDiagram( element, parent ) {

	this.element = element;

	this.parent = parent;

	this.blocks = timeline.getChildren( element );

	this.onComplete = function () {
	};

	for ( var i = 0; i < this.blocks.length; i++ ) {
		this.blocks[ i ].style.visibility = 'hidden';
	}

	this.getBlockForElement = function ( element ) {
		return timeline.select( '#' + element.getAttribute( 'id' ) + '-block', this.element );
	};

	this.getCaptionForElement = function ( element ) {
		return timeline.select( '#' + element.getAttribute( 'id' ) + '-caption', timeline.container );
	};

	this.getActiveCaption = function () {
		return timeline.select( '.diagram-caption.active', timeline.container );
	};

	this.toggleElement = function ( element ) {

		var block = this.getBlockForElement( element );

		var transitionTime = 1;
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
	};

	this.mouseOverHandler = function ( element ) {
		var activeCaption = this.getActiveCaption();
		var caption = this.getCaptionForElement( element );
		//show and hide captions
		if ( activeCaption ) {
			activeCaption.classList.remove( 'active' );
		}
		if ( caption ) {
			caption.classList.add( 'active' );
		}
	};

	this.mouseOutHandler = function ( element ) {
		var activeCaption = this.getActiveCaption();
		if ( activeCaption ) {
			activeCaption.classList.remove( 'active' );
		}
	};

	this.addHoverHandler = function ( element ) {
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
	};

	this.checkCompletion = function () {
		var complete = true;
		for ( var i = 0; i < this.blocks.length; i++ ) {
			if ( this.blocks[ i ].style.visibility == 'hidden' ) {
				complete = false;
			}
		}
		if ( complete ) {
			this.onComplete();
		}
	};

	this.addMouseHandlers = function ( elements ) {
		for ( var i = 0; i < elements.length; i++ ) {
			this.addClickHandler( elements[ i ] );
			this.addHoverHandler( elements[ i ] );
		}
	};

	this.addClickHandler = function ( element ) {
		element.addEventListener( 'click', function () {
			this.toggleElement( element );
		}.bind( this ) );
		this.getBlockForElement( element ).addEventListener( 'click', function () {
			this.toggleElement( element );
		}.bind( this ) );
		element.classList.add( 'clickable' );
	};

}