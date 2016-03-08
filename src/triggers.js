import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';
import states from './states.js';
import actions from './actions.js';

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
	backgroundSections: [ states, actions ],

	labelContainers: null,
	graphContainers: null,

	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.initContainers(containerNode);

		let haloRadius = this.setUpGraphs(containerNode);

		// need radius to set up labels and to parse data,
		// so these come after d3 setup.
		this.initLabels(containerNode, haloRadius);
		this.triggersData = this.parseTriggers(haloRadius);

		this.drawHorizon(containerNode);

		this.setUpHitAreas(containerNode);

		this.onHitAreaMouseOver = this.onHitAreaMouseOver.bind(this);
		this.onHitAreaMouseOut = this.onHitAreaMouseOut.bind(this);
		this.onHitAreaClick = this.onHitAreaClick.bind(this);

		this.isInited = true;

		this.recordedHitAreasClicked = [0,0,0,0];

	},

	initContainers: function (containerNode) {

		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			let triggersContainer = document.createElement('div');
			triggersContainer.classList.add('triggers-container');
			triggersContainer.classList.add(emotion);

			let graphContainer = document.createElement('div');
			graphContainer.classList.add('graph-container');
			triggersContainer.appendChild(graphContainer);

			containerNode.appendChild(triggersContainer);

		});

	},

	initLabels: function (containerNode, haloRadius) {

		// label container for each emotion
		this.labelContainers = {};
		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			let h = (1 - sassVars.triggers.bottom.replace('%', '')/100) * containerNode.offsetHeight,
				container = d3.select('.triggers-container.' + emotion),
				labelContainer = container.append('div')
					.classed('label-container', true);

			let arrowsContainer = labelContainer.append('div')
				.attr('class', 'arrows-container')
			.append('svg')
				.attr('width', containerNode.offsetWidth)
				.attr('height', h)
			.append('g')
				.attr('transform', 'translate(' + 0.5 * containerNode.offsetWidth + ',' + h + ')');

			this.labelContainers[emotion] = labelContainer;

		});

		// only one phase label container for all emotions
		this.phaseLabelContainer = d3.select(containerNode).append('div')
			.attr('id', 'trigger-phase-labels');
		this.phaseLabelContainer.selectAll('h3.label')
			.data(emotionsData.metadata.triggers.steps)
		.enter().append('h3')
			.classed('label', true)
			.text(d => d.header.toUpperCase())
			.style('top', (d, i) => {
				switch (i) {
					case 0:
						return (-1.4 * haloRadius) + 'px';
					case 1:
						return (-0.9 * haloRadius) + 'px';
					case 2:
						return (-0.65 * haloRadius) + 'px';
				}
			});

	},

	setUpGraphs: function (containerNode) {

		// All the same size, just grab the first one
		let graphContainer = containerNode.querySelector('.graph-container'),
			w = graphContainer.offsetWidth,
			h = graphContainer.offsetHeight;

		//
		// d3 conventional margins
		//
		let margin = {
				top: 0 * h,
				right: 0 * w,
				bottom: (sassVars.triggers.bottom.replace('%', '')/100) * h,
				left: 0 * w
			},
			innerWidth = w - margin.left - margin.right,
			innerHeight = h - margin.top - margin.bottom;

		//
		// d3/svg setup
		//
		let haloRadius = Math.min(0.6 * innerHeight, 0.5 * innerWidth),
			triggerInnerRadius = haloRadius * 1.125,
			triggerAreaWidth = haloRadius * 1.375 - triggerInnerRadius;

		this.haloPieLayout = d3.layout.pie()
			.value(d => 1)
			.startAngle(-0.5 * Math.PI)
			.endAngle(0.5 * Math.PI);

		this.haloArcGenerator = d3.svg.arc()
			.innerRadius(0.8 * haloRadius)
			.outerRadius(haloRadius);

		//
		// Set up each graph
		//
		this.graphContainers = {};
		_.values(dispatcher.EMOTIONS).forEach((emotion, i) => {

			let graphContainer = containerNode.querySelector('.' + emotion + ' .graph-container');

			let svg = d3.select(graphContainer).append('svg')
				.attr('width', graphContainer.offsetWidth)
				.attr('height', graphContainer.offsetHeight);

			let graph = svg.append('g')
				.attr('transform', 'translate(' + (margin.left + 0.5*innerWidth) + ',' + (margin.top + innerHeight) + ')');

			this.graphContainers[emotion] = graph;

		});

		// create an <svg> solely for <defs> shared across all emotions via xlink:href
		let defsSvg = d3.select(containerNode).append('svg')
			.classed('triggers-defs', true);
		this.setUpDefs(defsSvg.append('defs'), haloRadius);

		return haloRadius;

	},

	parseTriggers: function (haloRadius) {

		let startAngle,
			angleSpread,
			innerRadius,
			radiusSpread;

		let aspectRatio = this.sectionContainer.offsetWidth / this.sectionContainer.offsetHeight;
		if (aspectRatio > 1.75) {
			startAngle = -0.9 * Math.PI;
			angleSpread = 0.8 * Math.PI;
			innerRadius = haloRadius * 1.05;
			radiusSpread = haloRadius * 0.15;
		} else if (aspectRatio > 1.4) {
			startAngle = -0.8 * Math.PI;
			angleSpread = 0.6 * Math.PI;
			innerRadius = haloRadius * 1.15;
			radiusSpread = haloRadius * 0.225;
		} else if (aspectRatio > 1) {
			startAngle = -0.7 * Math.PI;
			angleSpread = 0.4 * Math.PI;
			innerRadius = haloRadius * 1.25;
			radiusSpread = haloRadius * 0.3;
		} else {
			startAngle = -0.6 * Math.PI;
			angleSpread = 0.2 * Math.PI;
			innerRadius = haloRadius * 1.35;
			radiusSpread = haloRadius * 0.375;
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

	drawHorizon: function (containerNode) {

		let horizon = document.createElement('div');
		horizon.classList.add('horizon');
		containerNode.insertBefore(horizon, containerNode.childNodes[0]);

	},

	setUpHitAreas: function (containerNode) {

		const cw = containerNode.offsetWidth,
			ch = (1 - sassVars.triggers.bottom.replace('%', '')/100) * containerNode.offsetHeight,
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
			.on('mouseover', () => { this.onHitAreaMouseOver(HIT_AREAS.APPRAISAL); })
			.on('mouseout', () => { this.onHitAreaMouseOut(HIT_AREAS.APPRAISAL); })
			.on('click', () => { this.onHitAreaClick(HIT_AREAS.APPRAISAL); });

		container.append('path')
			.data(this.haloPieLayout([{}]))
			.attr('class', 'hit-area')
			.attr('d', this.haloArcGenerator)
			.on('mouseover', () => { this.onHitAreaMouseOver(HIT_AREAS.DATABASE); })
			.on('mouseout', () => { this.onHitAreaMouseOut(HIT_AREAS.DATABASE); })
			.on('click', () => { this.onHitAreaClick(HIT_AREAS.DATABASE); });

		let innerArcGenerator = d3.svg.arc()
			.innerRadius(0)
			.outerRadius(innerRadius);
		container.append('path')
			.data(this.haloPieLayout([{}]))
			.attr('class', 'hit-area')
			.attr('d', innerArcGenerator)
			.on('mouseover', () => { this.onHitAreaMouseOver(HIT_AREAS.IMPULSE); })
			.on('mouseout', () => { this.onHitAreaMouseOut(HIT_AREAS.IMPULSE); })
			.on('click', () => { this.onHitAreaClick(HIT_AREAS.IMPULSE); });

		d3.select('#header').on('click', () => { this.onHitAreaClick(null); });

	},

	setEmotion: function (emotion) {

		return new Promise((resolve, reject) => {

			if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
				emotion = 'anger';
			}
			let previousEmotion = this.currentEmotion;
			this.currentEmotion = emotion;

			// transition graphs and labels
			let dx = 0;
			if (previousEmotion) {
				let previousContainer = d3.select('.triggers-container.' + previousEmotion);
				previousContainer.classed('active', false);
				previousContainer.on('transitionend', event => {
					previousContainer.on('transitionend', null);
					previousContainer.style('transform', null);
					previousContainer.classed('transitioning', false);
				});

				let containerWidth = document.querySelector('#triggers .graph-container').offsetWidth,
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

			let currentContainer = d3.select('.triggers-container.' + emotion);
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

			this.renderGraph(this.currentEmotion);
			this.renderLabels(this.currentEmotion);

			// leave a bit of time for other transitions to happen
			this.openCallout(500);

			// fade in horizon
			document.querySelector('#triggers .horizon').classList.add('visible');

			// hide phase labels until the next interaction
			// (mostly a thing when back/fwd navigating with the trackpad)
			this.phaseLabelContainer.selectAll('h3.label')
				.classed('visible', false);

			// resolve on completion of primary transitions
			let resolveDelay;
			if (previousEmotion) {
				// resolve after horizontal transition completes
				resolveDelay = (sassVars.emotions.panX.delay + sassVars.emotions.panX.duration) * 1000;
			} else {
				// resolve after backgrounded elements complete their transitions
				resolveDelay = sassVars.states.backgrounded.duration.in;
			}
			setTimeout(() => {
				resolve();
			}, resolveDelay);

		});

	},

	renderGraph: function (emotion) {

		let graphContainer = this.graphContainers[emotion],
			haloSelection = graphContainer.selectAll('path.halo');

		// bail if already rendered
		if (haloSelection.size()) { return; }

		haloSelection = haloSelection.data(this.haloPieLayout([{}]));

		let emotionGradientName = 'triggers-' + emotion + '-radial-gradient';
		let haloEnterSelection = haloSelection.enter();
		haloEnterSelection.append('radialGradient')
			.attr('xlink:href', '#' + emotionGradientName)
			.attr('id', emotionGradientName + '-halo');

		haloEnterSelection.append('path')
			.classed('halo ' + emotion, true)
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

	},

	renderLabels: function (emotion) {

		let triggersData = emotion ? this.triggersData[emotion] : [];
		emotion = emotion || this.currentEmotion;

		// TODO: use a force-directed layout instead,
		// to ensure every label finds a good, non-overlapping place
		let h = (1 - sassVars.triggers.bottom.replace('%', '')/100) * this.sectionContainer.offsetHeight,
			labelContainer = this.labelContainers[emotion],
			labelSelection = labelContainer.selectAll('div.label')
			.data(triggersData);

		// update

		// enter
		let labelEnterSelection = labelSelection.enter().append('div')
			.classed('label ' + emotion, true)
			.style('opacity', 1.0)
			.style('transform', d => {
				let x = 0.5 * this.sectionContainer.offsetWidth + Math.cos(d.angle) * d.radius,
					y = h + Math.sin(d.angle) * d.radius;
				return 'translate(' + x + 'px,' + y + 'px)';
			});
		labelEnterSelection.append('h4')
			.html(d => d.name);

		// exit
		labelSelection.exit().transition()
			.duration(600)
			.style('opacity', 0.0)
			.remove();


		//
		// label arrows
		//
		let labelArrowSelection = labelContainer.select('.arrows-container g').selectAll('g.arrow')
			.data(triggersData);

		// update

		// enter
		let emotionGradientName = 'triggers-' + emotion + '-linear-gradient';
		let arrowsEnterSelection = labelArrowSelection.enter();
		arrowsEnterSelection.append('linearGradient')
			.attr('xlink:href', '#' + emotionGradientName)
			.attr('id', (d, i) => emotionGradientName + '-arrow-' + i)
			.attr('x1', d => Math.cos(d.angle) * d.radius * 0.95)
			.attr('x2', d => Math.cos(d.angle) * d.radius * (1 - d.arrowLength))
			.attr('y1', d => Math.sin(d.angle) * d.radius * 0.95)
			.attr('y2', d => Math.sin(d.angle) * d.radius * (1 - d.arrowLength));

		let arrowsContainerEnterSelection = arrowsEnterSelection.append('g')
			.classed('arrow ' + emotion, true)
			.style('opacity', 1.0);
		arrowsContainerEnterSelection.append('line')
			.attr('x1', d => Math.cos(d.angle) * d.radius * 0.95)
			.attr('x2', d => Math.cos(d.angle) * d.radius * (1 - d.arrowLength))
			.attr('y1', d => Math.sin(d.angle) * d.radius * 0.95)
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

		this.phaseLabelContainer.attr('class', emotion);

	},

	open: function () {

		// transition time from _states.scss::#states
		this.openCallout(1500);

	},

	close: function () {

		return new Promise((resolve, reject) => {

			clearTimeout(this.calloutTimeout);

			document.querySelector('#states').classList.remove('faded');
			document.querySelector('#actions').classList.remove('faded');

			// clear out stuff...
			this.renderLabels(null);

			if (this.currentEmotion) {
				this.graphContainers[this.currentEmotion].selectAll('path.halo').remove();
			}

			document.querySelector('#triggers .horizon').classList.remove('visible');

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	onHitAreaMouseOver: function (hitAreaId) {

		this.displayHighlightedHitArea(hitAreaId);

	},

	onHitAreaMouseOut: function (hitAreaId) {

		this.displayHighlightedHitArea(null);
	},

	onHitAreaClick: function (hitAreaId) {

		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		// record that area has been clicked, so can record interaction when all three have been clicked
		this.recordedHitAreasClicked[hitAreaId] = 1;

		this.setHighlightedHitArea(hitAreaId);
	},

	setHighlightedHitArea: function (hitAreaId) {

		// check for all three, if so then update arrow, note that it's not 0 indexed
		if (this.recordedHitAreasClicked[1] && this.recordedHitAreasClicked[2] && this.recordedHitAreasClicked[3]){
			dispatcher.recordSectionInteraction('triggers');
		}

		this.highlightedHitArea = hitAreaId;
		this.displayHighlightedHitArea();
		this.setCallout(hitAreaId);

	},

	displayHighlightedHitArea: function (hitAreaId) {

		hitAreaId = hitAreaId || this.highlightedHitArea || null;

		let graphContainer = this.graphContainers[this.currentEmotion],
			statesContainer = d3.select('#states'),
			actionsContainer = d3.select('#actions');

		switch (hitAreaId) {
			case HIT_AREAS.APPRAISAL:
				graphContainer.classed('muted', true);
				statesContainer.classed('faded', true);
				actionsContainer.classed('faded', true);
				break;
			case HIT_AREAS.DATABASE:
				graphContainer.classed('muted', false);
				statesContainer.classed('faded', true);
				actionsContainer.classed('faded', true);
				break;
			case HIT_AREAS.IMPULSE:
				graphContainer.classed('muted', true);
				statesContainer.classed('faded', false);
				actionsContainer.classed('faded', false);
				break;
			default:
				graphContainer.classed('muted', false);
				statesContainer.classed('faded', false);
				actionsContainer.classed('faded', false);
		}

		this.phaseLabelContainer.selectAll('h3.label')
			.classed('visible', (d, i) => i + 1 === hitAreaId);

	},

	openCallout: function (delay) {

		if (!this.calloutTimeout) {
			this.calloutTimeout = setTimeout(() => {
				this.setCallout(false);
				this.calloutTimeout = null;
			}, delay);
		}

	},

	setCallout: function (hitAreaId) {

		if (hitAreaId) {
			dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.triggers.steps[hitAreaId-1].header, emotionsData.metadata.triggers.steps[hitAreaId-1].body);
		} else {
			dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.triggers.header, emotionsData.metadata.triggers.body);
		}

	}

};
