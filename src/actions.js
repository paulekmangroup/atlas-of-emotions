import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
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
	tempNav: null,
	
	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.scaledLineGenerator = this.scaledLineGenerator.bind(this);
		this.arcTween = this.arcTween.bind(this);
		this.onActionMouseOver = this.onActionMouseOver.bind(this);
		this.onActionMouseOut = this.onActionMouseOut.bind(this);
		this.onActionMouseClick = this.onActionMouseClick.bind(this);

		this.actionsData = this.parseActions();

		let graphContainer = document.createElement('div');
		graphContainer.id = 'action-graph-container';
		containerNode.appendChild(graphContainer);

		this.initLabels(containerNode);

		this.createTempNav(containerNode);

		// 
		// d3 conventional margins
		// 
		let margin = {
			top: 25,		// actions graph is upside down, so 'top' means bottom of the screen
			right: 100,
			bottom: 10,
			left: 100
		};

		let innerWidth = graphContainer.offsetWidth - margin.left - margin.right,
			h = Math.max(graphContainer.offsetHeight, 0.5 * graphContainer.offsetWidth),
			innerHeight = h - margin.top - margin.bottom;

		let svg = d3.select(graphContainer).append('svg')
			.attr('width', graphContainer.offsetWidth)
			.attr('height', h);

		this.actionGraphContainer = svg.append('g')
			.attr('transform', 'translate(' + (margin.left + 0.5*innerWidth) + ',' + margin.top + ')');

		this.actionGraphContainer.append('g')
			.classed('valences', true);

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

		this.setUpDefs(svg.append('defs'), radius);

		this.isInited = true;

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

	initLabels: function (containerNode) {

		this.labelContainer = d3.select(containerNode).append('div')
			.attr('id', 'action-labels');

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
				allActionsForEmotionByName[action.name] = action;
			});

			// iterate over states for each emotion and compile actions for each state.
			let actionsByState = statesData.reduce((statesOutput, state) => {

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
		this.currentEmotion = emotion;

		// TODO: transition between emotions:
		// pull all action arrows back into the continent
		// as the continent's shapes shrink back to the baseline,
		// then grow the new continent (states) and arrows (actions)
		
		if (!this.isBackgrounded) {
			this.tempNav.querySelector('.prev').innerHTML = '<a href="#states:' + emotion + '">STATES ▲</a>';
			this.tempNav.querySelector('.next').innerHTML = '<a href="#triggers:' + emotion + '">TRIGGERS ▼</a>';
			this.tempNav.classList.add('visible');
		}
		
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

		let emotionGradientName = 'actions-' + this.currentEmotion + '-gradient';

		let arrowSelection = this.actionGraphContainer.selectAll('g.action-arrow')
			.data(currentActionsData, d => d.name);

		// update
		arrowSelection.transition()
			.duration(1000)
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
			.duration(1000)
			.delay(function (d, i) { return i * 50; })
		.select('path')
			.call(this.scaledLineGenerator, 1.0);

		// exit
		arrowSelection.exit().transition()
			.duration(600)
			.remove()
		.select('path')
			.call(this.scaledLineGenerator, 0.0);


		if (!this.isBackgrounded) {

			this.renderLabels(currentActionsData);

			if (state) {

				// valences underlay
				let valenceSelection = this.actionGraphContainer.select('g.valences').selectAll('path.valence')
					.data(this.pieLayout(stateActionsData.valenceWeights), d => d.data.name);

				// update
				valenceSelection.transition()
					.duration(1000)
					.call(this.arcTween);

				// enter
				valenceSelection.enter().append('path')
					.attr('class', d => 'valence ' + d.data.name.toLowerCase())
					.attr('d', this.arcGenerator)
					.each(function(d) { this._current = d; }) // store the initial angles for arcTween
					.style('opacity', 0.0)
				.transition()
					.duration(1000)
					.delay(500)
					.style('opacity', 1.0);

			} else {

				this.resetCallout();

				this.actionGraphContainer.select('g.valences').selectAll('path.valence')
				.transition()
					.duration(1000)
					.style('opacity', 0.0)
					.remove();
			}

		}

	},

	clearStates: function (duration) {

		this.actionGraphContainer.selectAll('g.action-arrow')
			.on('mouseover', null)
			.on('mouseout', null)
		.data([]).exit().transition()
			.duration(duration)
			.remove()
		.select('path')
			.call(this.scaledLineGenerator, 0.0);

		this.renderLabels(null);

		if (!this.isBackgrounded) {
			this.resetCallout();
		}

		this.actionGraphContainer.select('g.valences').selectAll('path.valence')
		.transition()
			.duration(duration)
			.style('opacity', 0.0)
			.remove();

	},

	renderLabels: function (actionsData) {

		if (actionsData) {

			let labelSize = this.lineGenerator.radius()({x:1}) + 50,
				labelSelection = this.labelContainer.selectAll('div.label')
				.data(actionsData, d => d.name);
			
			// update
			labelSelection.transition()
				.duration(1000)
				.style('transform', d => 'rotate(' + d.rotation + 'deg)');
			labelSelection.select('h3').transition()
				.duration(1000)
				.style('transform', d => 'rotate(-' + d.rotation + 'deg) scaleY(1.73)');

			// enter
			let labelEnterSelection = labelSelection.enter().append('div')
				.classed('label ' + this.currentEmotion, true)
				.style('transform', d => 'rotate(' + d.rotation + 'deg)')
				.style('height', labelSize + 'px')
				.style('opacity', 0.0)
				.on('mouseover', this.onActionMouseOver)
				.on('mouseout', this.onActionMouseOut)
				.on('click', this.onActionMouseClick);
			labelEnterSelection.append('div').append('h3')
				.html(d => d.name.toUpperCase())
				.style('transform', d => 'rotate(-' + d.rotation + 'deg) scaleY(1.73)');
					
			labelEnterSelection.transition()
				.duration(1000)
				.style('opacity', 1.0);

			// exit
			labelSelection.exit().transition()
				.duration(600)
				.style('opacity', 0.0)
				.remove();

		} else {
			
			this.labelContainer.selectAll('div.label')
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
			dispatcher.setEmotionState(null);
		}, openDelay);

	},

	close: function () {

		return new Promise((resolve, reject) => {

			clearTimeout(this.openTimeout);

			this.tempNav.classList.remove('visible');

			let closeDuration = 600;

			this.clearStates(closeDuration);

			setTimeout(() => {
				resolve();
			}, closeDuration);

		});

	},

	/**
	 * Actions section stays open in moods, with limited interactivity.
	 * `setBackgrounded()` toggles this state.
	 */
	setBackgrounded: function (val, options) {

		return new Promise((resolve, reject) => {

			this.isBackgrounded = val;
			if (val) {
				this.tempNav.classList.remove('visible');
			}

			this.renderLabels(null);

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	setHighlightedAction: function (action) {

		this.highlightedAction = action;

		if (action) {
			dispatcher.changeCallout(this.currentEmotion, action.name, action.desc);
		} else {
			this.resetCallout();
		}

		this.displayHighlightedAction(action);

	},

	displayHighlightedAction: function (action) {

		let highlightedAction = action || this.highlightedAction || null;

		if (highlightedAction) {

			let stateActionsData;
			if (this.currentState) {
				stateActionsData = this.actionsData[this.currentEmotion].actions[this.currentState].actions;
			} else {
				stateActionsData = this.actionsData[this.currentEmotion].allActions;
			}

			d3.selectAll('g.action-arrow')
				.style('opacity', (data, index) => data.name === highlightedAction.name ? 1.0 : 0.2);

			this.labelContainer.selectAll('div.label')
				.style('opacity', (data, index) => data.name === highlightedAction.name ? 1.0 : 0.2);

			// .selectAll('linearGradient')
			// TODO: set stops with higher/lower opacity on #anger-gradient-{i}

		} else {

			d3.selectAll('g.action-arrow')
				.style('opacity', null);

			this.labelContainer.selectAll('div.label')
				.style('opacity', null);

		}

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

	resetCallout: function () {
		dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.actions.header, emotionsData.metadata.actions.body);
	},

	createTempNav (containerNode) {

		this.tempNav = document.createElement('div');
		this.tempNav.id = 'temp-actions-nav';
		containerNode.appendChild(this.tempNav);

		let prev = document.createElement('div');
		prev.classList.add('prev');
		this.tempNav.appendChild(prev);

		let next = document.createElement('div');
		next.classList.add('next');
		this.tempNav.appendChild(next);

	}

};
