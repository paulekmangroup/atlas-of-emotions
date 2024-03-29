import d3 from 'd3';
import _ from 'lodash';
import emotionsData from '../static/emotions-data.json';

export default {

	emotions: [
		'anger',
		'fear',
		'disgust',
		'sadness',
		'enjoyment'
	],

	currentEmotion: null,

	areaGenerators: null,

	transitions: null,
	
	init: function (containerNode, currentEmotion) {

		if (!~this.emotions.indexOf(currentEmotion)) {
			currentEmotion = 'anger';
		}
		this.currentEmotion = currentEmotion;

		this.onKeyDown = this.onKeyDown.bind(this);
		document.addEventListener('keydown', this.onKeyDown);

		// size main container to viewport
		let headerHeight = 55;	// from _variables.scss
		containerNode.style.height = (window.innerHeight - headerHeight) + 'px';

		let statesContainer = document.getElementById('states');

		// 
		// d3 conventional margins
		// 
		let margin = {
			top: 20,
			right: 20,
			bottom: 50,
			left: 20
		};

		let innerWidth = statesContainer.offsetWidth - margin.left - margin.right;
		let innerHeight = statesContainer.offsetHeight - margin.top - margin.bottom;

		let svg = d3.select(statesContainer).append('svg')
			.attr('width', statesContainer.offsetWidth)
			.attr('height', statesContainer.offsetHeight);

		let stateGraphContainer = svg.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		// 
		// d3/svg setup
		// 
		let xScale = d3.scale.linear()
			.domain([0, 10])
			.range([0, innerWidth]);

		let yScale = d3.scale.linear()
			.domain([0, 10])
			.range([innerHeight, 0]);

		let xAxis = d3.svg.axis()
			.scale(xScale)
			.orient('bottom')
			.ticks(10)
			.tickFormat(d => '')
			.tickSize(10);

		let labelsXScale = d3.scale.ordinal()
			.domain(['LEAST INTENSE', 'MOST INTENSE'])
			.range(xScale.range());
		let xAxisLabels = d3.svg.axis()
			.scale(labelsXScale)
			.orient('bottom')
			.tickSize(25);

		this.setUpDefs(svg.append('defs'), xScale, yScale);

		this.areaGenerators = this.setUpAreaGenerators(innerHeight, xScale, yScale);

		this.transitions = this.setUpTransitions();

		//
		// Draw graph
		// 
		stateGraphContainer.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + innerHeight + ')')
			.call(xAxis);

		stateGraphContainer.append('g')
			.attr('class', 'x axis labels')
			.attr('transform', 'translate(0,' + innerHeight + ')')
			.call(xAxisLabels)
		// align labels
		.selectAll('.tick text')
			.attr('text-anchor', (d, i) => i ? 'end' : 'start')
			.attr('style', null);

		// transform state range into points for area chart
		let transformedRanges = this.transformRanges(_.values(emotionsData.emotions[this.currentEmotion].states), this.currentEmotion, 0.0);

		let stateElements = stateGraphContainer.selectAll('path.area')
			.data(transformedRanges).enter();
		let emotionGradientName = this.currentEmotion + '-gradient';

		stateElements.append('linearGradient')
			.attr('xlink:href', '#' + emotionGradientName)
			.attr('id', (d, i) => emotionGradientName + '-' + i)
			.attr('x1', d => xScale(d[0].x))
			.attr('x2', d => xScale(d[2].x));

		let statePaths = stateElements.append('path')
			.attr('class', 'area')
			.attr('d', this.areaGenerators[this.currentEmotion])
			.attr('fill', (d, i) => 'url(#' + emotionGradientName + '-' + i + ')')
			.call(this.applyEffects.bind(this))
			.on('mouseover', this.onStateMouseOver)
			.on('mouseout', this.onStateMouseOut)
			.on('click', this.onStateClick);

		// grow the states upwards
		transformedRanges = this.transformRanges(_.values(emotionsData.emotions[this.currentEmotion].states), this.currentEmotion, 1.0);
		stateGraphContainer.selectAll('path.area')
			.data(transformedRanges)
			.call(this.applyTransitions.bind(this));

	},

	transformRanges: function (states, emotion, strengthMod=1.0) {

		// sort by state min value, then max value
		states = states.sort((a, b) => {
			if (a.range.min < b.range.min) {
				return -1;
			} else if (a.range.min > b.range.min) {
				return 1;
			} else {
				if (a.range.max < b.range.max) {
					return -1;
				} else if (a.range.max > b.range.max) {
					return 1;
				}
			}
			return 0;
		});

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
		 * out -> [
		 *	{ x: a, y: 0 },
		 *	{ x: a + (b-a)/2 + random offset, y: (b-a)/2 },
		 *	{ x: b, y: 0 },
		 * ]
		 */
		anger: function (states, strengthMod) {
			
			let numStates = states.length;
			return states.map((state, i) => {

				let points = [],
					min = state.range.min - 1,				// transform to 0-indexed, and allow
															// states with same min and max to display
					max = state.range.max,
					spread = max - min,
					offsetBase = 0.5 * (i / numStates);		// offsets skew left of center toward left edge
															// of graph, right of center toward right

				points.push({
					x: min,
					y: 0
				});
				points.push({
					x: min + spread * (offsetBase + 0.5 * Math.random()),
					y: strengthMod * (min + 0.5 * spread)
				});
				points.push({
					x: max,
					y: 0
				});

				return points;

			});

		},

		/**
		 * out -> [
		 *	{ x: a, y: 0 },
		 *	{ x: a + (b-a)/2 + random offset, y: (b-a)/2 },
		 *	{ x: b, y: 0 },
		 * ]
		 */
		sadness: function (states, strengthMod) {

			return this.anger(states, strengthMod);

		}

	},

	setUpDefs (defs, xScale, yScale) {

		// blur filter (sadness)
		defs.append('filter')
			.attr('id', 'sadness-blur')
			.attr('x', -16)
			.attr('y', -16)
			.attr('width', 128)
			.attr('height', 128)
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
			/*
			fear: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y)),

			disgust: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y)),
			*/
			sadness: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y))
				.interpolate('basis')
			/*
			enjoyment: d3.svg.area()
				.x(d => xScale(d.x))
				.y0(innerHeight)
				.y1(d => yScale(d.y)),
			*/
		
		};

	},

	setUpTransitions: function () {

		return {

			anger: {
				ease: d3.ease('elastic-in', 1.5, 0.75),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 1000
			},
			/*
			fear: {
				ease: d3.ease('linear'),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 1000
			},

			disgust: {
				ease: d3.ease('linear'),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 1000
			},
			*/
			sadness: {
				ease: d3.ease('elastic-in', 2.5, 2),
				delay: (d, i) => 250 + Math.random() * 1250,
				duration: 5000
			}
			/*
			enjoyment: {
				ease: d3.ease('linear'),
				delay: (d, i) => 500 + Math.random() * 100 * i,
				duration: 1000
			}
			*/
		
		};

	},

	applyEffects: function (selection) {

		if (this.currentEmotion === 'sadness') {
			selection
				.attr('filter', 'url(#sadness-blur)');
		}

	},

	applyTransitions: function (selection) {

		var transitionConfig = this.transitions[this.currentEmotion];

		selection.transition()
			.ease(transitionConfig.ease)
			.delay(transitionConfig.delay)
			.duration(transitionConfig.duration)
			.attr('d', this.areaGenerators[this.currentEmotion]);

	},

	onStateMouseOver: function (data, index) {

		d3.selectAll('path.area')
			.style('opacity', (d, i) => i === index ? 1.0 : 0.2);

		// .selectAll('linearGradient')
		// TODO: set stops with higher/lower opacity on #anger-gradient-{i}

	},

	onStateMouseOut: function (d, i) {

		d3.selectAll('path.area')
			.style('opacity', null);

	},

	onStateClick: function (d, i) {

		// d3.selectAll('path.area')

	},

	onKeyDown: function (keyCode) {

		if (keyCode === 37 || keyCode === 39) {

			console.log('TODO: scroll to next emotion. This functionality will ultimately be accessible via a dropdown.');

		}

	}

};
