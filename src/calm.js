import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';

export default {

	isInited: false,
	currentEmotion: null,
	
	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.isInited = true;

	},

	setEmotion: function (emotion) {

		return new Promise((resolve, reject) => {

			// leave a bit of time for other transitions to happen
			this.openCallout(500);

			// TODO: resolve after any intro animations
			setTimeout(() => {
				resolve();
			}, 500);

		});

	},

	open: function () {

		// transition time from _states.scss::#states
		this.openCallout(1500);

	},

	close: function () {

		return new Promise((resolve, reject) => {

			// any closing animation goes here

			resolve();

		});

	},

	openCallout: function (delay) {

		if (!this.calloutTimeout) {
			this.calloutTimeout = setTimeout(() => {
				this.setCallout(false);
				this.calloutTimeout = null;
			}, delay);
		}

	},

	setCallout: function (active) {

		/*
		if (active) {
			let moodsCopy = emotionsData.emotions[this.currentEmotion].moods[0];
			dispatcher.changeCallout(this.currentEmotion, moodsCopy.name, moodsCopy.desc);
		} else {
			dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.moods.header, emotionsData.metadata.moods.body);
		}
		*/
		dispatcher.changeCallout(null, 'ACHIEVING CALM', 'Calm is a state of mind... --PLACEHOLDER--');

	}

};
