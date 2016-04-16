import d3 from 'd3';
import _ from 'lodash';
import smoothScroll from 'smoothscroll';

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
		scrollTo: 'trigger',
		nodes: [
			{
				name: 'Event',
				outward: true,
				above: true,
				scrollTo: 'event'
			},
			{
				name: 'Perception',
				outward: true,
				above: false,
				scrollTo: 'perception'
			}
		]
	},
	{
		header: 'Step 3',
		name: 'State',
		scrollTo: 'state',
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
		name: 'Action',
		nodes: []
	},
	{
		header: 'Step 5',
		name: 'Post-Condition',
		nodes: []
	}
];

const brown = '#D4B49B';
const grey = '#CBC2BB';
const dkGrey = '#B4ABA4';

export default {

	isInited: false,
	currentEmotion: null,
	wrapper: null,

	init: function (containerNode, data) {
		this.data = data.annex['triggers-timeline'];

		this.sectionContainer = containerNode;

		this.wrapper = this.sectionContainer.querySelector('.wrapper');
		this.scrollContainer = this.sectionContainer.querySelector('.outer-wrapper');

		this.setContent();
		this.isInited = true;
	},

	setContent() {
		if (!this.wrapper) return;
		this.sectionContainer.appendChild(utils.makeAnnexBackNav(this.data.title));

		this.insertChartImage();
		this.wrapper.appendChild(utils.makeTable(this.data.desc, this.data.content));
		let wrapper = this.wrapper;
		this.data.footer.forEach(function(footerInfo){
			wrapper.appendChild(utils.makeTable(footerInfo, []));
		});

	},

	insertChartImage() {

		 d3.select(this.wrapper).append('img').attr("src", './img/episodeTimeline.png');

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

	},
	onResize: function () {
		//
	}

};
