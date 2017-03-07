/**
 *
 *
 *  with awareness
 *
 */

function initializeIllumination( svgDoc ) {
    var illumination = svgDoc.getElementById( 'illumination' );
    // illumination.setAttribute("x","-10000px");
    // illumination.setAttribute("width","10300px");
    var scaleRatio = select( "#fullpage", document ).clientHeight / 300;
    var transform = illumination.getAttribute( 'transform' ).match( /[-+]?\d+(\.\d+)?/g );
    //illumination.setAttribute( 'transform', "translate(" + transform[ 0 ] + ", " + (-110 * scaleRatio) + ") scale(1," + (scaleRatio + 0.1) + ") translate(0,-199)" );
    var NS = "http://www.w3.org/2000/svg";
    var scaleGroup = document.createElementNS( NS, 'g' );
    var illuminationParent = illumination.parentNode;
    var block = select( '#block', illumination );
    var glow = select( '#glow', illumination );
    var heightDifference = glow.getAttribute( 'height' ) - block.getAttribute( 'height' );
    var glowShift = (scaleRatio - 1) * (glow.getAttribute( 'height' ) / 2);
    var blockShift = (scaleRatio - 1) * (block.getAttribute( 'height' ) / 2);
    TweenMax.set( block, { height: scaleRatio * block.getAttribute( 'height' ), y: '-=' + blockShift } );
    TweenMax.set( glow, { height: scaleRatio * glow.getAttribute( 'height' ), y: '-=' + glowShift } );
}

