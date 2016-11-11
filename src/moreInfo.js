import d3 from 'd3';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import appStrings from './appStrings.js';
import sassVars from '../scss/variables.json';

// Pages
import About from './more-pages/about.js';
import Donate from './more-pages/donate.js';
import Further from './more-pages/further.js';
import EmoTrak from './more-pages/emotrak.js';
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
		this.previousPage = this.currentPage;
		this.currentPage = currentMorePage;
		this.currentEmotion = currentEmotion;

		return new Promise((resolve, reject) => {

			if (this.previousPage) {
				this.pages[this.previousPage].close();
			}

			if (this.currentPage && this.pages[this.currentPage]) {
				if (!this.pages[this.currentPage].isInited) {
					this.pages[this.currentPage].init(this.containers[this.currentPage], appStrings().getSecondaryDataBlock(this.getKeyByPage(this.currentPage)));
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
		console.log('RESIZE: ');
		if (!this.currentPage) return;

		if (typeof this.pages[this.currentPage].onResize === 'function') {
			this.pages[this.currentPage].onResize();
		}
	},

	onCloseButtonClicked: function() {
		dispatcher.navigate(this.previousSection, this.currentEmotion, null);
	},

	createContainer(id) {
		const containerEl = document.createElement('div');
		const innerwrapper = document.createElement('div');
		const outerwrapper = document.createElement('div');

		containerEl.id = id;

		containerEl.classList.add('more-child');
		outerwrapper.classList.add('outer-wrapper');

		outerwrapper.appendChild(innerwrapper);
		containerEl.appendChild(outerwrapper);

		if (id == 'more-about' || id == 'more-annex' || id == 'more-donate' || id == 'more-further' || id == 'more-emotrak') {
			// add back button for main more pages
			const innerinnerwrapper = document.createElement('div');
			innerinnerwrapper.classList.add('wrapper');
			innerwrapper.appendChild(innerinnerwrapper);
			this.setBackButton(innerwrapper);
		} else {
			innerwrapper.classList.add('wrapper');
		}

		return containerEl;
	},

	setBackButton: function(element) {
		const backToAtlas = document.createElement('div');
		backToAtlas.innerHTML = "<h4>BACK TO ATLAS</h4>";
		backToAtlas.classList.add('back-to-atlas');
		backToAtlas.addEventListener('click', this.onCloseButtonClicked.bind(this));
		element.appendChild(backToAtlas);
	},

	initContainers: function() {
		let containerEl;

		dispatcher.MORE_INFO.items.forEach(item => {
			containerEl = this.createContainer(`more-${item.page}`);

			this.sectionContainer.appendChild(containerEl);
			this.containers[item.page] = containerEl;
		});

		dispatcher.ANNEX_SECTIONS.forEach(item => {
			containerEl = this.createContainer(`more-${item}`);

			if (item.indexOf('annex-') === 0) {
				containerEl.classList.add('annex-subpage');
			}

			this.sectionContainer.appendChild(containerEl);
			this.containers[item] = containerEl;
		});
	},

	initialPages: function () {
		this.pages.about = About;
		this.pages.donate = Donate;
		this.pages.further = Further;
		this.pages.annex = Annex;
		this.pages.emotrak = EmoTrak;
		this.pages['annex-episode-timeline'] = AnnexEpisodeTimeline;
		this.pages['annex-partially-charted'] = AnnexPartiallyCharted;
		this.pages['annex-traits'] = AnnexTraits;
		this.pages['annex-signals'] = AnnexSignals;
		this.pages['annex-psychopathologies'] = AnnexPsychopathologies;
		this.pages['annex-scientific-basis'] = AnnexScientificBasis;
		this.pages['annex-impediment-antidote'] = AnnexImpedimentAntidote;
		this.pages['annex-intrinsic-remedial'] = AnnexIntrinsicRemedial;
	},

	/**
	 * Convert from the page name to the key name within secondary data.
	 */
	getKeyByPage: function (page) {
		switch (page) {
			case 'annex-psychopathologies':
				return 'annex-psychopathology';
			case 'annex-episode-timeline':
				return 'annex-triggers-timeline';
			case 'annex-intrinsic-remedial':
				return 'annex-intrinsic-or-intentional';
			case 'annex-traits':
				return 'annex-personality-trait';
			case 'further':
				return 'further-reading';
			default:
				return page;
		}
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
