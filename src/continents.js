import _ from 'lodash';
import d3 from 'd3';
import TWEEN from 'tween.js';

import dispatcher from './dispatcher.js';
import Continent from './Continent.js';

import appStrings from './appStrings.js';
import sassVars from '../scss/variables.json';


export default class ContinentsSection {

	continents;
	continentContainer;
	centerX; centerY;
	frameCount = 0;
	currentEmotion;


	isInited = false;
	isActive = false;
	screenIsSmall = false;
	displayingIntro = false;
	closeDelay = sassVars.ui.labels.duration.in * 1000;

	init( containerNode, screenIsSmall ) {

		this.sectionContainer = containerNode;

		this.screenIsSmall = screenIsSmall;

		this.update = this.update.bind( this );

		this.defaultEmotionHelper = this.getDefaultEmotionHelper();

		this.labelContainer = d3.select( containerNode )
			.append( 'div' )
			.attr( 'class', 'label-container' );

		this.continentContainer = d3.select( containerNode ).append( 'svg' )
			.attr( 'width', '100%' )
			.attr( 'height', '100%' );

		let w = containerNode.offsetWidth,
			h = containerNode.offsetHeight,
			continentGeom;

		if ( this.screenIsSmall ) {
			this.centerX = sassVars.continents[ 'centerX-small' ] * w;
			this.centerY = sassVars.continents[ 'centerY-small' ] * h;
		} else {
			this.centerX = sassVars.continents.centerX * w;
			this.centerY = sassVars.continents.centerY * h;
		}
		continentGeom = {
			w: w,
			h: h,
			centerX: this.centerX,
			centerY: this.centerY
		};

		let continentTransforms = this.calculateContinentTransforms();

		// map each emotion to a Continent instance
		this.continents = _.values( dispatcher.EMOTIONS ).map( emotion => new Continent( emotion, this.continentContainer, continentGeom, continentTransforms, this.screenIsSmall ) );

		this.initLabels( this.labelContainer );

		this.initMobileElements( containerNode, this.labelContainer );

		// Bind transition namespace to current scope
		Object.keys( this.transitions ).forEach( transitionKey => {
			this.transitions[ transitionKey ] = this.transitions[ transitionKey ].bind( this );
		} );

		// Bind event handlers to current scope
		this.onContinentMouseEnter = this.onContinentMouseEnter.bind( this );
		this.onContinentMouseLeave = this.onContinentMouseLeave.bind( this );
		this.onContinentClick = this.onContinentClick.bind( this );

		// this.onLabelOver = this.onLabelOver.bind(this);
		// this.onLabelOut = this.onLabelOut.bind(this);

		this.isInited = true;

	}

