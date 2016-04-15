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
