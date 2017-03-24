import Continent from '../Continent.js';
import timeline from './timeline.js';
import dispatcher from '../dispatcher.js';
import { TweenMax, TimelineMax } from "gsap";
import d3 from 'd3';
import BlockDiagram from './BlockDiagram';


export default class EpisodeAddAwareness {

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

			// illumination
			var illuminationBlock = timeline.select( '#illumination-block', document );
			//var illuminationGlow = timeline.select( '#glow', document );
			initializeIllumination( illuminationBlock, svg );

			//timeline with examples
			var timelineWithExamples = timeline.select( '#timeline-with-examples', parent );

			//blocks
			var blockDiagram = new BlockDiagram( timeline.select( '#blocks', parent ), parent );

			//blockDiagram.onComplete = function () {
				//var refractoryPeriod = RefractoryPeriod( parent, blocks );
			//};


			var content = timeline.episodeContent;


			// hide elements and prepare for animation
			TweenMax.allTo( timeline.getChildren( timeline.select( '#state', timelineWithExamples ) ), 0, { visibility: 'hidden' } );


			//state
			var state = timeline.select( '#state', timelineWithExamples ),
				stateLabel = timeline.select( '#state-label', timelineWithExamples );
			var stateLabelChildren = timeline.getChildren( stateLabel );
			for ( var i = 0; i < stateLabelChildren.length; i++ ) {
				if ( i == 1 ) {
					stateLabelChildren[ i ].style.textTransform = 'uppercase';
				}
			}

			//circles
			var c1 = timeline.select( '#c1', timelineWithExamples ),
				c2 = timeline.select( '#c2', timelineWithExamples ),
				c3 = timeline.select( '#c3', timelineWithExamples );

			//changes
			var physicalChanges = timeline.select( '#physical-changes', timelineWithExamples ),
				mentalChanges = timeline.select( '#mental-changes', timelineWithExamples ),
				changes = timeline.select( '#changes', timelineWithExamples );
			physicalChanges.style.visibility = 'hidden';
			mentalChanges.style.visibility = 'hidden';

			//lines
			var eventLines = timeline.select( '#event-lines', timelineWithExamples ),
				responseLineGroup = timeline.select( '#response-lines', timelineWithExamples ),
				responseLines = timeline.selectAll( "path:not([id*='decoration'])", responseLineGroup ),
				responseLineDecorations = timeline.selectAll( "[id*='decoration']", responseLineGroup );
			//hide first and third lines and arrowheads
			TweenMax.allTo( timeline.selectAll( '[id*="response-line-1"]', timelineWithExamples ), 0, { autoAlpha: 0 } );
			TweenMax.allTo( timeline.selectAll( '[id*="response-line-3"]', timelineWithExamples ), 0, { autoAlpha: 0 } );


			//text
			var event = timeline.select( '#event', timelineWithExamples ),
				precondition = timeline.select( '#precondition', timelineWithExamples ),
				perceptualDatabase = timeline.select( '#perceptual-database', timelineWithExamples ),
				triggerText = [
					timeline.select( 'tspan', precondition ),
					timeline.select( 'tspan', event ),
					timeline.select( 'tspan', perceptualDatabase )
				],
				stateText = [
					timeline.select( 'tspan', physicalChanges ),
					stateLabelChildren[ 1 ],
					timeline.select( 'tspan', mentalChanges )
				],
				constructiveResponse = timeline.select( '#constructive-response', timelineWithExamples ),
				destructiveResponse = timeline.select( '#destructive-response', timelineWithExamples ),
				ambiguousResponse = timeline.select( '#ambiguous-response', timelineWithExamples ),
				responses = timeline.select( '#responses', timelineWithExamples ),
				responseText = [
					timeline.select( 'tspan', constructiveResponse ),
					timeline.select( 'tspan', destructiveResponse ),
					timeline.select( 'tspan', ambiguousResponse )
				];


