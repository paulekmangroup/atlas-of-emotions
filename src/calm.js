import d3 from 'd3';
import _ from 'lodash';

import Continent from './Continent.js';

import dispatcher from './dispatcher.js';
import appStrings from './appStrings.js';
import sassVars from '../scss/variables.json';

let continents,
	continentContainer,
	centerX, centerY,
	frameCount = 0;

export default {

	isInited: false,
	isActive: false,
	screenIsSmall: false,

	init: function (containerNode, screenIsSmall) {

		this.sectionContainer = containerNode;

		this.screenIsSmall = screenIsSmall;

		this.update = this.update.bind(this);

		continentContainer = d3.select(containerNode).append('svg')
			.attr('width', '100%')
			.attr('height', '100%')
			.attr('xmlns:atlas', 'http://www.atlasofemotion.org');

		this.labelContainer = d3.select(containerNode)
			.append('div')
			.attr('class', 'label-container');

		let w = containerNode.offsetWidth,
			h = containerNode.offsetHeight,
			continentGeom;

		this.opacityState = {
			start: [0,130,0,0,-20],
			duration: [0,500,0,0,400],
			opacity: [0,0,0,0,0],
			activeEmotion: [0,1,0,0,1],
			lastEmotion: -1,
			maxNumVisible: this.screenIsSmall ? 5 : 3,
			durationBase: this.screenIsSmall ? 400 : 400,
			durationSpread: this.screenIsSmall ? 800 : 100,
		};

		this.elapsedToOpacity = d3.scale.linear().domain([0, .05 ,.25, .4, 1]).range([0,.1,.9,.9,0]);

		continentGeom = this.defineContinentGeom(w, h);

		// left-to-right
		let continentTransforms = this.calculateContinentTransforms();

		// map each emotion to a Continent instance
		continents = _.values(dispatcher.EMOTIONS).map(emotion => new Continent(emotion, continentContainer, continentGeom, continentTransforms, this.screenIsSmall));

		if (this.screenIsSmall) {
			// on mobile, spread continents to match continents section
			let diag = Math.sqrt(w * w + h * h) / 2;
			continents.forEach(continent => {
				continent.introSpreadRad = continent.introSpreadMaxRad * diag;
				continent.introSpreadSize = continent.introSpreadSizeMod || 0;
			});
		}

		let startAgain = d3.select(this.sectionContainer).append('div')
			.classed('start-again', true);
		startAgain.append('h4')
			.text(appStrings().getStr(`emotionsData.metadata.calm.caption`) || 'START OVER');
		startAgain.on('click', event => {
			dispatcher.navigate(dispatcher.SECTIONS.CONTINENTS, null);
		});

		let visitAnnex = d3.select(this.sectionContainer).append('div')
			.classed('visit-annex', true);
		visitAnnex.append('h4')
			.text(appStrings().getStr('emotionsData.metadata.calm.secondary.header').toUpperCase());
		visitAnnex.on('click', event => {
			dispatcher.navigate(dispatcher.SECTIONS.MORE, null, 'annex');
		});

		this.initLabels(this.labelContainer);

		dispatcher.addListener(dispatcher.EVENTS.POPUP_CLOSE_BUTTON_CLICKED, this.onPopupCloseButtonClicked.bind(this));

		this.isInited = true;

	},

	initLabels: function (labelContainer) {
		continents.forEach(c => {
			let labels = labelContainer.selectAll('.emotion-label')
				.data(continents, d => d.id);

			// TODO: positioning not right
			let labelsEnter = labels.enter()
				.append('div')
				.attr('class', d => `emotion-label label show-only no-body ${d.id}`)
				.attr('data-popuptarget', d => `calm${dispatcher.HASH_DELIMITER}${d.id}`)
				.attr('data-clip', '1')
				.style('left', d => Math.round(centerX + d.x - d.size) + 'px')
				.style('top', d => Math.round(centerY + d.y - 17) + 'px');

			labelsEnter.append('a')
				.attr('href', d => `#continents${dispatcher.HASH_DELIMITER}${d.id}`)
				.append('h3')
					.text(appStrings().getStr(`emotionsData.metadata.calm.caption`) || 'START OVER');
		});
	},

	setEmotion: function (emotion) {

		return new Promise((resolve, reject) => {

			// leave a bit of time for other transitions to happen
			this.openCallout(300);

			// TODO: resolve after any intro animations
			setTimeout(() => {
				resolve();
			}, 500);

		});

	},

	calculateContinentTransforms: function () {

		// TODO: DRY this out, this is continents.js copypasta
		if (!this.screenIsSmall) {

			let posScalar = 2.0;
			let sizeScalar = 6.0;
			return [
				{
					x: 0.08 * posScalar,
					y: 0.15 * posScalar,
					size: 0.11 * sizeScalar
				},
				{
					x: -0.37 * posScalar,
					y: 0.17 * posScalar,
					size: 0.13 * sizeScalar
				},
				{
					x: 0.04 * posScalar,
					y: -0.26 * posScalar,
					size: 0.15 * sizeScalar
				},
				{
					x: -0.19 * posScalar,
					y: -0.02 * posScalar,
					size: 0.11 * sizeScalar
				},
				{
					x: 0.32 * posScalar,
					y: -0.11 * posScalar,
					size: 0.13 * sizeScalar
				}
			];

		} else {

			// left-to-right
			return [
				{
					x: -0.23,
					y: -0.13,
					size: 0.15,
					introSpreadMaxRad: 0.45,
					introSpreadSizeMod: 1.5
				},
				{
					x: -0.17,
					y: 0.03,
					size: 0.15,
					introSpreadMaxRad: 0.55,
					introSpreadSizeMod: 1.5
				},
				{
					x: 0.06,
					y: -0.18,
					size: 0.15,
					introSpreadMaxRad: 0.3,
					introSpreadSizeMod: 1.5
				},
				{
					x: 0.12,
					y: 0.10,
					size: 0.15,
					introSpreadMaxRad: 0.65,
					introSpreadSizeMod: 1.5
				},
				{
					x: 0.24,
					y: -0.02,
					size: 0.15,
					introSpreadMaxRad: 0.45,
					introSpreadSizeMod: 1.5
				}
			];

		}

	},

	open: function () {

		this.setActive(true);

		// transition time from _states.scss::#states
		this.openCallout(1000);

		this.update();

	},

	close: function () {

		return new Promise((resolve, reject) => {

			// tuen off updates
			this.setActive(false);

			resolve();

		});

	},

	defineContinentGeom (w, h) {

		if (this.screenIsSmall) {
			centerX = sassVars.continents['centerX-small'] * w;
			centerY = sassVars.continents['centerY-small'] * h;
		} else {
			centerX = 0.55/*sassVars.continents.centerX*/ * w;
			centerY = sassVars.continents.centerY * h;
		}

		return {
			w: Math.min(w, h),
			h: Math.min(w, h),
			centerX: centerX,
			centerY: centerY
		};

	},

	/**
	 * Update continent sizes and positions.
	 * note that Continent size is used to determine constituent Circle sizes,
	 * but Continent.onResize() does not update existing Circle sizes
	 * so size changes take a bit of time to propagate.
	 */
	onResize: function (screenIsSmall) {

		this.screenIsSmall = screenIsSmall;

		// update continents
		let w = this.sectionContainer.offsetWidth,
			h = this.sectionContainer.offsetHeight,
			continentGeom;

		continentGeom = this.defineContinentGeom(w, h);

		continents.forEach((c) => c.onResize(continentGeom, this.screenIsSmall));

		// update label positions
		let labels = this.labelContainer.selectAll('.emotion-label')
			.data(continents, d => d.id);

		// we're not adding anything, so skip right to update
		// TODO: positioning not right
		labels
			.style('left', d => Math.round(centerX + d.x - d.size) + 'px')
			.style('top', d => Math.round(centerY + d.y - 17) + 'px');

	},

	setActive: function (val) {

		let section = this;
		this.isActive = val;


		// handle background click for deselection
		d3.select('#calm').on('click', val ? this.onBackgroundClick : null, false);

		// hide emotion menu on calm, show again when you leave
		d3.select('.emotion-menu').classed("hidden", val);

		// reset continents
		if(!val){
			continents.forEach(function (continent, i) {
				continent.d3Selection
					.style("opacity", 1.0).style("display", "block");
			});
		}

	},

	calcPercentElapsed: function (fc, start, duration) {
		let val = (fc - start) / duration;
		if (val > 0 && val < 1) {
			return (fc - start) / duration;
		} else {
			return 0;
		}
	},

	spawnNew: function (currentState, i) {
		currentState.activeEmotion[i] = 1;
		currentState.start[i] = frameCount;
		// duration ranging uniformally from durationBase to durationBase + durationSpread
		currentState.duration[i] = currentState.durationBase * Math.random() + currentState.durationSpread;
	},

	update: function (time) {

		let updateState = {
			time: time,
			someContinentIsHighlighted: false
		};

		let currentState = this.opacityState;

		// update opacity if
		for (var i = 0; i < 5; i++) {
			// for the inactive emotions, give them an .0005 chance of spawning
			if (currentState.activeEmotion[i] == 0 && currentState.lastEmotion != i) {
				let numActive = d3.sum(currentState.activeEmotion);
				// never more than `maxNumVisible`, and never less than 1 active
				let rand = Math.random();
				if ((rand < .0015 && numActive < currentState.maxNumVisible - 1) || (rand < .0001 && numActive < currentState.maxNumVisible) || numActive == 0) {
					this.spawnNew(currentState, i);
				}
			}

			// if current cycle just ended, reset
			if (currentState.activeEmotion[i] == 1 && currentState.start[i] + currentState.duration[i] < frameCount) {
				currentState.activeEmotion[i] = 0;
				currentState.opacity[i] = 0;
				currentState.lastEmotion = i;
			};

			// define opacity based on frame count, start, and duration
			if (currentState.activeEmotion[i] != 0) {
				currentState.opacity[i] = this.elapsedToOpacity(this.calcPercentElapsed(frameCount, currentState.start[i], currentState.duration[i]));
				continents[i].update(updateState, frameCount);
			}
		};


		continents.forEach(function (continent, i) {
			continent.d3Selection
				.style("opacity", currentState.opacity[i])

				// only show continent if it's visible
				.style("display", () => currentState.opacity[i] == 0 ? "none" : "block");
		});

		frameCount++;
		if (this.isActive) {
			window.requestAnimationFrame(this.update);
		}

	},

	onBackgroundClick: function(e) {
		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		continents.forEach(c => {
			c.highlightLevel = Continent.HIGHLIGHT_LEVELS.NONE;
		});

		dispatcher.popupChange();
	},

	onPopupCloseButtonClicked: function() {
		this.onBackgroundClick();
	},

	openCallout: function (delay) {

		if (!this.calloutTimeout) {
			this.calloutTimeout = setTimeout(() => {
				this.setCallout();
				this.calloutTimeout = null;
			}, delay);
		}

	},

	setCallout: function () {

		dispatcher.changeCallout(null, appStrings().getStr('emotionsData.metadata.calm.header'), appStrings().getStr('emotionsData.metadata.calm.body'));

	}

};
