import d3 from 'd3';
import _ from 'lodash';

import Continent from './Continent.js';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';

let continents,
	continentContainer,
	pathsContainer,
	centerX, centerY,
	frameCount = 0,
	paths = [];

//const PATH_STRINGS = ["M458.9,251.3l2.3-1l2.3-0.9c1.5-0.6,3-1.2,4.6-1.8c3.1-1,6.2-2.2,9.4-3c-3.4,0.8-6.7,2-10,3.1c-3.3,1.2-6.6,2.4-9.8,3.9c-3.3,1.4-6.4,3-9.5,4.6l-4.6,2.6c-1.6,0.8-3,1.8-4.5,2.8c-12,7.5-22.9,17-32.2,27.9c-4.6,5.5-8.9,11.2-12.7,17.3c-3.7,6.1-7.1,12.5-9.9,19.1c-2.8,6.6-5.1,13.4-6.9,20.4c-1.8,7-3,14-3.8,21.1c-0.7,7.1-0.9,14.3-0.6,21.4c0.4,7.1,1.2,14.2,2.5,21.2c1.4,7,3.2,13.8,5.5,20.5c2.4,6.6,5.2,13.1,8.4,19.3c3.3,6.2,7,12.1,11,17.8c4.1,5.6,8.5,10.9,13.3,15.9c4.8,4.9,9.9,9.6,15.2,13.8c1.3,1.1,2.7,2,4.1,3.1l2,1.5c0.7,0.5,1.4,1,2.1,1.4c1.4,0.9,2.8,1.9,4.2,2.8c1.4,0.9,2.9,1.7,4.3,2.6c1.4,0.9,3.2,2,5.3,3.1c2,1.2,4.3,2.3,6.5,3.5c2.2,1.2,4.6,2.2,6.7,3.2c2.1,1,4.1,1.7,5.7,2.4c3.2,1.2,6.5,2.1,9.9,3.1c3.4,0.8,6.8,1.8,10.4,2.4c1.8,0.3,3.5,0.7,5.3,0.9c1.8,0.2,3.6,0.5,5.4,0.7c1.8,0.2,3.7,0.3,5.5,0.5c0.9,0.1,1.8,0.1,2.8,0.2c0.9,0,1.9,0.1,2.8,0.1c7.4,0.3,15,0,22.6-0.9c1.9-0.3,3.8-0.4,5.7-0.8c1.9-0.3,3.8-0.7,5.7-1c3.7-0.8,7.5-1.6,11.2-2.7c7.4-2.1,14.6-4.8,21.5-8c6.9-3.3,13.5-6.9,19.7-11.2c6.2-4.2,11.9-8.8,17.2-13.6c5.2-4.9,10-10,14.3-15.3c8.5-10.6,13.7-21.5,16.6-29.4c0.8-2,1.3-3.8,1.8-5.4c0.5-1.6,0.9-2.9,1.1-4.1c0.5-2.3,0.7-3.5,0.7-3.5c0.2-0.8,0.4-1.6,0.6-2.4c0.2-0.8,0.3-1.6,0.4-2.3c0.2-1.4,0.4-2.7,0.4-3.5c0-1.7-0.5-1.8-1.8,1.1c-1.1,3.1-2.7,7.2-4.7,11.6c-1,2.2-2.1,4.5-3.3,6.7c-0.6,1.1-1.2,2.2-1.8,3.3c-0.6,1.1-1.3,2.1-1.9,3.2c-5,8.3-10.2,14.5-10.7,14.1c-0.1-0.1,0.8-1.4,2.1-3.4c0.7-1,1.5-2.1,2.3-3.4c0.8-1.3,1.7-2.6,2.5-3.9c-0.3-0.2,0-1.4,0.5-3.3c0.5-1.9,1.5-4.3,2.3-6.9c0.4-1.3,0.9-2.7,1.4-4c0.4-1.4,0.8-2.7,1.2-3.9c0.9-2.5,1.5-4.7,2.1-6.2c0.5-1.5,1.4-4.9,2.4-9.2c0.4-2.2,1-4.6,1.5-7.1c0.4-2.5,0.9-5.2,1.2-7.8c0.2-1.3,0.3-2.7,0.5-4c0.1-1.3,0.2-2.6,0.3-3.9c0.1-1.3,0.2-2.5,0.2-3.7c0-1.2,0-2.4,0-3.4c0-1.1,0-2.1,0-3.1c0-1-0.1-1.8-0.1-2.6c-0.1-1.6-0.2-2.8-0.2-3.6c-0.3-4.6-0.8-4.6-1.4-1.6c-0.7,3-1.5,8.7-3,15.5c-1.5,6.9-3.8,14.8-6.7,22.1c-2.9,7.3-6.3,14-9.1,19c-2.9,4.9-3.4,4.7-3,3.2c0.2-1.5,1.1-4.2,0.6-4.4c-0.6,1.3-1.2,2.4-1.7,3.5c-0.6,1.1-1.2,2.1-1.8,3.1c-1.1,2-2.4,3.7-3.6,5.4c-2.4,3.4-5,6.7-8.4,11.1c0,0-0.4,0.3-1.1,1c-0.6,0.7-1.6,1.7-2.7,2.9c-1.2,1.2-2.6,2.6-4.2,4.2c-0.8,0.8-1.7,1.6-2.6,2.4c-0.4,0.4-0.9,0.8-1.4,1.3c-0.5,0.4-1,0.8-1.5,1.2c-1,0.8-2,1.7-3,2.6c-1.1,0.8-2.2,1.7-3.3,2.5c-1.1,0.9-2.2,1.6-3.4,2.4c-1.1,0.8-2.2,1.6-3.4,2.3c-1.2,0.7-2.3,1.4-3.4,2.2c-1.1,0.7-2.3,1.3-3.3,1.9c-2.1,1.3-4.2,2.3-6.1,3.2c0,0-1.2,0.8-4.3,2.2c-0.8,0.4-1.7,0.8-2.7,1.3c-1.1,0.4-2.2,0.9-3.6,1.5c-1.3,0.6-2.8,1.1-4.5,1.6c-0.8,0.3-1.7,0.6-2.6,0.9c-0.9,0.3-1.9,0.5-2.9,0.8c-1.3,0.4-2.3,0.7-3.1,0.9c-0.8,0.2-1.2,0.4-1.6,0.5c-0.6,0.3-0.6,0.4-0.6,0.6c-0.1-0.3-0.1-0.3-0.2-0.7c-2.6,1-6.7,1.8-10.9,2.3c-4.1,0.6-8.3,0.7-11.1,1.1c0-0.3,0-0.3,0-0.7c-2.8,0.2-5.5,0.5-8.3,0.4c-1.4,0-2.8,0-4.2-0.1l-4.1-0.3c-5.5-0.6-11-1.5-16.4-2.6c0.1-0.3,0.1-0.3,0.2-0.7c-2.7-0.6-5.3-1.4-7.3-2c-2-0.6-3.2-1.2-3.2-1.3c0.1-0.3,0.1-0.3,0.2-0.6c-2.6-1-6.4-2.4-9.6-3.7c-1.6-0.7-3-1.3-4-1.8c-1-0.5-1.5-0.9-1.5-1.1c-0.2,0.3-0.2,0.3-0.3,0.6c-1.2-0.6-2.4-1.2-3.6-1.8c-1.2-0.7-2.3-1.3-3.4-2c-0.6-0.3-1.1-0.6-1.7-1c-0.5-0.3-1.1-0.7-1.6-1c-1.1-0.7-2.1-1.4-3.1-2c-4-2.8-7.7-5.6-11-8.6c-6.7-5.9-12.1-12.1-16.9-18.7c-3.1-4.5-6.1-9.2-8.8-14.3c-2.6-5.1-5.1-10.4-7.1-16.1c-2-5.6-3.6-11.5-4.9-17.5c-1.2-6-1.9-12.2-2.2-18.5c0-1.6-0.1-3.1-0.1-4.7c0-1.6,0.1-3.1,0.1-4.7c0-1.6,0.2-3.1,0.3-4.7l0.2-2.4c0.1-0.8,0.2-1.6,0.3-2.4c0.2-1.6,0.3-3.1,0.6-4.7l0.8-4.7c0.7-3.1,1.3-6.2,2.2-9.2c1.7-6.1,3.8-12,6.4-17.7c2.6-5.7,5.7-11.1,9.1-16.2c1.6-2.2,3-4.6,3.7-5.8c0.6-1.2,0.4-1.5-1.6,0.5c3.3-4.4,7-8.5,10.9-12.5c2-1.9,3.2-3.1,4-4c0.8-0.9,1.3-1.4,1.7-2c0.4-0.5,0.9-1.1,1.7-2c0.9-0.9,2.2-2,4.4-3.7c8.8-6.8,18.5-12.5,28.9-16.6l1.9-0.8c0.7-0.2,1.3-0.5,2-0.7l4-1.4c2.7-0.8,5.3-1.6,8.1-2.2c5.4-1.4,11-2.2,16.5-2.8c22.3-2.2,45.2,2.1,65.2,12.1l3.7,1.9l3.6,2.1c1.2,0.7,2.4,1.4,3.6,2.2c1.2,0.8,2.4,1.5,3.5,2.3c4.6,3.2,9,6.7,13.1,10.4c4.1,3.8,8,7.9,11.6,12.2c3.5,4.4,6.9,8.8,9.8,13.6c2.9,4.8,5.6,9.7,7.8,14.8l0.9,1.9l0.8,1.9c0.5,1.3,1.1,2.6,1.5,3.9c0.9,2.6,1.9,5.3,2.6,8c3.2,10.7,4.7,21.9,4.9,33.2c0.1-11.2-1-21.1-3.3-30.7c-1.2-4.8-2.6-9.5-4.5-14.3c-1.8-4.8-4.1-9.5-6.9-14.4c0.3-0.2,0.9-0.5-2-5.4c-4.4-7.3-9.9-14.4-16-20.7c-6.1-6.4-12.8-12-19.6-16.6c-6.8-4.6-13.5-8.2-19.6-11c-1.5-0.8-3-1.3-4.4-1.9c-1.4-0.6-2.8-1.2-4.1-1.7c-1.3-0.5-2.5-1-3.7-1.5c-1.2-0.4-2.3-0.8-3.3-1.2c-2.7-1-5.4-2-9.6-3.2c-1.1-0.3-2.2-0.5-3.4-0.8c-0.6-0.1-1.3-0.3-2-0.4c-0.7-0.1-1.4-0.2-2.2-0.4c-1.5-0.2-3.2-0.6-5-0.7c-1.8-0.2-3.8-0.4-6-0.5c5.8,0.4,11.6,0.9,17.3,2c0.1-0.3,0.2-1,0.2-1c-11.4-2.4-24.8-3.2-37.9-1.8c-6.6,0.6-13.1,1.9-19.3,3.5c-6.2,1.6-12.1,3.7-17.6,6c0,0-0.3-0.6-0.4-0.9c0,0-0.7,0.3-1.7,0.8c-1,0.5-2.4,1.1-3.7,1.8c-1.3,0.7-2.6,1.4-3.6,1.9c-1,0.5-1.6,0.9-1.6,0.9c-1.4,0.5-1.8,0.4-1.3-0.1c0.5-0.5,1.9-1.6,4-2.8c4.2-2.6,11.5-6.2,20.5-9.2c8.9-3,19.6-5.1,29.8-5.9c10.3-0.8,20.1-0.3,27.6,0.7c0-0.3,0.1-1,0.2-1.4c0,0-0.8-0.1-1.9-0.2c-1.1-0.1-2.7-0.4-4.2-0.5c-1.5-0.1-3.1-0.2-4.2-0.3c-1.1-0.1-1.9-0.1-1.9-0.1l0-0.7c18.4,0.9,35.1,5.3,50.4,12.4c15.3,7.2,29.3,17.2,41.8,30.8c-1.1-1.1-2.4-2.5-3.8-4c-1.5-1.5-3.2-3.1-4.8-4.7c-1.7-1.5-3.5-3-5.1-4.4c-1.7-1.3-3.2-2.5-4.4-3.4c0.1-0.1,0.2-0.3-0.3-0.8c-0.6-0.5-1.8-1.5-4.3-3.3c5.1,3.5,10.2,7.6,15.2,12.2c5,4.6,9.6,9.7,14,15.2c2.2,2.7,4.2,5.5,6.2,8.4c0.9,1.4,1.9,2.9,2.8,4.3c1,1.4,1.7,2.9,2.6,4.4c3.4,5.8,6.3,11.7,8.7,17.5c1.3,2.8,1.6,2.7,0.8-0.3c-0.4-1.5-1.1-3.8-2.3-6.7c-1.1-2.9-2.7-6.5-4.9-10.7c-4.6-8.2-9.2-14.6-14.2-20.7c-5-6-10.5-11.7-17.7-17.7l0.4-0.5c4.9,4,10.5,9.5,15.6,15.5c5.1,6,9.8,12.3,13.2,17.6c1.8,2.6,0.4-0.2-1.1-3c-0.4-0.7-0.7-1.4-1.1-2c-0.4-0.6-0.6-1.1-0.8-1.5c-0.4-0.7-0.3-0.8,0.7,0.5c0.9,1.3,1.7,2.7,2.6,4c0.9,1.3,1.7,2.7,2.5,4.1l2.5,4.1c0.8,1.4,1.6,2.8,2.4,4.2c-4.3-8.6-10.3-18.1-17.5-26.6c-7.2-8.5-15.4-16.2-22.9-22.1c-1.2-1-2.5-2-3.6-3c-1.2-0.9-2.2-1.8-3.2-2.6c-1.9-1.5-3.1-2.6-2.9-2.9c-6.9-4.2-13.8-7.6-20.4-10.4c-1.7-0.7-3.3-1.4-5-2c-1.7-0.6-3.3-1.2-4.9-1.8c-1.6-0.6-3.2-1.1-4.8-1.6c-1.6-0.5-3.1-1-4.7-1.4c-12.5-3.5-23.8-5.2-33.6-6.1c-0.8-0.1-2-0.1-3.6-0.1c-1.6,0-3.5-0.1-5.6,0.1c-4.3,0.2-9.6,0.7-15.3,1.7c-1.4,0.3-2.9,0.5-4.3,0.8c-1.4,0.3-2.9,0.7-4.4,1l-2.2,0.5l-2.2,0.6c-1.4,0.4-2.9,0.8-4.3,1.2c-1.4,0.4-2.8,0.9-4.2,1.4c-1.4,0.5-2.7,0.9-4,1.4C463.6,249.4,461.1,250.3,458.9,251.3z"],
const PATH_STRINGS = [],
	PATH_SOURCE_WIDTH = 1540,
	PATH_SOURCE_HEIGHT = 1157,
	MAX_NUM_PER_PATH = 3,
	MIN_PATH_SPAWN_DELAY = 180,
	PATH_SPAWN_FREQ = 0.0018,
	PATH_LIFETIME_BASE = 14000,
	PATH_LIFETIME_SPREAD = 6000,
	PATH_LENGTH_BASE = 0.25,
	PATH_LENGTH_SPREAD = 0.5,
	PATH_WIDTH_BASE = 20,
	PATH_WIDTH_SPREAD = 20,
	PATH_GREY_BASE = 30,
	PATH_GREY_SPREAD = 120,
	PATH_GRADIENTS_ENABLED = true,
	PATH_OPACITY_BASE = PATH_GRADIENTS_ENABLED ? 0.5 : 0.3,
	PATH_OPACITY_SPREAD = 0.3,
	PATH_MAX_ROTATE_OFFSET = 0.5,
	PATH_MAX_TRANSLATE_OFFSET = 5;

