import _ from 'lodash';
import d3 from 'd3';
import { TweenMax, TimelineMax, Power2, Power1, Elastic, Bounce, Back } from "gsap";

import Continent from '../Continent.js';
import timeline from './timeline.js';
import scroller from '../scroller.js';
import dispatcher from '../dispatcher.js';

export default class Episode {

    setActive( val ) {
        this.isActive = val;
    }

    rewind( onComplete ) {

        this.rewindActive = true;

        this.episodeTimeline.timeScale( 3 );
        this.episodeTimeline.pause();
        if ( this.episodeTimeline.getLabelTime( 'end' ) < this.episodeTimeline.time() ) {
            this.episodeTimeline.seek( 'end', true );
        }
        this.episodeTimeline.tweenTo( 'event-lines', {
            onComplete: () => {
                this.rewindActive = false;
                onComplete();
            },
            ease: Power2.easeOut
        } );
        if ( this.screenIsSmall ) {
            this.scrollSvgToStage( 'trigger' );
        }

    }

    start( animateReplaceContent = false ) {

        //go to start
        this.episodeTimeline.timeScale( 1 );

        if ( this.playFromStart ) {
            this.playFromStart = false;
            this.episodeTimeline.pause( 'event', true );
        } else {
            this.episodeTimeline.pause( 'event-pulse', true );
        }

        //replace content
        this.replaceContent( this.currentEmotion, animateReplaceContent );

        let delay = this.screenIsSmall ? 0 : 0.5;
        TweenMax.delayedCall( delay, () => {
            this.episodeTimeline.play();
        } );

    }

    reset() {
        this.playFromStart = true;
        this.episodeTimeline.timeScale( 1 );
        this.episodeTimeline.pause( 'event', true );
    }

    setEmotion( emotion ) {

        let animateReplaceContent = (this.currentEmotion != emotion) && !this.playFromStart;

        this.currentEmotion = emotion && emotion != '' ? emotion : dispatcher.DEFAULT_EMOTION;

        if ( this.replayEnabled ) {
            if ( this.playFromStart ) {
                TweenMax.delayedCall( 1.5, this.start.bind( this ), [ animateReplaceContent ] );
            } else {
                this.rewind( ()=> {
                    this.start( animateReplaceContent );
                } );
            }
        } else {
            // do not replay animation
            this.replaceContent( this.currentEmotion, false );
        }

    }

    replaceTextContentForKey( key, emotion, animate ) {
        return function ( child, i ) {
            let text = this.content[ emotion ][ key ];
            if ( animate ) {
                TweenMax.to( child.parentNode, 0.25, {
                    autoAlpha: 0, onComplete: () => {
                        child.textContent = text[ Object.keys( text )[ i ] ];
                        TweenMax.to( child.parentNode, 0.25, { autoAlpha: 1 } );
                    }
                } );
            } else {
                child.textContent = text[ Object.keys( text )[ i ] ];
            }
        }.bind( this );
    }

    replaceContent( emotion, animate = false ) {

        let colors = this.configsByEmotion[ emotion ].colorPalette;
        this.stateCircles.forEach( ( circle, i )=> {
            let color = colors[ Math.round( i * (colors.length - 1) / (this.stateCircles.length - 1) ) ];
            circle.setAttribute( 'fill', 'rgb(' + color[ 0 ] + ',' + color[ 1 ] + ',' + color[ 2 ] + ')' );
        } );

        this.statePhraseText.forEach( this.replaceTextContentForKey( 'phrases', 'common', false ) );
        this.stateNameText.forEach( this.replaceTextContentForKey( 'state', emotion, false ) );
        this.responseText.forEach( this.replaceTextContentForKey( 'response', emotion, false ) );
        this.triggerText.forEach( ( child, i )=> {
            let animateText = animate && (child.parentNode.id != 'event-text');
            let replace = this.replaceTextContentForKey( 'trigger', emotion, animateText );
            replace( child, i );
        } );


    }

