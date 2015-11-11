import _ from 'lodash';

export default function (...initArgs) {

	const SECTIONS = {
			CONTINENTS: 'continents',
			STATES: 'states',
			ACTIONS: 'actions',
			TRIGGERS: 'triggers',
			MOODS: 'moods'
		},
		EMOTIONS = {
			ANGER: 'anger',
			FEAR: 'fear',
			DISGUST: 'disgust',
			SADNESS: 'sadness',
			ENJOYMENT: 'enjoyment'
		};

	let currentSection = null,
		defaultSection = SECTIONS.CONTINENTS,
		currentEmotion = null,
		defaultEmotion = EMOTIONS.ANGER;
	
	function init (containerNode, hash) {

		hash = parseHash(hash);

		initContainers();

		if (~_.values(SECTIONS).indexOf(hash.section)) {
			setSection(hash.section);
		} else {
			setSection(defaultSection);
		}

		if (~_.values(EMOTIONS).indexOf(hash.emotion)) {
			setEmotion(hash.emotion);
		} else {
			setEmotion(defaultEmotion);
		}

		document.addEventListener('keydown', onKeyDown);

		// size main container to viewport
		let headerHeight = 55;	// from _variables.scss
		containerNode.style.height = (window.innerHeight - headerHeight) + 'px';

	}

	function initContainers () {

		let mainEl = document.querySelector('#main'),
			containerEl;

		_.values(SECTIONS).forEach(section => {
			containerEl = document.createElement('div');
			containerEl.id = section;
			mainEl.appendChild(containerEl);
		});

	}

	function setSection (section) {

		if (currentSection === section) { return; }

		if (!currentSection) {
			// initial section; do not animate

		} else {
			// change between sections
			// TODO: implement animation
		}

		document.querySelector('#header h1').innerHTML = section.toUpperCase();

		currentSection = section;

	}

	function setEmotion (emotion) {

		if (currentEmotion === emotion) { return; }

		if (!currentEmotion) {
			// initial emotion; do not animate

		} else {
			// change between emotions
			// TODO: implement animation
		}

		currentEmotion = emotion;

	}

	function parseHash (hash) {

		if (!hash) { hash = ''; }
		let hashValues = hash.split(':');
		return {
			section: hashValues[0],
			emotion: hashValues[1]
		};

	}

	function onKeyDown (keyCode) {

		if (keyCode === 37 || keyCode === 39) {

			console.log('TODO: scroll to next emotion. This functionality will ultimately be accessible via a dropdown.');

		}

	}

	init(...initArgs);

}
