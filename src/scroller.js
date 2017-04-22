import { TweenMax, TimelineMax } from "gsap";

import dispatcher from './dispatcher.js';
import moreInfo from './moreInfo.js';

//TODO do we really need max or just lite? Should we replace tween.js in other files?

const scroller = {

	SLIDE_INTERVAL_DELAY: 7000,
	ABOUT_IMAGE_INTERVAL_DELAY: 7,

	ATLAS_TO_FULLPAGE_SECTIONS: {
		'introduction': 'introduction',
		//'timeline': 'timeline', //FIXME fake atlas section prompts default
		'actions': 'response',
		'continents': 'experience',
		'states': 'experience',
		'triggers': 'timeline',
		'reading': 'reading' //FIXME fake atlas section prompts default
	},

	FULLPAGE_TO_ATLAS_SECTIONS: {
		'introduction': 'introduction', //FIXME fake atlas section prompts default
		'timeline': 'triggers', //FIXME fake atlas section prompts default
		'experience': 'continents',
		'response': 'actions',
		'reading': 'reading' //FIXME fake atlas section prompts default
	},

	headerHeight: 55,
	selectedEmotionState: '',
	slideInterval: null,
	introTimeline: null,
	$sections: null,
	$topNav: null,
	$topNavLinks: null,
	$hiddenForIntro: null,
	anchors: [],
	fadeImages: false,
	screenIsSmall: false,

	hasEmotionState: function ( anchor ) {
		var section = $( '#' + anchor + '-section' );
		return section.attr( 'data-has-emotion-state' );
	},

	advanceSlide: function () {
		$.fn.fullpage.moveSlideRight();
	},

	initSlideInterval: function () {
		clearInterval( this.slideInterval );
		this.slideInterval = setInterval( this.advanceSlide, this.SLIDE_INTERVAL_DELAY );
	},

	hideAllMoreContent: function () {
		//var $sections = $( '.section' );
		this.$sections.removeClass( 'more-visible' );
		$( 'body' ).removeClass( 'more-visible' );
		if ( !this.screenIsSmall ) {
			$.fn.fullpage.setAllowScrolling( true );
		}
	},

	toggleEmotionNav: function ( visible ) {
		$( '.emotion-nav' ).toggleClass( 'visible', visible );
	},

	pulseEmotionNav: function () { //TODO should this have an event in the dispatcher?
		var $links = $( '.emotion-nav li' );
		var pulseTimeline = new TimelineMax();
		pulseTimeline
			.add( 'start' )
			.staggerTo( $links, 0.1, { css: { 'transform': 'scale(1.1)' } }, 0.1 )
			.staggerTo( $links, 0.1, { css: { 'transform': 'scale(1)' } }, 0.1, 'start+=0.2' );
	},

	resetEmotionNav: function () {
		var $links = $( '.emotion-nav li' );
		$links.removeAttr( 'style' );
	},

	initEmotionNav: function () {
		let links = [].slice.call( $( '.emotion-nav a[href!="#continents"]' ) );
		for ( let element of links ) {
			element.addEventListener( 'click', ( e )=> {
				e.preventDefault();
				let emotion = e.currentTarget.getAttribute( 'data-emotion' );
				dispatcher.setEmotion( emotion );
			} );
		}
	},

	hashChange: function () {

		let hash = document.location.hash.replace( /^#/, '' ).split( dispatcher.HASH_DELIMITER );
		let section = hash[ 0 ];
		var emotion = hash[ 1 ] != '' ? hash[ 1 ] : dispatcher.DEFAULT_EMOTION;

		if ( section && section.match( /(states)|(actions)|(triggers)/ ) != null ) {
			this.toggleEmotionNav( true );
		} else {
			this.toggleEmotionNav( false );
		}

		//update scroller
		$.fn.fullpage.moveTo( this.ATLAS_TO_FULLPAGE_SECTIONS[ section ], hash[ 1 ] ? hash[ 1 ] : null );

		//update emotion nav active states
		let links = [].slice.call( $( '.emotion-nav a[href!="#continents"]' ) );
		for ( let element of links ) {
			element.classList.toggle( 'active', element.getAttribute( 'data-emotion' ) == emotion );
		}

	},

	topOverscroll: function ( e ) {
		var distanceFromTop = e.currentTarget.scrollTop;
		return (distanceFromTop == 0 && e.deltaY > 0);
	},

	bottomOverscroll: function ( e ) {
		var distanceFromBottom =
			(e.currentTarget.scrollHeight - e.currentTarget.scrollTop) - e.currentTarget.offsetHeight;
		return (distanceFromBottom == 0 && e.deltaY < 0);
	},

	getBounceCallback: function ( overscrollFunction ) {

		var scrollingEnded = true;
		var pulseActive = false;
		var lastOverscrollEventTime = 0;
		var growTime = 0.1;
		var returnTime = 0.5;

		return function ( e ) {

			var now = (new Date()).getTime();
			var overScroll = overscrollFunction( e );

			if ( overScroll ) {
				var timeElapsed = now - lastOverscrollEventTime;
				scrollingEnded = timeElapsed > 500;

				if ( !pulseActive && scrollingEnded ) {
					pulseActive = true;
					TweenMax.to( $( '.more-content>.close-button' ),
						growTime,
						{
							scale: 1.5,
							onComplete: function () {
								TweenMax.to(
									$( '.more-content>.close-button' ),
									returnTime,
									{
										scale: 1
									}
								);
							}
						} );
					TweenMax.delayedCall( growTime + returnTime, function () {
						pulseActive = false;
					} );
				}

				lastOverscrollEventTime = now;
			}
		};
	},

	getLoadedSection: function ( anchorLink ) {
		return $( '#' + anchorLink + '-section' );
	},

	onSectionLeave: function ( index, nextIndex, direction ) {

		var _self = this; //callback must be bound to the scroller class

		var anchorLink = this.anchors[ nextIndex - 1 ];
		var loadedSection = this.getLoadedSection( anchorLink );
		var sectionId = loadedSection[ 0 ].id;

		//hide the about text if leaving the intro
		if ( sectionId == 'introduction-section' ) {
			this.toggleAboutSection( false );
		}

		//save the emotion state before leaving
		var hash = window.location.hash.replace( /^#/, '' ).split( dispatcher.HASH_DELIMITER );
		var atlasSection = hash[ 0 ];
		var emotion = hash[ 1 ];
		if ( this.hasEmotionState( anchorLink ) && emotion ) {
			this.selectedEmotionState = emotion;
		}

		//hide the more-content areas in all sections
		this.hideAllMoreContent();

		//if the hash is not correct for the next section, change the hash
		var hashSection = hash[ 0 ];
		if ( this.ATLAS_TO_FULLPAGE_SECTIONS[ atlasSection ] != anchorLink ) {
			//if section has emotion state, set it so the original content can pick it up
			hashSection = this.FULLPAGE_TO_ATLAS_SECTIONS[ anchorLink ];
		}

		//TODO replace with navigation call
		window.location.hash = hashSection + dispatcher.HASH_DELIMITER + this.selectedEmotionState;
	},

	afterSectionLoad: function ( anchorLink, index ) {

		var _self = this; //callback must be bound to the scroller class

		var loadedSection = this.getLoadedSection( anchorLink );
		var sectionId = loadedSection[ 0 ].id;

		if ( sectionId == 'introduction-section' && !this.introTimeline ) {

			//init animations for intro section
			var $intro = $( '#introduction-section' );
			this.introTimeline = new TimelineMax( {} );

			$.fn.fullpage.moveTo( 'introduction', 0 );

			this.introTimeline
				.add( 'start' )
				.fromTo( $intro.find( '.intro-heading' ), 2, {
					autoAlpha: 0,
					ease: Power1.easeOut
				}, { autoAlpha: 1 }, 'start+=1' )
				.fromTo( $intro.find( '.fp-slides, .fp-slidesNav' ), 2, {
					autoAlpha: 0,
					ease: Power1.easeOut
				}, { autoAlpha: 1 } )
				.fromTo( $intro.find( '.cta' ), 2, {
					autoAlpha: 0,
					ease: Power1.easeOut
				}, { autoAlpha: 1 } )
				.addCallback( function () {
					_self.initSlideInterval();
				} )
				.add( 'end' );

			//make slide interface clickable right away
			$( '.fp-slidesNav a' ).click( function ( e ) {
				_self.initSlideInterval();
				$( '.fp-slidesNav a' ).removeClass( 'active' );
				$( this ).addClass( 'active' );
			} );
			$( '.slide-content' ).click( function ( e ) {
				_self.advanceSlide();
				_self.initSlideInterval();
			} );

		}

		//using anchorLink
		if ( anchorLink == 'introduction' ) {
			this.$hiddenForIntro.removeClass( 'visible' );
			this.introTimeline.play();
		} else {
			this.$hiddenForIntro.addClass( 'visible' );
			this.introTimeline.pause();
			this.introTimeline.seek( 'end' );
		}

		//update topnav
		this.$topNavLinks.each( ( index, element ) => {
			var $element = $( element );
			var id = $element.attr( 'id' );
			if ( id.indexOf( anchorLink ) >= 0 ) {
				$element.addClass( 'active' );
			} else {
				$element.removeClass( 'active' );
			}
			if ( this.screenIsSmall ) {
				this.$topNav.removeClass( 'open' );
			}
		} );

	},

	initMoreContentLinks: function () {
		var _self = this;
		// show additional content in the sections
		$( '.more-link, .close-button' ).click( function ( e ) {
			e.preventDefault();
			var $section = $( this ).parents( '.section' );
			$section.toggleClass( 'more-visible' );
			$( 'body' ).toggleClass( 'more-visible' );
			var moreVisible = $section.hasClass( 'more-visible' );
			$.fn.fullpage.setAllowScrolling( !moreVisible );
			//TODO properly hide emotion nav and bring back if section has it
			//_self.toggleEmotionNav( !moreVisible );
		} );
		// pulse close button on 'more' when scrolled past end of more content
		var $moreContentScrollers = $( '.more-content-scroller' );
		$moreContentScrollers.mousewheel( this.getBounceCallback( this.bottomOverscroll ) );
		$moreContentScrollers.mousewheel( this.getBounceCallback( this.topOverscroll ) );

		var moreInfoElements = {};
		var morePageNames = [
			'annex-episode-timeline',
			'annex-partially-charted',
			'annex-traits',
			'annex-signals',
			'annex-psychopathologies',
			'annex-scientific-basis',
			//'annex-impediment-antidote',
			//'annex-intrinsic-remedial'
		];

		morePageNames.forEach( item => {
			moreInfoElements[ item ] = moreInfo.getPageElement( item ).querySelector( '.wrapper' ).cloneNode( true );
			let title = moreInfo.getPageTitle( item );
			$( moreInfoElements[ item ] ).prepend( $( `<h2>${ title }</h2>` ) );
		} );

		$( '#timeline-section' ).find( '.more-content-scroller' ).prepend( moreInfoElements[ 'annex-episode-timeline' ] );
		$( '#experience-section' ).find( '.more-content-scroller' ).prepend( moreInfoElements[ 'annex-signals' ] );
		$( '#experience-section' ).find( '.more-content-scroller' ).prepend( moreInfoElements[ 'annex-partially-charted' ] );
		$( '#experience-section' ).find( '.more-content-scroller' ).prepend( moreInfoElements[ 'annex-scientific-basis' ] );
		$( '#response-section' ).find( '.more-content-scroller' ).prepend( moreInfoElements[ 'annex-psychopathologies' ] );
		$( '#response-section' ).find( '.more-content-scroller' ).prepend( moreInfoElements[ 'annex-traits' ] );


	},

	toggleAboutSection: function ( visibility ) {
		let $hero = $( '.introduction-hero' );
		if ( visibility != null ) {
			$hero.toggleClass( 'about-visible', visibility );
		} else {
			$hero.toggleClass( 'about-visible' );
		}
		if ( $hero.hasClass( 'about-visible' ) ) {
			this.fadeAboutImage( 0 );
		} else {
			this.fadeImages = false;
			this.fadeTweens.forEach( ( tween )=>tween.kill() );
		}
	},

	initAboutLink: function () {
		// add click for about the atlas, in the intro
		$( '.about-link' ).click( ( e ) => {
			e.preventDefault();
			this.toggleAboutSection();
		} );
	},

	fadeAboutImage: function ( i ) {
		let nextIndex = (i + 1) % (this.aboutImages.length);
		if ( !this.fadeImages ) {
			TweenMax.set( this.aboutImages[ i ], { autoAlpha: 1 } );
			TweenMax.set( this.aboutImages[ nextIndex ], { autoAlpha: 0 } );
		}
		this.fadeImages = true;
		this.fadeTweens[ 0 ] = TweenMax.delayedCall( this.ABOUT_IMAGE_INTERVAL_DELAY, ()=> {
			this.fadeTweens[ 1 ] = TweenMax.fromTo( this.aboutImages[ i ], this.ABOUT_IMAGE_INTERVAL_DELAY / 2, { autoAlpha: 1 }, { autoAlpha: 0 } );
			this.fadeTweens[ 2 ] = TweenMax.fromTo( this.aboutImages[ nextIndex ], this.ABOUT_IMAGE_INTERVAL_DELAY / 2, { autoAlpha: 0 }, { autoAlpha: 1 } );
			this.fadeAboutImage( nextIndex );
		} );
	},

	initImageFades: function () {
		this.aboutImages = [].slice.call( $( 'img.fade' ) );
		this.fadeTweens = [];
	},

	initFullpageSections: function () {

		let touchSensitivity = 15;

		this.$sections = $( '.section' );

		this.anchors = this.$sections.map( function () {
			return this.id.split( '-' )[ 0 ]; //'this' refers to element scope
		} ).get();

		let normalScrollElements = '.more-content-scroller, .more-content-overlay';
		if ( this.screenIsSmall ) {
			normalScrollElements += ', .episode-parent, .section-text';
		}

		let $pageBody = $( '.page-body' );

		$pageBody.fullpage( {
			anchors: this.anchors,
			lockAnchors: true,
			menu: "#menu-list",
			autoScrolling: true,
			offsetSections: false,
			verticalCentered: true,
			controlArrows: false,
			slidesNavigation: true,
			slidesNavPosition: 'top',
			//touchSensitivity: 20,

			//offsetSectionsKey: 'YXRsYXNvZmVtb3Rpb25zLm9yZ181VUdiMlptYzJWMFUyVmpkR2x2Ym5NPVV6Vw==',

			onLeave: this.onSectionLeave.bind( this ),

			afterLoad: this.afterSectionLoad.bind( this ),

			touchSensitivity: touchSensitivity,

			normalScrollElementTouchThreshold: 15,

			normalScrollElements: normalScrollElements

		} );

		if ( this.screenIsSmall ) {
			$.fn.fullpage.setAllowScrolling( false );
			//$( 'body, html' ).on( 'scroll, wheel, touchstart, touchmove, touchend', ( e )=> {
			//	console.log( e.currentTarget );
			//	e.preventDefault();
			//} );
			//$( document ).on( 'scroll, wheel, touchstart, touchmove, touchend', ( e )=> {
			//	console.log( e.currentTarget );
			//	e.preventDefault();
			//} );
		}

		let $originalContent = $( '.original-content' );

		// make swipes on original content change the section, and move section text with touches
		let addTouchEffects = ( $elements ) => {

			let swipeStart = 0;
			let swipeComplete = false;
			let distance = 0;
			let height = 0;
			let thresh = 0;

			let returnTranslation = ( element ) => {
				TweenMax.to( element, 0.7, { y: 0 } );
			};
			$elements.on( 'touchstart', ( e ) => {
				height = $( '.section.active' ).height();
				thresh = 0.01 * touchSensitivity * height;

				//if ( !this.screenIsSmall ) {
				swipeStart = e.originalEvent.touches[ 0 ].pageY;
				//} else {
				//	swipeStart = e.originalEvent.touches[ 0 ].pageY - distance;
				//}

				swipeComplete = false;
			} );
			$elements.on( 'touchend', ( e ) => {
				//if ( !this.screenIsSmall ) {
				var $sectionText = $( '.section.active .section-text' );
				returnTranslation( $sectionText[ 0 ] );
				//}
			} );
			$elements.on( 'touchmove', ( e ) => {
				distance = e.originalEvent.touches[ 0 ].pageY - swipeStart;
				if ( !swipeComplete ) {
					var $sectionText = $( '.section.active .section-text' );
					// on tablets, but not mobile, transition section when the user swipes
					//if ( !this.screenIsSmall ) {
					TweenMax.set( $sectionText[ 0 ], { y: distance } );
					if ( Math.abs( distance ) > thresh ) {
						returnTranslation( $sectionText[ 0 ] );
						if ( e.currentTarget == $originalContent[ 0 ] ) {
							if ( distance > 0 ) {
								$.fn.fullpage.moveSectionUp();
							} else {
								$.fn.fullpage.moveSectionDown();
							}
						}
						swipeComplete = true;
					}
					//} else {
					//	// on mobile, just scroll it and stop at bottom
					//	if ( distance < 0 && $sectionText.height() - height / 2 > -1 * distance ) {
					//		TweenMax.set( $sectionText[ 0 ], { y: distance } );
					//	}
					//}
				}

			} );
		};
		if ( !this.screenIsSmall ) {
			addTouchEffects( $originalContent );
			addTouchEffects( this.$sections );
		}

	},

	initTopNav: function () {
		this.$topNav = $( '.top-nav' );
		this.$topNavLinks = this.$topNav.find( 'a' );
		this.$hiddenForIntro = $( '.hidden-for-intro' );
		if ( this.screenIsSmall ) {
			$( '.menu-toggle' ).click( ()=> {
				this.$topNav.toggleClass( 'open' )
			} );
		}
	},

	init: function ( container, screenIsSmall ) {
		//$( '#introduction' ).attr( 'data-centered', true );

		this.screenIsSmall = screenIsSmall;

		this.initTopNav();
		this.initEmotionNav();
		this.initFullpageSections();
		this.initImageFades();

		// respond to hash changes, call hashChange on load to update fullpage section
		window.addEventListener( 'hashchange', this.hashChange.bind( this ) );
		this.hashChange();

		this.initAboutLink();
		this.initMoreContentLinks();
	}

};

export default scroller;