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



// ---------------------------------------------------------------------------- //
// SETUP / ENTRY
// ---------------------------------------------------------------------------- //

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

	var emotionsDataSheets = [
		'anger',
		'fear',
		'sadness',
		'disgust',
		'enjoyment'
	];

	var ss = SpreadsheetApp.getActiveSpreadsheet(),
		sheetName,
		parsedSheets = ss.getSheets().reduce(function (acc, sheet) {
			sheetName = sheet.getName().toLowerCase().trim();
			if (sheetName === 'metadata') {
				acc.metadata = parseMetadataSheet(sheet);
			} else if (~emotionsDataSheets.indexOf(sheetName)) {
				acc.emotions[sheetName] = parseEmotionSheet(sheet);
			} else if (SECONDARY_PARSER_CONFIG[sheetName]) {
				var parsedObj = parseSecondary(sheetName, sheet);
				if (ANNEX_SECTIONS.indexOf(sheetName) > -1) {
					acc.annex[slugify(sheetName)] = parsedObj;
				} else {
					acc[slugify(sheetName)] = parsedObj;
				}
			}
			return acc;
		}, {
			emotions: {}
		});

	var json = JSON.stringify(parsedSheets, null, 2);
	return outputExportedData(json);

}

function parseSecondary (name, sheet) {

	var config = SECONDARY_PARSER_CONFIG[name];
	var rows = [];
	var ranges = (config.start[0].length) ? config.start : [config.start];
	ranges.forEach(function(start, j){
		var next = ranges[j + 1];
		var endRow = (next) ? next[1] - 1 : sheet.getLastRow();
		var range = sheet.getRange(start[1], start[0], endRow - (start[1] - 1), sheet.getLastColumn() - (start[0] - 1));
		var values = range.getValues();
		var headers = values[0];
		var len = values.length;

		for (var i=1; i<len; i++) {
			var row = values[i];
			if (!isEmptyRow(row)) {
				var obj = {};
				headers.forEach(function(header, k){
					obj[header.toLowerCase()] = row[k];
				});
				rows.push(obj);
			}
		}
	});

	return config.parse(rows);

}

// ---------------------------------------------------------------------------- //
// ATLAS OF EMOTIONS-SPECIFIC PARSING
// ---------------------------------------------------------------------------- //

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

var metadataSectionParsers = (function () {

	var standard = function (data) {
		return {
			header: data[0][0],
			body: data[0][1],
			header_mobile: data[0][5] || data[0][0],
			body_mobile: data[0][6] || data[0][1],
			sectionName: data[0][7]
		};
	};

	return {

		site: standard,

		intro: function (data) {
			var obj = {
				header: data[0][0],
				body: data[0][1],
				header_mobile: data[0][5] || data[0][0],
				body_mobile: data[0][6] || data[0][1],
				sectionName: data[0][7]
			};
			obj.steps = data.map(function (row) {
				return {
					header: row[2],
					body: row[3],
					header_mobile: row[2],
					body_mobile: row[3],
					caption: row[4]
				};
			});

			return obj;
		},

		continents: standard,

		states: standard,

		actions: function (data) {
			var obj = {
				header: data[0][0],
				body: data[0][1],
				header_mobile: data[0][5] || data[0][0],
				body_mobile: data[0][6] || data[0][1],
				sectionName: data[0][7]
			};
			obj.qualities = data.map(function (row) {
				return {
					header: row[2],
					body: row[3],
					header_mobile: row[5] || row[2],
					body_mobile: row[6] || row[3]
				};
			});

			return obj;
		},

		triggers: function (data) {
			var obj = {
				header: data[0][0],
				body: data[0][1],
				header_mobile: data[0][5] || data[0][0],
				body_mobile: data[0][6] || data[0][1],
				sectionName: data[0][7]
			};
			obj.steps = data.map(function (row) {
				return {
					header: row[2],
					body: row[3],
					header_mobile: row[5] || row[2],
					body_mobile: row[6] || row[3]
				};
			});

			return obj;
		},

		moods: standard,

		calm: function (data) {
			return {
				header: data[0][0],
				body: data[0][1],
				caption: data[0][4],
				header_mobile: data[0][5] || data[0][0],
				body_mobile: data[0][6] || data[0][1],
				sectionName: data[0][7],
				secondary: {
					header: data[0][2],
					body: data[0][3],
					header_mobile: data[0][5] || data[0][2],
					body_mobile: data[0][6] || data[0][3]
				}
			};
		},

		more: function (data) {
			return {
				caption: data[0][4]
			};
		}

	};

})();

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

