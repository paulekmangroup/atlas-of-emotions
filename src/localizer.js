import strings from '../static/strings.json';

// Return key when string not found.
// TODO: Allow fallback when key not found
function stringForKey(key) {
	if (!strings.hasOwnProperty(key)) return key;
	return strings[key];
}

export default stringForKey;