	setEmotion( emotion, previousEmotion ) {

		return new Promise( ( resolve, reject ) => {

			if ( this.currentEmotion ) {

				let currentContinent = this.continents.find( c => c.id === this.currentEmotion );

				if ( emotion ) {

					if ( this.zoomedInContinent ) {

						// transition back from zoomed continent to all continents

						if ( this.zoomedInContinent !== previousEmotion ) {
							// if zoomed into a different continent than we're returning to
							// (i.e. left continents, changed emotions, returned to continents),
							// immediately gather the previous and spread the current,
							// then gather the current with an animation.
							this.transitions.gatherContinent( this.zoomedInContinent, true );

							//
							// TODO: have to complete this block by
							// immediately to panning to location of current emotion
							// and spreading circles of that continent.
							//

						}

						// gather circles of zoomed-in continent
						this.transitions.gatherContinent( this.currentEmotion );

						setTimeout( () => {

							// scale all continents back up to full size
							this.transitions.scaleContinents( this.continents.map( continent => continent.id ), 1.0 );

							// pan to center
							this.transitions.panToContinent( null, this.currentEmotion );

							// display all-continents callout
							dispatcher.changeSectionText( null, appStrings().getStr( 'emotionsData.metadata.continents.header' ), appStrings().getStr( 'emotionsData.metadata.continents.body' ) );

							resolve();

						}, sassVars.continents.spread.delay.out * 1000 );

					} else {

						// new continent selected with a continent previously selected
						currentContinent.highlightLevel = Continent.HIGHLIGHT_LEVELS.UNSELECTED;

						let continent = this.continents.find( c => c.id === emotion );
						this.setContinentHighlight( continent, Continent.HIGHLIGHT_LEVELS.SELECTED );
						dispatcher.changeSectionText( null, appStrings().getStr( 'emotionsData.metadata.continents.header' ), appStrings().getStr( 'emotionsData.metadata.continents.body' ) );

						resolve();

					}

				} else {

					// deselect all continents
					this.continents.forEach( c => c.highlightLevel = Continent.HIGHLIGHT_LEVELS.NONE );
					this.setContinentHighlight( null, Continent.HIGHLIGHT_LEVELS.NONE );

					// display all-continents callout
					dispatcher.changeSectionText( null, appStrings().getStr( 'emotionsData.metadata.continents.header' ), appStrings().getStr( 'emotionsData.metadata.continents.body' ) );

					if ( this.zoomedInContinent ) {

						// navigate straight to root, ignoring any previously-selected emotion continent
						// (e.g. clicked on ATLAS OF EMOTIONS home button)

						// immediately gather continent that was
						// zoomed into last time we left continents
						this.transitions.gatherContinent( this.zoomedInContinent, true );

						// pan to center immediately
						this.transitions.panToContinent( null, this.currentEmotion, true );

						// scale all continents to 0 immediately (after other transforms above),
						// and then back up to full size
						setTimeout( () => {
							let allEmotions = this.continents.map( continent => continent.id );
							this.transitions.scaleContinents( allEmotions, 0.0, undefined, 0 )
								.then( () => {
									return this.transitions.scaleContinents( allEmotions, 1.0 );
								} )
								.then( () => {
									resolve();
								} );
						}, 1 );

					} else {

						resolve();

					}

				}

			} else {

				if ( emotion ) {

					if ( this.zoomedInContinent ) {

						// TODO: never currently hit this block because zoomedInContinent is not set
						// until the first continent zoom (transition into states) happens.
						// intent is for this block to be triggered when navigating from outside continents
						// into a focused continent, regardless of whether or not continents
						// has yet been visited this session.
						//
						// TODO: in the above scenario, we'll also have to enable this transition
						// by pre-zooming/flattening the continent, in order to animate
						// away from that state back to the SELECTED, zoomed-out state.

						// transition back from zoomed continent to all continents

						// gather circles of zoomed-in continent
						this.transitions.gatherContinent( previousEmotion );

						setTimeout( () => {

							// scale all continents back up to full size
							this.transitions.scaleContinents( this.continents.map( continent => continent.id ), 1.0 );

							// pan to center
							this.transitions.panToContinent( null, previousEmotion );

							// display all-continents callout
							dispatcher.changeSectionText( null, appStrings().getStr( 'emotionsData.metadata.continents.header' ), appStrings().getStr( 'emotionsData.metadata.continents.body' ) );

							resolve();

						}, sassVars.continents.spread.delay.out * 1000 );

					} else {

						// new continent selected with nothing previously selected
						let continent = this.continents.find( c => c.id === emotion );
						this.setContinentHighlight( continent, Continent.HIGHLIGHT_LEVELS.SELECTED );

						// display all-continents callout
						dispatcher.changeSectionText( null, appStrings().getStr( 'emotionsData.metadata.continents.header' ), appStrings().getStr( 'emotionsData.metadata.continents.body' ) );

						resolve();

					}

				} else {

					// display all-continents callout if on non-mobile
					/*if ( !this.screenIsSmall )*/ dispatcher.changeSectionText( null, appStrings().getStr( 'emotionsData.metadata.continents.header' ), appStrings().getStr( 'emotionsData.metadata.continents.body' ) );
					resolve();

				}

			}

			const desc = emotion ? appStrings().getStr( `emotionsData.emotions.${ emotion }.continent.desc` ) : null;
			this.changePopup( emotion, desc );

			this.currentEmotion = emotion;
			this.zoomedInContinent = null;

		} );

	}

	changePopup( emotion, desc ) {
		dispatcher.popupChange( 'continents', emotion, desc );
	}

	getDefaultEmotionHelper() {

		const keys = Object.keys( dispatcher.EMOTIONS );
		const randomeKey = keys[ Math.floor( Math.random() * keys.length ) ];

		return dispatcher.EMOTIONS[ randomeKey ];

	}