			d3.selectAll( triggerText )
				.attr( 'text-anchor', 'end' )
				.attr( 'x', function () {
					return parseFloat( this.getComputedTextLength() ) + parseFloat( this.getAttribute( 'x' ) );
				} );
			d3.selectAll( stateText )
				.attr( 'text-anchor', 'middle' )
				.attr( 'x', function () {
					return parseFloat( this.getComputedTextLength() )/2 + parseFloat( this.getAttribute( 'x' ) );
				} );


			//TODO remove the awareness and try-again buttons from svg
			timeline.select( '#add-awareness-state', timelineWithExamples ).remove();
			timeline.select( '#add-awareness-response', timelineWithExamples ).remove();

			//add awareness buttons

			var addAwarenessButtonState = timeline.select( '#state-add-awareness', document );
			//addAwarenessButtonState.style.cursor = 'pointer';
			//addAwarenessButtonState.style.pointerEvents = 'all';
			addAwarenessButtonState.style.visibility = 'hidden'; //TODO should these be handled in css? what's typical in this app?

			var addAwarenessButtonResponse = timeline.select( '#response-add-awareness', document );
			//addAwarenessButtonResponse.style.cursor = 'pointer';
			//addAwarenessButtonResponse.style.pointerEvents = 'all';
			addAwarenessButtonResponse.style.visibility = 'hidden';

			//try again button

			var tryAgainButton = timeline.select( '#try-again', timelineWithExamples );
			tryAgainButton.style.cursor = 'pointer';
			tryAgainButton.style.pointerEvents = 'all';
			tryAgainButton.style.visibility = 'hidden';


			var tl = new TimelineMax( {} );

			var contentIndex = 0;

			var addResponseLineAwareness = function () {
				if ( awarenessStage == 'state' ) {
					//reset center line color
					timeline.select( '#response-line-2', timelineWithExamples ).setAttribute( 'stroke', timeline.select( '#response-line-1', timelineWithExamples ).getAttribute( 'stroke' ) );
					timeline.select( '#response-line-2-decoration-1', timelineWithExamples ).setAttribute( 'fill', timeline.select( '#response-line-1', timelineWithExamples ).getAttribute( 'stroke' ) );
					timeline.select( '#response-line-2-decoration-1', timelineWithExamples ).setAttribute( 'stroke', timeline.select( '#response-line-1', timelineWithExamples ).getAttribute( 'stroke' ) );
				}
				if ( awarenessStage == 'response' ) {
					for ( var i = 0; i < responseLines.length; i++ ) {
						responseLines[ i ].setAttribute( 'stroke-dasharray', '3,8' );
						responseLineDecorations[ i ].setAttribute( 'fill', timeline.select( '#response-line-1', timelineWithExamples ).getAttribute( 'stroke' ) );
					}
					//show all lines and arrowheads
					TweenMax.allTo( timeline.selectAll( '[id*="response-line-"]', timelineWithExamples ), 0, { autoAlpha: 1 } );
				}
			};

			var replaceContent = function ( emotion ) {

				var colors = configsByEmotion[ emotion ].colorPalette;

				var color1 = colors[ 0 ];
				var color2 = colors[ Math.round( (colors.length - 1) / 3 ) ];
				var color3 = colors[ colors.length - 1 ];

				c1.setAttribute( 'fill', 'rgb(' + color1[ 0 ] + ',' + color1[ 1 ] + ',' + color1[ 2 ] + ')' );
				c2.setAttribute( 'fill', 'rgb(' + color2[ 0 ] + ',' + color2[ 1 ] + ',' + color2[ 2 ] + ')' );
				c3.setAttribute( 'fill', 'rgb(' + color3[ 0 ] + ',' + color3[ 1 ] + ',' + color3[ 2 ] + ')' );

				var replace = function ( key ) {
					return ( child, i )=> {
						var text = content[ emotion ][ key ];
						child.textContent = text[ Object.keys( text )[ i ] ];
					};
				};

				responseText.forEach( replace( 'response' ) );
				stateText.forEach( replace( 'state' ) );
				triggerText.forEach( replace( 'trigger' ) );

			};


