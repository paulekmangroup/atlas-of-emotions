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
	calloutActive: false,

	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.onElementOver = this.onElementOver.bind(this);
		this.onElementOut = this.onElementOut.bind(this);
		this.onElementClick = this.onElementClick.bind(this);

		//this.overlayContainer = document.createElement('div');
		//this.overlayContainer.id = 'moods-overlay-container';
		//containerNode.appendChild(this.overlayContainer);

		this.labelContainer = d3.select(containerNode)
			.append('div')
			.attr('class', 'label-container');

		this.initMoodIntensifiers();
		this.initLabels(this.labelContainer);

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
			.on('click', this.onElementClick);

	},

	initLabels: function () {
		const label = this.labelContainer
			.append('div')
			.attr('class', 'emotion-label label');

		label
			.append('h3');

		label.on('click', this.onElementClick);
	},

	updateLabel: function() {
		if (!this.currentEmotion || !emotionsData.emotions[this.currentEmotion]) return;
		let moodsCopy = emotionsData.emotions[this.currentEmotion].moods[0];

		const label = this.labelContainer.select('.emotion-label');
		label
			.attr('class', `emotion-label label ${this.currentEmotion} visible default-interactive-helper`)
			.attr('data-popuptarget', `moods:${this.currentEmotion}`);

		label.select('h3').text(moodsCopy.name.toUpperCase());
	},

	setEmotion: function (emotion) {
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


			if (previousEmotion !== this.currentEmotion) this.updateLabel();

			// leave a bit of time for other transitions to happen
			this.openCallout(500);

			// resolve after backgrounded elements complete their transitions
			setTimeout(() => {
				resolve();
			}, sassVars.states.backgrounded.duration.in);

		});

	},

	open: function () {
		this.labelContainer.select('.emotion-label').classed('visible', true);
		// transition time from _states.scss::#states
		this.openCallout(1500);

	},

	close: function () {
		this.labelContainer.select('.emotion-label').classed('visible', false);
		this.setBackgroundListener(false);

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

	setBackgroundListener: function(pleaseSet) {
		console.log('pleaseSet: ', pleaseSet);
		document.querySelector('#moods').removeEventListener('click', this.closeThings, false);

		if (pleaseSet) {
			document.querySelector('#moods').addEventListener('click', this.closeThings, false);
		}

	},

	onElementOver: function (event) {

		if (!event) { event = d3.event; }
		event.stopImmediatePropagation();

		// don't execute mouseout behavior when rolling from one hit area into another
	},

	onElementOut: function (event) {

		if (!event) { event = d3.event; }
		event.stopImmediatePropagation();

	},

	onElementClick: function (event) {
		if (d3.event) {
			d3.event.preventDefault();
			d3.event.stopImmediatePropagation();
		}

		if (this.calloutActive) {
			return this.setCallout(false);
		}

		this.setCallout(true);

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
		this.calloutActive = active;
		if (active) {
			let moodsCopy = emotionsData.emotions[this.currentEmotion].moods[0];
			// will want to set popup up here
			dispatcher.popupChange('moods', this.currentEmotion, moodsCopy.desc);
			this.setBackgroundListener(true);
		} else {
			dispatcher.popupChange();
			dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.moods.header, emotionsData.metadata.moods.body);
			this.setBackgroundListener(false);
		}
	}

};
