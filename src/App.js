import _ from 'lodash';
import scroller from './scroller.js';
import timeline from './timeline/timeline.js';
import dispatcher from './dispatcher.js';
import continents from './continents.js';
import states from './states.js';
import actions from './actions.js';
//import triggers from './triggers.js';
import moods from './moods.js';
import calm from './calm.js';
import moreInfo from './moreInfo.js';
import introModal from './introModal.js';
import popupManager from './popupManager.js';
import emotionsData from '../static/emotionsData.json';
import secondaryData from '../static/secondaryData.json';
import appStrings from './appStrings.js';
import stringsConfig from '../static/strings/stringsConfig.json';
import sassVars from '../scss/variables.json';

export default function ( ...initArgs ) {

	const
		MIN_ALLOWED_WIDTH = 950,
		MIN_ALLOWED_HEIGHT = 600,
		MODAL_ENABLED = false,
		MOBILE_ENABLED = true,		// feature flag for mobile

		NAVIGATION_DEFAULTS = {
			section: dispatcher.SECTIONS.CALM,
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

		screenIsSmall = false,
		nonMobileElements = [],
		mobileElements = [],

	// FIXME remove this old scrolling code

		scrollbarSegments = {},
		scrollbarCloseTimeout = null,
		highlightedScrollbarSection = null,
		scrollbarBounds,
		scrollbarClosedPos,
		scrollbarAnimUpdate,
		scrollbarIsOpen = false,

		recentScrollDeltas = [],			// cache recent scroll delta values to check intentionality of scroll
		lastScroll = 0,						// timestamp of most recent scroll event
		hasNavigatedThisScroll = false,		// has already navigated during the current inertia/continuous scroll
		isNavigating = false,				// currently navigating between emotions or sections
		bypassedWarning = false;			// user has bypassed small screen warning


	function init( containerNode ) {

		adjustForScreenSize();

		// wait for strings to load before continuing init
		appStrings().loadStrings()
			.then( () => {

				initTemplate();
				initContainers();
				initSections();
				initHeader();
				if ( screenIsSmall ) {
					initSectionNavigation();
				}
				initNavArrows();
				initMoreInfoDropdown();
				initPegLogo();
				initLanguageSelector();
				initCallout();
				initMobileCaption();
				initScroller();

				if ( MODAL_ENABLED ) {
					initModal();
				}

				// mobile setup
				nonMobileElements.push( document.querySelector( '#header' ) );
				nonMobileElements.push( document.querySelector( '#scrollbar' ) );
				nonMobileElements.push( document.querySelector( '#callout' ) );
				nonMobileElements.push( document.querySelector( '#more-info' ) );
				nonMobileElements.push( document.querySelector( '#lower-left-logo' ) );
				nonMobileElements.push( document.querySelector( '#lang-selector' ) );
				mobileElements.push( document.querySelector( '#mobile-header' ) );
				mobileElements.push( document.querySelector( '#mobile-caption' ) );

				// unhide content rendered for bots
				document.querySelector( 'body' ).style.removeProperty( 'visibility' );

				// navigation events
				dispatcher.addListener( dispatcher.EVENTS.NAVIGATE, onNavigate );
				dispatcher.addListener( dispatcher.EVENTS.CHANGE_EMOTION_STATE, onEmotionStateChange );
				dispatcher.addListener( dispatcher.EVENTS.CHANGE_EMOTION, onEmotionChange );
				dispatcher.addListener( dispatcher.EVENTS.CHANGE_CALLOUT, onCalloutChange );
				dispatcher.addListener( dispatcher.EVENTS.POPUP_CHANGE, onPopupChange );
				dispatcher.addListener( dispatcher.EVENTS.OPEN_MORE_INFO_MENU, onMoreInfoMenuClick );

				window.addEventListener( 'hashchange', onHashChange );

				onResize();
				onHashChange();

				// debounce after initial call
				onResize = _.debounce( onResize, 250 );
				window.addEventListener( 'resize', onResize );

			} );

	}

	function initScroller() {
		initSection(moreInfo);
		scroller.init.bind( scroller )();
	}

	function initTemplate() {

		_.templateSettings = {
			evaluate: /\{\{#([\s\S]+?)\}\}/g,            // {{# console.log("blah") }}
			interpolate: /\{\{[^#\{]([\s\S]+?)[^\}]\}\}/g,  // {{ title }}
			escape: /\{\{\{([\s\S]+?)\}\}\}/g,         // {{{ title }}}
		};

		var templateElements = document.querySelectorAll( '[data-template]' );

		templateElements.forEach( function ( element ) {
			var data = appStrings().getStr( 'emotionsData.' + element.dataset.template );
			var compiled = _.template( element.innerHTML );
			element.innerHTML = compiled( data );
		} );

	}

	function initContainers() {

		let mainEl = document.querySelector( '#main' ),
			containerEl;

		_.values( dispatcher.SECTIONS ).forEach( sectionName => {
			containerEl = document.createElement( 'div' );
			containerEl.id = sectionName;
			mainEl.appendChild( containerEl );
			containers[ sectionName ] = containerEl;
		} );

		// position actions in front of triggers
		// so that triggers horizon element appears behind actions rays
		//mainEl.insertBefore( containers[ dispatcher.SECTIONS.TRIGGERS ], containers[ dispatcher.SECTIONS.ACTIONS ] );

	}

	function initSections() {

		sections.continents = continents;
		sections.states = states;
		sections.actions = actions;
		sections.triggers = timeline; //TODO finalize swap
		sections.moods = moods;
		sections.calm = calm;
		sections.more = moreInfo;

	}

	function initHeader() {

		let dropdown = document.querySelector( '#header .dropdown' ),
			menu = dropdown.querySelector( 'ul' );

		Object.keys( dispatcher.EMOTIONS ).forEach( emotionKey => {
			let emotionName = dispatcher.EMOTIONS[ emotionKey ].toLowerCase();
			let li = document.createElement( 'li' );
			li.setAttribute( 'role', 'menuitem' );
			li.setAttribute( 'data-emotion', emotionName );
			li.innerHTML = appStrings().getStr( `derived.emotions.${ emotionName }` ).toUpperCase();
			menu.appendChild( li );
		} );

		// add translated title
		let headerContent = document.querySelector( '#header .header-content' );
		headerContent.querySelector( 'a' ).textContent = appStrings().getStr( 'emotionsData.metadata.site.header' ).toUpperCase();

		dropdown.querySelector( '.dropdown-toggle' ).addEventListener( 'click', onEmotionDropdownClick );

		let mobileHeader = document.querySelector( '#mobile-header' );
		mobileHeader.style.removeProperty( 'display' );
		mobileHeader.classList.add( 'visible' );

		if ( screenIsSmall ) {
			let navButton = document.createElement( 'div' );
			navButton.classList.add( 'nav-button' );
			mobileHeader.appendChild( navButton );
			navButton.addEventListener( 'click', onMobileHeaderClick );

			let mobileTitle = document.createElement( 'div' );
			mobileTitle.classList.add( 'mobile-title' );
			mobileTitle.appendChild( headerContent );
			mobileHeader.appendChild( mobileTitle );

			initMobileHeaderNav();
		}

	}

	function initMobileHeaderNav() {

		let dropdown = document.querySelector( '#mobile-header .dropdown' ),
			menu = dropdown.querySelector( 'ul' );

		[ 'intro' ]
			.concat( _.values( dispatcher.SECTIONS ).filter( v => v !== dispatcher.SECTIONS.MORE ) )
			.concat( [ 'about', 'emotrak' ] )
			.forEach( ( section, i, arr ) => {

				let sectionName,
					li = document.createElement( 'li' );

				if ( section === 'about' || section === 'emotrak' ) {
					sectionName = appStrings().getStr( `emotionsData.${ section }.sectionName` ) || section;
					li.setAttribute( 'data-page', section );
				} else {
					sectionName = appStrings().getStr( `emotionsData.metadata.${ section }.sectionName` ) || section;
					li.setAttribute( 'data-section', section );
				}

				li.setAttribute( 'role', 'menuitem' );
				li.innerHTML = '<h4>' + sectionName + '</h4>';
				menu.appendChild( li );

				// add divider at the end
				if ( i === arr.length - 1 && languageSelectorIsEnabled() ) {
					li = document.createElement( 'li' );
					li.setAttribute( 'role', 'menuitem' );
					li.classList.add( 'divider' );
					menu.appendChild( li );
				}

			} );

		if ( languageSelectorIsEnabled() ) populateLanguageSelector( menu );

		document.querySelector( '#mobile-header' ).appendChild( dropdown );

		dropdown.querySelector( '.dropdown-toggle' ).addEventListener( 'click', onMobileNavClick );

	}

	function initNavArrows() {

		function setUpArrow( direction ) {

			let navArrow = document.querySelector( '#' + direction + '-arrow' ),
				attentionArrow = document.createElement( 'img' ),
				suffix = screenIsSmall ? '-white' : '';

			let onClickNav = direction == 'down' ? onDownArrowClick : (direction == 'left' ? onLeftArrowClick : onRightArrowClick);
			if ( screenIsSmall ) {
				// attach handler to container
				navArrow.addEventListener( 'click', onClickNav );
			} else {
				// attach handler to inner img, due to 100% width on container
				attentionArrow.addEventListener( 'click', onClickNav );
			}

			// add both images here
			attentionArrow.src = './img/' + direction + 'Arrow' + suffix + '.png';

			// set classes
			navArrow.classList.add( 'navArrow' );
			attentionArrow.classList.add( direction );
			attentionArrow.classList.add( direction + 'Arrow' );

			navArrow.appendChild( attentionArrow );

			// add label
			let label = document.createElement( 'h4' );
			label.classList.add( 'navLabel' );
			if ( direction === 'left' ) {
				navArrow.appendChild( label );
			} else {
				navArrow.insertBefore( label, attentionArrow );
			}
			if ( direction === 'down' ) {
				label.style.display = 'none';
			}

		}

		setUpArrow( 'down' );
		setUpArrow( 'left' );
		setUpArrow( 'right' );

		updateArrowVisibility();
	}

	function initPegLogo() {

		let logoDiv = document.querySelector( '#lower-left-logo' );
		logoDiv.addEventListener( 'click', function () {
			window.open( 'http://www.paulekman.com/', '_blank' );
		} );
		let logo = document.createElement( 'img' );

		logo.setAttribute( "src", './img/peg.png' );

		logoDiv.appendChild( logo );

	}

	function initLanguageSelector() {

		if ( !languageSelectorIsEnabled() ) return;

		document.querySelector( '#lang-selector' ).classList.add( 'enabled' );

		let dropdown = document.querySelector( '#lang-selector .dropup' ),
			title = dropdown.querySelector( '.dup-title' ),
			menu = dropdown.querySelector( 'ul' ),
			langFile = getActiveLanguages().find( f => f.lang === getLanguagePref() );

		title.innerHTML = '<h4>' + langFile.name + '</h4>';
		populateLanguageSelector( menu );

		dropdown.querySelector( '.dropdown-toggle' ).addEventListener( 'click', onLangMenuClick );

	}

	function getActiveLanguages() {
		return stringsConfig.stringsFiles.filter( f => f.enabled );
	}

	function languageSelectorIsEnabled() {
		return getActiveLanguages().length > 1;
	}

	function populateLanguageSelector( container ) {

		getActiveLanguages().forEach( f => {
			let li = document.createElement( 'li' );
			li.setAttribute( 'role', 'menuitem' );
			li.setAttribute( 'data-lang', f.lang );
			li.innerHTML = '<h4>' + f.name + '</h4>';
			container.appendChild( li );
		} );

	}

	function initMoreInfoDropdown() {

		let dropdown = document.querySelector( '#more-info .dropup' ),
			title = dropdown.querySelector( '.dup-title' ),
			menu = dropdown.querySelector( 'ul' ),
			dropdownLabel = appStrings().getStr( 'emotionsData.metadata.more.sectionName' ) || dispatcher.MORE_INFO.title;

		title.innerHTML = '<h4>' + dropdownLabel + '</h4>';

		dispatcher.MORE_INFO.items.forEach( ( item ) => {
			let label = appStrings().getStr( `emotionsData.${ item.page }.sectionName`, true ) || item.label,
				li = document.createElement( 'li' );
			li.setAttribute( 'role', 'menuitem' );
			li.setAttribute( 'data-page', item.page );
			li.innerHTML = '<h4>' + label + '</h4>';
			menu.appendChild( li );
		} );

		dropdown.querySelector( '.dropdown-toggle' ).addEventListener( 'click', onMoreInfoMenuClick );

	}

	function initSectionNavigation() {

		initNavbar();
		// initScrollNavigation();
		// initKeyboardNavigation();

	}

	function initNavbar() {

		let scrollbar = document.querySelector( '#scrollbar' ),
			segmentContainer = document.createElement( 'div' );

		let mouseHandlerScrollBar = document.createElement( 'div' );
		mouseHandlerScrollBar.classList.add( 'mousemoveTriggerScrollbar' );
		scrollbar.appendChild( mouseHandlerScrollBar );

		segmentContainer.classList.add( 'segment-container' );
		scrollbar.appendChild( segmentContainer );

		_.values( dispatcher.SECTIONS ).forEach( section => {

			// more info does not appear in scrollbar
			if ( section === dispatcher.SECTIONS.MORE ) {
				return;
			}

			let sectionName = appStrings().getStr( `emotionsData.metadata.${ section }.sectionName` ) || section;
			let segment = document.createElement( 'div' );
			segment.setAttribute( 'data-section', section );
			let label = document.createElement( 'h4' );
			label.innerHTML = sectionName.toUpperCase();
			segment.appendChild( label );
			segmentContainer.appendChild( segment );
			scrollbarSegments[ section ] = segment;

		} );

		// Note: deprecated in favor of onScrollbarHitAreaEnter/onScrollbarHitAreaLeave/onScrollbarMouseMove
		//onWindowMouseMove = _.throttle(onWindowMouseMove, 50);
		//window.addEventListener('mousemove', onWindowMouseMove);

		// div that's 3x as wide as the minimized scrollbar, designed to capture mousemove events
		mouseHandlerScrollBar.addEventListener( 'mousemove', onScrollbarMouseMove );

		scrollbar.addEventListener( 'mouseenter', onScrollbarHitAreaEnter );
		scrollbar.addEventListener( 'mouseleave', onScrollbarHitAreaLeave );

		segmentContainer.addEventListener( 'mouseover', onScrollbarOver );
		segmentContainer.addEventListener( 'mouseout', onScrollbarOut );
		segmentContainer.addEventListener( 'click', onScrollbarClick );

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
		scrollbarClosedPos = parseInt( window.getComputedStyle( segmentContainer ).left.replace( 'px', '' ) );

	}

	function initScrollNavigation() {

		// throttle wheel events, and
		// prune cached scroll events every frame
		recentScrollDeltas = [];
		let queuedWheelEvent;
		let onRAF = () => {
			if ( queuedWheelEvent ) {
				onWheel( queuedWheelEvent.deltaX, queuedWheelEvent.deltaY );
			} else {
				if ( recentScrollDeltas.length ) {
					recentScrollDeltas.shift();
				}
			}
			queuedWheelEvent = null;
			window.requestAnimationFrame( onRAF );
		};
		window.addEventListener( 'wheel', ( event ) => {
			queuedWheelEvent = event;
		} );
		window.requestAnimationFrame( onRAF );

	}

	function initKeyboardNavigation() {

		document.addEventListener( 'keydown', onKeyDown );

	}

	function initCallout() {

		let mainEl = document.querySelector( '#main' );
		callout = document.createElement( 'div' );
		callout.id = 'callout';

		let h3 = document.createElement( 'h3' );
		h3.classList.add( 'headline' );
		callout.appendChild( h3 );
		let p = document.createElement( 'p' );
		p.classList.add( 'body' );
		callout.appendChild( p );

		mainEl.appendChild( callout );

	}

	function initMobileCaption() {

		let caption = document.querySelector( '#mobile-caption' );
		caption.style.removeProperty( 'display' );

		let h3 = document.createElement( 'h3' );
		h3.classList.add( 'headline' );
		caption.appendChild( h3 );
		let p = document.createElement( 'p' );
		p.classList.add( 'body' );
		caption.appendChild( p );

		let arrow = document.createElement( 'div' );
		arrow.classList.add( 'mobile-nav-arrow' );
		let arrowImg = document.createElement( 'img' );
		arrowImg.src = './img/leftArrow.png';
		arrowImg.classList.add( 'left', 'leftArrow' );
		arrow.appendChild( arrowImg );
		caption.appendChild( arrow );
		arrowImg.addEventListener( 'click', onMobileLeftArrowClick );

		arrow = document.createElement( 'div' );
		arrow.classList.add( 'mobile-nav-arrow' );
		arrowImg = document.createElement( 'img' );
		arrowImg.src = './img/rightArrow.png';
		arrowImg.classList.add( 'right', 'rightArrow' );
		arrow.appendChild( arrowImg );
		caption.appendChild( arrow );
		arrowImg.addEventListener( 'click', onMobileRightArrowClick );

	}

	function initModal() {

		introModal.init( document.querySelector( '#modal' ), setModalVisibility );

		// reopen modal on infoButton click
		if ( document.querySelector( '#infoButton' ) ) {
			document.querySelector( '#infoButton' )
				.addEventListener( 'click', ( event ) => {
					event.stopImmediatePropagation();
					// this works for removal also, since a click outside closes the modal
					setModalVisibility( true );
				} );
		}

	}

	function markModalAsSeen() {

		if ( !localStorage.modalSeen ) {
			localStorage.setItem( "modalSeen", true );
		}

	}

	function setSectionEmotion( section, previousEmotion, previousMorePage ) {


		let promise = section.setEmotion( currentEmotion, previousEmotion, currentMorePage, previousMorePage );
		updateArrowLabels();

		promise.then( () => {
			isNavigating = false;
			updateArrowLabels();
		} );

	}

	function fadeArrowOutAndIn( sectionName ) {

		if ( !screenIsSmall ) {
			function endFade() {
				document.querySelector( '.downArrow' ).classList.remove( "fadeOutIn" );
				document.querySelector( '.leftArrow' ).classList.remove( "fadeOutIn" );
				document.querySelector( '.rightArrow' ).classList.remove( "fadeOutIn" );
			}

			document.querySelector( '.downArrow' ).classList.add( "fadeOutIn" );
			document.querySelector( '.leftArrow' ).classList.add( "fadeOutIn" );
			document.querySelector( '.rightArrow' ).classList.add( "fadeOutIn" );
			setTimeout( endFade, 4000 );
		}

		updateArrowVisibility( sectionName );

	}

	function setSection( sectionName, previousEmotion, previousMorePage ) {
		let section = sections[ sectionName ],
			previousSection = currentSection,
			previousContainer;

		for ( let key in sections ) {
			if ( sections[ key ] === previousSection ) {
				previousContainer = containers[ key ];
				break;
			}
		}

		if ( !section.isInited ) {
			// init any uninited background sections
			if ( section.backgroundSections ) {
				section.backgroundSections.forEach( backgroundSection => {
					if ( !backgroundSection.isInited ) {
						initSection( backgroundSection );
					}
				} );
			}

			// init current section
			initSection( section );
		}

		// if navigating into 'more' section, store current section
		// for navigating back to when leaving 'more' section
		if ( sectionName === 'more' && section.setPreviousSection ) {
			section.setPreviousSection( previousNonSecondaryHash.section );
		}

		let backgroundSections = section.backgroundSections || [];

		if ( !previousSection ) {

			// this is the first section opened in this session

			// update down arrow
			fadeArrowOutAndIn( sectionName );

			// hide all but the current section and any background sections
			for ( let key in containers ) {
				if ( key !== sectionName && !~backgroundSections.indexOf( sections[ key ] ) ) {
					containers[ key ].style.display = 'none';
				}
			}

			// open and background all backgroundSections for the current section
			backgroundSections.forEach( backgroundSection => {
				backgroundSection.open( {
					sectionName: sectionName,
					inBackground: true
				} );
				backgroundSection.setEmotion( currentEmotion, previousEmotion );
			} );

			section.open( {
				sectionName: sectionName,
				inBackground: false,
				introModalIsOpen: getIntroModalOpenState()
			} );

			setSectionEmotion( section, previousEmotion, previousMorePage );

		} else {

			// some section is already open; perform transition

			if ( previousSection === section ) {

				// change emotion for all background sections
				backgroundSections.forEach( backgroundSection => {
					backgroundSection.setEmotion( currentEmotion, previousEmotion );
				} );

				// and within current section
				setSectionEmotion( section, previousEmotion, previousMorePage );

			} else {

				// navigate between sections
				//
				// sections can have background sections.
				// when a section is opened, all its background sections must be opened and backgrounded.
				// when a section is closed, for all of its background sections:
				// 	if the section to which we're navigating is a background section, unbackground it;
				// 	else close the background section.
				//

				// remove any popups
				onPopupChange();

				// update down arrow
				fadeArrowOutAndIn( sectionName );

				// open and background all backgroundSections for the current section
				let previousSectionBackgrounded = false,
					promises = backgroundSections.map( backgroundSection => {
						// display all background sections
						for ( let key in sections ) {
							if ( ~backgroundSections.indexOf( sections[ key ] ) ) {
								containers[ key ].removeAttribute( 'style' );
							}
						}

						if ( previousSection === backgroundSection ) {
							// already open; just background it
							previousSectionBackgrounded = true;
							return backgroundSection.setBackgrounded( true, {
								sectionName: sectionName
							} );
						} else {
							// open it in the background
							let openPromise = backgroundSection.open( {
								sectionName: sectionName,
								inBackground: true
							} );
							backgroundSection.setEmotion( currentEmotion, previousEmotion );
							return openPromise;
						}
					} );

				let previousBackgroundSections = previousSection.backgroundSections || [];
				if ( !previousSectionBackgrounded ) {
					// don't mess with current backgroundSections or the current section
					previousBackgroundSections = previousBackgroundSections.filter( prevBkgdSection => {
						return prevBkgdSection !== section && !~backgroundSections.indexOf( prevBkgdSection );
					} );
					if ( previousBackgroundSections.length ) {
						// close previous background sections not needed for the current section
						previousBackgroundSections.forEach( prevBkgdSection => {
							prevBkgdSection.setBackgrounded( false );
							prevBkgdSection.close( sectionName );
						} );
					}

					// close the previous section
					promises.push( previousSection.close( sectionName ) );
				}

				Promise.all( promises ).then( values => {

					if ( !previousSectionBackgrounded ) {
						// hide the previous section's container if not backgrounded,
						// after a delay if specified
						if ( previousContainer ) {
							setTimeout( () => {
								previousContainer.style.display = 'none';
							}, previousSection.closeDelay || 0 );
						}
					}

					// hide the container of any closed previous background section
					// that is not a background section for this section
					if ( previousBackgroundSections.length ) {
						for ( let key in sections ) {
							if ( ~previousBackgroundSections.indexOf( sections[ key ] ) &&
								(!section.backgroundSections || !~section.backgroundSections.indexOf( sections[ key ] )) ) {
								containers[ key ].style.display = 'none';
							}
						}
					}
					;

					// reveal the new section's container,
					// open the new section, and set its emotion
					containers[ sectionName ].removeAttribute( 'style' );
					section.open( {
						sectionName: sectionName,
						inBackground: false
					} );

					setSectionEmotion( section, previousEmotion, previousMorePage );

				} );

			}

		}

		if ( !currentMorePage ) {
			updateHeader( {
				section: sectionName
			} );
		}

		setScrollbarHighlight( sectionName );

		currentSection = section;

		if ( screenIsSmall ) updateMobileUI();

	}

	function setMore( page ) {
		updateHeader( {
			more: page
		} );

		currentMorePage = page;
	}

	function setEmotion( emotion ) {

		updateHeader( {
			emotion: emotion
		} );

		// setSection cues up emotion changes,
		// leaving this function very simple.
		currentEmotion = emotion;

	}

	function initSection( section ) {

		let sectionName;
		for ( let key in sections ) {
			if ( sections[ key ] === section ) {
				sectionName = key;
				break;
			}
		}

		// turn on display so width/height can be calculated
		let currentDisplay = containers[ sectionName ].style.display;
		containers[ sectionName ].removeAttribute( 'style' );

		section.init( containers[ sectionName ], screenIsSmall );

		// set display back to where it was
		if ( currentDisplay ) {
			containers[ sectionName ].style.display = currentDisplay;
		}

	}

	function updateHeader( config ) {

		if ( config.section || config.more ) {
			let title;
			if ( config.section ) {
				title = appStrings().getStr( `derived.sections.${ config.section }` );
			} else {
				title = dispatcher.getMorePageName( config.more );
			}
			if ( !title ) title = config.section || config.more;
			document.querySelector( '#header h1' ).innerHTML = title.toUpperCase();
		}

		let dropdownTitle = document.querySelector( '#header .dd-title' );
		if ( config.emotion ) {
			let emotion = appStrings().getStr( `derived.emotions.${ config.emotion }` ) || config.emotion;
			dropdownTitle.innerHTML = emotion.toUpperCase();
		} else if ( config.emotion === null ) {
			dropdownTitle.innerHTML = (appStrings().getStr( 'emotionsData.metadata.site.caption' ) || 'CHOOSE AN EMOTION').toUpperCase();
		}
	}

	function scrollSection( dir, fromScroll ) {

		// console.log(">>>>> scrollSection(); isNavigating:", isNavigating);

		if ( isNavigating ) {
			return;
		}
		if ( !currentSection ) {
			return;
		}

		let sectionNames = _.values( dispatcher.SECTIONS ),
			currentSectionIndex,
			targetSectionIndex;

		sectionNames.some( ( sectionName, i ) => {
			if ( sections[ sectionName ] === currentSection ) {
				currentSectionIndex = i;
				return true;
			}
		} );
		// console.log(">>>>> scroll from currentSectionIndex:", currentSectionIndex);

		if ( dir < 0 ) {
			targetSectionIndex = Math.max( 0, currentSectionIndex - 1 );
		} else {
			targetSectionIndex = Math.min( currentSectionIndex + 1, sectionNames.length - 1 );
		}

		// console.log(">>>>> scroll to targetSectionIndex:", targetSectionIndex);

		if ( currentSectionIndex !== targetSectionIndex ) {

			if ( sectionNames[ targetSectionIndex ] == 'more' ) {
				dispatcher.navigate( 'more', null, 'annex' );
			} else {
				dispatcher.navigate( sectionNames[ targetSectionIndex ] );
			}

			if ( fromScroll ) {
				hasNavigatedThisScroll = true;
			}
		}

	}

	function scrollEmotion( dir ) {

		// console.log(">>>>> scrollEmotion(); isNavigating:", isNavigating);
		if ( isNavigating || currentMorePage ) {
			return;
		}

		let emotionNames = _.values( dispatcher.EMOTIONS ),
			currentEmotionIndex = emotionNames.indexOf( currentEmotion ),
			targetEmotionIndex;

		if ( currentEmotionIndex === -1 ) {
			// default to Anger
			currentEmotionIndex = 0;
		}
		// console.log(">>>>> scroll from currentEmotionIndex:", currentEmotionIndex);

		if ( dir < 0 ) {
			//targetEmotionIndex = Math.max(0, currentEmotionIndex - 1);
			targetEmotionIndex = (currentEmotionIndex - 1 + emotionNames.length) % emotionNames.length;
		} else {
			//targetEmotionIndex = Math.min(currentEmotionIndex + 1, emotionNames.length - 1);
			targetEmotionIndex = (currentEmotionIndex + 1) % emotionNames.length;
		}

		// console.log(">>>>> scroll to targetEmotionIndex:", targetEmotionIndex);

		if ( currentEmotionIndex !== targetEmotionIndex ) {
			dispatcher.navigate( null, emotionNames[ targetEmotionIndex ] );
		}

	}

	function paginateSelectedElement( dir ) {

		if ( currentSection.paginateElement ) currentSection.paginateElement( dir );

	}

	/**
	 * Note: this function is _.debounce()d in init().
	 */
	function onResize() {

		adjustForScreenSize();

		if ( !screenIsSmall ) {

			// if we're on the homepage, or the intro modal
			// hasn't ever been viewed yet in this browser,
			// and the screen is big enough to render the site below it,
			// open the intro modal (and the scrollbar along with it)
			if ( getIntroModalOpenState() ) {
				if ( MODAL_ENABLED ) {
					// set a class on body so other sections can react
					document.body.classList.remove( 'intro-closing', 'intro-open' );
					document.body.classList.add( 'intro-opening' );

					setTimeout( () => {
						setModalVisibility( true );
					}, sassVars.ui.intro.delay * 1000 );

					setTimeout( () => {
						setScrollbarFractionalOpen( 1.0 );
					}, sassVars.ui.scrollbar.introOpenDelay * 1000 );
				}
			}

		}

		// size main container to viewport
		let headerHeight = screenIsSmall ? sassVars.ui.header[ 'height-small' ] : sassVars.ui.header.height;
		document.getElementById( 'main' ).style.height = (window.innerHeight - headerHeight) + 'px';

		// update scrollbar values
		// scrollbarBounds.left = scrollbar.getBoundingClientRect().left;

		// update all sections
		let section,
			sectionContainer,
			containerIsHidden;
		for ( let sectionKey in sections ) {
			section = sections[ sectionKey ];
			if ( section.isInited ) {

				// un-hide section container as necessary
				// to get accurate measurements for resize
				sectionContainer = containers[ sectionKey ];
				containerIsHidden = sectionContainer.style.display === 'none';
				if ( containerIsHidden ) {
					sectionContainer.style.display = 'block';
				}

				section.onResize( screenIsSmall );

				if ( containerIsHidden ) {
					sectionContainer.style.display = 'none';
				}

			}
		}

	}

	function onKeyDown( event ) {

		switch ( event.keyCode ) {
			case 37:
				// left
				scrollEmotion( -1 );
				break;
			case 38:
				// top
				scrollSection( -1 );
				break;
			case 39:
				// right
				scrollEmotion( 1 );
				break;
			case 40:
				// bottom
				scrollSection( 1 );
				break;
			case 76:
				// L
				setLanguage( appStrings().lang() === 'en' ? 'es' : 'en' );
				break;
		}

	}

	function onWheel( deltaX, deltaY ) {

		// TODO: enable horizontal scrolling with mouse (trackpad) for emotions?
		// might interfere with two-finger-swipe browser back/fwd.

		//
		// TODO: don't just block wheel events when they're continuous;
		// block them when they're continuously <= the last value.
		// need to be able to support sequential, yet discrete, swipes.
		//
		// also, can't raise MIN_NUM_SCROLL_EVENTS too high because that doesn't work well with scroll wheel mouse.
		// might want to instead focus on MIN_SCROLL_CUMULATIVE_DIST
		//

		if ( currentMorePage ) return;

		if ( deltaY ) {

			let now = Date.now();
			if ( now - lastScroll > INERTIA_SCROLL_TIMEOUT ) {
				// enough time has elapsed between wheel events
				// to resume letting wheel events through.
				hasNavigatedThisScroll = false;
			}
			// console.log(">>>>> now - lastScroll:", now - lastScroll);
			lastScroll = now;

			if ( hasNavigatedThisScroll ) {

				// ignore wheel events until current inertia/continuous scroll comes to a stop.
				// console.log(">>>>> hasNavigatedThisScroll; blocked");
				recentScrollDeltas = [];

			} else {

				// process wheel events as normal
				recentScrollDeltas.push( deltaY );
				// console.log(">>>>> recentScrollDeltas:", recentScrollDeltas);
				if ( recentScrollDeltas.length >= MIN_NUM_SCROLL_EVENTS ) {
					let totalDelta = recentScrollDeltas.reduce( ( t, d ) => t + d, 0 );

					if ( Math.abs( totalDelta ) >= MIN_SCROLL_CUMULATIVE_DIST ) {
						recentScrollDeltas = [];
						scrollSection( totalDelta < 0 ? -1 : 1, true );
					}
				}

			}

		}

	}

	function closeMenus( target ) {
		document.querySelector( 'body' ).removeEventListener( 'click', closeMenus );
		const menus = document.querySelectorAll( '.emotion-menu' );
		[ ...menus ].forEach( ( menu ) => {
			if ( menu !== target ) menu.classList.remove( 'open' );
		} );
	}

	function menuBackgroundClick() {
		document.querySelector( 'body' ).addEventListener( 'click', closeMenus );
	}

	function onMoreInfoMenuClick( event ) {

		if ( event ) event.stopPropagation();

		let dropdown = document.querySelector( '#more-info .dropup' ),
			classList = dropdown.classList;

		closeMenus( dropdown );
		classList.toggle( 'open' );

		if ( classList.contains( 'open' ) ) {
			dropdown.addEventListener( 'click', onMoreInfoMenuItemClick );
		} else {
			dropdown.removeEventListener( 'click', onMoreInfoMenuItemClick );
		}

		menuBackgroundClick();

	}

	function onMoreInfoMenuItemClick( event ) {

		event.stopImmediatePropagation();

		if ( !event.target || event.target.nodeName.toLowerCase() !== 'li' ) {
			return;
		}

		document.querySelector( '#more-info .dropup' ).classList.remove( 'open' );

		let page = event.target.dataset.page;
		if ( !page ) return;

		dispatcher.navigate( dispatcher.SECTIONS.MORE, null, page );

	}

	function onLangMenuClick( event ) {

		if ( event ) event.stopPropagation();

		let dropdown = document.querySelector( '#lang-selector .dropup' ),
			classList = dropdown.classList;

		closeMenus( dropdown );
		classList.toggle( 'open' );

		if ( classList.contains( 'open' ) ) {
			dropdown.addEventListener( 'click', onLangMenuItemClick );
		} else {
			dropdown.removeEventListener( 'click', onLangMenuItemClick );
		}

		menuBackgroundClick();

	}

	function onLangMenuItemClick( event ) {

		event.stopImmediatePropagation();

		if ( !event.target || event.target.nodeName.toLowerCase() !== 'li' ) {
			return;
		}

		document.querySelector( '#lang-selector .dropup' ).classList.remove( 'open' );

		let lang = event.target.dataset.lang;
		if ( !lang ) return;

		setLanguage( lang );

	}

	function onEmotionDropdownClick( event ) {

		let dropdown = document.querySelector( '#header .dropdown' ),
			classList = dropdown.classList;

		classList.toggle( 'open' );

		if ( classList.contains( 'open' ) ) {
			dropdown.addEventListener( 'click', onDropdownItemClick );
		} else {
			dropdown.removeEventListener( 'click', onDropdownItemClick );
		}

		event.stopPropagation();

	}

	function onDropdownItemClick( event ) {

		if ( !event.target || event.target.nodeName.toLowerCase() !== 'li' ) {
			return;
		}
		event.stopImmediatePropagation();

		document.querySelector( '#header .dropdown' ).classList.remove( 'open' );

		dispatcher.navigate( null, event.target.dataset.emotion );

	}

	function onMobileHeaderClick( event ) {

		if ( currentSection === sections[ dispatcher.SECTIONS.CONTINENTS ] ) {
			dispatcher.navigate( dispatcher.HOME );
		} else {
			scrollSection( -1 );
		}

	}

	function onMobileNavClick( event ) {

		let dropdown = document.querySelector( '#mobile-header .dropdown' ),
			curtain = document.querySelector( '#mobile-header .dropdown-curtain' ),
			classList = dropdown.classList;

		classList.toggle( 'open' );

		if ( classList.contains( 'open' ) ) {
			dropdown.addEventListener( 'click', onMobileNavItemClick );
			curtain.addEventListener( 'click', onMobileNavCurtainClick );
			curtain.classList.add( 'open' );
		} else {
			dropdown.removeEventListener( 'click', onMobileNavItemClick );
			curtain.removeEventListener( 'click', onMobileNavCurtainClick );
			curtain.classList.remove( 'open' );
		}

		event && event.stopPropagation();

	}

	function onMobileNavItemClick( event ) {

		if ( !event.target || event.target.nodeName.toLowerCase() !== 'li' ) {
			return;
		}
		event.stopImmediatePropagation();

		onMobileNavClick();
		document.querySelector( '#mobile-header .dropdown' ).classList.remove( 'open' );

		if ( event.target.dataset.section ) {
			if ( event.target.dataset.section === 'intro' ) {
				dispatcher.navigate( dispatcher.HOME );
				// simplest way to ensure intro modal reopens: refresh page at home URL
				window.location.reload();
			} else {
				dispatcher.navigate( event.target.dataset.section );
			}
		} else if ( event.target.dataset.page ) {
			dispatcher.navigate( dispatcher.SECTIONS.MORE, null, event.target.dataset.page );
		} else if ( event.target.dataset.lang ) {
			setLanguage( event.target.dataset.lang );
		}

	}

	function onMobileNavCurtainClick( event ) {

		onMobileNavClick();

	}

	/**
	 * Note: this function is _.throttle()d in initNavBar().
	 * Note: this function is not currently in use.
	 */
	function onWindowMouseMove( event ) {

		// distance from left edge + 0.25*width to center, curved to open fast
		let mouseXRatio = Math.pow( Math.max( 0, Math.min( 1, (event.pageX - scrollbarBounds.left - 0.25 * scrollbarBounds.width) / (0.25 * scrollbarBounds.width) ) ), 0.5 );
		setScrollbarFractionalOpen( mouseXRatio );

	}

	function setScrollbarOpen( val ) {

		if ( screenIsSmall ) return;

		if ( val && !scrollbarIsOpen ) {
			setScrollbarFractionalOpen( 1.0, 0.15 );
		} else if ( !val && scrollbarIsOpen ) {
			setScrollbarFractionalOpen( 0.0, 0.08 );
		}

		scrollbarIsOpen = val;

	}

	/**
	 * Open the scrollbar to a value between
	 * 0.0 (totally closed) and 1.0 (totally open).
	 * @param {Number} float scrollbar open amount
	 * @param {Number} speed Value between 0.0001 (slow open) and 1 (immediate open)
	 */
	function setScrollbarFractionalOpen( val, speed ) {

		if ( scrollbarAnimUpdate ) {
			window.cancelAnimationFrame( scrollbarAnimUpdate );
		}

		let segmentContainer = document.querySelector( '#scrollbar .segment-container' ),
			scrollbarTgtPos = Math.round( (1 - val) * scrollbarClosedPos ),
			scrollbarPos = parseFloat( window.getComputedStyle( segmentContainer ).left.replace( 'px', '' ) );

		let updatePos = function () {

			let dPos = (speed || 0.25) * (scrollbarTgtPos - scrollbarPos);
			if ( Math.abs( dPos ) < 0.25 ) {
				segmentContainer.style.left = scrollbarTgtPos + 'px';
				scrollbarAnimUpdate = null;
			} else {
				scrollbarPos += dPos;
				segmentContainer.style.left = scrollbarPos + 'px';
				scrollbarAnimUpdate = window.requestAnimationFrame( updatePos );
			}

		};
		window.requestAnimationFrame( updatePos );

	}

	function onScrollbarHitAreaEnter( event ) {

		document.querySelector( '#scrollbar' ).addEventListener( 'mousemove', onScrollbarMouseMove );

	}

	function onScrollbarHitAreaLeave( event ) {

		document.querySelector( '#scrollbar' ).removeEventListener( 'mousemove', onScrollbarMouseMove );
		setScrollbarOpen( false );

	}

	function onScrollbarMouseMove( event ) {
		// do this math elsewhere

		let scrollbarX = event.pageX - scrollbarBounds.left,
			scrollbarY = event.pageY - scrollbarBounds.top,
			scrollbarRelX = scrollbarX / scrollbarBounds.width,
		// managing this with the width of the scrollbar mouse sensor box instead
		//scrollbarTriggerX = scrollbarIsOpen ? 0.0 : 0.65;	// hit area increases once scrollbar is open,
		// to make it harder to accidentally close once open
			scrollbarTriggerX = 0;

		if ( scrollbarX < 0 || scrollbarX > window.innerWidth || scrollbarY < 0 || scrollbarY > scrollbarBounds.height ) {
			// manually call leave handler, in case it wasn't already called
			onScrollbarHitAreaLeave();
		} else if ( scrollbarRelX > scrollbarTriggerX ) {
			setScrollbarOpen( true );
		} else {
			setScrollbarOpen( false );
		}

	}

	function onScrollbarOver( event ) {

		let section = event.target.dataset.section;
		if ( section ) {
			displayScrollbarHighlight( section );
		}

	}

	function onScrollbarOut( event ) {
		displayScrollbarHighlight( null );
	}

	function onDownArrowClick( event ) {
		if ( screenIsSmall && currentSection === sections[ dispatcher.SECTIONS.CALM ] ) {
			dispatcher.navigate( dispatcher.SECTIONS.CONTINENTS, null );
		} else {
			scrollSection( 1 );
		}
	}

	function onLeftArrowClick( event ) {
		if ( screenIsSmall && currentSection === sections[ dispatcher.SECTIONS.CALM ] ) {
			dispatcher.navigate( dispatcher.SECTIONS.MORE, null, 'about' );
		} else {
			scrollEmotion( -1 );
		}
	}

	function onRightArrowClick( event ) {
		if ( screenIsSmall && currentSection === sections[ dispatcher.SECTIONS.CALM ] ) {
			dispatcher.navigate( dispatcher.SECTIONS.MORE, null, 'emotrak' );
		} else {
			scrollEmotion( 1 );
		}
	}

	function onMobileLeftArrowClick( event ) {
		paginateSelectedElement( -1 );
	}

	function onMobileRightArrowClick( event ) {
		paginateSelectedElement( 1 );
	}

	function onScrollbarClick( event ) {

		let section = event.target.dataset.section;
		if ( section ) {
			dispatcher.navigate( section );
		}

	}

	function setScrollbarHighlight( section ) {

		highlightedScrollbarSection = section;
		displayScrollbarHighlight( null );

	}

	function displayScrollbarHighlight( section ) {

		section = section || highlightedScrollbarSection;

		Object.keys( scrollbarSegments ).forEach( key => {
			let isHighlighted = key === section || key === highlightedScrollbarSection;
			scrollbarSegments[ key ].classList[ isHighlighted ? 'add' : 'remove' ]( 'highlighted' );
		} );

	}

	function setModalVisibility( val ) {

		let modal = document.querySelector( '#modal' ),
			modalOverlay = document.querySelector( '#modal-overlay' ),
			homeLink;

		introModal.setExitButtonText( currentSection === sections[ dispatcher.SECTIONS.CONTINENTS ] );

		if ( currentSection === sections[ dispatcher.SECTIONS.CONTINENTS ] && !val ) {
			// bring continents back to center when closing modal
			currentSection.setContinentIntroPositions( false );
		}

		if ( screenIsSmall ) return;

		if ( val ) {

			// bail if already open
			if ( modal.style.display === 'block' ) {
				return;
			}

			// set intro open flag as class on body
			document.body.classList.add( 'intro-open' );
			document.body.classList.remove( 'intro-closing', 'intro-opening' );

			modal.style.display = 'block';
			modalOverlay.style.display = 'block';

			// prevent scrolling while modal is open
			isNavigating = true;

			setTimeout( () => {
				// wait until after reflow to prevent `display: none` from killing transition
				modal.classList.add( 'visible' );
				modalOverlay.classList.add( 'visible' );

				let onOverlayClick = ( event ) => {
					event.stopImmediatePropagation();
					modalOverlay.removeEventListener( 'click', onOverlayClick );
					setModalVisibility( false );
				};
				modalOverlay.addEventListener( 'click', onOverlayClick );
			}, 100 );

		} else {

			// bail if already closed
			if ( !modalOverlay.classList.contains( 'visible' ) ) {
				return;
			}

			// set localStorage flag to prevent auto-opening modal on subsequent site visits
			markModalAsSeen();

			// set intro closing flag as class on body
			document.body.classList.add( 'intro-closing' );
			document.body.classList.remove( 'intro-open', 'intro-opening' );

			// re-enable scrolling when modal closes
			isNavigating = false;

			let onTransitionEnd = ( event ) => {
				modal.removeEventListener( 'transitionend', onTransitionEnd );
				modal.style.display = 'none';
				modalOverlay.style.display = 'none';

				// set intro closed flag as class on body
				document.body.classList.remove( 'intro-closing', 'intro-open', 'intro-opening' );
			};
			modal.addEventListener( 'transitionend', onTransitionEnd );
			modal.classList.remove( 'visible' );
			modalOverlay.classList.remove( 'visible' );

			// close the scrollbar, if it was opened along with the intro modal,
			// and enable scrollbar interaction
			setScrollbarFractionalOpen( 0.0 );

		}
	}

	function updateArrowVisibility( sectionName, smallScreenVisibility ) {

		if ( screenIsSmall ) {
			// arrows visibility on mobile controlled by second param,
			// defaults to true
			if ( typeof smallScreenVisibility === 'undefined' ) smallScreenVisibility = true;
			let classMethod = smallScreenVisibility ? 'add' : 'remove';
			document.querySelector( '#down-arrow' ).classList[ classMethod ]( 'visible' );
			document.querySelector( '#left-arrow' ).classList[ classMethod ]( 'visible' );
			document.querySelector( '#right-arrow' ).classList[ classMethod ]( 'visible' );

			if ( currentSection === sections[ dispatcher.SECTIONS.CONTINENTS ] ) {
				document.querySelector( '#down-arrow' ).classList.add( 'immediate' );
				document.querySelector( '#left-arrow' ).classList.add( 'immediate' );
				document.querySelector( '#right-arrow' ).classList.add( 'immediate' );
			} else {
				document.querySelector( '#down-arrow' ).classList.remove( 'immediate' );
				document.querySelector( '#left-arrow' ).classList.remove( 'immediate' );
				document.querySelector( '#right-arrow' ).classList.remove( 'immediate' );
			}
		} else if ( sectionName == 'calm' || sectionName == 'more' ) {
			// arrow not visible
			document.querySelector( '.downArrow' ).classList.remove( 'visible' );
			document.querySelector( '.leftArrow' ).classList.remove( 'visible' );
			document.querySelector( '.rightArrow' ).classList.remove( 'visible' );
		} else if ( sectionName == 'continents' ) {
			document.querySelector( '.downArrow' ).classList.add( 'visible' );
			document.querySelector( '.leftArrow' ).classList.remove( 'visible' );
			document.querySelector( '.rightArrow' ).classList.remove( 'visible' );
		} else {
			// arrow visible
			document.querySelector( '.downArrow' ).classList.add( 'visible' );
			document.querySelector( '.leftArrow' ).classList.add( 'visible' );
			document.querySelector( '.rightArrow' ).classList.add( 'visible' );
		}

	}

	function updateArrowLabels() {

		let emotionNames = _.values( dispatcher.EMOTIONS ),
			currentEmotionIndex = emotionNames.indexOf( currentEmotion ),
			leftEmotion = emotionNames[ (currentEmotionIndex - 1 + emotionNames.length) % emotionNames.length ],
			rightEmotion = emotionNames[ (currentEmotionIndex + 1) % emotionNames.length ];

		if ( screenIsSmall ) {
			let arrows = document.querySelectorAll( '.navArrow' ),
				arrowLeft = document.querySelector( '#left-arrow' ),
				arrowRight = document.querySelector( '#right-arrow' ),
				arrowDown = document.querySelector( '#down-arrow' ),
				labelLeft = arrowLeft.querySelector( '.navLabel' ),
				labelRight = arrowRight.querySelector( '.navLabel' ),
				labelDown = arrowDown.querySelector( '.navLabel' ),
				i;

			if ( currentSection === sections[ dispatcher.SECTIONS.CALM ] ) {
				for ( i = 0; i < arrows.length; i++ ) {
					arrows[ i ].querySelector( 'img' ).style.display = 'none';
				}

				labelLeft.textContent = appStrings().getStr( `emotionsData.about.sectionName` ) || 'about';
				labelRight.textContent = appStrings().getStr( `emotionsData.emotrak.sectionName` ) || 'emotrak';
				labelDown.textContent = appStrings().getStr( `emotionsData.metadata.calm.caption` ) || 'start over';
				labelDown.style.removeProperty( 'display' );
			} else {
				for ( i = 0; i < arrows.length; i++ ) {
					arrows[ i ].querySelector( 'img' ).style.removeProperty( 'display' );
				}

				labelLeft.textContent = appStrings().getStr( `derived.emotions.${ leftEmotion }` );
				labelRight.textContent = appStrings().getStr( `derived.emotions.${ rightEmotion }` );
				labelDown.textContent = '';
				labelDown.style.display = 'none';
			}

			for ( i = 0; i < arrows.length; i++ ) {
				arrows[ i ].classList[ isNavigating ? 'add' : 'remove' ]( 'disabled' );
			}
		}

	}

	function updateMobileUI() {

		// show title mobile header and hide mobile footer when appropriate
		let titleHeader =
			currentSection === sections[ dispatcher.SECTIONS.CONTINENTS ] ||
			currentSection === sections[ dispatcher.SECTIONS.MORE ];
		let hideFooterNav = (currentSection === sections[ dispatcher.SECTIONS.CONTINENTS ] && !currentEmotion) ||
			currentSection === sections[ dispatcher.SECTIONS.MORE ];

		updateArrowVisibility( null, !hideFooterNav );

		if ( titleHeader ) {
			document.querySelector( '#mobile-header .nav-button' ).style.display = 'none';
			document.querySelector( '#mobile-header .header-content' ).style.display = 'block';
			document.querySelector( '#mobile-header .dropdown' ).classList.remove( 'dark' );
		} else {
			document.querySelector( '#mobile-header .nav-button' ).style.display = 'block';
			document.querySelector( '#mobile-header .header-content' ).style.display = 'none';
			document.querySelector( '#mobile-header .dropdown' ).classList.add( 'dark' );
		}

		// if forcing to be hidden, hide arrows
		// else, decide based on the currentSection
		let paginationUIVisible = currentSection && currentSection.shouldDisplayPaginationUI && currentSection.shouldDisplayPaginationUI(),
			paginationArrows = document.querySelectorAll( '.mobile-nav-arrow' );
		for ( let i = 0; i < paginationArrows.length; i++ ) {
			paginationArrows[ i ].classList[ paginationUIVisible ? 'add' : 'remove' ]( 'visible' );
		}

	}

	function getIntroModalOpenState() {
		if ( MODAL_ENABLED ) {
			return !window.location.hash || localStorage.modalSeen !== 'true';
		} else {
			return false; //never open modal
		}

	}

	function onPopupChange( section, emotion, desc, secondaryData ) {

		if ( screenIsSmall && emotion ) {
			setMobileCaption( emotion, desc );
			return;
		}

		if ( !section ) {
			popupManager.manage();
		} else {
			if ( emotion !== popupManager.currentName ||
				(emotion && !popupManager.exists( section, emotion )) ) {
				popupManager.manage( section, emotion, desc, secondaryData );
			}
		}
	}

	function onCalloutChange( emotion, title, body ) {

		// on non-mobile, if no title passed just hide callout and bail
		if ( !screenIsSmall && !title ) {
			callout.classList.remove( 'visible' );
			return;
		}

		let cappedEmotion = emotion ?
		emotion.charAt( 0 ).toUpperCase() + emotion.slice( 1 ) :
			'The Emotion';

		title = title ? title.replace( /LHAMO/i, emotion ) : null;
		body = body ? body.replace( /LHAMO/i, cappedEmotion ) : null;

		if ( screenIsSmall ) {
			setMobileCaption( title, body );
			return;
		}


		callout.removeAttribute( 'class' );
		callout.classList.add( 'visible' );

		// remove class names on link if link exists, so it's possible to test similarity below
		if ( document.getElementById( "annexLink" ) ) {
			document.getElementById( "annexLink" ).removeAttribute( 'class' );
		}

		callout.querySelector( '.headline' ).innerHTML = title;
		// only replace the innerHTML if the content is different - this is to enable fading on the links in the actions section
		if ( callout.querySelector( '.body' ).innerHTML != body ) {
			callout.querySelector( '.body' ).innerHTML = body;
		}

		if ( emotion ) {
			callout.classList.add( emotion );
			// update class names on link if link exists
			if ( document.getElementById( "annexLink" ) ) {
				document.getElementById( "annexLink" ).className = emotion;
			}
		}

		// update scroller content
		// TODO decide if these should be maintained in parallel or merged somehow.
		var activeScrollerSectionText = $( '.section.active .section-text' )[ 0 ];
		if ( activeScrollerSectionText ) {
			var calloutHeadlineElement = activeScrollerSectionText.querySelector( '.headline' );
			var calloutBodyElement = activeScrollerSectionText.querySelector( '.body' );
			if ( calloutHeadlineElement ) {
				calloutHeadlineElement.innerHTML = title;
			}
			// only replace the innerHTML if the content is different - this is to enable fading on the links in the actions section
			if ( calloutBodyElement && calloutBodyElement.innerHTML != body ) {
				calloutBodyElement.innerHTML = body;
			}
		}

	}

	function setMobileCaption( title, body ) {

		let mobileCaption = document.querySelector( '#mobile-caption' );
		if ( currentSection === sections[ dispatcher.SECTIONS.CALM ] ) {
			// increase height of caption (override stylesheet)
			let newHeight = sassVars.ui[ 'mobile-caption' ][ 'height-tall' ];
			mobileCaption.style.height = newHeight;
		} else {
			// restore height of caption
			// (remove inline style and let stylesheet determine height)
			mobileCaption.style.removeProperty( 'height' );
		}

		// hide mobile caption on More pages
		if ( currentSection === sections[ dispatcher.SECTIONS.MORE ] ) {
			mobileCaption.style.display = 'none';
		} else {
			mobileCaption.style.removeProperty( 'display' );
		}


		updateMobileUI();

		mobileCaption.querySelector( '.headline' ).innerHTML = title || '';
		mobileCaption.querySelector( '.body' ).innerHTML = body || '';

	}

	function onEmotionStateChange( state, selected ) {
		if ( selected ) {
			sections.actions.setState( state );
			sections.states.setBackgroundedState( state );
		} else {
			sections.actions.setHighlightedState( state );
		}
	}

	function onEmotionChange( emotion ) {
		if ( !isNavigating ) {
			dispatcher.navigate( null, emotion );
		}
	}

	function onNavigate( section, emotion ) {

		if ( section === dispatcher.HOME ) {
			document.location.hash = '';
			if ( !document.location.hash ) {
				// If already at root, ensure modal is closed.
				if ( MODAL_ENABLED ) {
					setModalVisibility( false );
				}
			}

			return;
		}

		let parts = [];

		if ( !section ) {
			for ( let key in sections ) {
				if ( sections[ key ] === currentSection ) {
					section = key;
					break;
				}
			}
		}

		if ( !emotion ) {
			// default to the currently-selected emotion
			emotion = currentEmotion;

			// fallback to ANGER for sections that require a selected emotion
			if ( !emotion && (
					section === dispatcher.SECTIONS.STATES ||
					section === dispatcher.SECTIONS.ACTIONS ||
					section === dispatcher.SECTIONS.TRIGGERS ||
					section === dispatcher.SECTIONS.MOODS
				) ) {
				emotion = dispatcher.DEFAULT_EMOTION;
			}
		}

		if ( section ) parts.push( section );
		if ( emotion ) parts.push( emotion );

		document.location.hash = parts.join( dispatcher.HASH_DELIMITER );

	}

	function coerceEmotionFromHash( hash, defaults = NAVIGATION_DEFAULTS ) {
		if ( dispatcher.validateEmotion( hash.emotion ) ) {
			return hash.emotion;
		} else if ( defaults && defaults.emotion ) {
			return defaults.emotion;
		}

		// continents section supports an utter lack of emotion.
		return null;
	}

	function coerceMoreFromHash( hash ) {
		return dispatcher.validateMorePage( hash.emotion ) ? hash.emotion : null;
	}

	function coerceSectionFromHash( hash, defaults = NAVIGATION_DEFAULTS ) {
		if ( dispatcher.validateSection( hash.section ) ) {
			return hash.section;
		} else if ( defaults && defaults.section ) {
			return defaults.section;
		}

		return null;
	}

	function onHashChange( event, defaults = NAVIGATION_DEFAULTS ) {

		if ( currentSection ) {
			// if a section has already been selected this session, close the intro modal
			if ( MODAL_ENABLED ) {
				setModalVisibility( false );
			}
		}

		let hash = document.location.hash.replace( /^#/, '' );
		hash = parseHash( hash );

		const section = coerceSectionFromHash( hash );
		const moreName = coerceMoreFromHash( hash );
		const emotion = (moreName) ? null : coerceEmotionFromHash( hash );

		if ( section !== 'more' ) {
			previousNonSecondaryHash = { section, emotion };
		}

		// set flag after setting modal visibility,
		// prior to setting emotion and section
		isNavigating = true;

		let previousEmotion = currentEmotion;
		let previousMorePage = currentMorePage;
		currentMorePage = null;

		if ( moreName ) {
			setMore( moreName );
		} else {
			setEmotion( emotion );

			//if ( section === dispatcher.SECTIONS.CONTINENTS ) {
			//	setScrollbarOpen( !!emotion );
			//}
		}

		setSection( section, previousEmotion, previousMorePage );

		// Track hash changes in Google Analytics as virtual pageviews
		// https://developers.google.com/analytics/devguides/collection/analyticsjs/single-page-applications#tracking_virtual_pageviews
		window.ga( 'set', 'page', document.location.pathname + document.location.search + document.location.hash );
		window.ga( 'send', 'pageview' );
		/*
		 window.ga('send', 'pageview', {
		 'page': location.pathname + location.search  + location.hash
		 });
		 */
	}

	function parseHash( hash ) {

		if ( !hash ) {
			hash = '';
		}
		let hashValues = hash.split( dispatcher.HASH_DELIMITER );
		return {
			section: hashValues[ 0 ],
			emotion: hashValues[ 1 ]
		};

	}

	/**
	 * If viewport is below minimum screen size,
	 * render small screen warning and return true.
	 * TODO: pull in this text from elsewhere instead of hardcoding.
	 */
	function adjustForScreenSize() {

		// screens that have lower pixel ratios or larger (than iPad's 1024x768) resolutions are probably desktops,
		// so don't go to mobile mode in this case.
		// const probablyDesktop = (window.devicePixelRatio < 1.5 || !window.devicePixelRatio) || window.screen.width > 1024;
		// console.info("probablyDesktop:", probablyDesktop);
		// commented out because small viewports, whether on desktop or mobile devices, work better in mobile mode,
		// and failing to detect correctly risks serving the wrong content on the wrong devices.
		// IOW, leave well enough alone.

		if ( bypassedWarning || /*probablyDesktop || */(window.innerWidth >= MIN_ALLOWED_WIDTH && window.innerHeight >= MIN_ALLOWED_HEIGHT) ) {

			if ( MOBILE_ENABLED ) {

				nonMobileElements.forEach( el => el.style.removeProperty( 'display' ) );
				mobileElements.forEach( el => el.style.display = 'none' );
				document.querySelector( 'body' ).classList.remove( 'small-screen' );

			} else {

				document.querySelector( 'body' ).classList.remove( 'small-screen-warning' );
				document.querySelector( '#warning' ).innerHTML = '';
				document.querySelector( '#app-container' ).classList.remove( "hidden" );

			}

			// allow resetting this flag regardless of targeting mobile or desktop
			screenIsSmall = false;

		} else {

			if ( MOBILE_ENABLED ) {

				nonMobileElements.forEach( el => el.style.display = 'none' );
				mobileElements.forEach( el => el.style.removeProperty( 'display' ) );
				document.querySelector( 'body' ).classList.add( 'small-screen' );

				// only ever set this flag when targeting mobile
				screenIsSmall = true;

			} else {

				document.querySelector( 'body' ).classList.add( 'small-screen-warning' );

				let warningDiv = document.createElement( 'div' );
				warningDiv.classList.add( 'warning-container' );

				let warningHeader = document.createElement( 'h3' );
				warningHeader.innerHTML = 'ATLAS OF EMOTIONS';
				warningDiv.appendChild( warningHeader );

				let warningBody = document.createElement( 'p' );
				warningBody.innerHTML = 'For the best experience, please enlarge your browser, switch to landscape orientation, or view on a larger device. Or, <a href="#" class="bypass-warning">click here</a> to proceed anyway.';
				warningDiv.appendChild( warningBody );

				// TODO: how to not blow away content for bots?
				document.querySelector( '#warning' ).innerHTML = '';
				document.querySelector( '#warning' ).appendChild( warningDiv );
				document.querySelector( '#app-container' ).classList.add( "hidden" );

				document.querySelector( '.bypass-warning' ).addEventListener( 'click', event => {
					bypassedWarning = true;
					onResize();
				} );

			}

		}

		// set up appStrings
		appStrings( getLanguagePref(), screenIsSmall );

		return screenIsSmall;

	}

	/**
	 * Get language preference for viewer.
	 * This does not necessarily return the same value as appStrings().lang(),
	 * which returns the language currently being displayed.
	 *
	 * Checks `localStorage`, then NavigatorLanguage.
	 * If no lang found, or lang is not implemented by the application
	 * (as keyed in stringsConfig.json), falls back to default of 'en'.
	 */
	function getLanguagePref() {

		// check localStorage for previously-set pref
		let lang = localStorage.lang;

		// check window.navigator
		if ( !lang ) lang = navigator.languages ?
			navigator.languages[ 0 ] : (navigator.language || navigator.userLanguage);

		// if lang not present in stringsConfig.json, skip it
		if ( lang && !getActiveLanguages().find( f => f.lang === lang ) ) lang = null;

		// default to 'en'
		if ( !lang ) lang = 'en';

		// only support major languages
		lang = lang.slice( 0, 2 );

		return lang;

	}

	/**
	 * Set language pref for viewer to localStorage,
	 * and refresh the page with the new language.
	 */
	function setLanguage( lang ) {

		// set lang in localStorage, refresh
		localStorage.setItem( 'lang', lang );
		document.location.reload();

	}

	init( ...initArgs );

};
