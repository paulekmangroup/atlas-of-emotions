import _ from 'lodash';
import d3 from 'd3';
import TWEEN from 'tween.js';

import dispatcher from './dispatcher.js';
import Circle from './Circle.js';
import Continent from './Continent.js';

import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';

let continents,
	continentContainer,
	centerX, centerY,
	frameCount = 0,
	currentEmotion;

const continentsSection = {

	isInited: false,
	isActive: false,

	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.update = this.update.bind(this);

		let labelContainer = document.createElement('div');
		labelContainer.id = 'continent-labels';
		containerNode.appendChild(labelContainer);

		continentContainer = d3.select(containerNode).append('svg')
			.attr('width', '100%')
			.attr('height', '100%');

		let w = containerNode.offsetWidth,
			h = containerNode.offsetHeight,
			continentGeom;

		centerX = 0.55 * w;
		centerY = 0.5 * h;
		continentGeom = {
			w: w,
			h: h,
			centerX: centerX,
			centerY: centerY
		};

		// map each emotion to a Continent instance
		continents = _.values(dispatcher.EMOTIONS).map(emotion => new Continent(emotion, continentContainer, continentGeom));

		this.initLabels(labelContainer);

		// Bind transition namespace to current scope
		Object.keys(this.transitions).forEach(transitionKey => {
			this.transitions[transitionKey] = this.transitions[transitionKey].bind(this);
		});

		// Bind event handlers to current scope
		this.onContinentMouseEnter = this.onContinentMouseEnter.bind(this);
		this.onContinentMouseLeave = this.onContinentMouseLeave.bind(this);
		this.onContinentMouseUp = this.onContinentMouseUp.bind(this);

		this.isInited = true;

	},

	setEmotion: function (emotion, previousEmotion) {

		return new Promise((resolve, reject) => {

			if (currentEmotion) {

				// -->> TODO: keep in mind what happens if setEmotion() is called during a transition! <<--
				
				let currentContinent = continents.find(c => c.id === currentEmotion);

				if (emotion) {

					// TODO:
					// transition from one emotion to another
					// implement as Promise chain? steps will overlap.

					// transitions.scaleContinents(currentEmotion)
					// 1a. fade out and shrink circles of current continent;
					// 1b. pull circles together toward center along horizontal axis as they fade/shrink

					// transitions.panToContinent(currentEmotion)
					// 1c. while 1a-b happens, pan toward continent location from current continent's location, according to all continents view layout.

					// transitions.focusZoomedInContinent(currentEmotion)
					// 2a. fade in and grow all circles for zoomed continent view from center of circle
					//		random colors or picked from mocks?

					// transitions.spreadFocusedContinent(currentEmotion)
					// 2b. spread circles along horizontal axis as they fade in + grow
					// 2c. (later) allow circles to drift slightly along horizontal axis only. this motion can be reflected in the states view as well.

					if (this.zoomedInContinent) {

						// transition back from zoomed continent to all continents
						
						if (this.zoomedInContinent !== previousEmotion) {
							// if zoomed into a different continent than we're returning to
							// (i.e. left continents, changed emotions, returned to continents),
							// immediately gather the previous and spread the current,
							// then gather the current with an animation.
							this.transitions.gatherContinent(this.zoomedInContinent, true);

							//
							// TODO: have to complete this block by
							// immediately to panning to location of current emotion
							// and spreading circles of that continent.
							//
							
						}

						// gather circles of zoomed-in continent
						this.transitions.gatherContinent(currentEmotion);

						setTimeout(() => {

							// scale all continents back up to full size
							this.transitions.scaleContinents(continents.map(continent => continent.id), 1.0);

							// pan to center
							this.transitions.panToContinent(null, currentEmotion);

							// display all-continents callout
							dispatcher.changeCallout(null, emotionsData.metadata.continents.header, emotionsData.metadata.continents.body);

							resolve();

						}, sassVars.continents.spread.delay.out * 1000);

					} else {

						// new continent selected with a continent previously selected
						currentContinent.highlightLevel = Continent.HIGHLIGHT_LEVELS.UNSELECTED;

						let continent = continents.find(c => c.id === emotion);
						this.setContinentHighlight(continent, Continent.HIGHLIGHT_LEVELS.SELECTED);

						dispatcher.changeCallout(emotion, emotion, emotionsData.emotions[emotion].continent.desc);

						resolve();

					}

				} else {

					continents.forEach(c => c.highlightLevel = Continent.HIGHLIGHT_LEVELS.NONE);
					dispatcher.changeCallout(null, emotionsData.metadata.continents.header, emotionsData.metadata.continents.body);

					resolve();

				}

			} else {

				// TODO:
				// transition from all continents view into single continent view
				// implement as Promise chain? steps will overlap.

				// transitions.scaleContinents(all other continents)
				// 1. fade out and shrink all but focused continent

				// transitions.panToContinent(currentEmotion)
				// transitions.focusZoomedOutContinent(currentEmotion)
				// 2a. zoom in on focused continent and pan to center
				// 2b. while zooming, remove/add enough circles to match number of states
				// 2c. while 2a-b happens, tween colors of circles to match mocks? or leave them randomized?

				// transitions.spreadFocusedContinent()
				// 2d. while 2a-c happens, execute (currentEmotion):2b-c above.

				if (emotion) {

					if (this.zoomedInContinent) {

						// TODO: never currently hit this block because zoomedInContinent is not set
						// until the first continent zoom (transition into states) happens.
						// intent is for this block to be triggered when navigating from outside continents
						// into a focused continent, regardless of whether or not continents
						// has yet been visited this session.
						// 
						// TODO: in the above scenario, we'll also have to enable this transition
						// by pre-zooming/flattening the continent, in order to animate
						// away from that state back to the SELECTED, zoomed-out state.

						// transition back from zoomed continent to all continents

						// gather circles of zoomed-in continent
						this.transitions.gatherContinent(previousEmotion);
						
						setTimeout(() => {

							// scale all continents back up to full size
							this.transitions.scaleContinents(continents.map(continent => continent.id), 1.0);

							// pan to center
							this.transitions.panToContinent(null, previousEmotion);

							// display all-continents callout
							dispatcher.changeCallout(null, emotionsData.metadata.continents.header, emotionsData.metadata.continents.body);

							resolve();

						}, sassVars.continents.spread.delay.out * 1000);

					} else {

						// new continent selected with nothing previously selected
						let continent = continents.find(c => c.id === emotion);
						this.setContinentHighlight(continent, Continent.HIGHLIGHT_LEVELS.SELECTED);

						dispatcher.changeCallout(emotion, emotion, emotionsData.emotions[emotion].continent.desc);

						resolve();

					}

				} else {

					// this was used when navigating from states view directly to all continents view,
					// with no intermediate zoomed-in continent view.
					/*
					// display all continents
					let delays = {};
					continents.forEach(continent => {
						delays[continent.id] = continent.id === previousEmotion ? 0 : 800;
					});
					this.transitions.scaleContinents(continents.map(continent => continent.id), 1.0, delays, 500);

					dispatcher.changeCallout(null, emotionsData.metadata.continents.header, emotionsData.metadata.continents.body);
					*/
				
					resolve();

				}
			
			}

			currentEmotion = emotion;
			this.zoomedInContinent = null;

		});

	},

	initLabels: function (labelContainer) {

		continents.forEach(function (continent) {

			let label = document.createElement('div');
			label.innerHTML = '<a href="#continents:' + continent.id + '"><h3>' + continent.name.toUpperCase() + '</h3></a>';
			label.style.left = Math.round(centerX + continent.x + continent.label.x) + 'px';
			label.style.top = Math.round(centerY + continent.y + continent.label.y) + 'px';
			labelContainer.appendChild(label);

		});

	},

	open: function (options) {

		this.setActive(true);

		// fade in continent labels, with delay if this is the first opened section of the session
		// display callout here if this is the first opened section of the session;
		// otherwise, callout display is handled within setEmotion.
		// this will probably have to change to support deeplinking to a zoomed-in emotion,
		// we'll figure that out later.
		if (options && options.firstSection) {
			// if first section in session, move continents out of the way of the intro modal
			this.setContinentIntroPositions(true);
		} else {
			// else, fade in continent labels
			d3.selectAll('#continent-labels div')
				.style('opacity', 1.0);
		}

		this.update();

	},

	close: function () {

		return new Promise((resolve, reject) => {

			// tuen off updates and interaction
			this.setActive(false);

			resolve();

		});

	},

	setActive: function (val) {

		let section = this;
		this.isActive = val;

		continents.forEach(function (continent, i) {
			continent.d3Selection
				.on('mouseenter', val ? section.onContinentMouseEnter : null)
				.on('mouseleave', val ? section.onContinentMouseLeave : null)
				.on('mouseup', val ? section.onContinentMouseUp : null);
		});

	},

	/**
	 * Position continents for site intro or to normal positioning.
	 * @param {Boolean} val If true, continents tween away from center; false, back to normal positions.
	 */
	setContinentIntroPositions (val) {

		let w = this.sectionContainer.offsetWidth,
			h = this.sectionContainer.offsetHeight,
			diag = Math.sqrt(w * w + h * h) / 2;

		continents.forEach(continent => {
			if (val) {
				continent.addTween(
					{
						'introSpreadRad': continent.introSpreadMaxRad * diag
					},
					sassVars.continents.introSpread.duration.out * 1000,
					sassVars.continents.introSpread.delay.out * 1000,
					TWEEN.Easing.Cubic.InOut
				);
			} else {
				continent.addTween(
					{
						'introSpreadRad': 0
					},
					sassVars.continents.introSpread.duration.in * 1000,
					sassVars.continents.introSpread.delay.in * 1000,
					TWEEN.Easing.Cubic.InOut);

				// NOTE: this code is specific to displaying/activating continents for the first time in the session
				// (when the intro modal is dismissed and the continents brought back to the screen center),
				// but doesn't really have anything to do with bringing the continents back to the screen center.
				// So, this code should probably belong elsewhere, but for now, here it stays.
				
				// display the default continents callout and continent labels.
				dispatcher.changeCallout(null, emotionsData.metadata.continents.header, emotionsData.metadata.continents.body);
				d3.selectAll('#continent-labels div')
					.style('opacity', 1.0);

			}

		});

	},

	update: function (time) {

		if (this.tweens) {
			_.values(this.tweens).forEach(tween => {
				tween.update(time);
			});
		}

		let updateState = {
			time: time,
			someContinentIsHighlighted: continents.some(function (continent) { return continent.isHighlighted; })
		};

		continents.forEach(continent => continent.update(updateState, frameCount));

		frameCount++;
		if (this.isActive) {
			window.requestAnimationFrame(this.update);
		}

	},

	/**
	 * Functions that perform transitions between continent views.
	 * Bound to continents.js in init().
	 */
	transitions: {

		// 2a. zoom in on focused continent and pan to center
		// 2b. while zooming, remove/add enough circles to match number of states
		// 2c. while 2a-b happens, tween colors of circles to match mocks? or leave them randomized?
		focusZoomedOutContinent: function (emotion) {

			let targetContinent = continents.find(continent => continent.id === emotion),
				targetScale = (0.45 * continentContainer.node().getBoundingClientRect().height) / targetContinent.size;

			targetContinent.addTween({
				'scaleX': targetScale,
				'scaleY': targetScale,
			}, sassVars.continents.spread.duration.in * 1000, 0, TWEEN.Easing.Quadratic.InOut);

			return targetScale;

		},

		// 2a. fade in and grow all circles for zoomed continent view from center of circle
		//		random colors or picked from mocks?
		focusZoomedInContinent: function (emotion) {

		},

		// 1c. while 1a-b happens, pan toward continent location from current continent's location, according to all continents view layout.
		panToContinent: function (emotion, previousEmotion) {

			if (this.panTweenTimeout) {
				clearTimeout(this.panTweenTimeout);
			}

			// calculate bottom of states graph
			// TODO: 50 (graph margin) should be a var in variables.json
			let statesBaselineOffset = centerY - (this.sectionContainer.offsetHeight * (parseInt(sassVars.states.containers.bottom.replace('%', '')) / 100) + 50);

			let targetContinent = continents.find(continent => continent.id === emotion),
				previousContinent = continents.find(continent => continent.id === previousEmotion),
				targetCenter = {
					x: centerX - (previousContinent ? previousContinent.x : 0),
					y: centerY - (previousContinent ? previousContinent.y - statesBaselineOffset : 0)
				},
				targetX = centerX,
				targetY = centerY;

			if (targetContinent) {
				targetX -= targetContinent.x;
				targetY -= targetContinent.y - statesBaselineOffset;
			}

			let durationX,
				durationY,
				funcX,
				funcY;

			if (!!emotion) {
				// panning to
				durationX = sassVars.continents.panX.duration.in * 1000;
				durationY = sassVars.continents.panY.duration.in * 1000;
				funcX = TWEEN.Easing.Quadratic.InOut,
				funcY = TWEEN.Easing.Quadratic.InOut;
			} else {
				// panning from
				durationX = sassVars.continents.panX.duration.out * 1000;
				durationY = sassVars.continents.panY.duration.out * 1000;
				funcX = TWEEN.Easing.Quadratic.In,
				funcY = TWEEN.Easing.Quadratic.Out;
			}

			this.addTween(targetCenter, {
				'x': targetX
			}, durationX, funcX)
			.onUpdate(function () {
				continents.forEach(continent => {
					continent.centerX = this.x;
				});
			})
			.start();

			this.addTween(targetCenter, {
				'y': targetY
			}, durationY, funcY)
			.onUpdate(function () {
				continents.forEach(continent => {
					continent.centerY = this.y;
				});
			})
			.start();

			// fade in/out continent labels
			d3.selectAll('#continent-labels div')
				.style('opacity', targetContinent ? 0.0 : 1.0);

		},

		// 2b. spread circles along horizontal axis as they fade in + grow
		// 2c. (later) allow circles to drift slightly along horizontal axis only. this motion can be reflected in the states view as well.
		spreadFocusedContinent: function (emotion, targetScale) {

			let targetContinent = continents.find(continent => continent.id === emotion);
			targetContinent.spreadCircles(continentContainer.node(), targetScale);

		},

		gatherContinent: function (emotion, immediate) {

			let targetContinent = continents.find(continent => continent.id === emotion);
			targetContinent.gatherCircles(immediate);

		},

		// 1. fade out and shrink all but focused continent / 
		// 1a. fade out and shrink circles of continent;
		// 1b. pull circles together toward center along horizontal axis as they fade/shrink
		//		note: for zoomed-out continents, circles will already be centered, but that's ok.
		scaleContinents: function (emotions, scale, delays={}, time=1200) {

			let MAX_TIME;

			if (delays) {
				MAX_TIME = time + (_.max(_.values(delays)) || 0);
			}

			return new Promise((resolve, reject) => {

				let targetContinents = continents.filter(continent => ~emotions.indexOf(continent.id)),
					translate;
				targetContinents.forEach(continent => {

					// toggle spawning
					if ((scale && continent.spawnConfig.freq < 0) ||
						(!scale && continent.spawnConfig.freq > 0)) {
						continent.spawnConfig.freq *= -1;
					}

					// scale down to nothing
					continent.addTween({
						'scaleX': scale,
						'scaleY': scale
					}, time + (delays[continent.id] || 0), 0, TWEEN.Easing.Quadratic.InOut);

				});

				setTimeout(() => {
					resolve();
				}, MAX_TIME);

			});

		},

	},

	/**
	 * Add to currently-tweening queue.
	 * Callers of this function are responsible for implementing onUpdate (if necessary)
	 * and for `start()`ing the returned Tween.
	 */
	addTween: function (obj, props, time, func=TWEEN.Easing.Linear.None) {

		if (!this.tweens) {
			this.tweens = {};
		}

		let key = Object.keys(props).sort().join(',');
		if (this.tweens[key]) {
			this.tweens[key].stop();
		}

		this.tweens[key] = new TWEEN.Tween(obj)
			.to(props, time)
			.onComplete(() => { delete this.tweens[key]; })
			.easing(func);

		return this.tweens[key];

	},

	onContinentMouseEnter: function (continent) {

		// if already selected, leave as-is
		if (continent.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED) { return; }

		this.setContinentHighlight(continent, Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED);

		// If mouseenter fires after mouseleave,
		// prevent mouseleave behavior (maintain highlight)
		if (this.mouseLeaveTimeout) {
			clearTimeout(this.mouseLeaveTimeout);
		}

	},

	onContinentMouseLeave: function (continent) {

		// enough time to smoothly roll across a gap from one continent
		// to another without selections flashing on/off
		let mouseLeaveDelay = 80;

		this.mouseLeaveTimeout = setTimeout(() => {

			let otherHighlightedContinent;
			continents.some((c => {
				if (c !== continent &&
					(c.highlightLevel === Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED ||
					c.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED)) {
					otherHighlightedContinent = c;
					return true;
				}
			}));

			if (otherHighlightedContinent) {
				// If there is a highlighted continent other than the event target continent,
				// just unhiglight the event target continent (unless it's selected, then leave as-is)
				let unhighlightLevel = otherHighlightedContinent.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED ? Continent.HIGHLIGHT_LEVELS.UNSELECTED : Continent.HIGHLIGHT_LEVELS.UNHIGHLIGHTED;
				if (continent && continent.highlightLevel !== Continent.HIGHLIGHT_LEVELS.SELECTED) {
					continent.highlightLevel = unhighlightLevel;
				}
			} else {
				// Else, turn off all highlights except selected.
				let unhighlightLevel = continent.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED ? Continent.HIGHLIGHT_LEVELS.UNSELECTED : Continent.HIGHLIGHT_LEVELS.NONE;
				continents.forEach(c => {
					if (c.highlightLevel !== Continent.HIGHLIGHT_LEVELS.SELECTED) {
						c.highlightLevel = unhighlightLevel;
					}
				});
			}
			
		}, mouseLeaveDelay);

	},

	onContinentMouseUp: function (continent) {

		if (continent.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED) {

			// click on selected continent to zoom into continent and navigate to states
			// TODO: might not want this, might want to adhere to only the scroll / down button interaction
			let targetScale = 1.0;

			this.transitions.scaleContinents(
				continents
					.filter(c => c !== continent)
					.map(c => c.id),
				0.0
			);
			
			this.transitions.panToContinent(continent.id);

			setTimeout(() => {
				targetScale = this.transitions.focusZoomedOutContinent(continent.id);
			}, sassVars.continents.spread.delay.in * 1000);

			setTimeout(() => {
				this.transitions.spreadFocusedContinent(continent.id, targetScale);
			}, sassVars.continents.spread.delay.in * 1000);

			setTimeout(() => {
				// navigate to states automatically once continent zoom transition completes
				this.zoomedInContinent = continent.id;
				dispatcher.navigate(dispatcher.SECTIONS.STATES, currentEmotion);
			}, (sassVars.continents.spread.delay.in + sassVars.continents.spread.duration.in) * 1000);

		} else {

			dispatcher.navigate(dispatcher.SECTIONS.CONTINENTS, continent.id);

		}

		// continents.some(continent => {
		// 	if (continent.isHighlighted) {

		// 		if (currentEmotion !== continent.id) {

		// 			// navigate from all continents view to zoomed-in continent view
		// 			dispatcher.navigate(dispatcher.SECTIONS.CONTINENTS, continent.id);
		// 			dispatcher.changeCallout(continent.id, continent.id, emotionsData.emotions[continent.id].continent.desc);

		// 		} else {

		// 			// navigate from zoomed-in continent view to states view
		// 			// TODO: this will happen on scroll, not click
		// 			dispatcher.navigate(dispatcher.SECTIONS.STATES, continent.id); 

		// 		}

		// 		/*
		// 		// fade out continent labels
		// 		d3.selectAll('#continent-labels div')
		// 			.style('opacity', 0.0);

		// 		// shrink down continents
		// 		let delays = {};
		// 		delays[continent.id] = 500;
		// 		this.transitions.scaleContinents(continents.map(continent => continent.id), 0.0, delays, 800)
		// 		.then(() => {
		// 			dispatcher.navigate(dispatcher.SECTIONS.STATES, continent.id);
		// 		});
		// 		*/
				
		// 		return true;
		// 	}
		// });

	},

	setContinentHighlight: function (continent, highlightLevel) {

		// Set unhighlightLevel based on if any continent highlighted
		let unhighlightLevel;
		if (highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED || continents.some(c => c.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED)) {
			unhighlightLevel = Continent.HIGHLIGHT_LEVELS.UNSELECTED;
		} else {
			unhighlightLevel = Continent.HIGHLIGHT_LEVELS.UNHIGHLIGHTED;
		}

		if (continent) {
			continents.forEach(c => {
				if (c === continent) {
					c.highlightLevel = highlightLevel;
				} else {
					// unhighlight all but selected
					if (c.highlightLevel !== Continent.HIGHLIGHT_LEVELS.SELECTED) {
						c.highlightLevel = unhighlightLevel;
					}
				}
			});
		}
		console.log(">>>>> TODO: apply highlight levels to continent labels as well");

	}


};

export default continentsSection;
