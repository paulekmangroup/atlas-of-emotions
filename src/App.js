import _ from 'lodash';
import dispatcher from './dispatcher.js';
import continents from './continents.js';
import states from './states.js';

export default function (...initArgs) {

	let containers = {},
		sections = {},
		callout;

	let currentSection = null,
		currentEmotion = null;

	function init (containerNode) {

		initContainers();
		initSections();
		initCallout();

		document.addEventListener('keydown', onKeyDown);
		dispatcher.addListener(dispatcher.EVENTS.NAVIGATE, onNavigate);
		dispatcher.addListener(dispatcher.EVENTS.CHANGE_CALLOUT, onCalloutChange);
		window.addEventListener('hashchange', onHashChange);

		// size main container to viewport
		let headerHeight = 55;	// from _variables.scss
		containerNode.style.height = (window.innerHeight - headerHeight) + 'px';

		onHashChange(null, {
			section: dispatcher.SECTIONS.CONTINENTS,
			emotion: null
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

	function initCallout () {

		let mainEl = document.querySelector('#main');
		callout = document.createElement('div');
		callout.id = 'callout';

		let h3 = document.createElement('h3');
		h3.classList.add('title');
		callout.appendChild(h3);
		let p = document.createElement('p');
		p.classList.add('body');
		callout.appendChild(p);

		mainEl.appendChild(callout);

	}

	function setSection (sectionName) {

		let section = sections[sectionName];

		if (!section.isInited) {
			section.init(containers[sectionName]);
		}

		if (!currentSection) {
			
			// for now (until transitions implemented), just hide all but the current section
			for (let key in containers) {
				containers[key].style.display = (key === sectionName) ? '' : 'none';
			}

			// initial section; do not animate
			if (currentEmotion) {
				section.setEmotion(currentEmotion);
			}

		} else {

			// section already open; perform transition
			
			if (currentSection === section) {
				// change emotion within current section
				if (currentEmotion) {
					section.setEmotion(currentEmotion);
				}
			} else {
				// navigate between sections
				// TODO: implement animation
				section.open(currentEmotion);
			}

		}

		document.querySelector('#header h1').innerHTML = sectionName.toUpperCase();

		currentSection = section;

	}

	function setEmotion (emotion) {

		if (currentEmotion === emotion) { return; }

		// setSection cues up emotion changes,
		// making this function very simple.

		currentEmotion = emotion;

	}

	function onKeyDown (keyCode) {

		if (keyCode === 37 || keyCode === 39) {

			console.log('TODO: scroll to next emotion. This functionality will ultimately be accessible via a dropdown.');

		}

	}

	function onCalloutChange (emotion, title, body) {

		callout.removeAttribute('class');
		if (!title) { return; }

		// for (let i=0; i<callout.classList.length; i++) {
		// 	if (callout.classList.item(i))
		// }
		callout.classList.add('visible');
		callout.classList.add(emotion);

		callout.querySelector('.title').innerHTML = title;
		callout.querySelector('.body').innerHTML = body;

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