			//TODO connect these up, share code w/ Episode if possible
			this.reset = function () {
			};
			this.setEmotion = function ( emotion ) {
				this.currentEmotion = emotion && emotion != '' ? emotion : dispatcher.DEFAULT_EMOTION;
				replaceContent( emotion );
			};

			var reset = function ( callback ) {

				tl.timeScale( 3 );

				tl.pause();
				tl.seek( 'end' );

				tl.tweenTo( 'event-lines', {
					onComplete: function () {

						contentIndex++;
						if ( contentIndex >= content.length ) {
							contentIndex = 0;
						}

						callback();

						//run animation
						tl.timeScale( 1 );
						tl.pause();
						tl.seek( 'event-pulse' );

						TweenMax.delayedCall( 0.5, function () {
							tl.tweenTo( 'end' );
						} );

					}, ease: Power2.easeOut
				} );

			};

			var awarenessStage = 'event';

			var advance = function () {

				if ( awarenessStage == 'event' ) {

					TweenMax.to( illuminationBlock, 4, { css: { width: '+=300' }, ease: Power2.easeInOut } );
					//TweenMax.to( illuminationGlow, 4, { attr: { x: '+=300' }, ease: Power2.easeInOut } );

					awarenessStage = 'state';

				} else if ( awarenessStage == 'state' ) {

					var illuminationTimeline = new TimelineMax( {} );

					// move illumination all the way off screen, starting with a smooth but quick acceleration
					// once it is finished illuminating the entire timeline, the block interactions are enabled
					illuminationTimeline
						.add( 'start' )
						.to( illuminationBlock, 4, { css: { width: '+=400' }, ease: Power2.easeIn }, 'start' )
						//.to( illuminationGlow, 4, { attr: { x: '+=400' }, ease: Power2.easeIn }, 'start' )
						.add( 'finished' )
						.addCallback( enableBlockDiagram )
						.to( illuminationBlock, 10, { css: { width: '+=3000' }, ease: Power0.easeIn }, 'finished' )
						//.to( illuminationGlow, 10, { attr: { x: '+=3000' }, ease: Power0.easeIn }, 'finished' )
						.add( 'end' );

					awarenessStage = 'response';

				}

				timeline.showAwarenessCopy( awarenessStage );

			};

			var enableBlockDiagram = function () {
				var clickableElements = [
					precondition,
					event,
					perceptualDatabase,
					physicalChanges,
					state,
					mentalChanges,
					constructiveResponse,
					destructiveResponse,
					ambiguousResponse
				];
				blockDiagram.addMouseHandlers( clickableElements );
			};

			var pulsateState = function () {
				//pulsate state
				TweenMax.to( c1, 1, {
					attr: { r: '-=5' },
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				} );
				TweenMax.to( c2, 0.8, {
					attr: { r: '-=3' },
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				} );
				TweenMax.to( c3, 1, {
					attr: { r: '-=2' },
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				} );
			};

			//pulsate illumination
			var pulsateIllumination = function () {
				TweenMax.allTo( [ illuminationBlock /*, glow */ ], 1.9, {
					css: { transform: 'translateX(-5px)' },
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				}, 'pulsate-illumination' );
			};

			var addStateAwareness = function () {
				if ( awarenessStage == 'state' ) {
					physicalChanges.style.visibility = 'visible';
					mentalChanges.style.visibility = 'visible';
				}
			};

			var addResponseAwareness = function () {
				if ( awarenessStage == 'response' ) {
					//set the color of the second choice to match the first
					timeline.select( '#destructive-response', timelineWithExamples ).setAttribute( 'fill', timeline.select( '#constructive-response', timelineWithExamples ).getAttribute( 'fill' ) );
				}
			};

