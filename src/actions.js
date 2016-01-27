import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';
import states from './states.js';

const VALENCES = {
	CONSTRUCTIVE: 1,
	BOTH: 2,
	DESTRUCTIVE: 3,
	NONE: 4
};

const ARROW_SHAPE = [
	{ x: 0.0, y: 0.0 },
	{ x: 0.75, y: -0.01 },
	{ x: 1.0, y: 0 },
	{ x: 0.75, y: 0.01 },
	{ x: 0.0, y: 0.0 }
];

export default {

	isInited: false,
	currentEmotion: null,
	actionsData: null,
	backgroundSections: [ states ],

	labelContainers: null,
	graphContainers: null,

	
	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.actionsData = this.parseActions();

		this.initContainers(containerNode);

		this.initLabels(containerNode);

		this.setUpGraphs(containerNode);

		this.scaledLineGenerator = this.scaledLineGenerator.bind(this);
		this.arcTween = this.arcTween.bind(this);
		this.onActionMouseOver = this.onActionMouseOver.bind(this);
		this.onActionMouseOut = this.onActionMouseOut.bind(this);
		this.onActionMouseClick = this.onActionMouseClick.bind(this);
		this.onValenceMouseOver = this.onValenceMouseOver.bind(this);
		this.onValenceMouseOut = this.onValenceMouseOut.bind(this);
		this.onValenceMouseClick = this.onValenceMouseClick.bind(this);

		this.isInited = true;

	},

	initContainers: function (containerNode) {

		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			let actionsContainer = document.createElement('div');
			actionsContainer.classList.add('actions-container');
			actionsContainer.classList.add(emotion);

			let graphContainer = document.createElement('div');
			graphContainer.classList.add('graph-container');
			actionsContainer.appendChild(graphContainer);

			containerNode.appendChild(actionsContainer);

		});

	},

	initLabels: function (containerNode) {

		this.labelContainers = {};
		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			let container = d3.select('.' + emotion + '.actions-container'),
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
			top: 25,		// actions graph is upside down, so 'top' means bottom of the screen
			right: 100,
			bottom: 10,
			left: 100
		};

		// All the same size, just grab the first one
		let graphContainer = containerNode.querySelector('.graph-container'),
			innerWidth = graphContainer.offsetWidth - margin.left - margin.right,
			h = Math.max(graphContainer.offsetHeight, 0.5 * graphContainer.offsetWidth),
			innerHeight = h - margin.top - margin.bottom;

		// 
		// d3/svg setup
		// 
		let section = this,
			transformedHeight = Math.sqrt(3) / 2 * innerHeight,	// from rotateX(60deg) applied to #action-graph-container
			radius = Math.min(0.5 * innerWidth, transformedHeight * 0.75);	// TODO: revisit this magic number munging to keep everything on-screen

		this.lineGenerator = d3.svg.line.radial()
			.radius(d => d.x * radius)
			.angle(d => 2*Math.PI * (1 - d.y))
			.interpolate('cardinal');

		this.pieLayout = d3.layout.pie()
			.sort(null)
			.value(d => d.size)
			.startAngle(0.5 * Math.PI)
			.endAngle(1.5 * Math.PI);

		this.arcGenerator = d3.svg.arc()
			.innerRadius(0)
			.outerRadius(radius);

		//
		// Set up each graph
		// 
		this.graphContainers = {};
		_.values(dispatcher.EMOTIONS).forEach((emotion, i) => {

			let graphContainer = document.querySelector('#actions .' + emotion + ' .graph-container');

			let svg = d3.select(graphContainer).append('svg')
				.attr('width', graphContainer.offsetWidth)
				.attr('height', h);

			let graph = svg.append('g')
				.attr('transform', 'translate(' + (margin.left + 0.5*innerWidth) + ',' + margin.top + ')');

			graph.append('g')
				.classed('valences', true);

			this.graphContainers[emotion] = graph;

		});

		// create an <svg> solely for <defs> shared across all emotions via xlink:href
		let defsSvg = d3.select(containerNode).append('svg')
			.classed('actions-defs', true);
		this.setUpDefs(defsSvg.append('defs'), radius);

	},

	scaledLineGenerator: function (selection, scale) {

		return selection.attr('d', d =>
			this.lineGenerator(d.paths.map(path =>
				({
					x: path.x * scale,
					y: path.y * scale
				})
			))
		);

	},

	// from: http://bl.ocks.org/mbostock/1346410
	arcTween: function (selection) {
		let arc = this.arcGenerator;
		selection.attrTween('d', function (a) {
			let i = d3.interpolate(this._current, a);
			this._current = i(0);
			return function (t) {
				return arc(i(t));
			};
		});
	},

	parseActions: function () {

		let lowercase = str => { return str.toLowerCase(); };

		let actionsData = Object.keys(dispatcher.EMOTIONS).reduce((actionsOutput, emotionKey) => {

			let emotionName = dispatcher.EMOTIONS[emotionKey],
				statesData = emotionsData.emotions[emotionName].states;

			// copy list of all actions for emotion with lowercased names, and alpha sort
			let allActionsForEmotion = emotionsData.emotions[emotionName].actions.map(action => {
				return Object.assign({}, action, {
					name: action.name.toLowerCase()
				});
			}).sort((a, b) => {
				if (a.name < b.name) return -1;
				else if (a.name > b.name) return 1;
				else return 0;
			});

			// add additional data for each of allActionsForEmotion,
			// and compile hash keyed by name for lookup below
			let allActionsForEmotionByName = {},
				numAllActions = allActionsForEmotion.length;
			allActionsForEmotion.forEach((action, i) => {
				action.paths = ARROW_SHAPE.map(pt => ({
					x: pt.x,
					y: pt.y
				}));
				action.rotation = (90 + (numAllActions-i-1) * 180/(numAllActions-1));
				action.states = [];
				allActionsForEmotionByName[action.name] = action;
			});

			// iterate over states for each emotion and compile actions for each state.
			let actionsByState = statesData.reduce((statesOutput, state) => {

				let stateName = state.name.toLowerCase();

				// copy actions from source data and lowercase,
				// dedupe across valences and filter out any that do not have prototypical definitions,
				// alpha sort within valence
				let actionsBoth = state.actions.both.map(lowercase).filter(action => {
						return !!allActionsForEmotionByName[action];
					}).sort(),
					actionsCon = state.actions.con.map(lowercase).filter(action => {
						return !!allActionsForEmotionByName[action] &&
							!~state.actions.both.indexOf(action);
					}).sort(),
					actionsDes = state.actions.des.map(lowercase).filter(action => {
						return !!allActionsForEmotionByName[action] &&
							!~state.actions.both.indexOf(action);
					}).sort(),

					// count number of actions within each valence
					numActionsCon = actionsCon.length,
					numActionsBoth = actionsBoth.length,
					numActionsDes = actionsDes.length,

					// concatenate deduped and sorted actions into a single list
					// (in order of left-to-right display on-screen)
					allActionsForState = actionsCon.concat(actionsBoth).concat(actionsDes),
					numAllActionsForState = allActionsForState.length;

				let actionByName,
					action;
				allActionsForState = allActionsForState.map((actionName, i) => {

					// copy prototypical action name/description
					actionByName = allActionsForEmotionByName[actionName];
					action = {
						name: actionByName.name,
						desc: actionByName.desc
					};

					// calculate paths and rotation
					action.paths = ARROW_SHAPE.map(pt => ({
						x: pt.x,
						y: pt.y
					}));
					action.rotation = (90 + (numAllActionsForState-i-1) * 180/(numAllActionsForState-1));

					// determine valence based on earlier sorting
					if (i < numActionsCon) {
						action.valence = VALENCES.CONSTRUCTIVE;
					} else if (i < numActionsCon + numActionsBoth) {
						action.valence = VALENCES.BOTH;
					} else if (i < numActionsCon + numActionsBoth + numActionsDes) {
						action.valence = VALENCES.DESTRUCTIVE;
					}

					// cross-reference states to action
					if (!~actionByName.states.indexOf(stateName)) {
						actionByName.states.push(stateName);
					}

					return action;

				});

				// calculate weight for each valence for this state's action
				let valenceWeights = Object.keys(VALENCES).map(valenceName => ({
					name: valenceName,
					size: valenceName === 'CONSTRUCTIVE' ? numActionsCon :
							valenceName === 'BOTH' ? numActionsBoth : 
							valenceName === 'DESTRUCTIVE' ? numActionsDes : 0
				})).reverse();
				// subtract 0.5 from the first and last size,
				// to place the drawn boundary halfway between adjacent action arrows
				let firstNonEmptyWeight,
					lastNonEmptyWeight;
				valenceWeights.forEach(weight => {
					if (weight.size) {
						if (!firstNonEmptyWeight) {
							firstNonEmptyWeight = weight;
						} else {
							lastNonEmptyWeight = weight;
						}
					}
				});
				if (firstNonEmptyWeight) {
					firstNonEmptyWeight.size -= 0.5;
				}
				if (lastNonEmptyWeight) {
					lastNonEmptyWeight.size -= 0.5;
				}

				statesOutput[state.name.toLowerCase()] = {
					actions: allActionsForState,
					valenceWeights: valenceWeights
				};

				return statesOutput;

			}, {});


			actionsOutput[emotionName] = {
				allActions: allActionsForEmotion,
				actions: actionsByState
			};

			return actionsOutput;

		}, {});
	
		return actionsData;

	},

	// TODO: DRY this out, copied almost exactly from states.js
	// set up global gradients and xlink:href to them from here and states.js
	setUpDefs: function (defs, radius) {

		// base gradient
		defs.append('linearGradient')
			.attr('id', 'actions-gradient')
			.attr('gradientUnits', 'userSpaceOnUse')
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', 0)
			.attr('y2', -radius);

		// anger
		defs.append('linearGradient')
			.attr('id', 'actions-anger-gradient')
			.attr('xlink:href', '#actions-gradient')
		.selectAll('stop')
			.data([
				{ offset: '20%', color: 'rgba(228, 135, 102, 0.2)' },
				{ offset: '100%', color: 'rgba(204, 28, 43, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// disgust
		defs.append('linearGradient')
			.attr('id', 'actions-disgust-gradient')
			.attr('xlink:href', '#actions-gradient')
		.selectAll('stop')
			.data([
				{ offset: '20%', color: 'rgba(0, 142, 69, 0.3)' },
				{ offset: '66%', color: 'rgba(0, 122, 61, 0.8)' },
				{ offset: '100%', color: 'rgba(0, 104, 55, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// enjoyment
		defs.append('linearGradient')
			.attr('id', 'actions-enjoyment-gradient')
			.attr('xlink:href', '#actions-gradient')
		.selectAll('stop')
			.data([
				{ offset: '20%', color: 'rgba(241, 196, 83, 0.8)' },
				{ offset: '100%', color: 'rgba(248, 136, 29, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// fear
		defs.append('linearGradient')
			.attr('id', 'actions-fear-gradient')
			.attr('xlink:href', '#actions-gradient')
		.selectAll('stop')
			.data([
				{ offset: '20%', color: 'rgba(248, 58, 248, 0.1)' },
				{ offset: '100%', color: 'rgba(143, 39, 139, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// sadness
		defs.append('linearGradient')
			.attr('id', 'actions-sadness-gradient')
			.attr('xlink:href', '#actions-gradient')
		.selectAll('stop')
			.data([
				{ offset: '20%', color: 'rgba(200, 220, 240, 1.0)' },
				{ offset: '66%', color: 'rgba(30, 152, 211, 1.0)' },
				{ offset: '100%', color: 'rgba(64, 70, 164, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

	},

	setEmotion: function (emotion) {

		if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
			emotion = 'anger';
		}
		let previousEmotion = this.currentEmotion;
		this.currentEmotion = emotion;

		// transition graphs and labels
		let dx = 0;
		if (previousEmotion) {
			let previousContainer = d3.select('.actions-container.' + previousEmotion);
			previousContainer.classed('active', false);
			previousContainer.on('transitionend', event => {
				previousContainer.on('transitionend', null);
				previousContainer.style('transform', null);
				previousContainer.classed('transitioning', false);
			});

			let containerWidth = document.querySelector('#actions .graph-container').offsetWidth,
				emotions = _.values(dispatcher.EMOTIONS);

			// just place left or right one viewport, instead of adhering to column positions,
			// to avoid animations that are unnecessarily fast'n'flashy.
			dx = 1.25 * containerWidth;
			if (emotions.indexOf(emotion) < emotions.indexOf(previousEmotion)) {
				dx *= -1;
			}

			// delay to allow a little time for opacity to come up before translating
			setTimeout(() => {
				previousContainer.style('transform', 'translateX(' + -dx + 'px)');
			}, sassVars.emotions.panX.delay * 1000);
		}

		let currentContainer = d3.select('.actions-container.' + emotion);
		if (currentContainer.classed('transitioning')) {
			// if new emotion is still transitioning, remove transitionend handler
			currentContainer.on('transitionend', null);
		} else {
			// else, move into position immediately to prepare for transition
			currentContainer.classed('transitioning', false);
			currentContainer.style('transform', 'translateX(' + dx + 'px)');
		}

		// delay to allow a little time for opacity to come up before translating
		setTimeout(() => {
			currentContainer.classed('transitioning active', true);
			currentContainer.style('transform', 'translateX(0)');
		}, sassVars.emotions.panX.delay * 1000);

		if (!this.isBackgrounded) {
			states.setActive(true);
		}

		let openDelay = 1500;
		this.setStateTimeout = setTimeout(() => {
			dispatcher.setEmotionState(null, true);
		}, openDelay);

	},

	setState: function (state) {

		if (!this.isBackgrounded) {
			this.setHighlightedAction(null);
		}

		if (state && state === this.currentState) { return; }
		this.currentState = state;

		let stateActionsData,
			currentActionsData;

		if (state) {

			stateActionsData = this.actionsData[this.currentEmotion].actions[this.currentState];
			if (!stateActionsData) {
				console.warn('No actions found for state "' + this.currentState + '" in emotion "' + this.currentEmotion + '".');
				return;
			}
			currentActionsData = stateActionsData.actions;

		} else {

			currentActionsData = this.actionsData[this.currentEmotion].allActions;

		}

		let emotionGradientName = 'actions-' + this.currentEmotion + '-gradient',
			graphContainer = this.graphContainers[this.currentEmotion];

		let arrowSelection = graphContainer.selectAll('g.action-arrow')
			.data(currentActionsData, d => d.name);

		// update
		arrowSelection.transition()
			.duration(sassVars.actions.update.time)
			.attr('transform', d => 'rotate(' + d.rotation + ')');

		// enter
		let arrowEnterSelection = arrowSelection.enter().append('g')
			.attr('class', 'action-arrow')
			.attr('transform', d => 'rotate(' + d.rotation + ')');
		if (!this.isBackgrounded) {
			arrowEnterSelection
				.on('mouseover', this.onActionMouseOver)
				.on('mouseout', this.onActionMouseOut)
				.on('click', this.onActionMouseClick);
		}
		arrowEnterSelection.append('path')
			.attr('fill', (d, i) => 'url(#' + emotionGradientName + ')')
			.call(this.scaledLineGenerator, 0.0);
			
		arrowEnterSelection.transition()
			.duration(sassVars.actions.add.time)
			.delay(function (d, i) { return i * 50; })
		.select('path')
			.call(this.scaledLineGenerator, 1.0);

		// exit
		arrowSelection.exit().transition()
			.duration(sassVars.actions.remove.time)
			.remove()
		.select('path')
			.call(this.scaledLineGenerator, 0.0);


		if (!this.isBackgrounded) {

			this.renderLabels(currentActionsData);

			if (state) {

				// valences underlay
				let valenceSelection = graphContainer.select('g.valences').selectAll('path.valence')
					.data(this.pieLayout(stateActionsData.valenceWeights), d => d.data.name);

				// update
				valenceSelection.transition()
					.duration(sassVars.actions.update.time)
					.call(this.arcTween);

				// enter
				valenceSelection.enter().append('path')
					.attr('class', d => 'valence ' + d.data.name.toLowerCase())
					.attr('d', this.arcGenerator)
					.each(function(d) { this._current = d; }) // store the initial angles for arcTween
					.style('opacity', 0.0)
					.on('mouseover', this.onValenceMouseOver)
					.on('mouseout', this.onValenceMouseOut)
					.on('click', this.onValenceMouseClick)
				.transition()
					.duration(sassVars.actions.add.time)
					.delay(500)
					.style('opacity', 1.0);

			} else {

				this.resetCallout();

				graphContainer.select('g.valences').selectAll('path.valence')
				.transition()
					.duration(sassVars.actions.remove.time)
					.style('opacity', 0.0)
					.remove();
			}

		}

	},

	clearStates: function (duration) {

		if (this.currentEmotion) {
			this.graphContainers[this.currentEmotion].selectAll('g.action-arrow')
				.on('mouseover', null)
				.on('mouseout', null)
			.data([]).exit().transition()
				.duration(duration)
				.remove()
			.select('path')
				.call(this.scaledLineGenerator, 0.0);
		}

		this.renderLabels(null);

		if (!this.isBackgrounded) {
			this.resetCallout();
		}

		if (this.currentEmotion) {
			this.graphContainers[this.currentEmotion].select('g.valences').selectAll('path.valence')
			.transition()
				.duration(duration)
				.style('opacity', 0.0)
				.remove();
		}

	},

	setHighlightedState: function (state) {

		if (!state) {

			this.displayHighlightedAction(null);
			this.displayHighlightedValence(null);

		} else {

			let stateActions = this.actionsData[this.currentEmotion].actions[state].actions.map(action => action.name),
				graphContainer = this.graphContainers[this.currentEmotion],
				labelContainer = this.labelContainers[this.currentEmotion];

			graphContainer.selectAll('g.action-arrow')
				.style('opacity', (data, index) => ~stateActions.indexOf(data.name) ? 1.0 : 0.2);

			labelContainer.selectAll('div.label')
				.style('opacity', (data, index) => ~stateActions.indexOf(data.name) ? 1.0 : 0.2);

		}
		
	},

	renderLabels: function (actionsData) {

		if (!this.currentEmotion) { return; }

		let labelText = d => {
			let prefix = '';
			switch (d.valence) {
				case VALENCES.CONSTRUCTIVE:
					prefix = '<span class="label-valence plus">+</span> ';
					break;
				case VALENCES.BOTH:
					prefix = '<span class="label-valence">+<span class="short-slash">/</span>-</span>';
					break;
				case VALENCES.DESTRUCTIVE:
					prefix = '<span class="label-valence minus">-</span> ';
					break;
			}
			return prefix + '<span class="label-name">' + d.name.toUpperCase() + '</span>';
		};

		let labelContainer = this.labelContainers[this.currentEmotion];
		if (actionsData) {

			const sqrt3 = Math.sqrt(3);
			let labelSize = this.lineGenerator.radius()({x:1}) + 50,
				labelSelection = labelContainer.selectAll('div.label')
					.data(actionsData, d => d.name);

			// update
			labelSelection.transition()
				.duration(sassVars.actions.update.time)
				.styleTween('transform', (() => (d, i, a) => {

					// BUG: `a` can refer to the value of an element that was removed from the selection.
					// in this case, the element being transitioned jumps to the removed element's position
					// at the start of the transition.
					// need to figure out how to skip elements that are no longer in the transition.
					// repro: click a different state to view a different set of actions.
					// another repro: navigate between actions for already-loaded emotions.

					// `a` is the previous value for the 'transform' style;
					// d3 stores this internally as a matrix string.
					// d3.transform() turns this string into a matrix object.
					let previousTranslate = d3.transform(a).translate;
					let previousRotation = Math.atan2(previousTranslate[1], previousTranslate[0]);
					let targetRotation = Math.PI * (d.rotation-90) / 180;
					let rot;

					return (t) => {
						rot = previousRotation + t * (targetRotation - previousRotation);
						return 'translate(' +
							labelSize * Math.cos(rot) + 'px,' +
							labelSize / sqrt3 * Math.sin(rot) + 'px)';
					};

				})());
			labelSelection.select('h3')
				.html(labelText);

			// enter
			let labelEnterSelection = labelSelection.enter().append('div')
				.classed('label ' + this.currentEmotion, true)
				.style('transform', d => 'translate(' + labelSize * Math.cos(Math.PI*(d.rotation-90)/180) + 'px,' + labelSize * Math.sin(Math.PI*(d.rotation-90)/180) / sqrt3 + 'px')
				.style('opacity', 0.0);
			labelEnterSelection.append('div').append('h3')
				.html(labelText)
				.on('mouseover', this.onActionMouseOver)
				.on('mouseout', this.onActionMouseOut)
				.on('click', this.onActionMouseClick);

			labelEnterSelection.transition()
				.duration(sassVars.actions.add.time)
				.delay(sassVars.actions.add.delay)
				.style('opacity', 1.0);

			// exit
			labelSelection.exit().transition()
				.duration(sassVars.actions.remove.time)
				.style('opacity', 0.0)
				.remove();

		} else {
			
			labelContainer.selectAll('div.label')
				.on('mouseover', null)
				.on('mouseout', null)
			.transition()
				.duration(1000)
				.style('opacity', 0.0)
				.remove();

		}

	},

	open: function (options) {

		this.setBackgrounded(options && options.inBackground, options);

		// clear selected state to display all actions for emotion,
		// after a delay (transition time from _states.scss::#states)
		let openDelay = 1500;

		this.openTimeout = setTimeout(() => {
			if (!options || !options.inBackground) {
				this.resetCallout();
			}
			// dispatcher.setEmotionState(null, true);
		}, openDelay);

	},

	close: function () {

		return new Promise((resolve, reject) => {

			clearTimeout(this.openTimeout);
			clearTimeout(this.setStateTimeout);

			this.clearStates(sassVars.actions.remove.time);

			setTimeout(() => {
				resolve();
			}, sassVars.actions.remove.time);

		});

	},

	/**
	 * Actions section stays open in triggers and moods, with limited interactivity.
	 * `setBackgrounded()` toggles this state.
	 */
	setBackgrounded: function (val, options) {

		return new Promise((resolve, reject) => {

			this.isBackgrounded = val;

			this.sectionContainer.classList[(val ? 'add' : 'remove')]('backgrounded');
			this.sectionContainer.classList[(options && (options.sectionName === dispatcher.SECTIONS.TRIGGERS) ? 'add' : 'remove')]('triggers');
			// this.hideChrome();
			// this.setActive(!val);

			this.renderLabels(null);

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	applyEventListenersToEmotion: function (emotion, handlersByEvent) {

		let graphContainer = this.graphContainers[emotion];
		Object.keys(handlersByEvent).forEach(event => {
			graphContainer.on(event, handlersByEvent[event]);
		});

	},

	setHighlightedAction: function (action, preventRecursion) {

		this.highlightedAction = action;

		if (!preventRecursion) {
			this.setHighlightedValence(null, true);
		}

		if (action) {
			dispatcher.changeCallout(this.currentEmotion, action.name, action.desc);
			states.displayHighlightedStates(action.states);
		} else {
			this.resetCallout();
			states.displayHighlightedStates(null);
		}

		this.displayHighlightedAction(action);

	},

	displayHighlightedAction: function (action) {

		let highlightedAction = action || this.highlightedAction || null,
			arrowSelection = this.graphContainers[this.currentEmotion].selectAll('g.action-arrow'),
			labelSelection = this.labelContainers[this.currentEmotion].selectAll('div.label');

		if (highlightedAction) {

			let stateActionsData;
			if (this.currentState) {
				stateActionsData = this.actionsData[this.currentEmotion].actions[this.currentState].actions;
			} else {
				stateActionsData = this.actionsData[this.currentEmotion].allActions;
			}

			arrowSelection
				.style('opacity', (data, index) => data.name === highlightedAction.name ? 1.0 : 0.2);

			labelSelection
				.style('opacity', (data, index) => data.name === highlightedAction.name ? 1.0 : 0.2);

		} else {

			arrowSelection
				.style('opacity', null);

			labelSelection
				.style('opacity', null);

		}

		if (!action && this.highlightedValence) {
			this.displayHighlightedValence();
		}

	},

	setHighlightedValence: function (valence, preventRecursion) {

		this.highlightedValence = valence;

		if (!preventRecursion) {
			this.setHighlightedAction(null, true);
		}

		if (valence) {
			let valenceKey;
			switch (valence) {
				case VALENCES.CONSTRUCTIVE:
					valenceKey = 0;
					break;
				case VALENCES.BOTH:
					valenceKey = 2;
					break;
				case VALENCES.DESTRUCTIVE:
					valenceKey = 1;
					break;
			}
			dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.actions.qualities[valenceKey].header, emotionsData.metadata.actions.qualities[valenceKey].body);
		} else {
			this.resetCallout();
		}

		this.displayHighlightedValence(valence);

	},

	displayHighlightedValence: function (valence) {

		if (!this.currentEmotion) { return; }

		valence = valence || this.highlightedValence || null;

		let valenceClass = Object.keys(VALENCES).find(key => VALENCES[key] === valence);
		if (valenceClass) {
			valenceClass = valenceClass.toLowerCase();
		}

		let graphContainer = this.graphContainers[this.currentEmotion];
		graphContainer.selectAll('path.valence')
			/*
			.call(function () {
				let highlighted = this.classed(valenceClass);
				console.log("classes:", this.node().classList);
				this.style('opacity', highlighted ? 1.0 : 0.5);
				this.classed('highlighted', highlighted);
			});*/
			.style('opacity', function () {
				if (valenceClass) {
					return this.classList.contains(valenceClass) ? 1.0 : 0.5;
				} else {
					return null;
				}
			})
			.classed('highlighted', function () {
				if (valenceClass) {
					return this.classList.contains(valenceClass);
				} else {
					return null;
				}
			});

		graphContainer.selectAll('g.action-arrow')
			.style('opacity', d => {
				if (valence) {
					return d.valence === valence ? 1.0 : 0.2;
				} else {
					return null;
				}
			});

	},

	onActionMouseOver: function (d, i) {

		this.displayHighlightedAction(d);

	},

	onActionMouseOut: function (d, i) {

		this.displayHighlightedAction(null);

	},

	onActionMouseClick: function (d, i) {

		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		this.setHighlightedAction(d);

	},

	onValenceMouseOver: function (d, i) {

		let valence = VALENCES[d.data.name];
		if (valence) {
			this.displayHighlightedValence(valence);
		}

	},

	onValenceMouseOut: function (d, i) {

		let valence = VALENCES[d.data.name];
		if (valence) {
			this.displayHighlightedValence(null);
		}

	},

	onValenceMouseClick: function (d, i) {

		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		let valence = VALENCES[d.data.name];
		if (valence) {
			this.setHighlightedValence(valence);
		}

	},

	resetCallout: function () {
		dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.actions.header, emotionsData.metadata.actions.body);
	}

};