    initStateCircles() {
        this.stateCircles = [
            timeline.select( '#c1', this.parent ),
            timeline.select( '#c2', this.parent ),
            timeline.select( '#c3', this.parent ),
            timeline.select( '#c4', this.parent ),
            timeline.select( '#c5', this.parent ),
            timeline.select( '#c6', this.parent )
        ];
    }

    addStatePulsation() {
        //pulsate state
        this.stateCircles.forEach( ( circle, i )=> {
            // make the circles overlap as they change size
            let radiusDelta = (this.stateCircles.length - Math.round( i + this.stateCircles.length / 2 ) % this.stateCircles.length) * 4;
            // reduce the effect for the large ones
            radiusDelta *= 1 - ( i / (this.stateCircles.length - 1) );
            // don't pass in a float
            radiusDelta = Math.round( radiusDelta );
            this.episodeTimeline
                .to( circle, 6 - (3 * i / (this.stateCircles.length - 1)), {
                    attr: {
                        rx: '-=' + radiusDelta,
                        ry: '-=' + radiusDelta
                    },
                    repeat: -1,
                    yoyo: true,
                    repeatDelay: 0,
                    ease: Power1.easeInOut
                }, 'pulsate' );
        } );
    }

    addStateEmergence() {
        let minStartingRadius = 0;
        let maxStartingRadius = 20;
        this.stateCircles.forEach( ( circle, i )=> {
            let startingRadius = minStartingRadius + (maxStartingRadius - minStartingRadius) * i / (this.stateCircles.length - 1);
            this.episodeTimeline
                .from( circle, 2, {
                    attr: { rx: startingRadius, ry: startingRadius },
                    autoAlpha: 0,
                    ease: Back.easeOut
                }, 'state' );
        } );
    }

    getParentElement() {
        return this.parent;
    }

    hide( onComplete ) {
        TweenMax.to( this.parent, 1, { autoAlpha: 0 } );
        setTimeout( onComplete, 1000 );
    }

    getStageDOMCenterPoint( stage ) {
        if ( stage == 'trigger' ) {
            let bounds = this.parent.querySelector( '#event' ).getBoundingClientRect();
            return bounds.left + bounds.width / 2;
        }
        if ( stage == 'experience' ) {
            let bounds = this.parent.querySelector( '#state' ).getBoundingClientRect();
            return bounds.left + bounds.width / 2;
        }
        if ( stage == 'response' ) {
            let bounds = this.parent.querySelector( '#responses' ).getBoundingClientRect();
            return bounds.left + bounds.width / 2;
        }
        return null;
    }

    getParentWidth() {
        let bounds = this.parent.getBoundingClientRect();
        return bounds.right - bounds.left;
    }

    getSvgWidth() {
        let wrapperSvg = this.getSvg();
        let bounds = wrapperSvg.getBoundingClientRect();
        return bounds.right - bounds.left;
    }

    getSvg() {
        if ( !this.svg ) {
            this.svg = this.parent.querySelector( 'svg' );
        }
        return this.svg;
    }

    getScrollElements() {
        if ( !this.scrollElements ) {
            this.scrollElements = [
                this.parent.querySelector( 'svg' )
            ];
        }
        return this.scrollElements;
    }

    getSvgScrollPosition() {
        return parseFloat( this.getSvg().style.left );
    }

    setInteractive( interactive ) {
        this.parent.style.pointerEvents = interactive ? 'auto' : 'none';
    }

    getInteractive() {
        return this.parent.style.pointerEvents != 'none';
    }

    beginTouchDeflection() {
        if ( this.getInteractive() ) {
            this.svgScrollPosition = this.getSvgScrollPosition();
        }
    }

    touchDeflect( distance ) {
        if ( this.getInteractive() ) {
            this.touchDeflection = distance;
            TweenMax.set( this.getScrollElements(), { css: { left: this.svgScrollPosition + this.touchDeflection } } );
        }
    }

