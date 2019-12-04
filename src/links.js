import ContinentsSection from './continents';
import dispatcher from './dispatcher';

// https://player.vimeo.com/video/110383723?title=0&byline=0&portrait=0

class LinksSection extends ContinentsSection {
	init( containerNode, screenIsSmall ){
		const keys = Object.keys( dispatcher.EMOTIONS );

		var imageUrls = [
			'img/hhAndEve.jpg',
			'img/eve-meditation.png',
			'img/google-io.png',
			'img/ceb-logo.png',
			'img/UCSF-talk.png'
		];

		var imageElements = [];

		super.init( containerNode, screenIsSmall );
		var defs = this.continentContainer
			.append( 'defs' );

		for (var i=0;i<keys.length;i++) {
			imageElements[dispatcher.EMOTIONS[keys[i]]] =
				defs.append( 'pattern' )
					.attr( 'id', 'background-' + dispatcher.EMOTIONS[keys[i]] )
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
					.attr( 'xlink:href', imageUrls[i] );
		}

		for(const c of this.continents) {
			(function(continent) {
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
				continent.d3Selection.select('.circle-wrapper').attr('style', 'opacity:0.5;');
				const superUpdate = continent.update.bind(continent);
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
					imageElements[continent.id]
						.attr('height', max*2)
						.attr('width', max*2);
				};
			})(c);
		}

	}
	initMobileElements( containerNode, labelContainer ) {
	}
	hrefAccessor(d){ return ''; };
	popupAccessor(d){ return `links${dispatcher.HASH_DELIMITER}${d.id}`; };
	initLabels(){ console.log('init labels in links'); };//linksSection.initLabels.bind(linksSection);
	navigateToContinent( continent ) {
		console.log('navigate to continent override');
	}
}
const linksSection = new LinksSection();
export default linksSection;