	initLabels( labelContainer ) {

		let labels = labelContainer.selectAll( '.emotion-label' )
			.data( this.continents, d => d.id );

		if ( this.screenIsSmall ) {
			labels.style( 'display', 'none' );
			return;
		}

		const positionLabelsVertically = this.positionLabelsVertically.bind(this);
		let labelsEnter = labels.enter()
			.append( 'div' )
			.attr( 'class', d => `emotion-label ${d.id}` )
			.attr( 'data-popuptarget', d => this.popupAccessor( d ) )
			.classed( 'default-interactive-helper', d => d.name.toLowerCase() === this.defaultEmotionHelper.toLowerCase() )
			.style( 'left', d => Math.round( this.centerX + d.x + d.label.x ) + 'px' )
			.each( function ( d, i ) {
				positionLabelsVertically( d, i, this ); // function's this, not class
			} );

		labelsEnter.append( 'a' )
			.attr( 'href', d => this.hrefAccessor( d ) )
			.append( 'h3' )
			.text( d => d.i18nName.toUpperCase() );

	}

	hrefAccessor( d ) {
		return `#states${dispatcher.HASH_DELIMITER}${d.id}`;
	}

	popupAccessor( d ) {
		return `continents${dispatcher.HASH_DELIMITER}${d.id}`;
	}

	initMobileElements( containerNode, labelContainer ) {

		labelContainer.append( 'div' )
			.classed( 'intro-element message', true )
			.append( 'p' )
			.html( appStrings().getStr( 'emotionsData.metadata.intro.body_mobile' ) );

		d3.select( containerNode ).append( 'div' )
			.classed( 'intro-element button', true )
			.text( `Let's get started` );

	}

	calculateContinentTransforms() {

		if ( !this.screenIsSmall ) return undefined;

		// left-to-right
		return [
			{
				x: -0.23,
				y: -0.13,
				size: 0.15,
				introSpreadMaxRad: 0.55,
				introSpreadSizeMod: 1
			},
			{
				x: -0.17,
				y: 0.03,
				size: 0.15,
				introSpreadMaxRad: 0.7,
				introSpreadSizeMod: 1
			},
			{
				x: 0.06,
				y: -0.18,
				size: 0.15,
				introSpreadMaxRad: 0.4,
				introSpreadSizeMod: 1
			},
			{
				x: 0.12,
				y: 0.10,
				size: 0.15,
				introSpreadMaxRad: 0.8,
				introSpreadSizeMod: 1
			},
			{
				x: 0.24,
				y: -0.02,
				size: 0.15,
				introSpreadMaxRad: 0.55,
				introSpreadSizeMod: 1
			}
		];

	}

	open( options ) {

		this.setActive( true );
		this.setInteractive( true );

		// fade in continent labels, with delay if this is the first opened section of the session
		// display callout here if this is the first opened section of the session;
		// otherwise, callout display is handled within setEmotion.
		// this will probably have to change to support deeplinking to a zoomed-in emotion,
		// we'll figure that out later.
		if ( options && options.introModalIsOpen ) {
			// if intro modal is open, move continents out of the way of the intro modal
			this.setContinentIntroPositions( true );
		}

		this.update();

	}

	close( nextSection ) {

		return new Promise( ( resolve, reject ) => {

			let continent = this.continents.find( c => c.id === this.currentEmotion );
			if ( nextSection === dispatcher.SECTIONS.STATES && continent && continent.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED ) {

				// if there is a selected continent, and we're transitioning into States,
				// animate the continent down into the floor of the States graph.

				this.closeDelay = sassVars.ui.labels.duration.in * 1000;

				let targetScale = 1.0,
					spreadDelay = sassVars.continents.spread.delay.in * 1000,
					spreadDuration = sassVars.continents.spread.duration.in * 1000;

				// disable interaction immediately
				this.setInteractive( false );

				this.transitions.scaleContinents(
					this.continents
						.filter( c => c !== continent )
						.map( c => c.id ),
					0.0
				);

				this.transitions.panToContinent( continent.id );

				setTimeout( () => {
					targetScale = this.transitions.focusZoomedOutContinent( continent.id );
				}, spreadDelay );

				setTimeout( () => {
					this.transitions.spreadFocusedContinent( continent.id, targetScale );
				}, spreadDelay );

				setTimeout( () => {
					// turn off updates
					this.setActive( false );

					// store continent zoomed into for later reverse animation
					this.zoomedInContinent = continent.id;
				}, spreadDelay + spreadDuration );

				setTimeout( () => {
					// resolve `closeDelay` ms before continent zoom transition completes,
					// to allow overlap between continent transition and next section's intro transition
					resolve();
				}, spreadDelay + spreadDuration - this.closeDelay );

			} else {

				this.closeDelay = 0;

				// not transitioning a selected continent into states.
				// disable updates and interaction and resolve close sequence immediately.
				this.setActive( false );
				this.setInteractive( false );
				resolve();

			}

		} );

	}

