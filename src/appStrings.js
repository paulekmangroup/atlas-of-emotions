import _ from 'lodash';
import fetch from 'isomorphic-fetch';
import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import secondaryData from '../static/secondaryData.json';

// maintain state and make globally accessible.
// yeah, a little dirty, but good enough for this use case.
let instance;
let langs = [];

/**
 * Utility for loading an arbitrary string or set of strings
 * from the Google Sheets that back this application.
 * Note that strings files per language are loaded at runtime
 * and are not guaranteed to be loaded when a `getStr()` call is made;
 * it's up to the application to call loadStrings() and safely request strings
 * only after the returned Promise is resolved.
 *
 * @param  {[type]} _lang                  Two-character language code (ISO 639-1)
 * @param  {[type]} _screenIsSmall         Request mobile or desktop strings
 */
function appStrings( _lang, _screenIsSmall, _stringsLoadedCallback ) {

	let strings = langs[ _lang ],
		derivedStrings;

	function getStr( key, failQuietly ) {

		// Strings not yet loaded; fail silently
		if ( !strings ) return '';

		let path = key.split( '.' ),
			source = path.splice( 0, 1 )[ 0 ];

		if ( source === 'derived' ) return _.get( derivedStrings, path.join( '.' ) );

		source =
			source === 'emotionsData' ? emotionsData :
				source === 'secondaryData' ? secondaryData :
					null;

		if ( !source ) throw new Error( `Invalid source specified at key '${ key }'` );

		if ( _screenIsSmall ) {

			// append '_mobile' to all paths that support it,
			// as implemented in googleSheetsExporter.js
			// and GSE-secondaryPages.js
			let lastPathSegment = path[ path.length - 1 ];
			switch ( lastPathSegment ) {
				case 'header':
				case 'body':
				case 'name':
				case 'desc':
				case 'title':
					path[ path.length - 1 ] = lastPathSegment + '_mobile';
			}

		}

		let parsedKey = _.get( emotionsData, path.join( '.' ) ),
			parsedValue;

		// if the key exists in emotionsData.json,
		// then use it, whether this key-value was originally in emotionsData or secondaryData.
		// we're moving everything from secondaryData into emotionsData, tab-by-tab.
		if ( parsedKey ) {
			source = emotionsData;
		} else if ( source === secondaryData ) {
			parsedKey = _.get( source, path.join( '.' ) );
		}

		// this weirdness is an artifact of implementing localization long after the content spreadsheets and parsers were all set up.
		// only running nested parsing on emotionsData;
		// secondaryData will eventually be phased into emotionsData and will all run through this block,
		// but until then, we leave secondaryData strings alone.
		if ( source === emotionsData ) {
			if ( typeof parsedKey === 'string' || typeof parsedKey === 'boolean' ) {
				parsedValue = strings[ parsedKey ];
			} else if ( Array.isArray( parsedKey ) ) {
				parsedValue = parsedKey.map( ( k, i ) => {
					let pathPrefix = `${ key }[${ i }]`;
					if ( typeof k === 'string' ) {
						if ( isNaN( k ) ) {
							return strings[ k ];//getStr(pathPrefix + k); //FIXME why was it like this?
						} else {
							return k; // FIXME there are numbers stored as strings in the emotions data...
						}
					} else if ( Array.isArray( k ) ) {
						return k.map( ( kk, j )=>getStr( `${ pathPrefix }[${ j }]` ) );
					} else if ( typeof k === 'object' ) {
						// localize nested objects
						return Object.keys( k ).reduce( ( acc, k1 ) => {
							acc[ k1 ] = getStr( pathPrefix + '.' + k1 );
							return acc;
						}, {} );
					}
				} );
			} else if ( typeof parsedKey === 'object' ) {
				if ( key.split( '.' )[ 0 ] === 'secondaryData' || key.split( '.' )[ 0 ] === 'emotionsData' ) {
					// recursively parse nested objects in secondary data (more info / annex / etc)
					parsedValue = Object.keys( parsedKey ).reduce( ( acc, k ) => {
						if ( typeof parsedKey[ k ] == 'number' ) {
							acc[ k ] = parsedKey[ k ];
						} else {
							acc[ k ] = getStr( `${ key }.${ k }` );
						}
						return acc;
					}, {} );
				} else {
					// pass through non-nested objects in metadata / emotions tabs as-is
					parsedValue = parsedKey;
				}
			} else {
				if ( failQuietly ) {
					return '';
				} else {
					throw new Error( `Key not found at ${ key }` );
				}
			}
		}


		// fall back to returning parsed key or empty string
		return parsedValue || parsedKey || '';

	}

	function getSecondaryDataBlock( page ) {

		let withinAnnex = page.substr( 0, 6 ) === 'annex-';
		if ( withinAnnex ) page = page.slice( 6 );

		// wrap results in an object that each more-page expects
		let out = {
			[page]: getStr( `secondaryData${ withinAnnex ? '.annex' : '' }.${ page }` )
		};
		return withinAnnex ? { annex: out } : out;

	}

	function lang( val ) {
		return val ? (_lang = val) : _lang;
	}

	function screenIsSmall( val ) {
		return val ? (_screenIsSmall = val) : _screenIsSmall;
	}

	function loadStrings() {

		if ( strings ) return Promise.resolve( instance );
		else {
			return fetch( `strings/langs/${ _lang }.json`,
				{ credentials: 'same-origin' }	// needed on studio to pass .htaccess login creds to same-origin requests
			)
				.then( response => response.json() )
				.then( json => {
					strings = json
						.reduce( ( acc, worksheet ) => acc.concat( worksheet ), [] )
						.reduce( ( acc, kv ) => {
							acc[ kv.key ] = kv.value;
							return acc;
						}, {} );

					cacheDerivedStrings();
				} )
				.catch( () => {
					throw new Error( `Language ${ _lang } not supported, or language file is malformed.` );
				} );
		}

	}

	// This is all AoE-specific, for strings derived from the loaded+parsed content
	// that don't have their own data structure within the content.
	function cacheDerivedStrings() {

		derivedStrings = {
			emotions: _.values( dispatcher.EMOTIONS ).reduce( ( acc, emotion ) => {
				acc[ emotion ] = strings[ `${ emotion }_continent_header` ];
				return acc;
			}, {} ),
			sections: _.values( dispatcher.SECTIONS ).reduce( ( acc, section ) => {
				acc[ section ] = strings[ `${ section }_section_name` ];
				return acc;
			}, {} )
		};

	}

	instance = {
		getStr,
		getSecondaryDataBlock,
		lang,
		screenIsSmall,
		loadStrings
	};

	loadStrings();

	return instance;

}

export default function ( _lang, _screenIsSmall, _stringsLoadedCallback ) {

	if ( !instance ||
		((_lang && instance.lang() !== _lang) || (_screenIsSmall && instance.screenIsSmall() !== _screenIsSmall)) ) {

		appStrings( _lang, _screenIsSmall, _stringsLoadedCallback );
	}

	return instance;

}