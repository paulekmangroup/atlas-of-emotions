import d3 from 'd3';
import _ from 'lodash';

import * as utils from './utils.js';
import dispatcher from '../dispatcher.js';
import sassVars from '../../scss/variables.json';

const FAKE = [
	{
		header: 'Step 1',
		name: 'Pre-Condition',
		nodes: []
	},
	{
		header: 'Step 2',
		name: 'Trigger',
		nodes: [
			{
				name: 'Event',
				outward: true,
				above: true
			},
			{
				name: 'Assessment',
				outward: true,
				above: false
			}
		]
	},
	{
		header: 'Step 3',
		name: 'State',
		nodes: [
			{
				name: 'Physical Changes',
				outward: false,
				above: true
			},
			{
				name: 'Psychological Changes',
				outward: false,
				above: false
			}
		]
	},
	{
		header: 'Step 4',
		name: 'Response',
		nodes: []
	},
	{
		header: 'Step 5',
		name: 'Post-Condition',
		nodes: []
	}
];

export default {

	isInited: false,
	currentEmotion: null,
	wrapper: null,

	init: function (containerNode, data) {
		this.data = data.annex['triggers-timeline'];

		this.sectionContainer = containerNode;

		this.wrapper = document.createElement('div');
		this.wrapper.classList.add('wrapper');
		this.sectionContainer.appendChild(this.wrapper);

		this.setContent();
		this.isInited = true;
	},

	setContent: function() {
		if (!this.wrapper) return;
		this.sectionContainer.appendChild(utils.makeAnnexBackNav(this.data.title));

		const brown = '#D4B49B';
		const grey = '#CBC2BB';
		const dkGrey = '#B4ABA4';
		const PADDING = 60;
		const ARROW_PADDING = 10;
		const PADDING_HALF = PADDING / 2;
		let SECTION_WIDTH = this.sectionContainer.offsetWidth / FAKE.length;
		const SECTION_HEIGHT = this.wrapper.offsetHeight - 100;

		// calc radius from dimensions
		const rw = (SECTION_WIDTH - PADDING) / 2;
		const rh = ((SECTION_HEIGHT - 3 * PADDING) / 3) / 2;
		const RADIUS = Math.min(rw, rh);

		// reset width based on new radius
		SECTION_WIDTH = RADIUS * 2 + PADDING;

		// arc generator for donuts
		const arc = d3.svg.arc()
		    .outerRadius(RADIUS)
		    .innerRadius(RADIUS - 15);

		// solid generator
		const arc2 = d3.svg.arc()
			.outerRadius(RADIUS);

		// pie layout for donuts
		const pie = d3.layout.pie()
		    .sort(null)
		    .padAngle(0.05)
		    .value(function(d) { return d; });

		// Begin drawing chart
		const svg = d3.select(this.wrapper).append('svg');

		svg
			.attr('width', FAKE.length * SECTION_WIDTH)
			.attr('height', SECTION_HEIGHT);

		// arrow marker
		const def = svg.append('defs');
		const marker = def.append('marker')
			.attr('id', 'arrow')
			.attr('markerWidth', 6)
			.attr('markerHeight', 6)
			.attr('viewBox', '-3 -3 6 6')
			.attr('refX', -1)
			.attr('refY', 0)
			.attr('markerUnits', 'strokeWidth')
			.attr('orient', 'auto');

		marker.append('polygon')
			.attr('points', '-1,0 -3,3 3,0 -3,-3')
			.attr('fill', dkGrey);


		// Container for all the circles & lines
		const container = svg.append('g')
			.attr('transform', `translate(0,0)`);


		// background
		container.append('rect')
			.attr('width', SECTION_WIDTH * FAKE.length)
			.attr('height', SECTION_HEIGHT)
			.attr('y', 0)
			.attr('x', 0)
			.attr('fill', '#E8D6C7')
			.attr('opacity', 1)
			.attr('stroke', '#E8D6C7');

		// draws that grey-ish background box under
		// state & reponse sections
		container.append('rect')
			.attr('width', SECTION_WIDTH * 2)
			.attr('height', SECTION_HEIGHT - 10 - 40)
			.attr('y', 40)
			.attr('x', 2 * SECTION_WIDTH)
			.attr('fill', grey)
			.attr('opacity', 0.3)
			.attr('stroke', grey);

		// Selective Filter Period text
		container.append('text')
			.attr('class', 'selective-text')
			.attr('x', SECTION_WIDTH * 2 + (SECTION_WIDTH / 2))
			.attr('y', SECTION_HEIGHT - 15)
			.text('Selective Filter Period');


		// Creating a group for each vertical section
		const sections = container.selectAll('.section')
			.data(FAKE);

		const enter = sections.enter()
			.append('g')
			.attr('class', 'section')
			.attr('transform', (d, i) => {
				const x = i * SECTION_WIDTH;
				return `translate(${x}, 0)`;
			});

		enter.append('g')
			.attr('class', 'main')
			.attr('transform', (d, i) => {
				const x = SECTION_WIDTH / 2;
				const y = SECTION_HEIGHT / 2;

				if (FAKE[i-1] && FAKE[i-1].nodes.length) {
					return `translate(${x}, ${y}) rotate(30)`;
				} else {
					return `translate(${x}, ${y}) rotate(-30)`;
				}

			});

		// main circle text
		// not inside group because
		// we rotate the group
		enter.append('text')
			.attr('x', SECTION_WIDTH / 2)
			.attr('y', SECTION_HEIGHT / 2)
			.attr('dy', 3)
			.text(d => d.name);

		// vertical section names
		enter.append('text')
			.attr('x', SECTION_WIDTH / 2)
			.attr('y', 20)
			.attr('dy', 3)
			.text(d => d.header);

		// The five main circles
		const mains = sections.select('.main').selectAll('.arcs')
			.data((d,i) => {
				const data = (d.nodes.length) ? pie([33,33,33]) : pie([100]);
				if (data.length === 1) {
					data[0].clr = '#fff';
				} else if (FAKE[i-1] && FAKE[i-1].nodes.length) {
					data[0].clr = '#fff';
					data[1].clr = grey;
					data[2].clr = brown;
				} else {
					data[0].clr = brown;
					data[1].clr = grey;
					data[2].clr = '#fff';
				}
				return data;
			});

		const mainsEnter = mains.enter()
			.append('g')
			.attr('class', 'arcs');

		mainsEnter.append('path')
			.attr('d', d => {
				if (d.data === 100) {
					return arc2(d);
				}

				return arc(d);
			})
			.attr('fill', d => d.clr);

		// Nodes that come off main nodes
		const subs = sections.selectAll('.node')
			.data((d, i) => d.nodes);

		const subEnter = subs.enter()
			.append('g')
			.attr('class', 'node')
			.attr('transform', (d, i) => {
				const x = SECTION_WIDTH / 2;
				const y = (d.above) ? (SECTION_HEIGHT / 2) - (RADIUS * 2 + PADDING_HALF) :
										(SECTION_HEIGHT / 2) + (RADIUS * 2 + PADDING_HALF);

				return `translate(${x}, ${y})`;
			});

		subEnter
			.append('circle')
			.attr('r', RADIUS)
			.attr('cx', 0)
			.attr('cy', 0)
			.attr('fill', (d,i) => {
				if (d.above) return brown;
				return grey;
			});

		subEnter.append('text')
			.attr('dy', 3)
			.text(d => d.name);


		// draw node lines that connect to main nodes
		subEnter
			.append('line')
			.attr('x1', (d,i) => {
				return 0;
			})
			.attr('x2', (d,i) => {
				return 0;
			})
			.attr('y1', (d, i) => {
				let y = 0;
				if (d.above) {
					if (d.outward) return RADIUS;
					return RADIUS + PADDING_HALF;
				} else {
					if (d.outward) return -RADIUS;
					return -(RADIUS + PADDING_HALF);
				}
			})
			.attr('y2', (d, i) => {
				const padOut = PADDING_HALF - ARROW_PADDING;
				if (d.above) {
					if (d.outward) return RADIUS + padOut;
					return RADIUS + ARROW_PADDING;
				} else {
					if (d.outward) return -(RADIUS + padOut);
					return -(RADIUS + ARROW_PADDING);
				}
			})
			.attr('marker-end', 'url(#arrow)');

		// draw the main connection lines
		container.selectAll('.main-lines')
			.data(FAKE)
			.enter()
			.append('line')
			.attr('class', 'main-lines')
			.attr('x1', (d,i) => {
				if (FAKE[i + 1]) {
					return (i * SECTION_WIDTH ) + (SECTION_WIDTH / 2) + RADIUS;
				}
			})
			.attr('x2', (d,i) => {
				if (FAKE[i + 1]) {
					const x = ((i + 1) * SECTION_WIDTH ) + (SECTION_WIDTH / 2) - RADIUS;
					return x - ARROW_PADDING;
				}
			})
			.attr('y1', (d,i) => {
				if (FAKE[i + 1]) {
					return SECTION_HEIGHT / 2;
				}
			})
			.attr('y2', (d,i) => {
				if (FAKE[i + 1]) {
					return SECTION_HEIGHT / 2;
				}
			})
			.attr('marker-end', 'url(#arrow)');

		// those little arrow between section names
		container.selectAll('.header-lines')
			.data(FAKE)
			.enter()
			.append('line')
			.attr('class', 'header-lines')
			.style('display', (d,i) => {
				if (i > 0 && i < FAKE.length) return 'block';
				return 'none';
			})
			.attr('x1', (d,i) => {
				return (i * SECTION_WIDTH ) - 15;
			})
			.attr('x2', (d,i) => {
				return (i * SECTION_WIDTH ) + 15;
			})
			.attr('y1', (d,i) => {
				return 20;
			})
			.attr('y2', (d,i) => {
				return 20;
			})
			.attr('marker-end', 'url(#arrow)');

		// draw that line that goes from end to beginning
		const sx = (FAKE.length - 1) * SECTION_WIDTH + SECTION_WIDTH / 2;
		const sy = SECTION_HEIGHT / 2 + RADIUS;
		const ex = SECTION_WIDTH / 2;

		let resetPath = `M ${sx} ${sy} V ${SECTION_HEIGHT-10} H ${ex} V ${sy + ARROW_PADDING}`;

		container.append('path')
			.attr('class', 'reset-path')
			.attr('d', resetPath)
			.attr('marker-end', 'url(#arrow)');

	},

	setEmotion: function (emotion) {

		return new Promise((resolve, reject) => {

			// TODO: resolve after any intro animations
			// setTimeout(() => {
			resolve();
			// }, sassVars.states.backgrounded.duration.in);

		});

	},

	open: function () {
		this.sectionContainer.classList.add('active');
		// any section-wide opening animations not specific to a particular page go here.
		// probably won't be anything here for the more info section.

	},

	close: function () {
		this.sectionContainer.classList.remove('active');
		return new Promise((resolve, reject) => {

			// any closing animation goes here

			resolve();

		});

	}

};
