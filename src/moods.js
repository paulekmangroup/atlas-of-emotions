import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import appStrings from './appStrings.js';
import sassVars from '../scss/variables.json';
import states from './states.js';
import actions from './actions.js';

export default {

	isInited: false,
	screenIsSmall: false,
	currentEmotion: null,
	moodsData: null,
	backgroundSections: [ states, actions ],
	calloutActive: false,
	// values are % of radius to edge for each mood circle
	moodCircleRadii: [1.15, .95, .75],

	init: function (containerNode, screenIsSmall) {

		this.sectionContainer = containerNode;

		this.screenIsSmall = screenIsSmall;

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

	resizeMoodIntesifiers: function() {
		let width = this.sectionContainer.offsetWidth,
			height = this.sectionContainer.offsetHeight;

		let radius = d3.min([width, height]) / 2;

		// update svg width/height
		this.moodCircles.attr("width", width).attr("height", height);

		// update circles cx/cy/r, and their gradients
		this.resizeMoodCircles(width, height, radius);
		this.resizeRadialGradients(width, height, radius);

	},

	resizeMoodCircles: function(width, height, radius) {

		let small = this.screenIsSmall;
		this.moodCircles.selectAll(".moodCircle")
			.attr(
				{'cx': width / 2,
				'cy': small ? height * 0.4 : height / 2,
				'r': function(d){return radius * d;}
			});

	},

	resizeRadialGradients: function (width, height, radius) {

		let small = this.screenIsSmall;
		this.moodCircleRadii.forEach(function(radiusMultiplier, index){
			d3.selectAll(".moods-defs").selectAll(".radial-gradient-" + index)
				.attr(
							{'cx': width / 2,
							'cy': small ? height * 0.4 : height / 2,
							'r': function(d){return radius * radiusMultiplier;}
						});
		});
	},

	initMoodIntensifiers: function() {

		let width = this.sectionContainer.offsetWidth,
			height = this.sectionContainer.offsetHeight;

		this.moodCircles = d3.select(this.sectionContainer).append('svg').attr("class", "moods-overlay-container");
		let radius = d3.min([width, height]) / 2;

		this.moodCircles.attr('width', width)
			.attr('height', height);

		let clickAction = this.onElementClick;

		this.moodCircles.selectAll(".moodCircle")
			.data(this.moodCircleRadii)
			.enter()
			.append("g")
			.append("circle")
				.attr('class', function(d,i){return 'moodCircle circle' + i;})
				.on('mouseover', this.screenIsSmall ? null : function(d, i) {
					if(d3.selectAll('.label').filter('.popped')[0].length == 0){
						d3.selectAll(".moodCircle").classed("highlight" + i, true);
						d3.selectAll(".label").classed("showBorder", true);
					}
				})
				.on('mouseout', this.screenIsSmall ? null : function(d, i){
					if(d3.selectAll('.label').filter('.popped')[0].length == 0){
						d3.selectAll(".moodCircle").classed("highlight" + i, false);
						d3.selectAll(".label").classed("showBorder", false);
					}
				})
				.on('click', function(d, i){
					if(i == 2){
						clickAction();
					}
				});

		this.resizeMoodCircles(width, height, radius);
		this.initGradientDefs(width, height, radius);


	},

	initGradientDefs: function(width, height, radius){
		let gradients = [
			{
				emotion: 'anger',
				data: [
				{ offset: '0%', color: 'rgba(228, 135, 102, 0.1)' },
				{ offset: '60%', color: 'rgba(214, 50, 60, .8)' },
				{ offset: '100%', color: 'rgba(204, 28, 43, 1.0)' }
				]
			},
			{
				emotion: 'fear',
				data: [
					{ offset: '0%', color: 'rgba(248, 58, 248, 0.1)' },
					{ offset: '60%', color: 'rgba(180, 45, 160, .8)' },
					{ offset: '100%', color: 'rgba(143, 39, 139, 1.0)' }
				]
			},
			{
				emotion: 'disgust',
				data: [
					{ offset: '0%', color: 'rgba(0, 142, 69, 0.1)' },
					{ offset: '60%', color: 'rgba(0, 110, 58, .8)' },
					{ offset: '100%', color: 'rgba(0, 104, 55, 1.0)' }
				]
			},
			{
				emotion: 'sadness',
				data: [
					{ offset: '0%', color: 'rgba(200, 220, 240, 0.1)' },
					{ offset: '60%', color: 'rgba(90, 110, 180, .8)' },
					{ offset: '100%', color: 'rgba(64, 70, 164, 1.0)' }
				]
			},
			{
				emotion: 'enjoyment',
				data: [
					{ offset: '0%', color: 'rgba(241, 196, 83, 0.1)' },
					{ offset: '60%', color: 'rgba(246, 150, 40, .8)' },
					{ offset: '100%', color: 'rgba(248, 136, 29, 1.0)' }
				]
			},
		];

		let defsSvg = d3.select(this.sectionContainer).append('svg')
			.classed('moods-defs', true)
			.append('defs');

		this.moodCircleRadii.forEach(function(radiusMultiplier, index){
			defsSvg.selectAll(".radialGradient")
				.data(gradients)
				.enter()
				.append('radialGradient')
				.attr('xlink:href', function(d){'#' + 'moods-' + d.emotion+ '-radial-gradient' + '-' + index;})
				.attr('id', function(d){return 'moods-' + d.emotion + '-radial-gradient' + '-' + index;})
					.attr('gradientUnits', 'userSpaceOnUse')
					.attr('class', 'radial-gradient-' + index)
					.selectAll('stop')
						.data(function(d){return d.data;})
					.enter().append('stop')
						.attr('offset', d => d.offset)
						.attr('stop-color', d => d.color);
		});

		this.resizeRadialGradients(width, height, radius);

	},

	initLabels: function () {

		const label = this.labelContainer
			.append('div')
			.attr('class', 'emotion-label label');

		label.append('h3');
		label.on('click', this.onElementClick);

	},

	updateLabel: function () {

		let emotionData = appStrings().getStr(`emotionsData.emotions.${ this.currentEmotion }`);
		if (!this.currentEmotion || !emotionData) return;
		if (this.screenIsSmall) return;

		let moodName = appStrings().getStr(`emotionsData.emotions.${ this.currentEmotion }.moods[0].name`);

		const label = this.labelContainer.select('.emotion-label');
		label
			.attr('class', `emotion-label label ${this.currentEmotion} visible default-interactive-helper`)
			.attr('data-popuptarget', `moods:${this.currentEmotion}`);

		label.select('h3').text(moodName.toUpperCase());

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
			}, 1500);

			// enter circles here (?)

			if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
				emotion = 'anger';
			}
			let previousEmotion = this.currentEmotion;
			this.currentEmotion = emotion;

			if (previousEmotion) {
				this.moodCircles.selectAll("circle").classed(previousEmotion, false);
			}

			// to reference inside of function below with different 'this'
			let currentEmotion = this.currentEmotion;
			this.moodCircles.selectAll("circle").classed(this.currentEmotion, true)
				.attr('fill', function(d,i){return 'url(#' + 'moods-' + currentEmotion + '-radial-gradient' + '-' + i +')';});

			if (previousEmotion !== this.currentEmotion) this.updateLabel();

			// leave a bit of time for other transitions to happen
			this.labelContainer.select('.emotion-label').classed('visible', false);
			this.manageTextTransition(500);

			// resolve after backgrounded elements complete their transitions
			setTimeout(() => {
				resolve();
			}, sassVars.states.backgrounded.duration.in);

		});

	},

	open: function () {

		// transition time from _states.scss::#states
		this.manageTextTransition(1500);

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

	onResize: function (screenIsSmall) {

		this.screenIsSmall = screenIsSmall;

		this.resizeMoodIntesifiers();

	},

	setBackgroundListener: function(pleaseSet) {
		document.querySelector('#moods').removeEventListener('click', this.closeThings, false);

		if (pleaseSet) {
			document.querySelector('#moods').addEventListener('click', this.closeThings, false);
		}

	},

	onElementClick: function (event) {

		if (d3.event) {
			d3.event.preventDefault();
			d3.event.stopImmediatePropagation();
		}

		let activate = !this.calloutActive,
			lightenEmotion = this.currentEmotion === dispatcher.EMOTIONS.FEAR ||
				this.currentEmotion === dispatcher.EMOTIONS.DISGUST ||
				this.currentEmotion === dispatcher.EMOTIONS.SADNESS;

		// on mobile, toggle mood circle highlights here
		// instead of in mouseover/mouseout handlers
		if (this.screenIsSmall) {
			d3.selectAll(".moodCircle")
				.each(function (d, i) {
					this.classList[activate ? 'add' : 'remove'](`highlight${ i }`);
					if (lightenEmotion) this.classList[activate ? 'add' : 'remove']('mobile-lighten');
				});
		}

		this.setCallout(activate);


	},

	manageTextTransition: function (delay) {

		// on timeout takes care of callout and label transition

		if (!this.calloutTimeout) {
			this.calloutTimeout = setTimeout(() => {
				this.setCallout(false);
				this.labelContainer.select('.emotion-label').classed('visible', true);
				this.calloutTimeout = null;
			}, delay);
		}

	},

	setCallout: function (active) {

		this.calloutActive = active;
		if (active) {
			let moodHeader = this.screenIsSmall ? appStrings().getStr(`emotionsData.emotions.${ this.currentEmotion }.moods[0].name`) : this.currentEmotion,
				moodDesc = appStrings().getStr(`emotionsData.emotions.${ this.currentEmotion }.moods[0].desc`);
			// will want to set popup up here
			dispatcher.popupChange('moods', moodHeader, moodDesc);
			this.setBackgroundListener(true);
		} else {
			dispatcher.popupChange();
			dispatcher.changeCallout(this.currentEmotion, appStrings().getStr('emotionsData.metadata.moods.header'), appStrings().getStr('emotionsData.metadata.moods.body'));
			this.setBackgroundListener(false);
		}

	}

};
