import _ from 'lodash';
import dispatcher from './dispatcher.js';
import continents from './continents.js';
import states from './states.js';
import actions from './actions.js';
import triggers from './triggers.js';
import moods from './moods.js';
import calm from './calm.js';
import moreInfo from './moreInfo.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';
import popupManager from './popupManager.js';

export default function (...initArgs) {

	const MIN_ALLOWED_WIDTH = 950,
		MIN_ALLOWED_HEIGHT = 650,

		NAVIGATION_DEFAULTS = {
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
		currentMorePage = null,
		previousNonSecondaryHash = {
			section: 'continents',
			emotion: null
		},

		scrollbarSegments = {},
		scrollbarCloseTimeout = null,
		highlightedScrollbarSection = null,
		scrollbarBounds,
		scrollbarClosedPos,
		scrollbarAnimUpdate,
		scrollbarIsOpen = false,

		recentScrollDeltas = [],				// cache recent scroll delta values to check intentionality of scroll
		lastScroll = 0,							// timestamp of most recent scroll event
		hasNavigatedThisScroll = false,			// has already navigated during the current inertia/continuous scroll
		isNavigating = false;				// currently navigating between emotions or sections


	function init (containerNode) {

		if (renderSmallScreenWarning()) {
			return;
		}

		initContainers();
		initSections();
		initHeader();
		initScrollInterface();
		initDownArrow();
		initMoreInfoDropdown();
		initCallout();
		initModal();

		// navigation events
		dispatcher.addListener(dispatcher.EVENTS.NAVIGATE, onNavigate);
		dispatcher.addListener(dispatcher.EVENTS.CHANGE_EMOTION_STATE, onEmotionStateChange);
		dispatcher.addListener(dispatcher.EVENTS.CHANGE_CALLOUT, onCalloutChange);
		dispatcher.addListener(dispatcher.EVENTS.POPUP_CHANGE, onPopupChange);
		dispatcher.addListener(dispatcher.EVENTS.OPEN_MORE_INFO_MENU, onMoreInfoMenuClick);

		window.addEventListener('hashchange', onHashChange);

		onResize();
		onHashChange();

		// debounce after initial call
		onResize = _.debounce(onResize, 250);
		window.addEventListener('resize', onResize);

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

		// position actions in front of triggers
		// so that triggers horizon element appears behind actions rays
		mainEl.insertBefore(containers[dispatcher.SECTIONS.TRIGGERS], containers[dispatcher.SECTIONS.ACTIONS]);

	}

	function initSections () {

		sections.continents = continents;
		sections.states = states;
		sections.actions = actions;
		sections.triggers = triggers;
		sections.moods = moods;
		sections.calm = calm;
		sections.more = moreInfo;

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

	function initDownArrow() {
		let downArrows = document.querySelector('#down-arrow'),
			attentionArrow = document.createElement('img');

		attentionArrow.addEventListener('click', onDownArrowClick);

		// add both images here
		attentionArrow.src = './img/attentionArrow.png';

		// set classes
		attentionArrow.classList.add('attentionArrow');

		downArrows.appendChild(attentionArrow);
		updateArrowVisibility();
	}

	function initMoreInfoDropdown() {
		let dropdown = document.querySelector('#more-info .dropup'),
			title = dropdown.querySelector('.dup-title'),
			menu = dropdown.querySelector('ul');

		title.innerHTML = '<h4>' + dispatcher.MORE_INFO.title + '</h4>';

		dispatcher.MORE_INFO.items.forEach((item) => {
			let li = document.createElement('li');
			li.setAttribute('role', 'menuitem');
			li.setAttribute('data-page', item.page);
			li.innerHTML = '<h4>' + item.label + '</h4>';
			menu.appendChild(li);
		});

		dropdown.querySelector('.dropdown-toggle').addEventListener('click', onMoreInfoMenuClick);
	}

	function initScrollInterface () {

		let scrollbar = document.querySelector('#scrollbar'),
			segmentContainer = document.createElement('div');

		segmentContainer.classList.add('segment-container');
		scrollbar.appendChild(segmentContainer);

		_.values(dispatcher.SECTIONS).forEach(section => {

			// more info does not appear in scrollbar
			if (section === dispatcher.SECTIONS.MORE) { return; }

			let segment = document.createElement('div');
			segment.setAttribute('data-section', section);
			let label = document.createElement('h4');
			label.innerHTML = section.toUpperCase();
			segment.appendChild(label);
			segmentContainer.appendChild(segment);
			scrollbarSegments[section] = segment;

		});

		onWindowMouseMove = _.throttle(onWindowMouseMove, 50);
		scrollbar.addEventListener('mouseenter', onScrollbarHitAreaEnter);
		scrollbar.addEventListener('mouseleave', onScrollbarHitAreaLeave);

		segmentContainer.addEventListener('mouseover', onScrollbarOver);
		segmentContainer.addEventListener('mouseout', onScrollbarOut);
		segmentContainer.addEventListener('click', onScrollbarClick);

		// precalculate values used for scrollbar interaction;
		// these values are updated in onResize()
		scrollbarBounds = scrollbar.getBoundingClientRect();
		scrollbarBounds = {
			top: scrollbarBounds.top,
			bottom: scrollbarBounds.bottom,
			left: scrollbarBounds.left,
			width: scrollbarBounds.width - (scrollbarBounds.right - segmentContainer.getBoundingClientRect().left),
			height: scrollbarBounds.height
		};
		scrollbarClosedPos = parseInt(window.getComputedStyle(segmentContainer).left.replace('px', ''));

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
			markModalAsSeen();
			setModalVisibility(false);
		});

		// enable infoButton
		if (document.querySelector('#infoButton')) {
			document.querySelector('#infoButton')
				.addEventListener('click', (event) => {
					event.stopImmediatePropagation();
					// this works for removal also, since a click outside closes the modal
					setModalVisibility(true);
				}
			);
		}

	}

	function markModalAsSeen () {
		if(!localStorage.modalSeen){
			localStorage.setItem("modalSeen", true);
		}
	}

	function setSectionEmotion (section, previousEmotion, previousMorePage) {
		section.setEmotion(currentEmotion, previousEmotion, currentMorePage, previousMorePage)
		.then(() => {
			// console.log(">>>>> isNavigating -> false (setEmotion promise resolution 1)");
			isNavigating = false;
		});
	}

	function fadeArrowOutAndIn (sectionName) {

		function endFade(){
			document.querySelector('.attentionArrow').classList.remove("fadeOutIn");
		}

		document.querySelector('.attentionArrow').classList.add("fadeOutIn");
		setTimeout(endFade, 4000);

		updateArrowVisibility(sectionName);

	}

	function setSection (sectionName, previousEmotion, previousMorePage) {
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


		if (sectionName === 'more' && section.setPreviousSection) section.setPreviousSection(previousNonSecondaryHash.section);

		let backgroundSections = section.backgroundSections || [];

		if (!previousSection) {

			// first section opened in this session

			// update down arrow
			fadeArrowOutAndIn(sectionName);

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

			setSectionEmotion(section, previousEmotion, previousMorePage);
		} else {

			// some section is already open; perform transition

			if (previousSection === section) {

				// change emotion for all background sections
				backgroundSections.forEach(backgroundSection => {
					backgroundSection.setEmotion(currentEmotion, previousEmotion);
				});

				// and within current section
				setSectionEmotion(section, previousEmotion, previousMorePage);

			} else {

				// navigate between sections
				//
				// sections can have background sections.
				// when a section is opened, all its background sections must be opened and backgrounded.
				// when a section is closed, for all of its background sections:
				// 	if the section to which we're navigating is a background section, unbackground it
				// 	else close the background section.
				//

				// remove any popups
				onPopupChange();

				// update down arrow
				fadeArrowOutAndIn(sectionName);

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
							prevBkgdSection.close(sectionName);
						});
					}

					// close the previous section
					promises.push(previousSection.close(sectionName));
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

					setSectionEmotion(section, previousEmotion, previousMorePage);

				});

			}

		}

		if (!currentMorePage) {
			updateHeader({
				section: sectionName
			});
		}

		setScrollbarHighlight(sectionName);

		currentSection = section;

	}

	function setMore (page) {
		updateHeader({
			more: page
		});

		currentMorePage = page;
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

		if (config.section || config.more) {
			const title = config.section || dispatcher.getMorePageName(config.more);
			document.querySelector('#header h1').innerHTML = title.toUpperCase();
		}

		let dropdownTitle = document.querySelector('#header .dd-title');
		if (config.emotion) {
			dropdownTitle.innerHTML = config.emotion.toUpperCase();
		} else if (config.emotion === null) {
			dropdownTitle.innerHTML = 'CHOOSE AN EMOTION';
		}
	}

	function scrollSection (dir, fromScroll) {

		// console.log(">>>>> scrollSection(); isNavigating:", isNavigating);

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
		// console.log(">>>>> scroll from currentSectionIndex:", currentSectionIndex);

		if (dir < 0) {
			targetSectionIndex = Math.max(0, currentSectionIndex - 1);
		} else {
			targetSectionIndex = Math.min(currentSectionIndex + 1, sectionNames.length - 1);
		}

		// console.log(">>>>> scroll to targetSectionIndex:", targetSectionIndex);

		if (currentSectionIndex !== targetSectionIndex) {

			if(sectionNames[targetSectionIndex] == 'more'){
				dispatcher.navigate('more', null , 'annex');
			} else {
				dispatcher.navigate(sectionNames[targetSectionIndex]);
			}

			if (fromScroll) {
				hasNavigatedThisScroll = true;
			}
		}

	}

	function scrollEmotion (dir) {

		// console.log(">>>>> scrollEmotion(); isNavigating:", isNavigating);
		if (isNavigating || currentMorePage) { return; }

		let emotionNames = _.values(dispatcher.EMOTIONS),
			currentEmotionIndex = emotionNames.indexOf(currentEmotion),
			targetEmotionIndex;

		if (currentEmotionIndex === -1) {
			// default to Anger
			currentEmotionIndex = 0;
		}
		// console.log(">>>>> scroll from currentEmotionIndex:", currentEmotionIndex);

		if (dir < 0) {
			targetEmotionIndex = Math.max(0, currentEmotionIndex - 1);
		} else {
			targetEmotionIndex = Math.min(currentEmotionIndex + 1, emotionNames.length - 1);
		}

		// console.log(">>>>> scroll to targetEmotionIndex:", targetEmotionIndex);

		if (currentEmotionIndex !== targetEmotionIndex) {
			dispatcher.navigate(null, emotionNames[targetEmotionIndex]);
		}


	}

	/**
	 * Note: this function is _.debounce()d in init().
	 */
	function onResize () {

		// size main container to viewport
		let headerHeight = 55;	// from _variables.scss
		document.getElementById('main').style.height = (window.innerHeight - headerHeight) + 'px';

		// update scrollbar values
		scrollbarBounds.left = scrollbar.getBoundingClientRect().left;

		// update all sections
		let section,
			sectionContainer,
			containerIsHidden;
		for (let sectionKey in sections) {
			section = sections[sectionKey];
			if (section.isInited) {

				// un-hide section container as necessary
				// to get accurate measurements for resize
				sectionContainer = containers[sectionKey];
				containerIsHidden = sectionContainer.style.display === 'none';
				if (containerIsHidden) {
					sectionContainer.style.display = 'block';
				}

				section.onResize();

				if (containerIsHidden) {
					sectionContainer.style.display = 'none';
				}

			}
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

		if (currentMorePage) return;

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
				// console.log(">>>>> hasNavigatedThisScroll; blocked");
				recentScrollDeltas = [];

			} else {

				// process wheel events as normal
				recentScrollDeltas.push(deltaY);
				// console.log(">>>>> recentScrollDeltas:", recentScrollDeltas);
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

	function closeMenus(target) {
		document.querySelector('body').removeEventListener('click', closeMenus);
		const menus = document.querySelectorAll('.emotion-menu');
		[...menus].forEach((menu) => {
			if (menu !== target) menu.classList.remove('open');
		});
	}

	function menuBackgroundClick() {
		document.querySelector('body').addEventListener('click', closeMenus);
	}

	function onMoreInfoMenuClick (event) {
		if (event) event.stopPropagation();

		let dropdown = document.querySelector('#more-info .dropup'),
			classList = dropdown.classList;

		closeMenus(dropdown);
		classList.toggle('open');

		if (classList.contains('open')) {
			dropdown.addEventListener('click', onMoreInfoMenuItemClick);
		} else {
			dropdown.removeEventListener('click', onMoreInfoMenuItemClick);
		}

		menuBackgroundClick();
	}

	function onMoreInfoMenuItemClick (event) {
		event.stopImmediatePropagation();

		if (!event.target || event.target.nodeName.toLowerCase() !== 'li') { return; }

		document.querySelector('#more-info .dropup').classList.remove('open');

		let page = event.target.dataset.page;
		if (!page) return;

		dispatcher.navigate(dispatcher.SECTIONS.MORE, null, page);
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

	/**
	 * Note: this function is _.throttle()d in initScrollInterface().
	 * Note: this function is not currently in use.
	 */
	function onWindowMouseMove (event) {

		// distance from left edge + 0.25*width to center, curved to open fast
		let mouseXRatio = Math.pow(Math.max(0, Math.min(1, (event.pageX - scrollbarBounds.left - 0.25*scrollbarBounds.width) / (0.25*scrollbarBounds.width))), 0.5);
		setScrollbarFractionalOpen(mouseXRatio);

	}

	function setScrollbarOpen (val) {

		if (val && !scrollbarIsOpen) {
			setScrollbarFractionalOpen(1.0, 0.15);
		} else if (!val && scrollbarIsOpen) {
			setScrollbarFractionalOpen(0.0, 0.08);
		}

		scrollbarIsOpen = val;

	}

	/**
	 * Open the scrollbar to a value between
	 * 0.0 (totally closed) and 1.0 (totally open).
	 * @param {Number} float scrollbar open amount
	 * @param {Number} speed Value between 0.0001 (slow open) and 1 (immediate open)
	 */
	function setScrollbarFractionalOpen (val, speed) {

		if (scrollbarAnimUpdate) {
			window.cancelAnimationFrame(scrollbarAnimUpdate);
		}

		let segmentContainer = document.querySelector('#scrollbar .segment-container'),
			scrollbarTgtPos = Math.round((1 - val) * scrollbarClosedPos),
			scrollbarPos = parseFloat(window.getComputedStyle(segmentContainer).left.replace('px', ''));

		let updatePos = function () {

			let dPos = (speed || 0.25) * (scrollbarTgtPos - scrollbarPos);
			if (Math.abs(dPos) < 1) {
				segmentContainer.style.left = scrollbarTgtPos + 'px';
				scrollbarAnimUpdate = null;
			} else {
				scrollbarPos += dPos;
				segmentContainer.style.left = scrollbarPos + 'px';
				scrollbarAnimUpdate = window.requestAnimationFrame(updatePos);
			}

		};
		window.requestAnimationFrame(updatePos);

	}

	function onScrollbarHitAreaEnter (event) {

		document.querySelector('#scrollbar').addEventListener('mousemove', onScrollbarMouseMove);

	}

	function onScrollbarHitAreaLeave (event) {

		document.querySelector('#scrollbar').removeEventListener('mousemove', onScrollbarMouseMove);
		setScrollbarOpen(false);

	}

	function onScrollbarMouseMove (event) {

		let scrollbarX = event.pageX - scrollbarBounds.left,
			scrollbarY = event.pageY - scrollbarBounds.top,
			scrollbarRelX = scrollbarX / scrollbarBounds.width;

		if (scrollbarX < 0 || scrollbarX > window.innerWidth || scrollbarY < 0 || scrollbarY > scrollbarBounds.height) {
			// manually call leave handler, in case it wasn't already called
			onScrollbarHitAreaLeave();
		} else if (scrollbarRelX > 0.75) {
			setScrollbarOpen(true);
		} else {
			setScrollbarOpen(false);
		}

	}

	function onScrollbarOver (event) {

		let section = event.target.dataset.section;
		if (section) {
			displayScrollbarHighlight(section);
		}

	}

	function onScrollbarOut (event) {

		displayScrollbarHighlight(null);

	}

	function onDownArrowClick (event) {

		scrollSection(1);

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
					modal.removeChild(homeLink);
				}
			} else {
				// bring continents back to center when closing modal
				currentSection.setContinentIntroPositions(false);
			}
		}

		if (val) {

			// bail if already open
			if (modal.style.display === 'block') { return; }

			// set body class for intro open
			document.body.classList.add('intro-open');
			document.body.classList.remove('intro-closing', 'intro-opening');

			modal.style.display = 'block';
			modalOverlay.style.display = 'block';

			// prevent scrolling while modal is open
			isNavigating = true;

			setTimeout(() => {
				// wait until after reflow to prevent `display: none` from killing transition
				modal.classList.add('visible');
				modalOverlay.classList.add('visible');

				let onOverlayClick = (event) => {
					event.stopImmediatePropagation();
					modalOverlay.removeEventListener('click', onOverlayClick);
					markModalAsSeen();
					setModalVisibility(false);
				};
				modalOverlay.addEventListener('click', onOverlayClick);
			}, 100);

		} else {

			// bail if already closed
			if (!modalOverlay.classList.contains('visible')) { return; }

			// set body class for intro closing
			document.body.classList.add('intro-closing');
			document.body.classList.remove('intro-open', 'intro-opening');

			// re-enable scrolling when modal closes
			isNavigating = false;

			let onTransitionEnd = (event) => {
				modal.removeEventListener('transitionend', onTransitionEnd);
				modal.style.display = 'none';
				modalOverlay.style.display = 'none';

				// set body class for intro closed
				document.body.classList.remove('intro-closing', 'intro-open', 'intro-opening');
			};
			modal.addEventListener('transitionend', onTransitionEnd);
			modal.classList.remove('visible');
			modalOverlay.classList.remove('visible');

			// close the scrollbar, if it was opened along with the intro modal,
			// and enable scrollbar interaction
			setScrollbarFractionalOpen(0.0);

		}
	}

	function updateArrowVisibility (sectionName) {

		if (sectionName == 'calm' || sectionName == 'more'){
			// arrow not visible
			document.querySelector('.attentionArrow').classList.remove("visible");
		} else {
			// arrow visible
			document.querySelector('.attentionArrow').classList.add("visible");
		}

	}

	function onPopupChange (section, emotion, desc) {
		if (!section){
			popupManager.manage();
		} else {
			if (emotion !== popupManager.currentName ||
				(emotion && !popupManager.exists(section, emotion))) {
				popupManager.manage(section, emotion, desc);
			}
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
		if (section === dispatcher.HOME) {
			document.location.hash = '';
			return;
		}

		let parts = [];

		if (!section) {
			for (let key in sections) {
				if (sections[key] === currentSection) {
					section = key;
					break;
				}
			}
		}

		if (!emotion) {
			// default to the currently-selected emotion
			emotion = currentEmotion;

			// fallback to ANGER for sections that require a selected emotion
			if (!emotion && (
					section === dispatcher.SECTIONS.STATES ||
					section === dispatcher.SECTIONS.ACTIONS ||
					section === dispatcher.SECTIONS.TRIGGERS ||
					section === dispatcher.SECTIONS.MOODS
				)) {
				emotion = dispatcher.DEFAULT_EMOTION;
			}
		}

		if (section) parts.push(section);
		if (emotion) parts.push(emotion);

		document.location.hash = parts.join(':');

	}

	function coerceEmotionFromHash(hash, defaults=NAVIGATION_DEFAULTS) {
		if (dispatcher.validateEmotion(hash.emotion)) {
			return hash.emotion;
		} else if (defaults && defaults.emotion) {
			return defaults.emotion;
		}

		// continents section supports an utter lack of emotion.
		return null;
	}

	function coerceMoreFromHash(hash) {
		return dispatcher.validateMorePage(hash.emotion) ? hash.emotion : null;
	}

	function coerceSectionFromHash(hash, defaults=NAVIGATION_DEFAULTS) {
		if (dispatcher.validateSection(hash.section)) {
			return hash.section;
		} else if (defaults && defaults.section) {
			return  defaults.section;
		}

		return null;
	}

	function onHashChange (event, defaults=NAVIGATION_DEFAULTS) {
		if (currentSection) {

			// if a section has already been selected this session, close the intro modal
			setModalVisibility(false);

		} else {

			// if a section has not yet been selected for this browser
			// (i.e. this is the start of the session),
			// open the intro modal and the scrollbar
			if(!localStorage.modalSeen){

				// set a class on body so other sections can react
				document.body.classList.remove('intro-closing', 'intro-open');
				document.body.classList.add('intro-opening');

				setTimeout(() => {
					setModalVisibility(true);
				}, sassVars.ui.intro.delay * 1000);

				setTimeout(() => {
					setScrollbarFractionalOpen(1.0);
				}, sassVars.ui.scrollbar.introOpenDelay * 1000);
			}

		}

		let hash = document.location.hash.replace(/^#/, '');
		hash = parseHash(hash);

		const section = coerceSectionFromHash(hash);
		const moreName = coerceMoreFromHash(hash);
		const emotion = (moreName) ? null : coerceEmotionFromHash(hash);

		if (section !== 'more') {
			previousNonSecondaryHash = {section, emotion};
		}

		// set flag after setting modal visibility,
		// prior to setting emotion and section
		isNavigating = true;

		let previousEmotion = currentEmotion;
		let previousMorePage = currentMorePage;
		currentMorePage = null;

		if (moreName) {
			setMore(moreName);
		} else {
			setEmotion(emotion);
		}


		setSection(section, previousEmotion, previousMorePage);
	}

	function parseHash (hash) {

		if (!hash) { hash = ''; }
		let hashValues = hash.split(':');
		return {
			section: hashValues[0],
			emotion: hashValues[1]
		};

	}

	/**
	 * If viewport is below minimum screen size,
	 * render small screen warning and return true.
	 * TODO (yeah right): pull in this text from elsewhere instead of hardcoding.
	 */
	function renderSmallScreenWarning () {

		if (window.innerWidth >= MIN_ALLOWED_WIDTH && window.innerHeight >= MIN_ALLOWED_HEIGHT) {
			return false;
		}

		document.querySelector('body').classList.add('small-screen-warning');

		let warningDiv = document.createElement('div');
		warningDiv.classList.add('warning-container');

		let warningHeader = document.createElement('h3');
		warningHeader.innerHTML = 'ATLAS OF EMOTIONS';
		warningDiv.appendChild(warningHeader);

		let warningBody = document.createElement('p');
		warningBody.innerHTML = 'For the best viewing experience, please enlarge your browser or view on a tablet or larger device.';
		warningDiv.appendChild(warningBody);

		// TODO: how to not blow away content for bots?
		document.querySelector('#app-container').innerHTML = '';
		document.querySelector('#app-container').appendChild(warningDiv);

		return true;

	}

	init(...initArgs);

};
