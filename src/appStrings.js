import _ from 'lodash';
// import strings from '../static/strings.json';
import emotionsData from '../static/emotionsData.json';
import secondaryData from '../static/secondaryData.json';

// maintain state and make globally accessible.
// yeah, a little dirty, but good enough for this use case.
let instance;

function appStrings (_lang, _screenIsSmall) {

	function getStr (key) {

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

		console.log(">>>>> ", _.get(source, path.join('.')));

		return _.get(source, path.join('.')) || '';

		// TODO: implement localization
		// if (!strings.hasOwnProperty(key)) return key;
		// return strings[key];	// fallback to key itself, if value not found

	}

	function lang (val) {
		return val ? (_lang = val) : _lang;
	}

	function screenIsSmall (val) {
		return val ? (_screenIsSmall = val) : _screenIsSmall;
	}

	instance = {
		getStr,
		lang,
		screenIsSmall,
	};

	return instance;

}

export default function (_lang, _screenIsSmall) {
	return instance ? instance : appStrings(_lang, _screenIsSmall);
}