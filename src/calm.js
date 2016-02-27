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

const PATH_STRINGS = [
		"M-14,267c0,0-11.8,123.8,39,198c37,54,99.6,118,170,116c71-2,131-77,159-119c28.3-42.4,92-121,188-125c96.9-4,145,23,192,79s52,149,42,211s-39,152-19,224c25.1,90.5,92,131,199,137c94,5.3,199.6-38.6,229-141c37-129-23-208-61-288s-22.4-190.6,15-258c35-63,87-123,202-125c94.2-1.6,173,67,189,124s56,149,86,178",
		"M-22,345c45.6,106.3,143.1,289.4,284.6,216.1c85.7-44.4,104-155,192-197.2c89.6-43,204.2-13.1,277.5,47.8c70.5,58.6,133.2,98.6,230.6,70.8c113-32.3,144.9-129.4,202.5-217.3c108.5-166,372.7-75.8,404.7,105.8",
		"M-41,835c59.5-136.7,183.5-280.9,340.9-189.9c81.4,47,134.7,156.1,233.1,172.1c92.8,15,180.1-70.7,223.9-142.2C800.4,604,840,535.1,931.2,524.8c88.1-10,166.5,23.8,224,89c56.6,64.3,95.5,126.1,186.9,134.8c80.4,7.7,189.7-25.4,235.9-96.6",
		"M-54,782c129.5-140.2,322.7-175.4,479-60c69.6,51.4,139.3,80.6,224.2,41c88.9-41.5,138.8-126.2,133.5-222.2c-5.3-95.3-70.6-177.1-69.7-271.2c0.8-81.2,63.4-155.3,141.5-174.4c82.1-20.2,179.3,4.3,219.9,82.1c48.4,92.5,11.9,195.6,22.7,294.7c10.7,99,52.3,195.6,135,253.7c99.6,70.1,238.3,64.2,332-15.7",
		"M317,1175c93.4-32.5,174.6-114.5,193.5-213.3c21.1-110.9-47.6-180.1-115.8-255.7c-74.5-82.6-100.1-202.3-23.9-294.6c66.1-80,181.8-103.1,274.1-57.9c97.8,47.8,160.9,145.6,282.3,133.1c131.4-13.5,162.7-105.5,225.4-200.2c57.3-86.8,171-132.7,270-87.4c81.1,37.1,85.7,139.5,156.4,186"
	],
	PATH_SOURCE_WIDTH = 1540,
	PATH_SOURCE_HEIGHT = 1157,
	MIN_PATH_SPAWN_DELAY = 120,
	PATH_SPAWN_FREQ = 0.01,
	PATH_LIFETIME_BASE = 8000,
	PATH_LIFETIME_SPREAD = 4000,
	PATH_LENGTH_BASE = 0.25,
	PATH_LENGTH_SPREAD = 0.5,
	PATH_WIDTH_BASE = 10,
	PATH_WIDTH_SPREAD = 20,
	PATH_OPACITY_BASE = 0.25,
	PATH_OPACITY_SPREAD = 0.3;

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

		// left-to-right
		let transforms = [
			{
				x: -0.37 * w,
				y: 0.27 * h,
				size: 0.12 * h
			},
			{
				x: -0.19 * w,
				y: -0.02 * h,
				size: 0.12 * h
			},
			{
				x: 0.04 * w,
				y: -0.26 * h,
				size: 0.12 * h
			},
			{
				x: 0.08 * w,
				y: 0.15 * h,
				size: 0.12 * h
			},
			{
				x: 0.32 * w,
				y: -0.11 * h,
				size: 0.12 * h
			}
		];

		// map each emotion to a Continent instance
		continents = _.values(dispatcher.EMOTIONS).map(emotion => new Continent(emotion, continentContainer, continentGeom, transforms));

		paths = PATH_STRINGS.map((p, i) => ({
			lastSpawnTime: -MIN_PATH_SPAWN_DELAY,
			spawnFreq: PATH_SPAWN_FREQ,
			pathStr: PATH_STRINGS[i],
			maxCount: 3,
			elements: []
		}));

		pathsContainer = continentContainer.append('g')
			.classed('calm-paths', true)
			.attr('transform', 'scale(' + w/PATH_SOURCE_WIDTH + ',' + h/PATH_SOURCE_HEIGHT + ')');

		// Bind event handlers to current scope
		this.onContinentMouseEnter = this.onContinentMouseEnter.bind(this);
		this.onContinentMouseLeave = this.onContinentMouseLeave.bind(this);
		this.onContinentMouseUp = this.onContinentMouseUp.bind(this);

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

		let updateState = {
			time: time,
			someContinentIsHighlighted: false
		};

		continents.forEach(continent => continent.update(updateState, frameCount));

		this.spawnPaths();

		frameCount++;
		if (this.isActive) {
			window.requestAnimationFrame(this.update);
		}

	},

	spawnPaths: function () {

		paths.forEach((p, i) => {

			if (frameCount - p.lastSpawnTime < MIN_PATH_SPAWN_DELAY) { return; }
			if (p.elements.length >= p.maxCount) { return; }
			if (Math.random() > p.spawnFreq) { return; }

			this.spawnPath(i);

		});

	},

	spawnPath: function (pathIndex) {

		let pathState = paths[pathIndex],
			strokeColor = '#191919',
			strokeWidth = PATH_WIDTH_BASE + Math.random() * PATH_WIDTH_SPREAD,
			strokeOpacity = PATH_OPACITY_BASE + Math.random() * PATH_OPACITY_SPREAD,
			pathLength = PATH_LENGTH_BASE + Math.random() * PATH_LENGTH_SPREAD,
			path = pathsContainer.append('path')
				.attr('d', pathState.pathStr)
				.attr('stroke', strokeColor)
				.attr('stroke-width', strokeWidth)
				.attr('stroke-opacity', strokeOpacity)
				.attr('stroke-linecap', 'round')
				.attr('atlas:pathlen', pathLength);

		// start as all gap, no dash
		path.attr('stroke-dasharray', '0 '+ path.node().getTotalLength());

		// animate path by interpolating stroke-dasharray
		// from http://bl.ocks.org/mbostock/5649592
		let duration = PATH_LIFETIME_BASE + Math.random() * PATH_LIFETIME_SPREAD;
		path.transition()
			.duration(pathLength / (1 + pathLength) * duration)
			// .duration(duration)
			.ease('linear')
			.attrTween('stroke-dasharray', this.tweenPathIn)
			.each('end', function () {
				let l = this.getTotalLength();
				d3.select(this)
					.attr('stroke-dasharray', '0 0 '+ pathLength * l, '0 '+ l +' '+ pathLength * l);
			})
		.transition()
			.duration((1 - pathLength / (1 + pathLength)) * duration)
			.ease('linear')
			.attrTween('stroke-dasharray', this.tweenPathOut)
			.each('end', function () {
				d3.select(this).remove();
				pathState.elements.splice(pathState.elements.indexOf(this), 1);
			});

		pathState.lastSpawnTime = frameCount;
		pathState.elements.push(path.node());

	},

	tweenPathIn: function () {

		// `this` is the SVG path being tweened in spawnPath()
		let l = this.getTotalLength(),
			pl = parseFloat(this.getAttribute('pathlen')),
			interpolator = d3.interpolateString('0 '+ l, pl * l +' '+ l);

		return t => interpolator(t);

	},

	tweenPathOut: function () {

		// `this` is the SVG path being tweened in spawnPath()
		let l = this.getTotalLength(),
			pl = parseFloat(this.getAttribute('pathlen')),
			interpolator = d3.interpolateString('0 0 '+ pl * l, '0 '+ l +' 0');

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

	onContinentMouseUp: function (continent) {

		console.log('TODO: implement "START AGAIN" popup when popups are implemented');

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