    returnTouchDeflection() {
        if ( this.getInteractive() ) {
            this.scrollTween = TweenMax.to( this.getScrollElements(), 0.4, { css: { left: this.svgScrollPosition } } );
            this.touchDeflection = 0;
        }
    }

    scrollSvgInDirection( direction ) {
        if ( this.getInteractive() ) {
            let scrollStageIndex = this.scrollStageIndex - direction;
            if ( scrollStageIndex >= 0 && scrollStageIndex < this.scrollStages.length ) {
                this.scrollSvgToStage( this.scrollStages[ scrollStageIndex ], 0.4 );
                this.touchDeflection = 0;
            } else {
                this.returnTouchDeflection();
            }
        }
    }

    computeScrollPositions() {
        this.scrollStagePositions = {};
        this.scrollStages.forEach( ( stage )=> {
            this.scrollStagePositions[ stage ] = -1 * (this.getStageDOMCenterPoint( stage ) - this.parent.offsetWidth / 2);
        } );
    }

    scrollSvgToStage( stage, duration = 0.7 ) {
        let scrollStageIndex = this.scrollStages.indexOf( stage );
        if ( scrollStageIndex >= 0 && scrollStageIndex < this.scrollStages.length ) {
            this.scrollStageIndex = scrollStageIndex;
            if ( this.minimizing || !this.maximized ) {
                // do nothing
            } else {
                // scroll
                this.scrollTween = TweenMax.to( this.getScrollElements(), duration, { css: { left: this.scrollStagePositions[ stage ] } } );
            }
        }
    }

    scrollToCoordinates( x, y ) {
        let stageIndex = Math.trunc( 3 * x / this.getParentWidth() );
        this.scrollSvgToStage( this.scrollStages[ stageIndex ] );
    }

    onResize() {
    }

    minimizeStart( duration ) {
        this.minimizing = true;
        //this.maximizedScrollStageIndex = this.scrollStageIndex;
        //this.maximizedScrollPosition = this.getSvgScrollPosition();
        if ( !this.svgMaximizedWidth ) {
            this.svgMaximizedWidth = this.getSvgWidth();
        }
        this.parent.style.pointerEvents = 'none';
        if ( this.scrollTween && this.scrollTween.totalProgress() < 1 ) { // cancel scroll if in progress
            this.scrollTween.kill();
        }
        TweenMax.fromTo( this.getScrollElements(), duration, {
            css: {
                width: this.svgMaximizedWidth,
                left: this.scrollStagePositions[ this.scrollStages[ this.scrollStageIndex ] ]
            }
        }, {
            css: {
                width: this.getParentWidth(),
                left: 0
            }
        } );
    }

    minimizeComplete() {
        this.minimizing = false;
        this.maximized = false;
    }

    maximizeStart( duration ) {
        TweenMax.fromTo( this.getScrollElements(), duration, {
            css: {
                width: this.getParentWidth(),
                left: 0
            }
        }, {
            css: {
                width: this.svgMaximizedWidth,
                left: this.scrollStagePositions[ this.scrollStages[ this.scrollStageIndex ] ]
            }
        } );
    }

    maximizeComplete() {
        this.parent.style.pointerEvents = 'auto';
        this.maximized = true;
    }

