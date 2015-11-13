import _ from 'lodash';
import dispatcher from './dispatcher.js';
import continents from './continents.js';
import states from './states.js';

export default function (...initArgs) {

	let containers = {},
		sections = {};

	let currentSection = null,
		currentEmotion = null;

	function init (containerNode) {

		initContainers();
		initSections();

		document.addEventListener('keydown', onKeyDown);
		dispatcher.addListener(dispatcher.EVENTS.NAVIGATE, onNavigate);
		window.addEventListener('hashchange', onHashChange);

		// size main container to viewport
		let headerHeight = 55;	// from _variables.scss
		containerNode.style.height = (window.innerHeight - headerHeight) + 'px';

		onHashChange(null, {
			section: dispatcher.SECTIONS.CONTINENTS,
			emotion: dispatcher.EMOTIONS.ANGER
		});

	}

	function initContainers () {

		let mainEl = document.querySelector('#main'),
			containerEl;

		_.values(dispatcher.SECTIONS).forEach(section => {
			containerEl = document.createElement('div');
			containerEl.id = section;
			mainEl.appendChild(containerEl);
			containers[section] = containerEl;
		});

	}

	function initSections () {

		function placeholderSection (sectionName) {

			return {
				isInited: false,
				init: function (container) {
					console.warn('Section [' + sectionName + '] not yet implemented.');
				}
			};

		}

		sections.continents = continents;
		sections.states = states;

		sections.actions = placeholderSection(dispatcher.SECTIONS.ACTIONS);
		sections.triggers = placeholderSection(dispatcher.SECTIONS.TRIGGERS);
		sections.moods = placeholderSection(dispatcher.SECTIONS.MOODS);

	}

	function setSection (sectionName) {

		let section = sections[sectionName];
		if (currentSection === section) { return; }

		if (!section.isInited) {
			section.init(containers[sectionName], currentEmotion);
		}

		if (!currentSection) {
			// initial section; do not animate
			
			// for now (until transitions implemented), just hide all but the current section
			for (let key in containers) {
				containers[key].style.display = (key === sectionName) ? '' : 'none';
			}

		} else {
			// change between sections
			// TODO: implement animation
		}

		document.querySelector('#header h1').innerHTML = sectionName.toUpperCase();

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

	function onKeyDown (keyCode) {

		if (keyCode === 37 || keyCode === 39) {

			console.log('TODO: scroll to next emotion. This functionality will ultimately be accessible via a dropdown.');

		}

	}

	function onNavigate (section, emotion) {

		document.location.hash = section + ':' + emotion;

	}

	function onHashChange (event, defaults) {

		let hash = document.location.hash.replace(/^#/, '');
		hash = parseHash(hash);

		if (dispatcher.validateEmotion(hash.emotion)) {
			setEmotion(hash.emotion);
		} else if (defaults && defaults.emotion) {
			setEmotion(defaults.emotion);
		}

		if (dispatcher.validateSection(hash.section)) {
			setSection(hash.section);
		} else if (defaults && defaults.section) {
			setSection(defaults.section);
		}

	}

	function parseHash (hash) {

		if (!hash) { hash = ''; }
		let hashValues = hash.split(':');
		return {
			section: hashValues[0],
			emotion: hashValues[1]
		};

	}

	init(...initArgs);

};
