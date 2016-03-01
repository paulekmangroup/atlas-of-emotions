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

var ANNEX_SECTIONS = [
	'scientific basis',
	'signals',
	'psychopathology',
	'personality trait',
	'partially charted',
	'triggers timeline',
	'impediment-antidote',
	'intrinsic or intentional',
];

var PARSER_CONFIG = {
	'scientific basis': {
		start: [1, 3], // col, row
		parse: function(data) {
			if (!data) return {};

			return {
				title: data[0].title,
				desc: data[0].introduction
			}
		}
	},

	'triggers timeline': {
		start: [[1, 3], [1, 6]], // col, row
		parse: function(data) {
			var rsp = {};
			rsp.content = [];

			data.forEach(function(row) {
				if (row.title) {
					rsp.title = row.title;
					rsp.desc = row.introduction || '';
				} else if (row.text) {
					rsp.content.push({
						txt: row.text,
						id: row.id || null
					});
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
						intentional: row.intentional
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
				} else if (row['associated diagnoses'] && row['diagnoses description']) {
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
							desc: row['diagnoses description']
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
				if (row.title && row.introduction) {
					rsp.title = row.title;
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

	about: {
		start: [[1, 3], [1, 6]], // col, row
		parse: function (data) {
			var rsp = {};
			rsp.subsections = [];

			data.forEach(function(row) {
				if (row.title && row.introduction) {
					rsp.title = row.title;
					rsp.desc = row.introduction;
				} else if (row.subhead) {
					rsp.subsections.push({
						title: row.subhead,
						desc: row.text
					});
				}
			});

			return rsp;
		}
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

function slugify(text)
{
  return text.toString()
  	.toLowerCase()
  	.trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

/**
 * Main routine for this script, called from menu item in onOpen.
 * Customize this function as needed for your data structure.
 */
function exportAll (e) {

	var ss = SpreadsheetApp.getActiveSpreadsheet(),
		sheetName,
		parsedSheets = ss.getSheets().reduce(function (acc, sheet) {
			sheetName = sheet.getName().toLowerCase().trim();
			if (PARSER_CONFIG[sheetName]) {
				var parsedObj = parse(sheetName, sheet);
				if (ANNEX_SECTIONS.indexOf(sheetName) > -1) {
					acc.annex[slugify(sheetName)] = parsedObj;
				} else {
					acc[slugify(sheetName)] = parsedObj;
				}
			}

			return acc;
		}, {
			annex: {}
		});

	var json = JSON.stringify(parsedSheets, null, 2);
	return outputExportedData(json);

}

function isEmptyRow(row) {
	return (row.join('')).length < 1
}

function parse(name, sheet) {
  var config = PARSER_CONFIG[name];
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
