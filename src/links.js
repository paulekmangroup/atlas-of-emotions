import _ from 'lodash';

import appStrings from './appStrings.js';
import sassVars from '../scss/variables.json';
import ContinentsSection from './continents';
import dispatcher from './dispatcher';


// https://player.vimeo.com/video/110383723?title=0&byline=0&portrait=0

class LinksSection extends ContinentsSection {
	init( containerNode, screenIsSmall ){
		console.log('init section links')
		super.init( containerNode, screenIsSmall );
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
