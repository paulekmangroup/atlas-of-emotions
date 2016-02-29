import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';

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
	labelContainers: null,
	graphContainers: null,
	xScale: null,
	yScale: null,

	areaGenerators: null,
	transitions: null,

	statesData: null,
	emotionStates: null,
	currentEmotion: null,
	isBackgrounded: false,

	mouseOutTimeout: null,

	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.applyTransitions = this.applyTransitions.bind(this);

		this.initContainers(containerNode);

		this.initLabels(containerNode);

		this.setUpGraphs(containerNode);

		this.transitions = this.setUpTransitions();

		this.onStateMouseOver = this.onStateMouseOver.bind(this);
		this.onStateMouseOut = this.onStateMouseOut.bind(this);
		this.onStateClick = this.onStateClick.bind(this);
		this.onBackgroundClick = this.onBackgroundClick.bind(this);

		this.isInited = true;

	},

	initContainers: function (containerNode) {

		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			let statesContainer = document.createElement('div');
			statesContainer.classList.add('states-container');
			statesContainer.classList.add(emotion);

			let graphContainer = document.createElement('div');
			graphContainer.classList.add('graph-container');
			statesContainer.appendChild(graphContainer);

			containerNode.appendChild(statesContainer);
		});

	},

	initLabels: function (containerNode) {

		this.labelContainers = {};
		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			let container = d3.select('.' + emotion + '.states-container'),
				labelContainer = container.append('div')
					.classed('label-container', true);

			this.labelContainers[emotion] = labelContainer;

		});

		this.backgroundedLabel = d3.select(containerNode).append('div')
			.attr('id', 'backgrounded-state-label');
		this.backgroundedLabel.append('h3');

	},

	setUpGraphs: function (containerNode) {

		//
		// d3 conventional margins
		//
		let margin = {
			top: 20,
			right: 20,
			bottom: 50,
			left: 20
		};

		// All the same size, just grab the first one
		let graphContainer = containerNode.querySelector('.graph-container'),
			innerWidth = graphContainer.offsetWidth - margin.left - margin.right,
			innerHeight = graphContainer.offsetHeight - margin.top - margin.bottom;

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

		//
		// Set up each graph and draw axes
		//
		this.graphContainers = {};
		this.emotionStates = {};
		_.values(dispatcher.EMOTIONS).forEach((emotion, i) => {

			let graphContainer = document.querySelector('#states .' + emotion + ' .graph-container');

			let svg = d3.select(graphContainer).append('svg')
				.attr('width', graphContainer.offsetWidth)
				.attr('height', graphContainer.offsetHeight);

			let graph = svg.append('g')
				.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

			graph.append('g')
				.attr('class', 'x axis')
				.attr('transform', 'translate(0,' + innerHeight + ')')
				.call(xAxis);

			graph.append('g')
				.attr('class', 'x axis labels')
				.attr('transform', 'translate(0,' + innerHeight + ')')
				.call(xAxisLabels)
			// align labels
			.selectAll('.tick text')
				.attr('text-anchor', (d, i) => i ? 'end' : 'start')
				.attr('style', null);

			this.graphContainers[emotion] = d3.select(graphContainer);

			this.emotionStates[emotion] = {
				index: i,
				data: null,
				ranges: null,
				scale: 0.0
			};

		});

		// create an <svg> solely for <defs> shared across all emotions via xlink:href
		let defsSvg = d3.select(containerNode).append('svg')
			.classed('states-defs', true);
		this.setUpDefs(defsSvg.append('defs'), this.xScale, this.yScale);

		// set up area generators for each emotion graph
		this.areaGenerators = this.setUpAreaGenerators(innerHeight, this.xScale, this.yScale);

	},

	renderLabels: function (ranges) {

		let stateSection = this,
			statesData = this.emotionStates[this.currentEmotion].data,
			labels = this.labelContainers[this.currentEmotion].selectAll('div')
				.data(ranges);

		// TODO: copying anger as placeholder; need to implement for disgust, enjoyment, fear
		let yOffsets = {},
			innerHeight = this.yScale.range()[0];
		yOffsets[dispatcher.EMOTIONS.ANGER] = y => y - 100;
		yOffsets[dispatcher.EMOTIONS.DISGUST] = yOffsets[dispatcher.EMOTIONS.ANGER];
		yOffsets[dispatcher.EMOTIONS.ENJOYMENT] = yOffsets[dispatcher.EMOTIONS.ANGER];
		yOffsets[dispatcher.EMOTIONS.FEAR] = yOffsets[dispatcher.EMOTIONS.ANGER];
		yOffsets[dispatcher.EMOTIONS.SADNESS] = (y, d) => {
			// due to interpolation, steeper peaks result in
			// further distance to the label.
			// compensate here with manual offsets.
			return y + Math.pow(d[1].x/10, 2) * .3 * innerHeight;
		};

		labels.enter().append('div');

		labels
			.classed(this.currentEmotion + ' label', true)
			// .classed('backgrounded', () => this.isBackgrounded)
			.html((d, i) => '<h3>' + statesData[i].name.toUpperCase() + '</h3>')
			.style({
				left: d => (Math.round(stateSection.xScale(d[1].x) + 20) + 'px'),	// not sure why this 20px magic number is necessary...?
				top: d => (Math.round(yOffsets[this.currentEmotion](stateSection.yScale(d[1].y), d)) + 'px')
			})
			.each(function () {
				setTimeout(() => {
					this.classList.add('visible');
				}, LABEL_APPEAR_DELAY);
			});

		labels.exit().remove();


	},

	setEmotion: function (emotion) {

		return new Promise((resolve, reject) => {

			if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
				emotion = 'anger';
			}
			let previousEmotion = this.currentEmotion;
			this.currentEmotion = emotion;

			let emotionState = this.emotionStates[emotion];
			let isClosed = !emotionState.data;
			if (isClosed) {
				this.renderEmotion(emotion);
			}

			// transition graphs and labels
			let dx = 0;
			if (previousEmotion) {
				let previousGraph = this.graphContainers[previousEmotion],
					previousLabels = this.labelContainers[previousEmotion];
				previousGraph.classed('active', false);
				previousLabels.classed('active', false);
				previousGraph.on('transitionend', event => {
					previousGraph.on('transitionend', null);
					previousGraph.style('transform', null);
					previousLabels.style('transform', null);
					previousGraph.classed('transitioning', false);
					previousLabels.classed('transitioning', false);
				});

				let containerWidth = document.querySelector('#states .graph-container').offsetWidth;

				// position according to distance between emotion columns
				// dx = (emotionState.index - this.emotionStates[previousEmotion].index) * 1.25*containerWidth;

				// just place left or right one viewport, instead of adhering to column positions,
				// to avoid animations that are unnecessarily fast'n'flashy.
				dx = 1.25 * containerWidth;
				if (emotionState.index < this.emotionStates[previousEmotion].index) {
					dx *= -1;
				}

				// delay to allow a little time for opacity to come up before translating
				setTimeout(() => {
					previousGraph.style('transform', 'translateX(' + -dx + 'px)');
					previousLabels.style('transform', 'translateX(' + -dx + 'px)');
				}, sassVars.emotions.panX.delay * 1000);
			}

			let currentGraph = this.graphContainers[emotion],
				currentLabels = this.labelContainers[emotion];
			if (currentGraph.classed('transitioning')) {
				// if new emotion is still transitioning, remove transitionend handler
				currentGraph.on('transitionend', null);
			} else {
				// else, move into position immediately to prepare for transition
				currentGraph.classed('transitioning', false);
				currentGraph.style('transform', 'translateX(' + dx + 'px)');
				currentLabels.classed('transitioning', false);
				currentLabels.style('transform', 'translateX(' + dx + 'px)');
			}

			// delay to allow a little time for opacity to come up before translating
			setTimeout(() => {
				currentGraph.classed('transitioning active', true);
				currentGraph.style('transform', 'translateX(0)');
				currentLabels.classed('transitioning active', true);
				currentLabels.style('transform', 'translateX(0)');
			}, sassVars.emotions.panX.delay * 1000);

			setTimeout(() => {
				// animate in emotion graph if first time viewing or was previously closed
				if (isClosed) {
					this.setEmotionScale(emotion, 1.0);
				}
			}, sassVars.emotions.scale.in.delay * 1000);

			this.renderLabels(emotionState.ranges[1]);

			if (!this.isBackgrounded) {

				setTimeout(() => {
					this.graphContainers[emotion].selectAll('.axis')
						.classed('visible', true);
				}, 1);

				this.resetCallout();

			}

			this.setActive(!this.isBackgrounded);

			// resolve on completion of primary transitions
			let resolveDelay;
			if (previousEmotion) {
				// resolve after horizontal transition completes
				resolveDelay = (sassVars.emotions.panX.delay + sassVars.emotions.panX.duration) * 1000;
			} else {
				if (isClosed) {

					let d = this.emotionStates[this.currentEmotion].data;
					let delay = this.transitions[this.currentEmotion].delay;

					// resolve after emotion graph animates in
					resolveDelay = delay(null, d.length - 1) + this.transitions[this.currentEmotion].duration;
				} else {
					// resolve after backgrounded elements complete their transitions
					resolveDelay = sassVars.states.backgrounded.duration.in;
				}
			}

			setTimeout(() => {
				resolve();
			}, resolveDelay);

		});

	},

	renderEmotion: function (emotion) {

		let statesData = this.parseStates(emotion),
			emotionState = this.emotionStates[emotion];
		emotionState.data = statesData;

		// transform state range into points for area chart
		emotionState.ranges = {
			'0': this.transformRanges(statesData, emotion, 0.0),
			'1': this.transformRanges(statesData, emotion, 1.0)
		};

		let graph = this.graphContainers[emotion].select('g');

		let stateElements = graph.selectAll('path.area')
			.data(this.emotionStates[emotion].ranges[0]).enter();
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
			.call(this.applyEffects.bind(this));

		emotionState.rendered = true;

	},

	setEmotionScale: function (emotion, scale) {

		let graph = this.graphContainers[emotion].select('g'),
			ranges = this.emotionStates[emotion].ranges[scale];

		if (!ranges) {
			ranges = this.emotionStates[emotion].ranges[scale.toString()] = this.transformRanges(this.emotionStates[emotion].data, emotion, scale);
		}

		graph.selectAll('path.area')
			.data(ranges)
			.call(this.applyTransitions);

		this.emotionStates[emotion].scale = scale;

	},

	open: function (options) {

		this.setBackgrounded(options && options.inBackground, options);

		if (options && (options.sectionName === dispatcher.SECTIONS.STATES || options.sectionName === dispatcher.SECTIONS.ACTIONS)) {
			// handle background click for deselection
			d3.select('#main').on('click', this.onBackgroundClick, false);
		}

	},

	close: function () {

		return new Promise((resolve, reject) => {

			console.log(">>>>> states.close()");

			//
			// TODO: the logic below should be reusable for transitioning between emotions.
			// refactor as such, along with refactor noted at top of setEmotion().
			//

			this.hideChrome();
			this.setActive(false);
			d3.select('#main').on('click', null, false);

			if (!this.currentEmotion) {

				// If no current emotion, resolve immediately.
				// This is not an expected state; it's just gracefully handling possible bugs.
				resolve();
				return;

			}

			// recede graph down into baseline
			let emotionState = this.emotionStates[this.currentEmotion],
				transformedRanges = this.transformRanges(emotionState.data, this.currentEmotion, 0.0),
				graph = this.graphContainers[this.currentEmotion],
				labelContainer = this.labelContainers[this.currentEmotion],
				areaSelection = graph.selectAll('path.area');

			if (areaSelection.size()) {

				areaSelection
					.data(transformedRanges)
					.call(this.applyTransitions, 'close', () => {
						// d3 seems to call 'close' one frame too early;
						// wait one frame to ensure animation is complete.
						setTimeout(() => {
							// on transition end, remove graph elements
							graph.selectAll('path.area').remove();
							graph.selectAll('linearGradient').remove();

							// ...remove labels
							labelContainer.selectAll('div').remove();

							// ...remove the transformed data, to ensure a clean starting point next time this emotion's state graph is viewed
							emotionState.data = null;
							areaSelection.data([]);

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

	setActive: function (val) {

		if (this.currentEmotion) {

			// clear out any existing handlers
			this.graphContainers[this.currentEmotion].selectAll('path.area')
				.on('mouseover', null)
				.on('mouseout', null)
				.on('click', null, true);

			this.labelContainers[this.currentEmotion].selectAll('div').select('h3')
				.on('mouseover', null)
				.on('mouseout', null)
				.on('click', null, true);

			// add new handlers if active
			if (val) {
				this.graphContainers[this.currentEmotion].selectAll('path.area')
					.on('mouseover', this.onStateMouseOver)
					.on('mouseout', this.onStateMouseOut)
					.on('click', this.onStateClick, true);

				this.labelContainers[this.currentEmotion].selectAll('div').select('h3')
					.on('mouseover', this.onStateMouseOver)
					.on('mouseout', this.onStateMouseOut)
					.on('click', this.onStateClick, true);
			}

		}

	},

	/**
	 * States section stays open, with limited interactivity,
	 * in actions, triggers, and moods. `setBackgrounded()` toggles this state.
	 */
	setBackgrounded: function (val, options) {

		return new Promise((resolve, reject) => {

			// apply `states-in-out` class any time animating into or out of states section
			if (!val && this.sectionContainer.classList.contains('backgrounded') ||
				val && !this.sectionContainer.classList.contains('backgrounded')) {
				this.sectionContainer.classList.add('states-in-out');
			} else {
				this.sectionContainer.classList.remove('states-in-out');
			}

			this.sectionContainer.classList[(val ? 'add' : 'remove')]('backgrounded');
			this.sectionContainer.classList[(options && (options.sectionName === dispatcher.SECTIONS.ACTIONS) ? 'add' : 'remove')]('actions');
			this.sectionContainer.classList[(options && (options.sectionName === dispatcher.SECTIONS.TRIGGERS) ? 'add' : 'remove')]('triggers');
			this.sectionContainer.classList[(options && (options.sectionName === dispatcher.SECTIONS.MOODS) ? 'add' : 'remove')]('moods');

			this.hideChrome();
			this.setActive(!val);
			this.isBackgrounded = val;

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	applyEventListenersToEmotion: function (emotion, handlersByEvent) {

		Object.keys(handlersByEvent).forEach(event => {
			this.graphContainers[emotion].on(event, handlersByEvent[event]);
		});

	},

	hideChrome: function () {

		// TODO: this code was in close, but is needed for setBackgrounded;
		// close() removes labels and axis (stateGraphContainer) from DOM
		// but this function does not. may need to remove labels and axes here,
		// on transition end / after a timeout.

		if (this.currentEmotion) {

			// fade out labels
			this.labelContainers[this.currentEmotion].selectAll('div')
				.classed('visible', false)
			.selectAll('h3')
				.style('opacity', null);

			// fade out axes
			this.graphContainers[this.currentEmotion].selectAll('.axis')
				.classed('visible', false);

		}

		// remove main callout
		dispatcher.changeCallout();

	},

	parseStates: function (emotion) {

		if (this.statesData && this.statesData[emotion]) {
			return this.statesData[emotion];
		}

		// copy states of current emotion
		let states = emotionsData.emotions[emotion].states.map(state => {
			return Object.assign({}, state, {
				name: state.name.toLowerCase()
			});
		});

		// filter out states with invalid ranges
		states = states.filter(state => {
			return !!(state.range.min && state.range.max);
		});

		// sort by peak height (desc), so shorter states appear in front
		// to improve 'pickability' / interaction
		states = states.sort((a, b) => {
			let dy = (b.range.min + b.range.max) - (a.range.min + a.range.max);
			if (!dy) {
				// use range.min as tiebreaker:
				// higher min goes in front
				dy = a.range.min - b.range.min;
			}
			if (!dy) {
				// use name as secondary tiebreaker
				// to ensure deterministic behavior
				if (a.name > b.name) { dy = -1; }
				else if (a.name < b.name) { dy = 1; }
			}
			return dy;
		});

		// manual sort overrides
		if (emotion === dispatcher.EMOTIONS.FEAR) {
			// move panic one index forward, after horror
			let panicIndex = states.findIndex(state => state.name === 'panic');
			if (panicIndex > -1) {
				states.splice(panicIndex + 1, 0, states.splice(panicIndex, 1)[0]);
			}
		}

		this.statesData = this.statesData || {};
		this.statesData[emotion] = states;
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
		 * Manual offsets per state applied for legibility.
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

		anger: function (states, strengthMod) {

			let points = this.isosceles(states, strengthMod);

			// manually offset each state
			let keyedOffsets = {
					'annoyance': [-0.5, 0],
					'frustration': [-1.5, -0.5],
					'argumentativeness': [0, 0],
					'bitterness': [0.5, 0],
					'exasperation': [-0.5, 0],
					'vengefulness': [0.5, 0],
					'fury': [0, 0]
				},
				offsets = states.map(s => s.name).map(name => keyedOffsets[name] || [0, 0]);

			this.offsetPoints(points, offsets, strengthMod);

			return points;

		},

		disgust: function (states, strengthMod) {

			let points = this.isosceles(states, strengthMod);

			// manually offset each state
			let keyedOffsets = {
					'dislike': [0, 0],
					'aversion': [-0.25, -0.15],
					'distaste': [0.25, 0.15],
					'repugnance': [0, 0],
					'abhorrence': [-0.25, -0.3],
					'revulsion': [0, 0],
					'loathing': [0, 0]
				},
				offsets = states.map(s => s.name).map(name => keyedOffsets[name] || [0, 0]);

			this.offsetPoints(points, offsets, strengthMod);

			return points;

		},

		enjoyment: function (states, strengthMod) {

			let points = this.isosceles(states, strengthMod);

			// manually offset each state
			let keyedOffsets = {
					'sensory pleasures': [0, 0],
					'compassion-joy': [-0.25, -0.25],
					'amusement': [-0.15, -0.15],
					'rejoicing': [0.15, 0.15],
					'schadenfreude': [0, 0],
					'relief': [0, 0],
					'pride': [-0.15, -0.15],
					'fiero': [0.1, 0.1],
					'naches': [0.4, 0.4],
					'wonder': [0, 0],
					'debauchery': [-0.15, -0.15],
					'excitement': [0.15, 0.15],
					'ecstasy': [0, 0]
				},
				offsets = states.map(s => s.name).map(name => keyedOffsets[name] || [0, 0]);

			this.offsetPoints(points, offsets, strengthMod);

			return points;

		},

		fear: function (states, strengthMod) {

			let points = this.isosceles(states, strengthMod);

			// manually offset each state
			let keyedOffsets = {
					'trepidation': [0, 0],
					'nervousness': [-0.5, 0],
					'anxiety': [0, 0],
					'dread': [-0.5, -0.5],
					'desperation': [-1.0, -1.0],
					'panic': [-0.7, -0.8],
					'horror': [-0.35, -0.4],
					'terror': [0, 0]
				},
				offsets = states.map(s => s.name).map(name => keyedOffsets[name] || [0, 0]);

			this.offsetPoints(points, offsets, strengthMod);

			return points;

		},

		sadness: function (states, strengthMod) {

			// amplify height to counter shortness caused by interpolation
			let points = this.isosceles(states, strengthMod * 1.25);

			// manually offset each state
			let keyedOffsets = {
					'disappointment': [0, 0],
					'discouragement': [-0.5, -0.25],
					'distraughtness': [0.25, 0.25],
					'resignation': [0.75, 0.5],
					'helplessness': [-0.5, -0.5],
					'hopelessness': [-0.5, -0.5],
					'misery': [0, 0],
					'despair': [-0.1, 0],
					'grief': [0.3, 0.5],
					'sorrow': [0.7, 1.0],
					'anguish': [0, 0.5]
				},
				offsets = states.map(s => s.name).map(name => keyedOffsets[name] || [0, 0]);

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

			// TODO: degenerate per "Zig Zag" Illustrator effect (or similar)
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
				delay: (d, i) => 150 + Math.random() * 100 * i,
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
				delay: (d, i) => 500 + Math.random() * 150 * i,
				duration: 750
			},

			fear: {
				ease: d3.ease('elastic-in', 1.5, 0.75),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 750
			},

			sadness: {
				ease: d3.ease('back-out', 2.0),
				delay: (d, i) => 150 + Math.random() * 1250,
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

		let statesData = this.emotionStates[this.currentEmotion].data[i];
		if (!statesData) {
			throw new Error('statesData not found for onStateMouseOver at index ' + i);
		}

		if (this.isBackgrounded) {
			this.displayBackgroundedStates([statesData.name]);
			dispatcher.setEmotionState(statesData.name, false);
		} else {
			this.displayHighlightedStates([statesData.name]);
		}

	},

	onStateMouseOut: function (d, i) {

		if (this.isBackgrounded) {
			this.displayBackgroundedStates(null);
			dispatcher.setEmotionState(null, false);
		} else {
			this.displayHighlightedStates(null);
		}

	},

	// this handler fires in the capture phase,
	// in order to stop events bubbling to the background.
	onStateClick: function (d, i) {

		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		let statesData = this.emotionStates[this.currentEmotion].data[i];
		if (this.isBackgrounded) {
			dispatcher.setEmotionState(statesData.name, true);
		} else {
			this.setHighlightedState(statesData.name);
			dispatcher.changeCallout(this.currentEmotion, statesData.name, statesData.desc);
		}

	},

	onBackgroundClick: function () {

		if (this.isBackgrounded) {
			dispatcher.setEmotionState(null, true);
		} else {
			this.setHighlightedState(null);
			this.resetCallout();
		}

	},

	setBackgroundedState: function (state) {

		this.backgroundedState = state;
		this.displayBackgroundedStates(null);
		this.setHighlightedState(state);

	},

	// does not set any state, just displays.
	displayBackgroundedStates: function (states) {

		let singleStateName = '',
			classes;

		if (!states) {
			singleStateName = this.backgroundedState;
		} else if (states.length === 1) {
			singleStateName = states[0];
		}
		classes = {
			'visible': !!singleStateName
		};

		classes[this.currentEmotion] = true;

		if (singleStateName) {
			this.backgroundedLabel.select('h3').html(singleStateName);
		}
		this.backgroundedLabel.classed(classes);

		this.displayHighlightedStates(states);

	},

	setHighlightedState: function (state) {

		this.highlightedState = state;
		this.displayHighlightedStates(null);

	},

	// does not set any state, just displays.
	displayHighlightedStates: function (states) {

		if (!this.currentEmotion) { return; }

		if (!states && this.highlightedState) {
			states = [this.highlightedState];
		}

		let graphContainer = this.graphContainers[this.currentEmotion],
			labelContainer = this.labelContainers[this.currentEmotion];

		if (states && states.length) {

			// create map of highlighted state indices (list of booleans)
			let stateIndexes = this.emotionStates[this.currentEmotion].data.map(d => {
				return !!~states.indexOf(d.name);
			});

			graphContainer.selectAll('path.area')
				.classed('unhighlighted', (data, index) => !stateIndexes[index]);

			// labelContainer.selectAll('div h3')
			// 	.classed('highlighted', (data, index) => stateIndexes[index]);
			labelContainer.selectAll('div h3')
				.classed('unhighlighted', (data, index) => !stateIndexes[index]);

		} else {

			graphContainer.selectAll('path.area')
				.classed('unhighlighted', false);
			// labelContainer.selectAll('div h3')
			// 	.classed('highlighted', false);
			labelContainer.selectAll('div h3')
				.classed('unhighlighted', false);

		}

	},

	resetCallout: function () {

		dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.states.header, emotionsData.metadata.states.body/* + '<br><br>' + emotionsData.emotions[this.currentEmotion].statesDesc*/);

	}

};
