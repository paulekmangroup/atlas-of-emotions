import d3 from 'd3';
import _ from 'lodash';

import dispatcher from '../dispatcher.js';
import contentJSON from '../../static/more-about.json';
import sassVars from '../../scss/variables.json';

export default {

	isInited: false,
	currentEmotion: null,

	init: function (containerNode) {

		this.sectionContainer = containerNode;
		this.isInited = true;

	},

	setTitle: function() {

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

		// any section-wide opening animations not specific to a particular page go here.
		// probably won't be anything here for the more info section.

	},

	close: function () {

		return new Promise((resolve, reject) => {

			// any closing animation goes here

			resolve();

		});

	}

};
