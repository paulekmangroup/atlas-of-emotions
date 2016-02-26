import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import secondaryData from '../static/secondaryData.json';
import sassVars from '../scss/variables.json';

// Pages
import About from './more-pages/about.js';
import Annex from './more-pages/annex.js';
import Donate from './more-pages/donate.js';
import Further from './more-pages/further.js';

// TODO: implement URL scheme for more info:
// #more:about
// #more:donate
// #more:further
// #more:annex-index
// #more:annex-episode-timeline
// #more:annex-partially-charted
// #more:annex-traits
// #more:annex-pathologies
// #more:annex-signals
// #more:annex-science

export default {

	isInited: false,
	currentEmotion: null,
	currentPage: null,
	previousPage: null,
	previousSection: null,
	pages: {},
	containers: {},

	init: function (containerNode) {
		this.sectionContainer = containerNode;

		this.initContainers();
		this.initialPages();

		document.querySelector('#more-close')
			.addEventListener('click', this.onCloseButtonClicked.bind(this));

		this.isInited = true;
	},

	setPreviousSection: function(previousSection) {
		this.previousSection = previousSection;
	},

	// Emotion in this context is the more-info page
	setEmotion: function (currentEmotion, previousEmotion, currentMorePage, previousMorePage) {
		this.previousPage = this.currentPage;
		this.currentPage = currentMorePage;
		this.currentEmotion = currentEmotion;

		return new Promise((resolve, reject) => {

			if (this.previousPage) {
				this.pages[this.previousPage].close();
			}

			if (this.currentPage && this.pages[this.currentPage]) {
				if (!this.pages[this.currentPage].isInited) {
					this.pages[this.currentPage].init(this.containers[this.currentPage], secondaryData);
				}
				this.pages[this.currentPage].open();
				this.pages[this.currentPage].setEmotion();
			}

			// TODO: resolve after any intro animations
			// setTimeout(() => {
			resolve();
			// }, sassVars.states.backgrounded.duration.in);

		});

	},

	open: function () {
		this.toggleMoreClass(true);

		// any section-wide opening animations not specific to a particular page go here.
		// probably won't be anything here for the more info section.

	},

	close: function () {
		this.toggleMoreClass(false);

		return new Promise((resolve, reject) => {

			// any closing animation goes here

			resolve();

		});

	},

	onCloseButtonClicked: function() {
		dispatcher.navigate(this.previousSection, this.currentEmotion, null);
	},

	initContainers: function() {
		let containerEl;

		dispatcher.MORE_INFO.items.forEach(item => {
			containerEl = document.createElement('div');
			const id = `more-${item.page}`;
			containerEl.id = `more-${item.page}`;
			containerEl.classList.add('more-child');
			this.sectionContainer.appendChild(containerEl);
			this.containers[item.page] = containerEl;
		});
	},

	initialPages: function () {
		this.pages.about = About;
		this.pages.annex = Annex;
		this.pages.donate = Donate;
		this.pages.further = Further;
	},

	toggleMoreClass: function (val) {
		const body = document.querySelector('body'),
			classList = body.classList;

		if (val) {
			body.classList.add('more-on');
		} else {
			body.classList.remove('more-on');
		}
	}

};
