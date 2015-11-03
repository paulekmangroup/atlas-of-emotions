import d3 from 'd3';
import _ from 'lodash';
import emotionsData from '../static/emotions-data.json';

export default {
	
	init: function (containerNode) {

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
			bottom: 20,
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
		// d3 utils
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
			.tickFormat(String)
			.tickSize(10);

		let areaGenerator = d3.svg.area()
			.x(d => xScale(d.x))
			.y0(innerHeight)
			.y1(d => yScale(d.y));

		//
		// Draw graph
		// 
		stateGraphContainer.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + innerHeight + ')')
			.call(xAxis);

		// transform state range into points for area chart
		let transformedRanges = this.transformRanges(_.values(emotionsData.emotions.anger.states), 'anger');

		stateGraphContainer.selectAll('path.area')
			.data(transformedRanges)
		.enter().append('path')
			.attr('class', 'area')
			.attr('d', areaGenerator)
			.attr('transform', (d => 'translate(' + xScale(d[0].x) + ',0)'));

	},

	transformRanges: function (states, emotion) {

		const transformers = {
			'anger': this.transformAngerRanges,
			'fear': this.transformFearRanges,
			'disgust': this.transformDisgustRanges,
			'sadness': this.transformSadnessRanges,
			'enjoyment': this.transformEnjoymentRanges
		};

		return transformers[emotion](states);

	},

	transformAngerRanges: function (states) {

		// in -> { min: a, max: b }
		
		return states.map(state => {

			let points = [],
				min = state.range.min - 1,	// transform to 0-indexed, and allow
											// states with same min and max to display
				max = state.range.max,
				spread = max - min;

			points.push({
				x: min,
				y: 0
			});
			points.push({
				x: min + spread * (0.25 + 0.5 * Math.random()),
				y: min + 0.5 * spread
			});
			points.push({
				x: max,
				y: 0
			});

			return points;

		});

		// out -> [
		// 	{ x: a, y: 0 },
		// 	{ x: a + (b-a)/2 + random offset, y: (b-a)/2 },
		// 	{ x: b, y: 0 },
		// ]

	}

};
