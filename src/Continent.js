import _ from 'lodash';
import d3 from 'd3';
import { transform } from 'd3-transform';
import TWEEN from 'tween.js';

import Circle from './Circle.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';
import appStrings from './appStrings.js';

const FRAMERATE = 60;
const MAX_NUM_CIRCLES = 15;
const MAX_NUM_CIRCLES_SMALL = 4;

export default class Continent {

	static HIGHLIGHT_LEVELS = {
		NONE: 0,
		UNSELECTED: 1,
		UNHIGHLIGHTED: 2,
		HIGHLIGHTED: 3,
		SELECTED: 4
	};
	static HIGHLIGHT_ALPHA_MODS = [
		1.0,
		0.25,
		0.5,
		1.5,
		2.0
	];
	static HIGHLIGHT_SPEED_MODS = [
		1.0,
		0.25,
		0.5,
		1.5,
		2.0
	];

	static BASE_TRANSFORMS = [
		{
			// top
			x: 0.02,
			y: -0.20,
			label: {
				x: 0.15,
				y: -0.15
			},
			size: 0.22,
			introSpreadMaxRad: 0.25
		},
		{
			// left-top
			x: -0.17,
			y: -0.16,
			label: {
				x: -0.13,
				y: 0.14
			},
			size: 0.22,
			introSpreadMaxRad: 0.25
		},
		{
			// left-bottom
			x: -0.12,
			y: 0.14,
			label: {
				x: -0.15,
				y: 0.06
			},
			size: 0.22,
			introSpreadMaxRad: 0.25
		},
		{
			// right
			x: 0.19,
			y: 0.00,
			label: {
				x: 0.13,
				y: 0.18
			},
			size: 0.22,
			introSpreadMaxRad: 0.25
		},
		{
			// bottom
			x: 0.02,
			y: 0.21,
			label: {
				x: 0.14,
				y: 0.16
			},
			size: 0.22,
			introSpreadMaxRad: 0.25
		}
	];

	static configsByEmotion = {
		'anger': {
			colorPalette: [
				[ 204, 28, 23 ],
				[ 208, 46, 53 ],
				[ 212, 65, 63 ],
				[ 216, 83, 73 ],
				[ 220, 102, 83 ],
				[ 224, 120, 92 ],
				[ 228, 135, 102 ]
			]
		},
		'disgust': {
			colorPalette: [
				[ 0, 104, 55 ],
				[ 0, 110, 57 ],
				[ 0, 116, 59 ],
				[ 0, 122, 61 ],
				[ 0, 128, 63 ],
				[ 0, 130, 65 ],
				[ 0, 136, 67 ],
				[ 0, 142, 69 ]
			]
		},
		'enjoyment': {
			colorPalette: [
				[ 248, 136, 29 ],
				[ 243, 143, 30 ],
				[ 243, 136, 33 ],
				[ 244, 149, 36 ],
				[ 244, 153, 40 ],
				[ 245, 156, 43 ],
				[ 245, 159, 46 ],
				[ 246, 162, 49 ],
				[ 247, 169, 56 ],
				[ 246, 166, 53 ],
				[ 247, 172, 59 ]
			]
		},
		'fear': {
			colorPalette: [
				[ 143, 39, 139 ],
				[ 156, 41, 153 ],
				[ 196, 49, 194 ],
				[ 209, 51, 207 ],
				[ 223, 53, 221 ],
				[ 235, 56, 234 ],
				[ 248, 58, 248 ]
			]
		},
		'sadness': {
			colorPalette: [
				[ 65, 74, 161 ],
				[ 54, 104, 178 ],
				[ 49, 124, 189 ],
				[ 44, 139, 200 ],
				[ 51, 158, 211 ],
				[ 85, 172, 217 ],
				[ 146, 198, 229 ],
				[ 174, 209, 234 ],
				[ 195, 218, 238 ]
			]
		}
	};

	static transforms;

	constructor( emotion, container, continentGeom, transforms = {}, screenIsSmall ) {

		if ( !Continent.transforms ) {
			Continent.transforms = _.shuffle( Continent.BASE_TRANSFORMS );
		}

		this.screenIsSmall = screenIsSmall;

		this.initInstanceProperties( emotion, container, transforms );
		this.onResize( continentGeom, screenIsSmall );
		this.prepopulate();

	}