function EpisodeAddAwareness( svgDoc, object ) {

    if ( svgDoc && !svgDoc._initializedEpisode ) {

        //fonts need to be added for them to work in svg
        addFonts( svgDoc );

        var parent = svgDoc;

        var content;

        initializeIllumination( svgDoc );

        //returns a div rather than an object
        parent = extractDocument( svgDoc, object );

        //timeline with examples
        var timelineWithExamples = select( '#timeline-with-examples', parent );

        //blocks
        var blockDiagram = new BlockDiagram( select( '#blocks', parent ) );

        blockDiagram.onComplete = function () {
            var refractoryPeriod = RefractoryPeriod( parent, blocks );
        };

        // illumination
        var illuminationBlock = select( '#block', parent );
        var illuminationGlow = select( '#glow', parent );

        var svg = select( 'svg', parent );

        content = [
            {
                event: [ 'you are low on sleep', 'a stranger shouts at you', 'he reminds you of a bully' ],
                state: [ 'your body becomes tense', 'anger', 'your mind starts racing' ],
                response: {
                    'constructive-response': 'walk away',
                    'destructive-response': 'shout back',
                    'ambiguous-response': 'something else...'
                }
            }
        ];


        // hide elements and prepare for animation
        TweenMax.allTo( getChildren( select( '#state', timelineWithExamples ) ), 0, { visibility: 'hidden' } );


        //state
        var state = select( '#state', timelineWithExamples ),
            stateLabel = select( '#state-label', timelineWithExamples );
        var bBox = state.getBBox();
        var stateLabelChildren = getChildren( stateLabel );
        for ( var i = 0; i < stateLabelChildren.length; i++ ) {
            stateLabelChildren[ i ].setAttribute( 'x', bBox.x + bBox.width / 2 );
            stateLabelChildren[ i ].setAttribute( 'text-anchor', 'middle' );
            if ( i == 1 ) {
                stateLabelChildren[ i ].style.textTransform = 'uppercase';
            }
        }
        var physicalChanges = select( '#physical-changes', timelineWithExamples );
        var mentalChanges = select( '#mental-changes', timelineWithExamples );
        var changes = select( '#changes', timelineWithExamples );
        physicalChanges.style.visibility = 'hidden';
        mentalChanges.style.visibility = 'hidden';

        //circles
        var c1 = select( '#c1', timelineWithExamples ),
            c2 = select( '#c2', timelineWithExamples ),
            c3 = select( '#c3', timelineWithExamples );

        //lines
        var eventLines = select( '#event-lines', timelineWithExamples ),
            responseLineGroup = select( '#response-lines', timelineWithExamples ),
            responseLines = selectAll( "path:not([id*='decoration'])", responseLineGroup ),
            responseLineDecorations = selectAll( "[id*='decoration']", responseLineGroup );
        //hide first and third lines and arrowheads
        TweenMax.allTo( selectAll( '[id*="response-line-1"]', timelineWithExamples ), 0, { autoAlpha: 0 } );
        TweenMax.allTo( selectAll( '[id*="response-line-3"]', timelineWithExamples ), 0, { autoAlpha: 0 } );

        //text
        var event = select( '#event', timelineWithExamples ),
            precondition = select( '#precondition', timelineWithExamples ),
            perceptualDatabase = select( '#perceptual-database', timelineWithExamples ),
            triggers = selectAll( '#trigger>*', timelineWithExamples ),
            constructiveResponse = select( '#constructive-response', timelineWithExamples ),
            destructiveResponse = select( '#destructive-response', timelineWithExamples ),
            ambiguousResponse = select( '#ambiguous-response', timelineWithExamples ),
            responses = select( '#responses', timelineWithExamples );

        //add awareness button
        var addAwarenessButtonState = select( '#add-awareness-state', timelineWithExamples );
        addAwarenessButtonState.style.cursor = 'pointer';
        addAwarenessButtonState.style.pointerEvents = 'all';
        addAwarenessButtonState.style.visibility = 'hidden';

        var addAwarenessButtonResponse = select( '#add-awareness-response', timelineWithExamples );
        addAwarenessButtonResponse.style.cursor = 'pointer';
        addAwarenessButtonResponse.style.pointerEvents = 'all';
        addAwarenessButtonResponse.style.visibility = 'hidden';

        //try again button
        var tryAgainButton = select( '#try-again', timelineWithExamples );
        tryAgainButton.style.cursor = 'pointer';
        tryAgainButton.style.pointerEvents = 'all';
        tryAgainButton.style.visibility = 'hidden';


        var tl = new TimelineMax( {} );

        var contentIndex = 0;

        var addResponseLineAwareness = function () {
            if ( awarenessStage == 'state' ) {
                //reset center line color
                select( '#response-line-2', timelineWithExamples ).setAttribute( 'stroke', select( '#response-line-1', timelineWithExamples ).getAttribute( 'stroke' ) );
                select( '#response-line-2-decoration-1', timelineWithExamples ).setAttribute( 'fill', select( '#response-line-1', timelineWithExamples ).getAttribute( 'stroke' ) );
                select( '#response-line-2-decoration-1', timelineWithExamples ).setAttribute( 'stroke', select( '#response-line-1', timelineWithExamples ).getAttribute( 'stroke' ) );
            }
            if ( awarenessStage == 'response' ) {
                for ( var i = 0; i < responseLines.length; i++ ) {
                    responseLines[ i ].setAttribute( 'stroke-dasharray', '3,8' );
                    responseLineDecorations[ i ].setAttribute( 'fill', select( '#response-line-1', timelineWithExamples ).getAttribute( 'stroke' ) );
                }
                //show all lines and arrowheads
                TweenMax.allTo( selectAll( '[id*="response-line-"]', timelineWithExamples ), 0, { autoAlpha: 1 } );
            }
        }
        var replaceContent = function ( contentIndex ) {

            var stateAware = typeof content[ contentIndex ].state != 'string';
            var responseAware = typeof content[ contentIndex ].response != 'string';
            var stateKey = stateAware ? content[ contentIndex ].state[ 1 ] : content[ contentIndex ].state;

            var colors = configsByEmotion[ stateKey ].colorPalette;

            var color1 = colors[ 0 ];
            var color2 = colors[ Math.round( (colors.length - 1) / 3 ) ];
            var color3 = colors[ colors.length - 1 ];

            c1.setAttribute( 'fill', 'rgb(' + color1[ 0 ] + ',' + color1[ 1 ] + ',' + color1[ 2 ] + ')' );
            c2.setAttribute( 'fill', 'rgb(' + color2[ 0 ] + ',' + color2[ 1 ] + ',' + color2[ 2 ] + ')' );
            c3.setAttribute( 'fill', 'rgb(' + color3[ 0 ] + ',' + color3[ 1 ] + ',' + color3[ 2 ] + ')' );

            stateLabelChildren[ 1 ].textContent = content[ contentIndex ].state[ 1 ];

        };

        var reset = function ( callback ) {

            tl.timeScale( 3 );

            tl.pause();
            tl.seek( 'end' );

            tl.tweenTo( 'event-lines', {
                onComplete: function () {

                    contentIndex++;
                    if ( contentIndex >= content.length ) {
                        contentIndex = 0;
                    }

                    callback();

                    //run animation
                    tl.timeScale( 1 );
                    tl.pause();
                    tl.seek( 'event-pulse' );

                    TweenMax.delayedCall( 0.5, function () {
                        tl.tweenTo( 'end' );
                    } );

                }, ease: Power2.easeOut
            } );

        };

        var awarenessStage = 'event';

        var advance = function () {

            if ( awarenessStage == 'event' ) {

                TweenMax.to( illuminationBlock, 4, { attr: { x: '+=300' }, ease: Power2.easeInOut } );
                TweenMax.to( illuminationGlow, 4, { attr: { x: '+=300' }, ease: Power2.easeInOut } );

                awarenessStage = 'state';

            } else if ( awarenessStage == 'state' ) {

                var illuminationTimeline = new TimelineMax( {} );

                // move illumination all the way off screen, starting with a smooth but quick acceleration
                // once it is finished illuminating the entire timeline, the block interactions are enabled
                illuminationTimeline
                    .add( 'start' )
                    .to( illuminationBlock, 4, { attr: { x: '+=400' }, ease: Power2.easeIn }, 'start' )
                    .to( illuminationGlow, 4, { attr: { x: '+=400' }, ease: Power2.easeIn }, 'start' )
                    .add( 'finished' )
                    .addCallback( enableBlockDiagram )
                    .to( illuminationBlock, 10, { attr: { x: '+=3000' }, ease: Power0.easeIn }, 'finished' )
                    .to( illuminationGlow, 10, { attr: { x: '+=3000' }, ease: Power0.easeIn }, 'finished' )
                    .add( 'end' );

                awarenessStage = 'response';

            }

        };

        var enableBlockDiagram = function () {
            var clickableElements = [
                precondition,
                event,
                perceptualDatabase,
                physicalChanges,
                state,
                mentalChanges,
                constructiveResponse,
                destructiveResponse,
                ambiguousResponse
            ];
            blockDiagram.addClickHandlers( clickableElements );
        };

        var pulsateState = function () {
            //pulsate state
            TweenMax.to( c1, 1, {
                attr: { r: '-=5' },
                repeat: -1,
                yoyo: true,
                repeatDelay: 0,
                ease: Power1.easeInOut
            } );
            TweenMax.to( c2, 0.8, {
                attr: { r: '-=3' },
                repeat: -1,
                yoyo: true,
                repeatDelay: 0,
                ease: Power1.easeInOut
            } );
            TweenMax.to( c3, 1, {
                attr: { r: '-=2' },
                repeat: -1,
                yoyo: true,
                repeatDelay: 0,
                ease: Power1.easeInOut
            } );
        };

        //pulsate illumination
        var pulsateIllumination = function () {
            TweenMax.allTo( [ block, glow ], 1.9, {
                attr: { x: '-=5' },
                repeat: -1,
                yoyo: true,
                repeatDelay: 0,
                ease: Power1.easeInOut
            }, 'pulsate-illumination' );
        };

        var addStateAwareness = function () {
            if ( awarenessStage == 'state' ) {
                physicalChanges.style.visibility = 'visible';
                mentalChanges.style.visibility = 'visible';
            }
        };

        var addResponseAwareness = function () {
            if ( awarenessStage == 'response' ) {
                //set the color of the second choice to match the first
                select( '#destructive-response', timelineWithExamples ).setAttribute( 'fill', select( '#constructive-response', timelineWithExamples ).getAttribute( 'fill' ) );
            }
        };

        var showAddAwarenessButton = function () {
            if ( awarenessStage == 'event' && addAwarenessButtonState.style.visibility == 'hidden' ) {
                TweenMax.from( addAwarenessButtonState, 1, { autoAlpha: 0, ease: Power2.easeOut } );
            }
            if ( awarenessStage == 'state' && addAwarenessButtonResponse.style.visibility == 'hidden' ) {
                TweenMax.from( addAwarenessButtonResponse, 1, { autoAlpha: 0, ease: Power2.easeOut } );
            }
        };
        //start the timeline

        tl
        //fade in illumination
            .add( 'illuminate' )
            .from( illumination, 2, { autoAlpha: 0, ease: Power1.easeInOut } )
            .from( block, 3, { attr: { x: '-=400' }, ease: Power1.easeOut }, 'illuminate' )
            .from( glow, 3, {
                attr: { x: '-=400' },
                ease: Power1.easeOut,
                onComplete: pulsateIllumination
            }, 'illuminate' )
            .add( 'pulsate-illumination' )

            //show event
            .add( 'event' )

            .add( 'event-pulse' )
            .to( select( '#event-text', timelineWithExamples ), 0.1, {
                scale: 1.1,
                transformOrigin: '50% 50%',
                ease: Power1.easeOut
            } )
            .to( select( '#event-text', timelineWithExamples ), 0.2, {
                scale: 1,
                transformOrigin: '50% 50%',
                ease: Power1.easeOut
            } )
            .to( select( '#perceptual-database-text', timelineWithExamples ), 0.1, {
                scale: 1.1,
                transformOrigin: '50% 50%',
                ease: Power1.easeOut
            }, '-=0.25' )
            .to( select( '#perceptual-database-text', timelineWithExamples ), 0.2, {
                scale: 1,
                transformOrigin: '50% 50%',
                ease: Power1.easeOut
            } )
            .add( 'event-lines' )
            .from( eventLines, 0.5, { autoAlpha: 0, ease: Power1.easeOut }, 'event-lines' )

            // show emo state
            .add( 'state' )
            .from( c1, 2, { attr: { r: 0 }, autoAlpha: 0, ease: Bounce.easeOut } )
            .from( c2, 2, { attr: { r: 20 }, autoAlpha: 0, ease: Bounce.easeOut }, 'state' )
            .from( c3, 2, { attr: { r: 50 }, autoAlpha: 0, ease: Bounce.easeOut }, 'state' )
            .addCallback( addStateAwareness, 'state' )
            .from( changes, 2, { autoAlpha: 0, ease: Power1.easeOut }, 'state' )
            .from( stateLabel, 2, { autoAlpha: 0, ease: Power1.easeOut, onComplete: pulsateState }, 'state' )
            .add( 'pulsate' )

            //show response
            .add( 'response-lines', '-=0.5' )
            .addCallback( addResponseLineAwareness, 'response-lines' )
            .from( responseLineGroup, 0.5, { autoAlpha: 0, ease: Power1.easeOut }, 'response-lines' )

            .add( 'responses' )
            .addCallback( addResponseAwareness )
            .from( responses, 1, { autoAlpha: 0, ease: Power1.easeOut } )

            .add( 'end' )

            .add( 'add-awareness-button' )
            .addCallback( showAddAwarenessButton );

        var delayedReset = function () {
            // hide button
            var button = this;
            TweenMax.to( button, 1, {
                autoAlpha: 0,
                ease: Power2.easeOut,
                onComplete: function () {
                    button.style.display = 'none';
                }
            } );
            //reset and and advance at start
            reset( function () {
                TweenMax.delayedCall( 1.5, function () {
                    advance();
                } );
            } );
        };

        addAwarenessButtonState.onclick = delayedReset;
        addAwarenessButtonResponse.onclick = delayedReset;

        TweenMax.set( state, { visibility: 'visible' } );

        replaceContent( contentIndex );

        TweenMax.set( parent, { visibility: 'visible' } );
        tl.tweenTo( 'end' );

        svgDoc._initializedEpisode = true;

    }

}


