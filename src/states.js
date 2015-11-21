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

	labelContainer: null,
	stateGraphContainer: null,
	xScale: null,
	yScale: null,

	areaGenerators: null,
	transitions: null,

	currentEmotion: null,
	currentStatesData: null,

	calloutResetTimeout: null,
	
	init: function (containerNode) {

		this.applyTransitions = this.applyTransitions.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		document.addEventListener('keydown', this.onKeyDown);

		// size main container to viewport
		// let headerHeight = 55;	// from _variables.scss
		// containerNode.style.height = (window.innerHeight - headerHeight) + 'px';

		let graphContainer = document.createElement('div');
		graphContainer.id = 'state-graph-container';
		containerNode.appendChild(graphContainer);

		this.initLabels(containerNode);

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

	},

	renderLabels: function (ranges) {

		let stateDisplay = this,
			labels = d3.select(this.labelContainer).selectAll('div')
				.data(ranges);

		labels.enter().append('div');

		labels
			.classed(this.currentEmotion + ' label', true)
			.html((d, i) => '<h3>' + this.currentStatesData[i].name.toUpperCase() + '</h3>')
			.style({
				left: d => (Math.round(stateDisplay.xScale(d[1].x) - 10) + 'px'),
				top: d => (Math.round(stateDisplay.yScale(d[1].y) - 80) + 'px')
			})
			.each(function () {
				setTimeout(() => {
					this.classList.add('visible');
				}, LABEL_APPEAR_DELAY);
			});

		labels.exit().remove();

	},

	setEmotion: function (emotion) {

		//
		// TODO: implement transitions between emotions
		// TODO: set up all emotions beforehand
		// 			(calculate all ranges, set up area generators, etc)
		//			and just draw the graph here.
		//

		if (!~this.emotions.indexOf(emotion)) {
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

		setTimeout(() => {
			this.stateGraphContainer.selectAll('.axis')
				.classed('visible', true);
		}, 1);

		setTimeout(() => {
			this.resetCallout();
		}, LABEL_APPEAR_DELAY);

	},

	open: function (emotion) {

		// TODO: need to do anything to open states prior to setting emotion?

	},

	close: function () {

		return new Promise((resolve, reject) => {

			//
			// TODO: the logic below should be reusable for transitioning between states.
			// refactor as such, along with refactor noted at top of setEmotion().
			//

			// fade out labels
			d3.select(this.labelContainer).selectAll('div')
				.classed('visible', false)
			.selectAll('h3')
				.style('opacity', null);

			// fade out axes
			this.stateGraphContainer.selectAll('.axis')
				.classed('visible', false);

			// remove main callout
			dispatcher.changeCallout();
			
			// recede graph down into baseline
			let transformedRanges = this.transformRanges(this.currentStatesData, this.currentEmotion, 0.0);
			this.stateGraphContainer.selectAll('path.area')
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

		});

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

		/**
		 * out -> [
		 *	{ x: a, y: 0 },
		 *	{ x: a + (b-a)/2 + random offset, y: (b-a)/2 },
		 *	{ x: b, y: 0 },
		 * ]
		 */
		sadness: function (states, strengthMod) {

			// amplify height a bit to counter shortness caused by interpolation
			let points = this.anger(states, strengthMod * 1.25);

			// manual tweaks for overlapping values
			points[3][1].x += 0.1;
			points[3][1].y += 0.2;
			points[8][1].x += 0.2;
			points[8][1].y += 0.3;

			return points;

		}

	},

	setUpDefs (defs, xScale, yScale) {

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
			fear: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y)),

			disgust: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y)),
			*/
			sadness: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y))
				.interpolate('basis')
			/*
			enjoyment: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y)),
			*/
		
		};

	},

	setUpTransitions: function () {

		return {

			anger: {
				ease: d3.ease('elastic-in', 1.5, 0.75),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 1000
			},
			/*
			fear: {
				ease: d3.ease('linear'),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 1000
			},

			disgust: {
				ease: d3.ease('linear'),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 1000
			},
			*/
			sadness: {
				ease: d3.ease('elastic-in', 2.5, 2),
				delay: (d, i) => 250 + Math.random() * 1250,
				duration: 5000
			},
			/*
			enjoyment: {
				ease: d3.ease('linear'),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 1000
			}
			*/
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
			}, 0.5 * this.transitions.sadness.duration);
			setTimeout(() => {
				selection.attr('filter', 'url(#sadness-blur-1)');
			}, 0.75 * this.transitions.sadness.duration);
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
			.each('end', function (...args) {
				if (onEnd && !calledOnEnd) {
					onEnd(...args);
					calledOnEnd = true;
				}
			});

	},

	onStateMouseOver: function (d, i) {

		d3.selectAll('path.area')
			.style('opacity', (data, index) => index === i ? 1.0 : 0.2);

		d3.select(this.labelContainer).selectAll('div h3')
			.style('opacity', (data, index) => index === i ? 1.0 : 0.2);

		// .selectAll('linearGradient')
		// TODO: set stops with higher/lower opacity on #anger-gradient-{i}

		dispatcher.changeCallout(this.currentEmotion, this.currentStatesData[i].name, this.currentStatesData[i].desc);
		setTimeout(() => {
			if (this.calloutResetTimeout) {
				clearTimeout(this.calloutResetTimeout);
			}
		}, 1);

	},

	onStateMouseOut: function (d, i) {

		d3.selectAll('path.area')
			.style('opacity', null);

		d3.select(this.labelContainer).selectAll('div h3')
			.style('opacity', null);

		if (this.calloutResetTimeout) {
			clearTimeout(this.calloutResetTimeout);
		}
		this.calloutResetTimeout = setTimeout(() => {
			this.resetCallout();
		}, 1000);

	},

	onStateClick: function (d, i) {

		// d3.selectAll('path.area')

	},

	resetCallout () {
		dispatcher.changeCallout(this.currentEmotion, appStrings.emotionCalloutTitle, appStrings.emotionCalloutIntro + '<br><br>' + emotionsData.emotions[this.currentEmotion].desc);
	},

	onKeyDown: function (keyCode) {

		if (keyCode === 37 || keyCode === 39) {

			console.log('TODO: scroll to next emotion. This functionality will ultimately be accessible via a dropdown.');

		}

	}

};
