import _ from 'lodash';
import Continent from '../Continent.js';
import timeline from './timeline.js';
import scroller from '../scroller.js';
import dispatcher from '../dispatcher.js';
import { TweenMax, TimelineMax, Power2, Power1, Bounce } from "gsap";

export default class Episode {

	setActive( val ) {
		this.isActive = val;
	}

	rewind( onComplete ) {

		this.rewindActive = true;

		this.episodeTimeline.timeScale( 3 );
		this.episodeTimeline.pause();
		if ( this.episodeTimeline.getLabelTime( 'end' ) < this.episodeTimeline.time() ) {
			this.episodeTimeline.seek( 'end', true );
		}
		this.episodeTimeline.tweenTo( 'event-lines', {
			onComplete: () => {
				this.rewindActive = false;
				onComplete();
			},
			ease: Power2.easeOut
		} );

	}

	start() {

		//go to start
		this.episodeTimeline.timeScale( 1 );
		this.episodeTimeline.pause( 'event-pulse', true );

		//replace content
		this.replaceContent( this.currentEmotion );

		TweenMax.delayedCall( 0.5, () => {
			this.episodeTimeline.play();
		} );

	}

	reset() {
		this.playFromStart = true;
		this.episodeTimeline.timeScale( 1 );
		this.episodeTimeline.pause();
		this.episodeTimeline.seek( 'event' );
	}

	setEmotion( emotion ) {

		this.currentEmotion = emotion && emotion != '' ? emotion : dispatcher.DEFAULT_EMOTION;

		if ( this.playFromStart ) {
			this.playFromStart = false;
			TweenMax.delayedCall( 1.5, this.start.bind( this ) );
		} else {
			this.rewind( this.start.bind( this ) );
		}

	}

	replaceContent( emotion ) {

		var colors = this.configsByEmotion[ emotion ].colorPalette;
		var color1 = colors[ 0 ];
		var color2 = colors[ Math.round( (colors.length - 1) / 3 ) ];
		var color3 = colors[ colors.length - 1 ];

		this.c1.setAttribute( 'fill', 'rgb(' + color1[ 0 ] + ',' + color1[ 1 ] + ',' + color1[ 2 ] + ')' );
		this.c2.setAttribute( 'fill', 'rgb(' + color2[ 0 ] + ',' + color2[ 1 ] + ',' + color2[ 2 ] + ')' );
		this.c3.setAttribute( 'fill', 'rgb(' + color3[ 0 ] + ',' + color3[ 1 ] + ',' + color3[ 2 ] + ')' );

		var replace = ( key ) => {
			return ( child, i ) => {
				var text = this.content[ emotion ][ key ];
				child.textContent = text[ Object.keys( text )[ i ] ];
			};
		};

		this.stateText.forEach( replace( 'state' ) );
		this.responseText.forEach( replace( 'response' ) );


	}

	getParentElement() {
		return this.parent;
	}


	constructor( svg, container, emotion ) {

		this.rewindActive = false;
		this.isActive = false;

		this.configsByEmotion = Continent.configsByEmotion;
		this.currentEmotion = emotion && emotion != '' ? emotion : dispatcher.DEFAULT_EMOTION;

		if ( svg && !svg._initializedEpisode ) {


			//fonts need to be added for them to work in svg
			timeline.addFonts( svg ); //TODO move this to timeline


			this.parent = timeline.extractDocument( svg, container );

			this.content = _.mapValues( timeline.episodeContent, function ( e ) {
				return _.mapValues( e, ( e )=>[ e[ Object.keys( e )[ 1 ] ] ] );
			} );


			TweenMax.allTo( timeline.getChildren( timeline.select( '#state', this.parent ) ), 0, { visibility: 'hidden' } );

			//state
			var state = timeline.select( '#state', this.parent ),
				stateLabel = timeline.select( '#state-label', this.parent );
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
			this.c1 = timeline.select( '#c1', this.parent );
			this.c2 = timeline.select( '#c2', this.parent );
			this.c3 = timeline.select( '#c3', this.parent );

			//lines
			var eventLines = timeline.select( '#event-lines', this.parent ),
				responseLines = timeline.select( '#response-lines', this.parent );

			//text
			var event = timeline.select( '#event', this.parent ),
				responses = timeline.select( '#responses', this.parent ),
				responseChildren = timeline.selectAll( 'tspan', responses );

			this.stateText = [
				stateLabelChildren[ 1 ]
			];
			this.responseText = [
				responseChildren[ 0 ]
			];

			//try again button
			var tryAgainButton = timeline.select( '#try-again', this.parent );
			//tryAgainButton.style.cursor = 'pointer';
			//tryAgainButton.style.pointerEvents = 'all';
			//var tryAgainLabel = timeline.select( '#try-again-label tspan', tryAgainButton );
			//var tryAgainRectangle = timeline.select( '#try-again-rectangle', tryAgainButton );
			//FIXME remove try again button from the svg and the code for good
			tryAgainButton.remove();

			this.episodeTimeline = new TimelineMax( {} );

			this.playFromStart = true;


			//set up the timeline

			this.episodeTimeline
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
				.from( this.c1, 2, { attr: { r: 0 }, autoAlpha: 0, ease: Bounce.easeOut } )
				.from( this.c2, 2, { attr: { r: 20 }, autoAlpha: 0, ease: Bounce.easeOut }, 'state' )
				.from( this.c3, 2, { attr: { r: 50 }, autoAlpha: 0, ease: Bounce.easeOut }, 'state' )
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
				.to( this.c1, 1, {
					attr: { r: '-=5' },
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				}, 'pulsate' )
				.to( this.c2, 0.8, {
					attr: { r: '-=3' },
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				}, 'pulsate' )
				.to( this.c3, 1, {
					attr: { r: '-=2' },
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				}, 'pulsate' );

			this.episodeTimeline.pause();

			//tryAgainButton.onclick = function () {
			//	var emotions = Object.values( dispatcher.EMOTIONS );
			//	var nextEmotion = emotions[ (emotions.indexOf( this.currentEmotion ) + 1) % emotions.length ];
			//	dispatcher.navigate( 'triggers', nextEmotion );
			//}.bind( this );

			TweenMax.set( state, { visibility: 'visible' } );

			this.replaceContent( this.currentEmotion );

			TweenMax.set( this.parent, { visibility: 'visible' } );

			svg._initializedEpisode = true;

			this.isActive = true;

		}
	}

}