	initInstanceProperties( emotion, container, transforms ) {

		let emotionIndex = Object.keys( Continent.configsByEmotion ).indexOf( emotion );
		if ( emotionIndex === -1 ) {
			throw new Error( 'Invalid emotion "' + emotion + '" for continent.' );
		}

		this.id = emotion,
			this.name = emotion.toUpperCase(),
			this.i18nName = appStrings().getStr( `derived.emotions.${ emotion }` );
		this.colorPalette = Continent.configsByEmotion[ emotion ].colorPalette.concat();

		this.spawnConfig = {
			lastSpawn: 0,
			minDelay: (this.screenIsSmall ? 2 : 3) * FRAMERATE,
			freq: this.screenIsSmall ? 0.05 : 0.010
		};

		this.drift = {
			x: 0,
			y: 0,
			sinCtr: Math.random() * 2 * Math.PI,
			cosCtr: Math.random() * 2 * Math.PI
		};

		this.baseTransforms = Object.assign( {}, Continent.transforms[ emotionIndex ], transforms[ emotionIndex ] );

		this.introSpreadRad = 0;
		this.introSpreadSize = 0;

		this.scaleX = 1.0;
		this.scaleY = 1.0;

		this.circles = [];
		this.highlightLevel = Continent.HIGHLIGHT_LEVELS.NONE;
		this.isFocused = false;

		this.d3Selection = container.append( 'g' )
			.classed( 'continent ' + this.id, true )
			.style( 'opacity', 0.0 )
			.datum( this );
		this.d3Selection.transition()
			.duration( sassVars.ui.overlays.duration.in * 1000 )	// match initial appearance of dialogs
			.style( 'opacity', 1.0 );

		this.circleWrapper = this.d3Selection.append( 'g' )
			.classed( 'circle-wrapper', true );

	}

	prepopulate() {

		let numCircles = 0.333 * this.maxNumCircles + Math.floor( Math.random() * 0.666 * this.maxNumCircles );
		for ( let i = 0; i < numCircles; i++ ) {
			let newCircle = Circle.spawn( this, 1, true );
			newCircle.radius = 0.75 + (0.25 * Math.random()) * newCircle.size;
			newCircle.update(
				Continent.HIGHLIGHT_ALPHA_MODS[ this.highlightLevel ],
				Continent.HIGHLIGHT_SPEED_MODS[ this.highlightLevel ] );
			this.circles.push( newCircle );
		}

	}

	update( state, frameCount ) {

		if ( this.tweens ) {
			_.values( this.tweens ).forEach( tween => {
				tween.update( state.time );
			} );
		}

		let newCircle,
			circle,
			alphaMod,
			speedMod,
			scale;

		if ( !this.isFocused ) {

			// probabilistically spawn new Circles
			if ( this.circles.length < this.maxNumCircles ) {
				newCircle = Circle.spawn( this, frameCount );
				if ( newCircle ) {
					this.circles.push( newCircle );
				}
			}

			// set alpha and speed based on interaction
			alphaMod = Continent.HIGHLIGHT_ALPHA_MODS[ this.highlightLevel ];
			speedMod = Continent.HIGHLIGHT_SPEED_MODS[ this.highlightLevel ];

			if ( !this.screenIsSmall ) {
				// apply drift
				this.wander( this.drift, 3 );
			}

		}

		let transX = this.centerX + this.x + this.drift.x,
			transY = this.centerY + this.y + this.drift.y,
			introSizeMod = 1 + (this.introSpreadSize || 0);

		if ( this.introSpreadRad ) {
			transX += this.introSpreadRad * Math.cos( this.introSpreadAng );
			transY += this.introSpreadRad * Math.sin( this.introSpreadAng );
		}

		// work around occasional bug in tween math
		if ( !isNaN( this.scaleX ) ) {
			this.d3Selection
				.attr( 'transform', transform()
					.translate(
						transX,
						transY
					)
					.scale(
						this.scaleX * introSizeMod,
						this.scaleY * introSizeMod
					)
				);
		}

		if ( !this.isFocused ) {

			// update circles
			for ( let i = this.circles.length - 1; i >= 0; i-- ) {
				circle = this.circles[ i ];
				if ( circle.isAlive() ) {
					circle.update( alphaMod, speedMod );
				} else {
					this.circles.splice( i, 1 );
					circle.d3Wrapper.remove();
				}
			}
			;

		}

	}

