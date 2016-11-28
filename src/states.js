import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import appStrings from './appStrings.js';
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
	screenIsSmall: false,
	selectedState: null,

	mouseOutTimeout: null,

	init: function (containerNode, screenIsSmall) {

		this.sectionContainer = containerNode;

		this.screenIsSmall = screenIsSmall;

		this.applyTransitions = this.applyTransitions.bind(this);

		this.initContainers(containerNode);

		this.initLabels(containerNode);

		this.setUpGraphs(containerNode);

		this.transitions = this.setUpTransitions();

		this.onStateMouseOver = this.onStateMouseOver.bind(this);
		this.onStateMouseOut = this.onStateMouseOut.bind(this);
		this.onStateClick = this.onStateClick.bind(this);
		this.onContainerTouchStart = this.onContainerTouchStart.bind(this);
		this.onContainerTouchMove = this.onContainerTouchMove.bind(this);
		this.onContainerTouchEnd = this.onContainerTouchEnd.bind(this);
		this.onBackgroundClick = this.onBackgroundClick.bind(this);

		// dispatcher.addListener(dispatcher.EVENTS.POPUP_CLOSE_BUTTON_CLICKED, this.onPopupCloseButtonClicked.bind(this));

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


	},

	setUpGraphs: function (containerNode) {

		//
		// d3 conventional margins
		//
		let margin = {
			top: 20,
			right: sassVars.states.graph.margins.right,
			bottom: 50,
			left: sassVars.states.graph.margins.left
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
			.tickSize(this.screenIsSmall ? 5 : 10);

		let labelsXScale = d3.scale.ordinal()
			.domain(['LEAST INTENSE', 'MOST INTENSE'])
			.range(this.xScale.range());
		let xAxisLabels = d3.svg.axis()
			.scale(labelsXScale)
			.orient('bottom')
			.tickSize(25);

		//
		// Set up each graph and draw axes,
		// or update if already set up (on resize)
		//
		if (!this.graphContainers) {

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

				if (!this.screenIsSmall) {
					graph.append('g')
						.attr('class', 'x axis labels')
						.attr('transform', 'translate(0,' + innerHeight + ')')
						.call(xAxisLabels)
					// align labels
					.selectAll('.tick text')
						.attr('text-anchor', (d, i) => i ? 'end' : 'start')
						.attr('style', null);
				}

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

		} else {

			_.values(dispatcher.EMOTIONS).forEach((emotion, i) => {

				let svg = d3.select('#states .' + emotion + ' .graph-container svg')
					.attr('width', graphContainer.offsetWidth)
					.attr('height', graphContainer.offsetHeight);

				let graph = svg.select('g')
					.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

				graph.select('g.x.axis:not(.labels)')
					.html('')
					.attr('transform', 'translate(0,' + innerHeight + ')')
					.call(xAxis);

				if (!this.screenIsSmall) {
					graph.select('g.x.axis.labels')
						.html('')
						.attr('transform', 'translate(0,' + innerHeight + ')')
						.call(xAxisLabels)
					// align labels
					.selectAll('.tick text')
						.attr('text-anchor', (d, i) => i ? 'end' : 'start')
						.attr('style', null);
				}

			});

		}

		// set up area generators for each emotion graph
		this.areaGenerators = this.setUpAreaGenerators(innerHeight, this.xScale, this.yScale);

	},

	renderLabels: function (emotion) {

		let ranges = this.emotionStates[emotion].ranges[1],
			stateSection = this,
			statesData = this.emotionStates[emotion].data,
			labels = this.labelContainers[emotion].selectAll('div')
				.data(ranges);

		if (this.screenIsSmall) {
			labels.style('display', 'none');
			return;
		}

		// TODO: copying anger as placeholder;
		// implement for disgust, enjoyment, fear as necessary
		let yOffsets = {},
			innerHeight = this.yScale.range()[0];
		yOffsets[dispatcher.EMOTIONS.ANGER] = y => y + 15;
		yOffsets[dispatcher.EMOTIONS.DISGUST] = yOffsets[dispatcher.EMOTIONS.ANGER];
		yOffsets[dispatcher.EMOTIONS.ENJOYMENT] =  y => y + 30;
		yOffsets[dispatcher.EMOTIONS.FEAR] = y => y + 45;
		yOffsets[dispatcher.EMOTIONS.SADNESS] = (y, d) => {
			// due to interpolation, steeper peaks result in
			// further distance to the label.
			// compensate here with manual offsets.
			return y + Math.pow(d[1].x/10, 2) * .4 * innerHeight + 70;
			//return y;
		};

		let leftAdjustConstants = {
			'anger': 20,
			'fear': -5,
			'disgust': 5,
			'enjoyment': 0
		};

		let aspectRatio = this.sectionContainer.offsetWidth / this.sectionContainer.offsetHeight;
		let leftAdjustManual = {
			'sadness': {
				'disappointment': -30,
				'discouragement': -20,
				'distraughtness': -10,
				'resignation': -18,
				'helplessness': 0,
				'hopelessness': 0,
				'misery': 10,
				'despair':13,
				'grief': 13,
				'sorrow': 13,
				'anguish': 10
			},
			'enjoyment': {
				'sensory pleasures': -40,
				'compassion/joy': -10,
				'amusement': -20,
				'rejoicing': -20,
				'schadenfreude': 0,
				'peace': -10,
				'relief': 0,
				'pride': 0,
				'fiero': 0,
				'naches': 0,
				'wonder': 0,
				'excitement': 0,
				'ecstasy': 0
			}
		};

		let leftAdjust = function(emotion, i, name) {
			if (emotion == 'sadness' || emotion == 'enjoyment') {
				return leftAdjustManual[emotion][name];
			}
			return leftAdjustConstants[emotion];
		};

		let positions = [];
		statesData.forEach(function(states, i){
			let d = ranges[i];
			positions.push({
				'name': states.name,
				'top': Math.round(yOffsets[emotion](stateSection.yScale(d[1].y), d)),
				'left': Math.round(stateSection.xScale(d[1].x)) + leftAdjust(emotion, i, states.name),
			});
		});
		// order from bottom to top of screen
		positions.sort(function(a,b){
			return b.top - a.top;
		});

		let positionsLookup = {};

		positions.forEach(function(label, i){
			if(positions[i + 1]){
				let diff = positions[i].top - positions[i + 1].top;
				// based on 16px font size
				if(diff < 30){
					positions[i + 1].top = positions[i].top - 30;
				}
			}
			positionsLookup[positions[i].name] = {'top': positions[i].top, 'left': positions[i].left};
		});

		if (!labels.size()) {
			// get a random label to set a box around it
			const randomLabelIndex = Math.floor(Math.random() * ranges.length);

			// if labels have not yet been rendered, create them
			labels.enter().append('div');

			labels
				.classed(`${emotion} label emotion-label`, true)
				.classed('default-interactive-helper', (d, i) => i === randomLabelIndex)
				.attr('data-popuptarget', (d,i) => `states:${statesData[i].name}`)
				.html((d, i) => '<h3>' + statesData[i].name.toUpperCase() + '</h3>')
				.style({
					left: function(d,i){return positionsLookup[statesData[i].name].left + 'px';},
					top: function(d,i){return positionsLookup[statesData[i].name].top + 'px';},
				});

			labels.exit().remove();

		}

		// set label positions whether new or existing
		labels
			.style({
				top: function(d,i){return positionsLookup[statesData[i].name].top + 'px';},
				left: function(d,i){return positionsLookup[statesData[i].name].left + 'px';},
				//top: d => (Math.round(yOffsets[emotion](stateSection.yScale(d[1].y), d)) + 'px')
			});
		if(!this.isBackgrounded){
			labels
				.each(function () {
					setTimeout(() => {
						this.classList.add('visible');
					}, LABEL_APPEAR_DELAY);
				});
		} else {
			labels
				.each(function () {
					setTimeout(() => {
						this.classList.remove('visible');
					}, LABEL_APPEAR_DELAY);
				});
		}

	},

	setEmotion: function (emotion, previousEmotion) {

		return new Promise((resolve, reject) => {

			if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
				emotion = 'anger';
			}
			let previousEmotion = this.currentEmotion;
			this.currentEmotion = emotion;

			// unselect any selected state when changing emotions.
			// currently only happens on mobile, but might also want to happen on desktop...
			// TODO: evaluate ^^.
			if (this.screenIsSmall) {
				this.selectedState = null;
				this.setHighlightedState(null);
			}

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
					previousGraph.style('-webkit-transform', null);
					previousLabels.style('-webkit-transform', null);
					previousGraph.classed('transitioning', false);
					previousLabels.classed('transitioning', false);
				});

				let containerWidth = document.querySelector('#states .graph-container').offsetWidth;

				// just place left or right one viewport, instead of adhering to column positions,
				// to avoid animations that are unnecessarily fast'n'flashy.
				dx = 1.25 * containerWidth;
				if (emotionState.index < this.emotionStates[previousEmotion].index) {
					dx *= -1;
				}
				// switch for going from enjoyment to anger, and back
				if (Math.abs(emotionState.index - this.emotionStates[previousEmotion].index) == this.emotions.length - 1){
					dx *= -1;
				}

				// delay to allow a little time for opacity to come up before translating
				setTimeout(() => {
					previousGraph.style('transform', 'translateX(' + -dx + 'px)');
					previousLabels.style('transform', 'translateX(' + -dx + 'px)');
					previousGraph.style('-webkit-transform', 'translateX(' + -dx + 'px)');
					previousLabels.style('-webkit-transform', 'translateX(' + -dx + 'px)');
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
				currentGraph.style('-webkit-transform', 'translateX(' + dx + 'px)');
				currentLabels.classed('transitioning', false);
				currentLabels.style('transform', 'translateX(' + dx + 'px)');
				currentLabels.style('-webkit-transform', 'translateX(' + dx + 'px)');
			}

			// delay to allow a little time for opacity to come up before translating
			setTimeout(() => {
				currentGraph.classed('transitioning active', true);
				currentGraph.style('transform', 'translateX(0)');
				currentGraph.style('-webkit-transform', 'translateX(0)');
				currentLabels.classed('transitioning active', true);
				currentLabels.style('transform', 'translateX(0)');
				currentLabels.style('-webkit-transform', 'translateX(0)');
			}, sassVars.emotions.panX.delay * 1000);

			// render labels regardless of if backgrounded or not
			this.renderLabels(this.currentEmotion);

			if (!this.isBackgrounded) {

				setTimeout(() => {
					// animate in emotion graph if first time viewing or was previously closed
					if (isClosed) {
						this.setEmotionScale(emotion, 1.0, false);
					}
				}, sassVars.emotions.scale.in.delay * 1000);


				setTimeout(() => {
					this.graphContainers[emotion].selectAll('.axis')
						.classed('visible', true);
				}, 1);

				this.resetCallout();

			} else {

				// immediately display emotion graph if first time viewing, and backgrounded
				if (isClosed) {
					this.setEmotionScale(emotion, 1.0, true);
				}

				// remove backgrounded state once pan begins
				setTimeout(() => {
					this.setBackgroundedState(null);
				}, sassVars.emotions.panX.delay * 1000);

				setTimeout(() => {
					this.graphContainers[emotion].selectAll('.axis')
						.classed('visible', false);
				}, 1);

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

		// `mix-blend-mode: multiply` does not work correctly with gradients in Firefox/Gecko.
		if (window.navigator.userAgent && ~window.navigator.userAgent.toLowerCase().indexOf('gecko') && ~window.navigator.userAgent.toLowerCase().indexOf('firefox')) {
			statePaths.style('mix-blend-mode', 'normal');
		}

		emotionState.rendered = true;

	},

	setEmotionScale: function (emotion, scale, immediate) {

		let graph = this.graphContainers[emotion].select('g'),
			ranges = this.emotionStates[emotion].ranges[scale];

		if (!ranges) {
			ranges = this.emotionStates[emotion].ranges[scale.toString()] = this.transformRanges(this.emotionStates[emotion].data, emotion, scale);
		}

		graph.selectAll('path.area')
			.data(ranges)
			.call(this.applyTransitions, immediate ? 'immediate' : null);

		this.emotionStates[emotion].scale = scale;

	},

	open: function (options) {
		this.setBackgrounded(options && options.inBackground, options);

		// if not in the background, clear out previousEmotion
		// to prevent unneccesary animation between emotions
		if (!options.inBackground) {
			this.currentEmotion = null;
		}

		if (options && (options.sectionName === dispatcher.SECTIONS.STATES || options.sectionName === dispatcher.SECTIONS.ACTIONS)) {
			// handle background click for deselection
			d3.select('#main').on('click', this.onBackgroundClick, false);
		}

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

	onResize: function (screenIsSmall) {

		this.screenIsSmall = screenIsSmall;

		// recalculate containers, scales, axes
		this.setUpGraphs(this.sectionContainer);

		for (let emotion in this.emotionStates) {

			// update each emotion state that has already been rendered
			let emotionState = this.emotionStates[emotion];
			if (emotionState.data) {
				let graph = this.graphContainers[emotion].select('g')
					.data(this.emotionStates[emotion].ranges[0]);
				graph.selectAll('linearGradient')
					.attr('x1', d => this.xScale(d[0].x))
					.attr('x2', d => this.xScale(d[2].x));
				graph.selectAll('path.area')
					.attr('d', this.areaGenerators[emotion]);

				// reposition labels
				this.renderLabels(emotion);
			}

		}

	},

	setActive: function (val) {

		if (this.currentEmotion) {

			// clear out any existing handlers
			if (this.screenIsSmall) {
				this.graphContainers[this.currentEmotion]
					.on('touchstart', null);
			} else {
				this.graphContainers[this.currentEmotion].selectAll('path.area')
					.on('mouseover', null)
					.on('mouseout', null)
					.on('click', null, true);
				this.labelContainers[this.currentEmotion].selectAll('div').select('h3')
					.on('mouseover', null)
					.on('mouseout', null)
					.on('click', null, true);
			}

			// add new handlers if active
			if (val) {

				if (this.screenIsSmall) {
					this.graphContainers[this.currentEmotion]
						.on('touchstart', this.onContainerTouchStart);
				} else {
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

		}

	},

	/**
	 * States section stays open, with limited interactivity,
	 * in actions, triggers, and moods. `setBackgrounded()` toggles this state.
	 */
	setBackgrounded: function (val, options) {

		return new Promise((resolve, reject) => {
			const hasBackgroundedClass = this.sectionContainer.classList.contains('backgrounded');

			// apply `states-in-out` class any time animating into or out of states section
			if (!val && hasBackgroundedClass || val && !hasBackgroundedClass) {
				this.sectionContainer.classList.add('states-in-out');

				// and deselect anything selected.
				// currently only happens on mobile, but might also want to happen on desktop...
				// TODO: evaluate ^^.
				if (this.screenIsSmall) {
					this.selectedState = null;
					this.setHighlightedState(null);
				}
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

	shouldDisplayPaginationUI: function () {

		// only display pagination UI while a state is selected
		return !!this.selectedState;

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
		let states = appStrings().getStr(`emotionsData.emotions.${ emotion }.states`).map(state => {
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

		// use index instead of key-matching.
		// workaround for i18n
		getOffsetByIndex (keyedOffsets, i) {

			let keys = Object.keys(keyedOffsets);
			if (keys.length <= i) return null;
			return keyedOffsets[keys[i]];

		},

		anger: function (states, strengthMod) {

			let points = this.isosceles(states, strengthMod);

			// manually offset each state
			let keyedOffsets = {
					'annoyance': [-0.5, 0],
					'exasperation': [-0.5, 0],
					'frustration': [-1.5, -0.5],
					'argumentativeness': [0, 0],
					'bitterness': [0.5, 0],
					'vengefulness': [0.5, 0],
					'fury': [0, 0]
				},
				offsets = states.map(s => s.name).map((name, i) => keyedOffsets[name] || this.getOffsetByIndex(keyedOffsets, states.length - i - 1) || [0, 0]);

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
					'revulsion': [-0.25, -0.3],
					'abhorrence': [0, 0],
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
					'sensory pleasures': [-1.5, 0],
					'compassion/joy': [-1.3, 0.2],
					'amusement': [-1, -.1],
					'rejoicing': [-2.3, -.5],
					'schadenfreude': [-1, -.5],
					'peace': [-.25, -.25],
					'relief': [-.75, -.5],
					'pride': [-.45, -.5],
					'fiero': [0, -.5],
					'naches': [0.45, -.4],
					'wonder': [.4, -.6],
					'excitement': [.8, -.5],
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
					'disappointment': [-0.95, 0],
					'discouragement': [-1.2, -0.25],
					'distraughtness': [0.25, 0.25],
					'resignation': [1.2, 0.5],
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
		// assume Chrome
		let gradientOffsets = [
			{ offset: '0%', color: 'rgba(255, 221, 98, 0.7)' },
			{ offset: '100%', color: 'rgba(248, 136, 29, 1.0)' }
		];
		// if firefox
		if(navigator.userAgent.indexOf('Firefox') > -1){
			gradientOffsets =[
				{ offset: '0%', color: 'rgba(255, 236, 119, 0.4)' },
				{ offset: '100%', color: 'rgba(255, 127, 0, 1.0)' }
			];
		}
		// if Safari
		if(navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1){
			gradientOffsets =[
				{ offset: '0%', color: 'rgba(241, 196, 83, 0.4)' },
				{ offset: '100%', color: 'rgba(248, 136, 29, 1.0)' }
			];
		}

		defs.append('linearGradient')
			.attr('id', 'enjoyment-gradient')
			.attr('xlink:href', '#states-gradient')
		.selectAll('stop')
			.data(gradientOffsets)
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

					// for the left and right edge, break into number of shorter pieces, and add some random variation to each
					var numFacets = 20;
					var distFromLineFactor = 10;

					// lots of brute force algebra to find the new point (newX, newY) along the line, and move it some distance perpendicularly
					// ideally would clean this up
					var getInBetweenValue = function(z1, z2, percentOfEdge, variation){
						return (z2 - z1) * percentOfEdge * variation + z1;
					};

					var transformPoint = function(a0, b0, a1, b1, percentOfEdge){
						// factor to vary percentOfEdge value
						var randomVariation = 1 + (Math.random()-.05) * 1/numFacets;

						// calculate length from point (a0,b0) to (a1,b1)
						var totalLineDistance = Math.pow(Math.pow(a1-a0,2) + Math.pow(b1-b0,2), .5);

						// find x and y coords for point along line
						var newPoint = {
							'x': getInBetweenValue(a0, a1, percentOfEdge, randomVariation),
							'y': getInBetweenValue(b0, b1, percentOfEdge, randomVariation)
						};

						// based on total distance, dist from line factor, and randomness, figure out how far to offset
						var distanceFromLine = (Math.random()-.5) * totalLineDistance / distFromLineFactor;

						var shiftToPerpendicular = {
							'x': (a1-a0) / totalLineDistance * distanceFromLine,
							'y': (b1-b0) / totalLineDistance * distanceFromLine
						};

						// return new point, shifted off line
						return {'x': newPoint.x + shiftToPerpendicular.x, 'y': newPoint.y - shiftToPerpendicular.y};
					};

					// construct array of points to include in line
					var leftPoints = [{'x': x0, 'y': y0}];
					var rightPoints = [{'x': x1, 'y': y1}];
					d3.range(1,numFacets - 2).forEach(function(facet){
						leftPoints.push(transformPoint(x0,y0,x1,y1,facet / numFacets));
						rightPoints.push(transformPoint(x1, y1, x2, y2, facet / numFacets));
					});
					leftPoints.push({'x': x1, 'y': y1});
					rightPoints.push({'x': x2, 'y': y2});

					// construct path
					var line = d3.svg.line().x(function(d){return d.x;}).y(function(d){return d.y;}).interpolate('basis');
					var left = line(leftPoints).replace("M", "");
					var right = line(rightPoints).replace("M", "");

					/*
					// code for parabolas
					let path = points[0].join(' ') +				// first anchor point
						` C${x0 + steepness*(x1-x0)} ${y0},` +		// first control point, inside curve
						`${x0 + roundness*(x1-x0)} ${y1},` + 		// second control point, outside curve
						points[1].join(' ') +						// middle anchor point
						` C${x1 + (1-roundness)*(x2-x1)} ${y1},` +	// third control point, outside curve
						`${x1 + (1-steepness)*(x2-x1)} ${y2},` +	// fourth control point, inside curve
						points[2].join(' ');						// last anchor point
						*/


					return left + "L" + right;
				}),

			enjoyment: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y))
				.interpolate((points) => {
					// cubic bezier with control points to left and right of middle anchor point
					let y1 = points[1][1],
						bulbousness = xScale(1);	// relative to overall graph, not to each shape

					let y0 = points[0][1];

					let path = points[0].join(' ') +							// first anchor point
							' C' + points[0].join(' ') + ',' +						// repeat first anchor point
							points[0][0]  + ' ' + (y0 - (y0 - y1) / 2) + ',' +			// first control point, outside curve to left
							points[1].join(' ') +	"L" + points[1].join(' ') +			// middle anchor point
							' C' + points[1].join(' ') + "," + points[2][0] + ' ' + (y0 - (y0 - y1) / 2) + ',' +	// second control point, outside curve to right
							points[2].join(' ');								// last anchor point

					return path;
				}),

			fear: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y))
				.interpolate((points) => {
					// concave bezier to left, convex to right
					let steepnessLeft = 1,
						roundnessRight = 0.7,
						x0 = points[0][0],
						y0 = points[0][1],
						x1 = points[1][0],
						y1 = points[1][1],
						x2 = points[2][0],
						y2 = points[2][1];

					// define triplets of points: start, control, and end for left and right edges
					var bezPointsLeft = [points[0],[x0 + steepnessLeft*(x1-x0), y0],points[1]];
					var bezPointsRight = [points[1],[x2, y1 + (1-roundnessRight)*(y2-y1)],points[2]];

					// bezier function over TIME (not distance) - but close enough approximation for us
					function bezPointAtT(points, t){
						function bezCalc(a,b,c,t){
							return Math.pow((1-t),2) * a + 2*(1-t)*t*b + Math.pow(t,2)*c;
						}
						function callBez(points, i, t){
							return bezCalc(points[0][i], points[1][i], points[2][i], t);
						}
						return [callBez(points, 0, t), callBez(points, 1, t)];
					}

					// call bez function with t values
					var facetAtT = {
						left: [.3, .5, .76],
						right: [.14, .4, .75]
					};

					// start path with bottom left point
					var path = x0 + "," + y0;
					// for each facet on left edge, calculate new coordinate point and add to path
					facetAtT.left.forEach(function(facetPoint){
						var coord = bezPointAtT(bezPointsLeft, facetPoint);
						path += ("L" + coord[0] + "," + coord[1]);
					});
					// top point
					path += ("L" + points[1][0] + "," + points[1][1]);
					// for each facet on right edge, calculate new coordinate point and add to path
					facetAtT.right.forEach(function(facetPoint){
						var coord = bezPointAtT(bezPointsRight, facetPoint);
						path += ("L" + coord[0] + "," + coord[1]);
					});
					// finish with bottom right, then bottom left to close the shape
					path += ("L" + points[2][0] + "," + points[2][1] + "L" + points[0][0] + "," + points[0][1]);

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
				})(0.35),
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
			},

			immediate: {
				ease: d3.ease('linear'),
				delay: 0,
				duration: 0
			}

		};

	},

	applyEffects: function (selection) {

		let isSafari = navigator.userAgent.indexOf('Safari') != -1 && navigator.userAgent.indexOf('Chrome') == -1;
		let isFirefox = navigator.userAgent.indexOf('Firefox') > -1;

		if (this.currentEmotion === 'sadness') {
			if(isSafari){
				// blur immediately, to avoid awkward color switch
				selection.attr('filter', 'url(#sadness-blur-1)');
			} else if(!isFirefox) {
				setTimeout(() => {
					selection.attr('filter', 'url(#sadness-blur-1)');
				}, 0.8 * this.transitions.sadness.duration);
			}

			// non firefox
			if(!isFirefox){
				setTimeout(() => {
					selection.attr('filter', 'url(#sadness-blur-2)');
				}, 0.9 * this.transitions.sadness.duration);
				setTimeout(() => {
					selection.attr('filter', 'url(#sadness-blur-3)');
				}, 1.0 * this.transitions.sadness.duration);
			} else {
				// for firefox, not as much blur & later
				setTimeout(() => {
					selection.attr('filter', 'url(#sadness-blur-1)');
				}, 1.0 * this.transitions.sadness.duration);
				setTimeout(() => {
					selection.attr('filter', 'url(#sadness-blur-2)');
				}, 1.1 * this.transitions.sadness.duration);
			}
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
		this.selectedState = statesData.name;
		this.setHighlightedState(statesData.name);
		if (this.isBackgrounded) {
			dispatcher.setEmotionState(statesData.name, true);
		} else {
			dispatcher.popupChange('states', statesData.name, statesData.desc);
			// dispatcher.changeCallout(this.currentEmotion, statesData.name, statesData.desc);
		}

	},

	onContainerTouchStart: function () {

		this.touchedShape = null;
		this.graphContainers[this.currentEmotion]
			.on('touchmove', this.onContainerTouchMove)
			.on('touchend', this.onContainerTouchEnd)
			.on('touchcancel', this.onContainerTouchEnd);

		this.onContainerTouchMove();

	},

	onContainerTouchMove: function () {

		let { event } = d3;
		if (!event) return;

		let touchedShape = document.elementFromPoint(event.touches[0].clientX, event.touches[0].clientY),
			_states = this;

		if (touchedShape.classList.contains('area')) {
			if (touchedShape !== this.touchedShape) {
				// moving into a shape
				this.touchedShape = touchedShape;
				this.graphContainers[this.currentEmotion].selectAll('path.area')
				.each(function (d, i) {
					if (this === touchedShape) {
						_states.onStateClick(d, i);
					}
				});
			}
		} else if (this.touchedShape) {
			// moving out of a shape
			this.touchedShape = null;
			this.onStateMouseOut();
		}

		// if a shape was just touched,
		// kill the event before it can trigger onBackgroundClick
		if (this.touchedShape) {
			d3.event.stopImmediatePropagation();
			d3.event.preventDefault();
		}

	},

	onContainerTouchEnd: function (event) {

		this.graphContainers[this.currentEmotion]
			.on('touchmove', null)
			.on('touchend', null)
			.on('touchcancel', null);

	},

	onBackgroundClick: function () {

		this.selectedState = null;
		this.setHighlightedState(null);
		// check if on states or not
		if (this.isBackgrounded) {
			// check to see if any action labels are popped - if no, dispatch emotion state, if yes reset popups
			if(d3.selectAll('.label').filter('.popped')[0].length == 0){
				dispatcher.setEmotionState(null, true);
			} else {
				dispatcher.popupChange();
			}
		} else {
			this.resetCallout();
		}

	},

	setBackgroundedState: function (state) {

		this.backgroundedState = state;
		this.displayBackgroundedStates(state);
		this.setHighlightedState(state);

	},

	// does not set any state, just displays.
	displayBackgroundedStates: function (states) {

		let singleStateName = '',
			classes = {};

		if (!states) {
			singleStateName = this.backgroundedState;
		} else if (states.length === 1) {
			singleStateName = states[0];
		}

		_.values(dispatcher.EMOTIONS).forEach(emotion => {
			classes[emotion] = emotion === this.currentEmotion;
		});

		this.displayHighlightedStates(states);

	},

	paginateElement: function (dir) {

		// states are sorted from highest to lowest
		dir *= -1;

		let nextIndex = 0;

		if (this.selectedState) {
			let statesData = this.statesData[this.currentEmotion];

			// sort pagination order to match ascending peak height
			let ranges = this.transformRanges(statesData, this.currentEmotion, 1.0)
				.map((r, i) => ({
					y: r[1].y,
					index: i
				}))
				.sort((a, b) => b.y - a.y);

			let sortedStates = ranges.map(r => statesData[r.index]);

			nextIndex = sortedStates.findIndex(s => s.name === this.selectedState) + dir;
			nextIndex = nextIndex >= sortedStates.length ? 0 : nextIndex < 0 ? sortedStates.length - 1 : nextIndex;

			// map back to original array order
			nextIndex = statesData.findIndex(s => s.name === sortedStates[nextIndex].name);
		}

		this.onStateClick(null, nextIndex);

	},

	setHighlightedState: function (state) {

		this.highlightedState = state;
		this.displayHighlightedStates(null);

	},

	// if both states and this.highlightedState are null, this sets state
	displayHighlightedStates: function (states) {

		// essentially clear state going into triggers
		if (!states && !this.highlightedState) {
			this.selectedState = null;
		}

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

		} else {

			graphContainer.selectAll('path.area')
				.classed('unhighlighted', false);
		}

		this.setLabelStates(labelContainer, states);
	},

	/**
	 * labels can have one of three states:
	 * 1 - 'highlighted'
	 * 2 - 'selected'
	 * 3 - 'muted'
	 */
	setLabelStates: function(labelContainer, highlighted) {
		if (!labelContainer) return;

		const labels = labelContainer.selectAll('.label');
		labels
			.classed('highlighted', false)
			.classed('muted', false)
			.classed('selected', false);

		highlighted = (highlighted && highlighted.length) ? highlighted[0] : null;
		const selected = this.selectedState;

		if (selected || highlighted){
			labels
				.each(function() {
					const elm = d3.select(this);
					const target = elm.attr('data-popuptarget');
					if (target.indexOf(selected) > -1) {
						elm.classed('selected', true);
					} else if (target.indexOf(highlighted) > -1) {
						elm.classed('highlighted', true);
					} else {
						elm.classed('muted', true);
					}
				});

			// remove default-interactive-helper once user highlights something
			labelContainer.select('.default-interactive-helper')
				.classed('default-interactive-helper', false);
		}
	},

	resetCallout: function () {
		dispatcher.popupChange();
		dispatcher.changeCallout(this.currentEmotion, appStrings().getStr('emotionsData.metadata.states.header'), appStrings().getStr('emotionsData.metadata.states.body'));
	}

};
