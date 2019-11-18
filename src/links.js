import _ from 'lodash';

import appStrings from './appStrings.js';
import sassVars from '../scss/variables.json';
import ContinentsSection from './continents';
import Continent from './Continent.js';
import dispatcher from './dispatcher';


// https://player.vimeo.com/video/110383723?title=0&byline=0&portrait=0

class LinksSection extends ContinentsSection {
	init( containerNode, screenIsSmall ){
		console.log('init section links')
		super.init( containerNode, screenIsSmall );
		this.continentContainer
			.append('defs')
			.append('pattern')
			.attr('id','preview-1')
			.attr('patternUnits','objectBoundingBox')
			.attr('height','1')
			.attr('width','1')
			.attr('x','0')
			.attr('y','0')

			.append('image')
			.attr('x','0')
			.attr('y','0')
			.attr('height','480')
			.attr('width','480')
			.attr('xlink:href', 'http://atlasofemotions.org/img/hhAndEve.jpg')
			.attr('preserveAspectRatio', 'xMinYMin slice');

		for(const continent of this.continents) {
			this.circleImageArea = continent.d3Selection.insert( 'circle', ':first-child' )
				.classed('image-circle', true)
				.style( 'fill', 'url(#preview-1)' )
				.style( 'fill-opacity', 0.5 )
				.attr( 'cx', 0 )
				.attr( 'cy', 0 )
				.attr( 'r', Continent.BASE_TRANSFORMS[0].size*1000 );
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
