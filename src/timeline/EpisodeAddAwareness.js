import Episode from './Episode.js';
import Continent from '../Continent.js';
import scroller from '../scroller.js';
import timeline from './timeline.js';
import dispatcher from '../dispatcher.js';
import { TweenMax, TimelineMax, Power2, Power1, Bounce } from "gsap";
import d3 from 'd3';
import BlockDiagram from './BlockDiagram';


export default class EpisodeAddAwareness extends Episode {

	//overload with additional content changes
	replaceContent( emotion ) {

		super.replaceContent( emotion );

		this.triggerText.forEach( this.replaceTextContentForKey( 'trigger', emotion ) );

		var textColor = this.configsByEmotion[ emotion ].colorPalette[0];

		this.responseTextUnawareColor =
			'rgba(' + Math.min( textColor[ 0 ] + 50, 255 )
			+ ',' + Math.min( textColor[ 1 ] + 50, 255 )
			+ ',' + Math.min( textColor[ 2 ] + 50, 255 )
			+ ', 0.9)';

	}

	pulsateState() { //FIXME this technique makes it jump
		//pulsate state
		TweenMax.to( this.c1, 1, {
			attr: { r: '-=5' },
			repeat: -1,
			yoyo: true,
			repeatDelay: 0,
			ease: Power1.easeInOut
		} );
		TweenMax.to( this.c2, 0.8, {
			attr: { r: '-=3' },
			repeat: -1,
			yoyo: true,
			repeatDelay: 0,
			ease: Power1.easeInOut
		} );
		TweenMax.to( this.c3, 1, {
			attr: { r: '-=2' },
			repeat: -1,
			yoyo: true,
			repeatDelay: 0,
			ease: Power1.easeInOut
		} );
	}

	constructor( svg, container, emotion ) {
		super( svg, container, emotion );
	}