	onResize( continentGeom, screenIsSmall ) {

		// scale base transforms per continentGeom
		let transformClone = _.cloneDeep( this.baseTransforms );
		transformClone.x *= continentGeom.w;
		transformClone.label.x *= continentGeom.w;
		transformClone.y *= continentGeom.h;
		transformClone.label.y *= continentGeom.h;

		if ( this.screenIsSmall ) {
			transformClone.size *= continentGeom.h * 2;
		} else {
			transformClone.size *= continentGeom.h;
		}

		// and copy onto this Continent instance
		Object.assign( this, transformClone );

		this.introSpreadAng = Math.atan2( this.y, this.x );
		this.centerX = continentGeom.centerX;
		this.centerY = continentGeom.centerY;

		this.screenIsSmall = screenIsSmall;
		this.maxNumCircles = this.screenIsSmall ? MAX_NUM_CIRCLES_SMALL : MAX_NUM_CIRCLES;


		if ( !this.circleHitArea && this.screenIsSmall ) {
			this.circleHitArea = this.d3Selection.insert( 'circle', ':first-child' )
				.style( 'fill', 'white' )
				.style( 'fill-opacity', 0.0 )
				.attr( 'cx', 0 )
				.attr( 'cy', 0 )
				.attr( 'r', transformClone.size );
		}

	}

	addTween( props, time, delay, func = TWEEN.Easing.Linear.None ) {

		if ( !time && !delay ) {
			for ( let key in props ) {
				this[ key ] = props[ key ];
			}
			return;
		}

		if ( !this.tweens ) {
			this.tweens = {};
		}

		let key = Object.keys( props ).sort().join( '-' );
		if ( this.tweens[ key ] ) {
			this.tweens[ key ].stop();
		}

		this.tweens[ key ] = new TWEEN.Tween( this )
			.to( props, time )
			.delay( delay )
			.onComplete( () => {
				delete this.tweens[ key ];
			} )
			.easing( func )
			.start();

	}

	/**
	 * @param    container        SVG node containing all continents
	 * @param    containerScale    Scale that will be applied to this Continent, from continents.focusZoomedOutContinent()
	 */
	spreadCircles( container, containerScale ) {

		// TODO: DRY this out. Most of this math is copied from states.js.

		this.isFocused = true;
		let continent = this;

		// d3 conventional margins
		let margin = {
				right: sassVars.states.graph.margins.right,
				left: sassVars.states.graph.margins.left
			},
			statesGraphWidth = parseFloat( sassVars.states.graph.width.replace( '%', '' ) ) / 100,
			containerBounds = container.getBoundingClientRect(),
			innerWidth = (statesGraphWidth * containerBounds.width - margin.left - margin.right) / containerScale,
			centerOffset = (sassVars.continents.centerX - 0.5) * containerBounds.width / containerScale,
			xScale = d3.scale.linear()
				.domain( [ 0, 10 ] )
				.range( [ -0.5 * innerWidth - centerOffset, 0.5 * innerWidth - centerOffset ] ),
			rScale = d3.scale.linear()
				.domain( [ 0, 10 ] )
				.range( [ 0, innerWidth ] );

		const growTime = sassVars.continents.spread.duration.in * 1000;

		let ranges = this.transformRanges( emotionsData.emotions[ this.id ].states ),
			circles = this.circleWrapper.selectAll( 'circle' )
				.data( ranges, ( d, i ) => i );

		let calcStrokeColor = function ( d, i ) {
			let colorPalette = Continent.configsByEmotion[ continent.id ].colorPalette,
				color = colorPalette[ Math.floor( Math.random() * colorPalette.length ) ].join( ',' );
			return 'rgb(' + color + ')';
		};

		// Move existing circles to positions and sizes corresponding to states
		circles.transition()
			.duration( growTime )
			.attr( 'cx', d => xScale( d.cx ) )
			.attr( 'r', d => rScale( d.r ) )
			.attr( 'stroke', calcStrokeColor )
			.attr( 'stroke-opacity', Circle.BASE_ALPHA )
			.attr( 'stroke-width', d => rScale( d.strokeWidth ) );

		// Add new circles as needed, and fade/grow them in at positions and sizes corresponding to states
		circles.enter().append( 'circle' )
			.attr( 'cx', 0 )
			.attr( 'cy', 0 )
			.attr( 'r', 0 )
			.attr( 'stroke', calcStrokeColor )
			.attr( 'stroke-opacity', Circle.BASE_ALPHA )
			.attr( 'stroke-width', d => rScale( d.strokeWidth ) )
			.transition()
			.duration( growTime )
			.attr( 'cx', d => xScale( d.cx ) )
			.attr( 'r', d => rScale( d.r ) );

		// flatten out the circles wrapper in preparation for
		// displaying states (elevation/profile of continent)
		this.circleWrapper.classed( 'flat', true );

	}