	/**
	 * Update continent sizes and positions.
	 * note that Continent size is used to determine constituent Circle sizes,
	 * but Continent.onResize() does not update existing Circle sizes
	 * so size changes take a bit of time to propagate.
	 */
	onResize( screenIsSmall ) {

		this.screenIsSmall = screenIsSmall;

		let w = this.sectionContainer.offsetWidth,
			h = this.sectionContainer.offsetHeight,
			continentGeom;

		if ( this.screenIsSmall ) {
			this.centerX = sassVars.continents[ 'centerX-small' ] * w;
			this.centerY = sassVars.continents[ 'centerY-small' ] * h;
		} else {
			this.centerX = sassVars.continents.centerX * w;
			this.centerY = sassVars.continents.centerY * h;
		}
		continentGeom = {
			w: w,
			h: h,
			centerX: this.centerX,
			centerY: this.centerY
		};

		this.continents.forEach( c => c.onResize( continentGeom, this.screenIsSmall ) );

		// update label positions
		let labels = this.labelContainer.selectAll( '.emotion-label' )
			.data( this.continents, d => d.id );

		// we're not adding anything, so skip right to update
		const positionLabelsVertically = this.positionLabelsVertically.bind(this);
		labels
			.style( 'left', d => Math.round( this.centerX + d.x + d.label.x ) + 'px' )
			.each( function ( d, i ) {
				positionLabelsVertically( d, i, this ); // function's this, not class
			} );
	}

	setActive( val ) {

		this.isActive = val;

		this.labelContainer.selectAll( '.emotion-label' )
			.classed( 'visible', val );

	}

	setInteractive( val ) {

		let section = this;

		this.continents.forEach( function ( continent, i ) {
			continent.d3Selection
				.on( 'mouseenter', val ? section.onContinentMouseEnter : null )
				.on( 'mouseleave', val ? section.onContinentMouseLeave : null )
				.on( 'click', val ? section.onContinentClick : null, true );
		} );

		this.labelContainer.selectAll( '.emotion-label' )
			.on( {
				mouseenter: val ? section.onContinentMouseEnter : null,
				mouseleave: val ? section.onContinentMouseLeave : null
			} );


		// handle background click for deselection
		d3.select( '#main' ).on( 'click', val ? this.onBackgroundClick : null, false );

	}

	/**
	 * Position continents for site intro or to normal positioning.
	 * @param {Boolean} val If true, continents tween away from center; false, back to normal positions.
	 */
	setContinentIntroPositions ( val ) {

		if ( this.displayingIntro === val ) return;
		this.displayingIntro = val;

		let w = this.sectionContainer.offsetWidth,
			h = this.sectionContainer.offsetHeight,
			diag = Math.sqrt( w * w + h * h ) / 2;

		this.continents.forEach( continent => {
			if ( val ) {
				continent.addTween(
					{
						'introSpreadRad': continent.introSpreadMaxRad * diag,
						'introSpreadSize': continent.introSpreadSizeMod || 0
					},
					sassVars.continents.introSpread.duration.out * 1000,
					sassVars.continents.introSpread.delay.out * 1000,
					TWEEN.Easing.Cubic.InOut
				);
			} else {
				continent.addTween(
					{
						'introSpreadRad': 0,
						'introSpreadSize': 0
					},
					sassVars.continents.introSpread.duration.in * 1000,
					sassVars.continents.introSpread.delay.in * 1000,
					TWEEN.Easing.Cubic.InOut );
			}

		} );

		if ( val ) {

			// no mobile caption when continents are spread
			if ( this.screenIsSmall ) dispatcher.changeSectionText();

		} else {
			// NOTE: this code is specific to displaying/activating continents for the first time in the session
			// (when the intro modal is dismissed and the continents brought back to the screen center),
			// but doesn't really have anything to do with bringing the continents back to the screen center.
			// So, this code should probably belong elsewhere, but for now, here it stays.

			// display the default continents callout and continent labels.
			dispatcher.changeSectionText( null, appStrings().getStr( 'emotionsData.metadata.continents.header' ), appStrings().getStr( 'emotionsData.metadata.continents.body' ) );
			// this.setLabelVisibility(true);
		}

		if ( this.screenIsSmall ) this.setMobileIntroVisibility( val );

	}

