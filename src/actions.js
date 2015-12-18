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
			// .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
			.attr('transform', 'translate(' + (margin.left + 0.5*innerWidth) + ',' + margin.top + ')');

		// 
		// d3/svg setup
		// 
		let section = this;
		this.arrowScale = 0;
		this.lineGenerator = d3.svg.line.radial()
			.radius(function(d) { return d.x * section.arrowScale * innerWidth/2; })
			.angle(function(d) { return 2*Math.PI - d.y * 2*Math.PI; })
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

			let numArrows = stateActionsData.length;
			let data = [];
			for (let i=0; i<numArrows; i++) {
				let offset = 0.25 + i / (2 * (numArrows - 1));
				data.push(ARROW_SHAPE.map(pt => ({
					x: pt.x,
					y: offset + pt.y
				})));
			}

			this.arrowScale = 0;
			this.actionGraphContainer.selectAll('path')
				.data(data)
			.enter().append('path')
				.attr("class", "action-arrow")
				.attr('d', this.lineGenerator);

			this.arrowScale = 1;
			this.actionGraphContainer.selectAll('path').transition()
				.duration(1000)
				.delay(function (d, i) { return i * 100; })
				.attr('d', this.lineGenerator);

		} else {

			this.arrowScale = 0;
			this.actionGraphContainer.selectAll('path').transition()
				.duration(1000)
				.delay(function (d, i) { return i * 100; })
				.attr('d', this.lineGenerator);

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