			var showAddAwarenessButton = function () {
				if ( awarenessStage == 'event' && addAwarenessButtonState.style.visibility == 'hidden' ) {
					TweenMax.to( addAwarenessButtonState, 1, { autoAlpha: 1, ease: Power2.easeOut } );
				}
				if ( awarenessStage == 'state' && addAwarenessButtonResponse.style.visibility == 'hidden' ) {
					TweenMax.to( addAwarenessButtonResponse, 1, { autoAlpha: 1, ease: Power2.easeOut } );
				}
			};
			//start the timeline

			tl
			//fade in illumination
				.add( 'illuminate' )
				.to( illuminationBlock, 2, { autoAlpha: 1, ease: Power1.easeInOut } )
				.to( illuminationBlock, 3, {
					css: { width: '+=380' },
					ease: Power1.easeOut,
					onComplete: pulsateIllumination
				}, 'illuminate' )
				//.from( glow, 3, {
				//	attr: { x: '-=400' },
				//	ease: Power1.easeOut,
				//	onComplete: pulsateIllumination
				//}, 'illuminate' )
				.add( 'pulsate-illumination' )

				//show event
				.add( 'event' )

				.add( 'event-pulse' )
				.to( timeline.select( '#event-text', timelineWithExamples ), 0.1, {
					scale: 1.1,
					transformOrigin: '50% 50%',
					ease: Power1.easeOut
				} )
				.to( timeline.select( '#event-text', timelineWithExamples ), 0.2, {
					scale: 1,
					transformOrigin: '50% 50%',
					ease: Power1.easeOut
				} )
				.to( timeline.select( '#perceptual-database-text', timelineWithExamples ), 0.1, {
					scale: 1.1,
					transformOrigin: '50% 50%',
					ease: Power1.easeOut
				}, '-=0.25' )
				.to( timeline.select( '#perceptual-database-text', timelineWithExamples ), 0.2, {
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
				.addCallback( addStateAwareness, 'state' )
				.from( changes, 2, { autoAlpha: 0, ease: Power1.easeOut }, 'state' )
				.from( stateLabel, 2, { autoAlpha: 0, ease: Power1.easeOut, onComplete: pulsateState }, 'state' )
				.add( 'pulsate' )

				//show response
				.add( 'response-lines', '-=0.5' )
				.addCallback( addResponseLineAwareness, 'response-lines' )
				.from( responseLineGroup, 0.5, { autoAlpha: 0, ease: Power1.easeOut }, 'response-lines' )

				.add( 'responses' )
				.addCallback( addResponseAwareness )
				.from( responses, 1, { autoAlpha: 0, ease: Power1.easeOut } )

				.add( 'end' )

				.add( 'add-awareness-button' )
				.addCallback( showAddAwarenessButton );

			var delayedReset = function () {
				// hide button
				var button = this;
				TweenMax.to( button, 1, {
					autoAlpha: 0,
					ease: Power2.easeOut,
					onComplete: function () {
						button.style.display = 'none';
					}
				} );
				//timeline.hideAwarenessCopy( awarenessStage );
				//reset and and advance at start
				reset( function () {
					TweenMax.delayedCall( 1.5, function () {
						advance();
					} );
				} );
			};

			addAwarenessButtonState.onclick = delayedReset;
			addAwarenessButtonResponse.onclick = delayedReset;

			TweenMax.set( state, { visibility: 'visible' } );

			replaceContent( this.currentEmotion );

			TweenMax.set( parent, { visibility: 'visible' } );
			tl.tweenTo( 'end' );

			svg._initializedEpisode = true;

			this.isActive = true;

		}

	}

}


