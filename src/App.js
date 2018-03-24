import _ from 'lodash';
import scroller from './scroller.js';
import timeline from './timeline/timeline.js';
import dispatcher from './dispatcher.js';
import moreInfo from './moreInfo.js';
import continents from './continents.js';
import states from './states.js';
import actions from './actions.js';
import calm from './calm.js';
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

		NAVIGATION_DEFAULTS = {
			section: dispatcher.SECTIONS.CALM,
			emotion: null
		};


	let containers = {},
		sections = {},

		currentSection = null,
		currentEmotion = null,
		currentMorePage = null,
		previousNonSecondaryHash = {
			section: 'continents',
			emotion: null
		},

		screenIsSmall = false,

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
				initLanguageSelector();
				initScroller();


				// unhide content rendered for bots
				document.querySelector( 'body' ).style.removeProperty( 'visibility' );

				// navigation events
				dispatcher.addListener( dispatcher.EVENTS.NAVIGATE, onNavigate );
				dispatcher.addListener( dispatcher.EVENTS.CHANGE_EMOTION_STATE, onEmotionStateChange );
				dispatcher.addListener( dispatcher.EVENTS.CHANGE_EMOTION, onEmotionChange );
				dispatcher.addListener( dispatcher.EVENTS.CHANGE_SECTION_TEXT, onSectionTextChange );
				dispatcher.addListener( dispatcher.EVENTS.POPUP_CHANGE, onPopupChange );

				// other events
				dispatcher.addListener( dispatcher.EVENTS.SECTION_GRAPHICS_RESIZE, onSectionGraphicsResized );
				dispatcher.addListener( dispatcher.EVENTS.SECTION_TEXT_MAXIMIZE_START, onSectionTextMaximizeStart );
				dispatcher.addListener( dispatcher.EVENTS.SECTION_TEXT_MAXIMIZE_COMPLETE, onSectionTextMaximizeComplete );
				dispatcher.addListener( dispatcher.EVENTS.SECTION_TEXT_MINIMIZE_START, onSectionTextMinimizeStart );
				dispatcher.addListener( dispatcher.EVENTS.SECTION_TEXT_MINIMIZE_COMPLETE, onSectionTextMinimizeComplete );
				dispatcher.addListener( dispatcher.EVENTS.MAXIMIZE_SECTION_TEXT, onMaximizeSectionText );
				dispatcher.addListener( dispatcher.EVENTS.MINIMIZE_SECTION_TEXT, onMinimizeSectionText );
				dispatcher.addListener( dispatcher.EVENTS.ALLOW_MORE_CONTENT, onAllowMoreContent );

				window.addEventListener( 'hashchange', onHashChange );

				onResize();
				onHashChange();

				// debounce after initial call
				//onResize = _.debounce( onResize, 250 );
				window.addEventListener( 'resize', onResize );

			} );

	}

	function initScroller() {
		scroller.init.bind( scroller )( null, screenIsSmall );
	}

	function initTemplate() {

		_.templateSettings = {
			evaluate: /\{\{#([\s\S]+?)\}\}/g,            // {{# console.log("blah") }}
			interpolate: /\{\{[^#\{]([\s\S]+?)[^\}]\}\}/g,  // {{ title }}
			escape: /\{\{\{([\s\S]+?)\}\}\}/g,         // {{{ title }}}
		};

		let templateElements = [].slice.call( document.querySelectorAll( '[data-template]' ) );


		templateElements.forEach( function ( element ) {
			let isDerived = element.dataset.template.match( /(derived)/ ) != null,
				prefix = isDerived ? '' : 'emotionsData.',
				data = appStrings().getStr( prefix + element.dataset.template ),
				compiled = _.template( element.innerHTML );
			element.innerHTML = compiled( data );
		} );

		let widowFixElements = [].slice.call( document.querySelectorAll( '[data-widow-fix]' ) );
		widowFixElements.forEach( function ( element ) {
			var words = element.innerHTML.trim().split( ' ' );
			if ( words.length > 2 ) {
				words[ words.length - 2 ] += "&nbsp;" + words[ words.length - 1 ];
				words.pop();
				element.innerHTML = words.join( ' ' );
			}
		} );


	}

	function initContainers() {

		let mainEl = document.querySelector( '#main' ),
			containerEl;
		_.values( dispatcher.SECTIONS ).forEach( sectionName => {
			if ( sectionName == 'timeline' ) { //FIXME do this better?
				containers[ sectionName ] = document.getElementById( 'timeline-graphics' );
			} else {
				containerEl = document.createElement( 'div' );
				containerEl.id = sectionName;
				mainEl.appendChild( containerEl );
				containers[ sectionName ] = containerEl;
			}
		} );

	}

	function initSections() {

		sections.continents = continents;
		sections.states = states;
		sections.actions = actions;
		sections.timeline = timeline;
		sections.calm = calm;

		// use this without a container, so the info
		// can be spread out across sections
		moreInfo.init( null, screenIsSmall );

	}

	function initLanguageSelector() {

		if ( !languageSelectorIsEnabled() ) return;

		document.querySelector( '#lang-selector' ).classList.add( 'enabled' );

		let dropdown = document.querySelector( '#lang-selector .dropdown' ),
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

	function setSectionEmotion( section, previousEmotion, previousMorePage ) {


		let promise = section.setEmotion( currentEmotion, previousEmotion, currentMorePage, previousMorePage );
		//updateArrowLabels();

		promise.then( () => {
			isNavigating = false;
			//updateArrowLabels();
		} );

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

		let backgroundSections = section.backgroundSections || [];

		if ( !previousSection ) {

			// this is the first section opened in this session

			// update down arrow
			//fadeArrowOutAndIn( sectionName );

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
				introModalIsOpen: false //getIntroModalOpenState()
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
				//fadeArrowOutAndIn( sectionName );

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

		currentSection = section;

	}

	function setEmotion( emotion ) {

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

		if ( containers[ sectionName ] ) {
			// turn on display so width/height can be calculated
			let currentDisplay = containers[ sectionName ].style.display;
			containers[ sectionName ].removeAttribute( 'style' );
			section.init( containers[ sectionName ], screenIsSmall );

			// set display back to where it was
			if ( currentDisplay ) {
				containers[ sectionName ].style.display = currentDisplay;
			}
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

		// size main container to viewport
		if ( !screenIsSmall ) {
			let headerHeight = screenIsSmall ? sassVars.ui.header[ 'height-small' ] : sassVars.ui.header.height;
			document.getElementById( 'main' ).style.height = (window.innerHeight - headerHeight) + 'px';
		}

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

	function onLangMenuClick( event ) {

		if ( event ) event.stopPropagation();

		let dropdown = document.querySelector( '#lang-selector .dropdown' ),
			classList = dropdown.classList;

		//closeMenus( dropdown );
		classList.toggle( 'open' );

		if ( classList.contains( 'open' ) ) {
			dropdown.addEventListener( 'click', onLangMenuItemClick );
		} else {
			dropdown.removeEventListener( 'click', onLangMenuItemClick );
		}

		//menuBackgroundClick();

	}

	function onLangMenuItemClick( event ) {

		event.stopImmediatePropagation();

		if ( !event.target || event.target.nodeName.toLowerCase() !== 'li' ) {
			return;
		}

		document.querySelector( '#lang-selector .dropdown' ).classList.remove( 'open' );

		let lang = event.target.dataset.lang;
		if ( !lang ) return;

		setLanguage( lang );

	}


	function onSectionGraphicsResized() {

		//if ( currentSection == sections.timeline ) {
		currentSection.onResize( screenIsSmall );
		//	}

	}

	function onSectionTextMaximizeStart( duration ) {

		if ( currentSection == sections.timeline ) {
			sections.timeline.onSectionTextMaximizeStart( duration );
		}

	}

	function onSectionTextMaximizeComplete() {

		if ( currentSection == sections.timeline ) {
			sections.timeline.onSectionTextMaximizeComplete();
		}

	}

	function onSectionTextMinimizeStart( duration ) {

		if ( currentSection == sections.timeline ) {
			sections.timeline.onSectionTextMinimizeStart( duration );
		}

	}

	function onSectionTextMinimizeComplete() {

		if ( currentSection == sections.timeline ) {
			sections.timeline.onSectionTextMinimizeComplete();
		}

	}

	function onMaximizeSectionText() {
		scroller.maximizeSectionText();
	}

	function onMinimizeSectionText() {
		scroller.minimizeSectionText();
	}

	function onAllowMoreContent( allow, section ) {

		scroller.allowMoreContent( allow, section );

	}

	function onPopupChange( section, emotionState, desc, secondaryData ) {

		if ( screenIsSmall && emotionState ) {
			onSectionTextChange( currentEmotion, emotionState, desc );
			return;
		}

		if ( !section ) {
			popupManager.manage();
		} else {
			if ( emotionState !== popupManager.currentName ||
				(emotionState && !popupManager.exists( section, emotionState )) ) {
				popupManager.manage( section, emotionState, desc, secondaryData );
			}
		}
	}

	function onSectionTextChange( emotion, title, body ) {

		// on non-mobile, if no title passed just hide callout and bail
		if ( !screenIsSmall && !title ) {
			//callout.classList.remove( 'visible' );
			return;
		}

		let cappedEmotion = emotion ? emotion.charAt( 0 ).toUpperCase() + emotion.slice( 1 ) : 'The Emotion';

		title = title ? title.replace( /LHAMO/gi, emotion ) : null;
		body = body ? body.replace( /LHAMO/gi, cappedEmotion ) : null;


		// update scroller content
		let activeScrollerSectionText = $( '.section.active .section-text' )[ 0 ];
		if ( activeScrollerSectionText ) {
			let sectionHeadlineElement = activeScrollerSectionText.querySelector( '.headline' );
			let sectionBodyElement = activeScrollerSectionText.querySelector( '.body' );
			if ( sectionHeadlineElement ) {
				sectionHeadlineElement.innerHTML = title;
			}
			// only replace the innerHTML if the content is different - this is to enable fading on the links in the actions section
			if ( sectionBodyElement && sectionBodyElement.innerHTML != body ) {
				sectionBodyElement.innerHTML = body;
			}
		}

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
					section === dispatcher.SECTIONS.TIMELINE
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

	function coerceSectionFromHash( hash, defaults = NAVIGATION_DEFAULTS ) {
		if ( dispatcher.validateSection( hash.section ) ) {
			return hash.section;
		} else if ( defaults && defaults.section ) {
			return defaults.section;
		}

		return null;
	}

	function onHashChange( event, defaults = NAVIGATION_DEFAULTS ) {

		let hash = document.location.hash.replace( /^#/, '' );
		hash = parseHash( hash );

		const section = coerceSectionFromHash( hash );

		const emotion = coerceEmotionFromHash( hash );

		previousNonSecondaryHash = { section, emotion };

		// set flag after setting modal visibility,
		// prior to setting emotion and section
		isNavigating = true;

		let previousEmotion = currentEmotion;

		setEmotion( emotion );

		setSection( section, previousEmotion, null );

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

			//if ( MOBILE_ENABLED ) {

			//nonMobileElements.forEach( el => el.style.removeProperty( 'display' ) );
			//mobileElements.forEach( el => el.style.display = 'none' );
			document.querySelector( 'body' ).classList.remove( 'small-screen' );

			//} else {
			//
			//	document.querySelector( 'body' ).classList.remove( 'small-screen-warning' );
			//	document.querySelector( '#warning' ).innerHTML = '';
			//	document.querySelector( '#app-container' ).classList.remove( "hidden" );
			//
			//}

			// allow resetting this flag regardless of targeting mobile or desktop
			screenIsSmall = false;

		} else {

			document.querySelector( 'body' ).classList.add( 'small-screen' );

			// only ever set this flag when targeting mobile
			screenIsSmall = true;

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
