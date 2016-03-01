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
		"M-4.5,411c-8.6,91,46.9,170.4,135.7,192.8c98.7,24.9,179.3-26,240.4-99.1C440,422.8,501,348.5,619.2,363.8     c108,14,176.6,104.5,185.4,209.3c9,107.2-48.7,222.6-4.5,326.5c46.5,109.4,189.6,137.3,291.4,95.2     c102.7-42.5,118.7-157.7,108.1-257.3C1186.6,617,1099.8,513.4,1130,388c31.5-130.9,166.5-216.5,297.9-177.6     c126.4,37.5,192.3,171.6,213.7,292.6",
		"M-19,377.5C-33.7,468,22,560.2,104.4,597.2c91.2,41,180.1,2.3,236.7-74c54.3-73.3,97.5-141.5,198-146.7     c120.3-6.3,180,75,276.5,124.3c90.5,46.3,196.5,17,261-59.2c53.1-62.6,76.2-152.9,146.6-199.9c130.5-86.9,323.8,14,349.8,161.8",
		"M-49,914C5.1,789.7,110.8,597.5,276.9,647.9c85.3,25.9,137,110.7,225.5,130.3     c98.2,21.8,181.9-30.1,242.4-102.8c59.1-71,110.5-138.8,210.6-146c105.9-7.7,168,58.4,247.3,114.4c70.3,49.7,158.4,66,240.3,33.1     c67.1-27,102.9-86.2,139.1-145",
		"M-63,798c129.5-140.2,322.7-175.4,479-60c69.6,51.4,139.3,80.6,224.2,41c88.9-41.5,138.8-126.2,133.5-222.2     c-5.3-95.3-70.6-177.1-69.7-271.2c0.8-81.2,63.4-155.3,141.5-174.4c82.1-20.2,179.3,4.3,219.9,82.1     c48.4,92.5,11.9,195.6,22.7,294.7c10.7,99,52.3,195.6,135,253.7c99.6,70.1,238.3,64.2,332-15.7",
		"M293,1197c93.4-32.5,174.6-114.5,193.5-213.3c21.1-110.9-47.6-180.1-115.8-255.7     c-74.5-82.6-100.1-202.3-23.9-294.6c66.1-80,181.8-103.1,274.1-57.9c97.8,47.8,160.9,145.6,282.3,133.1     c131.4-13.5,162.7-105.5,225.4-200.2c57.3-86.8,171-132.7,270-87.4c81.1,37.1,120.7,138.5,191.4,185",
		"M339.5,1196c127.7-74.3,261.1-225.6,151.6-372.5c-52.8-70.8-123.8-122.3-149.2-210.7     c-18.1-63-13.1-133.3,30.1-185.2c145.6-174.8,417-57.1,411.2,159.7c-2.7,100.8-54.9,221.4,11.5,312.2     c61.9,84.6,189.9,110.9,281.6,62.9c83.9-43.9,98.6-151.6,175-207.5c88.6-64.7,207-53.2,308.1-30.9",
		"M225,1180C32.9,1145.6-51.7,928.8,63.1,767c69.4-97.7,202.9-122.3,305.1-62.8     c99,57.6,199.6,137.9,313.7,51.6C774.2,685.9,814,540.4,762,437c-59.3-118-104-269.3,55.6-330.3c80-30.6,189.7-24,248.4,45.3     c76.4,90.1,14.8,219.4,28.6,324.6c19.6,149.7,160.7,288,318.1,272.1c92.6-9.3,176.9-72.6,231.3-145.7",
		"M-22,543c42.4,40.5,98,71.3,155.9,81.4c47.8,8.4,95.8-3.8,143.5,7.5c38.1,9,70.8,28.5,102.5,50.8     c54.1,38.1,101,74.5,168.8,84.7c114.1,17.3,177.3-49.9,254.4-121.7c58.5-54.5,130.4-103.9,213.2-77     c79.8,25.9,136.9,80.7,223.9,94.1c123,19,298.5-25,336.8-161.8",
		"M199,1188c-15,0-48.5-47.8-56.8-57.7c-34.6-41.2-65.6-88.3-81.7-140.1c-41.1-132.1,53.5-260.7,182.9-294.7     c168-44.2,279.6,197.2,442.8,88.5c127-84.6,120.1-238.8,67.8-363.4c-42.4-101-46.6-241,59.7-307.2     c59.7-37.2,173.6-35.1,232.7,8.5c78.3,57.7,73.2,188,71,273.1c-2.9,111.5-43.9,254,42.2,346c101.2,108.1,298.3,72.7,423.4,32",
		"M295,1185c58.3-15.4,117.4-44.2,160.1-87.3c96.7-97.6,47.6-227.9-20.7-327.4c-74.2-108.2-138-235-36-353.1     C503.9,295,696,335.9,751.1,485.7c49.3,134.1-83,290.3,4.4,417.9c71.9,105,255,148.1,349.4,52.6c44.4-45,69.5-109.8,73.9-172.3     c4.9-70-27.3-116.3-47.6-178.7c-29.7-91-14.8-210.7,41.6-288.7C1304.5,134.4,1591.6,296,1580,496"
	],
	PATH_SOURCE_WIDTH = 1540,
	PATH_SOURCE_HEIGHT = 1157,
	MIN_PATH_SPAWN_DELAY = 180,
	PATH_SPAWN_FREQ = 0.0018,
	PATH_LIFETIME_BASE = 14000,
	PATH_LIFETIME_SPREAD = 6000,
	PATH_LENGTH_BASE = 0.25,
	PATH_LENGTH_SPREAD = 0.5,
	PATH_WIDTH_BASE = 10,
	PATH_WIDTH_SPREAD = 20,
	PATH_OPACITY_BASE = 0.15,
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

		let visitAnnex = d3.select(this.sectionContainer).append('div')
			.classed('visit-annex', true);
		visitAnnex.append('h3')
			.text(emotionsData.metadata.calm.secondary.header.toUpperCase());
		visitAnnex.append('p')
			.text(emotionsData.metadata.calm.secondary.body);
		visitAnnex.on('click', event => {
			let moreInfoMenu = document.querySelector('#more-info .dropup');
			if (moreInfoMenu) {
				moreInfoMenu.classList.add('open');
			}
		});

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
				// this string matches the first one given in tweenPathOut
				// needs six parameters so as not to overlap when pathLength < .5 and show a dot for 0
				d3.select(this)
					.attr('stroke-dasharray', '0 0 '+ pathLength * l + ' 0 0 ' + l);
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

		// `this` is the SVG path being tweened in spawnPath(), pl is % of total length
		let l = this.getTotalLength(),
			pl = parseFloat(this.getAttribute('pathlen')),
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
