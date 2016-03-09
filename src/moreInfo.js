import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import secondaryData from '../static/secondaryData.json';
import sassVars from '../scss/variables.json';

// Pages
import About from './more-pages/about.js';
import Donate from './more-pages/donate.js';
import Further from './more-pages/further.js';
import Annex from './more-pages/annex.js';
import AnnexEpisodeTimeline from './more-pages/annex-episode-timeline.js';
import AnnexImpedimentAntidote from './more-pages/annex-impediment-antidote.js';
import AnnexIntrinsicRemedial from './more-pages/annex-intrinsic-remedial.js';
import AnnexPartiallyCharted from './more-pages/annex-partially-charted.js';
import AnnexPsychopathologies from './more-pages/annex-psychopathologies.js';
import AnnexScientificBasis from './more-pages/annex-scientific-basis.js';
import AnnexSignals from './more-pages/annex-signals.js';
import AnnexTraits from './more-pages/annex-traits.js';

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
		console.log('Set Emotion: ', currentEmotion, previousEmotion);
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

	},

	close: function () {
		
		this.toggleMoreClass(false);

		return new Promise((resolve, reject) => {

			// any closing animation goes here

			resolve();

		});

	},

	onResize: function () {

		//
		
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

		dispatcher.ANNEX_SECTIONS.forEach(item => {
			containerEl = document.createElement('div');
			const id = `more-${item}`;
			containerEl.id = `more-${item}`;
			containerEl.classList.add('more-child');
			this.sectionContainer.appendChild(containerEl);
			this.containers[item] = containerEl;
		});
	},

	initialPages: function () {
		this.pages.about = About;
		this.pages.donate = Donate;
		this.pages.further = Further;
		this.pages.annex = Annex;
		this.pages['annex-episode-timeline'] = AnnexEpisodeTimeline;
		this.pages['annex-partially-charted'] = AnnexPartiallyCharted;
		this.pages['annex-traits'] = AnnexTraits;
		this.pages['annex-signals'] = AnnexSignals;
		this.pages['annex-psychopathologies'] = AnnexPsychopathologies;
		this.pages['annex-scientific-basis'] = AnnexScientificBasis;
		this.pages['annex-impediment-antidote'] = AnnexImpedimentAntidote;
		this.pages['annex-intrinsic-remedial'] = AnnexIntrinsicRemedial;
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
