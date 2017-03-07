import dispatcher from './dispatcher.js';
//TODO do we really need max or just lite? Shoud we replace tween.js in other files?
import { TweenMax, TimelineMax } from "gsap";


const scroller = {

	SLIDE_INTERVAL_DELAY: 7000,

	ATLAS_TO_FULLPAGE_SECTIONS: {
		'introduction': 'introduction',
		'timeline': 'timeline', //FIXME fake atlas section prompts default
		'actions': 'response',
		'continents': 'experience',
		'states': 'experience',
		'triggers': 'timeline',
	},

	FULLPAGE_TO_ATLAS_SECTIONS: {
		'introduction': 'introduction', //FIXME fake atlas section prompts default
		'timeline': 'timeline', //FIXME fake atlas section prompts default
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
	anchors: [],

	hasEmotionState: ( anchor ) => {
		var section = $( '#' + anchor + '-section' );
		return section.attr( 'data-has-emotion-state' );
	},

	advanceSlide: () => {
		$.fn.fullpage.moveSlideRight();
	},

	initSlideInterval: () => {
		clearInterval( this.slideInterval );
		this.slideInterval = setInterval( this.advanceSlide, this.SLIDE_INTERVAL_DELAY );
	},

	hideAllMoreContent: () => {
		//var $sections = $( '.section' );
		this.$sections.removeClass( 'more-visible' );
		$( 'body' ).removeClass( 'more-visible' );
		$.fn.fullpage.setAllowScrolling( true );
	},

	hashChange: () => {

		//todo integrate this properly with App.js and use d3
		let hash = document.location.hash.replace( /^#/, '' ).split( dispatcher.HASH_DELIMITER );

		if ( hash[ 0 ] && hash[ 0 ].match( /(states)|(actions)/ ) != null ) {
			$( '.emotion-nav' ).addClass( 'visible' );
			var $links = $( '.emotion-nav a[href!="#continents"]' );
			$links.each( function ( index, element ) {
				var newHash = $( element ).attr( 'href' ).replace( /^#.+\//, '#' + hash[ 0 ] + '/' );
				$( element ).attr( 'href', newHash );
				$( element ).toggleClass( 'active', $( element ).attr( 'href' ).indexOf( hash[ 1 ] ) >= 0 );
			} );
		} else {
			$( '.emotion-nav' ).removeClass( 'visible' );
		}

		//update scroller
		$.fn.fullpage.moveTo( this.ATLAS_TO_FULLPAGE_SECTIONS[ hash[ 0 ] ], hash[ 1 ] ? hash[ 1 ] : null );

	},


	topOverscroll: ( e ) => {
		var distanceFromTop = e.currentTarget.scrollTop;
		return (distanceFromTop == 0 && e.deltaY > 0);
	},

	bottomOverscroll: ( e ) => {
		var distanceFromBottom =
			(e.currentTarget.scrollHeight - e.currentTarget.scrollTop) - e.currentTarget.offsetHeight;
		return (distanceFromBottom == 0 && e.deltaY < 0);
	},

	getBounceCallback: ( overscrollFunction ) => {

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
					TweenMax.to( $(
						'.more-content>.close-button' ),
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

	onSectionLeave: ( index, nextIndex, direction ) => {

		var _self = this; //callback must be bound to the scroller class

		var anchorLink = this.anchors[ nextIndex - 1 ];
		var loadedSection = $( anchorLink + '-section' );
		var sectionId = loadedSection[ 0 ].id;

		//hide the about text if leaving the intro
		if ( sectionId == 'introduction-section' ) {
			$( '.introduction-hero' ).removeClass( 'about-visible' );
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

	afterSectionLoad: ( anchorLink, index ) => {

		var _self = this; //callback must be bound to the scroller class

		var loadedSection = $( anchorLink + '-section' );
		var sectionId = loadedSection[ 0 ].id;

		if ( sectionId == 'introduction-section' && !introTimeline ) {

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
			this.$topNav.removeClass( 'visible' );
			this.introTimeline.play();
		} else {
			this.$topNav.addClass( 'visible' );
			this.introTimeline.pause();
			this.introTimeline.seek( 'end' );
		}

		//update topnav
		this.$topNavLinks.each( function ( index, element ) {
			$element = $( element );
			var id = $element.attr( 'id' );
			if ( id.indexOf( anchorLink ) >= 0 ) {
				$element.addClass( 'active' );
			} else {
				$element.removeClass( 'active' );
			}
		} );

	},

	init: ()=> {

		$( '#introduction' ).attr( 'data-centered', true );

		this.$topNav = $( '.top-nav' );
		this.$topNavLinks = this.$topNav.find( 'a' );

		this.$sections = $( '.section' );

		this.anchors = this.$sections.map( function () {
			return this.id.split( '-' )[ 0 ]; //'this' refers to element scope
		} ).get();

		$( '.page-body' ).fullpage( {
			anchors: this.anchors,
			lockAnchors: true,
			menu: "#menu-list",
			autoScrolling: true,
			offsetSections: false,
			verticalCentered: true,
			controlArrows: false,
			slidesNavigation: true,
			slidesNavPosition: 'top',

			//offsetSectionsKey: 'YXRsYXNvZmVtb3Rpb25zLm9yZ181VUdiMlptYzJWMFUyVmpkR2x2Ym5NPVV6Vw==',

			onLeave: this.onSectionLeave.bind( this ),

			afterLoad: this.afterSectionLoad.bind( this )

		} );

		// show state navigation when the hash changes to states
		window.addEventListener( 'hashchange', this.hashChange.bind( this ) );

		//call hashChange on load to update fullpage section
		this.hashChange();

		// add click for about the atlas, in the intro
		$( '.about-link' ).click( function ( e ) {
			e.preventDefault();
			$( '.introduction-hero' ).toggleClass( 'about-visible' );
		} );

		// show additional content in the sections
		$( '.more-link, .close-button' ).click( function ( e ) {
			e.preventDefault();
			var $section = $( this ).parents( '.section' );
			$section.toggleClass( 'more-visible' );
			$( 'body' ).toggleClass( 'more-visible' );
			$.fn.fullpage.setAllowScrolling( !$section.hasClass( 'more-visible' ) );
		} );


		// pulse close button on 'more' when scrolled past end of more content
		var $scroller = $( '.scroller' );
		$scroller.mousewheel( this.getBounceCallback( this.bottomOverscroll ) );
		$scroller.mousewheel( this.getBounceCallback( this.topOverscroll ) );

	}

};

export default scroller;