	setMobileIntroVisibility( val ) {

		this.labelContainer.select( '.intro-element.message' )
			.classed( 'visible', val );

		let introButton = d3.select( '.intro-element.button' )
			.style( 'display', 'block' );

		// set visible class after one-frame delay so that 'display' style doesn't interfere with transition
		setTimeout( () => {
			introButton.classed( 'visible', val );
		}, 1 );

		introButton.on( 'click', val ? event => {
			dispatcher.navigate( dispatcher.HOME );
		} : null );

	}

	setLabelVisibility( val ) {
		this.labelContainer
			.selectAll( '.emotion-label' )
			.classed( 'visible', val );
	}

	update( time ) {

		if ( this.tweens ) {
			_.values( this.tweens ).forEach( tween => {
				tween.update( time );
			} );
		}

		let updateState = {
			time: time,
			someContinentIsHighlighted: this.continents.some( function ( continent ) {
				return continent.isHighlighted;
			} )
		};

		this.continents.forEach( continent => continent.update( updateState, this.frameCount ) );

		this.frameCount++;
		if ( this.isActive ) {
			window.requestAnimationFrame( this.update );
		}

	}

	/**
	 * Functions that perform transitions between continent views.
	 * Bound to continents.js in init().
	 */
	transitions = {

		// 2a. zoom in on focused continent and pan to center
		// 2b. while zooming, remove/add enough circles to match number of states
		// 2c. while 2a-b happens, tween colors of circles to match mocks? or leave them randomized?
		focusZoomedOutContinent: function ( emotion ) {

			let targetContinent = this.continents.find( continent => continent.id === emotion ),
				targetScale = (0.45 * this.continentContainer.node().getBoundingClientRect().height) / targetContinent.size;

			targetContinent.addTween( {
				'scaleX': targetScale,
				'scaleY': targetScale,
			}, sassVars.continents.spread.duration.in * 1000, 0, TWEEN.Easing.Quadratic.InOut );

			return targetScale;

		},

		// 2a. fade in and grow all circles for zoomed continent view from center of circle
		//		random colors or picked from mocks?
		focusZoomedInContinent: function ( emotion ) {

		},

		// 1c. while 1a-b happens, pan toward continent location from current continent's location, according to all continents view layout.
		panToContinent: function ( emotion, previousEmotion, immediate ) {

			if ( this.panTweenTimeout ) {
				clearTimeout( this.panTweenTimeout );
			}

			// calculate bottom of states graph
			// TODO: 50 (graph margin) should be a var in variables.json
			let statesBaselineOffset = this.centerY - (this.sectionContainer.offsetHeight * (parseInt( sassVars.states.containers.bottom.replace( '%', '' ) ) / 100) + 50);

			let targetContinent = this.continents.find( continent => continent.id === emotion ),
				previousContinent = this.continents.find( continent => continent.id === previousEmotion ),
				targetCenter = {
					x: this.centerX - (previousContinent ? previousContinent.x : 0),
					y: this.centerY - (previousContinent ? previousContinent.y - statesBaselineOffset : 0)
				},
				targetX = this.centerX,
				targetY = this.centerY;

			if ( targetContinent ) {
				targetX -= targetContinent.x;
				targetY -= targetContinent.y - statesBaselineOffset;
			}

			let durationX,
				durationY,
				funcX,
				funcY;

			if ( immediate ) {
				durationX = 0;
				durationY = 0;
				funcX = TWEEN.Easing.Linear.None,
					funcY = TWEEN.Easing.Linear.None;
			} else if ( !!emotion ) {
				// panning to
				durationX = sassVars.continents.panX.duration.in * 1000;
				durationY = sassVars.continents.panY.duration.in * 1000;
				funcX = TWEEN.Easing.Quadratic.InOut,
					funcY = TWEEN.Easing.Quadratic.InOut;
			} else {
				// panning from
				durationX = sassVars.continents.panX.duration.out * 1000;
				durationY = sassVars.continents.panY.duration.out * 1000;
				funcX = TWEEN.Easing.Quadratic.In,
					funcY = TWEEN.Easing.Quadratic.Out;
			}

			this.addTween( targetCenter, { 'x': targetX }, durationX, funcX )
				.onUpdate( function () {
					this.continents.forEach( continent => {
						continent.centerX = this.x;
					} );
				} )
				.start();

			this.addTween( targetCenter, { 'y': targetY }, durationY, funcY )
				.onUpdate( function () {
					this.continents.forEach( continent => {
						continent.centerY = this.y;
					} );
				} )
				.start();
		},

		// 2b. spread circles along horizontal axis as they fade in + grow
		// 2c. (later) allow circles to drift slightly along horizontal axis only. this motion can be reflected in the states view as well.
		spreadFocusedContinent: function ( emotion, targetScale ) {

			let targetContinent = this.continents.find( continent => continent.id === emotion );
			targetContinent.spreadCircles( this.continentContainer.node(), targetScale );

		},

		gatherContinent: function ( emotion, immediate ) {

			let targetContinent = this.continents.find( continent => continent.id === emotion );
			targetContinent.gatherCircles( immediate );

		},

		// 1. fade out and shrink all but focused continent /
		// 1a. fade out and shrink circles of continent;
		// 1b. pull circles together toward center along horizontal axis as they fade/shrink
		//		note: for zoomed-out continents, circles will already be centered, but that's ok.
		scaleContinents: function ( emotions, scale, delays = {}, time = 1200 ) {

			let MAX_TIME = time;

			if ( delays && Object.keys( delays ).length ) {
				MAX_TIME = time + (_.max( _.values( delays ) ) || 0);
			}

			return new Promise( ( resolve, reject ) => {

				let targetContinents = this.continents.filter( continent => ~emotions.indexOf( continent.id ) );
				targetContinents.forEach( continent => {

					// toggle spawning
					if ( (scale && continent.spawnConfig.freq < 0) ||
						(!scale && continent.spawnConfig.freq > 0) ) {
						continent.spawnConfig.freq *= -1;
					}

					// scale down to nothing
					continent.addTween( {
						'scaleX': scale,
						'scaleY': scale
					}, time + (delays[ continent.id ] || 0), 0, TWEEN.Easing.Quadratic.InOut );

				} );

				setTimeout( () => {
					resolve();
				}, MAX_TIME );

			} );

		},

	}

