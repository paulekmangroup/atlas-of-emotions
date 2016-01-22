import d3 from 'd3';
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
	
	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.onElementOver = this.onElementOver.bind(this);
		this.onElementOut = this.onElementOut.bind(this);
		this.onElementClick = this.onElementClick.bind(this);
		this.onBackgroundClick = this.onBackgroundClick.bind(this);

		this.overlayContainer = document.createElement('div');
		this.overlayContainer.id = 'moods-overlay-container';
		containerNode.appendChild(this.overlayContainer);

		this.isInited = true;

	},

	setEmotion: function (emotion) {

		if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
			emotion = 'anger';
		}
		let previousEmotion = this.currentEmotion;
		this.currentEmotion = emotion;

		this.overlayContainer.removeAttribute('style');
		if (previousEmotion) {
			this.overlayContainer.classList.remove(previousEmotion);
		}
		this.overlayContainer.classList.add(this.currentEmotion);

		states.applyEventListenersToEmotion(emotion, {
			mouseover: this.onElementOver,
			mouseout: this.onElementOut,
			click: this.onElementClick
		});

		actions.applyEventListenersToEmotion(emotion, {
			mouseover: this.onElementOver,
			mouseout: this.onElementOut,
			click: this.onElementClick
		});

		// leave a bit of time for other transitions to happen
		this.openCallout(500);

	},

	open: function () {

		// transition time from _states.scss::#states
		this.openCallout(1500);

	},

	close: function () {

		states.applyEventListenersToEmotion(this.currentEmotion, {
			mouseover: null,
			mouseout: null,
			click: null
		});

		actions.applyEventListenersToEmotion(this.currentEmotion, {
			mouseover: null,
			mouseout: null,
			click: null
		});

		document.querySelector('#main').removeEventListener('click', this.onBackgroundClick, true);

		return new Promise((resolve, reject) => {

			clearTimeout(this.calloutTimeout);

			this.overlayContainer.classList.remove('visible');

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	onElementOver: function (event) {

		if (!event) { event = d3.event; }
		event.stopImmediatePropagation();

		this.overlayContainer.classList.add('visible');
		document.querySelector('#main').removeEventListener('click', this.onBackgroundClick, true);

		// don't execute mouseout behavior when rolling from one hit area into another
		clearTimeout(this.mouseOutTimeout);

	},

	onElementOut: function (event) {

		if (!event) { event = d3.event; }
		event.stopImmediatePropagation();

		this.mouseOutTimeout = setTimeout(() => {

			this.overlayContainer.classList.remove('visible');
			document.querySelector('#main').addEventListener('click', this.onBackgroundClick, true);

		}, 100);
	},

	onElementClick: function (event) {

		if (!event) { event = d3.event; }
		event.stopImmediatePropagation();

		this.overlayContainer.classList.add('visible');
		this.setCallout(true);

	},

	onBackgroundClick: function (event) {

		event.stopImmediatePropagation();

		this.setCallout(false);

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

		if (active) {
			let moodsCopy = emotionsData.emotions[this.currentEmotion].moods[0];
			dispatcher.changeCallout(this.currentEmotion, moodsCopy.name, moodsCopy.desc);
		} else {
			dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.moods.header, emotionsData.metadata.moods.body);
		}

	}

};