var emotionSectionParsers = (function () {

	var standard = function (data) {
		return data.map(function (row) {
			return {
				name: row[0],
				desc: row[1],
				name_mobile: row[5] || row[0],
				desc_mobile: row[6] || row[1]
			};
		});
	};

	return {

		continent: function (data) {
			return standard(data)[0];
		},

		states: function (data) {
			return data.filter(function (row) {
				return !!row[0];
			}).map(function (row) {
				// Logger.log("row len:" + row.length + "; row[0]:" + row[0]);
				var con = (String(row[2]).split(',') || []).map(function (val) { return val.trim().toLowerCase(); }),
					des = (String(row[3]).split(',') || []).map(function (val) { return val.trim().toLowerCase(); }),
					both = [],
					all = con.concat(),
					range = String(row[4]).replace(/\s+/g, '').split('-');

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
					name_mobile: row[5] || row[0],
					desc_mobile: row[6] || row[1],
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
				return {
					name: row[0],
					type: row[1],
					name_mobile: row[5] || row[0],
					desc_mobile: row[6] || row[1]
				};
			});
		},

		moods: function (data) {
			// explicitly limit list length to allow adding notes at the bottom of the spreadsheet
			var NUM_MOOD_DATA = 1;
			return standard(data).slice(0, NUM_MOOD_DATA);
		}

	};

})();

var ANNEX_SECTIONS = [
	'scientific basis',
	'signals',
	'psychopathology',
	'personality trait',
	'partially charted',
	'triggers timeline',
	//'impediment-antidote',
	'intrinsic or intentional',
];

