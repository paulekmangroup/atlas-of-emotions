//TODO this file contains a bunch of low level stuff that probably belongs elsewhere or is in d3 etc
//TODO should regular and add-awareness versions be running at the same time?

import Episode from './Episode.js';
import EpisodeAddAwareness from './EpisodeAddAwareness.js';
import { TweenMax } from "gsap";

const timeline = {
	isInited: false,
	isActive: false,
	screenIsSmall: false,
	displayingIntro: false,
	currentEmotion: null,
	episode: null,
	episodeAddAwareness: null,
	activeEpisode: null,
	container: document.getElementById( 'timeline-graphics' ),
	beginAwarenessButton: document.getElementById( 'begin-awareness' ),
	sectionTextBodyIntro: Array.prototype.slice.call( document.querySelectorAll( '#timeline-section .body-intro' ) ),
	sectionTextBodyAwareness: Array.prototype.slice.call( document.querySelectorAll( '#timeline-section [class*="body-awareness"]' ) ),
	episodeContent: {
		anger: {
			trigger: [ 'you are low on sleep', 'a stranger shouts at you', 'he seems like a bully' ],
			state: [ 'your body becomes tense', 'anger', 'you feel attacked' ],
			response: {
				'constructive-response': 'walk away',
				'destructive-response': 'shout back',
				'ambiguous-response': 'something else...'
			}
		},
		fear: {
			trigger: [ 'you step into the street', 'a stranger shouts at you', 'you may be in danger' ],
			state: [ 'your heart pounds', 'fear', 'you feel threatened' ],
			response: {
				'constructive-response': 'stop and look around',
				'destructive-response': 'imagine an accident',
				'ambiguous-response': 'something else...'
			}
		},
		disgust: {
			trigger: [ 'you\'re at the library', 'a stranger shouts at you', 'his voice is unbearable' ],
			state: [ 'you shudder', 'disgust', 'you feel repulsed' ],
			response: {
				'constructive-response': 'walk away',
				'destructive-response': 'call him an idiot',
				'ambiguous-response': 'something else...'
			}
		},
		sadness: {
			trigger: [ 'you lost a game', 'a stranger shouts at you', 'it seems like rejection' ],
			state: [ 'your body weakens', 'sadness', 'you feel empty' ],
			response: {
				'constructive-response': 'call a friend',
				'destructive-response': 'be ashamed',
				'ambiguous-response': 'something else...'
			}
		},
		enjoyment: {
			trigger: [ 'you scored a touchdown', 'a stranger shouts at you', 'seems like you can\'t lose' ],
			state: [ 'your body tingles', 'enjoyment', 'you feel proud' ],
			response: {
				'constructive-response': 'smile to yourself',
				'destructive-response': 'gloat',
				'ambiguous-response': 'something else...'
			}
		}

	},

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

		svgElement.style.backgroundColor = 'transparent';

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
		// no awareness version
		var ajax = new XMLHttpRequest();
		var _self = this;
		ajax.open( 'GET', './img/episode.svg', true );
		ajax.send();
		ajax.onload = function ( e ) {
			_self.episode = new Episode( e.currentTarget.responseXML.documentElement, _self.container, _self.currentEmotion );
			_self.activeEpisode = _self.episode;
			if ( _self.isActive ) {
				_self.episode.setEmotion( _self.currentEmotion );
			}
		};
	},

	loadEpisodeAddAwareness: function () {
		// awareness version
		var ajax = new XMLHttpRequest();
		var _self = this;
		ajax.open( 'GET', './img/episode--add-awareness.svg', true );
		ajax.send();
		ajax.onload = function ( e ) {
			_self.episodeAddAwareness = new EpisodeAddAwareness( e.currentTarget.responseXML.documentElement, _self.container, _self.currentEmotion );
			_self.activeEpisode = _self.episodeAddAwareness;
			if ( _self.isActive ) {
				_self.episodeAddAwareness.setEmotion( _self.currentEmotion );
			}
		};
	},

	showAwarenessEpisode: function () {
		var _self = this;
		TweenMax.to(
			this.container,
			1,
			{
				autoAlpha: 0,
				onComplete: function () {
					_self.episode.getParentElement().style.display = 'none';
					_self.episode.setActive( false );
					_self.loadEpisodeAddAwareness();
					TweenMax.set( _self.container, {
						autoAlpha: 1
					} );
				}
			} );
	},

	getVisibleParagraphs: function ( stage ) {
		return this.sectionTextBodyAwareness.filter( e=>e.getAttribute( 'data-stage' ) == stage );
	},

	getHiddenParagraphs: function ( stage ) {
		return this.sectionTextBodyAwareness.filter( e=>e.getAttribute( 'data-stage' ) != stage );
	},

	showAwarenessCopy: function ( stage ) {
		var show = this.getVisibleParagraphs( stage );
		let stages = [].slice.call( document.querySelectorAll( 'div.body-awareness' ) );
		stages.forEach( function ( stage ) {
			stage.classList.add( 'closed' );
		} );
		document.querySelector( 'div.body-awareness[data-stage=' + stage + ']' ).classList.remove( 'closed' );

		TweenMax.set( show, { css: { clearProps: 'display' } } );
		TweenMax.to( show, 1, { autoAlpha: 1 } );
	},

	hideAwarenessCopy: function ( stage ) {
		var hide = this.getVisibleParagraphs( stage );
		TweenMax.to( hide, 1, {
			autoAlpha: 0, onComplete: ()=> {
				TweenMax.set( hide, { css: { display: 'none' } } );
			}
		} );
	},

	hideIntroCopy: function ( onComplete ) {
		TweenMax.to( this.sectionTextBodyIntro, 1, { autoAlpha: 0, onComplete: onComplete } );
	},

	addAwareness: function () {
		if ( !this.episodeAddAwareness ) {
			this.showAwarenessEpisode();
			this.hideIntroCopy( function () {
				TweenMax.set( this.sectionTextBodyIntro, { css: { display: 'none' } } );
				this.showAwarenessCopy( 'event' );
			}.bind( this ) );
		}
	},

	initAddAwarenessCopy: function () {

		//close all and open the clicked on if it was closed
		let stages = [].slice.call( document.querySelectorAll( 'div.body-awareness' ) );
		stages.forEach( function ( toggleStage ) {
			let header = toggleStage.querySelector( 'h3' );
			header.addEventListener( 'click', function () {
				stages.forEach( function ( closeStage ) {
					if ( closeStage != toggleStage ) {
						closeStage.classList.add( 'closed' );
					}
				} );
				toggleStage.classList.toggle( 'closed' );
			} );
		} );

		for ( let paragraph of this.sectionTextBodyAwareness ) {
			TweenMax.set( paragraph, { autoAlpha: 0 } );
		}

		this.beginAwarenessButton.onclick = this.addAwareness.bind( this );

	},

	init: function ( containerNode, screenIsSmall ) {

		this.sectionContainer = containerNode;

		this.screenIsSmall = screenIsSmall;

		this.loadEpisode();

		this.initAddAwarenessCopy();

		this.isInited = true;

	},

	setActive: function ( val ) {

		this.isActive = val;

	},

	setInteractive: function ( val ) {

	},

	setEmotion: function ( emotion, previousEmotion ) {

		var _self = this;

		return new Promise( ( resolve, reject ) => {

			_self.currentEmotion = emotion;
			this.episode && this.episode.setEmotion( _self.currentEmotion );
			this.episodeAddAwareness && this.episodeAddAwareness.setEmotion( _self.currentEmotion );

			resolve();
		} );

	},

	onResize: function () {
		//TODO implement this
	},

	open: function ( options ) {

		this.episode && this.episode.reset();
		this.episodeAddAwareness && this.episodeAddAwareness.reset();

		this.setActive( true );
		this.setInteractive( true );

	},

	close: function ( nextSection ) {

		return new Promise( ( resolve, reject ) => {

			this.episode && this.episode.reset();
			this.episodeAddAwareness && this.episodeAddAwareness.reset();

			this.setActive( false );
			this.setInteractive( false );

			resolve();
		} );
	}

};

export default timeline;
