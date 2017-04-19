import _ from 'lodash';
import d3 from 'd3';
import { TweenMax, TimelineMax, Power2, Power1, Elastic, Bounce, Back } from "gsap";

import Continent from '../Continent.js';
import timeline from './timeline.js';
import scroller from '../scroller.js';
import dispatcher from '../dispatcher.js';

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

	start( animateReplaceContent = false ) {

		//go to start
		this.episodeTimeline.timeScale( 1 );

		if ( this.playFromStart ) {
			this.playFromStart = false;
			this.episodeTimeline.pause( 'event', true );
		} else {
			this.episodeTimeline.pause( 'event-pulse', true );
		}


		//replace content
		this.replaceContent( this.currentEmotion, animateReplaceContent );

		TweenMax.delayedCall( 0.5, () => {
			this.episodeTimeline.play();
		} );

	}

	reset() {
		this.playFromStart = true;
		this.episodeTimeline.timeScale( 1 );
		this.episodeTimeline.pause( 'event', true );
	}

	setEmotion( emotion ) {

		let animateReplaceContent = (this.currentEmotion != emotion) && !this.playFromStart;

		this.currentEmotion = emotion && emotion != '' ? emotion : dispatcher.DEFAULT_EMOTION;

		if ( this.playFromStart ) {
			TweenMax.delayedCall( 1.5, this.start.bind( this ), [ animateReplaceContent ] );
		} else {
			this.rewind( ()=> {
				this.start( animateReplaceContent );
			} );
		}

	}

	replaceTextContentForKey( key, emotion, animate ) {
		return function ( child, i ) {
			var text = this.content[ emotion ][ key ];
			if ( animate ) {
				TweenMax.to( child.parentNode, 0.25, {
					autoAlpha: 0, onComplete: () => {
						child.textContent = text[ Object.keys( text )[ i ] ];
						TweenMax.to( child.parentNode, 0.25, { autoAlpha: 1 } );
					}
				} );
			} else {
				child.textContent = text[ Object.keys( text )[ i ] ];
			}
		}.bind( this );
	}

	replaceContent( emotion, animate = false ) {

		var colors = this.configsByEmotion[ emotion ].colorPalette;
		this.stateCircles.forEach( ( circle, i )=> {
			var color = colors[ Math.round( i * (colors.length - 1) / (this.stateCircles.length - 1) ) ];
			circle.setAttribute( 'fill', 'rgb(' + color[ 0 ] + ',' + color[ 1 ] + ',' + color[ 2 ] + ')' );
		} );

		this.stateText.forEach( this.replaceTextContentForKey( 'state', emotion, false ) );
		this.responseText.forEach( this.replaceTextContentForKey( 'response', emotion, false ) );
		this.triggerText.forEach( ( child, i )=> {
			let animateText = animate && (child.parentNode.id != 'event-text');
			let replace = this.replaceTextContentForKey( 'trigger', emotion, animateText );
			replace( child, i );
		} );


	}

	initStateCircles() {
		this.stateCircles = [
			timeline.select( '#c1', this.parent ),
			timeline.select( '#c2', this.parent ),
			timeline.select( '#c3', this.parent ),
			timeline.select( '#c4', this.parent ),
			timeline.select( '#c5', this.parent ),
			timeline.select( '#c6', this.parent )
		];
	}

	addStatePulsation() {
		//pulsate state
		this.stateCircles.forEach( ( circle, i )=> {
			// make the circles overlap as they change size
			let radiusDelta = (this.stateCircles.length - Math.round( i + this.stateCircles.length / 2 ) % this.stateCircles.length) * 4;
			// reduce the effect for the large ones
			radiusDelta *= 1 - ( i / (this.stateCircles.length - 1) );
			// don't pass in a float
			radiusDelta = Math.round( radiusDelta );
			//debugger;
			this.episodeTimeline
				.to( circle, 6 - (3 * i / (this.stateCircles.length - 1)), {
					attr: {
						rx: '-=' + radiusDelta,
						ry: '-=' + radiusDelta
					},
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				}, 'pulsate' );
		} );
	}

	addStateEmergence() {
		var minStartingRadius = 0;
		var maxStartingRadius = 20;
		this.stateCircles.forEach( ( circle, i )=> {
			var startingRadius = minStartingRadius + (maxStartingRadius - minStartingRadius) * i / (this.stateCircles.length - 1);
			this.episodeTimeline
				.from( circle, 2, {
					attr: { rx: startingRadius, ry: startingRadius },
					autoAlpha: 0,
					ease: Back.easeOut
				}, 'state' );
		} );
	}

	getParentElement() {
		return this.parent;
	}

	hide( onComplete ) {
		TweenMax.to( this.parent, 1, { autoAlpha: 0, onComplete: onComplete } );
	}

	destroy() {
		this.episodeTimeline.kill();
		TweenMax.killAll();
		//TweenMax.killChildTweensOf( this.parent );
		scroller.resetEmotionNav();
		this.parent.remove();
		this.episodeTimeline = null;
	}

	constructor( svg, container, emotion ) {
		this.initialize( svg, container, emotion );
	}

	initialize( svg, container, emotion ) {

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

			this.initStateCircles();

			//lines
			var eventLines = timeline.select( '#event-lines', this.parent ),
				responseLines = timeline.select( '#response-lines', this.parent );

			//text
			var event = timeline.select( '#event-text', this.parent ),
				responses = timeline.select( '#responses', this.parent ),
				responseChildren = timeline.selectAll( 'tspan', responses );
			var trigger = timeline.select( '#trigger', this.parent );
			this.triggerText = [
				timeline.select( 'tspan', event ),
			];

			d3.selectAll( this.triggerText )
				.attr( 'text-anchor', 'middle' )
				.attr( 'x', function () {
					return parseFloat( this.getComputedTextLength() ) / 2 + parseFloat( this.getAttribute( 'x' ) );
				} );


			this.stateText = [
				stateLabelChildren[ 1 ]
			];
			this.responseText = [
				responseChildren[ 0 ]
			];

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
				.add( 'state' );

			this.addStateEmergence();

			this.episodeTimeline
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

				.add( 'end' );


			this.addStatePulsation();

			this.episodeTimeline.pause();

			TweenMax.set( state, { visibility: 'visible' } );

			this.replaceContent( this.currentEmotion, false );

			TweenMax.set( this.parent, { visibility: 'visible' } );

			svg._initializedEpisode = true;

			this.isActive = true;

		}
	}


}
