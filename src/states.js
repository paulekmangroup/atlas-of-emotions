import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import appStrings from '../static/appStrings.json';

const LABEL_APPEAR_DELAY = 1000;

export default {

	isInited: false,

	emotions: [
		'anger',
		'fear',
		'disgust',
		'sadness',
		'enjoyment'
	],

	sectionContainer: null,
	labelContainer: null,
	stateGraphContainer: null,
	xScale: null,
	yScale: null,

	areaGenerators: null,
	transitions: null,

	currentEmotion: null,
	currentStatesData: null,
	isBackgrounded: false,

	mouseOutTimeout: null,
	tempNav: null,
	
	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.applyTransitions = this.applyTransitions.bind(this);

		// size main container to viewport
		// let headerHeight = 55;	// from _variables.scss
		// containerNode.style.height = (window.innerHeight - headerHeight) + 'px';

		let graphContainer = document.createElement('div');
		graphContainer.id = 'state-graph-container';
		containerNode.appendChild(graphContainer);

		this.initLabels(containerNode);

		this.createTempNav(containerNode);

		// 
		// d3 conventional margins
		// 
		let margin = {
			top: 20,
			right: 20,
			bottom: 50,
			left: 20
		};

		let innerWidth = graphContainer.offsetWidth - margin.left - margin.right;
		let innerHeight = graphContainer.offsetHeight - margin.top - margin.bottom;

		let svg = d3.select(graphContainer).append('svg')
			.attr('width', graphContainer.offsetWidth)
			.attr('height', graphContainer.offsetHeight);

		this.stateGraphContainer = svg.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		// 
		// d3/svg setup
		// 
		this.xScale = d3.scale.linear()
			.domain([0, 10])
			.range([0, innerWidth]);

		this.yScale = d3.scale.linear()
			.domain([0, 10])
			.range([innerHeight, 0]);

		let xAxis = d3.svg.axis()
			.scale(this.xScale)
			.orient('bottom')
			.ticks(10)
			.tickFormat(d => '')
			.tickSize(10);

		let labelsXScale = d3.scale.ordinal()
			.domain(['LEAST INTENSE', 'MOST INTENSE'])
			.range(this.xScale.range());
		let xAxisLabels = d3.svg.axis()
			.scale(labelsXScale)
			.orient('bottom')
			.tickSize(25);

		this.setUpDefs(svg.append('defs'), this.xScale, this.yScale);

		this.areaGenerators = this.setUpAreaGenerators(innerHeight, this.xScale, this.yScale);

		this.transitions = this.setUpTransitions();

		this.onStateMouseOver = this.onStateMouseOver.bind(this);
		this.onStateMouseOut = this.onStateMouseOut.bind(this);
		this.onStateClick = this.onStateClick.bind(this);
		this.onBackgroundClick = this.onBackgroundClick.bind(this);

		//
		// Draw graph
		// 
		this.stateGraphContainer.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + innerHeight + ')')
			.call(xAxis);

		this.stateGraphContainer.append('g')
			.attr('class', 'x axis labels')
			.attr('transform', 'translate(0,' + innerHeight + ')')
			.call(xAxisLabels)
		// align labels
		.selectAll('.tick text')
			.attr('text-anchor', (d, i) => i ? 'end' : 'start')
			.attr('style', null);

		this.isInited = true;

	},

	initLabels: function (containerNode) {

		this.labelContainer = document.createElement('div');
		this.labelContainer.id = 'state-labels';
		containerNode.appendChild(this.labelContainer);

		this.backgroundedLabel = d3.select(containerNode).append('div')
			.attr('id', 'backgrounded-state-label');
		this.backgroundedLabel.append('h3');

	},

	renderLabels: function (ranges) {

		// TODO: copying anger as placeholder; need to implement for disgust, enjoyment, fear
		let yOffsets = {};
		yOffsets[dispatcher.EMOTIONS.ANGER] = -80;
		yOffsets[dispatcher.EMOTIONS.DISGUST] = yOffsets[dispatcher.EMOTIONS.ANGER];
		yOffsets[dispatcher.EMOTIONS.ENJOYMENT] = yOffsets[dispatcher.EMOTIONS.ANGER];
		yOffsets[dispatcher.EMOTIONS.FEAR] = yOffsets[dispatcher.EMOTIONS.ANGER];
		yOffsets[dispatcher.EMOTIONS.SADNESS] = 20;

		let stateDisplay = this,
			labels = d3.select(this.labelContainer).selectAll('div')
				.data(ranges);

		labels.enter().append('div');

		labels
			.classed(this.currentEmotion + ' label', true)
			.html((d, i) => '<h3>' + this.currentStatesData[i].name.toUpperCase() + '</h3>')
			.style({
				left: d => (Math.round(stateDisplay.xScale(d[1].x) - 10) + 'px'),
				top: d => (Math.round(stateDisplay.yScale(d[1].y) + yOffsets[this.currentEmotion]) + 'px')
			})
			.each(function () {
				setTimeout(() => {
					this.classList.add('visible');
				}, LABEL_APPEAR_DELAY);
			});

		labels.exit().remove();

	},

	setActive: function (val) {

		d3.select(this.labelContainer).selectAll('div').select('h3')
			.on('mouseover', val ? this.onStateMouseOver : null)
			.on('mouseout', val ? this.onStateMouseOut : null)
			.on('click', val ? this.onStateClick : null, true);

	},

	setEmotion: function (emotion) {

		//
		// TODO: implement transitions between emotions
		// TODO: set up all emotions beforehand
		// 			(calculate all ranges, set up area generators, etc)
		//			and just draw the graph here.
		//

		if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
			emotion = 'anger';
		}
		this.currentEmotion = emotion;
		this.currentStatesData = this.parseStates();

		// transform state range into points for area chart
		let transformedRanges = this.transformRanges(this.currentStatesData, this.currentEmotion, 0.0);

		let stateElements = this.stateGraphContainer.selectAll('path.area')
			.data(transformedRanges).enter();
		let emotionGradientName = this.currentEmotion + '-gradient';

		stateElements.append('linearGradient')
			.attr('xlink:href', '#' + emotionGradientName)
			.attr('id', (d, i) => emotionGradientName + '-' + i)
			.attr('x1', d => this.xScale(d[0].x))
			.attr('x2', d => this.xScale(d[2].x));

		let statePaths = stateElements.append('path')
			.attr('class', 'area')
			.attr('d', this.areaGenerators[this.currentEmotion])
			.attr('fill', (d, i) => 'url(#' + emotionGradientName + '-' + i + ')')
			.call(this.applyEffects.bind(this))
			.on('mouseover', this.onStateMouseOver)
			.on('mouseout', this.onStateMouseOut)
			.on('click', this.onStateClick);

		// grow the states upwards
		transformedRanges = this.transformRanges(this.currentStatesData, this.currentEmotion, 1.0);
		this.stateGraphContainer.selectAll('path.area')
			.data(transformedRanges)
			.call(this.applyTransitions);

		this.renderLabels(transformedRanges);
		this.setActive(true);

		setTimeout(() => {
			this.stateGraphContainer.selectAll('.axis')
				.classed('visible', true);
		}, 1);

		// setTimeout(() => {
		this.resetCallout();
		// }, LABEL_APPEAR_DELAY);

		this.tempNav.querySelector('.prev').innerHTML = '<a href=#continents:' + emotion + '>CONTINENTS ▲</a>';
		this.tempNav.querySelector('.next').innerHTML = '<a href=#actions:' + emotion + '>ACTIONS ▼</a>';
		this.tempNav.removeAttribute('style');

	},

	open: function (options) {

		this.setBackgrounded(options && options.inBackground, options);

		// handle background click for deselection
		d3.select('#main').on('click', this.onBackgroundClick, false);

	},

	close: function () {

		return new Promise((resolve, reject) => {

			//
			// TODO: the logic below should be reusable for transitioning between emotions.
			// refactor as such, along with refactor noted at top of setEmotion().
			//

			this.hideChrome();
			this.setActive(false);
			d3.select('#main').on('click', null, false);
			
			// recede graph down into baseline
			let transformedRanges = this.transformRanges(this.currentStatesData, this.currentEmotion, 0.0),
				areaSelection = this.stateGraphContainer.selectAll('path.area');

			if (areaSelection.size()) {

				areaSelection
					.data(transformedRanges)
					.call(this.applyTransitions, 'close', () => {
						// d3 seems to call 'close' one frame too early;
						// wait one frame to ensure animation is complete.
						setTimeout(() => {
							// on transition end, remove graph elements
							this.stateGraphContainer.selectAll('path.area').remove();
							this.stateGraphContainer.selectAll('linearGradient').remove();

							// ...remove labels
							d3.select(this.labelContainer).selectAll('div').remove();

							// ...and resolve promise to continue transition when complete
							resolve();
						}, 1);
					});

			} else {

				// If no paths present, resolve immediately.
				// This is not an expected state; it's just gracefully handling possible bugs.
				resolve();

			}

		});

	},

	/**
	 * States view stays open, with limited interactivity,
	 * in actions, triggers, and moods. `setBackgrounded()` toggles this state.
	 */
	setBackgrounded: function (val, options) {

		return new Promise((resolve, reject) => {

			this.sectionContainer.classList[(val ? 'add' : 'remove')]('backgrounded');
			this.sectionContainer.classList[(options && options.sectionIsTriggers ? 'add' : 'remove')]('triggers');
			this.hideChrome();
			this.setActive(!val);
			this.isBackgrounded = val;

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	setBackgroundedState: function (state) {

		this.backgroundedState = state;
		this.displayBackgroundedState();

	},

	// does not set any state, just displays.
	displayBackgroundedState: function (state) {

		let stateName = state || this.backgroundedState || '',
			classes = {
				'visible': !!stateName
			};
		classes[this.currentEmotion] = true;

		this.backgroundedLabel.select('h3').html(stateName);
		this.backgroundedLabel.classed(classes);

		this.setHighlightedState(stateName);

	},

	setHighlightedState: function (state) {

		this.highlightedState = state;
		this.displayHighlightedState();

	},

	// does not set any state, just displays.
	displayHighlightedState: function (state) {

		let stateName = state || this.highlightedState || '';
		if (stateName) {

			let stateIndex = this.currentStatesData.findIndex(d => d.name === stateName);

			d3.selectAll('path.area')
				.style('opacity', (data, index) => index === stateIndex ? 1.0 : 0.2);

			d3.select(this.labelContainer).selectAll('div h3')
				.style('opacity', (data, index) => index === stateIndex ? 1.0 : 0.2);

			// .selectAll('linearGradient')
			// TODO: set stops with higher/lower opacity on #anger-gradient-{i}

		} else {

			d3.selectAll('path.area')
				.style('opacity', null);

			d3.select(this.labelContainer).selectAll('div h3')
				.style('opacity', null);

		}

	},

	hideChrome: function () {

		// TODO: this code was in close, but is needed for setBackgrounded;
		// close() removes labels and axis (stateGraphContainer) from DOM
		// but this function does not. may need to remove labels and axes here,
		// on transition end / after a timeout.

		// fade out labels
		d3.select(this.labelContainer).selectAll('div')
			.classed('visible', false)
		.selectAll('h3')
			.style('opacity', null);

		// fade out axes
		this.stateGraphContainer.selectAll('.axis')
			.classed('visible', false);

		this.tempNav.style.display = 'none';

		// remove main callout
		dispatcher.changeCallout();

	},

	parseStates: function () {

		// copy states of current emotion and add state name to each state object
		let states = emotionsData.emotions[this.currentEmotion].states;
		states = Object.keys(states).map(stateName => {
			return Object.assign({}, states[stateName], { name: stateName });
		});

		// sort by state min value, then max value
		states = states.sort((a, b) => {
			if (a.range.min < b.range.min) {
				return -1;
			} else if (a.range.min > b.range.min) {
				return 1;
			} else {
				if (a.range.max < b.range.max) {
					return -1;
				} else if (a.range.max > b.range.max) {
					return 1;
				}
			}
			return 0;
		});

		return states;

	},

	transformRanges: function (states, emotion, strengthMod=1.0) {

		return this.stateRangeTransformers[emotion](states, strengthMod);

	},

	/**
	 * Each transformer converts an emotion state range input
	 * formatted as { min: a, max: b } into a set of points
	 * used to render an area graph.
	 * 
	 * param states {Array} All states for an emotion that will be transformed.
	 * param strengthMod {Number} A modifier used to animate the states.
	 */
	stateRangeTransformers: {

		/**
		 * Base shape for all states. Isosceles triangles with:
		 * - first point on x axis, at left edge of range;
		 * - last point on x axis, at right edge of range;
		 * - middle point halfway in between horizontally,
		 *   and height equal to half width.
		 *
		 * Shapes may be further modified by an interpolator (see: setUpAreaGenerators).
		 *
		 * For input [a(x,y), b(x,y)]:
		 * output: [
		 *	{ x: a, y: 0 },
		 *	{ x: a + (b-a)/2, y: (b-a)/2 },
		 *	{ x: b, y: 0 },
		 * ]
		 */
		isosceles: function (states, strengthMod) {

			return states.map((state, i) => {

				let points = [],
					min = state.range.min - 1,				// transform to 0-indexed, and allow
															// states with same min and max to display
					max = state.range.max,
					spread = max - min,
					centerX = min + 0.5 * spread;

				points.push({
					x: min,
					y: 0
				});
				points.push({
					x: centerX,
					y: strengthMod * centerX
				});
				points.push({
					x: max,
					y: 0
				});

				return points;

			});

		},

		// manual tweaks for overlapping values
		offsetPoints: function (points, offsets, strengthMod) {

			if (points.length !== offsets.length) {
				throw new Error('`points` and `offsets` must be the same length.');
			}

			points.forEach((point, i) => {
				point[1].x += offsets[i][0];
				point[1].y += offsets[i][1] * strengthMod;
			});

		},

		/**
		 * out -> [
		 *	{ x: a, y: 0 },
		 *	{ x: a + (b-a)/2 + offset, y: (b-a)/2 },
		 *	{ x: b, y: 0 },
		 * ]
		 */
		anger: function (states, strengthMod) {
			
			let numStates = states.length;
			let lastX = -Number.INFINITY;
			return states.map((state, i) => {

				let points = [],
					min = state.range.min - 1,				// transform to 0-indexed, and allow
															// states with same min and max to display
					max = state.range.max,
					spread = max - min,
					centerX = min + 0.5 * spread,
					overlapsLast = Math.abs(centerX - lastX) < 0.05,
					offsetBase,
					yOverlapOffset = overlapsLast ? (i / numStates) : 0;

				// Offsets skew left of center toward left edge
				// of graph, right of center toward right.
				// Also, if two states have the same peak, push them apart.
				if (overlapsLast) {
					offsetBase = 0.5 * ((i+2) / numStates);
				} else {
					offsetBase = 0.5 * (i / numStates);
				}

				points.push({
					x: min,
					y: 0
				});
				points.push({
					x: min + spread * (offsetBase + 0.05),
					y: strengthMod * (min + 0.5 * spread + yOverlapOffset)
				});
				points.push({
					x: max,
					y: 0
				});

				lastX = centerX;

				return points;

			});

		},

		disgust: function (states, strengthMod) {

			let points = this.isosceles(states, strengthMod);

			let offsets = [
				[0, 0],
				[-0.25, 0],
				[0.25, 0.25],
				[0, 0],
				[-0.5, -0.5],
				[0, -0.25],
				[0.5, 0],
				[0, 0]
			];
			this.offsetPoints(points, offsets, strengthMod);

			return points;

		},

		enjoyment: function (states, strengthMod) {

			let points = this.isosceles(states, strengthMod);

			let offsets = [
				[0, 0],			// rejoicing
				[-0.5, -0.5],	// amusement
				[0.5, 0],		// relief
				[0, -0.5],		// compassion-joy
				[0, 0],			// schadenfreude
				[-0.5, 0],		// naches
				[0.5, 0.25],	// fiero
				[-0.25, 0.5],	// pride
				[0, 0],			// wonder
				[0, 0],			// excitement
				[0, 0]			// ecstasy
			];
			this.offsetPoints(points, offsets, strengthMod);

			return points;

		},

		fear: function (states, strengthMod) {

			let points = this.isosceles(states, strengthMod);

			let offsets = [
				[0, 0],				// trepidation
				[-0.5, -0.25],		// anxiety
				[0.5, 0.25],		// nervousness
				[0, 0],				// dread
				[-0.5, -0.6],		// desperation
				[0, -0.25],			// panic
				[-0.25, -0.35],		// horror
				[0, 0]				// terror
			];
			this.offsetPoints(points, offsets, strengthMod);

			return points;

		},

		sadness: function (states, strengthMod) {

			// amplify height to counter shortness caused by interpolation
			let points = this.isosceles(states, strengthMod * 1.25);

			let offsets = [
				[-1, 0],
				[-1, 0],
				[0, 1],
				[1, 0],
				[0, 0],
				[0, 0],
				[-0.5, -0.25],
				[0, 0],
				[0.5, 0.25],
				[0, 0]
			];
			this.offsetPoints(points, offsets, strengthMod);

			return points;

		}

	},

	setUpDefs: function (defs, xScale, yScale) {

		// blur filters (sadness)
		// TODO: DRY this out 
		defs.append('filter')
			.attr('id', 'sadness-blur-0')
			.attr('x', -16)
			.attr('y', -16)
			.attr('width', 128)
			.attr('height', 128)
		.append('feGaussianBlur')
			.attr('in', 'SourceGraphic')
			.attr('stdDeviation', 0);
		defs.append('filter')
			.attr('id', 'sadness-blur-1')
			.attr('xlink:href', '#sadness-blur-0')
		.append('feGaussianBlur')
			.attr('in', 'SourceGraphic')
			.attr('stdDeviation', 1);
		defs.append('filter')
			.attr('id', 'sadness-blur-2')
			.attr('xlink:href', '#sadness-blur-0')
		.append('feGaussianBlur')
			.attr('in', 'SourceGraphic')
			.attr('stdDeviation', 2);
		defs.append('filter')
			.attr('id', 'sadness-blur-3')
			.attr('xlink:href', '#sadness-blur-0')
		.append('feGaussianBlur')
			.attr('in', 'SourceGraphic')
			.attr('stdDeviation', 3);

		// base gradient
		defs.append('linearGradient')
			.attr('id', 'states-gradient')
			.attr('gradientUnits', 'userSpaceOnUse')

			// these will be overridden on each path's gradient
			.attr('x1', xScale(0))
			.attr('x2', xScale(10))

			.attr('y1', yScale(0))
			.attr('y2', yScale(0));

		// anger
		defs.append('linearGradient')
			.attr('id', 'anger-gradient')
			.attr('xlink:href', '#states-gradient')
		.selectAll('stop')
			.data([
				{ offset: '0%', color: 'rgba(228, 135, 102, 0.2)' },
				{ offset: '100%', color: 'rgba(204, 28, 43, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// disgust
		defs.append('linearGradient')
			.attr('id', 'disgust-gradient')
			.attr('xlink:href', '#states-gradient')
		.selectAll('stop')
			.data([
				{ offset: '0%', color: 'rgba(0, 142, 69, 0.3)' },
				{ offset: '56%', color: 'rgba(0, 122, 61, 0.8)' },
				{ offset: '100%', color: 'rgba(0, 104, 55, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// enjoyment
		defs.append('linearGradient')
			.attr('id', 'enjoyment-gradient')
			.attr('xlink:href', '#states-gradient')
		.selectAll('stop')
			.data([
				{ offset: '0%', color: 'rgba(241, 196, 83, 0.8)' },
				{ offset: '100%', color: 'rgba(248, 136, 29, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// fear
		defs.append('linearGradient')
			.attr('id', 'fear-gradient')
			.attr('xlink:href', '#states-gradient')
		.selectAll('stop')
			.data([
				{ offset: '0%', color: 'rgba(248, 58, 248, 0.1)' },
				{ offset: '100%', color: 'rgba(143, 39, 139, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// sadness
		defs.append('linearGradient')
			.attr('id', 'sadness-gradient')
			.attr('xlink:href', '#states-gradient')
		.selectAll('stop')
			.data([
				{ offset: '0%', color: 'rgba(200, 220, 240, 1.0)' },
				{ offset: '56%', color: 'rgba(30, 152, 211, 1.0)' },
				{ offset: '100%', color: 'rgba(64, 70, 164, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

	},

	setUpAreaGenerators: function (innerHeight, xScale, yScale) {

		return {

			anger: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y)),

			/*
			// TODO: degenerate per "Roughen" Illustrator effect (or similar)
			disgust: function (d, i, a) {
				// let interpolate = d3.interpolate(a, String(value.call(this, d, i)));
				return function (t) {
					return d3.svg.area()
					.x(d => xScale(d.x))
					.y0(innerHeight)
					.y1(d => yScale(d.y))
					.interpolate((points) => {
						console.log(">>>>> t:", t);
						// symmetrical concave beziers
						let roundness = 0.8,
							steepness = 0.5,
							x0 = points[0][0],
							y0 = points[0][1],
							x1 = points[1][0],
							y1 = points[1][1],
							x2 = points[2][0],
							y2 = points[2][1];
							
						let path = points[0].join(' ') +				// first anchor point
							` C${x0 + steepness*(x1-x0)} ${y0},` +		// first control point, inside curve
							`${x0 + roundness*(x1-x0)} ${y1},` + 		// second control point, outside curve
							points[1].join(' ') +						// middle anchor point
							` C${x1 + (1-roundness)*(x2-x1)} ${y1},` +	// third control point, outside curve
							`${x1 + (1-steepness)*(x2-x1)} ${y2},` +	// fourth control point, inside curve
							points[2].join(' ');						// last anchor point


						return path;
					})
					(d);
				};
			},
			*/

			// TODO: degenerate per "Roughen" Illustrator effect (or similar)
			disgust: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y))
				.interpolate((points) => {
					// symmetrical concave beziers
					let roundness = 0.8,
						steepness = 0.5,
						x0 = points[0][0],
						y0 = points[0][1],
						x1 = points[1][0],
						y1 = points[1][1],
						x2 = points[2][0],
						y2 = points[2][1];
						
					let path = points[0].join(' ') +				// first anchor point
						` C${x0 + steepness*(x1-x0)} ${y0},` +		// first control point, inside curve
						`${x0 + roundness*(x1-x0)} ${y1},` + 		// second control point, outside curve
						points[1].join(' ') +						// middle anchor point
						` C${x1 + (1-roundness)*(x2-x1)} ${y1},` +	// third control point, outside curve
						`${x1 + (1-steepness)*(x2-x1)} ${y2},` +	// fourth control point, inside curve
						points[2].join(' ');						// last anchor point


					return path;
				}),
			
			enjoyment: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y))
				.interpolate((points) => {
					// cubic bezier with control points to left and right of middle anchor point
					let y1 = points[1][1],
						bulbousness = xScale(1);	// relative to overall graph, not to each shape

					let path = points[0].join(' ') +							// first anchor point
						' C' + points[0].join(' ') + ',' +						// repeat first anchor point
						(points[0][0] - bulbousness) + ' ' + y1 + ',' +			// first control point, outside curve to left
						points[1].join(' ') +									// middle anchor point
						' C' + (points[2][0] + bulbousness) + ' ' + y1 + ',' +	// second control point, outside curve to right
						points[2].join(' ') + ',' +								// last anchor point
						points[2].join(' ');									// repeat last anchor point

					return path;
				}),
			
			// TODO: copying anger as placeholder; need to implement for this state
			// start with concave arcs at left, convex at right, then degenerate per "Zig Zag" Illustrator effect (or similar)
			fear: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y))
				.interpolate((points) => {
					// concave bezier to left, convex to right
					let steepnessLeft = 0.8,
						roundnessRight = 0.5,
						x0 = points[0][0],
						y0 = points[0][1],
						x1 = points[1][0],
						y1 = points[1][1],
						x2 = points[2][0],
						y2 = points[2][1];
						
					let path = points[0].join(' ') +					// first anchor point
						` C${x0 + steepnessLeft*(x1-x0)} ${y0},` +		// first control point, inside curve on left
						`${points[1].join(' ')} ` + 					// middle anchor point
						points[1].join(' ') +							// repeat middle anchor point
						` C${x2} ${y1 + (1-roundnessRight)*(y2-y1)},` +	// second control point, outside curve on right
						`${points[2].join(' ')} ` +						// last anchor point
						points[2].join(' ');							// repeat last anchor point


					return path;
				}),
			
			sadness: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y))
				.interpolate('basis')
		
		};

	},

	setUpTransitions: function () {

		return {

			anger: {
				ease: d3.ease('back-out', 3.5),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 500
			},
			
			disgust: {
				ease: d3.ease('poly-in', 4.0),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 1000
			},
			
			enjoyment: {
				// custom bounce ease function, with one more bounce and a bit extra bounciness
				ease: ((h=0.25) => {
					let b0 = 1 - h,
						b1 = b0 * (1 - b0) + b0,
						b2 = b0 * (1 - b1) + b1,
						b3 = b0 * (1 - b2) + b2,
						x0 = 2 * Math.sqrt(h),
						x1 = x0 * Math.sqrt(h),
						x2 = x1 * Math.sqrt(h),
						x3 = x2 * Math.sqrt(h),
						t0 = 1 / (1 + x0 + x1 + x2),
						t1 = t0 + t0 * x0,
						t2 = t1 + t0 * x1,
						t3 = t2 + t0 * x2,
						m0 = t0 + t0 * x0 / 2,
						m1 = t1 + t0 * x1 / 2,
						m2 = t2 + t0 * x2 / 2,
						m3 = t3 + t0 * x3 / 2,
						a = 1 / (t0 * t0);

					return function (t) {
						return t >= 1 ? 1
						: t < t0 ? a * t * t
						: t < t1 ? a * (t -= m0) * t + b0
						: t < t2 ? a * (t -= m1) * t + b1
						: t < t3 ? a * (t -= m2) * t + b2
						: a * (t -= m3) * t + b3;
					};
				}(0.35)),
				delay: (d, i) => 150 + Math.random() * 150 * i,
				duration: 750
			},

			fear: {
				ease: d3.ease('elastic-in', 1.5, 0.75),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 750
			},

			sadness: {
				ease: d3.ease('back-out', 2.0),
				delay: (d, i) => 250 + Math.random() * 1250,
				duration: 4000
			},
			
			close: {
				ease: d3.ease('ease-out'),
				delay: (d, i) => Math.random() * 50 * i,
				duration: 800
			}
		
		};

	},

	applyEffects: function (selection) {

		if (this.currentEmotion === 'sadness') {
			setTimeout(() => {
				selection.attr('filter', 'url(#sadness-blur-0)');
			}, 0.6 * this.transitions.sadness.duration);
			setTimeout(() => {
				selection.attr('filter', 'url(#sadness-blur-1)');
			}, 0.8 * this.transitions.sadness.duration);
			setTimeout(() => {
				selection.attr('filter', 'url(#sadness-blur-2)');
			}, 0.9 * this.transitions.sadness.duration);
			setTimeout(() => {
				selection.attr('filter', 'url(#sadness-blur-3)');
			}, 1.0 * this.transitions.sadness.duration);
		}

	},

	applyTransitions: function (selection, transitionOverride=null, onEnd=null) {

		let transitionConfig = this.transitions[transitionOverride || this.currentEmotion],
			calledOnEnd = false;

		selection.transition()
			.ease(transitionConfig.ease)
			.delay(transitionConfig.delay)
			.duration(transitionConfig.duration)
			.attr('d', this.areaGenerators[this.currentEmotion])
			// .attrTween('d', this.areaGenerators[this.currentEmotion])
			.each('end', function (...args) {
				if (onEnd && !calledOnEnd) {
					onEnd(...args);
					calledOnEnd = true;
				}
			});

	},

	onStateMouseOver: function (d, i) {

		if (this.isBackgrounded) {
			this.displayBackgroundedState(this.currentStatesData[i].name);
		} else {
			this.displayHighlightedState(this.currentStatesData[i].name);
		}

	},

	onStateMouseOut: function (d, i) {

		if (this.isBackgrounded) {
			this.displayBackgroundedState(null);
		} else {
			this.displayHighlightedState(null);
		}

	},

	// this handler fires in the capture phase,
	// in order to stop events bubbling to the background.
	onStateClick: function (d, i) {

		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		if (this.isBackgrounded) {
			dispatcher.setEmotionState(this.currentStatesData[i].name);
		} else {
			this.setHighlightedState(this.currentStatesData[i].name);
			dispatcher.changeCallout(this.currentEmotion, this.currentStatesData[i].name, this.currentStatesData[i].desc);
		}

	},

	onBackgroundClick: function () {

		if (this.isBackgrounded) {
			dispatcher.setEmotionState(null);
		} else {
			this.setHighlightedState(null);
			this.resetCallout();
		}

	},

	resetCallout () {

		dispatcher.changeCallout(this.currentEmotion, appStrings.states.header, appStrings.states.body + '<br><br>' + emotionsData.emotions[this.currentEmotion].statesDesc);

	},

	createTempNav (containerNode) {

		this.tempNav = document.createElement('div');
		this.tempNav.id = 'temp-states-nav';
		containerNode.appendChild(this.tempNav);

		let prev = document.createElement('div');
		prev.classList.add('prev');
		this.tempNav.appendChild(prev);

		let next = document.createElement('div');
		next.classList.add('next');
		this.tempNav.appendChild(next);

	}

};