	initialize( svg, container, emotion ) {

		this.configsByEmotion = Continent.configsByEmotion;
		var refractoryPeriodTime = 15;

		this.rewindActive = false;
		this.isActive = false;
		this.refractoryPeriodEnabled = false;
		this.currentEmotion = emotion && emotion != '' ? emotion : dispatcher.DEFAULT_EMOTION;


		if ( svg && !svg._initializedEpisode ) {

			//fonts need to be added for them to work in svg
			timeline.addFonts( svg );

			this.parent = timeline.extractDocument( svg, container );

			// illumination
			var illuminationBlock = timeline.select( '#illumination-block', document );
			//var illuminationGlow = timeline.select( '#glow', document );
			initializeIllumination( illuminationBlock, svg );

			//timeline with examples
			var timelineWithExamples = timeline.select( '#timeline-with-examples', this.parent );

			//blocks
			var blockDiagram = new BlockDiagram( timeline.select( '#blocks', this.parent ), this.parent );


			//blockDiagram.onComplete = function () {
			//var refractoryPeriod = RefractoryPeriod( this.parent, blocks );
			//};


			this.content = timeline.episodeContent;


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
			this.c1 = timeline.select( '#c1', timelineWithExamples );
			this.c2 = timeline.select( '#c2', timelineWithExamples );
			this.c3 = timeline.select( '#c3', timelineWithExamples );

			//changes
			var physicalChanges = timeline.select( '#physical-changes', timelineWithExamples ),
				mentalChanges = timeline.select( '#mental-changes', timelineWithExamples ),
				changes = timeline.select( '#changes', timelineWithExamples );
			physicalChanges.style.visibility = 'hidden';
			mentalChanges.style.visibility = 'hidden';

			//lines
			var eventLineGroup = timeline.select( '#event-lines', timelineWithExamples ),
				eventLines = [
					timeline.select( "path#precondition-line", eventLineGroup ),
					timeline.select( "path#event-line", eventLineGroup ),
					timeline.select( "path#perceptual-database-line", eventLineGroup )
				],
				eventLineDecorations = [
					timeline.select( "path#precondition-line-decoration-1", eventLineGroup ),
					timeline.select( "path#event-line-decoration-1", eventLineGroup ),
					timeline.select( "path#perceptual-database-line-decoration-1", eventLineGroup )
				],
				responseLineGroup = timeline.select( '#response-lines', timelineWithExamples ),
				responseLines = timeline.selectAll( "path:not([id*='decoration'])", responseLineGroup ),
				responseLineDecorations = timeline.selectAll( "[id*='decoration']", responseLineGroup );

			//hide first and third lines and arrowheads
			TweenMax.allTo( timeline.selectAll( '[id*="response-line-1"]', timelineWithExamples ), 0, { autoAlpha: 0 } );
			TweenMax.allTo( timeline.selectAll( '[id*="response-line-3"]', timelineWithExamples ), 0, { autoAlpha: 0 } );


			var event = timeline.select( '#event', timelineWithExamples ),
				precondition = timeline.select( '#precondition', timelineWithExamples ),
				perceptualDatabase = timeline.select( '#perceptual-database', timelineWithExamples ),
				constructiveResponse = timeline.select( '#constructive-response', timelineWithExamples ),
				destructiveResponse = timeline.select( '#destructive-response', timelineWithExamples ),
				ambiguousResponse = timeline.select( '#ambiguous-response', timelineWithExamples ),
				responses = timeline.select( '#responses', timelineWithExamples );

			//text
			this.triggerText = [
				timeline.select( 'tspan', precondition ),
				timeline.select( 'tspan', event ),
				timeline.select( 'tspan', perceptualDatabase )
			];
			this.stateText = [
				timeline.select( 'tspan', physicalChanges ),
				stateLabelChildren[ 1 ],
				timeline.select( 'tspan', mentalChanges )
			];
			this.responseText = [
				timeline.select( 'tspan', constructiveResponse ),
				timeline.select( 'tspan', destructiveResponse ),
				timeline.select( 'tspan', ambiguousResponse )
			];


			d3.selectAll( this.triggerText )
				.attr( 'text-anchor', 'end' )
				.attr( 'x', function () {
					return parseFloat( this.getComputedTextLength() ) + parseFloat( this.getAttribute( 'x' ) );
				} );
			d3.selectAll( this.stateText )
				.attr( 'text-anchor', 'middle' )
				.attr( 'x', function () {
					return parseFloat( this.getComputedTextLength() ) / 2 + parseFloat( this.getAttribute( 'x' ) );
				} );


			//TODO remove the awareness and try-again buttons from svg
			timeline.select( '#add-awareness-state', timelineWithExamples ).remove();
			timeline.select( '#add-awareness-response', timelineWithExamples ).remove();

			//add awareness buttons

			var addAwarenessButtonState = timeline.select( '#state-add-awareness', document );
			addAwarenessButtonState.style.visibility = 'hidden'; //TODO should these be handled in css? what's typical in this app?

			var addAwarenessButtonResponse = timeline.select( '#response-add-awareness', document );
			addAwarenessButtonResponse.style.visibility = 'hidden';

			var refractoryPeriodButton = timeline.select( '#begin-refractory-period', document );
			refractoryPeriodButton.style.visibility = 'hidden';

			//try again button

			var tryAgainButton = timeline.select( '#try-again', timelineWithExamples );
			tryAgainButton.style.cursor = 'pointer';
			tryAgainButton.style.pointerEvents = 'all';
			tryAgainButton.style.visibility = 'hidden';


			this.episodeTimeline = new TimelineMax( {} );
			var illuminationTimeline = new TimelineMax( {} );
			//var refractoryPeriodTimeline = new TimelineMax( {} );

			this.playFromStart = true; //TODO shared code with Episode

			var lineUnawareColor = timeline.select( '#response-line-2', timelineWithExamples ).getAttribute( 'stroke' );
			var lineAwareColor = timeline.select( '#response-line-1', timelineWithExamples ).getAttribute( 'stroke' );
			var textUnawareColor = '#fff';
			this.responseTextUnawareColor = textUnawareColor;
			var textAwareColor = timeline.select( '#constructive-response', timelineWithExamples ).getAttribute( 'fill' );

			var refractoryIlluminationTween = null;
			var refractoryColorsTween = null;

			var setLineColor = function ( line, decoration, color, time = 0 ) {
				TweenMax.to( line, time, { attr: { stroke: color } } );
				TweenMax.to( decoration, time, { attr: { fill: color } } );
				TweenMax.to( decoration, time, { attr: { stroke: color } } );
			};

			var setResponseLineColor = function ( lineIndex, aware, time = 0 ) {
				var color = aware ? lineAwareColor : lineUnawareColor;
				setLineColor( responseLines[ lineIndex ], responseLineDecorations[ lineIndex ], color, time );
			};

			var setEventLineColor = function ( lineIndex, aware, time = 0 ) {
				var color = aware ? lineAwareColor : lineUnawareColor;
				setLineColor( eventLines[ lineIndex ], eventLineDecorations[ lineIndex ], color, time );
			};

			var setTextColor = function ( textElement, aware, time = 0 ) {
				var color = aware ? textAwareColor : textUnawareColor;
				TweenMax.to( textElement, time, { attr: { fill: color } } );
			};

			var setResponseTextColor = function ( textElement, aware, time = 0 ) {
				var color = aware ? textAwareColor : this.responseTextUnawareColor;
				TweenMax.to( textElement, time, { attr: { fill: color } } );
			}.bind( this );

			var setResponseLineStyle = function ( lineIndex, aware ) {
				//solid if unaware
				if ( aware ) {
					responseLines[ lineIndex ].setAttribute( 'stroke-dasharray', '3,8' );
				} else {
					responseLines[ lineIndex ].removeAttribute( 'stroke-dasharray' );
				}
			};

			var addResponseLineAwareness = function () {
				if ( awarenessStage == 'state' ) {
					//reset center line color
					setResponseLineColor( 1, true );
				}
				if ( awarenessStage == 'response' ) {
					for ( var i = 0; i < responseLines.length; i++ ) {
						setResponseLineStyle( i, true );
						setResponseLineStyle( i, true );
						setResponseLineColor( i, true );
					}
					//show all lines and arrowheads
					TweenMax.allTo( timeline.selectAll( '[id*="response-line-"]', timelineWithExamples ), 0, { autoAlpha: 1 } );
				}
			};

			var addStateAwareness = function () {
				if ( awarenessStage == 'state' ) {
					physicalChanges.style.visibility = 'visible';
					mentalChanges.style.visibility = 'visible';
				}
			};

			var addResponseAwareness = function () {
				if ( awarenessStage == 'response' ) {
					setTextColor( destructiveResponse, true );
				}
			};

			var toggleEventAndResponseAwareness = function ( aware, time = 0 ) {

				setResponseLineColor( 1, aware, time );
				setResponseLineStyle( 1, aware, time );
				setEventLineColor( 1, aware, time );

				setTextColor( event, aware, time );
				setResponseTextColor( destructiveResponse, aware, time );

			};


			var awarenessStage = 'event';

			var advance = function () { //TODO should this be a member?

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
						//.addCallback( enableBlockDiagram )
						.addCallback( ()=> {
							TweenMax.to( refractoryPeriodButton, 1, { autoAlpha: 1, ease: Power2.easeOut } );
						} )
						.to( illuminationBlock, 10, { css: { width: '+=3000' }, ease: Power0.easeIn }, 'finished' )
						//.to( illuminationGlow, 10, { attr: { x: '+=3000' }, ease: Power0.easeIn }, 'finished' )
						.add( 'end' );

					awarenessStage = 'response';

				} else if ( awarenessStage == 'response' ) {

					scroller.pulseEmotionNav();
					awarenessStage = 'refractory';

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

			var showAddAwarenessButton = function () {
				if ( awarenessStage == 'event' && addAwarenessButtonState.style.visibility == 'hidden' ) {
					TweenMax.to( addAwarenessButtonState, 1, { autoAlpha: 1, ease: Power2.easeOut } );
				}
				if ( awarenessStage == 'state' && addAwarenessButtonResponse.style.visibility == 'hidden' ) {
					TweenMax.to( addAwarenessButtonResponse, 1, { autoAlpha: 1, ease: Power2.easeOut } );
				}
			};

			this.triggerRefractoryEffects = function () {

				var darkenTime = 0.25;

				if ( !this.rewindActive && this.refractoryPeriodEnabled ) {

					// prevent awaiting changes from happening
					// now that we are resetting the tween
					if ( refractoryColorsTween ) {
						refractoryColorsTween.kill();
					}
					if ( refractoryIlluminationTween ) {
						refractoryIlluminationTween.kill();
					}

					toggleEventAndResponseAwareness( false, darkenTime );

					//prepare the refractory period
					refractoryIlluminationTween =
						TweenMax.to(
							illuminationBlock,
							darkenTime,
							{
								autoAlpha: 0,
								ease: Power3.easeInOut,

								onComplete: ()=> {
									TweenMax.to(
										illuminationBlock,
										refractoryPeriodTime,
										{
											autoAlpha: 1,
											ease: Power3.easeInOut
										} );
								}

							} );

					//change the text colors mid way through the illumination change
					refractoryColorsTween =
						TweenMax.delayedCall(
							refractoryPeriodTime / 2,
							()=> {
								toggleEventAndResponseAwareness.bind( this )( true );
							} );

				}
			};

			//start the illumination
			illuminationTimeline
				.add( 'illuminate' )
				.to( illuminationBlock, 2, { autoAlpha: 1, ease: Power1.easeInOut } )
				.to( illuminationBlock, 3, {
					css: { width: '+=380' },
					ease: Power1.easeOut,
					onComplete: ()=> {
						pulsateIllumination();
					}
				}, 'illuminate' )
				.add( 'pulsate-illumination' );


			//start the timeline
			this.episodeTimeline
				//show event
				.add( 'event', '+=3' )
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
				.from( eventLineGroup, 0.5, { autoAlpha: 0, ease: Power1.easeOut }, 'event-lines' )

				// show emo state
				.add( 'state' )
				.from( this.c1, 2, { attr: { r: 0 }, autoAlpha: 0, ease: Bounce.easeOut } )
				.from( this.c2, 2, { attr: { r: 20 }, autoAlpha: 0, ease: Bounce.easeOut }, 'state' )
				.from( this.c3, 2, { attr: { r: 50 }, autoAlpha: 0, ease: Bounce.easeOut }, 'state' )
				.addCallback( addStateAwareness, 'state' )
				.addCallback( this.triggerRefractoryEffects.bind( this ), 'state' )
				.from( changes, 2, { autoAlpha: 0, ease: Power1.easeOut }, 'state' )
				.from( stateLabel, 2, {
					autoAlpha: 0,
					ease: Power1.easeOut,
					onComplete: this.pulsateState.bind( this )
				}, 'state' )
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


			var hideButton = function ( button ) {
				TweenMax.to( button, 1, {
					autoAlpha: 0,
					ease: Power2.easeOut,
					onComplete: function () {
						button.style.display = 'none';
					}
				} );
			};
			var awarenessClickCallback = function ( e ) {
				hideButton( e.currentTarget );
				//reset and advance at start
				this.rewind( () => {
					TweenMax.delayedCall( 1.5, () => {
						advance();
						this.start();
					} );
				} );
			};
			var refractoryPeriodClickCallback = function ( e ) {
				this.refractoryPeriodEnabled = true;
				awarenessClickCallback.bind( this )( e );
			};


			addAwarenessButtonState.onclick = awarenessClickCallback.bind( this );
			addAwarenessButtonResponse.onclick = awarenessClickCallback.bind( this );
			refractoryPeriodButton.onclick = refractoryPeriodClickCallback.bind( this );

			TweenMax.set( state, { visibility: 'visible' } );

			this.replaceContent( this.currentEmotion );

			TweenMax.set( this.parent, { visibility: 'visible' } );
			this.episodeTimeline.tweenTo( 'end' );

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
