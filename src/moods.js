import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';
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

		//this.overlayContainer = document.createElement('div');
		//this.overlayContainer.id = 'moods-overlay-container';
		//containerNode.appendChild(this.overlayContainer);

		this.initMoodIntensifiers();

		this.isInited = true;

	},

	initMoodIntensifiers: function() {

		this.moodCircles = d3.select(this.sectionContainer).append('svg').attr("class", "moods-overlay-container");
		let radius = d3.min([window.innerHeight, window.innerWidth]) / 2;

		this.moodCircles.attr('width', window.innerWidth)
			.attr('height', window.innerHeight);

		this.moodCircles.selectAll(".moodCircle")
			// values are % of radius to edge for each circle
			.data([1.15, .95, .75])
			.enter()
			.append("circle")
			.attr({
				'cx': window.innerWidth / 2,
				'cy': window.innerHeight / 2,
				'r': function(d){return radius * d;},
				'class': function(d,i){return 'moodCircle circle' + i;},
			})
			.on('mouseover', function(d, i){d3.selectAll(".moodCircle").classed("highlight" + i, true);})
			.on('mouseout', function(d, i){d3.selectAll(".moodCircle").classed("highlight" + i, false);})
			.on('click', function(d){console.log('circle clicked');});

	},

	setEmotion: function (emotion) {

		console.log('set emotion satrt');
		return new Promise((resolve, reject) => {
			// fade out circles
			function endFade(){
				d3.selectAll('.moodCircle').classed("fadeOutIn", false);
			}
			d3.selectAll('.moodCircle').classed("fadeOutIn", false);
			d3.selectAll('.moodCircle').classed("fadeOutIn", true);
			this.circleTimeout = setTimeout(() => {
				endFade();
			}, 2400);

			// enter circles here (?)

			if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
				emotion = 'anger';
			}
			let previousEmotion = this.currentEmotion;
			this.currentEmotion = emotion;

			if (previousEmotion) {
				this.moodCircles.selectAll("circle").classed(previousEmotion, false);
			}

			this.moodCircles.selectAll("circle").classed(this.currentEmotion, true);

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

			// resolve after backgrounded elements complete their transitions
			setTimeout(() => {
				resolve();
			}, sassVars.states.backgrounded.duration.in);

		});

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

			//this.overlayContainer.classList.remove('visible');

			// TODO: resolve on completion of animation
			resolve();

		});

	},

	onResize: function () {

		//

	},

	onElementOver: function (event) {

		if (!event) { event = d3.event; }
		event.stopImmediatePropagation();

		// don't execute mouseout behavior when rolling from one hit area into another
		document.querySelector('#main').removeEventListener('click', this.onBackgroundClick, true);
		clearTimeout(this.mouseOutTimeout);

	},

	onElementOut: function (event) {

		if (!event) { event = d3.event; }
		event.stopImmediatePropagation();

		this.mouseOutTimeout = setTimeout(() => {
			document.querySelector('#main').addEventListener('click', this.onBackgroundClick, true);
		}, 100);
	},

	onElementClick: function (event) {

		if (!event) { event = d3.event; }
		event.stopImmediatePropagation();
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
		console.log('>> Set Callout: ', active);
		if (active) {
			// will want to set popup up here
			// dispatcher.popupChange('states', statesData.name, statesData.desc);
			let moodsCopy = emotionsData.emotions[this.currentEmotion].moods[0];
			dispatcher.changeCallout(this.currentEmotion, moodsCopy.name, moodsCopy.desc);
		} else {
			dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.moods.header, emotionsData.metadata.moods.body);
		}

	}

};
