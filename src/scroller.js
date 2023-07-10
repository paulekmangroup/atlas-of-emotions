import { TweenMax, TimelineMax } from "gsap";
import dispatcher from './dispatcher';
import moreInfo from './moreInfo.js';
import timeline from './timeline/timeline';
import sassVars from '../scss/variables.json';
import d3 from 'd3';

//TODO do we really need max or just lite? Should we replace tween.js in other files?

const scroller = {

    SLIDE_INTERVAL_DELAY: 7000,
    ABOUT_IMAGE_INTERVAL_DELAY: 7,

    ATLAS_TO_FULLPAGE_SECTIONS: {
        'introduction': 'introduction',
        'actions': 'response',
        'continents': 'experience',
        'states': 'experience',
        'triggers': 'timeline',
        'links': 'strategies'
    },

    FULLPAGE_TO_ATLAS_SECTIONS: {
        'introduction': 'introduction', //FIXME fake atlas section prompts default
        'timeline': 'triggers', //FIXME fake atlas section prompts default
        'experience': 'continents',
        'response': 'actions',
        'strategies': 'links'
    },

    headerHeight: 55,
    selectedEmotionState: '',
    slideInterval: null,
    introTimeline: null,
    $sections: null,
    sectionTextAnimators: null,
    $topNav: null,
    $topNavLinks: null,
    $hiddenForIntro: null,
    anchors: [],
    currentAnchor: 'introduction',
    fadeImages: false,
    screenIsSmall: false,

    hasEmotionState: function ( anchor ) {
        let section = $( '#' + anchor + '-section' );
        return section.attr( 'data-has-emotion-state' );
    },

    getFullpageSectionId( section ){
        return '#' + this.ATLAS_TO_FULLPAGE_SECTIONS[ section ] + '-section';
    },

    getFullpageAnchorLink( sectionId ){
        return sectionId.match( /(.+)-section/ )[ 1 ];
    },

    advanceSlide: function () {
        $.fn.fullpage.moveSlideRight();
    },

    initSlideInterval: function () {
        clearInterval( this.slideInterval );
        this.slideInterval = setInterval( this.advanceSlide, this.SLIDE_INTERVAL_DELAY );
    },

    hideAllMoreContent: function () {
        //let $sections = $( '.section' );
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
        let $links = $( '.emotion-nav li' );
        let pulseTimeline = new TimelineMax();
        pulseTimeline
            .add( 'start' )
            .staggerTo( $links, 0.1, { css: { 'transform': 'scale(1.1)' } }, 0.1 )
            .staggerTo( $links, 0.1, { css: { 'transform': 'scale(1)' } }, 0.1, 'start+=0.2' );
    },

    resetEmotionNav: function () {
        let $links = $( '.emotion-nav li' );
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

    hashChange: function ( section, emotion ) {

        //let hash = document.location.hash.replace( /^#/, '' ).split( dispatcher.HASH_DELIMITER );
        //let section = hash[ 0 ];
        //let emotion = hash[ 1 ];// != '' ? hash[ 1 ] : dispatcher.DEFAULT_EMOTION;

        if ( section && section.match( /(states)|(actions)|(triggers)/ ) != null ) {
            let state = section.match( /(triggers)/ ) != null ? timeline.emotionNavVisible : true;
            this.toggleEmotionNav( state );
        } else {
            this.toggleEmotionNav( false );
        }

        //update scroller
        $.fn.fullpage.moveTo( this.ATLAS_TO_FULLPAGE_SECTIONS[ section ], emotion ? emotion : null );

        //update emotion nav active states
        let links = [].slice.call( $( '.emotion-nav a[href!="#continents"]' ) );
        for ( let element of links ) {
        	let emoAttr = element.getAttribute( 'data-emotion' );
            d3.select(element).classed( 'active', emoAttr == emotion );
        }

    },

    topOverscroll: function ( e ) {
        let distanceFromTop = e.currentTarget.scrollTop;
        return (distanceFromTop == 0 && e.deltaY > 0);
    },

    bottomOverscroll: function ( e ) {
        let distanceFromBottom =
            (e.currentTarget.scrollHeight - e.currentTarget.scrollTop) - e.currentTarget.offsetHeight;
        return (distanceFromBottom == 0 && e.deltaY < 0);
    },

    getBounceCallback: function ( overscrollFunction ) {

        let scrollingEnded = true;
        let pulseActive = false;
        let lastOverscrollEventTime = 0;
        let growTime = 0.1;
        let returnTime = 0.5;

        return function ( e ) {

            let now = (new Date()).getTime();
            let overScroll = overscrollFunction( e );

            if ( overScroll ) {
                let timeElapsed = now - lastOverscrollEventTime;
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

        let anchorLink = this.anchors[ nextIndex - 1 ];
        let loadedSection = this.getLoadedSection( anchorLink );
        let sectionId = loadedSection[ 0 ].id;

        if ( this.screenIsSmall ) {
            this.minimizeSectionText();
        }

        //hide the about text if leaving the intro
        if ( sectionId == 'introduction-section' ) {
            this.toggleAboutSection( false );
        }

        //save the emotion state before leaving
        let hash = window.location.hash.replace( /^#/, '' ).split( dispatcher.HASH_DELIMITER );
        let currentAtlasSection = hash[ 0 ];
        //let emotion = hash[ 1 ];
        //if ( this.hasEmotionState( anchorLink ) && emotion ) {
        //    this.selectedEmotionState = emotion;
        //}


        //hide the more-content areas in all sections
        this.hideAllMoreContent();

        //if the hash is not correct for the next section, change the hash
        let nextAtlasSection = hash[ 0 ];
        if ( this.ATLAS_TO_FULLPAGE_SECTIONS[ currentAtlasSection ] != anchorLink ) {
            //if section has emotion state, set it so the original content can pick it up
            nextAtlasSection = this.FULLPAGE_TO_ATLAS_SECTIONS[ anchorLink ];
        }

        //TODO replace with navigation call, integrate with app.js properly
        let nextEmotionState = (nextAtlasSection == 'continents') ? '' : this.selectedEmotionState;
        //console.log( 'leave current hash ' + window.location.hash );
        //console.log( 'leave next hash ' + hashSection + dispatcher.HASH_DELIMITER + nextEmotionState );
        if ( currentAtlasSection !== nextAtlasSection ) {
            window.location.hash = nextAtlasSection + dispatcher.HASH_DELIMITER + nextEmotionState;
        }
    },

    afterSectionLoad: function ( anchorLink, index ) {

        let _self = this; //callback must be bound to the scroller class

        let loadedSection = this.getLoadedSection( anchorLink );
        let sectionId = loadedSection[ 0 ].id;

        this.currentAnchor = anchorLink;

        $( '.section-text__scroller' )[ 0 ].scrollTop = 0;
        dispatcher.sectionGraphicsResize();

        if ( sectionId == 'introduction-section' && !this.introTimeline ) {

            //init animations for intro section
            let $intro = $( '#introduction-section' );
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
            if ( this.introTimeline ) {
                this.introTimeline.pause();
                this.introTimeline.seek( 'end' );
            }
        }

        //update topnav
        this.$topNavLinks.each( ( index, element ) => {
            let $element = $( element );
            let id = $element.attr( 'id' );
            if ( id.indexOf( anchorLink ) >= 0 ) {
                $element.addClass( 'active' );
            } else {
                $element.removeClass( 'active' );
            }
            if ( this.screenIsSmall ) {
                this.$topNav.removeClass( 'open' );
            }
        } );

        if ( this.screenIsSmall && anchorLink == 'response' ) {
            setTimeout(
                ()=> {
                    this.resizeActions();
                }, sassVars.states.backgrounded.duration.in * 1000
            );
        }

    },

    sectionGraphicsResize( anchorLink ){
        dispatcher.sectionGraphicsResize();
        if ( this.screenIsSmall && anchorLink == 'response' ) {
            this.resizeActions();
        }
    },

    resizeActions(){
        if ( this.screenIsSmall ) {
            let rect = $( '#states .graph-container.active svg>g' )[ 0 ].getBoundingClientRect();
            $( '#actions .actions-container .graph-container' ).css(
                {
                    top: (rect.bottom - sassVars.ui.header[ 'mobile-nav' ].target.height) + 'px',
                    visibility: 'visible'
                }
            );
        }
    },

    allowMoreContent: function ( allow, section ) {
        let $sectionElement = $( this.getFullpageSectionId( section ) );
        let $link = $sectionElement.find( '.more-link' );
        $link.toggleClass( 'allowed', allow );
    },

    initMoreContentLinks: function () {
        let _self = this;
        // show additional content in the sections
        $( '.more-link, .more-content .close-button' ).click( function ( e ) {
            e.preventDefault();
            let $section = $( this ).parents( '.section' );
            $section.toggleClass( 'more-visible' );
            $( 'body' ).toggleClass( 'more-visible' );
            let moreVisible = $section.hasClass( 'more-visible' );
            $.fn.fullpage.setAllowScrolling( !moreVisible );
            //TODO properly hide emotion nav and bring back if section has it
            //_self.toggleEmotionNav( !moreVisible );
        } );
        // pulse close button on 'more' when scrolled past end of more content
        if ( !this.screenIsSmall ) {
            let $moreContentScrollers = $( '.more-content__scroller' );
            $moreContentScrollers.mousewheel( this.getBounceCallback( this.bottomOverscroll ) );
            $moreContentScrollers.mousewheel( this.getBounceCallback( this.topOverscroll ) );
        }

        let moreInfoElements = {};
        let morePageNames = [
            'annex-episode-timeline',
            'annex-partially-charted',
            'annex-traits',
            'annex-moods',
            'annex-signals',
            'annex-psychopathologies',
            'annex-scientific-basis',
            'annex-intrinsic-remedial',
            'annex-impediment-antidote'
        ];

        morePageNames.forEach( item => {
            moreInfoElements[ item ] = moreInfo.getPageElement( item ).querySelector( '.wrapper' ).cloneNode( true );
            let title = moreInfo.getPageTitle( item );
            $( moreInfoElements[ item ] ).prepend( $( `<h2>${ title }</h2>` ) );
        } );

        let $timelineMoreContent = $( '#timeline-section' ).find( '.more-content__scroller' );
        let $experienceMoreContent = $( '#experience-section' ).find( '.more-content__scroller' );
        let $responseMoreContent = $( '#response-section' ).find( '.more-content__scroller' );

        $timelineMoreContent.prepend( moreInfoElements[ 'annex-episode-timeline' ] );
        $experienceMoreContent.prepend( moreInfoElements[ 'annex-signals' ] );
        $experienceMoreContent.prepend( moreInfoElements[ 'annex-partially-charted' ] );
        $experienceMoreContent.prepend( moreInfoElements[ 'annex-scientific-basis' ] );
        $responseMoreContent.prepend( moreInfoElements[ 'annex-intrinsic-remedial' ] );
        $responseMoreContent.prepend( moreInfoElements[ 'annex-psychopathologies' ] );
        $responseMoreContent.prepend( moreInfoElements[ 'annex-traits' ] );
        $responseMoreContent.prepend( moreInfoElements[ 'annex-moods' ] );
        $( '#strategies-section' ).find( '.more-content__scroller' ).prepend( moreInfoElements[ 'annex-impediment-antidote' ] );

        this.allowMoreContent( true, 'actions' );
        this.allowMoreContent( true, 'continents' );

    },

    toggleAboutSection: function ( visibility ) {
        let $hero = $( '.introduction-hero' );
        let body = $( 'body' );
        if ( visibility != null ) {
            $hero.toggleClass( 'more-visible', visibility );
            body.toggleClass( 'more-visible', visibility );
        } else {
            $hero.toggleClass( 'more-visible' );
            body.toggleClass( 'more-visible' );
        }
        if ( $hero.hasClass( 'more-visible' ) ) {
            this.fadeAboutImage( 0 );
        } else {
            this.stopAboutImageFades();
        }
    },

    initAboutLink: function () {
        // add click for about the atlas, in the intro
        $( '.about-link' ).click( ( e ) => {
            e.preventDefault();
            this.toggleAboutSection();
        } );
    },

    initOptInModal: function () {
        $( '.opt-in-modal__content .close-button' ).click( ( e ) => {
            e.preventDefault();
            this.toggleOptInModal();
        } );
        $( '.opt-in-button' ).click( ( e ) => {
            e.preventDefault();
            this.toggleOptInModal();
        } );
        $( '.opt-in-modal' ).css( 'display', 'none' );
    },

    toggleOptInModal: function () {
        console.log('toggle modal');
        $( '.opt-in-modal' ).fadeToggle( 400 );
    },

    stopAboutImageFades(){
        this.fadeImages = false;
        this.fadeTweens.forEach( ( tween )=>tween.kill() );
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

        this.sectionTextAnimators = {};

        this.anchors = this.$sections.map( function () {
            return this.id.split( '-' )[ 0 ]; //'this' refers to element scope
        } ).get();

        let normalScrollElements = '.more-content, .section-text';
        if ( this.screenIsSmall ) {
            normalScrollElements += ', .episode-parent';
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
            onLeave: this.onSectionLeave.bind( this ),
            afterLoad: this.afterSectionLoad.bind( this ),
            touchSensitivity: touchSensitivity,
            normalScrollElementTouchThreshold: 15,
            normalScrollElements: normalScrollElements
        } );

        if ( this.screenIsSmall ) {
            $.fn.fullpage.setAllowScrolling( false );
        }

        let $originalContent = $( '.original-content' );

        let addDesktopTabletTouchEffects = ( $elements ) => {

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

                swipeStart = e.originalEvent.touches[ 0 ].pageY;

                swipeComplete = false;
            } );
            $elements.on( 'touchend', ( e ) => {
                let $sectionText = $( '.section.active .section-text' );
                returnTranslation( $sectionText[ 0 ] );
            } );
            $elements.on( 'touchmove', ( e ) => {
                distance = e.originalEvent.touches[ 0 ].pageY - swipeStart;
                if ( !swipeComplete ) {
                    let $sectionText = $( '.section.active .section-text' );
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
                }

            } );
        };

        let addMobileTextTouchEffects = ( $element ) => {

            let swipeStart = { x: 0, y: 0 },
                yDistance = 0,
                height = 0,
                thresh = 20,
                minimumDistance = null,
                maximumDistance = 0,
                transitionDuration = 0.5,
                sectionTextMaximized = false,
                sectionTextMaximizing = false,
                sectionTextMinimizing = false,
                $sectionText = null,
                $sectionGraphics = null,
                $sectionTextContent = null,
                $originalContent = $( '.original-content' ),
                $emotionNav = $( '.emotion-nav' ),
                id = $element.parents( '.section' )[ 0 ].id,
                anchorLink = this.getFullpageAnchorLink( id ),
                animator = new SectionTextAnimator();


            this.sectionTextAnimators[ id ] = animator;

            let onTapSectionGraphics = ( e ) => {
                if ( sectionTextMaximized ) {
                    // minimize section text
                    timeline.scrollToCoordinates( e.pageX, e.pageY );
                    minimizeSectionText();
                    e.preventDefault();
                    e.stopPropagation();
                }
            };

            $( '.section .section-graphics' ).on( 'click', onTapSectionGraphics );


            let minimizeSectionText = () => {
                let minimized = (!sectionTextMaximized && !sectionTextMaximizing);
                if ( minimized ) {
                    dispatcher.sectionTextMinimizeComplete();
                }
                if ( minimized || sectionTextMinimizing ) {
                    return;
                }
                sectionTextMinimizing = true;
                $sectionTextContent[ 0 ].scrollTop = 0;
                $sectionTextContent[ 0 ].style.overflowY = 'hidden';
                $sectionTextContent.off( 'scroll' );
                TweenMax.to( [ $sectionText[ 0 ], $emotionNav[ 0 ] ], transitionDuration, {
                    top: minimumDistance,
                    onUpdate: ()=> {
                        this.sectionGraphicsResize( anchorLink );
                    },
                    onComplete: ()=> {
                        sectionTextMaximized = false;
                        sectionTextMinimizing = false;
                        this.sectionGraphicsResize( anchorLink );
                        dispatcher.sectionTextMinimizeComplete();
                    }
                } );
                const emotionNavHeight = this.currentAnchor === 'strategies' ? 0 : sassVars[ 'ui' ][ 'mobile-emotion-nav' ][ 'height' ];
                TweenMax.to( [ $originalContent[ 0 ], $sectionGraphics[ 0 ] ], transitionDuration, { height: minimumDistance - emotionNavHeight - $sectionGraphics[ 0 ].offsetTop } );
                dispatcher.sectionTextMinimizeStart( transitionDuration );
            };

            animator.minimizeSectionText = minimizeSectionText;

            let maximizeSectionText = () => {
                // avoid breaking an existing maximization
                // or maximizing when already maximized
                if ( (sectionTextMaximized && !sectionTextMinimizing) || sectionTextMaximizing ) {
                    dispatcher.sectionTextMaximizeComplete();
                    return;
                }
                // not needed if content is no larger than scroll area when minimized
                if ( $sectionTextContent[ 0 ].scrollHeight <= $sectionTextContent[ 0 ].clientHeight ) {
                    dispatcher.sectionTextMaximizeComplete();
                    return;
                }
                sectionTextMaximizing = true;
                TweenMax.to( [ $sectionText[ 0 ], $emotionNav[ 0 ] ], transitionDuration, {
                    top: maximumDistance,
                    onUpdate: ()=> {
                        this.sectionGraphicsResize( anchorLink );
                    },
                    onComplete: ()=> {
                        sectionTextMaximized = true;
                        sectionTextMaximizing = false;
                        $sectionTextContent[ 0 ].style.overflowY = 'scroll';
                        $sectionTextContent.on( 'scroll', ( e )=> {
                            if ( $sectionTextContent[ 0 ].scrollTop < 0 ) {
                                minimizeSectionText();
                                $sectionTextContent.off( 'scroll' );
                            }
                        } );
                        this.sectionGraphicsResize( anchorLink );
                        dispatcher.sectionTextMaximizeComplete();
                    }
                } );
				const emotionNavHeight = this.currentAnchor === 'strategies' ? 0 : sassVars[ 'ui' ][ 'mobile-emotion-nav' ][ 'height' ];
				TweenMax.to( [ $originalContent[ 0 ], $sectionGraphics[ 0 ] ], transitionDuration, { height: maximumDistance - emotionNavHeight - $sectionGraphics[ 0 ].offsetTop } );
                dispatcher.sectionTextMaximizeStart( transitionDuration );
            };

            animator.maximizeSectionText = maximizeSectionText;

            $element.on( 'touchstart', ( e ) => {
                $sectionText = $( '.section.active .section-text' );
                $sectionGraphics = $( '.section.active .section-graphics' );
                $sectionTextContent = $( '.section.active .section-text__scroller' );
                if ( !minimumDistance ) {
                    minimumDistance = $sectionText[ 0 ].offsetTop;
                }
                height = $( '.section.active' ).height();
                maximumDistance = 0.33 * height;
                thresh = 0;
                swipeStart.y = e.originalEvent.touches[ 0 ].pageY;
                swipeStart.x = e.originalEvent.touches[ 0 ].pageX;
            } );
            $element.on( 'touchend', ( e ) => {
            } );
            $element.on( 'touchmove', ( e ) => {
                let newYDistance = swipeStart.y - e.originalEvent.touches[ 0 ].pageY;
                let newXDistance = swipeStart.x - e.originalEvent.touches[ 0 ].pageX;
                if ( Math.abs( newXDistance ) > Math.abs( newYDistance )
                    || Math.abs( newYDistance ) < thresh ) {
                    return;
                }
                yDistance = newYDistance;
                if ( sectionTextMaximized ) {
                    if ( $sectionTextContent[ 0 ].scrollTop <= 0 && newYDistance < 0 && !sectionTextMinimizing ) {
                        swipeStart.y = e.originalEvent.touches[ 0 ].pageY;
                        minimizeSectionText();
                    }
                } else {
                    if ( newYDistance > 0 && !sectionTextMaximizing ) {
                        swipeStart.y = e.originalEvent.touches[ 0 ].pageY;
                        maximizeSectionText();
                    }
                }
            } );


        };

        let addMobileTimelineGraphicsTouchEffects = () => {
            let $sectionGraphics = $( '#timeline-section .section-graphics' );
            $sectionGraphics.on( 'touchmove', timeline.touchmove.bind( timeline ) );
            $sectionGraphics.on( 'touchstart', timeline.touchstart.bind( timeline ) );
            $sectionGraphics.on( 'touchend', timeline.touchend.bind( timeline ) );
        };

        let addMobileGraphicsTouchEffects = () => {
            // todo fix this
            //dispatcher.on( dispatcher.EVENTS.CHANGE_EMOTION_STATE, this.minimizeSectionText.bind( this ) );
        };

        if ( this.screenIsSmall ) {
            $( '.section-text' ).each( ( e, element )=> {
                addMobileTextTouchEffects( $( element ) );
            } );
            addMobileGraphicsTouchEffects();
            addMobileTimelineGraphicsTouchEffects();
        } else {
            addDesktopTabletTouchEffects( $originalContent );
            addDesktopTabletTouchEffects( this.$sections );
        }

    },

    maximizeSectionText: function () {
        this.sectionTextAnimators[ this.currentAnchor + '-section' ].maximizeSectionText();
    },

    minimizeSectionText: function () {
        if ( this.sectionTextAnimators &&
            this.currentAnchor &&
            this.sectionTextAnimators[ this.currentAnchor + '-section' ] ) {

            this.sectionTextAnimators[ this.currentAnchor + '-section' ].minimizeSectionText();

        }
    },

    initTopNav: function () {
        this.$topNav = $( '.top-nav' );
        this.$topNavLinks = this.$topNav.find( '#menu-list>li>a' );
        this.$hiddenForIntro = $( '.hidden-for-intro' );
        if ( this.screenIsSmall ) {
            this.$topNavLinks.click( ()=> {
                this.$topNav.removeClass( 'open' );
            } );
            //this.$topNav.find( 'li h4' ).click( ()=> {
            //	this.$topNav.removeClass( 'open' )
            //} );
            $( '.menu-toggle' ).click( ()=> {
                this.$topNav.toggleClass( 'open' );
            } );
        }
    },

    showApp(){
        $( '#app-container' ).addClass( 'visible' );
    },

    init: function ( container, screenIsSmall ) {
        //$( '#introduction' ).attr( 'data-centered', true );

        this.screenIsSmall = screenIsSmall;

        this.initTopNav();
        this.initEmotionNav();
        this.initFullpageSections();
        this.initImageFades();

        // respond to hash changes, call hashChange on load to update fullpage section
        //window.addEventListener( 'hashchange', this.hashChange.bind( this ) );
        //this.hashChange();

        this.initAboutLink();
        this.initMoreContentLinks();
        this.initOptInModal();
        this.showApp();
    }

};

class SectionTextAnimator {

    constructor() {

    }

}

export default scroller;
