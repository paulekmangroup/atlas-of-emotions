import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import appStrings from '../static/appStrings.json';
import states from './states.js';

export default {

	isInited: false,
	currentEmotion: null,
	triggersData: null,
	backgroundSections: [ states ],
	tempNav: null,
	
	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.triggersData = this.parseTriggers();

		let graphContainer = document.createElement('div');
		graphContainer.id = 'trigger-graph-container';
		containerNode.appendChild(graphContainer);

		this.initLabels(containerNode);

		this.createTempNav(containerNode);

		// 
		// d3 conventional margins
		// 
		let margin = {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0
		};

		let innerWidth = graphContainer.offsetWidth - margin.left - margin.right;
		let innerHeight = graphContainer.offsetHeight - margin.top - margin.bottom;

		let svg = d3.select(graphContainer).append('svg')
			.attr('width', graphContainer.offsetWidth)
			.attr('height', graphContainer.offsetHeight);

		this.triggerGraphContainer = svg.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		this.setUpDefs(svg.append('defs'), 0.5*innerWidth);

		this.isInited = true;

	},

	initLabels: function (containerNode) {

		// TODO: implement if useful

	},

	parseTriggers: function () {

		// TODO: implement
		return [];

	},

	renderLabels: function (ranges) {

		// TODO: implement if useful

	},

	// TODO: DRY this out, copied almost exactly from states.js
	// set up global gradients and xlink:href to them from here and states.js
	setUpDefs: function (defs, radius) {

		// base gradient
		defs.append('linearGradient')
			.attr('id', 'triggers-gradient')
			.attr('gradientUnits', 'userSpaceOnUse')
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', 0)
			.attr('y2', -radius);

		// anger
		defs.append('linearGradient')
			.attr('id', 'triggers-anger-gradient')
			.attr('xlink:href', '#triggers-gradient')
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
			.attr('id', 'triggers-disgust-gradient')
			.attr('xlink:href', '#triggers-gradient')
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
			.attr('id', 'triggers-enjoyment-gradient')
			.attr('xlink:href', '#triggers-gradient')
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
			.attr('id', 'triggers-fear-gradient')
			.attr('xlink:href', '#triggers-gradient')
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
			.attr('id', 'triggers-sadness-gradient')
			.attr('xlink:href', '#triggers-gradient')
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
		// fade out and scale down triggers,
		// tween color of dome (? - or just fade out and redraw?)

		this.tempNav.querySelector('.prev').innerHTML = '<a href=#actions:' + emotion + '>ACTIONS ▲</a>';
		// this.tempNav.querySelector('.next').innerHTML = '<a href=#moods:' + emotion + '>MOODS ▼</a>';
		this.tempNav.querySelector('.next').innerHTML = '<a href=#>MOODS ▼</a>';
		this.tempNav.removeAttribute('style');

	},

	open: function () {

		// transition time from _states.scss::#states
		let openDelay = 1500;

		this.openTimeout = setTimeout(() => {
			this.resetCallout();
		}, openDelay);

	},

	close: function () {

		return new Promise((resolve, reject) => {

			clearTimeout(this.openTimeout);

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	resetCallout () {
		dispatcher.changeCallout(this.currentEmotion, appStrings.triggers.header, appStrings.triggers.body);
	},

	createTempNav (containerNode) {

		this.tempNav = document.createElement('div');
		this.tempNav.id = 'temp-triggers-nav';
		containerNode.appendChild(this.tempNav);

		let prev = document.createElement('div');
		prev.classList.add('prev');
		this.tempNav.appendChild(prev);

		let next = document.createElement('div');
		next.classList.add('next');
		this.tempNav.appendChild(next);

	}

};