var SECONDARY_PARSER_CONFIG = {
	'scientific basis': {
		start: [[1, 3],[1, 6],[1,9],[1,26]], // col, row
		parse: function(data) {
			if (!data) return {};

          var scientific = {};
          scientific.content = [];
          scientific.footer = [];

			data.forEach(function(row) {
				if (row.title) {
					scientific.title = row.title;
					scientific.desc = row.introduction || '';
				} else if (row.surveydata) {
					scientific.content.push({
						desc: row.surveyquestion,
						name: row.surveydata.toString() || null,
						formatting: row.formatting
					});
                } else if (row.survey) {
                  scientific.contentIntro = row.survey;
                } else if (row.footer) {
                  scientific.footer.push(row.footer)
                }
			});

		return scientific;
        }
	},

	'triggers timeline': {
		start: [[1, 3], [1, 6], [1,29]], // col, row
		parse: function(data) {
			var rsp = {};
			rsp.content = [];
            rsp.footer = [];

			data.forEach(function(row) {
				if (row.title) {
					rsp.title = row.title;
					rsp.desc = row.introduction || '';
				} else if (row.text) {
					rsp.content.push({
						desc: row.text,
						name: row.id || null
					});
                } else if (row.footer) {
                  rsp.footer.push(row.footer)
                }
			});

			return rsp;
		}
	},

	'impediment-antidote': {
		start: [[1, 3], [1, 6]], // col, row
		parse: function(data) {
			var rsp = {};
			rsp.emotions = [];

			var currentEmotion, antidotes, impediments;
			data.forEach(function(row) {
				if (row.title && row.introduction) {
					rsp.title = row.title;
					rsp.desc = row.introduction;

				} else if (row['state name']) {
					if (row.emotion && currentEmotion !== row.emotion) {
						currentEmotion = row.emotion;
						antidotes = {};
						impediments = {};
						antidotes.name = row.emotion + ' Antidotes';
						impediments.name = row.emotion + ' Impediments';
						antidotes.children = [];
						impediments.children = [];
						rsp.emotions.push(antidotes);
						rsp.emotions.push(impediments);
					}

					if (antidotes && row.antidote) {
						antidotes.children.push({
							name: row['state name'],
							desc: row.antidote
						});
					}

					if (impediments && row.impediment) {
						impediments.children.push({
							name: row['state name'],
							desc: row.impediment
						});
					}
				}
			});

			return rsp;
		}
	},

	'intrinsic or intentional': {
		start: [[1, 3], [1, 6]], // col, row
		parse: function(data) {
			var rsp = {};
			rsp.emotions = [];

			var obj;
			data.forEach(function(row) {
				if (row.title && row.introduction) {
					rsp.title = row.title;
					rsp.desc = row.introduction;
				} else if (row.name) {
					obj = {}
					obj.name = row.name;
					obj.children = [];

					obj.children.push({
						name: 'Intrinsic',
						desc: row.intrinsic
					});

					obj.children.push({
						name: 'Intentional',
						desc: row.intentional
					});

					rsp.emotions.push(obj);
				}
			});

			return rsp;
		}
	},


	'partially charted': {
		start: [[1, 3], [1, 6]], // col, row
		parse: function(data) {
			var rsp = {};
			rsp.emotions = [];

			data.forEach(function(row) {
				if (row.title && row.introduction) {
					rsp.title = row.title;
					rsp.desc = row.introduction;
				} else if (row['emotion name'] && row.description) {
					rsp.emotions.push({
						name: row['emotion name'],
						desc: row.description
					});
				}
			});

			return rsp;
		}
	},

	'signals': {
		start: [[1, 3], [1, 6]], // col, row
		parse: function(data) {
			var rsp = {};
			rsp.emotions = [];

			var currentName, obj;
			data.forEach(function(row) {
				if (row.title && row.introduction) {
					rsp.title = row.title;
					rsp.desc = row.introduction;
				} else if (row.message && row.signal) {
					if (row.name && (!currentName || currentName !== row.name)) {
						currentName = row.name;
						obj = {};
						obj.name = row.name;
						obj.desc = null;
						obj.children = [];
						rsp.emotions.push(obj);
					}

					if (obj) {
						obj.children.push({
							name: 'Signal',
							desc: row.signal
						});

						obj.children.push({
							name: 'Message',
							desc: row.message
						});
					}
				}
			});

			return rsp;
		}
	},

	'psychopathology': {
		start: [[1, 3], [1, 6]], // col, row
		parse: function(data) {
			var rsp = {};
			rsp.emotions = [];

			var currentName, obj;
			data.forEach(function(row) {
				if (row.title && row.introduction) {
					rsp.title = row.title;
					rsp.desc = row.introduction;
				} else if (row['associated diagnoses'] && row['description of diagnoses']) {
					if (row.name && (!currentName || currentName !== row.name)) {
						currentName = row.name;
						obj = {};
						obj.name = row.name;
						obj.desc = row.description;
						obj.children = [];
						rsp.emotions.push(obj);
					}
					if (obj) {
						obj.children.push({
							name: row['associated diagnoses'],
							desc: row['description of diagnoses']
						});
					}
				}
			});

			return rsp;
		}
	},

	'personality trait': {
		start: [[1, 3], [1, 6]], // col, row
		parse: function(data) {
			var rsp = {};
			rsp.emotions = [];

			data.forEach(function(row) {
				if (row.title && row.introduction) {
					rsp.title = row.title;
					rsp.desc = row.introduction;
				} else if (row.name && row.description) {
					rsp.emotions.push({
						name: row.name,
						desc: row.description
					})
				}
			});

			return rsp;
		}
	},

	'further reading': {
		start: [[1, 3], [1, 6]], // col, row
		parse: function(data) {
			var rsp = {};
			rsp.links = [];

			data.forEach(function(row) {
				if (row.introduction) {
                  rsp.title = row.title ? row.title : ' ';
					rsp.desc = row.introduction;
				} else if (row.link && row['link text']) {
					rsp.links.push({
						link: row.link,
						desc: row['link text']
					});
				}
			});

			return rsp;
		}
	},

	donate: {
		start: [1, 3], // col, row
		parse: function (data) {
			var rsp = {
				title: data[0].title,
				desc: data[0].text,
				link: data[0].link,
				imgs: []
			};

			data.forEach(function(row) {
				if (row.image) {
					rsp.imgs.push(row.image);
				}
			});

			return rsp;
		}
	},

    emotrak: {
		start: [[1, 2], [1, 5]], // col, row
		parse: function (data) {
			var rsp = {};
			rsp.subsections = [];

			data.forEach(function(row) {
				if (row.introduction) {
                  rsp.title = row.title ? row.title : '';
					rsp.desc = row.introduction;
					rsp.header_mobile = row['mobile alt header'];
					rsp.body_mobile = row['mobile alt body'];
					rsp.sectionName = row['section name'];
					rsp.sectionName_mobile = row['section name'];
				} else if (row.text) {
					rsp.subsections.push({
                      title: row.subhead ? row.subhead : '',
					  desc: row.text,
                      title_mobile: row.subhead ? row.subhead : '',
					  desc_mobile: row.text,
                      image: row.image ? row.image : null,
                      mail: row.mail ? row.mail : null
					});
				}
			});

			return rsp;
		}
	},

	about: {
		start: [[1, 3], [1, 6]], // col, row
		parse: function (data) {
			var rsp = {};
			rsp.subsections = [];

			data.forEach(function(row) {
				if (row.title && row.introduction) {
					rsp.title = row.title;
					rsp.desc = row.introduction;
					rsp.title_mobile = row['mobile alt header'];
					rsp.desc_mobile = row['mobile alt body'];
					rsp.sectionName = row['section name'];
					rsp.sectionName_mobile = row['section name'];
				} else if (row.subhead) {
					rsp.subsections.push({
						title: row.subhead,
						desc: row.text,
						title_mobile: row.subhead,
						desc_mobile: row.text
					});
				}
			});

			return rsp;
		}
	}
};



// ---------------------------------------------------------------------------- //
// UTILITIES
// ---------------------------------------------------------------------------- //

function slugify (text) {
  return text.toString()
  	.toLowerCase()
  	.trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}


function isEmptyRow(row) {
	return (row.join('')).length < 1;
}

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