export default {

	isInited: false,
	isActive: false,

	init: function (containerNode) {

		this.sectionContainer = containerNode;

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
			start: [700,100,500,200,20],
			duration: [300,400,150,600,400],
			opacity: [0,0,0,0,0]
		};

		this.elapsedToOpacity = d3.scale.linear().domain([0,.2,.5,1]).range([0,1,1,0]);

		continentGeom = this.defineContinentGeom(w,h);

		// left-to-right
		let continentTransforms = [
			{
				x: -0.37,
				y: 0.17,
				size: 0.12
			},
			{
				x: -0.19,
				y: -0.02,
				size: 0.12
			},
			{
				x: 0.04,
				y: -0.26,
				size: 0.12
			},
			{
				x: 0.08,
				y: 0.15,
				size: 0.12
			},
			{
				x: 0.32,
				y: -0.11,
				size: 0.12
			}
		];

		// map each emotion to a Continent instance
		continents = _.values(dispatcher.EMOTIONS).map(emotion => new Continent(emotion, continentContainer, continentGeom, continentTransforms));

		paths = PATH_STRINGS.map((p, i) => ({
			lastSpawnTime: -MIN_PATH_SPAWN_DELAY,
			spawnFreq: PATH_SPAWN_FREQ,
			pathStr: PATH_STRINGS[i],
			maxCount: MAX_NUM_PER_PATH,
			elements: []
		}));

		pathsContainer = continentContainer.append('g')
			.classed('calm-paths', true)
			.attr('transform', 'scale(' + w/PATH_SOURCE_WIDTH + ',' + h/PATH_SOURCE_HEIGHT + ')');

		let visitAnnex = d3.select(this.sectionContainer).append('div')
			.classed('visit-annex', true);
		visitAnnex.append('h4')
			.text(emotionsData.metadata.calm.secondary.header.toUpperCase());
		visitAnnex.on('click', event => {
			dispatcher.navigate(dispatcher.SECTIONS.MORE, null, 'annex');
		});

		this.initLabels(this.labelContainer);

		// Bind event handlers to current scope
		this.onContinentMouseEnter = this.onContinentMouseEnter.bind(this);
		this.onContinentMouseLeave = this.onContinentMouseLeave.bind(this);
		this.onContinentMouseClick = this.onContinentMouseClick.bind(this);

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
				.attr('data-popuptarget', d => `calm:${d.id}`)
				.attr('data-clip', '1')
				.style('left', d => Math.round(centerX + d.x - d.size) + 'px')
				.style('top', d => Math.round(centerY + d.y - 17) + 'px');

			labelsEnter.append('a')
				.attr('href', d => `#continents:${d.id}`)
				.append('h3')
					.text('START AGAIN');
		});
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

	defineContinentGeom(w,h){
		centerX = 0.55 * w;
		centerY = 0.5 * h;

		return {
			w: Math.min(w,h),
			h: Math.min(w,h),
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
	onResize: function () {

		// update continents
		let w = this.sectionContainer.offsetWidth,
			h = this.sectionContainer.offsetHeight,
			continentGeom;

		continentGeom = this.defineContinentGeom(w,h);

		continents.forEach((c) => c.onResize(continentGeom));

		// update paths
		d3.select('.calm-paths')
			.attr('transform', 'scale(' + w/PATH_SOURCE_WIDTH + ',' + h/PATH_SOURCE_HEIGHT + ')');

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

		continents.forEach(function (continent, i) {
			continent.d3Selection
				.on('mouseenter', val ? section.onContinentMouseEnter : null)
				.on('mouseleave', val ? section.onContinentMouseLeave : null)
				.on('click', val ? section.onContinentMouseClick : null);
		});

		// handle background click for deselection
		d3.select('#calm').on('click', val ? this.onBackgroundClick : null, false);

		// hide emotion menu on calm, show again when you leave
		d3.select('.emotion-menu').classed("hidden", val);

	},

	generateNormal: function() {
		let value = ((Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random())) / 6;
		return value;
	},

	calcPercentElapsed: function(fc, start, duration) {
		let val = (fc - start) / duration;
		if (val > 0 && val < 1) {
			return (fc - start) / duration;
		} else {
			return 0;
		}
	},

	update: function (time) {

		let updateState = {
			time: time,
			someContinentIsHighlighted: false
		};

		let currentState = this.opacityState;

		// update opacity if
		for(var i = 0; i < 5; i++){
			// if current cycle is over, set a new start and duration
			if(currentState.start[i] + currentState.duration[i] < frameCount){
				currentState.start[i] = frameCount + 900 * this.generateNormal() + 100;
				currentState.duration[i] = 500 * this.generateNormal() + 100;
			};
			// define opacity based on frame count, start, and duration
			currentState.opacity[i] = this.elapsedToOpacity(this.calcPercentElapsed(frameCount, currentState.start[i], currentState.duration[i]));

			// update continent state if continent is visible
			if(currentState.opacity[i] != 0){
				continents[i].update(updateState, frameCount * 4);
			}
		};

		d3.selectAll(".continent").style("opacity", function(d,i){
			return currentState.opacity[i];
		}).style("display", function(d,i){
			// only show continent if it's visible
			if(currentState.opacity[i] == 0){
				return "none";
			} else {
				return "block";
			}
		});

		frameCount++;
		if (this.isActive) {
			window.requestAnimationFrame(this.update);
		}

	},

	spawnPaths: function (time) {
		/*
		paths.forEach((p, i) => {

			if (frameCount - p.lastSpawnTime < MIN_PATH_SPAWN_DELAY) { return; }
			if (p.elements.length >= p.maxCount) { return; }
			if (Math.random() > p.spawnFreq) { return; }

			this.spawnPath(i, time);

		});
		*/

	},

	spawnPath: function (pathIndex, time) {

		//
		// path setup
		//
		let pathState = paths[pathIndex],
			id = 'calm-'+ pathIndex +'-'+ Math.floor(time),
			strokeColor = Math.floor(PATH_GREY_BASE + Math.random() * PATH_GREY_SPREAD),
			strokeWidth = PATH_WIDTH_BASE + Math.random() * PATH_WIDTH_SPREAD,
			strokeOpacity = PATH_OPACITY_BASE + Math.random() * PATH_OPACITY_SPREAD,
			dashLength = PATH_LENGTH_BASE + Math.random() * PATH_LENGTH_SPREAD,
			rotateOffset = -PATH_MAX_ROTATE_OFFSET + 2*Math.random() * PATH_MAX_ROTATE_OFFSET,
			translateOffsetX = -PATH_MAX_TRANSLATE_OFFSET + 2*Math.random() * PATH_MAX_TRANSLATE_OFFSET,
			translateOffsetY = -PATH_MAX_TRANSLATE_OFFSET + 2*Math.random() * PATH_MAX_TRANSLATE_OFFSET,
			pathGradient,
			path = pathsContainer.append('path')
				.attr('id', id)
				.attr('d', pathState.pathStr)
				.attr('stroke', 'rgb('+ strokeColor +','+ strokeColor +','+ strokeColor +')')
				.attr('stroke-width', strokeWidth)
				.attr('stroke-opacity', strokeOpacity)
				.attr('stroke-linecap', 'round')
				.attr('transform', 'rotate('+ rotateOffset +','+ centerX +','+ centerY +'), translate('+ translateOffsetX +','+ translateOffsetY + ')')
				.attr('atlas:dashlen', dashLength);

		if (PATH_GRADIENTS_ENABLED) {
			pathGradient = pathsContainer.append('linearGradient')
				.attr('id', id + '-g')
				.attr('gradientUnits', 'userSpaceOnUse')
				.attr('x1', 0.0)
				.attr('x2', 0.0)
				.attr('y1', 0.0)
				.attr('y2', 0.0);

			pathGradient.selectAll('stop')
				.data([
					{ offset: '0%', color: 'rgba('+ strokeColor +','+ strokeColor +','+ strokeColor +',0.0)' },
					{ offset: '20%', color: 'rgba('+ strokeColor +','+ strokeColor +','+ strokeColor +','+ 0.6*strokeOpacity +')' },
					{ offset: '80%', color: 'rgba('+ strokeColor +','+ strokeColor +','+ strokeColor +','+ 0.95*strokeOpacity +')' },
					{ offset: '100%', color: 'rgba('+ strokeColor +','+ strokeColor +','+ strokeColor +','+ strokeOpacity +')' }
				])
			.enter().append('stop')
				.attr('offset', d => d.offset)
				.attr('stop-color', d => d.color);

			// apply the gradient to the path
			path.attr('stroke', 'url(#'+ id + '-g)');
		}

		//
		// path animation
		//
		let duration = PATH_LIFETIME_BASE + Math.random() * PATH_LIFETIME_SPREAD,
			pathNode = path.node(),
			pathTotalLength = pathNode.getTotalLength();

		// start as all gap, no dash
		path.attr('stroke-dasharray', '0 '+ pathTotalLength);

		// animate path by interpolating stroke-dasharray
		// from http://bl.ocks.org/mbostock/5649592
		path.transition()
			.duration(dashLength / (1 + dashLength) * duration)
			.ease('linear')
			.attrTween('stroke-dasharray', this.tweenPathIn)
			.each('end', function () {
				// this string matches the first one given in tweenPathOut
				// needs six parameters so as not to overlap when dashLength < .5 and show a dot for 0
				d3.select(this)
					.attr('stroke-dasharray', '0 0 '+ dashLength * pathTotalLength + ' 0 0 ' + pathTotalLength);
			})
		.transition()
			.duration((1 - dashLength / (1 + dashLength)) * duration)
			.ease('linear')
			.attrTween('stroke-dasharray', this.tweenPathOut)
			.each('end', function () {
				// remove after a short delay, to ensure gradient transition has finished
				setTimeout(() => {
					d3.select(this).remove();
					pathState.elements.splice(pathState.elements.indexOf(this), 1);
				}, 1);
			});

		if (PATH_GRADIENTS_ENABLED) {
			// animate gradient bounding box along with path
			pathGradient.transition()
				// from 0 dash length at start of path to full dash visible
				.duration(dashLength / (1 + dashLength) * duration)
				.ease('linear')
				.attrTween('x1', () => t => pathNode.getPointAtLength(0).x)
				.attrTween('y1', () => t => pathNode.getPointAtLength(0).y)
				.attrTween('x2', () => t => pathNode.getPointAtLength(t * dashLength*pathTotalLength).x)
				.attrTween('y2', () => t => pathNode.getPointAtLength(t * dashLength*pathTotalLength).y)
			.transition()
				// from full dash visible at start of path to full dash visible at end of path
				.duration((1 - dashLength) / (1 + dashLength) * duration)
				.ease('linear')
				.attrTween('x1', () => t => pathNode.getPointAtLength(t * (1-dashLength)*pathTotalLength).x)
				.attrTween('y1', () => t => pathNode.getPointAtLength(t * (1-dashLength)*pathTotalLength).y)
				.attrTween('x2', () => t => pathNode.getPointAtLength(dashLength*pathTotalLength + t * (1-dashLength)*pathTotalLength).x)
				.attrTween('y2', () => t => pathNode.getPointAtLength(dashLength*pathTotalLength + t * (1-dashLength)*pathTotalLength).y)
			.transition()
				// from full dash visible at end of path to 0 dash length
				.duration(dashLength / (1 + dashLength) * duration)
				.ease('linear')
				.attrTween('x1', () => t => pathNode.getPointAtLength((1-dashLength)*pathTotalLength + t * dashLength*pathTotalLength).x)
				.attrTween('y1', () => t => pathNode.getPointAtLength((1-dashLength)*pathTotalLength + t * dashLength*pathTotalLength).y)
				.attrTween('x2', () => t => pathNode.getPointAtLength(pathTotalLength).x)
				.attrTween('y2', () => t => pathNode.getPointAtLength(pathTotalLength).y)
				.each('end', function () {
					d3.select(this).remove();
				});
		}

		pathState.lastSpawnTime = frameCount;
		pathState.elements.push(pathNode);

	},

	tweenPathIn: function () {

		// `this` is the SVG path being tweened in spawnPath()
		let l = this.getTotalLength(),
			pl = parseFloat(this.getAttribute('dashlen')),
			interpolator = d3.interpolateString('0 '+ l, pl * l +' '+ l);
		return t => interpolator(t);

	},

	tweenPathOut: function () {

		// `this` is the SVG path being tweened in spawnPath(), pl is % of total length
		let l = this.getTotalLength(),
			pl = parseFloat(this.getAttribute('dashlen')),
			interpolator = d3.interpolateString('0 0 '+ pl * l + ' 0 0 ' + l, '0 ' + l + ' ' + pl * l + ' 0 0 ' + l);

		return t => interpolator(t);

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

	onContinentMouseClick: function (continent) {
		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		dispatcher.popupChange('calm', continent.id);

		this.setContinentHighlight(continent, Continent.HIGHLIGHT_LEVELS.SELECTED);
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

		dispatcher.changeCallout(null, emotionsData.metadata.calm.header, emotionsData.metadata.calm.body);

	}

};
