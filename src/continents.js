import _ from 'lodash';
import d3 from 'd3';
import d3Transform from 'd3-transform';
import TWEEN from 'tween.js';

import dispatcher from './dispatcher.js';
import Circle from './Circle.js';
import Continent from './Continent.js';

import emotionsData from '../static/emotionsData.json';
import appStrings from '../static/appStrings.json';

let continents,
	continentContainer,
	centerX, centerY,
	frameCount = 0,
	currentEmotion;

const continentsSection = {

	isInited: false,
	isActive: false,

	init: function (containerNode) {

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
		this.onContinentMouseUp = this.onContinentMouseUp.bind(this);

		this.isInited = true;

	},

	setEmotion: function (emotion, previousEmotion) {

		/*
		// was in open(), before i neutered open()
		if (currentEmotion) {
			// TODO:
			// zoomed-in continent view
			// rotate back to flat / top-down view
		} else {
			// TODO:
			// zoomed-out continents view
			// fade in + grow continents
			// fade in labels
		}
		*/

		// if (emotion === currentEmotion) { return; }

		if (currentEmotion) {

			// -->> TODO: keep in mind what happens if setEmotion() is called during a transition! <<--

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

			} else {

				// transition back from zoomed continent to all continents

				// gather circles of zoomed-in continent
				this.transitions.gatherContinent(previousEmotion);
				
				setTimeout(() => {

					// scale all continents back up to full size
					this.transitions.scaleContinents(continents.map(continent => continent.id), 1.0);

					// pan to center
					this.transitions.panToContinent(null, previousEmotion);

					// display all-continents callout
					dispatcher.changeCallout(null, appStrings.continents.header, appStrings.continents.body);

				}, 750);

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
				// zoom into specified emotion
				let targetScale = 1.0;

				this.transitions.scaleContinents(
					continents
						.filter(continent => continent.id !== emotion)
						.map(continent => continent.id),
					0.0
				);
				
				this.transitions.panToContinent(emotion);

				setTimeout(() => {
					targetScale = this.transitions.focusZoomedOutContinent(emotion);
				}, 500);

				setTimeout(() => {
					this.transitions.spreadFocusedContinent(emotion, targetScale);
				}, 750);
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

				dispatcher.changeCallout(null, appStrings.continents.header, appStrings.continents.body);
				*/

			}
		
		}

		currentEmotion = emotion;

	},

	initLabels: function (labelContainer) {

		continents.forEach(function (continent) {

			let label = document.createElement('div');
			label.innerHTML = '<a href="#' + continent.id + '"><h3>' + continent.name.toUpperCase() + '</h3></a>';
			label.style.left = Math.round(centerX + continent.x + continent.label.x) + 'px';
			label.style.top = Math.round(centerY + continent.y + continent.label.y) + 'px';
			labelContainer.appendChild(label);

		});

	},

	open: function (firstSection) {

		this.setActive(true);

		// fade in continent labels, with delay if this is the first opened section of the session
		// display callout here if this is the first opened section of the session;
		// otherwise, callout display is handled within setEmotion.
		// this will probably have to change to support deeplinking to a zoomed-in emotion,
		// we'll figure that out later.
		setTimeout(function () {
			if (firstSection) {
				dispatcher.changeCallout(null, appStrings.continents.header, appStrings.continents.body);
			}
			d3.selectAll('#continent-labels div')
				.style('opacity', 1.0);
		}, firstSection ? 1000 : 0);


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
				targetScale = (0.45 * continentContainer.node().offsetHeight) / targetContinent.size;

			targetContinent.addTween({
				'scaleX': targetScale,
				'scaleY': targetScale,
			}, 1500, TWEEN.Easing.Quadratic.InOut);

			return targetScale;

		},

		// 2a. fade in and grow all circles for zoomed continent view from center of circle
		//		random colors or picked from mocks?
		focusZoomedInContinent: function (emotion) {

		},

		// 1c. while 1a-b happens, pan toward continent location from current continent's location, according to all continents view layout.
		panToContinent: function (emotion, previousEmotion) {

			let targetContinent = continents.find(continent => continent.id === emotion),
				previousContinent = continents.find(continent => continent.id === previousEmotion),
				targetCenter = {
					x: centerX - (previousContinent ? previousContinent.x : 0),
					y: centerY - (previousContinent ? previousContinent.y : 0)
				},
				targetX = centerX,
				targetY = centerY;

			if (targetContinent) {
				targetX -= targetContinent.x;
				targetY -= targetContinent.y;
			}

			this.addTween(targetCenter, {
				'x': targetX,
				'y': targetY
			}, 1250, TWEEN.Easing.Quadratic.InOut)
			.onUpdate(function () {
				continents.forEach(continent => {
					continent.centerX = this.x;
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

		gatherContinent: function (emotion) {

			let targetContinent = continents.find(continent => continent.id === emotion);
			targetContinent.gatherCircles();

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
					}, time + (delays[continent.id] || 0), TWEEN.Easing.Quadratic.InOut);

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

	onContinentMouseEnter: function (event) {

		var d33 = d3;

		let continent = d3.select(this).datum();
		if (continent) {
			continents.forEach(c => {
				c.isHighlighted = (c === continent);
			});
		}

	},

	onContinentMouseLeave: function (event) {

		let continent = d3.select(this).datum();
		if (continent) {
			continent.isHighlighted = false;
		}

	},

	onContinentMouseUp: function (event) {

		continents.some(continent => {
			if (continent.isHighlighted) {

				if (currentEmotion !== continent.id) {

					// navigate from all continents view to zoomed-in continent view
					dispatcher.navigate(dispatcher.SECTIONS.CONTINENTS, continent.id);
					dispatcher.changeCallout(continent.id, continent.id, emotionsData.emotions[continent.id].desc);

				} else {

					// navigate from zoomed-in continent view to states view
					// TODO: this will happen on scroll, not click
					dispatcher.navigate(dispatcher.SECTIONS.STATES, continent.id); 

				}

				/*
				// only anger and sadness are currently implemented in states.js
				if (continent.id !== dispatcher.EMOTIONS.ANGER &&
					continent.id !== dispatcher.EMOTIONS.SADNESS) {
					return;
				}
				*/
				
				/*
				// fade out continent labels
				d3.selectAll('#continent-labels div')
					.style('opacity', 0.0);

				// shrink down continents
				let delays = {};
				delays[continent.id] = 500;
				this.transitions.scaleContinents(continents.map(continent => continent.id), 0.0, delays, 800)
				.then(() => {
					dispatcher.navigate(dispatcher.SECTIONS.STATES, continent.id);
				});
				*/
				
				return true;
			}
		});

	}

};

export default continentsSection;
