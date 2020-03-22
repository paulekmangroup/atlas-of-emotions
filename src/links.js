import ContinentsSection from './continents';
import dispatcher from './dispatcher';
import d3 from 'd3';
import appStrings from './appStrings';

// TODO port this to translated strings
const labelLinks = {
	anger: {
		href: 'https://www.youtube.com/watch?v=AaDzUFL9CLE',
		text: 'Science of the Atlas',
		description: 'A presentation at the University of California San Francisco on designing Emotional Awareness with Drs. Paul and Eve Ekman'
	},
	fear: {
		href: 'https://youtu.be/Nv-fs7Y3Zic',
		text: 'Transforming Emotion Meditation',
		description: 'Eve Ekman leading a meditation on Emotion Awareness'
	},
	sadness: {
		href: 'http://cultivating-emotional-balance.org/',
		text: 'Cultivate Emotional Balance',
		description: 'Cultivating Emotional Balance, a training  requested by the Dalai Lama in 2000 and created by  Paul Ekman, Alan Wallace, and lead by Eve Ekman and Ryan Redman'
	},
	disgust: {
		href: 'https://youtu.be/qlBMqFxUu8A',
		text: 'AOE In:bodied',
		description: 'An interview about the Atlas of Emotions Inbodied sound installation at Google IO'
	},
	enjoyment: {
		href: 'https://player.vimeo.com/video/110383723?title=0&byline=0&portrait=0',
		text: 'Paul Ekman and HHDL on Destructive Emotions',
		description: 'A library of dialog between Paul Ekman and His Holiness the Dalai Lama on emotion awareness'
	}
};
const imageUrls = [
	'img/UCSF-talk.png',
	'img/eve-meditation.png',
	'img/inbodied.png',
	'img/ceb-logo-480.png',
	'img/hhAndPaul-bw.jpg',
];


class LinksSection extends ContinentsSection {

	init( containerNode, screenIsSmall ) {
		const keys = Object.keys( dispatcher.EMOTIONS );

		var imageElements = [];

		super.init( containerNode, screenIsSmall );
		var defs = this.continentContainer
			.append( 'defs' );

		for ( var i = 0; i < keys.length; i++ ) {
			imageElements[ dispatcher.EMOTIONS[ keys[ i ] ] ] =
				defs.append( 'pattern' )
					.attr( 'id', 'background-' + dispatcher.EMOTIONS[ keys[ i ] ] )
					.attr( 'patternUnits', 'objectBoundingBox' )
					.attr( 'height', '1' )
					.attr( 'width', '1' )
					.attr( 'x', '0' )
					.attr( 'y', '0' )

					.append( 'image' )
					.attr( 'x', '0' )
					.attr( 'y', '0' )
					.attr( 'height', '480' )
					.attr( 'width', '480' )
					.attr( 'preserveAspectRatio', 'xMinYMin slice' )
					.attr( 'xlink:href', imageUrls[ i ] );
		}

		for ( const c of this.continents ) {
			(function ( continent ) {
				const circleImageArea = continent.d3Selection.insert( 'circle', ':first-child' )
					.classed( 'image-circle', true )
					.style( 'fill', function ( d, i ) {
						return `url(#background-${d.id})`;
					} )
					.style( 'fill-opacity', 0.5 )
					.attr( 'cx', 0 )
					.attr( 'cy', 0 )
					.attr( 'r', function ( d ) {
						return continent.size;
					} );
				continent.d3Selection.select( '.circle-wrapper' ).attr( 'style', 'opacity:0.5;' );
				const superUpdate = continent.update.bind( continent );
				continent.update = function ( state, frameCount ) {
					superUpdate( state, frameCount );
					let max = 0;
					for ( let i = continent.circles.length - 1; i >= 0; i-- ) {
						let circle = continent.circles[ i ];
						if ( circle.isAlive() ) {
							max = Math.max( max, circle.radius + circle.sw / 2 );
						}
					}
					circleImageArea.attr( 'r', max );
					imageElements[ continent.id ]
						.attr( 'height', max * 2 )
						.attr( 'width', max * 2 );
				};
			})( c );
		}
	}

	initMobileElements( containerNode, labelContainer ) {
	}

	hrefAccessor( d ) {
		return '';
	};

	popupAccessor( d ) {
		return `links${dispatcher.HASH_DELIMITER}${d.id}`;
	};

	changePopup( emotion, desc ) {
		dispatcher.popupChange( 'links', emotion, desc );
	}

	onContinentClick( continent ) {
		if ( d3.event ) {
			d3.event.stopImmediatePropagation();
		}

		if ( this.mouseLeaveTimeout ) {
			clearTimeout( this.mouseLeaveTimeout );
		}

		window.open( labelLinks[ continent.id ].href, '_blank' );
	}

	onBackgroundClick() {
		if ( this.mouseLeaveTimeout ) {
			clearTimeout( this.mouseLeaveTimeout );
		}
	}

	getPopupDescription(emotion){
		return emotion ? labelLinks[emotion].description : null;
	}

	initLabels( labelContainer ) {
		let labels = labelContainer.selectAll( '.emotion-label' )
			.data( this.continents, d => d.id );

		labelContainer.selectAll( '.emotion-label' )
			.classed( 'links-emotion-label', true );

		if ( this.screenIsSmall ) {
			labels.style( 'display', 'none' );
			return;
		}
		const positionLabelsVertically = this.positionLabelsVertically.bind( this );
		const positionLabelsHorizontally = this.positionLabelsHorizontally.bind( this );
		let labelsEnter = labels.enter()
			.append( 'div' )
			.attr( 'class', d => `emotion-label links-emotion-label ${d.id}` )
			.attr( 'data-popuptarget', d => this.popupAccessor( d ) )
			.classed( 'default-interactive-helper', d => d.name.toLowerCase() === this.defaultEmotionHelper.toLowerCase() )
			.each( function ( d, i ) {
				positionLabelsVertically( d, i, this ); // function's this, not class
				positionLabelsHorizontally( d, i, this );
			} );

		labelsEnter.append( 'a' )
			.attr( 'href', d => labelLinks[ d.id ].href )
			.attr( 'target', '_blank' )
			.append( 'h3' )
			.text( d => labelLinks[ d.id ].text );

	};
	navigateToContinent( continent ) {
		dispatcher.navigate( dispatcher.SECTIONS.LINKS, continent.id );
		d3.select(continent.d3Selection[0][0].parentNode).append(()=>continent.d3Selection.remove().node());
	}
}

const linksSection = new LinksSection();
export default linksSection;