/**
 * Represents the Block Diagram aspect of the visualization
 * @param element The element that contains the block diagram
 * @constructor
 */
function BlockDiagram( element ) {

    this.element = element;

    this.blocks = getChildren( element );

    this.onComplete = function () {
    };

    for ( var i = 0; i < this.blocks.length; i++ ) {
        this.blocks[ i ].style.visibility = 'hidden';
    }

    this.getBlockForElement = function ( element ) {
        return select( '#' + element.getAttribute( 'id' ) + '-block', this.element );
    };

    this.toggleElement = function ( element ) {
        var block = this.getBlockForElement( element );
        var transitionTime = 1;
        if ( block.style.visibility == 'hidden' ) {
            TweenMax.to( block, transitionTime, { autoAlpha: 1, ease: Power2.easeOut } );
            TweenMax.to( element, transitionTime, { autoAlpha: 0, ease: Power2.easeOut } );
        } else {
            TweenMax.to( block, transitionTime, { autoAlpha: 0, ease: Power2.easeOut } );
            TweenMax.to( element, transitionTime, { autoAlpha: 1, ease: Power2.easeOut } );
        }
        setTimeout( function () {
            this.checkCompletion();
        }.bind( this ), (transitionTime + 0.1) * 1000 );
    };

    this.checkCompletion = function () {
        var complete = true;
        for ( var i = 0; i < this.blocks.length; i++ ) {
            if ( this.blocks[ i ].style.visibility == 'hidden' ) {
                complete = false;
            }
        }
        if ( complete ) {
            this.onComplete();
        }
    };

    this.addClickHandlers = function ( elements ) {
        for ( var i = 0; i < elements.length; i++ ) {
            this.addClickHandler( elements[ i ] );
        }
    };

    this.addClickHandler = function ( element ) {
        element.addEventListener( 'click', function () {
            this.toggleElement( element );
        }.bind( this ) );
        this.getBlockForElement( element ).addEventListener( 'click', function () {
            this.toggleElement( element );
        }.bind( this ) );
        element.classList.add( 'clickable' );
    }

}

