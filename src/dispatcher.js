import { EventEmitter } from 'events';

const dispatcher = {

	HASH_DELIMITER: '/',

	EVENTS: {
		NAVIGATE: 'navigate',
		NAVIGATE_COMPLETE: 'navigateComplete',
		CHANGE_EMOTION_STATE: 'changeEmotionState',
		CHANGE_EMOTION: 'changeEmotion',
		CHANGE_SECTION_TEXT: 'changeSectionText',
		MODAL_CHANGE: 'modalChange',
		POPUP_CHANGE: 'popupChange',
		POPUP_CLOSE_BUTTON_CLICKED: 'popupCloseButtonClicked',
		SECTION_GRAPHICS_RESIZE: 'sectionGraphicsResize',
		SECTION_TEXT_MAXIMIZE_START: 'sectionTextMaximizeStart',
		SECTION_TEXT_MAXIMIZE_COMPLETE: 'sectionTextMaximizeComplete',
		SECTION_TEXT_MINIMIZE_START: 'sectionTextMinimizeStart',
		SECTION_TEXT_MINIMIZE_COMPLETE: 'sectionTextMinimizeComplete',
		MAXIMIZE_SECTION_TEXT: 'maximizeSectionText',
		MINIMIZE_SECTION_TEXT: 'minimizeSectionText',
		ALLOW_MORE_CONTENT: 'allowMoreContent'
	},

	SECTIONS: {
		CONTINENTS: 'continents',
		STATES: 'states',
		ACTIONS: 'actions',
		TIMELINE: 'timeline',
		CALM: 'calm'
	},

	HOME: 'home',

	EMOTIONS: {
		ANGER: 'anger',
		FEAR: 'fear',
		DISGUST: 'disgust',
		SADNESS: 'sadness',
		ENJOYMENT: 'enjoyment'
	},
	DEFAULT_EMOTION: 'anger',

	MORE_INFO: {
		title: 'More Information',
		items: [
			{
				label: 'About this Atlas',
				page: 'about'
			},
			{
				label: 'The Annex',
				page: 'annex',
				pageName: 'Annex'
			},
			{
				label: 'Donate',
				page: 'donate'
			},
			{
				label: 'EmoTrak',
				page: 'emotrak'
			},
			{
				label: 'Additional Resources',
				page: 'further'
			}
		]
	},

	ANNEX_SECTIONS: [
		'annex-episode-timeline',
		'annex-partially-charted',
		'annex-traits',
		'annex-moods',
		'annex-signals',
		'annex-psychopathologies',
		'annex-scientific-basis',
		'annex-impediment-antidote',
		'annex-intrinsic-remedial'
	],

	ANNEX_DATA_2_PAGE: {
		'psychopathology': 'annex-psychopathologies',
		'personality-trait': 'annex-traits',
		'moods': 'annex-moods',
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
	 * @param  {[String]} morePage Secondary page (within More Information) navigating to
	 */
	navigate: function ( section, emotion, morePage ) {
		let subsection = emotion || morePage;

		if ( section && !this.validateSection( section ) && section !== this.HOME ) {
			throw new Error( 'Invalid section "' + section + '".' );
		}

		if ( emotion && !this.validateEmotion( emotion ) ) {
			throw new Error( 'Invalid emotion "' + emotion + '".' );
		}

		this.emit( this.EVENTS.NAVIGATE, section, subsection );

	},

	changeSectionText: function ( emotion, title, body ) {

		this.emit( this.EVENTS.CHANGE_SECTION_TEXT, emotion, title, body );

	},

	popupChange: function ( section, emotion, desc, secondaryData ) {

		this.emit( this.EVENTS.POPUP_CHANGE, section, emotion, desc, secondaryData );

	},

	popupCloseButtonClicked: function ( section, name ) {

		this.emit( this.EVENTS.POPUP_CLOSE_BUTTON_CLICKED, section, name );

	},

	sectionGraphicsResize: function () {

		this.emit( this.EVENTS.SECTION_GRAPHICS_RESIZE );

	},

	sectionTextMaximizeStart: function ( duration ) {

		this.emit( this.EVENTS.SECTION_TEXT_MAXIMIZE_START, duration );

	},

	sectionTextMaximizeComplete: function () {

		this.emit( this.EVENTS.SECTION_TEXT_MAXIMIZE_COMPLETE );

	},

	sectionTextMinimizeStart: function ( duration ) {

		this.emit( this.EVENTS.SECTION_TEXT_MINIMIZE_START, duration );

	},

	sectionTextMinimizeComplete: function () {

		this.emit( this.EVENTS.SECTION_TEXT_MINIMIZE_COMPLETE );

	},

	maximizeSectionText: function () {

		this.emit( this.EVENTS.MAXIMIZE_SECTION_TEXT );

	},

	minimizeSectionText: function () {

		this.emit( this.EVENTS.MINIMIZE_SECTION_TEXT );

	},

	allowMoreContent: function ( allow, section ) {

		this.emit( this.EVENTS.ALLOW_MORE_CONTENT );

	},

	setEmotionState: function ( state, selected ) {

		this.emit( this.EVENTS.CHANGE_EMOTION_STATE, state, selected );

	},

	setEmotion: function ( emotion ) {

		this.emit( this.EVENTS.CHANGE_EMOTION, emotion );

	},

	validateSection: function ( section ) {

		return Object.keys( this.SECTIONS ).some( key => this.SECTIONS[ key ] === section );

	},

	validateEmotion: function ( emotion ) {

		return Object.keys( this.EMOTIONS ).some( key => this.EMOTIONS[ key ] === emotion );

	}

};

// Mixin EventEmitter functionality
Object.assign( dispatcher, EventEmitter.prototype );

export default dispatcher;