    extractDocument( svgElement, container ) {

        let NS = "http://www.w3.org/2000/svg";

        // pull svg element out of the document and make it self center so that
        // illumination can be animated across it

        let originalWidth = svgElement.getAttribute( "width" ),
            originalHeight = svgElement.getAttribute( 'height' );
        this.originalViewBox = svgElement.getAttribute( 'viewBox' ).split( '' );
        svgElement.setAttribute( 'overflow', 'visible' );
        svgElement.setAttribute( 'width', '100%' );
        svgElement.setAttribute( 'height', '100%' );
        //svgElement.removeAttribute( 'viewBox' );
        //svgElement.setAttribute( 'preserveAspectRatio', 'none' );
        let svgChildrenGroup = svgElement.getElementsByTagName( 'g' )[ 0 ];

        let wrapperSVG = document.createElementNS( NS, 'svg' );
        wrapperSVG.setAttribute( 'x', '50%' );
        wrapperSVG.setAttribute( 'y', '50%' );
        wrapperSVG.setAttribute( 'width', originalWidth );
        wrapperSVG.setAttribute( 'height', originalHeight );
        //wrapperSVG.setAttribute( 'viewBox', originalViewBox );
        wrapperSVG.setAttribute( 'overflow', 'visible' );
        wrapperSVG.appendChild( svgChildrenGroup );

        svgElement.style.backgroundColor = 'transparent';

        let wrapperGroup = document.createElementNS( NS, 'g' );
        wrapperGroup.setAttribute( 'transform', 'translate(' + (-0.5 * parseInt( originalWidth )) + ', ' + (-0.5 * parseInt( originalHeight )) + ')' );
        wrapperGroup.appendChild( wrapperSVG );

        svgElement.appendChild( wrapperGroup );

        let newParentDiv = document.createElement( 'div' );
        newParentDiv.classList.add( 'episode-parent' );
        newParentDiv.classList.add( 'no-inobounce' );
        newParentDiv.appendChild( svgElement );
        container.appendChild( newParentDiv );

        //this.parentScroller = new IScroll( newParentDiv, { scrollX: true, scrollY: false, mouseWheel: true } );

        this.parent = newParentDiv;
        this.getSvg().style.left = 0;
        this.svgMaximizedWidth = this.getSvgWidth();
        this.computeScrollPositions();

        return newParentDiv;

    }

    destroy() {
        this.episodeTimeline.kill();
        //TweenMax.killAll();
        TweenMax.killChildTweensOf( this.parent );
        scroller.resetEmotionNav();
        timeline.remove( this.parent );
        this.episodeTimeline = null;
    }

    constructor( svg, container, emotion, screenIsSmall ) {
        this.screenIsSmall = screenIsSmall;
        this.rewindActive = false;
        this.isActive = false;

        this.configsByEmotion = Continent.configsByEmotion;
        this.currentEmotion = emotion && emotion != '' ? emotion : dispatcher.DEFAULT_EMOTION;

        this.scrollStages = [
            'trigger', 'experience', 'response'
        ];
        this.scrollStageIndex = 0;
        this.svg = null;
        this.maximized = true;
        this.minimizing = false;
        this.replayEnabled = true;

        //fonts need to be added for them to work in svg
        timeline.addFonts( svg ); //TODO move this to timeline
        this.extractDocument( svg, container );

        this.initialize( svg, container, emotion, screenIsSmall );
    }