	/**
	 * Add to currently-tweening queue.
	 * Callers of this function are responsible for implementing onUpdate (if necessary)
	 * and for `start()`ing the returned Tween.
	 */
	addTween( obj, props, time, func = TWEEN.Easing.Linear.None ) {

		if ( !this.tweens ) {
			this.tweens = {};
		}

		let key = Object.keys( props ).sort().join( ',' );
		if ( this.tweens[ key ] ) {
			this.tweens[ key ].stop();
		}

		this.tweens[ key ] = new TWEEN.Tween( obj )
			.to( props, time )
			.onComplete( () => {
				delete this.tweens[ key ];
			} )
			.easing( func );

		return this.tweens[ key ];

	}

	onContinentMouseEnter( continent ) {

		// if already selected, leave as-is
		if ( continent.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED ) {
			return;
		}

		this.setContinentHighlight( continent, Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED );
		this.navigateToContinent(continent);

		// If mouseenter fires after mouseleave,
		// prevent mouseleave behavior (maintain highlight)
		if ( this.mouseLeaveTimeout ) {
			clearTimeout( this.mouseLeaveTimeout );
		}

	}

	navigateToContinent(continent){
		dispatcher.navigate( dispatcher.SECTIONS.CONTINENTS, continent.id );
	}

	onContinentMouseLeave( continent ) {

		// enough time to smoothly roll across a gap from one continent
		// to another without selections flashing on/off
		let mouseLeaveDelay = 80;

		this.mouseLeaveTimeout = setTimeout( () => {
			this.unsetContinentHighlight( continent );
		}, mouseLeaveDelay );

	}

	onContinentClick( continent ) {

		if ( d3.event ) {
			d3.event.stopImmediatePropagation();
		}

		if ( this.mouseLeaveTimeout ) {
			clearTimeout( this.mouseLeaveTimeout );
		}

		this.setInteractive( false );
		dispatcher.navigate( dispatcher.SECTIONS.STATES, continent.id );

	}

