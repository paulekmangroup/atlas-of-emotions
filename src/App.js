import _ from 'lodash';
import dispatcher from './dispatcher.js';
import continents from './continents.js';
import states from './states.js';

export default function (...initArgs) {

	const navigationDefaults = {
		section: dispatcher.SECTIONS.CONTINENTS,
		emotion: null
	};

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
		dispatcher.addListener(dispatcher.EVENTS.NAVIGATE_COMPLETE, onNavigateComplete);
		dispatcher.addListener(dispatcher.EVENTS.CHANGE_CALLOUT, onCalloutChange);
		window.addEventListener('hashchange', onHashChange);

		// size main container to viewport
		let headerHeight = 55;	// from _variables.scss
		containerNode.style.height = (window.innerHeight - headerHeight) + 'px';

		onHashChange();

	}

	function initContainers () {

		let mainEl = document.querySelector('#main'),
			containerEl;

		_.values(dispatcher.SECTIONS).forEach(sectionName => {
			containerEl = document.createElement('div');
			containerEl.id = sectionName;
			mainEl.appendChild(containerEl);
			containers[sectionName] = containerEl;
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

	function setSection (sectionName, previousEmotion) {

		let section = sections[sectionName],
			previousSection = currentSection,
			previousContainer;

		for (let key in sections) {
			if (sections[key] === previousSection) {
				previousContainer = containers[key];
				break;
			}
		}

		if (!section.isInited) {
			// turn on display so width/height can be calculated
			let currentDisplay = containers[sectionName].style.display;
			containers[sectionName].removeAttribute('style');

			section.init(containers[sectionName]);

			// set display back to where it was
			if (currentDisplay) {
				containers[sectionName].style.display = currentDisplay;
			}
		}

		if (!previousSection) {
			
			// for now (until transitions implemented), just hide all but the current section
			for (let key in containers) {
				if (key !== sectionName) {
					containers[key].style.display = 'none';
				}
			}

			section.open(true);

			if (currentEmotion) {
				section.setEmotion(currentEmotion);
			}

		} else {

			// some section is already open; perform transition
			
			if (previousSection === section) {
				// change emotion within current section
				if (currentEmotion) {
					section.setEmotion(currentEmotion);
				}
			} else {
				// navigate between sections
				previousSection.close()
				.then(() => {
					// hide the previous section's container
					if (previousContainer) {
						previousContainer.style.display = 'none';
					}

					// reveal the new section's container,
					// open the new section, and set its emotion
					containers[sectionName].removeAttribute('style');
					section.open(currentEmotion);
					section.setEmotion(currentEmotion, previousEmotion);
				});
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

		if (!title) {
			callout.classList.remove('visible');
			return;
		}

		callout.removeAttribute('class');

		callout.classList.add('visible');
		if (emotion) {
			callout.classList.add(emotion);
		}

		callout.querySelector('.title').innerHTML = title;
		callout.querySelector('.body').innerHTML = body;

	}

	function onNavigate (section, emotion) {

		document.location.hash = section + ':' + emotion;

	}

	function onNavigateComplete (section, emotion) {

		containers[section].style.display = 'none';

	}

	function onHashChange (event, defaults=navigationDefaults) {

		let hash = document.location.hash.replace(/^#/, '');
		hash = parseHash(hash);

		let previousEmotion = currentEmotion;

		if (dispatcher.validateEmotion(hash.emotion)) {
			setEmotion(hash.emotion);
		} else if (defaults && defaults.emotion) {
			setEmotion(defaults.emotion);
		} else {
			// continents supports an utter lack of emotion.
			setEmotion(null);
		}

		if (dispatcher.validateSection(hash.section)) {
			setSection(hash.section, previousEmotion);
		} else if (defaults && defaults.section) {
			setSection(defaults.section, previousEmotion);
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
