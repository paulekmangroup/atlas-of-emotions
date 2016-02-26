import d3 from 'd3';
import _ from 'lodash';

import Continent from './Continent.js';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';

let continents,
	continentContainer,
	centerX, centerY,
	frameCount = 0;

export default {

	isInited: false,
	isActive: false,

	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.update = this.update.bind(this);

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

		let transforms = [
			{
				x: -0.37 * w,
				y: 0.27 * h,
				size: 0.18 * h
			},
			{
				x: -0.19 * w,
				y: -0.05 * h,
				size: 0.18 * h
			},
			{
				x: 0.05 * w,
				y: -0.32 * h,
				size: 0.18 * h
			},
			{
				x: 0.08 * w,
				y: 0.14 * h,
				size: 0.18 * h
			},
			{
				x: 0.32 * w,
				y: -0.16 * h,
				size: 0.18 * h
			}
		];

		// map each emotion to a Continent instance
		continents = _.values(dispatcher.EMOTIONS).map(emotion => new Continent(emotion, continentContainer, continentGeom, transforms));

		this.isInited = true;

	},

	setEmotion: function (emotion) {

		return new Promise((resolve, reject) => {

			// leave a bit of time for other transitions to happen
			this.openCallout(500);

			// TODO: resolve after any intro animations
			setTimeout(() => {
				resolve();
			}, 500);

		});

	},

	open: function () {

		this.setActive(true);

		// transition time from _states.scss::#states
		this.openCallout(1500);

		this.update();

	},

	close: function () {

		return new Promise((resolve, reject) => {

			// tuen off updates
			this.setActive(false);

			resolve();

		});

	},

	setActive: function (val) {

		this.isActive = val;

	},

	update: function (time) {

		let updateState = {
			time: time,
			someContinentIsHighlighted: false
		};

		continents.forEach(continent => continent.update(updateState, frameCount));

		frameCount++;
		if (this.isActive) {
			window.requestAnimationFrame(this.update);
		}

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

		dispatcher.changeCallout(null, emotionsData.metadata.calm.header, emotionsData.metadata.calm.body);

	}

};
