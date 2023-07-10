import d3 from 'd3';
import {TweenMax, TimelineMax, Power2, Power1, Bounce} from "gsap";

import Episode from './Episode.js';
import Continent from '../Continent.js';
import scroller from '../scroller.js';
import timeline from './timeline.js';
import dispatcher from '../dispatcher.js';
import BlockDiagram from './BlockDiagram';


export default class EpisodeAddAwareness extends Episode {

	//overload with additional content changes
	replaceContent(emotion, animate = false) {

		super.replaceContent(emotion, animate);

		let textColor = this.configsByEmotion[emotion].colorPalette[0];

		this.responseTextUnawareColor =
			'rgba(' + Math.min(textColor[0] + 80, 255)
			+ ',' + Math.min(textColor[1] + 80, 255)
			+ ',' + Math.min(textColor[2] + 80, 255)
			+ ', 0.9)';

	}

	destroy() {
		super.destroy();
		//TweenMax.killDelayedCallsTo( this.toggleTriggerAndResponseAwareness );
		//TweenMax.killDelayedCallsTo( this.advanceAndStart );
		//TweenMax.killTweensOf( this.illuminationBlock );
		this.addAwarenessButtonExperience.onclick = null;
		this.addAwarenessButtonResponse.onclick = null;
		this.refractoryPeriodButton.onclick = null;
		this.blockDiagramButton.onclick = null;

		this.hideAddAwarenessButtons();
		this.illuminationBlock.setAttribute('style', null);
	}

	//conputeIlluminationFadeWidth(){
	//	return this.getParentWidth()/30;
	//}

	initializeIllumination(svg) {

		//TODO remove for real from art file
		let illumination = svg.getElementById('illumination');
		timeline.remove(illumination);

		let event = timeline.select('#event', svg);
		let eventRect = event.getBoundingClientRect();
		this.illuminationBlock = document.createElement("div");
		this.illuminationBlock.id = 'illumination-block';
		if (this.screenIsSmall) {
			let container = document.createElement("div");
			container.classList.add('illumination-container');
			container.appendChild(this.illuminationBlock);
			this.parent.insertBefore(container, svg);
			this.resizeIllumination();
		} else {
			let container = $('#app-container')[0];
			container.insertBefore(this.illuminationBlock, container.firstChild);
		}

	}

	onResize() {
		super.onResize();
		//this.resizeIllumination();
	}

	resizeIllumination() {
		$('.illumination-container').width(this.getSvgWidth());
		//let illuminationPosition = this.getStageIlluminationPercentage( this.awarenessStage );
		//this.moveIllumination( illuminationPosition, 0 );
	}

	getScrollElements() {
		if (!this.scrollElements) {
			this.scrollElements = [
				this.parent.querySelector('svg'),
				this.parent.querySelector('.illumination-container')
			];
		}
		return this.scrollElements;
	}

	hide(onComplete) {
		this.hideIllumination();
		super.hide(onComplete);
	}

	hideIllumination(onComplete) {
		TweenMax.to(this.illuminationBlock, 1, {autoAlpha: 0, onComplete: onComplete});
	}

	getStageIlluminationPoint(stage) {
		if (stage == 'trigger') {
			let bounds = this.parent.querySelector('#state').getBoundingClientRect();
			return 0.75 * bounds.left + 0.25 * bounds.right;
		}
		if (stage == 'experience') {
			let bounds = this.parent.querySelector('#responses').getBoundingClientRect();
			return 0.75 * bounds.left + 0.25 * bounds.right;
		}
		if (stage == 'response') {
			let wrapperSvg = this.parent.querySelector('svg');
			let bounds = wrapperSvg.getBoundingClientRect();
			return bounds.right;
		}
		return null;
	}

	getStageIlluminationPercentage(stage) {
		let point = this.getStageIlluminationPoint(stage);
		let percentage = point ? 100 * point / this.getIlluminationContainerWidth() : 0;
		return percentage;
	}