function RefractoryPeriod( parent, blocks ) {

    var NS = "http://www.w3.org/2000/svg";
    var line = select( '#perceptual-database-line-group', parent );
    var lineChildren = getChildren( line );
    var lineBox = line.getBBox();

    var otherTriggerBlocks = selectAll( '#precondition-block, #event-block', parent );
    var otherTriggerLines = selectAll( '#precondition-line, #event-line, #precondition-line-decoration-1, #event-line-decoration-1', parent );
    var otherResponseLines = selectAll( '#response-line-1, #response-line-3, #response-line-1-decoration-1, #response-line-3-decoration-1', parent );
    var otherBlocks = selectAll( '#mental-changes-block, #physical-changes-block, #constructive-response-block, #ambiguous-response-block', parent );
    var perceptualDatabaseBlock = select( '#perceptual-database-block', parent );
    var eventBlock = select( '#event-block', parent );
    var trigger = select( '#trigger', parent );

    var tryAgainButton = select( '#try-again', parent );

    TweenMax.to( tryAgainButton, 1, { autoAlpha: 1 } );
    tryAgainButton.addEventListener( 'click', function () {

        var initializationTimeline = new TimelineMax( {} );
        initializationTimeline
            .add( 'start' )
            .to( trigger, 1, { autoAlpha: 0 }, 'start' )
            .to( otherTriggerBlocks, 0.5, { autoAlpha: 0 }, 'start+=0.5' )
            .to( otherBlocks, 0.5, { autoAlpha: 0 }, 'start+=0.5' )
            .to( otherTriggerLines, 0.5, { autoAlpha: 0 }, 'start+=0.5' )
            .to( otherResponseLines, 0.5, { autoAlpha: 0 }, 'start+=0.5' )
            .to( perceptualDatabaseBlock, 0.5, { autoAlpha: 1 }, 'start+=0.5' )

            .add( 'move' )
            .to( selectAll( 'rect, tspan', perceptualDatabaseBlock ), 1, {
                attr: { y: '-=60' },
                ease: Power1.easeOut
            }, 'move' )
            .to( lineChildren, 1, {
                rotation: 18,
                y: '-=35',
                svgOrigin: (lineBox.x + lineBox.width) + ' ' + lineBox.y,
                ease: Power1.easeOut
            }, 'move' )
            .to( lineChildren, 1, {
                rotation: 18,
                y: '-=35',
                svgOrigin: (lineBox.x + lineBox.width) + ' ' + lineBox.y,
                ease: Power1.easeOut
            }, 'move' );

    } );

}