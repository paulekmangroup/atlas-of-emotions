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

const TRIGGER_TYPES = {
	UNIVERSAL: 'universal',
	LEARNED: 'learned'
};

export default {

	isInited: false,
	currentEmotion: null,
	triggersData: null,
	backgroundSections: [ states, actions ],
	hitAreasLocked: false,

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

		this.setUpHitAreas(containerNode);

		this.drawHorizon(containerNode);

		this.onHitAreaMouseOver = this.onHitAreaMouseOver.bind(this);
		this.onHitAreaMouseOut = this.onHitAreaMouseOut.bind(this);
		this.onPhaseLabelClick = this.onPhaseLabelClick.bind(this);
		this.onPopupCloseButtonClicked = this.onPopupCloseButtonClicked.bind(this);

		this.isInited = true;

	},

	calcAngle: function (i, emotion, haloRadius) {
		let innerRadius = haloRadius * 1.15,
			radiusSpread = haloRadius * 0.225;

		let angleFactors = {
			'anger': [-.6, -.43, -.22, .24, .37, .5, .6],
			'fear': [-.7, -.53, -.42, -.22, .3, .45, .7],
			'disgust': [-.5, -.3, .24, .4, .6],
			'sadness': [-.5, -.3, .24, .42, .6],
			'enjoyment': [-.6, -.4, -.22, .24, .37, .53, .68],
			'universalLearned': [-.7,.1]
		};

		let multiplier = 1,
			additive = 0;
		let aspectRatio = this.sectionContainer.offsetWidth / this.sectionContainer.offsetHeight;
		if (aspectRatio < 1.4){
			multiplier = .86;
		}
		if (aspectRatio < 1){
			multiplier = .75;
			angleFactors['universalLearned'] = [-.7, 0];
		}



		// angleFactor can be any value from -1 (all the way left) to +1 (all the way right)
		return (angleFactors[emotion][i] * multiplier - 1) * Math.PI / 2;
	},

	calcRadius: function (i, emotion, haloRadius) {

		// TODO: to create more general solution for label placement,
		// recommend thinking of it as x/y distance instead of radius/angle
		// because we still see the text as very left/right when we read

		// for labels/arrows, as distance from middle/bottom of halo semi-circle

		let minRadius = haloRadius * 1.15,
			radiusSpread = haloRadius * 0.225;

		let spreadPercent = {
			'anger': [.6,.7,.2,0,1.5,.2,.3],
			'fear': [.3,.2,.9,.1,.5,.2,.6],
			'disgust': [.6,.3,.3,.12,1],
			'sadness': [.6,.4,.3,1.8,1],
			'enjoyment': [.2,.3,0.2,.12,1.7,.2,.3],
			'universalLearned': [1.5,.2],
		};

		let additive = 0,
			multiplier = 1,
			aspectRatio = this.sectionContainer.offsetWidth / this.sectionContainer.offsetHeight;

		// adjust spread based on aspect ratio
		if(aspectRatio > 1.75){
			additive = 1;
		}
		if (aspectRatio < 1.4){
			multiplier = .6;
		}
		if (aspectRatio < 1){
			// when narrow, need different set of values rather than an adjustment
			spreadPercent = {
				'anger': [.4,2.8,.8,3.0,1.4,.5,0],
				'fear': [.3,1.4,2.2,.1,1,2.5,.6],
				'disgust': [2.5,.3,3,2.5,1],
				'sadness': [3,.4,.3,2.5,.3],
				'enjoyment': [.5,3.0,1.5,0,2.5,.5,.3],
				'universalLearned': [1.5,0]
			};
		}

		// start with minRadius and then add a multiple of radiusSpread value
		return minRadius + radiusSpread * (spreadPercent[emotion][i] + additive) * multiplier;
	},

	calcArrowLength: function (haloRadius, triggerRadius, emotion, i) {
		// how long arrow should be based on how far arrow goes into center halo
		return 1 - (haloRadius * this.getHaloArrowPercent(emotion, i) / triggerRadius);
	},

	getHaloArrowPercent: function (emotion, i) {
		// 1 is outer boundary, .8 is inner boundary of arc, anything < .8 gets into center halo
		// all universal must be < .8

		// there are times to make general solutions, and there are times not to
		let emotionArrowPercents = {
			// 3:4 universal to learned
			'anger': [.74, .65, .77, .9, .7, .73, .91],
			// 4:3 universal to learned
			'fear': [.71, .63, .68, .76, .91, .77, .9],
			// 2:3 universal to learned
			'disgust': [.68, .76, .92, .72, .9],
			// 2:3 universal to learned
			'sadness': [.67, .77, .89, .9, .65],
			// 3:4 universal to learned
			'enjoyment': [.70, .62, .76, .92, .88, .72, .73]
		};
		return emotionArrowPercents[emotion][i];

	},

	parseTriggers: function (haloRadius) {

		let triggersData = {};

		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			triggersData[emotion] = emotionsData.emotions[emotion].triggers.concat()
			.sort((a, b) => {
				if (a.type > b.type) return -1;
				else if (a.type < b.type) return 1;
				else return 0;
			})
			.map((trigger, i) => ({
				name: trigger.name,
				type: trigger.type.toLowerCase(),

				angle: this.calcAngle(i, emotion, haloRadius),

				radius: this.calcRadius(i, emotion, haloRadius),

				// fraction of radius.
				arrowLength: this.calcArrowLength(haloRadius, this.calcRadius(i, emotion, haloRadius), emotion, i)
			}));

		});

		return triggersData;

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
		// Set up each graph,
		// or update if already set up (on resize)
		//
		if (!this.graphContainers) {

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

		} else {

			_.values(dispatcher.EMOTIONS).forEach((emotion, i) => {

				let graphContainer = containerNode.querySelector('.' + emotion + ' .graph-container');

				let svg = d3.select(graphContainer).select('svg')
					.attr('width', graphContainer.offsetWidth)
					.attr('height', graphContainer.offsetHeight);

				let graph = svg.select('g')
					.attr('transform', 'translate(' + (margin.left + 0.5*innerWidth) + ',' + (margin.top + innerHeight) + ')');

			});

		}

		return haloRadius;

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

	initLabels: function (containerNode, haloRadius) {

		// label container for each emotion
		this.labelContainers = {};
		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			let h = (1 - sassVars.triggers.bottom.replace('%', '') / 100) * containerNode.offsetHeight,
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

			// universal/learned triggers popup labels
			let universalLearnedLabelContainer = labelContainer.append('div')
				.classed(`universal-learned-labels ${emotion}`, true);
			universalLearnedLabelContainer.append('div')
				.attr('class', `emotion-label ${TRIGGER_TYPES.UNIVERSAL} ${emotion}`)
				.attr('data-popuptarget', `triggers:${emotion}-${TRIGGER_TYPES.UNIVERSAL}`)
				.style('transform', this.getUniversalLearnedTranslation('universal', haloRadius))
			.append('h3')
				.text(emotionsData.metadata.triggers.steps[3].header.toUpperCase());
			universalLearnedLabelContainer.append('div')
				.attr('class', `emotion-label ${TRIGGER_TYPES.LEARNED} ${emotion}`)
				.attr('data-popuptarget', `triggers:${emotion}-${TRIGGER_TYPES.LEARNED}`)
				.style('transform', this.getUniversalLearnedTranslation('learned', haloRadius))
			.append('h3')
				.text(emotionsData.metadata.triggers.steps[4].header.toUpperCase());

			this.labelContainers[emotion] = labelContainer;

			// phase labels (EVENT/PERCEPTION/RESPONSE)
			let phaseLabelContainer = labelContainer.append('div')
				.classed(`trigger-phase-labels ${emotion}`, true);

			let labels = phaseLabelContainer.selectAll('.emotion-label')
				.data(emotionsData.metadata.triggers.steps.slice(0, 3));

			let labelsEnter = labels.enter()
				.append('div')
				.attr('class', `emotion-label ${emotion}`)
				.attr('data-popuptarget', d => `triggers:${emotion}-${d.header.toLowerCase()}`)
				.style('top', (d, i) => {
					switch (i) {
						case 0:
							return Math.round(-1.4 * haloRadius) + 'px';
						case 1:
							return Math.round(-0.9 * haloRadius) + 'px';
						case 2:
							return Math.round(-0.65 * haloRadius) + 'px';
					}
				})
				.on('mouseenter', d => this.setHitAreasLocked(true))
				.on('mouseleave', d => this.setHitAreasLocked(false))
				.on('click', (d, i) => {
					switch (i) {
						case 0:
							return this.onPhaseLabelClick(HIT_AREAS.APPRAISAL);
						case 1:
							return this.onPhaseLabelClick(HIT_AREAS.DATABASE);
						case 2:
							return this.onPhaseLabelClick(HIT_AREAS.IMPULSE);
					}
				});

			labelsEnter
				.append('h3')
					.text(d => d.header.toUpperCase());

		});

	},

	setUpHitAreas: function (containerNode) {

		const cw = containerNode.offsetWidth,
			ch = (1 - sassVars.triggers.bottom.replace('%', '')/100) * containerNode.offsetHeight,
			innerRadius = this.haloArcGenerator.innerRadius();

		let hitAreaContainer = document.createElement('div');
		hitAreaContainer.id = 'trigger-hit-area-container';
		containerNode.insertBefore(hitAreaContainer, containerNode.childNodes[0]);

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
			.on('click', () => { this.setCallout(null); });

		container.append('path')
			.data(this.haloPieLayout([{}]))
			.attr('class', 'hit-area')
			.attr('d', this.haloArcGenerator)
			.on('mouseover', () => { this.onHitAreaMouseOver(HIT_AREAS.DATABASE); })
			.on('mouseout', () => { this.onHitAreaMouseOut(HIT_AREAS.DATABASE); })
			.on('click', () => { this.setCallout(null); });

		let innerArcGenerator = d3.svg.arc()
			.innerRadius(0)
			.outerRadius(innerRadius);
		container.append('path')
			.data(this.haloPieLayout([{}]))
			.attr('class', 'hit-area')
			.attr('d', innerArcGenerator)
			.on('mouseover', () => { this.onHitAreaMouseOver(HIT_AREAS.IMPULSE); })
			.on('mouseout', () => { this.onHitAreaMouseOut(HIT_AREAS.IMPULSE); })
			.on('click', () => { this.setCallout(null); });

		d3.select('#header').on('click', () => { this.onPhaseLabelClick(null); });

	},

	drawHorizon: function (containerNode) {

		let horizon = document.createElement('div');
		horizon.classList.add('horizon');
		containerNode.insertBefore(horizon, containerNode.childNodes[0]);

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

		let h = (1 - sassVars.triggers.bottom.replace('%', '')/100) * this.sectionContainer.offsetHeight,
			labelContainer = this.labelContainers[emotion],
			labelSelection = labelContainer.selectAll('div.label')
			.data(triggersData);

		let aspectRatio = this.sectionContainer.offsetWidth / this.sectionContainer.offsetHeight;

		// shift labels right/left relative to end of arrow placement
		let adjustTranslation = {
			'anger': aspectRatio > 1 ? [-.05,0,0,-.1,0,.15,.2] :[-.1,0,0,0,0.25,.27,.24] ,
			'fear': [0,-.15,0,0,0,0,0],
			'disgust': [0,0,0,.1,0],
			'sadness': aspectRatio > 1 ? [-.1,0,0,0,0] : [.2,0,-.13,0,.1],
			'enjoyment':aspectRatio > 1 ? [-.05,0,0,0,.1,.1,.1] : [-.1,0,0,-.2,0,.2,.1],
		};

		// enter
		labelSelection.enter().append('div')
			.classed('label ' + emotion, true)
			.style('opacity', 1.0)
		.append('h4')
			.style("transform", function(d,i){return "translate(" + (adjustTranslation[emotion][i]*100 + -50) + "%,-50%)";})
			.html(d => d.name)
			.on('mouseenter', d => this.setHitAreasLocked(true))
			.on('mouseleave', d => this.setHitAreasLocked(false))
			.on('click', d => this.showTriggerPopup(emotion, d.type));

		// merge
		labelSelection
			.style('transform', d => {
				let x = 0.5 * this.sectionContainer.offsetWidth + Math.cos(d.angle) * d.radius,
					y = h + Math.sin(d.angle) * d.radius;
				return 'translate(' + x + 'px,' + y + 'px)';
			});

		// exit
		labelSelection.exit().transition()
			.duration(600)
			.style('opacity', 0.0)
			.remove();


		//
		// label arrows (lines + arrowheads) and gradients
		//
		let emotionGradientName = 'triggers-' + emotion + '-linear-gradient',
			arrowsContainer = labelContainer.select('.arrows-container g'),
			gradientsSelection = arrowsContainer.selectAll('linearGradient')
				.data(triggersData),
			arrowsSelection = arrowsContainer.selectAll('g.arrow')
				.data(triggersData);

		// enter
		gradientsSelection.enter().append('linearGradient')
			.attr('xlink:href', '#' + emotionGradientName)
			.attr('id', (d, i) => emotionGradientName + '-arrow-' + i);

		let arrowsEnterSelection = arrowsSelection.enter().append('g')
			.classed('arrow ' + emotion, true)
			.style('opacity', 1.0);
		arrowsEnterSelection.append('line')
			.attr('stroke', (d, i) => 'url(#' + emotionGradientName + '-arrow-' + i + ')');
		arrowsEnterSelection.append('path');

		// merge
		gradientsSelection
			.attr('x1', d => Math.cos(d.angle) * d.radius * 0.95)
			.attr('x2', d => Math.cos(d.angle) * d.radius * (1 - d.arrowLength))
			.attr('y1', d => Math.sin(d.angle) * d.radius * 0.95)
			.attr('y2', d => Math.sin(d.angle) * d.radius * (1 - d.arrowLength));
		arrowsSelection.select('line')
			.attr('x1', d => Math.cos(d.angle) * d.radius * 0.95)
			.attr('x2', d => Math.cos(d.angle) * d.radius * (1 - d.arrowLength))
			.attr('y1', d => Math.sin(d.angle) * d.radius * 0.95)
			.attr('y2', d => Math.sin(d.angle) * d.radius * (1 - d.arrowLength));
		arrowsSelection.select('path')
			.attr('d', ARROWHEAD)
			.attr('transform', d => {
				return 'translate(' + Math.cos(d.angle) * d.radius * (1 - d.arrowLength) + ',' + Math.sin(d.angle) * d.radius * (1 - d.arrowLength) + ') ' +
					'rotate(' + (180 * d.angle / Math.PI + 90) + ')';
			});

		// exit
		gradientsSelection.exit().remove();
		arrowsSelection.exit().transition()
			.duration(600)
			.style('opacity', 0.0)
			.remove();

	},

	open: function () {

		// transition time from _states.scss::#states
		this.openCallout(1500);

		dispatcher.addListener(dispatcher.EVENTS.POPUP_CLOSE_BUTTON_CLICKED, this.onPopupCloseButtonClicked);

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

			dispatcher.removeListener(dispatcher.EVENTS.POPUP_CLOSE_BUTTON_CLICKED, this.onPopupCloseButtonClicked);

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	getUniversalLearnedTranslation: function (typeName, haloRadius) {
		let type = {
			'universal': 0,
			'learned': 1
		};
		let angle = this.calcAngle(type[typeName],'universalLearned', haloRadius),
			radius = this.calcRadius(type[typeName],'universalLearned', haloRadius);

		return 'translate('
			+  Math.cos(angle) * radius + 'px,' +
				Math.sin(angle) * radius + 'px)';
	},

	onResize: function () {

		// update halo
		let haloRadius = this.setUpGraphs(this.sectionContainer);

		// update gradients
		d3.select('#triggers-radial-gradient')
			.attr('r', haloRadius);

		// update labels, and halos that have already been rendered
		let w = this.sectionContainer.offsetWidth,
			h = (1 - sassVars.triggers.bottom.replace('%', '')/100) * this.sectionContainer.offsetHeight,
			haloArc = this.haloArcGenerator,
			innerRadius = haloArc.innerRadius(),
			pieLayoutData = this.haloPieLayout([{}]);

		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			// update halo if already rendered
			let graphContainer = this.graphContainers[emotion],
				haloSelection = graphContainer.selectAll('path.halo')
					.data(pieLayoutData);

			if (haloSelection.size()) {
				haloSelection.attr('d', haloArc);
			}

			// update label container
			let labelContainer = this.labelContainers[emotion];
			labelContainer.select('.arrows-container svg')
				.attr('width', this.sectionContainer.offsetWidth)
				.attr('height', h)
			.select('g')
				.attr('width', this.sectionContainer.offsetWidth)
				.attr('height', h)
				.attr('transform', 'translate(' + 0.5 * this.sectionContainer.offsetWidth + ',' + h + ')');

			// update labels + arrows
			this.triggersData[emotion].forEach((triggerDatum, i) => {
				triggerDatum.angle = this.calcAngle(i, emotion, haloRadius);
				triggerDatum.radius = this.calcRadius(i, emotion, haloRadius);
				triggerDatum.arrowLength = this.calcArrowLength(haloRadius, this.calcRadius(i, emotion, haloRadius), emotion, i);
			});

			// update universal/learned labels
			labelContainer.select(`.${TRIGGER_TYPES.UNIVERSAL}`)
				.style('transform', this.getUniversalLearnedTranslation('universal', haloRadius));
			labelContainer.select(`.${TRIGGER_TYPES.LEARNED}`)
				.style('transform', this.getUniversalLearnedTranslation('learned', haloRadius));

			this.renderLabels(emotion);

			// update phase labels
			labelContainer.select('.trigger-phase-labels').selectAll('.emotion-label')
				.style('top', (d, i) => {
					switch (i) {
						case 0:
							return Math.round(-1.4 * haloRadius) + 'px';
						case 1:
							return Math.round(-0.9 * haloRadius) + 'px';
						case 2:
							return Math.round(-0.65 * haloRadius) + 'px';
					}
				});

		});

		// update hit areas
		let hitAreaContainer = document.querySelector('#trigger-hit-area-container'),
			svg = d3.select('#trigger-hit-area-container svg')
				.attr('width', hitAreaContainer.offsetWidth)
				.attr('height', hitAreaContainer.offsetHeight),
			container = svg.select('g')
				.attr('transform', 'translate(' + (0.5 * w) + ',' + h + ')');

		container.selectAll('.hit-area')
			.each(function (d, i) {
				switch (i) {
					case 0:
						d3.select(this)
							.attr('x', -w/2)
							.attr('y', -h)
							.attr('width', w)
							.attr('height', h);
						return;
					case 1:
						d3.select(this)
							.data(pieLayoutData)
							.attr('d', haloArc);
						return;
					case 2:
						let innerArcGenerator = d3.svg.arc()
							.innerRadius(0)
							.outerRadius(innerRadius);
						d3.select(this)
							.data(pieLayoutData)
							.attr('d', innerArcGenerator);
						return;
				}
			});

	},

	showTriggerPopup: function (emotion, triggerType) {

		if (triggerType !== TRIGGER_TYPES.UNIVERSAL && triggerType !== TRIGGER_TYPES.LEARNED) { return; }

		let unselectedTriggerType = triggerType === TRIGGER_TYPES.UNIVERSAL ? TRIGGER_TYPES.LEARNED : TRIGGER_TYPES.UNIVERSAL;

		// show the selected one, hide the unselected one
		this.labelContainers[emotion].select(`.${triggerType}`)
			.classed('visible', true);
		this.labelContainers[emotion].select(`.${unselectedTriggerType}`)
			.classed('visible', false);

		const step = emotionsData.metadata.triggers.steps[triggerType === TRIGGER_TYPES.UNIVERSAL ? 3 : 4];
		dispatcher.popupChange('triggers', emotion +'-'+ triggerType, step.body);

	},

	onHitAreaMouseOver: function (hitAreaId) {

		this.displayHighlightedHitArea(hitAreaId);

	},

	onHitAreaMouseOut: function (hitAreaId) {

		this.displayHighlightedHitArea(null);
	},

	onPhaseLabelClick: function (hitAreaId) {

		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		this.setHighlightedHitArea(hitAreaId);
	},

	onPopupCloseButtonClicked: function (evt) {

		// hide all universal/learned labels
		d3.select(this.sectionContainer).selectAll('.universal, .learned')
			.classed('visible', false);

		this.highlightedHitArea = null;

	},

	setHitAreasLocked: function (val) {
		this.hitAreasLocked = val;
	},

	setHighlightedHitArea: function (hitAreaId) {

		if (hitAreaId === this.highlightedHitArea) {
			this.highlightedHitArea = null;
			this.displayHighlightedHitArea(null);
			this.setCallout(null);
		} else {
			this.highlightedHitArea = hitAreaId;
			this.displayHighlightedHitArea();
			this.setCallout(hitAreaId);
		}

	},

	displayHighlightedHitArea: function (hitAreaId) {

		// wrap in timeout to resolve after mouseenter/leave events that could set hitAreasLocked
		setTimeout(() => {

			if (this.hitAreasLocked) { return; }

			hitAreaId = hitAreaId || this.highlightedHitArea || null;

			let graphContainer = this.graphContainers[this.currentEmotion],
				phaseLabels = this.labelContainers[this.currentEmotion].selectAll('.trigger-phase-labels .emotion-label'),
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

			phaseLabels
				.each(function (d, i) {
					d3.select(this).classed('highlighted', i === hitAreaId - 1);
				});

		}, 1);

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

		// hide all universal/learned labels
		d3.select(this.sectionContainer).selectAll('.universal, .learned')
			.classed('visible', false);

		if (hitAreaId) {
			const step = emotionsData.metadata.triggers.steps[hitAreaId-1];
			dispatcher.popupChange('triggers', `${this.currentEmotion}-${step.header.toLowerCase()}`, step.body);
		} else {
			dispatcher.popupChange();
			dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.triggers.header, emotionsData.metadata.triggers.body);

			// this should technically be in a popup closed handler,
			// but popupManager only dispatches events for popup close button clicks.
			// so, it's here as well as in onPopupCloseButtonClicked.
			this.highlightedHitArea = null;
		}

	}

};
