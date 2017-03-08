import Continent from '../Continent.js';
import timeline from './timeline.js'
import { TweenMax, TimelineMax } from "gsap";

export default class Episode {

	constructor( svg, container ) {

		var configsByEmotion = Continent.configsByEmotion;

		if ( svg && !svg._initializedEpisode ) {


			//fonts need to be added for them to work in svg
			timeline.addFonts( svg );


			var parent = timeline.extractDocument( svg, container );

			var content = [
				{ event: 'a stranger shouts at you', state: 'fear', response: 'you run away' },
				{ event: 'a stranger shouts at you', state: 'anger', response: 'you shout back' },
				{ event: 'a stranger shouts at you', state: 'enjoyment', response: 'you laugh!' }
			];


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

			var tl = new TimelineMax( {} );

			var contentIndex = 0;

			var replaceContent = function ( contentIndex ) {

				var colors;
				stateLabelChildren[ 1 ].textContent = content[ contentIndex ].state;
				responseChildren[ 0 ].textContent = content[ contentIndex ].response;
				colors = configsByEmotion[ content[ contentIndex ].state ].colorPalette;

				var color1 = colors[ 0 ];
				var color2 = colors[ Math.round( (colors.length - 1) / 3 ) ];
				var color3 = colors[ colors.length - 1 ];
				c1.setAttribute( 'fill', 'rgb(' + color1[ 0 ] + ',' + color1[ 1 ] + ',' + color1[ 2 ] + ')' );
				c2.setAttribute( 'fill', 'rgb(' + color2[ 0 ] + ',' + color2[ 1 ] + ',' + color2[ 2 ] + ')' );
				c3.setAttribute( 'fill', 'rgb(' + color3[ 0 ] + ',' + color3[ 1 ] + ',' + color3[ 2 ] + ')' );

			};

			var reset = function () {

				tl.timeScale( 3 );

				tl.pause();
				tl.seek( 'end' );

				tl.tweenTo( 'event-lines', {
					onComplete: function () {

						contentIndex++;
						if ( contentIndex >= content.length ) {
							contentIndex = 0;
						}

						//replace content
						replaceContent( contentIndex );

						//run animation
						tl.timeScale( 1 );
						tl.pause();
						tl.seek( 'event-pulse' );

						TweenMax.delayedCall( 0.5, function () {
							tl.play();
						} );

					}, ease: Power2.easeOut
				} );

			};

			//make sure event pulsates from center
			event.style.transformOrigin = "50% 50%";

			//start the timeline


			tl
			//show event
				.add( 'event' )
				.from( event, 0.5, { autoAlpha: 0, ease: Power1.easeOut } )

				.add( 'event-pulse' )
				.to( event, 0.1, { scale: 1.1, ease: Power1.easeOut } )
				.to( event, 0.2, { scale: 1, ease: Power1.easeOut } )
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
				.from( tryAgainButton, 0.5, { autoAlpha: 0, ease: Power1.easeOut } )

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


			tryAgainButton.onclick = function () {
				reset();
			};

			TweenMax.set( state, { visibility: 'visible' } );

			replaceContent( contentIndex );

			TweenMax.set( parent, { visibility: 'visible' } );

			svg._initializedEpisode = true;

		}
	}

}
