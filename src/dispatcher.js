import { EventEmitter } from 'events';

const dispatcher = {

	EVENTS: {
		NAVIGATE: 'navigate',
		NAVIGATE_COMPLETE: 'navigateComplete',
		CHANGE_EMOTION_STATE: 'changeEmotionState',
		CHANGE_CALLOUT: 'changeCallout'
	},

	SECTIONS: {
		CONTINENTS: 'continents',
		STATES: 'states',
		ACTIONS: 'actions',
		TRIGGERS: 'triggers',
		MOODS: 'moods',
		CALM: 'calm',
		MORE: 'more'
	},

	EMOTIONS: {
		ANGER: 'anger',
		FEAR: 'fear',
		DISGUST: 'disgust',
		SADNESS: 'sadness',
		ENJOYMENT: 'enjoyment'
	},

	MORE_INFO: {
		title: 'More Information',
		items: [
			{
				label: 'The Annex',
				page: 'annex',
				pageName: 'Annex'
			},
			{
				label: 'About',
				page: 'about'
			},
			{
				label: 'Donate',
				page: 'donate'
			},
			{
				label: 'Further Reading',
				page: 'further'
			}
		]
	},

	ANNEX_SECTIONS: [
		'annex-episode-timeline',
		'annex-partially-charted',
		'annex-traits',
		'annex-signals',
		'annex-psychopathologies',
		'annex-scientific-basis',
		'annex-impediment-antidote',
		'annex-intrinsic-remedial'
	],

	ANNEX_DATA_2_PAGE: {
		'psychopathology': 'annex-psychopathologies',
		'personality-trait': 'annex-traits',
		'signals': 'annex-signals',
		'partially-charted': 'annex-partially-charted',
		'scientific-basis': 'annex-scientific-basis',
		'triggers-timeline': 'annex-episode-timeline',
		'impediment-antidote': 'annex-impediment-antidote',
		'intrinsic-or-intentional': 'annex-intrinsic-remedial'
	},

	/**
	 * @param  {[String]} section Section navigating to
	 * @param  {[String]} emotion Emotion navigating to
	 */
	navigate: function (section, emotion, more) {
		let page = emotion || more;

		if (section && !this.validateSection(section)) {
			throw new Error('Invalid section "' + section + '".');
		}

		if (emotion && !this.validateEmotion(emotion)) {
			throw new Error('Invalid emotion "' + emotion + '".');
		}

		this.emit(this.EVENTS.NAVIGATE, section, page);

	},

	changeCallout: function (emotion, title, body) {

		this.emit(this.EVENTS.CHANGE_CALLOUT, emotion, title, body);

	},

	setEmotionState: function (state, selected) {

		this.emit(this.EVENTS.CHANGE_EMOTION_STATE, state, selected);

	},

	validateSection: function (section) {

		return Object.keys(this.SECTIONS).some(key => this.SECTIONS[key] === section);

	},

	validateEmotion: function (emotion) {

		return Object.keys(this.EMOTIONS).some(key => this.EMOTIONS[key] === emotion);

	},

	validateMorePage: function(page) {

		return this.MORE_INFO.items.some(item => {
			if (item.page === page) return true;
			if (page.indexOf('annex') === 0 && this.ANNEX_SECTIONS.indexOf(page) > -1) return true;
			return false;
		});
	},

	getMorePageName: function (page) {
		if (page.indexOf('annex') === 0 && this.ANNEX_SECTIONS.indexOf(page) > -1) return 'Annex';

		const pageObject = this.MORE_INFO.items.filter((item) => item.page === page);
		if (!pageObject.length) return '';

		return pageObject[0].pageName || pageObject[0].label;
	}

};

// Mixin EventEmitter functionality
Object.assign(dispatcher, EventEmitter.prototype);

export default dispatcher;
