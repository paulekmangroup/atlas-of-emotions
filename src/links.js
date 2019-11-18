import _ from 'lodash';

import appStrings from './appStrings.js';
import sassVars from '../scss/variables.json';
import continents from './continents.js';
import dispatcher from './dispatcher';


// https://player.vimeo.com/video/110383723?title=0&byline=0&portrait=0


const linksSection = _.clone( continents );

linksSection.initMobileElements = function ( containerNode, labelContainer ) {
};
linksSection.hrefAccessor = function(d){ return ''; };
linksSection.popupAccessor = function(d){ return `links${dispatcher.HASH_DELIMITER}${d.id}`; };
linksSection.initLabels = function(){};//linksSection.initLabels.bind(linksSection);

export default linksSection;
