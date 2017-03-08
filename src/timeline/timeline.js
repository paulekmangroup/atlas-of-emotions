//TODO this file contains a bunch of low level stuff that probably belongs elsewhere or is in d3 etc
import Episode from './Episode.js';

const timeline = {
	isInited: false,
	isActive: false,
	screenIsSmall: false,
	displayingIntro: false,
	currentEmotion: null,

	//work around safari missing children property in svg nodes
	getChildren: function ( element ) {
		var svgChildren = element.children || element.childNodes;
		var children = [];
		for ( var i = 0; i < svgChildren.length; i++ ) {
			if ( svgChildren[ i ].nodeType == Node.TEXT_NODE || svgChildren[ i ].nodeType == Node.COMMENT_NODE ) continue;
			children.push( svgChildren[ i ] );
		}
		return children;
	},

	addFonts: function ( svg ) {
		var fontCss = "@import url('https://fonts.googleapis.com/css?family=Raleway');",
			style = document.createElement( 'style' );

		style.type = 'text/css';

		if ( style.styleSheet ) {
			style.styleSheet.cssText = fontCss;
		} else {
			style.appendChild( document.createTextNode( fontCss ) );
		}

		svg.getElementsByTagName( 'defs' )[ 0 ].appendChild( style );
	},

	select: function ( selector, parent ) {
		return parent.querySelector( selector );
	},

	selectAll: function ( selector, parent ) {
		return parent.querySelectorAll( selector );
	},


	extractDocument: function ( svgElement, container ) {

		var NS = "http://www.w3.org/2000/svg";

		// pull svg element out of the document and make it self center so that
		// illumination can be animated across it

		var originalWidth = svgElement.getAttribute( "width" ),
			originalHeight = svgElement.getAttribute( 'height' ),
			originalViewBox = svgElement.getAttribute( 'viewBox' );
		svgElement.setAttribute( 'overflow', 'visible' );
		svgElement.setAttribute( 'width', '100%' );
		svgElement.setAttribute( 'height', '100%' );
		svgElement.removeAttribute( 'viewBox' );
		svgElement.setAttribute( 'preserveAspectRatio', 'none' );
		var svgChildrenGroup = svgElement.getElementsByTagName( 'g' )[ 0 ];

		var wrapperSVG = document.createElementNS( NS, 'svg' );
		wrapperSVG.setAttribute( 'x', '50%' );
		wrapperSVG.setAttribute( 'y', '50%' );
		wrapperSVG.setAttribute( 'width', originalWidth );
		wrapperSVG.setAttribute( 'height', originalHeight );
		wrapperSVG.removeAttribute( 'viewBox' );
		wrapperSVG.setAttribute( 'overflow', 'visible' );
		wrapperSVG.appendChild( svgChildrenGroup );

		var wrapperGroup = document.createElementNS( NS, 'g' );
		wrapperGroup.setAttribute( 'transform', 'translate(' + (-0.5 * parseInt( originalWidth )) + ', ' + (-0.5 * parseInt( originalHeight )) + ')' );
		wrapperGroup.appendChild( wrapperSVG );

		svgElement.appendChild( wrapperGroup );

		var newParentDiv = document.createElement( 'div' );
		newParentDiv.classList.add( 'episode-parent' );
		newParentDiv.appendChild( svgElement );
		container.appendChild( newParentDiv );

		return newParentDiv;

	},

	loadEpisode: function () {
		var ajax = new XMLHttpRequest();
		ajax.open( 'GET', '/img/episode.svg', true )
		ajax.send()
		ajax.onload = function ( e ) {
			// no awareness version
			var container = document.getElementById( 'timeline-graphics' );
			var episode = new Episode( e.currentTarget.responseXML.documentElement, container );
		}
	},

	loadEpisodeAddAwareness: function () {
		// awareness version
		var episodeObjectAddAwareness = document.getElementById( 'episode-object--add-awareness' );
		var episodeAddAwareness = new EpisodeAddAwareness( episodeObjectAddAwareness.getSVGDocument(), episodeObjectAddAwareness );
	},

	init: function ( containerNode, screenIsSmall ) {

		this.sectionContainer = containerNode;

		this.screenIsSmall = screenIsSmall;

		this.loadEpisode();

		this.isInited = true;

	},

	setActive: function ( val ) {

		let section = this;
		this.isActive = val;

	},

	setInteractive: function ( val ) {

	},

	setEmotion: function ( emotion, previousEmotion ) {

		var _self = this;

		return new Promise( ( resolve, reject ) => {
			_self.currentEmotion = emotion;
			resolve();
		} );

	},

	open: function ( options ) {

		this.setActive( true );
		this.setInteractive( true );

	},

	close: function ( nextSection ) {

		return new Promise( ( resolve, reject ) => {

			this.setActive( false );
			this.setInteractive( false );

			resolve();
		} );
	}

};

export default timeline;
