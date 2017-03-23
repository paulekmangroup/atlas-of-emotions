import _ from 'lodash';
import Continent from '../Continent.js';
import timeline from './timeline.js';
import scroller from '../scroller.js';
import dispatcher from '../dispatcher.js';
import { TweenMax, TimelineMax } from "gsap";

export default class Episode {

	rewindActive = false;
	isActive = false;

	setActive = function ( val ) {

		this.isActive = val;

	};

	constructor( svg, container, emotion ) {

		var configsByEmotion = Continent.configsByEmotion;
		this.currentEmotion = emotion && emotion != '' ? emotion : dispatcher.DEFAULT_EMOTION;

		if ( svg && !svg._initializedEpisode ) {


			//fonts need to be added for them to work in svg
			timeline.addFonts( svg );


			var parent = timeline.extractDocument( svg, container );

			var content = _.mapValues( timeline.episodeContent, function ( e ) {
				return _.mapValues( e, ( e )=>e[ Object.keys( e )[ 1 ] ] );
			} );


			TweenMax.allTo( timeline.getChildren( timeline.select( '#state', parent ) ), 0, { visibility: 'hidden' } );

			//state
			var state = timeline.select( '#state', parent ),
				stateLabel = timeline.select( '#state-label', parent );
			var bBox = state.getBBox();
			var stateLabelChildren = timeline.getChildren( stateLabel );
			for ( var i = 0; i < stateLabelChildren.length; i++ ) {
				stateLabelChildren[ i ].setAttribute( 'x', bBox.x + bBox.width / 2 );
				stateLabelChildren[ i ].setAttribute( 'text-anchor', 'middle' );
				if ( i == 1 ) {
					stateLabelChildren[ i ].style.textTransform = 'uppercase';
				}
			}

			//circles
			var c1 = timeline.select( '#c1', parent ),
				c2 = timeline.select( '#c2', parent ),
				c3 = timeline.select( '#c3', parent );

			//lines
			var eventLines = timeline.select( '#event-lines', parent ),
				responseLines = timeline.select( '#response-lines', parent );

			//text
			var event = timeline.select( '#event', parent ),
				responses = timeline.select( '#responses', parent );
			var responseChildren = timeline.selectAll( 'tspan', responses );

			//try again button
			var tryAgainButton = timeline.select( '#try-again', parent );
			tryAgainButton.style.cursor = 'pointer';
			tryAgainButton.style.pointerEvents = 'all';
			var tryAgainLabel = timeline.select( '#try-again-label tspan', tryAgainButton );
			var tryAgainRectangle = timeline.select( '#try-again-rectangle', tryAgainButton );
			//FIXME remove try again button from the svg and the code for good
			tryAgainButton.remove();

			var tl = new TimelineMax( {} );

			var playFromStart = true;


			this.getParentElement = function () {
				return parent;
			};

			var replaceContent = function ( emotion ) {

				var colors;
				stateLabelChildren[ 1 ].textContent = content[ emotion ].state;
				responseChildren[ 0 ].textContent = content[ emotion ].response;
				colors = configsByEmotion[ content[ emotion ].state ].colorPalette;

				var color1 = colors[ 0 ];
				var color2 = colors[ Math.round( (colors.length - 1) / 3 ) ];
				var color3 = colors[ colors.length - 1 ];
				c1.setAttribute( 'fill', 'rgb(' + color1[ 0 ] + ',' + color1[ 1 ] + ',' + color1[ 2 ] + ')' );
				c2.setAttribute( 'fill', 'rgb(' + color2[ 0 ] + ',' + color2[ 1 ] + ',' + color2[ 2 ] + ')' );
				c3.setAttribute( 'fill', 'rgb(' + color3[ 0 ] + ',' + color3[ 1 ] + ',' + color3[ 2 ] + ')' );

			};

			this.rewind = function ( onComplete ) {

				this.rewindActive = true;

				tl.timeScale( 3 );
				tl.pause();
				if ( tl.getLabelTime( 'end' ) < tl.time() ) {
					tl.seek( 'end' );
				}
				tl.tweenTo( 'event-lines', {
					onComplete: function () {
						this.rewindActive = false;
						onComplete();
					}.bind( this ),
					ease: Power2.easeOut
				} );

			};

			this.start = function () {

				//go to start
				tl.timeScale( 1 );
				tl.pause();
				tl.seek( 'event-pulse' );

				//replace content
				replaceContent( this.currentEmotion );

				TweenMax.delayedCall( 0.5, function () {
					tl.play();
				} );

			};

			this.reset = function () {
				playFromStart = true;
				tl.timeScale( 1 );
				tl.pause();
				tl.seek( 'event' );
			};

			this.setEmotion = function ( emotion ) {

				this.currentEmotion = emotion && emotion != '' ? emotion : dispatcher.DEFAULT_EMOTION;

				if ( playFromStart ) {
					playFromStart = false;
					TweenMax.delayedCall( 1.5, this.start.bind( this ) );
				} else {
					this.rewind( this.start.bind( this ) );
				}

			};


			//set up the timeline

			tl
			//show event
				.add( 'event' )
				.from( event, 0.5, { autoAlpha: 0, ease: Power1.easeOut } )

				.add( 'event-pulse' )
				.to( event, 0.1, {
					scale: 1.1,
					transformOrigin: '50% 50%',
					ease: Power1.easeOut
				} )
				.to( event, 0.2, {
					scale: 1,
					transformOrigin: '50% 50%',
					ease: Power1.easeOut
				} )
				.add( 'event-lines' )
				.from( eventLines, 0.5, { autoAlpha: 0, ease: Power1.easeOut }, 'event-lines' )

				// show emo state
				.add( 'state' )
				.from( c1, 2, { attr: { r: 0 }, autoAlpha: 0, ease: Bounce.easeOut } )
				.from( c2, 2, { attr: { r: 20 }, autoAlpha: 0, ease: Bounce.easeOut }, 'state' )
				.from( c3, 2, { attr: { r: 50 }, autoAlpha: 0, ease: Bounce.easeOut }, 'state' )
				.from( stateLabel, 2, { autoAlpha: 0, ease: Power1.easeOut }, 'state' )
				.add( 'pulsate' )

				//show response
				.add( 'response-line', '-=1' )
				.from( responseLines, 0.5, { autoAlpha: 0, ease: Power1.easeOut }, 'response-line' )

				.add( 'responses', '-=0.5' )
				.from( responses, 1, { autoAlpha: 0, ease: Power1.easeOut } )

				.add( 'try-again' )
				//.from( tryAgainButton, 0.5, { autoAlpha: 0, ease: Power1.easeOut } )
				.addCallback( function () {
					if ( !this.rewindActive && this.isActive ) {
						scroller.pulseEmotionNav();
					}
				}.bind( this ) )

				.add( 'end' )

				//pulsate state
				.to( c1, 1, {
					attr: { r: '-=5' },
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				}, 'pulsate' )
				.to( c2, 0.8, {
					attr: { r: '-=3' },
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				}, 'pulsate' )
				.to( c3, 1, {
					attr: { r: '-=2' },
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				}, 'pulsate' );

			tl.pause();

			//tryAgainButton.onclick = function () {
			//	var emotions = Object.values( dispatcher.EMOTIONS );
			//	var nextEmotion = emotions[ (emotions.indexOf( this.currentEmotion ) + 1) % emotions.length ];
			//	dispatcher.navigate( 'triggers', nextEmotion );
			//}.bind( this );

			TweenMax.set( state, { visibility: 'visible' } );

			replaceContent( this.currentEmotion );

			TweenMax.set( parent, { visibility: 'visible' } );

			svg._initializedEpisode = true;

			this.isActive = true;

		}
	}

}
