import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import appStrings from '../static/appStrings.json';
import states from './states.js';


// number of concentric rings in which trigger labels are arranged
const NUM_RINGS = 3;

const HIT_AREAS = {
	APPRAISAL: 1,
	DATABASE: 2,
	IMPULSE: 3
};

// path for arrowhead shape
const ARROWHEAD = "M0,0.1C3.1-3,9.3-4.5,13.6-4.6C7.9-0.3,2.8,5.2,0,12C-2.7,5.2-8-0.1-13.6-4.6C-9-4.3-3.4-3.1,0,0.1z";

export default {

	isInited: false,
	currentEmotion: null,
	triggersData: null,
	backgroundSections: [ states ],
	tempNav: null,
	
	init: function (containerNode) {

		this.sectionContainer = containerNode;

		let graphContainer = document.createElement('div');
		graphContainer.id = 'trigger-graph-container';
		containerNode.appendChild(graphContainer);

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
			.attr('transform', 'translate(' + (margin.left + 0.5*innerWidth) + ',' + (margin.top + innerHeight) + ')');

		// 
		// d3/svg setup
		// 
		let haloRadius = 0.5 * innerWidth,
			triggerInnerRadius = haloRadius * 1.125,
			triggerAreaWidth = haloRadius * 1.375 - triggerInnerRadius;

		this.haloPieLayout = d3.layout.pie()
			.value(d => 1)
			.startAngle(-0.5 * Math.PI)
			.endAngle(0.5 * Math.PI);

		this.haloArcGenerator = d3.svg.arc()
			.innerRadius(0.8 * haloRadius)
			.outerRadius(haloRadius);

		this.setUpDefs(svg.append('defs'), haloRadius);

		// need radius to set up labels and to parse data,
		// so these come after d3 setup.
		this.initLabels(containerNode, haloRadius);
		this.triggersData = this.parseTriggers(haloRadius);

		this.setUpHitAreas(containerNode);

		this.isInited = true;

	},

	initLabels: function (containerNode, haloRadius) {

		this.labelContainer = d3.select(containerNode).append('div')
			.attr('id', 'trigger-labels');
		
		this.labelArrowsContainer = this.labelContainer.append('div')
			.attr('class', 'arrows-container')
		.append('svg')
			.attr('width', containerNode.offsetWidth)
			.attr('height', containerNode.offsetHeight)
		.append('g')
			.attr('transform', 'translate(' + 0.5 * containerNode.offsetWidth + ',' + containerNode.offsetHeight + ')');

		this.databaseLabel = d3.select(containerNode).append('div')
			.attr('id', 'database-label');
		this.databaseLabel.append('h3')
			.text('EMOTIONS ALERT DATABASE')
			.style('top', -haloRadius + 'px');

	},

	parseTriggers: function (haloRadius) {

		let startAngle,
			angleSpread,
			innerRadius,
			radiusSpread;

		// TODO: this is all temporary, until we switch to a force-directed layout.
		// until then, it's necessary to fit all the labels on screen.
		let aspectRatio = this.sectionContainer.offsetWidth / this.sectionContainer.offsetHeight;
		if (aspectRatio > 1.75) {
			startAngle = -0.9 * Math.PI;
			angleSpread = 0.8 * Math.PI;
			innerRadius = haloRadius * 1.05;
			radiusSpread = haloRadius * 0.2;
		} else if (aspectRatio > 1.4) {
			startAngle = -0.8 * Math.PI;
			angleSpread = 0.6 * Math.PI;
			innerRadius = haloRadius * 1.15;
			radiusSpread = haloRadius * 0.3;
		} else if (aspectRatio > 1) {
			startAngle = -0.7 * Math.PI;
			angleSpread = 0.4 * Math.PI;
			innerRadius = haloRadius * 1.25;
			radiusSpread = haloRadius * 0.5;
		} else {
			startAngle = -0.6 * Math.PI;
			angleSpread = 0.2 * Math.PI;
			innerRadius = haloRadius * 1.35;
			radiusSpread = haloRadius * 0.65;
		}


		let triggersData = {};
		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			let numTriggers = emotionsData.emotions[emotion].triggers.length;
			let middleIndex = Math.floor(numTriggers / 2);
			triggersData[emotion] = emotionsData.emotions[emotion].triggers.concat()
			.sort((a, b) => {
				if (a < b) return -1;
				else if (a > b) return 1;
				else return 0;
			})
			.map((trigger, i) => ({
				name: trigger,

				// distribute evenly between startAngle and startAngle + angleSpread,
				// with a gap in the middle
				angle: startAngle + angleSpread * (i + (i < middleIndex ? 0.5 : 1.5)) / (numTriggers + 1),

				// distribute along rings spanning between innerRadius and innerRadius + radiusSpread,
				// starting at the second ring and cycling between rings
				radius: innerRadius + radiusSpread * ((i + 1) % NUM_RINGS) / (NUM_RINGS - 1),

				// fraction of radius.
				// TODO: vary arrow width based on some data
				arrowLength: 0.4
			}));

		});

		return triggersData;

	},

	// TODO: DRY this out, copied almost exactly from states.js
	// set up global gradients and xlink:href to them from here and states.js
	setUpDefs: function (defs, radius) {

		//
		// halo gradients
		// 

		// base gradient
		defs.append('radialGradient')
			.attr('id', 'triggers-radial-gradient')
			.attr('gradientUnits', 'userSpaceOnUse')
			.attr('cx', 0)
			.attr('cy', 0)
			.attr('r', radius);

		// anger
		defs.append('radialGradient')
			.attr('id', 'triggers-anger-radial-gradient')
			.attr('xlink:href', '#triggers-radial-gradient')
		.selectAll('stop')
			.data([
				{ offset: '84%', color: 'rgba(228, 135, 102, 0.2)' },
				{ offset: '100%', color: 'rgba(204, 28, 43, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// disgust
		defs.append('radialGradient')
			.attr('id', 'triggers-disgust-radial-gradient')
			.attr('xlink:href', '#triggers-radial-gradient')
		.selectAll('stop')
			.data([
				{ offset: '84%', color: 'rgba(0, 142, 69, 0.3)' },
				{ offset: '100%', color: 'rgba(0, 104, 55, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// enjoyment
		defs.append('radialGradient')
			.attr('id', 'triggers-enjoyment-radial-gradient')
			.attr('xlink:href', '#triggers-radial-gradient')
		.selectAll('stop')
			.data([
				{ offset: '84%', color: 'rgba(241, 196, 83, 0.8)' },
				{ offset: '100%', color: 'rgba(248, 136, 29, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// fear
		defs.append('radialGradient')
			.attr('id', 'triggers-fear-radial-gradient')
			.attr('xlink:href', '#triggers-radial-gradient')
		.selectAll('stop')
			.data([
				{ offset: '84%', color: 'rgba(248, 58, 248, 0.1)' },
				{ offset: '100%', color: 'rgba(143, 39, 139, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// sadness
		defs.append('radialGradient')
			.attr('id', 'triggers-sadness-radial-gradient')
			.attr('xlink:href', '#triggers-radial-gradient')
		.selectAll('stop')
			.data([
				{ offset: '84%', color: 'rgba(200, 220, 240, 1.0)' },
				{ offset: '100%', color: 'rgba(64, 70, 164, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);


		//
		// arrow gradients
		// 
		
		// base gradient
		defs.append('linearGradient')
			.attr('id', 'triggers-linear-gradient')
			.attr('gradientUnits', 'userSpaceOnUse')

			// these will be overridden on each path's gradient
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', 0)
			.attr('y2', 0);

		// anger
		defs.append('linearGradient')
			.attr('id', 'triggers-anger-linear-gradient')
			.attr('xlink:href', '#triggers-linear-gradient')
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
			.attr('id', 'triggers-disgust-linear-gradient')
			.attr('xlink:href', '#triggers-linear-gradient')
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
			.attr('id', 'triggers-enjoyment-linear-gradient')
			.attr('xlink:href', '#triggers-linear-gradient')
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
			.attr('id', 'triggers-fear-linear-gradient')
			.attr('xlink:href', '#triggers-linear-gradient')
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
			.attr('id', 'triggers-sadness-linear-gradient')
			.attr('xlink:href', '#triggers-linear-gradient')
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

	setUpHitAreas: function (containerNode) {

		const cw = containerNode.offsetWidth,
			ch = containerNode.offsetHeight,
			innerRadius = this.haloArcGenerator.innerRadius();

		let hitAreaContainer = document.createElement('div');
		hitAreaContainer.id = 'trigger-hit-area-container';
		containerNode.appendChild(hitAreaContainer);

		let svg = d3.select(hitAreaContainer).append('svg')
			.attr('width', hitAreaContainer.offsetWidth)
			.attr('height', hitAreaContainer.offsetHeight);
		let container = svg.append('g')
			.attr('transform', 'translate(' + (0.5 * cw) + ',' + ch + ')');

		container.append('rect')
			.attr('class', 'hit-area')
			.attr('x', -cw/2)
			.attr('y', -ch)
			.attr('width', cw)
			.attr('height', ch)
			.on('mouseover', () => { this.onMouseOver(HIT_AREAS.APPRAISAL); })
			.on('mouseout', () => { this.onMouseOut(HIT_AREAS.APPRAISAL); });

		container.append('path')
			.data(this.haloPieLayout([{}]))
			.attr('class', 'hit-area')
			.attr('d', this.haloArcGenerator)
			.on('mouseover', () => { this.onMouseOver(HIT_AREAS.DATABASE); })
			.on('mouseout', () => { this.onMouseOut(HIT_AREAS.DATABASE); });

		let innerArcGenerator = d3.svg.arc()
			.innerRadius(0)
			.outerRadius(innerRadius);
		container.append('path')
			.data(this.haloPieLayout([{}]))
			.attr('class', 'hit-area')
			.attr('d', innerArcGenerator)
			.on('mouseover', () => { this.onMouseOver(HIT_AREAS.IMPULSE); })
			.on('mouseout', () => { this.onMouseOut(HIT_AREAS.IMPULSE); });

	},

	setEmotion: function (emotion) {

		if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
			emotion = 'anger';
		}
		this.currentEmotion = emotion;

		// TODO: transition between emotions:
		// fade out and scale down triggers,
		// tween color of dome (? - or just fade out and redraw?)

		let haloSelection = this.triggerGraphContainer.selectAll('path.halo')
			.data(this.haloPieLayout([{}]));
		// .transition()
		// 	.duration(1000)
		// 	.fill();
		
		let emotionGradientName = 'triggers-' + this.currentEmotion + '-radial-gradient';
		let haloEnterSelection = haloSelection.enter();
		haloEnterSelection.append('radialGradient')
			.attr('xlink:href', '#' + emotionGradientName)
			.attr('id', emotionGradientName + '-halo');

		haloEnterSelection.append('path')
			.classed('halo ' + this.currentEmotion, true)
			.attr('d', this.haloArcGenerator)
			.attr('fill', 'url(#' + emotionGradientName + '-halo)')
			.style('opacity', 0.0)
		.transition()
			.duration(1000)
			.style('opacity', 1.0);

		haloSelection.exit().transition()
			.duration(600)
			.style('opacity', 0.0)
			.remove();

		let currentTriggersData = this.triggersData[this.currentEmotion];
		this.renderLabels(currentTriggersData);

		this.tempNav.querySelector('.prev').innerHTML = '<a href="#actions:' + emotion + '">ACTIONS ▲</a>';
		this.tempNav.querySelector('.next').innerHTML = '<a href="#moods:' + emotion + '">MOODS ▼</a>';
		this.tempNav.classList.add('visible');

	},

	renderLabels: function (triggersData) {

		if (!triggersData) {
			triggersData = [];
		}

		// TODO: use a force-directed layout instead,
		// to ensure every label finds a good, non-overlapping place
		let labelSelection = this.labelContainer.selectAll('div.label')
			.data(triggersData);

		// update
		
		// enter
		let labelEnterSelection = labelSelection.enter().append('div')
			.classed('label ' + this.currentEmotion, true)
			.style('opacity', 1.0)
			.style('transform', d => {
				let x = 0.5 * this.sectionContainer.offsetWidth + Math.cos(d.angle) * d.radius,
					y = this.sectionContainer.offsetHeight + Math.sin(d.angle) * d.radius;
				return 'translate(' + x + 'px,' + y + 'px)';
			});
		labelEnterSelection.append('h3')
			.html(d => d.name.toUpperCase());

		// exit
		labelSelection.exit().transition()
			.duration(600)
			.style('opacity', 0.0)
			.remove();


		//
		// label arrows
		// 
		let labelArrowSelection = this.labelArrowsContainer.selectAll('g.arrow')
			.data(triggersData);

		// update
		
		// enter
		let emotionGradientName = 'triggers-' + this.currentEmotion + '-linear-gradient';
		let arrowsEnterSelection = labelArrowSelection.enter();
		arrowsEnterSelection.append('linearGradient')
			.attr('xlink:href', '#' + emotionGradientName)
			.attr('id', (d, i) => emotionGradientName + '-arrow-' + i)
			.attr('x1', d => Math.cos(d.angle) * d.radius * 0.9)
			.attr('x2', d => Math.cos(d.angle) * d.radius * (1 - d.arrowLength))
			.attr('y1', d => Math.sin(d.angle) * d.radius * 0.9)
			.attr('y2', d => Math.sin(d.angle) * d.radius * (1 - d.arrowLength));

		let arrowsContainerEnterSelection = arrowsEnterSelection.append('g')
			.classed('arrow ' + this.currentEmotion, true)
			.style('opacity', 1.0);
		arrowsContainerEnterSelection.append('line')
			.attr('x1', d => Math.cos(d.angle) * d.radius * 0.9)
			.attr('x2', d => Math.cos(d.angle) * d.radius * (1 - d.arrowLength))
			.attr('y1', d => Math.sin(d.angle) * d.radius * 0.9)
			.attr('y2', d => Math.sin(d.angle) * d.radius * (1 - d.arrowLength))
			.attr('stroke', (d, i) => 'url(#' + emotionGradientName + '-arrow-' + i + ')');
		arrowsContainerEnterSelection.append('path')
			.attr('d', ARROWHEAD)
			.attr('transform', d => {
				return 'translate(' + Math.cos(d.angle) * d.radius * (1 - d.arrowLength) + ',' + Math.sin(d.angle) * d.radius * (1 - d.arrowLength) + ') ' +
					'rotate(' + (180 * d.angle / Math.PI + 90) + ')';
			});

		// exit
		labelArrowSelection.exit().transition()
			.duration(600)
			.style('opacity', 0.0)
			.remove();

		this.databaseLabel.attr('class', this.currentEmotion);

	},

	open: function () {

		// transition time from _states.scss::#states
		let openDelay = 1500;

		this.openTimeout = setTimeout(() => {
			this.setCallout(null);
		}, openDelay);

	},

	close: function () {

		return new Promise((resolve, reject) => {

			clearTimeout(this.openTimeout);

			document.querySelector('#states').classList.remove('faded');

			// clear out stuff...
			this.renderLabels(null);
			this.triggerGraphContainer.selectAll('path.halo').remove();

			this.tempNav.classList.remove('visible');

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	onMouseOver: function (hitAreaId) {

		switch (hitAreaId) {
			case HIT_AREAS.APPRAISAL:
				document.querySelector('#trigger-graph-container').classList.add('muted');
				this.databaseLabel.classed('visible', false);
				document.querySelector('#states').classList.add('faded');
				break;
			case HIT_AREAS.DATABASE:
				document.querySelector('#trigger-graph-container').classList.remove('muted');
				this.databaseLabel.classed('visible', true);
				document.querySelector('#states').classList.add('faded');
				break;
			case HIT_AREAS.IMPULSE:
				document.querySelector('#trigger-graph-container').classList.add('muted');
				this.databaseLabel.classed('visible', false);
				document.querySelector('#states').classList.remove('faded');
				break;
			default:
				return;
		}

		this.setCallout(hitAreaId);

		// don't execute mouseout behavior when rolling from one hit area into another
		clearTimeout(this.mouseOutTimeout);

	},

	onMouseOut: function (hitAreaId) {

		this.mouseOutTimeout = setTimeout(() => {

			switch (hitAreaId) {
				case HIT_AREAS.APPRAISAL:
					//
					break;
				case HIT_AREAS.DATABASE:
					//
					break;
				case HIT_AREAS.IMPULSE:
					break;
				default:
					return;
			}

			document.querySelector('#trigger-graph-container').classList.remove('muted');
			this.databaseLabel.classed('visible', false);
			document.querySelector('#states').classList.remove('faded');

			this.setCallout(null);

		}, 1);

	},

	setCallout (hitAreaId) {

		if (hitAreaId) {
			dispatcher.changeCallout(this.currentEmotion, appStrings.triggers.steps[hitAreaId-1].header, appStrings.triggers.steps[hitAreaId-1].body);
		} else {
			dispatcher.changeCallout(this.currentEmotion, appStrings.triggers.header, appStrings.triggers.body);
		}

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
