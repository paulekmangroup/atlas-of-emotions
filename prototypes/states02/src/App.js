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

	currentEmotion: 'anger',
	
	init: function (containerNode) {

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

		let areaGenerator = d3.svg.area()
			.x(d => xScale(d.x))
			.y0(innerHeight)
			.y1(d => yScale(d.y));

		this.setUpGradients(svg.append('defs'), xScale, yScale);

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
			.attr('d', areaGenerator)
			.attr('fill', (d, i) => 'url(#' + emotionGradientName + '-' + i + ')')
			.on('mouseover', this.onStateMouseOver)
			.on('mouseout', this.onStateMouseOut)
			.on('click', this.onStateClick);

		// grow the states upwards
		transformedRanges = this.transformRanges(_.values(emotionsData.emotions[this.currentEmotion].states), this.currentEmotion, 1.0);
		stateGraphContainer.selectAll('path.area')
			.data(transformedRanges)
		.transition()
			.ease(d3.ease('elastic-in', 1.5, 0.75))
			.delay((d, i) => 500 + Math.random() * 100 * i)
			.duration(1000)
			.attr('d', areaGenerator);

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

	setUpGradients (defs, xScale, yScale) {

		// anger
		defs.append('linearGradient')
			.attr('id', 'anger-gradient')
			.attr('gradientUnits', 'userSpaceOnUse')

			// these will be set manually on each path's gradient
			.attr('x1', xScale(0))
			.attr('x2', xScale(10))

			.attr('y1', yScale(0))
			.attr('y2', yScale(0))
		.selectAll('stop')
			.data([
				{ offset: '0%', color: 'rgba(228, 135, 102, 0.2)' },
				{ offset: '100%', color: 'rgba(204, 28, 43, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// sadness
		// TODO

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

		}

	}

};