//function RefractoryPeriod( parent, blocks ) {
//
//	var NS = "http://www.w3.org/2000/svg";
//	var line = timeline.select( '#perceptual-database-line-group', parent );
//	var lineChildren = timeline.getChildren( line );
//	var lineBox = line.getBBox();
//
//	var otherTriggerBlocks = timeline.selectAll( '#precondition-block, #event-block', parent );
//	var otherTriggerLines = timeline.selectAll( '#precondition-line, #event-line, #precondition-line-decoration-1, #event-line-decoration-1', parent );
//	var otherResponseLines = timeline.selectAll( '#response-line-1, #response-line-3, #response-line-1-decoration-1, #response-line-3-decoration-1', parent );
//	var otherBlocks = timeline.selectAll( '#mental-changes-block, #physical-changes-block, #constructive-response-block, #ambiguous-response-block', parent );
//	var perceptualDatabaseBlock = timeline.select( '#perceptual-database-block', parent );
//	var eventBlock = timeline.select( '#event-block', parent );
//	var trigger = timeline.select( '#trigger', parent );
//
//	var tryAgainButton = timeline.select( '#try-again', parent );
//
//	TweenMax.to( tryAgainButton, 1, { autoAlpha: 1 } );
//	tryAgainButton.addEventListener( 'click', function () {
//
//		var initializationTimeline = new TimelineMax( {} );
//		initializationTimeline
//			.add( 'start' )
//			.to( trigger, 1, { autoAlpha: 0 }, 'start' )
//			.to( otherTriggerBlocks, 0.5, { autoAlpha: 0 }, 'start+=0.5' )
//			.to( otherBlocks, 0.5, { autoAlpha: 0 }, 'start+=0.5' )
//			.to( otherTriggerLines, 0.5, { autoAlpha: 0 }, 'start+=0.5' )
//			.to( otherResponseLines, 0.5, { autoAlpha: 0 }, 'start+=0.5' )
//			.to( perceptualDatabaseBlock, 0.5, { autoAlpha: 1 }, 'start+=0.5' )
//
//			.add( 'move' )
//			.to( timeline.selectAll( 'rect, tspan', perceptualDatabaseBlock ), 1, {
//				attr: { y: '-=60' },
//				ease: Power1.easeOut
//			}, 'move' )
//			.to( lineChildren, 1, {
//				rotation: 18,
//				y: '-=35',
//				svgOrigin: (lineBox.x + lineBox.width) + ' ' + lineBox.y,
//				ease: Power1.easeOut
//			}, 'move' )
//			.to( lineChildren, 1, {
//				rotation: 18,
//				y: '-=35',
//				svgOrigin: (lineBox.x + lineBox.width) + ' ' + lineBox.y,
//				ease: Power1.easeOut
//			}, 'move' );
//
//	} );
//}


function initializeIllumination( illuminationBlock, svg ) {

	//TODO remove for real from art file
	var illumination = svg.getElementById( 'illumination' );
	illumination.remove();

	var event = timeline.select( '#event', svg );
	var eventRect = event.getBoundingClientRect();

	TweenMax.set( illuminationBlock, {
		css: { width: eventRect.left, autoAlpha: 0 }
	} );
	//var illumination = svg.getElementById( 'illumination' );
	//var scaleRatio = timeline.select( ".fullpage-wrapper", document ).clientHeight / 300;
	//var transform = illumination.getAttribute( 'transform' ).match( /[-+]?\d+(\.\d+)?/g );
	//var block = timeline.select( '#block', illumination );
	//var glow = timeline.select( '#glow', illumination );
	//var glowShift = (scaleRatio - 1) * (glow.getAttribute( 'height' ) / 2);
	//var blockShift = (scaleRatio - 1) * (block.getAttribute( 'height' ) / 2);
	//TweenMax.set( block, { height: scaleRatio * block.getAttribute( 'height' ), y: '-=' + blockShift } );
	//TweenMax.set( glow, { height: scaleRatio * glow.getAttribute( 'height' ), y: '-=' + glowShift } );
}