	onBackgroundClick() {

		if ( this.mouseLeaveTimeout ) {
			clearTimeout( this.mouseLeaveTimeout );
		}

		dispatcher.navigate( dispatcher.SECTIONS.CONTINENTS );

	}

	unsetContinentHighlight( continent ) {
		let otherHighlightedContinent;
		this.continents.some( (c => {
			if ( c !== continent &&
				(c.highlightLevel === Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED ||
					c.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED) ) {
				otherHighlightedContinent = c;
				return true;
			}
		}) );

		if ( otherHighlightedContinent ) {
			// If there is a highlighted continent other than the event target continent,
			// just unhiglight the event target continent (unless it's selected, then leave as-is)
			let unhighlightLevel = otherHighlightedContinent.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED ? Continent.HIGHLIGHT_LEVELS.UNSELECTED : Continent.HIGHLIGHT_LEVELS.UNHIGHLIGHTED;
			if ( continent && continent.highlightLevel !== Continent.HIGHLIGHT_LEVELS.SELECTED ) {
				continent.highlightLevel = unhighlightLevel;
			}
		} else {
			// Else, turn off all highlights except selected.
			let unhighlightLevel = continent.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED ? Continent.HIGHLIGHT_LEVELS.UNSELECTED : Continent.HIGHLIGHT_LEVELS.NONE;
			this.continents.forEach( c => {
				if ( c.highlightLevel !== Continent.HIGHLIGHT_LEVELS.SELECTED ) {
					c.highlightLevel = unhighlightLevel;
				}
			} );
		}

		this.setLabelStates();
	}

	setContinentHighlight( continent, highlightLevel ) {

		// Set unhighlightLevel based on if any continent highlighted
		let unhighlightLevel;
		if ( highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED || this.continents.some( c => c.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED ) ) {
			unhighlightLevel = Continent.HIGHLIGHT_LEVELS.UNSELECTED;
		} else {
			unhighlightLevel = Continent.HIGHLIGHT_LEVELS.UNHIGHLIGHTED;
		}

		if ( continent ) {
			this.continents.forEach( c => {
				if ( c === continent ) {
					c.highlightLevel = highlightLevel;
				} else {
					// unhighlight all but selected
					if ( c.highlightLevel !== Continent.HIGHLIGHT_LEVELS.SELECTED ) {
						c.highlightLevel = unhighlightLevel;
					}
				}
			} );
		}

		this.setLabelStates();
	}

	/**
	 * labels can have one of three states:
	 * 1 - 'highlighted'
	 * 2 - 'selected'
	 * 3 - 'muted'
	 */
	setLabelStates() {

		if ( !this.labelContainer ) return;

		const somethingSelected = this.continents
			.filter( c => c.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED );

		const somethingHighlighted = this.continents.filter( c => c.highlightLevel === Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED );

		const labels = this.labelContainer.selectAll( '.emotion-label' );

		labels
			.classed( 'highlighted', false )
			.classed( 'muted', false )
			.classed( 'selected', false );

		if ( somethingSelected.length || somethingHighlighted.length ) {
			labels
				.classed( 'muted', d => {
					return d.highlightLevel !== Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED &&
						d.highlightLevel !== Continent.HIGHLIGHT_LEVELS.SELECTED;
				} )
				.classed( 'highlighted', d => d.highlightLevel === Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED )
				//.classed( 'selected', d => d.highlightLevel === Continent.HIGHLIGHT_LEVELS.SELECTED );
				.classed( 'selected', d => d.highlightLevel === Continent.HIGHLIGHT_LEVELS.HIGHLIGHTED );

			// remove default-interactive-helper once user highlights something
			this.labelContainer.select( '.default-interactive-helper' )
				.classed( 'default-interactive-helper', false );
		}
	}

	positionLabelsVertically( d, i, target ) {
		const bottomness = (d.y + d.label.y + this.centerY) / this.centerY;
		if ( bottomness > 1.5 ) {
			// bottom align labels toward bottom of screen, so popups open upwards
			target.style.top = null;
			target.style.bottom = -Math.round( this.centerY + d.y + d.label.y ) + 'px';
		} else {
			// open other popups normally
			target.style.top = Math.round( this.centerY + d.y + d.label.y ) + 'px';
			target.style.bottom = null;
		}

	}

}

