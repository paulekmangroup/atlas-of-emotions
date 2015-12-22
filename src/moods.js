import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import appStrings from '../static/appStrings.json';
import states from './states.js';
import actions from './actions.js';

export default {

	isInited: false,
	currentEmotion: null,
	moodsData: null,
	backgroundSections: [ states, actions ],
	tempNav: null,
	
	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.overlayContainer = document.createElement('div');
		this.overlayContainer.id = 'moods-overlay-container';
		containerNode.appendChild(this.overlayContainer);

		this.createTempNav(containerNode);

	},

	setEmotion: function (emotion) {

		if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
			emotion = 'anger';
		}
		this.currentEmotion = emotion;

		this.overlayContainer.removeAttribute('style');
		this.overlayContainer.classList.add(this.currentEmotion);

		// TODO: move this to mouse handler
		this.overlayContainer.classList.add('visible');
		
		this.tempNav.querySelector('.prev').innerHTML = '<a href="#triggers:' + emotion + '">TRIGGERS ▲</a>';
		this.tempNav.classList.add('visible');

	},

	open: function () {

		// TODO: implement if useful

	},

	close: function () {

		return new Promise((resolve, reject) => {

			this.tempNav.classList.remove('visible');

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	createTempNav (containerNode) {

		this.tempNav = document.createElement('div');
		this.tempNav.id = 'temp-moods-nav';
		containerNode.appendChild(this.tempNav);

		let prev = document.createElement('div');
		prev.classList.add('prev');
		this.tempNav.appendChild(prev);

	}

};
