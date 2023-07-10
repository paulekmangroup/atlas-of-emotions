import d3 from 'd3';
import _ from 'lodash';
import smoothScroll from 'smoothscroll';

import * as utils from './utils.js';
import dispatcher from '../dispatcher.js';
import sassVars from '../../scss/variables.json';


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