	getIlluminationContainerWidth() {
		let container = this.illuminationBlock.parentNode;
		let bounds = container.getBoundingClientRect();
		return bounds.right - bounds.left;
	}

	moveIllumination(position, duration = 4) {
		return TweenMax.to(
			this.illuminationBlock,
			duration, {
				css: {right: (100 - position) + '%'},
				ease: Power2.easeInOut
			});
	};


	constructor(svg, container, emotion, screenIsSmall) {
		super(svg, container, emotion, screenIsSmall);
	}

	initialize(svg, container, emotion, screenIsSmall) {

		let refractoryPeriodTime = 15;
		this.refractoryPeriodEnabled = false;
		//this.refractoryBlocks = [];

		if (svg) {

			// illumination
			this.illuminationBlock = timeline.select('#illumination-block', document);
			//let illuminationGlow = timeline.select( '#glow', document );
			this.initializeIllumination(svg);

			//timeline with examples
			let timelineWithExamples = timeline.select('#timeline-with-examples', this.parent);

			//blocks
			let blockDiagram = new BlockDiagram(timeline.select('#blocks', this.parent), this.parent);


			this.content = timeline.episodeContent;


			// hide elements and prepare for animation
			TweenMax.allTo(timeline.getChildren(timeline.select('#state', timelineWithExamples)), 0, {visibility: 'hidden'});


			//state
			let state = timeline.select('#state', timelineWithExamples),
				stateLabel = timeline.select('#state-label', timelineWithExamples);
			let bBox = state.getBBox();
			let stateLabelCenter = bBox.x + bBox.width / 2;
			let stateLabelChildren = timeline.getChildren(stateLabel);
			for (let i = 0; i < stateLabelChildren.length; i++) {
				stateLabelChildren[i].setAttribute('x', stateLabelCenter);
				stateLabelChildren[i].setAttribute('text-anchor', 'middle');
				if (i == 1) {
					stateLabelChildren[i].style.textTransform = 'uppercase';
				}
			}

			this.initStateCircles();

			//changes
			let physicalChanges = timeline.select('#physical-changes', timelineWithExamples),
				mentalChanges = timeline.select('#mental-changes', timelineWithExamples),
				changes = timeline.select('#changes', timelineWithExamples);
			physicalChanges.style.visibility = 'hidden';
			mentalChanges.style.visibility = 'hidden';

			//lines
			let eventLineGroup = timeline.select('#event-lines', timelineWithExamples),
				eventLines = [
					//timeline.select( "path#precondition-line", eventLineGroup ),
					timeline.select("path#event-line", eventLineGroup),
					//timeline.select( "path#perceptual-database-line", eventLineGroup )
				],
				eventLineDecorations = [
					//timeline.select( "path#precondition-line-decoration-1", eventLineGroup ),
					timeline.select("path#event-line-decoration-1", eventLineGroup),
					//timeline.select( "path#perceptual-database-line-decoration-1", eventLineGroup )
				],
				responseLineGroup = timeline.select('#response-lines', timelineWithExamples),
				responseLines = timeline.selectAll("path:not([id*='decoration'])", responseLineGroup),
				responseLineDecorations = timeline.selectAll("[id*='decoration']", responseLineGroup);

			//hide first and third lines and arrowheads
			TweenMax.allTo(timeline.selectAll('[id*="response-line-1"]', timelineWithExamples), 0, {autoAlpha: 0});
			TweenMax.allTo(timeline.selectAll('[id*="response-line-3"]', timelineWithExamples), 0, {autoAlpha: 0});


			let trigger = timeline.select('#trigger', timelineWithExamples),
				event = timeline.select('#event', timelineWithExamples),
				precondition = timeline.select('#precondition', timelineWithExamples),
				perceptualDatabase = timeline.select('#perceptual-database', timelineWithExamples),
				constructiveResponse = timeline.select('#constructive-response', timelineWithExamples),
				destructiveResponse = timeline.select('#destructive-response', timelineWithExamples),
				ambiguousResponse = timeline.select('#ambiguous-response', timelineWithExamples),
				responses = timeline.select('#responses', timelineWithExamples);

			//text
			this.triggerText = [
				timeline.select('tspan', precondition),
				timeline.select('tspan', event),
				timeline.select('tspan', perceptualDatabase)
			];
			this.statePhraseText = [
				stateLabelChildren[0]
			];
			this.stateNameText = [
				timeline.select('tspan', physicalChanges),
				stateLabelChildren[1],
				timeline.select('tspan', mentalChanges)
			];
			this.responseText = [
				timeline.select('tspan', constructiveResponse),
				timeline.select('tspan', destructiveResponse),
				timeline.select('tspan', ambiguousResponse)
			];

			//center diagram text for proper placement in translations
			let triggerTextCenter = 130; //taken from english design
			this.triggerText.forEach(function (tspan) {
				tspan.setAttribute('x', triggerTextCenter);
				tspan.setAttribute('text-anchor', 'middle');
			});
			let textElements = [
				precondition,
				event,
				perceptualDatabase
			];
			textElements.forEach(function (element) {
				TweenMax.set(element, {x: 0});
			});
			bBox = changes.getBBox();
			let changesCenter = bBox.x + bBox.width / 2;
			[this.stateNameText[0], this.stateNameText[2]].forEach(function (tspan) {
				tspan.setAttribute('x', changesCenter);
				tspan.setAttribute('text-anchor', 'middle');
			});


			//d3.selectAll( this.triggerText )
			//	.attr( 'text-anchor', 'middle' )
			//	.attr( 'x', function () {
			//		return parseFloat( this.getComputedTextLength() ) / 2 + parseFloat( this.getAttribute( 'x' ) );
			//	} );
			//d3.selectAll( this.stateNameText )
			//	.attr( 'text-anchor', 'middle' )
			//	.attr( 'x', function () {
			//		return parseFloat( this.getComputedTextLength() ) / 2 + parseFloat( this.getAttribute( 'x' ) );
			//	} );
			//
			//add awareness buttons

			this.addAwarenessButtonExperience = timeline.select('#experience-add-awareness', document);
			this.addAwarenessButtonExperience.style.visibility = 'hidden'; //TODO should these be handled in css? what's typical in this app?

			this.addAwarenessButtonResponse = timeline.select('#response-add-awareness', document);
			this.addAwarenessButtonResponse.style.visibility = 'hidden';

			this.refractoryPeriodButton = timeline.select('#begin-refractory-period', document);
			this.refractoryPeriodButton.style.visibility = 'hidden';

			this.blockDiagramButton = timeline.select('#begin-block-diagram', document);
			this.blockDiagramButton.style.visibility = 'hidden';

			this.episodeTimeline = new TimelineMax({});
			let illuminationTimeline = new TimelineMax({});

			this.playFromStart = true; //TODO shared code with Episode

			let lineUnawareColor = timeline.select('#response-line-2', timelineWithExamples).getAttribute('stroke');
			let lineAwareColor = timeline.select('#response-line-1', timelineWithExamples).getAttribute('stroke');
			let textUnawareColor = '#fff';
			this.responseTextUnawareColor = textUnawareColor;
			let textAwareColor = timeline.select('#constructive-response', timelineWithExamples).getAttribute('fill');

			let refractoryIlluminationTween = null;
			let refractoryColorsTween = null;

			let setLineColor = function (line, decoration, color, time = 0) {
				TweenMax.to(line, time, {attr: {stroke: color}});
				//TweenMax.to( decoration, time, { attr: { fill: color } } );
				TweenMax.to(decoration, time, {attr: {stroke: color}});
			};

			let setResponseLineColor = function (lineIndex, aware, time = 0) {
				let color = aware ? lineAwareColor : lineUnawareColor;
				setLineColor(responseLines[lineIndex], responseLineDecorations[lineIndex], color, time);
			};

			let setEventLineColor = function (lineIndex, aware, time = 0) {
				let color = aware ? lineAwareColor : lineUnawareColor;
				setLineColor(eventLines[lineIndex], eventLineDecorations[lineIndex], color, time);
			};

			let setTextColor = function (textElement, aware, time = 0) {
				let color = aware ? textAwareColor : textUnawareColor;
				TweenMax.to(textElement, time, {attr: {fill: color}});
			};

			let setResponseTextColor = function (textElement, aware, time = 0) {
				let color = aware ? textAwareColor : this.responseTextUnawareColor;
				TweenMax.to(textElement, time, {attr: {fill: color}});
			}.bind(this);

			let setResponseLineStyle = function (lineIndex, aware) {
				//solid if unaware
				if (aware) {
					responseLines[lineIndex].setAttribute('stroke-dasharray', '3,8');
				} else {
					responseLines[lineIndex].removeAttribute('stroke-dasharray');
				}
			};

			let addResponseLineAwareness = function () {
				if (this.awarenessStage == 'experience') {
					//reset center line color
					setResponseLineColor(1, true);
				}
				if (this.awarenessStage == 'response') {
					for (let i = 0; i < responseLines.length; i++) {
						setResponseLineStyle(i, true);
						setResponseLineStyle(i, true);
						setResponseLineColor(i, true);
					}
					//show all lines and arrowheads
					TweenMax.allTo(timeline.selectAll('[id*="response-line-"]', timelineWithExamples), 0, {autoAlpha: 1});
				}
			};

			let addExperienceAwareness = function () {
				if (this.awarenessStage == 'experience') {
					physicalChanges.style.visibility = 'visible';
					mentalChanges.style.visibility = 'visible';
				}
			};

			let addResponseAwareness = function () {
				if (this.awarenessStage == 'response') {
					setTextColor(destructiveResponse, true);
				}
			};

			this.toggleTriggerAndResponseAwareness = function (aware, time = 0) {

				setResponseLineColor(1, aware, time);
				setResponseLineStyle(1, aware, time);
				setEventLineColor(0, aware, time);

				setTextColor(event, aware, time);
				setResponseTextColor(destructiveResponse, aware, time);

			};

			this.awarenessStage = 'trigger';

			this.advance = function () {

				if (this.awarenessStage == 'trigger') {

					let illuminationPosition = this.getStageIlluminationPercentage('experience');
					this.moveIllumination(illuminationPosition);
					this.awarenessStage = 'experience';

				} else if (this.awarenessStage == 'experience') {

					let illuminationPosition = 125;
					let illuminationTimeline = new TimelineMax({});

					// move illumination all the way off screen, starting with a smooth but quick acceleration
					// once it is finished illuminating the entire timeline, the block interactions are enabled
					illuminationTimeline
						.add('start')
						.add(this.moveIllumination(illuminationPosition))
						.add('finished')
						.addCallback(()=> {
							TweenMax.to(this.refractoryPeriodButton, 1, {autoAlpha: 1, ease: Power2.easeOut});
						});
					//if ( this.screenIsSmall ) {
					illuminationTimeline
						.fromTo(this.illuminationBlock, 1,
							{css: {backgroundColor: 'rgba(255,255,255,0)'}},
							{css: {backgroundColor: 'rgba(255,255,255,1)'}, ease: Power0.easeIn}, 'finished');
					//} else {
					//	illuminationTimeline
					//		.to( this.illuminationBlock, 10, {
					//			css: { width: '+=3000' },
					//			ease: Power0.easeIn
					//		}, 'finished' )
					//}
					illuminationTimeline.add('end');

					this.awarenessStage = 'response';

				} else if (this.awarenessStage == 'response') {

					scroller.pulseEmotionNav();
					this.awarenessStage = 'refractory';

				} else if (this.awarenessStage == 'refractory') {

					this.awarenessStage = 'blocks';
					timeline.allowMoreContent();

				}

				timeline.advanceAwarenessStage(this.awarenessStage);

			};

			this.advanceAndStart = function () {
				this.start();
				TweenMax.delayedCall(1, () => {
					this.advance();
				});
			};


			let enableBlockDiagram = function () {
				let clickableElements = [
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
				blockDiagram.addMouseHandlers(clickableElements);
				this.refractoryBlocks = blockDiagram.getRefractoryBlocks();
				this.replayEnabled = false;
				this.refractoryPeriodEnabled = false;
				//timeline.toggleEmotionNav( false );
			};

			//pulsate illumination
			let pulsateIllumination = function () {
				TweenMax.allTo([this.illuminationBlock /*, glow */], 1.9, {
					css: {x: '-=5'},
					repeat: -1,
					yoyo: true,
					repeatDelay: 0,
					ease: Power1.easeInOut
				}, 'pulsate-illumination');
			};

			let showAddAwarenessButton = function () {

				if (this.awarenessStage == 'trigger' && this.addAwarenessButtonExperience.style.visibility == 'hidden') {
					TweenMax.to(this.addAwarenessButtonExperience, 1, {autoAlpha: 1, ease: Power2.easeOut});
				}
				if (this.awarenessStage == 'experience' && this.addAwarenessButtonResponse.style.visibility == 'hidden') {
					TweenMax.to(this.addAwarenessButtonResponse, 1, {autoAlpha: 1, ease: Power2.easeOut});
				}
				if (this.awarenessStage == 'refractory' && this.blockDiagramButton.style.visibility == 'hidden') {
					TweenMax.to(this.blockDiagramButton, 1, {autoAlpha: 1, ease: Power2.easeOut});
				}
			};

			this.hideAddAwarenessButtons = function () {

				let buttons = [
					this.addAwarenessButtonExperience,
					this.addAwarenessButtonResponse,
					this.blockDiagramButton
				];
				buttons.forEach((b)=> {
					b.style.visibility = 'hidden';
					b.style.opacity = 0;
				});

			};

			this.triggerRefractoryEffects = function () {

				let darkenTime = 0.25;

				if (!this.rewindActive && this.refractoryPeriodEnabled) {

					// prevent awaiting changes from happening
					// now that we are resetting the tween
					if (refractoryColorsTween) {
						refractoryColorsTween.kill();
					}
					if (refractoryIlluminationTween) {
						refractoryIlluminationTween.kill();
					}
					//if ( refractoryBlocksTween ) {
					//	refractoryBlocksTween.kill();
					//}
					//
					this.toggleTriggerAndResponseAwareness(false, darkenTime);

					//prepare the refractory period
					refractoryIlluminationTween =
						TweenMax.to(
							this.illuminationBlock,
							darkenTime,
							{
								autoAlpha: 0,
								ease: Power3.easeInOut,

								onComplete: ()=> {
									TweenMax.to(
										this.illuminationBlock,
										refractoryPeriodTime,
										{
											autoAlpha: 1,
											ease: Power3.easeInOut,

											onComplete: () => {
												scroller.pulseEmotionNav();
											}

										});
								}

							});

					//change the text colors mid way through the illumination change
					refractoryColorsTween =
						TweenMax.delayedCall(
							refractoryPeriodTime / 2,
							this.toggleTriggerAndResponseAwareness.bind(this),
							[true, darkenTime]
						);

				}
			};

			//start the illumination
			this.resizeIllumination();
			illuminationTimeline
				.add('illuminate')
				.fromTo(this.illuminationBlock, 2, {autoAlpha: 0}, {autoAlpha: 1, ease: Power1.easeInOut})
				.add(this.moveIllumination(this.getStageIlluminationPercentage('trigger')), {
					onComplete: ()=> {
						pulsateIllumination.bind(this)();
					}
				}, 'illuminate')
				.add('pulsate-illumination');


			//start the timeline
			this.episodeTimeline
			//show event
				.add('event')
				.from(trigger, 0.5, {autoAlpha: 0, ease: Power1.easeOut})

				.add('event-pulse')
				.to(timeline.select('#event-text', timelineWithExamples), 0.1, {
					scale: 1.1,
					transformOrigin: '50% 50%',
					ease: Power1.easeOut
				})
				.to(timeline.select('#event-text', timelineWithExamples), 0.2, {
					scale: 1,
					transformOrigin: '50% 50%',
					ease: Power1.easeOut
				})
				.to(timeline.select('#perceptual-database-text', timelineWithExamples), 0.1, {
					scale: 1.1,
					transformOrigin: '50% 50%',
					ease: Power1.easeOut
				}, '-=0.25')
				.to(timeline.select('#perceptual-database-text', timelineWithExamples), 0.2, {
					scale: 1,
					transformOrigin: '50% 50%',
					ease: Power1.easeOut
				})
				.add('event-lines')
				.from(eventLineGroup, 0.5, {autoAlpha: 0, ease: Power1.easeOut},
					this.screenIsSmall ? 'event-lines+=1.5' : 'event-lines')

				// show emo state
				.add('experience')
				.addCallback(()=> {
					if (!this.rewindActive && this.screenIsSmall) {
						this.scrollSvgToStage('experience');
					}
				});

			this.addStateEmergence();

			this.episodeTimeline
				.addCallback(addExperienceAwareness.bind(this), 'experience')
				.addCallback(this.triggerRefractoryEffects.bind(this), 'experience')
				.from(changes, 2, {autoAlpha: 0, ease: Power1.easeOut}, 'experience')
				.from(stateLabel, 2, {
					autoAlpha: 0,
					ease: Power1.easeOut,
				}, 'experience')
				.add('pulsate')
				//show response
				.add('response-lines', '-=0.5')
				.addCallback(addResponseLineAwareness.bind(this), 'response-lines')
				.from(responseLineGroup, 0.5, {autoAlpha: 0, ease: Power1.easeOut}, 'response-lines')

				.add('responses')
				.addCallback(()=> {
					if (!this.rewindActive && this.screenIsSmall) {
						this.scrollSvgToStage('response');
					}
				})
				.addCallback(addResponseAwareness.bind(this))
				.from(responses, 1, {autoAlpha: 0, ease: Power1.easeOut})

				.add('end');

			this.episodeTimeline
				.add('add-awareness-button')
				.addCallback(showAddAwarenessButton.bind(this));

			this.addStatePulsation();

			let hideButton = function (button) {
				TweenMax.to(button, 1, {
					autoAlpha: 0,
					ease: Power2.easeOut,
					//onComplete: function () {
					//	button.style.display = 'none';
					//}
				});
			};
			let awarenessClickCallback = function (e) {
				//if ( this.screenIsSmall ) {
				//	dispatcher.minimizeSectionText();
				//}
				hideButton(e.currentTarget);
				//reset and advance at start
				this.rewind(() => {
					TweenMax.delayedCall(0.5, () => {
						this.advanceAndStart();
					});
				});
			};
			let refractoryPeriodClickCallback = function (e) {
				this.refractoryPeriodEnabled = true;
				awarenessClickCallback.bind(this)(e);
			};
			let blockDiagramClickCallback = function (e) {
				//if ( this.screenIsSmall ) {
				//	dispatcher.minimizeSectionText();
				//}
				hideButton(e.currentTarget);
				this.advance();
				enableBlockDiagram.bind(this)();
			};


			this.addAwarenessButtonExperience.onclick = awarenessClickCallback.bind(this);
			this.addAwarenessButtonResponse.onclick = awarenessClickCallback.bind(this);
			this.refractoryPeriodButton.onclick = refractoryPeriodClickCallback.bind(this);
			this.blockDiagramButton.onclick = blockDiagramClickCallback.bind(this);

			TweenMax.set(state, {visibility: 'visible'});

			this.replaceContent(this.currentEmotion, false);
			this.fixEventLineOverlap(event, eventLines[0], timeline);

			TweenMax.set(this.parent, {visibility: 'visible'});

			this.episodeTimeline.pause();
			TweenMax.delayedCall(2, ()=> {
				this.episodeTimeline.tweenTo('end');
			});

			this.isActive = true;

		}

	}

}