import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import appStrings from '../static/appStrings.json';
import states from './states.js';

const VALENCES = {
	NONE: 0,
	CONSTRUCTIVE: 1,
	DESTRUCTIVE: 2,
	BOTH: 3
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

		this.actionsData = this.parseActions();

		let graphContainer = document.createElement('div');
		graphContainer.id = 'action-graph-container';
		containerNode.appendChild(graphContainer);

		// TODO: 
		// this.initLabels(containerNode);

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

		// 
		// d3/svg setup
		// 
		let section = this;
		this.lineGenerator = d3.svg.line.radial()
			.radius(d => d.x * 0.5*innerWidth)
			.angle(d => 2*Math.PI * (1 - d.y))
			.interpolate('cardinal');

		/*
		this.pieLayout = d3.layout.pie()
			.sort(null)
			.value(d => 1)
			.padAngle(0.05 * Math.PI)
			.startAngle(0.5 * Math.PI)
			.endAngle(1.5 * Math.PI);

		this.arcGenerator = d3.svg.arc()
			.innerRadius(0)
			.outerRadius(0.01);
		*/

		this.isInited = true;

	},

	initLabels: function (containerNode) {

		// TODO: implement if useful

	},

	renderLabels: function (ranges) {

		// TODO: implement if useful

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

		/*
		this.actionGraphContainer.selectAll('.action-arrow')
			.data(this.pieLayout())

		var path = svg.selectAll(".solidArc")
		  .data(pie(data))
		.enter().append("path")
		  .attr("fill", function(d) { return d.data.color; })
		  .attr("class", "solidArc")
		  .attr("stroke", "gray")
		  .attr("d", arc);

		arc.outerRadius(radius);
		svg.selectAll('.solidArc').transition()
			.duration(1000)
		  .attr("d", arc);
		*/

	},

	setState: function (state) {

		if (state) {

			let stateActionsData = this.actionsData[this.currentEmotion][state];
			if (!stateActionsData) {
				console.warn('No actions found for state "' + state + '" in emotion "' + this.currentEmotion + '".');
				return;
			}

			let numActions = stateActionsData.length;
			let data = [];
			for (let i=0; i<numActions; i++) {
				let offset = 0.25 + i / (2 * (numActions - 1));
				data.push(Object.assign({}, stateActionsData[i], {
					paths: ARROW_SHAPE.map(pt => ({
						x: pt.x,
						y: offset + pt.y
					}))
					// rotation: (90 + (numActions-i-1) * 180/(numActions-1))
				}));
			}

			// 
			// TODO SAT:
			// 
			// instead of offsetting in data,
			// just specify a callback for attr('transform', 'rotate').
			// also, don't need to use line.radial(),
			// should just use line(). this is not really a polar chart,
			// it's just the same path rotated around a centerpoint.
			// 
			// figure out key function -- we want continuity of each action in arrow transitions,
			// but the key function d => d.name was causing only one arrow to render.
			// 
			// since there can be many (15 in bitterness!) con- or destructive actions per state,
			// con/des areas must be fluid. calculate total number of con/des/both,
			// and divide up half-circle into those ratios.
			// then, distribute arrows within those areas.
			// 

			console.log(">>>>> stateActionsData:", stateActionsData);
			console.log(">>>>> data:", data);
			let pathSelection = this.actionGraphContainer.selectAll('path')
				// TODO: have to get this key function working...
				// oh! problem is that there's no name left after converting stateActionsData -> data with arrow points.
				// should just apply arrow points in the line generator,
				// since i'm refactoring to draw the exact same path for each action
				// and just scale/rotate it via .attr().
				.data(data, d => d.name);
			
			// update
			pathSelection.selectAll('path')
			.transition()
				.duration(1000)
				.attr('d', d => this.lineGenerator(d.paths));

			// enter
			pathSelection.enter().append('path')
				.attr('class', 'action-arrow')
				.attr('d', d => this.lineGenerator(d.paths))
				.attr('transform', 'scale(0.0)')
			.transition()
				.duration(1000)
				.delay(function (d, i) { return i * 50; })
				.attr('transform', 'scale(1.0)');

			// exit
			pathSelection.exit().transition()
				.duration(600)
				.attr('transform', 'scale(0.0)')
				.remove();

		} else {

			this.actionGraphContainer.selectAll('path').transition()
				.duration(1000)
				.delay(function (d, i) { return i * 100; })
				.attr('transform', 'scale(0.0)')
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

		// TODO: implement if useful

	},

	close: function () {

		return new Promise((resolve, reject) => {

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	parseActions: function () {

		// For each state in each emotion, create an unordered Array of actions formatted as:
		// { name: 'actionName', valence: 'NONE|CONSTRUCTIVE|DESTRUCTIVE|BOTH' }
		let actionsData = Object.keys(dispatcher.EMOTIONS).reduce((actionsOutput, emotionKey) => {

			let emotionName = dispatcher.EMOTIONS[emotionKey],
				statesData = emotionsData.emotions[emotionName].states;

			actionsOutput[emotionName] = Object.keys(statesData).reduce((statesOutput, stateName) => {

				let actionData = statesData[stateName].actions;

				statesOutput[stateName] = Object.keys(actionData).map((actionName, i, actions) => {
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
				});

				return statesOutput;

			}, {});

			return actionsOutput;

		}, {});
	
		return actionsData;

	}

};
