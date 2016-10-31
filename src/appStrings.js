import _ from 'lodash';
import fetch from 'isomorphic-fetch';
// import strings from '../static/strings.json';
import emotionsData from '../static/emotionsData.json';
import secondaryData from '../static/secondaryData.json';

// maintain state and make globally accessible.
// yeah, a little dirty, but good enough for this use case.
let instance;
let langs = [];

/**
 * Load an arbitrary string from the Google Sheets that back this application.
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

		// NOTE: until localization is complete, this may return an array/obj instead of a string,
		// depending on whether the passed path resolves to a leaf node or a branch.
		// will have to figure this out for localization as well,
		// and be sure to rename appStrings / getStr() if necessary (appData / getData()?)
		let parsedKey = _.get(source, path.join('.')) || null;

		if (typeof parsedKey === 'string') {
			return strings[parsedKey];
		} else if (Array.isArray(parsedKey)) {
			return parsedKey;
		} else if (typeof parsedKey === 'object') {
			return parsedKey;
		} else {
			throw new Error(`Key not found at ${ key }`);
		}

		// fall back to returning parsed key or empty string
		return parsedKey || '';

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
				.then(json => strings = json.reduce((acc, kv) => {
					acc[kv.key] = kv.value;
					return acc;
				}, {}));
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