import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import appStrings from '../static/appStrings.json';
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
	
	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.scaledLineGenerator = this.scaledLineGenerator.bind(this);
		this.onActionMouseOver = this.onActionMouseOver.bind(this);
		this.onActionMouseOut = this.onActionMouseOut.bind(this);
		this.onBackgroundClick = this.onBackgroundClick.bind(this);

		this.actionsData = this.parseActions();

		let graphContainer = document.createElement('div');
		graphContainer.id = 'action-graph-container';
		containerNode.appendChild(graphContainer);

		// TODO: 
		this.initLabels(containerNode);

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
		let section = this;
		this.lineGenerator = d3.svg.line.radial()
			.radius(d => d.x * 0.5*innerWidth)
			.angle(d => 2*Math.PI * (1 - d.y))
			.interpolate('cardinal');

		this.pieLayout = d3.layout.pie()
			.sort(null)
			.value(d => d.size)
			.startAngle(0.5 * Math.PI)
			.endAngle(1.5 * Math.PI);

		this.arcGenerator = d3.svg.arc()
			.innerRadius(0)
			.outerRadius(0.5*innerWidth);

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
	arcTween: function (a) {
		let i = d3.interpolate(this._current, a);
		this._current = i(0);
		return function (t) {
			// return this.arcGenerator(i(t));
			return d3.svg.arc()
				.innerRadius(0)
				.outerRadius(0.5*689)(i(t));
		};
	},

	initLabels: function (containerNode) {

		this.labelContainer = d3.select(containerNode).append('div')
			.attr('id', 'action-labels');

	},

	parseActions: function () {

		// For each state in each emotion, create an array of actions ordered alphabetically, by valence.
		// Each action is a hash containing:
		// 	{
		// 		name: 'actionName',
		// 		valence: 'NONE|CONSTRUCTIVE|DESTRUCTIVE|BOTH',
		// 		paths: Array of points to draw the shape, copied from ARROW_PATHS
		// 		rotation: value from 0<>1 at which to display action arrow along half-circle (only present in sortedActions)
		// 	}
		let actionsData = Object.keys(dispatcher.EMOTIONS).reduce((actionsOutput, emotionKey) => {

			let emotionName = dispatcher.EMOTIONS[emotionKey],
				statesData = emotionsData.emotions[emotionName].states;

			// iterate over states for each emotion
			actionsOutput[emotionName] = Object.keys(statesData).reduce((statesOutput, stateName) => {

				let actionData = statesData[stateName].actions;

				// generate actions for each state
				let allActions = Object.keys(actionData).map((actionName, i, actions) => {
					let action = { name: actionName },
						valencesData = actionData[actionName].valences;
					if (valencesData.length === 2 || ~valencesData.indexOf('choice')) {
						action.valence = VALENCES.BOTH;
					} else if (~valencesData.indexOf('constructive')) {
						action.valence = VALENCES.CONSTRUCTIVE;
					} else if (~valencesData.indexOf('destructive')) {
						action.valence = VALENCES.DESTRUCTIVE;
					} else {
						console.warn('Invalid valence data for action "' + actionName + '" in state "' + stateName + '" of emotion "' + emotionName + '"');
						action.valence = VALENCES.NONE;
					}
					return action;

				// sort in valence order
				}).sort((a, b) => a.valence - b.valence);

				// alpha sort by valence
				let sortedActions = {};
				_.values(VALENCES).forEach(valenceVal => {
					sortedActions[valenceVal] = allActions
						.filter(action => action.valence === valenceVal)
						.sort((a, b) => {
							if (a.name < b.name) return -1;
							else if (a.name > b.name) return 1;
							else return 0;
						});
				});
				
				// compile paths and calculate rotation for each action,
				// stepping through sortedActions.
				let i = 0,
					totalNumActions = allActions.length;
				_.values(VALENCES).forEach(valenceVal => {
					sortedActions[valenceVal].forEach(action => {
						action.paths = ARROW_SHAPE.map(pt => ({
							x: pt.x,
							y: pt.y
						}));
						action.rotation = (90 + (totalNumActions-i-1) * 180/(totalNumActions-1));
						i++;
					});
				});

				let allSortedActions = _.values(VALENCES).reduce((acc, valenceVal) => {
					acc = acc.concat(sortedActions[valenceVal]);
					return acc;
				}, []);

				let valenceWeights = Object.keys(VALENCES).map(valenceName => ({
					name: valenceName,
					size: sortedActions[VALENCES[valenceName]].length
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

				statesOutput[stateName] = {
					actions: allSortedActions,
					valenceWeights: valenceWeights
				};

				return statesOutput;

			}, {});

			return actionsOutput;

		}, {});
	
		return actionsData;

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
		

		this.currentEmotion = emotion;

		let emotionActionsData = this.actionsData[this.currentEmotion];

	},

	setState: function (state) {

		this.currentState = state;

		if (state) {

			let stateActionsData = this.actionsData[this.currentEmotion][this.currentState];
			if (!stateActionsData) {
				console.warn('No actions found for state "' + this.currentState + '" in emotion "' + this.currentEmotion + '".');
				return;
			}

			// 
			// TODO SUN:
			// 
			// labels on states
			// constructive/both/destructive areas underneath, labeled
			// color per emotion, if not gradient until later
			// 
			// since there can be many (15 in bitterness!) con- or destructive actions per state,
			// con/des areas must be fluid. calculate total number of con/des/both,
			// and divide up half-circle into those ratios.
			// then, distribute arrows within those areas.
			// render as overlapping venn diagram, so just two shades,
			// one for con, one for des, overlap at both.
			// 

			let arrowSelection = this.actionGraphContainer.selectAll('g.action-arrow')
				.data(stateActionsData.actions, d => d.name);
			
			// update
			arrowSelection.transition()
				.duration(1000)
				.attr('transform', d => 'rotate(' + d.rotation + ')');

			// enter
			let arrowEnterSelection = arrowSelection.enter().append('g')
				.attr('class', 'action-arrow')
				.attr('transform', d => 'rotate(' + d.rotation + ')')
				.on('mouseover', this.onActionMouseOver)
				.on('mouseout', this.onActionMouseOut);
			arrowEnterSelection.append('path')
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

			this.renderLabels(stateActionsData);

			// valences underlay
			let valenceSelection = this.actionGraphContainer.select('g.valences').selectAll('path.valence')
				.data(this.pieLayout(stateActionsData.valenceWeights), d => d.data.name);

			// update
			valenceSelection.transition()
				.duration(1000)
				.attrTween('d', this.arcTween);

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

			this.actionGraphContainer.selectAll('g.action-arrow')
				.on('mouseover', null)
				.on('mouseout', null)
			.transition()
				.duration(1000)
				.delay(function (d, i) { return i * 100; })
				.remove()
			.select('path')
				.call(this.scaledLineGenerator, 0.0);

			this.renderLabels(null);
			this.resetCallout();

			this.actionGraphContainer.select('g.valences').selectAll('path.valence')
			.transition()
				.duration(1000)
				.style('opacity', 0.0)
				.remove();
		}

	},

	renderLabels: function (actionsData) {

		if (actionsData) {

			let labelSize = this.lineGenerator.radius()({x:1}) + 50,
				labelSelection = this.labelContainer.selectAll('div.label')
				.data(actionsData.actions, d => d.name);
			
			// update
			labelSelection.transition()
				.duration(1000)
				.style('transform', d => 'rotate(' + d.rotation + 'deg)');
			labelSelection.select('h3').transition()
				.duration(1000)
				.style('transform', d => 'rotate(-' + d.rotation + 'deg) scaleY(1.73)');

			// enter
			let labelEnterSelection = labelSelection.enter().append('div')
				.attr('class', 'label')
				.style('transform', d => 'rotate(' + d.rotation + 'deg)')
				.style('height', labelSize + 'px')
				.style('opacity', 0.0)
				.on('mouseover', this.onActionMouseOver)
				.on('mouseout', this.onActionMouseOut);
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

	managePreviousSection: function (previousSection, currentEmotion, previousEmotion) {

		if (previousSection === states) {
			return previousSection.setBackgrounded(true);
		} else {
			return previousSection.close();
		}

	},

	open: function () {

		d3.select(this.sectionContainer)
			.on('click', this.onBackgroundClick);

		this.resetCallout();

	},

	close: function () {

		return new Promise((resolve, reject) => {

			d3.select(this.sectionContainer)
				.on('click', null);

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	onActionMouseOver: function (d, i) {

		dispatcher.changeCallout(this.currentEmotion, d.name, 'placeholder action description'/*action.desc*/);

	},

	onActionMouseOut: function (d, i) {

		this.resetCallout();

	},

	onBackgroundClick: function (d, i) {

		dispatcher.setEmotionState(null);

	},

	resetCallout () {
		dispatcher.changeCallout(this.currentEmotion, appStrings.actionsCalloutTitle, appStrings.actionsCalloutIntro);
	},

};
