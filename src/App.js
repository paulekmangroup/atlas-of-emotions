import _ from 'lodash';
import dispatcher from './dispatcher.js';
import continents from './continents.js';
import states from './states.js';
import actions from './actions.js';
import triggers from './triggers.js';
import moods from './moods.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';

export default function (...initArgs) {

	const NAVIGATION_DEFAULTS = {
			section: dispatcher.SECTIONS.CONTINENTS,
			emotion: null
		},

		// at least this many consecutive (throttled to once/frame) events
		// must fire before scroll happens
		MIN_NUM_SCROLL_EVENTS = 3,

		// and the total distance scrolled must exceed this value
		MIN_SCROLL_CUMULATIVE_DIST = 20,

		// if no `wheel` events received in this time,
		// consider an inertia scroll (swipe) complete.
		INERTIA_SCROLL_TIMEOUT = 100;


	let containers = {},
		sections = {},
		callout,

		currentSection = null,
		currentEmotion = null,

		scrollbarSegments = {},
		scrollbarCloseTimeout = null,
		highlightedScrollbarSection = null,		
		recentScrollDeltas = [],				// cache recent scroll delta values to check intentionality of scroll
		lastScroll = 0,							// timestamp of most recent scroll event
		hasNavigatedThisScroll = false,			// has already navigated during the current inertia/continuous scroll
		isNavigating = false;					// currently navigating between emotions or sections


	function init (containerNode) {

		initContainers();
		initSections();
		initHeader();
		initScrollInterface();
		initCallout();
		initModal();

		// navigation events
		dispatcher.addListener(dispatcher.EVENTS.NAVIGATE, onNavigate);
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

	function initScrollInterface () {

		let scrollbar = document.querySelector('#scrollbar'),
			segmentContainer = document.createElement('div');

		segmentContainer.classList.add('segment-container');
		scrollbar.appendChild(segmentContainer);

		_.values(dispatcher.SECTIONS).forEach(section => {
			let segment = document.createElement('div');
			segment.setAttribute('data-section', section);
			let label = document.createElement('h3');
			label.innerHTML = section.toUpperCase();
			segment.appendChild(label);
			segmentContainer.appendChild(segment);
			scrollbarSegments[section] = segment;
		});

		segmentContainer.addEventListener('mouseover', onScrollbarOver);
		segmentContainer.addEventListener('mouseout', onScrollbarOut);
		segmentContainer.addEventListener('click', onScrollbarClick);

		// throttle wheel events, and
		// prune cached scroll events every frame
		recentScrollDeltas = [];
		let queuedWheelEvent;
		let onRAF = () => {
			if (queuedWheelEvent) {
				onWheel(queuedWheelEvent.deltaX, queuedWheelEvent.deltaY);
			} else {
				if (recentScrollDeltas.length) {
					recentScrollDeltas.shift();
				}
			}
			queuedWheelEvent = null;
			window.requestAnimationFrame(onRAF);
		};
		window.addEventListener('wheel', (event) => {
			queuedWheelEvent = event;
		});
		window.requestAnimationFrame(onRAF);
		
		document.addEventListener('keydown', onKeyDown);

	}

	function initCallout () {

		let mainEl = document.querySelector('#main');
		callout = document.createElement('div');
		callout.id = 'callout';

		let h3 = document.createElement('h3');
		h3.classList.add('headline');
		callout.appendChild(h3);
		let p = document.createElement('p');
		p.classList.add('body');
		callout.appendChild(p);

		mainEl.appendChild(callout);

	}

	function initModal () {

		let modal = document.querySelector('#modal');

		let modalHeadline = document.createElement('h3');
		modalHeadline.classList.add('headline');
		modalHeadline.textContent = emotionsData.metadata.intro.header;

		let modalCopy = document.createElement('p');
		modalCopy.classList.add('body');
		modalCopy.innerHTML = emotionsData.metadata.intro.body;

		let homeLink = document.createElement('p');
		homeLink.classList.add('home-link');
		homeLink.innerHTML = '<a href="#">Start at the beginning</a>';

		let closeButton = document.createElement('div');
		closeButton.classList.add('close-button');

		modal.appendChild(modalHeadline);
		modal.appendChild(modalCopy);
		modal.appendChild(homeLink);
		modal.appendChild(closeButton);

		closeButton.addEventListener('click', (event) => {
			event.stopImmediatePropagation();
			setModalVisibility(false);
		});

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

			// first section opened in this session

			// hide all but the current section and any background sections
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
			section.setEmotion(currentEmotion, previousEmotion)
			.then(() => {
				console.log(">>>>> isNavigating -> false (setEmotion promise resolution 1)");
				isNavigating = false;
			});



		} else {

			// some section is already open; perform transition
			
			if (previousSection === section) {

				// change emotion for all background sections
				backgroundSections.forEach(backgroundSection => {
					backgroundSection.setEmotion(currentEmotion, previousEmotion);
				});

				// and within current section
				section.setEmotion(currentEmotion, previousEmotion)
				.then(() => {
					console.log(">>>>> isNavigating -> false (setEmotion promise resolution 2)");
					isNavigating = false;
				});

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
					// that is not a background section for this section
					if (previousBackgroundSections.length) {
						for (let key in sections) {
							if (~previousBackgroundSections.indexOf(sections[key]) &&
								(!section.backgroundSections || !~section.backgroundSections.indexOf(sections[key]))) {
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

					section.setEmotion(currentEmotion, previousEmotion)
					.then(() => {
						console.log(">>>>> isNavigating -> false (setEmotion promise resolution 3)");
						isNavigating = false;
					});

				});

			}

		}

		updateHeader({
			section: sectionName
		});

		setScrollbarHighlight(sectionName);

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

	function scrollSection (dir, fromScroll) {

		console.log(">>>>> scrollSection(); isNavigating:", isNavigating);

		if (isNavigating) { return; }
		if (!currentSection) { return; }

		let sectionNames = _.values(dispatcher.SECTIONS),
			currentSectionIndex,
			targetSectionIndex;

		sectionNames.some((sectionName, i) => {
			if (sections[sectionName] === currentSection) {
				currentSectionIndex = i;
				return true;
			}
		});
		console.log(">>>>> scroll from currentSectionIndex:", currentSectionIndex);

		if (dir < 0) {
			targetSectionIndex = Math.max(0, currentSectionIndex - 1);
		} else {
			targetSectionIndex = Math.min(currentSectionIndex + 1, sectionNames.length - 1);
		}

		console.log(">>>>> scroll to targetSectionIndex:", targetSectionIndex);

		if (currentSectionIndex !== targetSectionIndex) {
			dispatcher.navigate(sectionNames[targetSectionIndex]);

			if (fromScroll) {
				hasNavigatedThisScroll = true;
			}
		}
		
	}

	function scrollEmotion (dir) {

		console.log(">>>>> scrollEmotion(); isNavigating:", isNavigating);
		if (isNavigating) { return; }

		let emotionNames = _.values(dispatcher.EMOTIONS),
			currentEmotionIndex = emotionNames.indexOf(currentEmotion),
			targetEmotionIndex;

		if (currentEmotionIndex === -1) {
			// default to Anger
			currentEmotionIndex = 0;
		}
		console.log(">>>>> scroll from currentEmotionIndex:", currentEmotionIndex);

		if (dir < 0) {
			targetEmotionIndex = Math.max(0, currentEmotionIndex - 1);
		} else {
			targetEmotionIndex = Math.min(currentEmotionIndex + 1, emotionNames.length - 1);
		}

		console.log(">>>>> scroll to targetEmotionIndex:", targetEmotionIndex);

		if (currentEmotionIndex !== targetEmotionIndex) {
			dispatcher.navigate(null, emotionNames[targetEmotionIndex]);
		}
		

	}

	function onKeyDown (event) {

		switch (event.keyCode) {
			case 37:
				// left
				scrollEmotion(-1);
				break;
			case 38:
				// top
				scrollSection(-1);
				break;
			case 39:
				// right
				scrollEmotion(1);
				break;
			case 40:
				// bottom
				scrollSection(1);
				break;
		}

	}

	function onWheel (deltaX, deltaY) {

		// TODO: enable horizontal scrolling with mouse (trackpad) for emotions?
		// might interfere with two-finger-swipe browser back/fwd.

		//
		// TODO NEXT THURS: don't just block wheel events when they're continuous;
		// block them when they're continuously <= the last value.
		// need to be able to support sequential, yet discrete, swipes.
		// 
		// also, can't raise MIN_NUM_SCROLL_EVENTS too high because that doesn't work well with scroll wheel mouse.
		// might want to instead focus on MIN_SCROLL_CUMULATIVE_DIST
		//
		
		if (deltaY) {

			let now = Date.now();
			if (now - lastScroll > INERTIA_SCROLL_TIMEOUT) {
				// enough time has elapsed between wheel events
				// to resume letting wheel events through.
				hasNavigatedThisScroll = false;
			}
			// console.log(">>>>> now - lastScroll:", now - lastScroll);
			lastScroll = now;

			if (hasNavigatedThisScroll) {

				// ignore wheel events until current inertia/continuous scroll comes to a stop.
				console.log(">>>>> hasNavigatedThisScroll; blocked");
				recentScrollDeltas = [];

			} else {

				// process wheel events as normal
				recentScrollDeltas.push(deltaY);
				console.log(">>>>> recentScrollDeltas:", recentScrollDeltas);
				if (recentScrollDeltas.length >= MIN_NUM_SCROLL_EVENTS) {
					let totalDelta = recentScrollDeltas.reduce((t, d) => t + d, 0);

					if (Math.abs(totalDelta) >= MIN_SCROLL_CUMULATIVE_DIST) {
						recentScrollDeltas = [];
						scrollSection(totalDelta < 0 ? -1 : 1, true);
					}
				}

			}

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

	function onScrollbarOver (event) {

		let scrollbar = document.querySelector('#scrollbar');
		scrollbar.classList.add('open');
		clearTimeout(scrollbarCloseTimeout);

		let section = event.target.dataset.section;
		if (section) {
			displayScrollbarHighlight(section);
		}

	}

	function onScrollbarOut (event) {

		clearTimeout(scrollbarCloseTimeout);
		scrollbarCloseTimeout = setTimeout(() => {
			let scrollbar = document.querySelector('#scrollbar');
			scrollbar.classList.remove('open');
		}, sassVars.ui.scrollbar.toggle.delay.close * 1000);

		displayScrollbarHighlight(null);
		
	}

	function onScrollbarClick (event) {

		let section = event.target.dataset.section;
		if (section) {
			dispatcher.navigate(section);
		}

	}

	function setScrollbarHighlight (section) {

		highlightedScrollbarSection = section;
		displayScrollbarHighlight(null);

	}

	function displayScrollbarHighlight (section) {

		section = section || highlightedScrollbarSection;

		Object.keys(scrollbarSegments).forEach(key => {
			let isHighlighted = key === section || key === highlightedScrollbarSection;
			scrollbarSegments[key].classList[isHighlighted ? 'add' : 'remove']('highlighted');
		});

	}

	function setModalVisibility (val) {

		let modal = document.querySelector('#modal'),
			modalOverlay = document.querySelector('#modal-overlay');

		if (currentSection === sections[dispatcher.SECTIONS.CONTINENTS]) {
			// current section is Continents
			if (val) {
				// remove homeLink when opening modal
				let homeLink = modal.querySelector('.home-link');
				if (homeLink) {
					homeLink.remove();
				}
			} else {
				// bring continents back to center when closing modal
				currentSection.setContinentIntroPositions(false);
			}
		}

		if (val) {

			// already open
			if (modal.style.display === 'block') { return; }

			modal.style.display = 'block';
			modalOverlay.style.display = 'block';

			// prevent scrolling while modal is open
			console.log(">>>>> isNavigating -> true (setModalVisibility open modal)");
			isNavigating = true;

			setTimeout(() => {
				// wait until after reflow to prevent `display: none` from killing transition
				modal.classList.add('visible');
				modalOverlay.classList.add('visible');

				// hide overlay on CONTINENTS,
				// but keep it in DOM to block interaction until modal dismissed
				if (currentSection === sections[dispatcher.SECTIONS.CONTINENTS]) {
					modalOverlay.style.opacity = 0.0;
				}

				let onOverlayClick = (event) => {
					event.stopImmediatePropagation();
					modalOverlay.removeEventListener('click', onOverlayClick);
					setModalVisibility(false);
				};
				modalOverlay.addEventListener('click', onOverlayClick);
			}, 100);

		} else {

			// already closed
			if (!modalOverlay.classList.contains('visible')) { return; }

			// re-enable scrolling when modal closes
			console.log(">>>>> isNavigating -> false (setModalVisibility close modal)");
			isNavigating = false;

			let onTransitionEnd = (event) => {
				modal.removeEventListener('transitionend', onTransitionEnd);
				modal.style.display = 'none';
				modalOverlay.style.display = 'none';
			};
			modal.addEventListener('transitionend', onTransitionEnd);
			modal.classList.remove('visible');
			modalOverlay.classList.remove('visible');

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

		callout.querySelector('.headline').innerHTML = title;
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

	function onHashChange (event, defaults=NAVIGATION_DEFAULTS) {

		if (currentSection) {
			setModalVisibility(false);
		} else {
			setTimeout(() => {
				setModalVisibility(true);
			}, sassVars.ui.intro.delay * 1000);
		}

		let hash = document.location.hash.replace(/^#/, '');
		hash = parseHash(hash);

		// set flag after setting modal visibility,
		// prior to setting emotion and section
		isNavigating = true;

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
