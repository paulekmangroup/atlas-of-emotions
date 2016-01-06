import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
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

		this.onElementOver = this.onElementOver.bind(this);
		this.onElementOut = this.onElementOut.bind(this);
		this.onElementClick = this.onElementClick.bind(this);
		this.onBackgroundClick = this.onBackgroundClick.bind(this);

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

		
		this.tempNav.querySelector('.prev').innerHTML = '<a href="#triggers:' + emotion + '">TRIGGERS ▲</a>';
		this.tempNav.classList.add('visible');

	},

	open: function () {

		// TODO: delegate this responsibility to states.js and actions.js
		document.querySelector('#state-graph-container').addEventListener('mouseover', this.onElementOver, true);
		document.querySelector('#action-graph-container g').addEventListener('mouseover', this.onElementOver, true);
		document.querySelector('#state-graph-container').addEventListener('mouseout', this.onElementOut, true);
		document.querySelector('#action-graph-container g').addEventListener('mouseout', this.onElementOut, true);
		document.querySelector('#state-graph-container').addEventListener('click', this.onElementClick, true);
		document.querySelector('#action-graph-container g').addEventListener('click', this.onElementClick, true);

		// transition time from _states.scss::#states
		let openDelay = 1500;

		this.openTimeout = setTimeout(() => {
			this.setCallout(false);
		}, openDelay);

	},

	close: function () {

		// TODO: delegate this responsibility to states.js and actions.js
		document.querySelector('#state-graph-container').removeEventListener('mouseover', this.onElementOver, true);
		document.querySelector('#action-graph-container g').removeEventListener('mouseover', this.onElementOver, true);
		document.querySelector('#state-graph-container').removeEventListener('mouseout', this.onElementOut, true);
		document.querySelector('#action-graph-container g').removeEventListener('mouseout', this.onElementOut, true);
		document.querySelector('#state-graph-container').removeEventListener('click', this.onElementClick, true);
		document.querySelector('#action-graph-container g').removeEventListener('click', this.onElementClick, true);
		document.querySelector('#main').removeEventListener('click', this.onBackgroundClick, true);

		return new Promise((resolve, reject) => {

			clearTimeout(this.openTimeout);

			this.overlayContainer.classList.remove('visible');

			this.tempNav.classList.remove('visible');

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	onElementOver: function (event) {

		event.stopImmediatePropagation();

		this.overlayContainer.classList.add('visible');
		document.querySelector('#main').removeEventListener('click', this.onBackgroundClick, true);

		// don't execute mouseout behavior when rolling from one hit area into another
		clearTimeout(this.mouseOutTimeout);

	},

	onElementOut: function (event) {

		event.stopImmediatePropagation();

		this.mouseOutTimeout = setTimeout(() => {

			this.overlayContainer.classList.remove('visible');
			document.querySelector('#main').addEventListener('click', this.onBackgroundClick, true);

		}, 100);
	},

	onElementClick: function (event) {

		event.stopImmediatePropagation();

		this.setCallout(true);

	},

	onBackgroundClick: function (event) {

		event.stopImmediatePropagation();

		this.setCallout(false);

	},

	setCallout (active) {

		if (active) {
			let moodsCopy = emotionsData.emotions[this.currentEmotion].moods[0];
			dispatcher.changeCallout(this.currentEmotion, moodsCopy.name, moodsCopy.desc);
		} else {
			dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.moods.header, emotionsData.metadata.moods.body);
		}

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
