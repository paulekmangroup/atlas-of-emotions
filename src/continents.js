import _ from 'lodash';
import d3 from 'd3';
import d3Transform from 'd3-transform';
import penner from 'penner';

import dispatcher from './dispatcher.js';
import Circle from './Circle.js';
import Continent from './Continent.js';

let labelContainer,
	continentContainer,
	centerX,
	centerY,
	continents,
	continentTransforms,
	frameCount = 0,
	currentEmotion = null;

const continentsSection = {

	isInited: false,
	isActive: false,

	init: function (container) {

		this.update = this.update.bind(this);

		labelContainer = document.createElement('div');
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

		this.initContinentLabels();

		this.isInited = true;

		this.setActive(true, container);

		this.update();

	},

	setEmotion: function (emotion) {

		if (emotion === currentEmotion) { return; }

		if (currentEmotion) {

			// -->> TODO: keep in mind what happens if setEmotion() is called during a transition! <<--

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

			this.transitions.unfocusContinents(continents
				.filter(continent => continent.id !== emotion)
				.map(continent => continent.id)
			);
		}

		currentEmotion = emotion;

	},

	/**
	 * Functions that perform transitions between continent views
	 */
	transitions: {

		// 2a. zoom in on focused continent and pan to center
		// 2b. while zooming, remove/add enough circles to match number of states
		// 2c. while 2a-b happens, tween colors of circles to match mocks? or leave them randomized?
		focusZoomedOutContinent: function (emotion) {

		},

		// 2a. fade in and grow all circles for zoomed continent view from center of circle
		//		random colors or picked from mocks?
		focusZoomedInContinent: function (emotion) {

		},

		// 1c. while 1a-b happens, pan toward continent location from current continent's location, according to all continents view layout.
		panToContinent: function (emotion) {

		},

		// 2b. spread circles along horizontal axis as they fade in + grow
		// 2c. (later) allow circles to drift slightly along horizontal axis only. this motion can be reflected in the states view as well.
		spreadFocusedContinent: function (emotion) {

		},

		// 1. fade out and shrink all but focused continent / 
		// 1a. fade out and shrink circles of continent;
		// 1b. pull circles together toward center along horizontal axis as they fade/shrink
		//		note: for zoomed-out continents, circles will already be centered, but that's ok.
		unfocusContinents: function (emotions) {

			let tgtContinents = continents.filter(continent => ~emotions.indexOf(continent.id));
			let translate;
			tgtContinents.forEach(continent => {

				// TODO:
				// 1. turn off spawning
				// 2. shrink all circles down in a set amount of time...probably easiest to just shrink the container.
				// 3. move circles toward center

				// turn off spawning, in a way it can easily be turned back on
				continent.spawnConfig.freq *= -1;


				// TODO MONDAY
				// continents should maintain position and scale as their own variable (state),
				// and there should be only one place (within update())
				// that sets the transform from those values.
				// never even read from attr('transform'), just use those vals.
				// then, set up RAF function that decreases continent.scale over time.

				// scale down to nothing
				// translate = /translate\((.*)\)/.exec(continent.d3Selection.attr('transform'));
				translate = /translate\(([^\)]*)\)/.exec(continent.d3Selection.attr('transform'));
				translate = translate ? translate[1].split(',') : [0, 0];
				continent.d3Selection
					.attr('transform', d3Transform()
						.translate(translate[0], translate[1])
						.scale(0, 0)
					);


			});

		},

	},

	initContinentLabels: function () {

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

	update: function () {

		let updateState = {
			someContinentIsHighlighted: continents.some(function (continent) { return continent.isHighlighted; })
		};

		continents.forEach(continent => continent.update(updateState, frameCount));

		frameCount++;
		if (this.isActive) {
			window.requestAnimationFrame(this.update);
		}

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
