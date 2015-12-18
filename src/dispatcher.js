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
		MOODS: 'moods'
	},

	EMOTIONS: {
		ANGER: 'anger',
		DISGUST: 'disgust',
		ENJOYMENT: 'enjoyment',
		FEAR: 'fear',
		SADNESS: 'sadness'
	},

	/**
	 * @param  {[type]} section Section navigating to
	 * @param  {[type]} emotion Emotion navigating to
	 */
	navigate: function (section, emotion) {

		if (!this.validateSection(section)) {
			throw new Error('Invalid section "' + section + '".');
		}

		if (!this.validateEmotion(emotion)) {
			throw new Error('Invalid emotion "' + emotion + '".');
		}

		this.emit(this.EVENTS.NAVIGATE, section, emotion);

	},

	/**
	 * @param  {[type]} section Section navigated away from
	 * @param  {[type]} emotion Emotion navigated away from
	 */
	navigateComplete: function (section, emotion) {

		if (section && !this.validateSection(section)) {
			throw new Error('Invalid section "' + section + '".');
		}

		if (emotion && !this.validateEmotion(emotion)) {
			throw new Error('Invalid emotion "' + emotion + '".');
		}

		this.emit(this.EVENTS.NAVIGATE_COMPLETE, section, emotion);

	},

	changeCallout: function (emotion, title, body) {

		this.emit(this.EVENTS.CHANGE_CALLOUT, emotion, title, body);

	},

	setEmotionState: function (state) {

		this.emit(this.EVENTS.CHANGE_EMOTION_STATE, state);

	},

	validateSection: function (section) {

		return Object.keys(this.SECTIONS).some(key => this.SECTIONS[key] === section);

	},

	validateEmotion: function (emotion) {

		return Object.keys(this.EMOTIONS).some(key => this.EMOTIONS[key] === emotion);

	}

};

// Mixin EventEmitter functionality
Object.assign(dispatcher, EventEmitter.prototype);

export default dispatcher;
