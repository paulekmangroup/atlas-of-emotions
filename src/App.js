import _ from 'lodash';
import dispatcher from './dispatcher.js';
import continents from './continents.js';
import states from './states.js';
import actions from './actions.js';
import triggers from './triggers.js';
import moods from './moods.js';

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
		initHeader();
		initCallout();

		document.addEventListener('keydown', onKeyDown);
		dispatcher.addListener(dispatcher.EVENTS.NAVIGATE, onNavigate);
		dispatcher.addListener(dispatcher.EVENTS.NAVIGATE_COMPLETE, onNavigateComplete);
		dispatcher.addListener(dispatcher.EVENTS.CHANGE_EMOTION_STATE, onEmotionStateChange);
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

		sections.continents = continents;
		sections.states = states;
		sections.actions = actions;
		sections.triggers = triggers;
		sections.moods = moods;

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
			// init any uninited background sections
			if (section.backgroundSections) {
				section.backgroundSections.forEach(backgroundSection => {
					if (!backgroundSection.isInited) {
						initSection(backgroundSection);
					}
				});
			}

			// init current section
			initSection(section);
		}

		let backgroundSections = section.backgroundSections || [];

		if (!previousSection) {

			// for now (until transitions implemented), just hide all but the current section
			// and any background sections
			for (let key in containers) {
				if (key !== sectionName && !~backgroundSections.indexOf(sections[key])) {
					containers[key].style.display = 'none';
				}
			}

			// open and background all backgroundSections for the current section
			backgroundSections.forEach(backgroundSection => {
				backgroundSection.open({
					sectionName: sectionName,
					inBackground: true,
					firstSection: false
				});
				backgroundSection.setEmotion(currentEmotion, previousEmotion);
			});

			section.open({
				sectionName: sectionName,
				inBackground: false,
				firstSection: true
			});
			section.setEmotion(currentEmotion, previousEmotion);

		} else {

			// some section is already open; perform transition
			
			if (previousSection === section) {

				// change emotion for all background sections
				backgroundSections.forEach(backgroundSection => {
					backgroundSection.setEmotion(currentEmotion, previousEmotion);
				});

				// and within current section
				section.setEmotion(currentEmotion, previousEmotion);

			} else {
				
				// navigate between sections
				// 
				// sections can have background sections.
				// when a section is opened, all its background sections must be opened and backgrounded.
				// when a section is closed, for all of its background sections:
				// 	if the section to which we're navigating is a background section, unbackground it
				// 	else close the background section.
				// 
				
				// open and background all backgroundSections for the current section
				let previousSectionBackgrounded = false,
					promises = backgroundSections.map(backgroundSection => {
						// display all background sections
						for (let key in sections) {
							if (~backgroundSections.indexOf(sections[key])) {
								containers[key].removeAttribute('style');
							}
						}

						if (previousSection === backgroundSection) {
							// already open; just background it
							previousSectionBackgrounded = true;
							return backgroundSection.setBackgrounded(true, {
								sectionName: sectionName
							});
						} else {
							// open it in the background
							let openPromise = backgroundSection.open({
								sectionName: sectionName,
								inBackground: true,
								firstSection: false
							});
							backgroundSection.setEmotion(currentEmotion, previousEmotion);
							return openPromise;
						}
					});

				let previousBackgroundSections = previousSection.backgroundSections || [];
				if (!previousSectionBackgrounded) {
					// don't mess with current backgroundSections or the current section
					previousBackgroundSections = previousBackgroundSections.filter(prevBkgdSection => {
						return prevBkgdSection !== section &&
							!~backgroundSections.indexOf(prevBkgdSection);
					});
					if (previousBackgroundSections.length) {
						// close previous background sections not needed for the current section
						previousBackgroundSections.forEach(prevBkgdSection => {
							prevBkgdSection.setBackgrounded(false);
							prevBkgdSection.close();
						});
					}

					// close the previous section
					promises.push(previousSection.close());
				}

				Promise.all(promises).then(values => {
					if (!previousSectionBackgrounded) {
						// hide the previous section's container if not backgrounded
						if (previousContainer) {
							previousContainer.style.display = 'none';
						}
					}

					// hide the container of any closed previous background section 
					if (previousBackgroundSections.length) {
						for (let key in sections) {
							if (~previousBackgroundSections.indexOf(sections[key])) {
								containers[key].style.display = 'none';
							}
						}
					};

					// reveal the new section's container,
					// open the new section, and set its emotion
					containers[sectionName].removeAttribute('style');
					section.open({
						sectionName: sectionName,
						inBackground: false,
						firstSection: false
					});
					section.setEmotion(currentEmotion, previousEmotion);

				});

			}

		}

		updateHeader({
			section: sectionName
		});

		currentSection = section;

	}

	function setEmotion (emotion) {

		updateHeader({
			emotion: emotion
		});

		// setSection cues up emotion changes,
		// leaving this function very simple.
		currentEmotion = emotion;

	}

	function initSection (section) {

		let sectionName;
		for (let key in sections) {
			if (sections[key] === section) {
				sectionName = key;
				break;
			}
		}

		// turn on display so width/height can be calculated
		let currentDisplay = containers[sectionName].style.display;
		containers[sectionName].removeAttribute('style');

		section.init(containers[sectionName]);

		// set display back to where it was
		if (currentDisplay) {
			containers[sectionName].style.display = currentDisplay;
		}

	}

	function initHeader () {

		let dropdown = document.querySelector('#header .dropdown'),
			menu = dropdown.querySelector('ul');

		Object.keys(dispatcher.EMOTIONS).forEach(emotionKey => {
			let emotionName = dispatcher.EMOTIONS[emotionKey].toLowerCase();
			let li = document.createElement('li');
			li.setAttribute('role', 'menuitem');
			li.setAttribute('data-emotion', emotionName);
			li.innerHTML = emotionName.toUpperCase();
			menu.appendChild(li);
		});
		
		dropdown.querySelector('.dropdown-toggle').addEventListener('click', onDropdownClick);

	}

	function updateHeader (config) {

		if (config.section) {
			document.querySelector('#header h1').innerHTML = config.section.toUpperCase();
		}

		let dropdownTitle = document.querySelector('#header .dd-title');
		if (config.emotion) {
			dropdownTitle.innerHTML = config.emotion.toUpperCase();
		} else if (config.emotion === null) {
			dropdownTitle.innerHTML = 'CHOOSE AN EMOTION';
		}
	}

	function onKeyDown (keyCode) {

		if (keyCode === 37 || keyCode === 39) {

			console.log('TODO: scroll to next emotion. This functionality will ultimately be accessible via a dropdown.');

		}

	}

	function onDropdownClick (event) {

		let dropdown = document.querySelector('#header .dropdown'),
			classList = dropdown.classList;

		classList.toggle('open');

		if (classList.contains('open')) {
			dropdown.addEventListener('click', onDropdownItemClick);
		} else {
			dropdown.removeEventListener('click', onDropdownItemClick);
		}

		event.stopPropagation();
		
	}

	function onDropdownItemClick (event) {

		if (!event.target || event.target.nodeName.toLowerCase() !== 'li') { return; }
		event.stopImmediatePropagation();

		document.querySelector('#header .dropdown').classList.remove('open');

		dispatcher.navigate(null, event.target.dataset.emotion);

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

	function onEmotionStateChange (state, selected) {

		if (selected) {
			sections.actions.setState(state);
			sections.states.setBackgroundedState(state);
		} else {
			sections.actions.setHighlightedState(state);
		}

	}

	function onNavigate (section, emotion) {

		if (!section) {
			for (let key in sections) {
				if (sections[key] === currentSection) {
					section = key;
					break;
				}
			}
		}

		if (!emotion) {
			emotion = currentEmotion;
		}

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
			// continents section supports an utter lack of emotion.
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
