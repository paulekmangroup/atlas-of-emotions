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
	container: null,
	beginAwarenessButton: null,
	sectionTextBodyIntro: null,
	sectionTextBodyAwareness: null,
	episodeContent: {
		"anger": {
			"trigger": {
				"precondition": "you are low on sleep",
				"event": "a friend gets angry with you",
				"perceptual-database": "you're reminded of a bully"
			},
			"state": {
				"physical-changes": "your body becomes tense",
				"emotion": "anger",
				"mental-changes": "you feel attacked"
			},
			"response": {
				"constructive-response": "take a time out",
				"destructive-response": "argue",
				"ambiguous-response": "avoid them"
			}
		},
		"fear": {
			"trigger": {
				"precondition": "reading scary news",
				"event": "a friend gets angry with you",
				"perceptual-database": "reminds you of abandonment"
			},
			"state": {
				"physical-changes": "your heart pounds",
				"emotion": "fear",
				"mental-changes": "you expect them to leave"
			},
			"response": {
				"constructive-response": "recall why you're friends",
				"destructive-response": "imagine them leaving",
				"ambiguous-response": "something else..."
			}
		},
		"disgust": {
			"trigger": {
				"precondition": "you're grieving",
				"event": "a friend gets angry with you",
				"perceptual-database": "reminds you of insensitivity"
			},
			"state": {
				"physical-changes": "you recoil",
				"emotion": "disgust",
				"mental-changes": "you feel sickened"
			},
			"response": {
				"constructive-response": "ask why they're angry",
				"destructive-response": "belittle them",
				"ambiguous-response": "avoid them"
			}
		},
		"sadness": {
			"trigger": {
				"precondition": "listening to sad music",
				"event": "a friend gets angry with you",
				"perceptual-database": "it reminds you of rejection"
			},
			"state": {
				"physical-changes": "your body weakens",
				"emotion": "sadness",
				"mental-changes": "you feel empty"
			},
			"response": {
				"constructive-response": "call a loved one",
				"destructive-response": "be ashamed",
				"ambiguous-response": "ignore the feeling"
			}
		},
		"enjoyment": {
			"trigger": {
				"precondition": "you scored a touchdown",
				"event": "a friend gets angry with you",
				"perceptual-database": "seems like a sore loser"
			},
			"state": {
				"physical-changes": "adrenaline rush",
				"emotion": "enjoyment",
				"mental-changes": "you feel righteous"
			},
			"response": {
				"constructive-response": "play on",
				"destructive-response": "gloat",
				"ambiguous-response": "celebrate"
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
		//svgElement.removeAttribute( 'viewBox' );
		//svgElement.setAttribute( 'preserveAspectRatio', 'none' );
		var svgChildrenGroup = svgElement.getElementsByTagName( 'g' )[ 0 ];

		var wrapperSVG = document.createElementNS( NS, 'svg' );
		wrapperSVG.setAttribute( 'x', '50%' );
		wrapperSVG.setAttribute( 'y', '50%' );
		wrapperSVG.setAttribute( 'width', originalWidth );
		wrapperSVG.setAttribute( 'height', originalHeight );
		//wrapperSVG.setAttribute( 'viewBox', originalViewBox );
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
		ajax.open( 'GET', './img/episode.svg', true );
		ajax.send();
		ajax.onload = ( e ) => {
			this.episode = new Episode( e.currentTarget.responseXML.documentElement, this.container, this.currentEmotion, this.screenIsSmall );
			this.activeEpisode = this.episode;
			if ( this.isActive ) {
				this.episode.setEmotion( this.currentEmotion );
			}
		};
	},

	loadEpisodeAddAwareness: function () {
		// awareness version
		var ajax = new XMLHttpRequest();
		ajax.open( 'GET', './img/episode--add-awareness.svg', true );
		ajax.send();
		ajax.onload = ( e ) => {
			this.episodeAddAwareness = new EpisodeAddAwareness( e.currentTarget.responseXML.documentElement, this.container, this.currentEmotion, this.screenIsSmall );
			this.activeEpisode = this.episodeAddAwareness;
			if ( this.isActive ) {
				this.episodeAddAwareness.setEmotion( this.currentEmotion );
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

	getVisibleButtons: function ( stage ) {
		return document.querySelectorAll( 'button.body-awareness[data-stage=' + stage + ']' );
	},

	getHiddenButtons: function ( stage ) {
		var visible = [].slice.call( this.getVisibleButtons( stage ) );
		return [].slice.call( document.querySelectorAll( 'button.body-awareness' ) ).filter( ( e )=> {
			return visible.indexOf( e ) == -1;
		} );
	},

	showAwarenessCopy: function ( stage ) {
		var showCopy = this.getVisibleParagraphs( stage );
		var showButtons = this.getVisibleButtons( stage );
		var hideButtons = this.getHiddenButtons( stage );
		let stages = [].slice.call( document.querySelectorAll( 'div.body-awareness' ) );
		let openStage = document.querySelector( 'div.body-awareness[data-stage=' + stage + ']' );
		stages.forEach( function ( stage ) {
			stage.classList.add( 'closed' );
		} );
		openStage.classList.remove( 'closed' );

		TweenMax.set( showButtons, { css: { display: 'block' } } );
		TweenMax.set( hideButtons, { css: { display: 'none' } } );

		TweenMax.set( showCopy, { css: { display: 'block' } } );
		TweenMax.to( showCopy, 1, { autoAlpha: 1 } );

		if ( this.screenIsSmall ) {
			TweenMax.to( '.section-text__content', 0.7, { scrollTo: openStage.offsetTop } );
		}

	},

	hideIntroCopy: function ( onComplete ) {
		TweenMax.to( this.sectionTextBodyIntro, 1, { autoAlpha: 0, onComplete: onComplete } );
	},

	showIntroCopy: function ( onComplete ) {
		TweenMax.to( this.sectionTextBodyIntro, 1, { autoAlpha: 1, onComplete: onComplete } );
		TweenMax.set( this.sectionTextBodyIntro, { css: { display: '' } } );
	},

	addAwareness: function () {
		if ( !this.episodeAddAwareness ) {
			this.showAwarenessEpisode();
			this.hideIntroCopy( function () {
				TweenMax.set( this.sectionTextBodyIntro, { css: { display: 'none' } } );
				this.showAwarenessCopy( 'trigger' );
			}.bind( this ) );
		}
	},

	hideAwarenessCopy: function () {
		for ( let paragraph of this.sectionTextBodyAwareness ) {
			TweenMax.set( paragraph, { autoAlpha: 0 } );
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

		this.hideAwarenessCopy();

		this.beginAwarenessButton.onclick = this.addAwareness.bind( this );

	},

	fullRestart: function () {
		let restart = ()=> {
			this.episode && this.episode.destroy();
			this.episodeAddAwareness && this.episodeAddAwareness.destroy();
			this.episode = null;
			this.episodeAddAwareness = null;
			this.loadEpisode();
			this.hideAwarenessCopy();
			this.showIntroCopy();
		};
		if ( this.episodeAddAwareness ) {
			this.episodeAddAwareness.hide( restart.bind( this ) );
		} else {
			restart();
		}
	},

	initRestartButton: function () {
		$( '.restart-button' ).click( this.fullRestart.bind( this ) );
	},

	init: function ( containerNode, screenIsSmall ) {

		this.sectionContainer = containerNode;
		this.screenIsSmall = screenIsSmall;

		this.container = document.getElementById( 'timeline-graphics' );
		this.beginAwarenessButton = document.getElementById( 'begin-awareness' );
		this.sectionTextBodyIntro = Array.prototype.slice.call( document.querySelectorAll( '#timeline-section .body-intro' ) );
		this.sectionTextBodyAwareness = Array.prototype.slice.call( document.querySelectorAll( '#timeline-section [class*="body-awareness"]' ) );

		this.loadEpisode();

		this.initAddAwarenessCopy();

		this.initRestartButton();

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