    initialize( svg, container, emotion, screenIsSmall ) {

        if ( svg ) {

            // pull out just the second of three items in the list for this version of the episode
            this.content = _.mapValues( timeline.episodeContent, function ( value, key ) {
                if ( key === 'common' ) {
                    return value;
                } else {
                    return _.mapValues( value, ( innerValue )=>[ innerValue[ Object.keys( innerValue )[ 1 ] ] ] );
                }
            } );


            TweenMax.allTo( timeline.getChildren( timeline.select( '#state', this.parent ) ), 0, { visibility: 'hidden' } );

            //state
            let state = timeline.select( '#state', this.parent ),
                stateLabel = timeline.select( '#state-label', this.parent );
            let bBox = state.getBBox();
            let center = bBox.x + bBox.width / 2;
            let stateLabelChildren = timeline.getChildren( stateLabel );
            for ( let i = 0; i < stateLabelChildren.length; i++ ) {
                stateLabelChildren[ i ].setAttribute( 'x', center );
                stateLabelChildren[ i ].setAttribute( 'text-anchor', 'middle' );
                if ( i == 1 ) {
                    stateLabelChildren[ i ].style.textTransform = 'uppercase';
                }
            }

            this.initStateCircles();

            //lines
            let eventLines = timeline.select( '#event-lines', this.parent ),
                responseLines = timeline.select( '#response-lines', this.parent );

            //text
            let event = timeline.select( '#event-text', this.parent ),
                responses = timeline.select( '#responses', this.parent ),
                responseChildren = timeline.selectAll('tspan', responses);
            this.triggerText = [
                timeline.select( 'tspan', event ),
            ];

            d3.selectAll( this.triggerText )
                .attr( 'text-anchor', 'middle' )
                .attr( 'x', function () {
                    return parseFloat( this.getComputedTextLength() ) / 2 + parseFloat( this.getAttribute( 'x' ) );
                } );


            this.statePhraseText = [
                stateLabelChildren[ 0 ]
            ];
            this.stateNameText = [
                stateLabelChildren[ 1 ]
            ];

            this.responseText = [
                responseChildren[ 0 ]
            ];

            this.episodeTimeline = new TimelineMax( {} );

            this.playFromStart = true;


            //set up the timeline

            this.episodeTimeline
                //show event
                .add( 'event' )
                .from( event, 0.5, { autoAlpha: 0, ease: Power1.easeOut } )

                .add( 'event-pulse' )
                .to( event, 0.1, {
                    scale: 1.1,
                    transformOrigin: '50% 50%',
                    ease: Power1.easeOut
                } )
                .to( event, 0.2, {
                    scale: 1,
                    transformOrigin: '50% 50%',
                    ease: Power1.easeOut
                } )
                .add( 'event-lines' )
                .from( eventLines, 0.5, { autoAlpha: 0, ease: Power1.easeOut }, 'event-lines' )

                // show emo state
                .add( 'state' )
                .addCallback( ()=> {
                    if ( !this.rewindActive && this.screenIsSmall ) {
                        this.scrollSvgToStage( 'experience' );
                    }
                } );

            this.addStateEmergence();

            this.episodeTimeline
                .from( stateLabel, 2, { autoAlpha: 0, ease: Power1.easeOut }, 'state' )
                .add( 'pulsate' )
                //show response
                .add( 'response-line', '-=1' )
                .from( responseLines, 0.5, { autoAlpha: 0, ease: Power1.easeOut }, 'response-line' )

                .add( 'responses', '-=0.5' )
                .addCallback( ()=> {
                    if ( !this.rewindActive && this.screenIsSmall ) {
                        this.scrollSvgToStage( 'response' );
                    }
                } )
                .from( responses, 1, { autoAlpha: 0, ease: Power1.easeOut } )

                .addCallback( function () {
                    if ( !this.rewindActive && this.isActive ) {
                        scroller.pulseEmotionNav();
                    }
                }.bind( this ) )

                .add( 'end' );


            this.addStatePulsation();

            this.episodeTimeline.pause();

            TweenMax.set(state, { visibility: 'visible' });

            this.replaceContent(this.currentEmotion, false);

            const line = timeline.select('#event-line', eventLines);
            this.fixEventLineOverlap(event, line, timeline);

            TweenMax.set( this.parent, { visibility: 'visible' } );

            this.isActive = true;

        }
    }

    fixEventLineOverlap(event, eventLine, timeline) { 
        const eventBox = event.getBoundingClientRect();
        const eventLineBox = eventLine.getBoundingClientRect();
        const textLineSpace = eventLineBox.x - (eventBox.x + eventBox.width);
        const minGap = 20;
        if (textLineSpace < minGap) {
            const path = eventLine.getAttribute('d');
            eventLine.setAttribute('d', path.replace(/M[^,]+,/,`M${minGap.toString()},`))
        }
    }

}
