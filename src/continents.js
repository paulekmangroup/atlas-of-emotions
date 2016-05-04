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
	closeDelay: sassVars.ui.labels.duration.in * 1000,

	init: function (containerNode) {
		this.sectionContainer = containerNode;

		this.update = this.update.bind(this);

		this.defaultEmotionHelper = this.getDefaultEmotionHelper();

		this.labelContainer = d3.select(containerNode)
			.append('div')
			.attr('class', 'label-container');

		continentContainer = d3.select(containerNode).append('svg')
			.attr('width', '100%')
			.attr('height', '100%');

		let w = containerNode.offsetWidth,
			h = containerNode.offsetHeight,
			continentGeom;

		centerX = sassVars.continents.centerX * w;
		centerY = sassVars.continents.centerY * h;
		continentGeom = {
			w: w,
			h: h,
			centerX: centerX,
			centerY: centerY
		};

		// map each emotion to a Continent instance
		continents = _.values(dispatcher.EMOTIONS).map(emotion => new Continent(emotion, continentContainer, continentGeom));

		this.initLabels(this.labelContainer);

		// Bind transition namespace to current scope
		Object.keys(this.transitions).forEach(transitionKey => {
			this.transitions[transitionKey] = this.transitions[transitionKey].bind(this);
		});

		// Bind event handlers to current scope
		this.onContinentMouseEnter = this.onContinentMouseEnter.bind(this);
		this.onContinentMouseLeave = this.onContinentMouseLeave.bind(this);
		this.onContinentClick = this.onContinentClick.bind(this);

		// this.onLabelOver = this.onLabelOver.bind(this);
		// this.onLabelOut = this.onLabelOut.bind(this);

		this.isInited = true;

	},

	setEmotion: function (emotion, previousEmotion) {

		return new Promise((resolve, reject) => {

			if (currentEmotion) {

				let currentContinent = continents.find(c => c.id === currentEmotion);

				if (emotion) {

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
						dispatcher.changeCallout(null, emotionsData.metadata.continents.header, emotionsData.metadata.continents.body);

						resolve();

					}

				} else {

					// deselect all continents
					continents.forEach(c => c.highlightLevel = Continent.HIGHLIGHT_LEVELS.NONE);
					this.setContinentHighlight(null, Continent.HIGHLIGHT_LEVELS.NONE);

					// display all-continents callout
					dispatcher.changeCallout(null, emotionsData.metadata.continents.header, emotionsData.metadata.continents.body);

					if (this.zoomedInContinent) {

						// navigate straight to root, ignoring any previously-selected emotion continent
						// (e.g. clicked on ATLAS OF EMOTIONS home button)

						// immediately gather continent that was
						// zoomed into last time we left continents
						this.transitions.gatherContinent(this.zoomedInContinent, true);

						// pan to center immediately
						this.transitions.panToContinent(null, currentEmotion, true);

						// scale all continents to 0 immediately (after other transforms above),
						// and then back up to full size
						setTimeout(() => {
							let allEmotions = continents.map(continent => continent.id);
							this.transitions.scaleContinents(allEmotions, 0.0, undefined, 0)
							.then(() => {
								return this.transitions.scaleContinents(allEmotions, 1.0);
							})
							.then(() => {
								resolve();
							});
						}, 1);

					} else {

						resolve();

					}

				}

			} else {

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

						// display all-continents callout
						dispatcher.changeCallout(null, emotionsData.metadata.continents.header, emotionsData.metadata.continents.body);

						resolve();

					}

				} else {

					// display all-continents callout
					dispatcher.changeCallout(null, emotionsData.metadata.continents.header, emotionsData.metadata.continents.body);
					resolve();

				}

			}

			const desc = (emotion) ? emotionsData.emotions[emotion].continent.desc : null;
			dispatcher.popupChange('continents', emotion, desc);

			currentEmotion = emotion;
			this.zoomedInContinent = null;

		});

	},

	getDefaultEmotionHelper: function() {

		const keys = Object.keys(dispatcher.EMOTIONS);
		const randomeKey = keys[Math.floor(Math.random() * keys.length)];

		return dispatcher.EMOTIONS[randomeKey];

	},

	initLabels: function (labelContainer) {
		let labels = labelContainer.selectAll('.emotion-label')
			.data(continents, d => d.id);

		let labelsEnter = labels.enter()
			.append('div')
			.attr('class', d => `emotion-label ${d.id}`)
			.attr('data-popuptarget', d => `continents:${d.id}`)
			.classed('default-interactive-helper', d => d.name.toLowerCase() === this.defaultEmotionHelper.toLowerCase())
			.style('left', d => Math.round(centerX + d.x + d.label.x) + 'px')
			.each(positionLabelsVertically);

		labelsEnter.append('a')
			.attr('href', d => `#continents:${d.id}`)
			.append('h3')
				.text(d => d.name.toUpperCase());

	},

	open: function (options) {

		this.setActive(true);
		this.setInteractive(true);

		// fade in continent labels, with delay if this is the first opened section of the session
		// display callout here if this is the first opened section of the session;
		// otherwise, callout display is handled within setEmotion.
		// this will probably have to change to support deeplinking to a zoomed-in emotion,
		// we'll figure that out later.
		if (options && options.firstSection && !localStorage.modalSeen) {
			// if first section in session, and intro modal has not been viewed,
			// move continents out of the way of the intro modal
			this.setContinentIntroPositions(true);
		}

		this.update();

	},

	close: function (nextSection) {

		return new Promise((resolve, reject) => {

			let continent = continents.find(c => c.id === currentEmotion);
			if (nextSection === dispatcher.SECTIONS.STATES && continent && continent.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED) {

				// if there is a selected continent, and we're transitioning into States,
				// animate the continent down into the floor of the States graph.

				this.closeDelay = sassVars.ui.labels.duration.in * 1000;

				let targetScale = 1.0,
					spreadDelay = sassVars.continents.spread.delay.in * 1000,
					spreadDuration = sassVars.continents.spread.duration.in * 1000;

				// disable interaction immediately
				this.setInteractive(false);

				this.transitions.scaleContinents(
					continents
						.filter(c => c !== continent)
						.map(c => c.id),
					0.0
				);

				this.transitions.panToContinent(continent.id);

				setTimeout(() => {
					targetScale = this.transitions.focusZoomedOutContinent(continent.id);
				}, spreadDelay);

				setTimeout(() => {
					this.transitions.spreadFocusedContinent(continent.id, targetScale);
				}, spreadDelay);

				setTimeout(() => {
					// turn off updates
					this.setActive(false);

					// store continent zoomed into for later reverse animation
					this.zoomedInContinent = continent.id;
				}, spreadDelay + spreadDuration);

				setTimeout(() => {
					// resolve `closeDelay` ms before continent zoom transition completes,
					// to allow overlap between continent transition and next section's intro transition
					resolve();
				}, spreadDelay + spreadDuration - this.closeDelay);

			} else {

				this.closeDelay = 0;

				// not transitioning a selected continent into states.
				// disable updates and interaction and resolve close sequence immediately.
				this.setActive(false);
				this.setInteractive(false);
				resolve();

			}

		});

	},

	/**
	 * Update continent sizes and positions.
	 * note that Continent size is used to determine constituent Circle sizes,
	 * but Continent.onResize() does not update existing Circle sizes
	 * so size changes take a bit of time to propagate.
	 */
	onResize: function () {

		let w = this.sectionContainer.offsetWidth,
			h = this.sectionContainer.offsetHeight,
			continentGeom;

		centerX = 0.48 * w;
		centerY = 0.5 * h;
		continentGeom = {
			w: w,
			h: h,
			centerX: centerX,
			centerY: centerY
		};

		continents.forEach(c => c.onResize(continentGeom));

		// update label positions
		let labels = this.labelContainer.selectAll('.emotion-label')
			.data(continents, d => d.id);

		// we're not adding anything, so skip right to update
		labels
			.style('left', d => Math.round(centerX + d.x + d.label.x) + 'px')
			.each(positionLabelsVertically);
	},

	setActive: function (val) {

		let section = this;
		this.isActive = val;

		continents.forEach(function (continent, i) {
			continent.d3Selection
				.on('mouseenter', val ? section.onContinentMouseEnter : null)
				.on('mouseleave', val ? section.onContinentMouseLeave : null)
				.on('click', val ? section.onContinentClick : null, true);
		});

		this.labelContainer.selectAll('.emotion-label')
		.classed('visible', val)
		.on({
			mouseenter: val ? section.onContinentMouseEnter : null,
			mouseleave: val ? section.onContinentMouseLeave : null
		});

	},

	setInteractive: function (val) {

		// handle background click for deselection
		d3.select('#main').on('click', val ? this.onBackgroundClick : null, false);

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
				// this.setLabelVisibility(true);

			}

		});

	},

	setLabelVisibility: function(val) {
		this.labelContainer
			.selectAll('.emotion-label')
			.classed('visible', val);
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
		panToContinent: function (emotion, previousEmotion, immediate) {

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

			if (immediate) {
				durationX = 0;
				durationY = 0;
				funcX = TWEEN.Easing.Linear.None,
				funcY = TWEEN.Easing.Linear.None;
			} else if (!!emotion) {
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

			let MAX_TIME = time;

			if (delays && Object.keys(delays).length) {
				MAX_TIME = time + (_.max(_.values(delays)) || 0);
			}

			return new Promise((resolve, reject) => {

				let targetContinents = continents.filter(continent => ~emotions.indexOf(continent.id));
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
			this.unsetContinentHighlight(continent);
		}, mouseLeaveDelay);

	},

	onContinentClick: function (continent) {

		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		if (this.mouseLeaveTimeout) {
			clearTimeout(this.mouseLeaveTimeout);
		}

		dispatcher.navigate(dispatcher.SECTIONS.CONTINENTS, continent.id);

	},

	onBackgroundClick: function () {

		if (this.mouseLeaveTimeout) {
			clearTimeout(this.mouseLeaveTimeout);
		}

		dispatcher.navigate(dispatcher.HOME);

	},

	unsetContinentHighlight: function (continent) {
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

		this.setLabelStates();
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

		this.setLabelStates();
	},

	/**
	 * labels can have one of three states:
	 * 1 - 'highlighted'
	 * 2 - 'selected'
	 * 3 - 'muted'
	 */
	setLabelStates: function() {
		if (!this.labelContainer) return;

		const somethingSelected = continents
			.filter(c => c.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED);

		const somethingHighlighted = continents.filter(c => c.highlightLevel === Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED);

		const labels = this.labelContainer.selectAll('.emotion-label');

		labels
			.classed('highlighted', false)
			.classed('muted', false)
			.classed('selected', false);

		if (somethingSelected.length || somethingHighlighted.length) {
			labels
				.classed('muted', d => {
					return d.highlightLevel !== Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED &&
					d.highlightLevel !== Continent.HIGHLIGHT_LEVELS.SELECTED;
				})
				.classed('highlighted', d => d.highlightLevel === Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED)
				.classed('selected', d => d.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED);

			// remove default-interactive-helper once user highlights something
			this.labelContainer.select('.default-interactive-helper')
				.classed('default-interactive-helper', false);
		}
	}

};

function positionLabelsVertically (d, i) {
	const bottomness = (d.y + d.label.y + centerY) / centerY;
	if (bottomness > 1.5) {
		// bottom align labels toward bottom of screen, so popups open upwards
		this.style.top = null;
		this.style.bottom = -Math.round(centerY + d.y + d.label.y) + 'px';
	} else {
		// open other popups normally
		this.style.top = Math.round(centerY + d.y + d.label.y) + 'px';
		this.style.bottom = null;
	}

}

export default continentsSection;
