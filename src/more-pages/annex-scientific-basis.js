import d3 from 'd3';
import _ from 'lodash';

import * as utils from './utils.js';
import dispatcher from '../dispatcher.js';
import sassVars from '../../scss/variables.json';

export default {

	isInited: false,
	currentEmotion: null,
	wrapper: null,

	init: function (containerNode, data) {
		this.data = data.annex['scientific-basis'];

		this.sectionContainer = containerNode;

		this.wrapper = this.sectionContainer.querySelector('.wrapper');

		this.setContent();
		this.isInited = true;
	},

	setContent: function() {
		if (!this.wrapper) return;
		this.sectionContainer.appendChild(utils.makeAnnexBackNav(this.data.title));
		// intro
		this.wrapper.appendChild(utils.makeTable(this.data.desc, []));
		// survey results
		this.wrapper.appendChild(utils.makeTable(this.data.contentIntro, this.data.content));
		// footer content
		this.wrapper.appendChild(utils.makeTable(this.data.footer[0], []));
		this.wrapper.appendChild(utils.makeTable(this.data.footer[1], []));
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
