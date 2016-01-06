/**
 * Parse Final Atlas Content spreadsheet into JSON for consumption by Atlas application.
 * This script is currently installed alongside the spreadsheet, but instructions for use are as follows:
 * 1. Open Google spreadsheet.
 * 2. Click Tools > Script Editor.
 * 3. Paste this code into a new file in the Script Editor and save it.
 * 4. An "Export to JSON" menu item should now be available on the spreadsheet (refresh the page if not).
 * 5. Click Export to JSON > Export all sheets to JSON.
 * 6. Copy + paste the resulting JSON into emotionsData.json and rebuild the project.
 */

/**
 * Atlas Of Emotions-specific constants.
 */
var LABELS = {
	METADATA: {

	},
	EMOTIONS: {
		CONTINENT: 'continent',
		STATES: 'states',
		ACTIONS: 'actions',
		TRIGGERS: 'triggers',
		MOODS: 'moods'
	}
};

/**
 * Add toolbar menu to export to JSON.
 */
function onOpen () {

	var ss = SpreadsheetApp.getActiveSpreadsheet();
	var menuEntries = [
		{
			name: "Export all sheets to JSON",
			functionName: "exportAll"
		}
	];
	ss.addMenu("Export to JSON", menuEntries);

}

/**
 * Main routine for this script, called from menu item in onOpen.
 * Customize this function as needed for your data structure.
 */
function exportAll (e) {

	var ss = SpreadsheetApp.getActiveSpreadsheet(),
		sheetName,
		parsedSheets = ss.getSheets().reduce(function (acc, sheet) {
			sheetName = sheet.getName().toLowerCase();
			if (sheetName === 'metadata') {
				acc.metadata = parseMetadataSheet(sheet);
			} else {
				acc.emotions[sheetName] = parseEmotionSheet(sheet);
			}
			return acc;
		}, {
			emotions: {}
		});

	var json = JSON.stringify(parsedSheets, null, 2);
	return outputExportedData(json);

}

/**
 * Atlas Of Emotions-specific parsing.
 */
function parseMetadataSheet (sheet) {

	// top-left (1-indexed) of valid data in sheet
	var DATA_START_COL = 2,
		DATA_START_ROW = 3;

	// walk down the section labels column,
	// aggregate all rows in each section, and parse.
	var labelsColumn = sheet.getSheetValues(DATA_START_ROW, DATA_START_COL, -1, 1);
	var labelValue,
		currentLabel,
		metadata = {},
		sectionData = [];

	for (var j=0; j<labelsColumn.length; j++) {

		labelValue = labelsColumn[j][0];
		if (labelValue) { labelValue = labelValue.toLowerCase(); }

		if (labelValue && labelValue !== currentLabel) {
			if (currentLabel) {
				// parse everything aggregated up to this next label,
				// if a parser exists; else, discard aggregated data.
				if (metadataSectionParsers[currentLabel]) {
					metadata[currentLabel] = metadataSectionParsers[currentLabel](sectionData);
				}
			}
			currentLabel = labelValue;
			sectionData = [];
		}

		// aggregate this row's data into sectionData
		sectionData.push(sheet.getSheetValues(DATA_START_ROW + j, DATA_START_COL + 1, 1, -1)[0]);

	};

	// parse everything left over
	metadata[currentLabel] = metadataSectionParsers[currentLabel](sectionData);

	return metadata;

}

/**
 * Atlas Of Emotions-specific parsing.
 */
var metadataSectionParsers = (function () {

	var standard = function (data) {
		return data.map(function (row) {
			return {
				header: row[0],
				body: row[1]
			};
		});
	};

	return {

		intro: standard,

		continents: standard,

		states: standard,

		actions: standard,

		triggers: function (data) {
			var obj = {
				header: data[0][0],
				body: data[0][1]
			};
			obj.steps = data.map(function (row) {
				return {
					header: row[2],
					body: row[3]
				};
			});

			return obj;
		},

		moods: function (data) {
			// explicitly limit list length to allow adding notes at the bottom of the spreadsheet
			var NUM_MOOD_DATA = 1;
			return standard(data).slice(0, NUM_MOOD_DATA);
		}

	};

})();

