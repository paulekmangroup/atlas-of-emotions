import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import appStrings from '../static/appStrings.json';

export default {

	isInited: false,

	currentEmotion: null,
	
	init: function (containerNode) {

		//

	},

	initLabels: function (containerNode) {

		// TODO: implement if useful

	},

	renderLabels: function (ranges) {

		// TODO: implement if useful

	},

	setEmotion: function (emotion) {

		if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
			emotion = 'anger';
		}
		this.currentEmotion = emotion;

	},

	open: function () {

		// TODO: implement if useful

	},

	close: function () {

		return new Promise((resolve, reject) => {

			// TODO: resolve on completion of animation
			resolve();

		});

	}

};