	gatherCircles( immediate ) {

		const growTime = immediate ? 0 : sassVars.continents.spread.duration.out * 1000;

		let ranges = this.transformRanges( emotionsData.emotions[ this.id ].states );

		let calledOnEnd = false,
			circles = this.circleWrapper.selectAll( 'circle' )
				.data( this.circles );

		// transition circles that exist in this.circles back to their original settings
		circles.transition()
			.duration( growTime )
			.attr( 'cx', 0 )
			.attr( 'cy', 0 )
			.attr( 'r', d => d.radius )
			.attr( 'stroke', d => 'rgb(' + d.color + ')' )
			.attr( 'stroke-opacity', d => d.alpha )
			.attr( 'stroke-width', d => d.calcStrokeWidth() )
			.each( 'end', ( ...args ) => {
				if ( !calledOnEnd ) {
					this.isFocused = false;
					calledOnEnd = true;
				}
			} );

		// remove all circles created within spreadCircles that are not present in this.circles
		circles.exit().transition()
			.duration( growTime )
			.ease( 'quad-out' )
			.attr( 'cx', 0 )
			.attr( 'cy', 0 )
			.attr( 'r', 0 )
			.attr( 'stroke-opacity', 0 )
			.remove();

		// unflatten the circles wrapper
		// (after delay, to ensure they're visible so that transition will play correctly)
		setTimeout( () => {
			this.circleWrapper.classed( 'flat', false );
		}, 1 );

	}

	/**
	 * Map emotion ranges into circles of varying stroke widths,
	 * but with locations and sizes matching corresponding state graph.
	 */
	transformRanges( states, emotion, strengthMod = 1.0 ) {

		// TODO: DRY this out. Copied from states.js.
		// Should have a central place to parse emotion data, rather than
		// pulling straight from json and manipulating everywhere it's used.

		// filter out states with invalid ranges
		states = states.filter( state => {
			return !!(state.range.min && state.range.max);
		} );

		// sort by state min value, then max value
		states = states.sort( ( a, b ) => {
			if ( a.range.min < b.range.min ) {
				return -1;
			} else if ( a.range.min > b.range.min ) {
				return 1;
			} else {
				if ( a.range.max < b.range.max ) {
					return -1;
				} else if ( a.range.max > b.range.max ) {
					return 1;
				}
			}
			return 0;
		} );

		let numStates = states.length;
		return states.map( ( state, i ) => {

			let max = state.range.max,
				min = state.range.min - 1,
				halfWidth = 0.5 * (max - min),

			// allow strokeWidth to vary from a half-full circle to a nearly-full circle
				strokeWidth = (0.4 + 0.5 * Math.random()) * halfWidth;

			return {
				cx: min + halfWidth,
				strokeWidth: strokeWidth,

				// To keep total width pegged to state graph xScale,
				// r + 0.5 * strokeWidth must equal halfWidth.
				r: halfWidth - 0.5 * strokeWidth
			};

		} );

	}

	// Randomized sinusoidal motion
	wander( drift, maxDist ) {

		drift.sinCtr += 0.01 + Math.random() * 0.03;
		drift.cosCtr += 0.01 + Math.random() * 0.03;
		drift.x = Math.cos( drift.cosCtr ) * maxDist;
		drift.y = Math.sin( drift.sinCtr ) * maxDist;

	}

	// Random walk
	meander( drift, maxDist ) {

		let maxSpeed = 2 * 0.01 * maxDist;
		let maxTurn = 2 * 0.002 * Math.PI;
		let x = Math.cos( drift.ang ) * drift.dist;
		let y = Math.sin( drift.ang ) * drift.dist;
		let angToCenter = Math.atan2( y, x );

		drift.dist += (-0.5 + Math.random()) * maxSpeed;
		drift.ang += (-0.5 + Math.random()) * maxTurn;

		// normalize angles
		while ( angToCenter < 0 ) {
			angToCenter += 2 * Math.PI;
		}
		while ( drift.ang < 0 ) {
			drift.ang += 2 * Math.PI;
		}
		drift.ang %= 2 * Math.PI;

		// If getting too far away from center, turn back toward center
		if ( drift.dist > 0.5 * maxDist ) {
			drift.ang += 0.1 * (angToCenter - drift.ang);
		}

	}


};
