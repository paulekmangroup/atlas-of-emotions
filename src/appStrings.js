import _ from 'lodash';
import fetch from 'isomorphic-fetch';
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
 * @param  {[type]} _lang                  Language code (ISO 639-1)
 * @param  {[type]} _screenIsSmall         Request mobile or desktop strings
 */
function appStrings (_lang, _screenIsSmall, _stringsLoadedCallback) {

	let strings = langs[_lang];

	function getStr (key) {

		// Strings not yet loaded; fail silently
		if (!strings) return '';

		let path = key.split('.'),
			source = path.splice(0, 1)[0];
		source =
			source === 'emotionsData' ? emotionsData :
			source === 'secondaryData' ? secondaryData :
			null;

		if (!source) throw new Error(`Invalid source specified at key '${ key }'`);

		if (_screenIsSmall) {

			// append '_mobile' to all paths that support it,
			// as implemented in googleSheetsExporter.js
			// and GSE-secondaryPages.js
			let lastPathSegment = path[path.length - 1];
			switch (lastPathSegment) {
				case 'header':
				case 'body':
				case 'name':
				case 'desc':
					path[path.length - 1] = lastPathSegment + '_mobile';
			}

		}

		let parsedKey = _.get(source, path.join('.')),
			parsedValue;

		// this weirdness is an artifact of implementing localization long after the content spreadsheets and parsers were all set up.
		// if future you is cut+pasting this, you can probably eliminate this block and just `return strings[parsedKey]`.
		//
		// -->>	TODO: only running nested parsing on emotionsData for now,
		// 		until secondaryData also has keys.
		if (source === emotionsData) {
			if (typeof parsedKey === 'string') {
				parsedValue = strings[parsedKey];
			} else if (Array.isArray(parsedKey)) {
				parsedValue = parsedKey.map((k, i) => {
					let pathPrefix = `${ key }[${ i }].`;
					if (typeof k === 'string') return getStr(pathPrefix + k);
					else if (typeof k === 'object') {
						// localize nested objects
						return Object.keys(k).reduce((acc, k1) => {
							acc[k1] = getStr(pathPrefix + k1);
							return acc;
						}, {});
					}
				});
			} else if (typeof parsedKey === 'object') {
				// pass through non-nested objects as-is
				parsedValue = parsedKey;
			} else {
				throw new Error(`Key not found at ${ key }`);
			}
		}

		// fall back to returning parsed key or empty string
		return parsedValue || parsedKey || '';

	}

	function lang (val) {
		return val ? (_lang = val) : _lang;
	}

	function screenIsSmall (val) {
		return val ? (_screenIsSmall = val) : _screenIsSmall;
	}

	function loadStrings () {

		if (strings) return Promise.resolve(instance);
		else {
			return fetch(`./strings/langs/${ _lang }.json`)
				.then(response => response.json())
				.then(json => strings = json
						.reduce((acc, worksheet) => acc.concat(worksheet), [])
						.reduce((acc, kv) => {
							acc[kv.key] = kv.value;
							return acc;
						}, {}))
				.catch(() => {
					throw new Error(`Language ${ _lang } not supported, or language file is malformed.`);
				});
		}

	}

	instance = {
		getStr,
		lang,
		screenIsSmall,
		loadStrings
	};

	loadStrings();

	return instance;

}

export default function (_lang, _screenIsSmall, _stringsLoadedCallback) {

	if (!instance ||
		((_lang && instance.lang() !== _lang) || (_screenIsSmall && instance.screenIsSmall() !== _screenIsSmall))) {

		appStrings(_lang, _screenIsSmall, _stringsLoadedCallback);
	}

	return instance;

}