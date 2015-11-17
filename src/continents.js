import _ from 'lodash';
import d3 from 'd3';
import d3Transform from 'd3-transform';
import TWEEN from 'tween.js';

import dispatcher from './dispatcher.js';
import Circle from './Circle.js';
import Continent from './Continent.js';

let continents,
	continentContainer,
	centerX, centerY,
	frameCount = 0,
	currentEmotion;

const continentsSection = {

	isInited: false,
	isActive: false,

	init: function (container) {

		this.update = this.update.bind(this);

		let labelContainer = document.createElement('div');
		labelContainer.id = 'continent-labels';
		container.appendChild(labelContainer);
		continentContainer = d3.select(container).append('svg')
			.attr('width', '100%')
			.attr('height', '100%');

		let w = container.offsetWidth,
			h = container.offsetHeight,
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

		this.initContinentLabels(labelContainer);

		Object.keys(this.transitions).forEach(transitionKey => {
			this.transitions[transitionKey] = this.transitions[transitionKey].bind(this);
		});

		this.isInited = true;

		this.setActive(true, container);

		this.update();

	},

	setEmotion: function (emotion) {

		if (emotion === currentEmotion) { return; }

		if (currentEmotion) {

			// -->> TODO: keep in mind what happens if setEmotion() is called during a transition! <<--

			if (emotion) {

				// TODO:
				// transition from one emotion to another
				// implement as Promise chain? steps will overlap.

				// transitions.unfocusContinents(currentEmotion)
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

				// TODO:
				// transition back from zoomed continent to all continents


			}

		} else {

			// TODO:
			// transition from all continents view into single continent view
			// implement as Promise chain? steps will overlap.

			// transitions.unfocusContinents(all other continents)
			// 1. fade out and shrink all but focused continent

			// transitions.panToContinent(currentEmotion)
			// transitions.focusZoomedOutContinent(currentEmotion)
			// 2a. zoom in on focused continent and pan to center
			// 2b. while zooming, remove/add enough circles to match number of states
			// 2c. while 2a-b happens, tween colors of circles to match mocks? or leave them randomized?

			// transitions.spreadFocusedContinent()
			// 2d. while 2a-c happens, execute (currentEmotion):2b-c above.

			let targetScale = 1.0;

			this.transitions.unfocusContinents(continents
				.filter(continent => continent.id !== emotion)
				.map(continent => continent.id)
			);
			
			this.transitions.panToContinent(emotion);

			setTimeout(() => {
				targetScale = this.transitions.focusZoomedOutContinent(emotion);
			}, 500);

			setTimeout(() => {
				this.transitions.spreadFocusedContinent(emotion, targetScale);
			}, 750);
		}

		currentEmotion = emotion;

	},

	initContinentLabels: function (labelContainer) {

		continents.forEach(function (continent) {

			let label = document.createElement('div');
			label.innerHTML = '<a href="#' + continent.id + '"><h3>' + continent.name.toUpperCase() + '</h3></a>';
			label.style.left = Math.round(centerX + continent.x + continent.label.x) + 'px';
			label.style.top = Math.round(centerY + continent.y + continent.label.y) + 'px';
			labelContainer.appendChild(label);

			setTimeout(function () {
				label.classList.add('visible');
			}, 1000);

		});

	},

	setActive: function (val, container) {

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
		panToContinent: function (emotion) {

			let targetContinent = continents.find(continent => continent.id === emotion),
				targetCenter = {
					x: centerX,
					y: centerY
				},
				targetX = centerX - targetContinent.x,
				targetY = centerY - targetContinent.y;

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

			// fade out continent labels
			d3.selectAll('#continent-labels div')
				.style('opacity', 0.0);

		},

		// 2b. spread circles along horizontal axis as they fade in + grow
		// 2c. (later) allow circles to drift slightly along horizontal axis only. this motion can be reflected in the states view as well.
		spreadFocusedContinent: function (emotion, targetScale) {

			let targetContinent = continents.find(continent => continent.id === emotion);
			targetContinent.spreadCircles(continentContainer.node(), targetScale);

		},

		// 1. fade out and shrink all but focused continent / 
		// 1a. fade out and shrink circles of continent;
		// 1b. pull circles together toward center along horizontal axis as they fade/shrink
		//		note: for zoomed-out continents, circles will already be centered, but that's ok.
		unfocusContinents: function (emotions) {

			let targetContinents = continents.filter(continent => ~emotions.indexOf(continent.id));
			let translate;
			targetContinents.forEach(continent => {

				// turn off spawning, in a way it can easily be turned back on
				continent.spawnConfig.freq *= -1;

				// scale down to nothing
				continent.addTween({
					'scaleX': 0.0,
					'scaleY': 0.0
				}, 1200, TWEEN.Easing.Quadratic.InOut);

				// TODO: move each circle within continent toward continent center
				// continent.spreadCircles(false);
				// -- or --
				// continent.gatherCircles()

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

	onContinentMouseEnter: function () {

		let continent = d3.select(this).datum();
		if (continent) {
			continents.forEach(c => {
				c.isHighlighted = (c === continent);
			});
		}

	},

	onContinentMouseLeave: function () {

		let continent = d3.select(this).datum();
		if (continent) {
			continent.isHighlighted = false;
		}

	},

	onContinentMouseUp: function (event) {

		continents.some(function (continent) {
			if (continent.isHighlighted) {
				dispatcher.navigate(dispatcher.SECTIONS.CONTINENTS, continent.id);
				return true;
			}
		});

	}

};

export default continentsSection;