/**
 * Atlas Of Emotions-specific parsing.
 */
function parseEmotionSheet (sheet) {

	// top-left (1-indexed) of valid data in sheet
	var DATA_START_COL = 2,
		DATA_START_ROW = 3;

	// walk down the emotion section labels column,
	// aggregate all rows in each section, and parse.
	var labelsColumn = sheet.getSheetValues(DATA_START_ROW, DATA_START_COL, -1, 1);
	var labelValue,
		currentLabel,
		emotionData = {},
		sectionData = [];

	for (var j=0; j<labelsColumn.length; j++) {

		labelValue = labelsColumn[j][0];
		if (labelValue) { labelValue = labelValue.toLowerCase(); }

		if (labelValue && labelValue !== currentLabel) {
			if (currentLabel) {
				// parse everything aggregated up to this next label,
				// if a parser exists; else, discard aggregated data.
				if (emotionSectionParsers[currentLabel]) {
					emotionData[currentLabel] = emotionSectionParsers[currentLabel](sectionData);
				}
			}
			currentLabel = labelValue;
			sectionData = [];
		}

		// aggregate this row's data into sectionData
		sectionData.push(sheet.getSheetValues(DATA_START_ROW + j, DATA_START_COL + 1, 1, -1)[0]);

	};

	// parse everything left over
	emotionData[currentLabel] = emotionSectionParsers[currentLabel](sectionData);

	return emotionData;

}

/**
 * Atlas Of Emotions-specific parsing.
 */
var emotionSectionParsers = (function () {

	var standard = function (data) {
		return data.map(function (row) {
			return {
				name: row[0],
				desc: row[1]
			};
		});
	};

	return {

		continent: standard,

		states: function (data) {
			return data.map(function (row) {
				var con = (row[2].split(',') || []).map(function (val) { return val.trim().toLowerCase(); }),
					des = (row[3].split(',') || []).map(function (val) { return val.trim().toLowerCase(); }),
					both = [],
					all = con.concat(),
					range = row[4].replace(/\s+/g, '').split('-');

				des.forEach(function (val) {
					if (~all.indexOf(val)) {
						both.push(val);
					} else {
						all.push(val);
					}
				});

				return {
					name: row[0],
					desc: row[1],
					range: {
						min: parseInt(range[0]),
						max: parseInt(range[1])
					},
					actions: {
						all: all,
						con: con,
						des: des,
						both: both
					}
				};
			});
		},

		actions: standard,

		triggers: function (data) {
			return data.map(function (row) {
				return row[0];
			});
		},

		moods: function (data) {
			// explicitly limit list length to allow adding notes at the bottom of the spreadsheet
			var NUM_MOOD_DATA = 1;
			return standard(data).slice(0, NUM_MOOD_DATA);
		}

	};

})();

/**
 * Output parsed sheets for consumption by end user.
 */
function outputExportedData (data) {

	// TODO: save to file instead of displaying in text box
	displayText(data);

}

/**
 * Display arbitrary text in a modal.
 */
function displayText (text) {

	var app = UiApp.createApplication().setTitle('Exported JSON');
	app.add(makeTextBox(app, 'json'));
	app.getElementById('json').setText(text);

	var ss = SpreadsheetApp.getActiveSpreadsheet(); 
	ss.show(app);
	return app; 

}

/**
 * Generate textfield.
 */
function makeTextBox (app, name) { 

	// var textArea = app.createTextArea().setWidth('100%').setHeight('200px').setId(name).setName(name);
	var textArea = app.createTextArea().setWidth('100%').setHeight('100%').setId(name).setName(name);
	return textArea;

}