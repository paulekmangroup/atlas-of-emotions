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

	// top-left (0-indexed) of valid data in sheet
	var DATA_START_COL = 1,
		DATA_START_ROW = 2;

	// walk down the section labels column,
	// aggregate all rows in each section, and parse.
	var labelsColumn = sheet.getSheetValues(DATA_START_COL, DATA_START_ROW, -1, 1);
	Logger.log("metadata labelsColumn:", labelsColumn);
	var labelValue,
		currentLabel,
		metadata = {},
		sectionData = [];

	for (var j=0; j<labelsColumn.length; j++) {

		labelValue = labelsColumn[j][0];
		Logger.log("metadata labelValue:", labelValue);
		if (labelValue) { labelValue = labelValue.toLowerCase(); }

		if (labelValue && labelValue !== currentLabel) {
			// parse everything aggregated up to this next label
			metadata[labelValue] = sectionParsers[labelValue](sectionData);
			currentLabel = labelValue;
		} else {
			// aggregate this row's data into sectionData
			sectionData.push(sheet.getSheetValues(DATA_START_COL + 1, j, -1)[0]);
		}
	};

	return metadata;

}

/**
 * Atlas Of Emotions-specific parsing.
 */
var metadataSectionParsers = {

	default: function (data) {
		return data.map(function (row) {
			return {
				name: row[0],
				desc: row[1]
			};
		});
	},

	continents: this.default,

	states: this.default,

	actions: this.default,

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
	},

	moods: this.default

};

/**
 * Atlas Of Emotions-specific parsing.
 */
function parseEmotionSheet (sheet) {

	// top-left (0-indexed) of valid data in sheet
	var DATA_START_COL = 1,
		DATA_START_ROW = 2;

	// walk down the emotion section labels column,
	// aggregate all rows in each section, and parse.
	var labelsColumn = sheet.getSheetValues(DATA_START_COL, DATA_START_ROW, -1, 1);
	Logger.log("emotion labelsColumn:", labelsColumn);
	var labelValue,
		currentLabel,
		emotionData = {},
		sectionData = [];

	for (var j=0; j<labelsColumn.length; j++) {

		labelValue = labelsColumn[j][0];
		Logger.log("emotion labelValue:", labelValue);
		if (labelValue) { labelValue = labelValue.toLowerCase(); }

		if (labelValue && labelValue !== currentLabel) {
			// parse everything aggregated up to this next label
			emotionData[labelValue] = emotionSectionParsers[labelValue](sectionData);
			currentLabel = labelValue;
		} else {
			// aggregate this row's data into sectionData
			sectionData.push(sheet.getSheetValues(DATA_START_COL + 1, j, -1)[0]);
		}
	};

	return emotionData;

}

/**
 * Atlas Of Emotions-specific parsing.
 */
var emotionSectionParsers = {

	continent: function (data) {
		return data.map(function (row) {
			return {
				name: row[0],
				desc: row[1]
			};
		});
	},

	states: function (data) {
		return data.map(function (row) {
			var con = (row[2] || []).map(function (val) { return val.toLowerCase(); }),
				des = (row[3] || []).map(function (val) { return val.toLowerCase(); }),
				all = con.concat();

			des.forEach(function (val) {
				if (!~all.indexOf(val)) {
					all.push(val);
				}
			});

			return {
				name: row[0],
				desc: row[1],
				actions: {
					all: all,
					con: con,
					des: des
				}
			};
		});
	},

	actions: function (data) {
		return data.map(function (row) {
			return {
				name: row[0],
				desc: row[1]
			};
		});
	},

	triggers: function (data) {
		return data.map(function (row) {
			return row[0];
		});
	},

	moods: function (data) {
		return data.map(function (row) {
			return {
				name: row[0],
				desc: row[1]
			};
		});
	}

};

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