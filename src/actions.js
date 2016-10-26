import d3 from 'd3';
import textures from 'textures';
import _ from 'lodash';

import dispatcher from './dispatcher.js';
import appStrings from './appStrings.js';
import sassVars from '../scss/variables.json';
import states from './states.js';

const VALENCES = {
	CONSTRUCTIVE: 1,
	BOTH: 2,
	DESTRUCTIVE: 3,
	NONE: 4
};

const ARROW_SHAPE = [
	{ x: 0.0, y: 0.0 },
	{ x: 0.75, y: -0.01 },
	{ x: 1.0, y: 0 },
	{ x: 0.75, y: 0.01 },
	{ x: 0.0, y: 0.0 }
];

const GRAMMAR_TRANSLATE = {
	suppress: 'suppression',
	quarrel: 'quarreling',
	insult: 'insulting others',
	'scream/yell': 'screaming or yelling',
	'simmer/brood': 'simmering or brooding',
	undermine: 'undermining others',
	dispute: 'disputing',
	'be passive-aggressive': 'being passive-aggressive',
	'use physical force': 'using physical force',
	'feel ashamed': 'feeling ashamed',
	'mourn': 'mourning',
	'protest': 'protesting',
	'ruminate': 'ruminating',
	'seek comfort': 'seeking comfort',
	'withdraw': 'withdrawing',
	'avoid': 'avoiding',
	'dehumanize': 'dehumanizing',
	'vomit': 'vomiting',
	'hesitate': 'hestitation',
	'worry': 'worrying',
	'withdraw': 'withdrawing',
	'ruminate': 'ruminating',
	'freeze': 'freezing',
	'exclaim': 'exclaiming',
	'engage/connect': 'engaging or connecting',
	'gloat': 'gloating',
	indulge: 'indulging',
	'maintain': 'maintaining',
	'savor': 'savoring',
	'seek more': 'seeking more'
};

export default {

	isInited: false,
	screenIsSmall: false,
	currentEmotion: null,
	actionsData: null,
	backgroundSections: [ states ],

	labelContainers: null,
	graphContainers: null,
	valenceTextures: null,
	mouseOutTimeout: null,
	randomLabelPositions: {},


	init: function (containerNode, screenIsSmall) {

		this.sectionContainer = containerNode;

		this.screenIsSmall = screenIsSmall;

		this.actionsData = this.parseActions();

		this.initContainers(containerNode);

		this.initLabels(containerNode);

		this.setUpGraphs(containerNode);

		this.scaledLineGenerator = this.scaledLineGenerator.bind(this);
		this.arcTween = this.arcTween.bind(this);
		this.onActionMouseOver = this.onActionMouseOver.bind(this);
		this.onActionMouseOut = this.onActionMouseOut.bind(this);
		this.onActionMouseClick = this.onActionMouseClick.bind(this);
		// this.onValenceMouseOver = this.onValenceMouseOver.bind(this);
		// this.onValenceMouseOut = this.onValenceMouseOut.bind(this);
		// this.onValenceMouseClick = this.onValenceMouseClick.bind(this);

		// dispatcher.addListener(dispatcher.EVENTS.POPUP_CLOSE_BUTTON_CLICKED, this.onPopupCloseButtonClicked.bind(this));

		this.isInited = true;

	},

	initContainers: function (containerNode) {

		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			let actionsContainer = document.createElement('div');
			actionsContainer.classList.add('actions-container');
			actionsContainer.classList.add(emotion);

			let graphContainer = document.createElement('div');
			graphContainer.classList.add('graph-container');
			actionsContainer.appendChild(graphContainer);

			containerNode.appendChild(actionsContainer);

		});

	},

	initLabels: function (containerNode) {

		this.labelContainers = {};
		_.values(dispatcher.EMOTIONS).forEach(emotion => {

			let container = d3.select('.' + emotion + '.actions-container'),
				labelContainer = container.append('div')
					.classed('label-container', true);

			this.labelContainers[emotion] = labelContainer;

		});

	},

	setUpGraphs: function (containerNode) {

		//
		// d3 conventional margins
		//
		let margin = {
			top: sassVars.actions.margins.top,		// actions graph is upside down, so 'top' means bottom of the screen
			right: this.screenIsSmall ? 95 : 100,
			bottom: sassVars.actions.margins.bottom,
			left: this.screenIsSmall ? 95 : 100
		};

		// All the same size, just grab the first one
		let graphContainer = containerNode.querySelector('.graph-container'),
			innerWidth = graphContainer.offsetWidth - margin.left - margin.right,
			h = Math.max(graphContainer.offsetHeight, 0.5 * graphContainer.offsetWidth),
			innerHeight = h - margin.top - margin.bottom;


		//
		// d3/svg setup
		//
		let section = this,
			transformedHeight = Math.sqrt(3) / 2 * innerHeight,	// from rotateX(60deg) applied to #action-graph-container
			radius = this.screenIsSmall ?
				innerWidth :
				Math.min(0.5 * innerWidth, transformedHeight * 0.75);	// TODO: revisit this magic number munging to keep everything on-screen

		this.lineGenerator = d3.svg.line.radial()
			.radius(d => d.x * radius)
			.angle(d => 2*Math.PI * (1 - d.y))
			.interpolate('cardinal');

		this.pieLayout = d3.layout.pie()
			.sort(null)
			.value(d => d.size)
			.startAngle(0.5 * Math.PI)
			.endAngle(1.5 * Math.PI);

		this.arcGenerator = d3.svg.arc()
			.innerRadius(0)
			.outerRadius(radius);

		//
		// Set up each graph,
		// or update if already set up (on resize)
		//
		if (!this.graphContainers) {

			this.graphContainers = {};
			this.valenceTextures = {};
			_.values(dispatcher.EMOTIONS).forEach((emotion, i) => {

				let graphContainer = document.querySelector('#actions .' + emotion + ' .graph-container');

				let svg = d3.select(graphContainer).append('svg')
					.attr('width', graphContainer.offsetWidth)
					.attr('height', h);

				let graph = svg.append('g')
					.attr('transform', 'translate(' + (margin.left + 0.5 * innerWidth) + ',' + margin.top + ')');

				// TODO: remove if we end up not using textures
				let valenceTextures = {};
				/*
				valenceTextures[VALENCES.CONSTRUCTIVE] = textures.circles()
					.complement()
					.heavier(0.85)
					.stroke('black');
				valenceTextures[VALENCES.BOTH] = textures.circles()
					.complement()
					.stroke('black');
				valenceTextures[VALENCES.DESTRUCTIVE] = textures.circles()
					.complement()
					.lighter(0.85)
					.stroke('black');
				*/
				valenceTextures[VALENCES.CONSTRUCTIVE] = textures.lines()
					.thinner(0.85)
					.orientation('6/8')
					.stroke('black');
				valenceTextures[VALENCES.BOTH] = textures.lines()
					.orientation('4/8')
					.stroke('black');
				valenceTextures[VALENCES.DESTRUCTIVE] = textures.lines()
					.thicker(0.85)
					.orientation('2/8')
					.stroke('black');

				_.values(valenceTextures).forEach(t => {
					svg.call(t);
				});

				/*
				graph.append('g')
					.classed('valences', true);
				*/

				this.valenceTextures[emotion] = valenceTextures;

				this.graphContainers[emotion] = graph;

			});

			// create an <svg> solely for <defs> shared across all emotions via xlink:href
			let defsSvg = d3.select(containerNode).append('svg')
				.classed('actions-defs', true);
			this.setUpDefs(defsSvg.append('defs'), radius);

		} else {

			_.values(dispatcher.EMOTIONS).forEach((emotion, i) => {

				let graphContainer = document.querySelector('#actions .' + emotion + ' .graph-container');

				let svg = d3.select(graphContainer).select('svg')
					.attr('width', graphContainer.offsetWidth)
					.attr('height', h);

				let graph = svg.select('g')
					.attr('transform', 'translate(' + (margin.left + 0.5*innerWidth) + ',' + margin.top + ')');

			});

		}

	},

	scaledLineGenerator: function (selection, scale) {

		return selection.attr('d', d =>
			this.lineGenerator(d.paths.map(path =>
				({
					x: path.x * scale,
					y: path.y * scale
				})
			))
		);

	},

	// from: http://bl.ocks.org/mbostock/1346410
	arcTween: function (selection) {
		let arc = this.arcGenerator;
		selection.attrTween('d', function (a) {
			let i = d3.interpolate(this._current, a);
			this._current = i(0);
			return function (t) {
				return arc(i(t));
			};
		});
	},

	parseActions: function () {

		let lowercase = str => { return str.toLowerCase(); };

		let actionsData = Object.keys(dispatcher.EMOTIONS).reduce((actionsOutput, emotionKey) => {

			let emotionName = dispatcher.EMOTIONS[emotionKey],
				statesData = appStrings().getStr(`emotionsData.emotions.${ emotionName }.states`);

			// copy list of all actions for emotion with lowercased names, and alpha sort
			let allActionsForEmotion = appStrings().getStr(`emotionsData.emotions.${ emotionName }.actions`).map(action => {
				return Object.assign({}, action, {
					name: action.name.toLowerCase()
				});
			}).sort((a, b) => {
				if (a.name < b.name) return -1;
				else if (a.name > b.name) return 1;
				else return 0;
			});

			if (emotionName === dispatcher.EMOTIONS.ANGER) {
				// move first and last actions out of pole position
				// because they're too long to fit there comfortably
				allActionsForEmotion.splice(1, 0, allActionsForEmotion.shift());
				allActionsForEmotion.splice(-1, 0, allActionsForEmotion.pop());
			} else if (emotionName === dispatcher.EMOTIONS.ENJOYMENT) {
				// move first action out of pole position
				// because it's too long to fit there comfortably
				allActionsForEmotion.splice(1, 0, allActionsForEmotion.shift());
			}

			// add additional data for each of allActionsForEmotion,
			// and compile hash keyed by name for lookup below
			let allActionsForEmotionByName = {},
				numAllActions = allActionsForEmotion.length;
			allActionsForEmotion.forEach((action, i) => {
				action.paths = ARROW_SHAPE.map(pt => ({
					x: pt.x,
					y: pt.y
				}));
				action.states = [];

				// arrange actions between 10° and 170°
				action.rotation = (100 + (numAllActions-i-1) * 160/(numAllActions-1));

				allActionsForEmotionByName[action.name] = action;
			});

			// iterate over states for each emotion and compile actions for each state.
			let actionsByState = statesData.reduce((statesOutput, state) => {

				let stateName = state.name.toLowerCase();

				// copy actions from source data and lowercase,
				// dedupe across valences and filter out any that do not have prototypical definitions,
				// alpha sort within valence
				let actionsBoth = state.actions.both.map(lowercase).filter(action => {
						return !!allActionsForEmotionByName[action];
					}).sort(),
					actionsCon = state.actions.con.map(lowercase).filter(action => {
						return !!allActionsForEmotionByName[action] &&
							!~state.actions.both.indexOf(action);
					}).sort(),
					actionsDes = state.actions.des.map(lowercase).filter(action => {
						return !!allActionsForEmotionByName[action] &&
							!~state.actions.both.indexOf(action);
					}).sort(),

					// count number of actions within each valence
					numActionsCon = actionsCon.length,
					numActionsBoth = actionsBoth.length,
					numActionsDes = actionsDes.length,

					// concatenate deduped and sorted actions into a single list
					// (in order of left-to-right display on-screen)
					allActionsForState = actionsCon.concat(actionsBoth).concat(actionsDes),
					numAllActionsForState = allActionsForState.length;

				let actionByName,
					action;
				allActionsForState = allActionsForState.map((actionName, i) => {

					// copy prototypical action name/description
					actionByName = allActionsForEmotionByName[actionName];
					action = {
						name: actionByName.name,
						desc: actionByName.desc
					};

					// calculate paths and rotation
					action.paths = ARROW_SHAPE.map(pt => ({
						x: pt.x,
						y: pt.y
					}));
					// arrange actions between 10° and 170°
					action.rotation = (100 + (numAllActionsForState-i-1) * 160/(numAllActionsForState-1));

					// determine valence based on earlier sorting
					if (i < numActionsCon) {
						action.valence = VALENCES.CONSTRUCTIVE;
					} else if (i < numActionsCon + numActionsBoth) {
						action.valence = VALENCES.BOTH;
					} else if (i < numActionsCon + numActionsBoth + numActionsDes) {
						action.valence = VALENCES.DESTRUCTIVE;
					}

					// attach state name
					action.state = state.name;

					// cross-reference states to action
					if (!~actionByName.states.indexOf(stateName)) {
						actionByName.states.push(stateName);
					}

					return action;

				});

				// calculate weight for each valence for this state's action
				let valenceWeights = Object.keys(VALENCES).map(valenceName => ({
					name: valenceName,
					size: valenceName === 'CONSTRUCTIVE' ? numActionsCon :
							valenceName === 'BOTH' ? numActionsBoth :
							valenceName === 'DESTRUCTIVE' ? numActionsDes : 0
				})).reverse();
				// subtract 0.5 from the first and last size,
				// to place the drawn boundary halfway between adjacent action arrows
				let firstNonEmptyWeight,
					lastNonEmptyWeight;
				valenceWeights.forEach(weight => {
					if (weight.size) {
						if (!firstNonEmptyWeight) {
							firstNonEmptyWeight = weight;
						} else {
							lastNonEmptyWeight = weight;
						}
					}
				});
				if (firstNonEmptyWeight) {
					firstNonEmptyWeight.size -= 0.5;
				}
				if (lastNonEmptyWeight) {
					lastNonEmptyWeight.size -= 0.5;
				}

				statesOutput[state.name.toLowerCase()] = {
					actions: allActionsForState,
					valenceWeights: valenceWeights
				};

				return statesOutput;

			}, {});


			actionsOutput[emotionName] = {
				allActions: allActionsForEmotion,
				actions: actionsByState
			};

			return actionsOutput;

		}, {});

		return actionsData;

	},

	// TODO: DRY this out, copied almost exactly from states.js
	// set up global gradients and xlink:href to them from here and states.js
	setUpDefs: function (defs, radius) {

		// base gradient
		defs.append('linearGradient')
			.attr('id', 'actions-gradient')
			.attr('gradientUnits', 'userSpaceOnUse')
			.attr('x1', 0)
			.attr('x2', 0)
			.attr('y1', 0)
			.attr('y2', -radius);

		// anger
		defs.append('linearGradient')
			.attr('id', 'actions-anger-gradient')
			.attr('xlink:href', '#actions-gradient')
		.selectAll('stop')
			.data([
				{ offset: '20%', color: 'rgba(228, 135, 102, 0.2)' },
				{ offset: '100%', color: 'rgba(204, 28, 43, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// disgust
		defs.append('linearGradient')
			.attr('id', 'actions-disgust-gradient')
			.attr('xlink:href', '#actions-gradient')
		.selectAll('stop')
			.data([
				{ offset: '20%', color: 'rgba(0, 142, 69, 0.3)' },
				{ offset: '66%', color: 'rgba(0, 122, 61, 0.8)' },
				{ offset: '100%', color: 'rgba(0, 104, 55, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// enjoyment
		defs.append('linearGradient')
			.attr('id', 'actions-enjoyment-gradient')
			.attr('xlink:href', '#actions-gradient')
		.selectAll('stop')
			.data([
				{ offset: '20%', color: 'rgba(241, 196, 83, 0.8)' },
				{ offset: '100%', color: 'rgba(248, 136, 29, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// fear
		defs.append('linearGradient')
			.attr('id', 'actions-fear-gradient')
			.attr('xlink:href', '#actions-gradient')
		.selectAll('stop')
			.data([
				{ offset: '20%', color: 'rgba(248, 58, 248, 0.1)' },
				{ offset: '100%', color: 'rgba(143, 39, 139, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

		// sadness
		defs.append('linearGradient')
			.attr('id', 'actions-sadness-gradient')
			.attr('xlink:href', '#actions-gradient')
		.selectAll('stop')
			.data([
				{ offset: '20%', color: 'rgba(200, 220, 240, 1.0)' },
				{ offset: '66%', color: 'rgba(30, 152, 211, 1.0)' },
				{ offset: '100%', color: 'rgba(64, 70, 164, 1.0)' }
			])
		.enter().append('stop')
			.attr('offset', d => d.offset)
			.attr('stop-color', d => d.color);

	},

	setEmotion: function (emotion) {

		return new Promise((resolve, reject) => {

			if (!~_.values(dispatcher.EMOTIONS).indexOf(emotion)) {
				emotion = 'anger';
			}
			let previousEmotion = this.currentEmotion;
			this.currentEmotion = emotion;

			// deselect anything selected.
			// currently only happens on mobile, but might also want to happen on desktop...
			// TODO: evaluate ^^.
			if (this.screenIsSmall) {
				this.setHighlightedAction(null);
			}

			// transition graphs and labels
			let dx = 0;
			if (previousEmotion) {
				let previousContainer = d3.select('.actions-container.' + previousEmotion);
				previousContainer.classed('active', false);
				previousContainer.on('transitionend', event => {
					previousContainer.on('transitionend', null);
					previousContainer.style('transform', null);
					previousContainer.style('-webkit-transform', null);
					previousContainer.classed('transitioning', false);
				});

				let containerWidth = document.querySelector('#actions .graph-container').offsetWidth,
					emotions = _.values(dispatcher.EMOTIONS);

				// just place left or right one viewport, instead of adhering to column positions,
				// to avoid animations that are unnecessarily fast'n'flashy.
				dx = 1.25 * containerWidth;
				if (emotions.indexOf(emotion) < emotions.indexOf(previousEmotion)) {
					dx *= -1;
				}
				// switch for going from enjoyment to anger, and back
				if (Math.abs(emotions.indexOf(emotion) - emotions.indexOf(previousEmotion)) == emotions.length - 1){
					dx *= -1;
				}

				// delay to allow a little time for opacity to come up before translating
				setTimeout(() => {
					previousContainer.style('transform', 'translateX(' + -dx + 'px)');
					previousContainer.style('-webkit-transform', 'translateX(' + -dx + 'px)');
				}, sassVars.emotions.panX.delay * 1000);
			}

			let currentContainer = d3.select('.actions-container.' + emotion);
			if (currentContainer.classed('transitioning')) {
				// if new emotion is still transitioning, remove transitionend handler
				currentContainer.on('transitionend', null);
			} else {
				// else, move into position immediately to prepare for transition
				currentContainer.classed('transitioning', false);
				currentContainer.style('transform', 'translateX(' + dx + 'px)');
				currentContainer.style('-webkit-transform', 'translateX(' + dx + 'px)');
			}

			// delay to allow a little time for opacity to come up before translating
			setTimeout(() => {
				currentContainer.classed('transitioning active', true);
				currentContainer.style('transform', 'translateX(0)');
				currentContainer.style('-webkit-transform', 'translateX(0)');
			}, sassVars.emotions.panX.delay * 1000);

			if (!this.isBackgrounded) {
				// activate states if not backgrounded, and on desktop
				if (!this.screenIsSmall) states.setActive(true);
			} else {
				// remove labels if backgrounded
				this.renderLabels(null, true);
			}

			let openDelay = 1500;
			this.setStateTimeout = setTimeout(() => {
				dispatcher.setEmotionState(states.selectedState, true);
			}, this.isBackgrounded ? 0 : openDelay);

			// resolve on completion of primary transitions
			let resolveDelay;
			if (previousEmotion) {
				// resolve after horizontal transition completes
				resolveDelay = (sassVars.emotions.panX.delay + sassVars.emotions.panX.duration) * 1000;
			} else {
				// resolve after backgrounded elements complete their transitions
				resolveDelay = sassVars.states.backgrounded.duration.in;
			}
			setTimeout(() => {
				resolve();
			}, resolveDelay);

		});

	},

	setState: function (state) {

		if (!this.isBackgrounded) {
			this.setHighlightedAction(null);
		}

		// remove this since now might keep state from actions
		// if (state && state === this.currentState) { return; }

		// if transitioning from null selection to null selection, then skip transition

		this.currentState = state;

		if (!this.currentEmotion) return;

		let stateActionsData,
			currentActionsData;

		if (state) {

			stateActionsData = this.actionsData[this.currentEmotion].actions[this.currentState];
			if (!stateActionsData) {
				console.warn('No actions found for state "' + this.currentState + '" in emotion "' + this.currentEmotion + '".');
				return;
			}
			currentActionsData = stateActionsData.actions;

		} else {

			currentActionsData = this.actionsData[this.currentEmotion].allActions;

		}

		let emotionGradientName = 'actions-' + this.currentEmotion + '-gradient',
			valenceTextureSet = this.valenceTextures[this.currentEmotion],
			graphContainer = this.graphContainers[this.currentEmotion];

		let arrowSelection = graphContainer.selectAll('g.action-arrow')
			.data(currentActionsData, d => d.name);

		// update
		arrowSelection
			.classed({
				'constructive': d => d.valence === VALENCES.CONSTRUCTIVE,
				'both': d => d.valence === VALENCES.BOTH,
				'destructive': d => d.valence === VALENCES.DESTRUCTIVE
			});
		/*
		.select('path.texture-fill')
			.attr('opacity', d => d.valence ? 0.10 : 0.0)
			.attr('fill', d => d.valence ? valenceTextureSet[d.valence].url() : null);
		*/
		arrowSelection.transition()
			.duration(sassVars.actions.update.time)
			.attr('transform', d => 'rotate(' + d.rotation + ')');

		// enter
		let arrowEnterSelection = arrowSelection.enter().append('g')
			.attr('class', 'action-arrow')
			.classed({
				'constructive': d => d.valence === VALENCES.CONSTRUCTIVE,
				'both': d => d.valence === VALENCES.BOTH,
				'destructive': d => d.valence === VALENCES.DESTRUCTIVE
			})
			.attr('transform', d => 'rotate(' + d.rotation + ')');
		if (!this.isBackgrounded) {
			arrowEnterSelection
				.on('mouseover', this.onActionMouseOver)
				.on('mouseout', this.onActionMouseOut)
				.on('click', this.onActionMouseClick);
		}
		arrowEnterSelection.append('path')
			.classed('gradient-fill', true)
			.attr('fill', (d, i) => 'url(#' + emotionGradientName + ')')
			.call(this.scaledLineGenerator, 0.0);

		// `mix-blend-mode: multiply` does not work correctly with gradients in Firefox/Gecko.
		if (window.navigator.userAgent && ~window.navigator.userAgent.toLowerCase().indexOf('gecko') && ~window.navigator.userAgent.toLowerCase().indexOf('firefox')) {
			arrowEnterSelection.selectAll('path').style('mix-blend-mode', 'normal');
		}

		/*
		arrowEnterSelection.append('path')
			.classed('texture-fill', true)
			.attr('opacity', d => d.valence ? 0.5 : 0.0)
			.attr('fill', d => d.valence ? valenceTextureSet[d.valence].url() : null)
			.call(this.scaledLineGenerator, 0.0);
		*/

		arrowEnterSelection.transition()
			.duration(this.isBackgrounded ? 0 : sassVars.actions.add.time)
			.delay(this.isBackgrounded ? 0 : function (d, i) { return i * 50; })
		.selectAll('path')
			.call(this.scaledLineGenerator, 1.0);

		// exit
		arrowSelection.exit().transition()
			.duration(sassVars.actions.remove.time)
			.remove()
		.selectAll('path')
			.call(this.scaledLineGenerator, 0.0);


		if (!this.isBackgrounded) {

			this.renderLabels(currentActionsData);

			if (state) {

				/*
				// valences underlay
				let valenceSelection = graphContainer.select('g.valences').selectAll('path.valence')
					.data(this.pieLayout(stateActionsData.valenceWeights), d => d.data.name);

				// update
				valenceSelection.transition()
					.duration(sassVars.actions.update.time)
					.call(this.arcTween);

				// enter
				valenceSelection.enter().append('path')
					.attr('class', d => 'valence ' + d.data.name.toLowerCase())
					.attr('d', this.arcGenerator)
					.each(function(d) { this._current = d; }) // store the initial angles for arcTween
					.style('opacity', 0.0)
					.on('mouseover', this.onValenceMouseOver)
					.on('mouseout', this.onValenceMouseOut)
					.on('click', this.onValenceMouseClick)
				.transition()
					.duration(sassVars.actions.add.time)
					.delay(500)
					.style('opacity', 1.0);
				*/

			} else {

				this.resetCallout();
				/*
				graphContainer.select('g.valences').selectAll('path.valence')
				.transition()
					.duration(sassVars.actions.remove.time)
					.style('opacity', 0.0)
					.remove();
				*/
			}

		}

	},

	clearStates: function (duration) {

		if (this.currentEmotion) {
			this.graphContainers[this.currentEmotion].selectAll('g.action-arrow')
				.on('mouseover', null)
				.on('mouseout', null)
			.data([]).exit().transition()
				.duration(duration)
				.remove()
			.selectAll('path')
				.call(this.scaledLineGenerator, 0.0);
		}

		this.renderLabels(null);

		/*
		if (this.currentEmotion) {
			this.graphContainers[this.currentEmotion].select('g.valences').selectAll('path.valence')
			.transition()
				.duration(duration)
				.style('opacity', 0.0)
				.remove();
		}
		*/

	},

	setHighlightedState: function (state) {

		if (!state) {

			this.displayHighlightedAction(null);

		} else {

			let allActions = this.actionsData[this.currentEmotion].allActions,
				stateActions = this.actionsData[this.currentEmotion].actions[state].actions.map(action => action.name),
				otherActions = allActions.filter(action => !~stateActions.indexOf(action.name)).map(action => action.name),
				graphContainer = this.graphContainers[this.currentEmotion],
				labelContainer = this.labelContainers[this.currentEmotion];

			graphContainer.selectAll('g.action-arrow')
				.classed('muted', (data, index) => !~stateActions.indexOf(data.name));

			this.setLabelStates(labelContainer, [], otherActions);
		}

	},

	/**
	 * labels can have one of three states:
	 * 1 - 'highlighted'
	 * 2 - 'selected'
	 * 3 - 'muted'
	 */
	setLabelStates: function(labelContainer, highlighted, muted=[]) {

		if (!labelContainer) return;

		const labels = labelContainer.selectAll('.label');
		labels
			.classed('highlighted', false)
			.classed('muted', false)
			.classed('selected', false);

		const selected = this.highlightedAction ? this.highlightedAction.name : null;

		if (selected || highlighted.length){
			labels
				.classed({
					'muted': d => (highlighted.indexOf(d.name) < 0 && d.name !== selected) || ~muted.indexOf(d.name),
					'highlighted': d => highlighted.indexOf(d.name) > -1,
					'selected': d => d.name === selected
				});

			// remove default-interactive-helper once user highlights something
			labelContainer.select('.default-interactive-helper')
				.classed('default-interactive-helper', false);
		}

	},

	renderLabels: function (actionsData, immediate) {

		if (!this.currentEmotion) return;
		if (this.screenIsSmall) return;

		let labelText = d => {
			/*
			let prefix = '';
			switch (d.valence) {
				case VALENCES.CONSTRUCTIVE:
					prefix = '<span class="label-valence plus">+</span> ';
					break;
				case VALENCES.BOTH:
					prefix = '<span class="label-valence">+<span class="short-slash">/</span>-</span>';
					break;
				case VALENCES.DESTRUCTIVE:
					prefix = '<span class="label-valence minus">-</span> ';
					break;
			}
			return prefix + '<span class="label-name">' + d.name.toUpperCase() + '</span>';
			*/
			return '<span class="label-name">' + d.name.toUpperCase() + '</span>';
		};

		let labelContainer = this.labelContainers[this.currentEmotion];
		if (actionsData) {
			const sqrt3 = Math.sqrt(3);
			let labelSize = this.lineGenerator.radius()({x:1}) + 10,
				labelSelection = labelContainer.selectAll('div.label')
					.data(actionsData, d => d.name);

			// update
			labelSelection.transition()
				.duration(sassVars.actions.update.time)
				.styleTween('transform', (() => function (d, i, a) {

					let previousTransform = a === 'none' ? null : d3.transform(a),
						previousTranslate = previousTransform ? previousTransform.translate : [0, 0],
						verticalOffset = (i === 0 || i === labelSelection.size() - 1) ? 20 : 0,
						// critical to fully invert function that translates from rotation to x/y translation
						previousRotation = Math.atan2((previousTranslate[1] - verticalOffset) * sqrt3, (previousTranslate[0] + .5 * this.offsetWidth)),
						targetRotation = Math.PI * (d.rotation-90) / 180,
						rot;

					return (t) => {
						rot = previousRotation + t * (targetRotation - previousRotation);
						return 'translate(' +
							Math.round((labelSize * Math.cos(rot)) - 0.5*this.offsetWidth) + 'px,' +	// center on label width
							Math.round(labelSize / sqrt3 * Math.sin(rot) + verticalOffset) + 'px)';		// bump down the first and last label
					};

				})());
			labelSelection.select('h4')
				.html(labelText);

			// get a random label to set a box around it
			if (!this.randomLabelPositions.hasOwnProperty(this.currentEmotion)) {
				this.randomLabelPositions[this.currentEmotion] = actionsData[Math.floor(Math.random() * actionsData.length)];
			}

			// enter
			let labelEnterSelection = labelSelection.enter().append('div')
				.attr('class', `${this.currentEmotion} label emotion-label`)
				.attr('data-popuptarget', (d,i) => `actions:${d.name}`)
				.style('opacity', 0.0);

			labelEnterSelection.append('div')
				.attr('class', 'label-text-wrapper')
				.append('h4')
				.html(labelText)
				.on('mouseover', this.onActionMouseOver)
				.on('mouseout', this.onActionMouseOut)
				.on('click', this.onActionMouseClick);

			// do this last, so that width (determined by text) can be calculated and used
			let t = function (d, i) {
				let verticalOffset = (i === 0 || i === labelEnterSelection.size() - 1) ? 20 : 0;
				return 'translate(' +
					Math.round(labelSize * Math.cos(Math.PI*(d.rotation-90)/180) - 0.5*this.offsetWidth) + 'px,' +		// center on label width
					Math.round(labelSize * Math.sin(Math.PI*(d.rotation-90)/180) / sqrt3 + verticalOffset) + 'px)';		// bump down the first and last label
			};
			labelEnterSelection.style('transform', t);
			labelEnterSelection.style('-webkit-transform', t);

			labelEnterSelection.transition()
				.duration(sassVars.actions.add.time)
				.delay(sassVars.actions.add.delay)
				.style('opacity', 1.0)
				.each('end', function () {
					d3.select(this).style('opacity', null);
				});

			// exit
			labelSelection
				.classed('default-interactive-helper', (d, i) => d.name === this.randomLabelPositions[this.currentEmotion].name);

			labelSelection.exit().transition()
				.duration(sassVars.actions.remove.time)
				.style('opacity', 0.0)
				.remove();

		} else {

			labelContainer.selectAll('div.label')
				.on('mouseover', null)
				.on('mouseout', null)
			.transition()
				.duration(immediate ? 0 : sassVars.actions.remove.time)
				.style('opacity', 0.0)
				.remove();

		}

	},

	open: function (options) {

		this.setBackgrounded(options && options.inBackground, options);

		// clear selected state to display all actions for emotion,
		// after a delay (transition time from _states.scss::#states)
		let openDelay = 1500;

		this.openTimeout = setTimeout(() => {
			if (!options || !options.inBackground) {
				this.resetCallout();
			}
		}, openDelay);

	},

	close: function () {
		dispatcher.popupChange();

		return new Promise((resolve, reject) => {

			clearTimeout(this.openTimeout);
			clearTimeout(this.setStateTimeout);

			this.clearStates(sassVars.actions.remove.time);

			setTimeout(() => {
				resolve();
			}, sassVars.actions.remove.time);

		});

	},

	onResize: function (screenIsSmall) {

		this.screenIsSmall = screenIsSmall;

		// recalculate containers, scales, etc
		this.setUpGraphs(this.sectionContainer);

		for (let emotion in this.graphContainers) {

			let graphContainer = this.graphContainers[emotion],
				arrowSelection = graphContainer.selectAll('g.action-arrow');

			// update all action rays and labels that have already been rendered
			if (arrowSelection.size()) {
				arrowSelection.selectAll('path')
					.call(this.scaledLineGenerator, 1.0);

				if (!this.isBackgrounded) {
					let currentActionsData;

					if (this.currentState) {
						let stateActionsData = this.actionsData[this.currentEmotion].actions[this.currentState];
						if (!stateActionsData) {
							console.warn('No actions found for state "' + this.currentState + '" in emotion "' + this.currentEmotion + '".');
							continue;
						}
						currentActionsData = stateActionsData.actions;
					} else {
						currentActionsData = this.actionsData[this.currentEmotion].allActions;
					}

					this.renderLabels(currentActionsData);
				}
			}

		}

	},

	/**
	 * Actions section stays open in triggers and moods, with limited interactivity.
	 * `setBackgrounded()` toggles this state.
	 */
	setBackgrounded: function (val, options) {
		return new Promise((resolve, reject) => {

			this.isBackgrounded = val;

			this.sectionContainer.classList[(val ? 'add' : 'remove')]('backgrounded');
			this.sectionContainer.classList[(options && (options.sectionName === dispatcher.SECTIONS.TRIGGERS) ? 'add' : 'remove')]('triggers');
			this.sectionContainer.classList[(options && (options.sectionName === dispatcher.SECTIONS.MOODS) ? 'add' : 'remove')]('moods');

			// deselect anything selected.
			// currently only happens on mobile, but might also want to happen on desktop...
			// TODO: evaluate ^^.
			if (val && this.screenIsSmall) {
				this.setHighlightedAction(null);
			}

			// this.hideChrome();
			// this.setActive(!val);

			this.renderLabels(null);

			// reset actions state
			if(val) {
				this.setState(null);
			}

			// TODO: resolve on completion of animation
			resolve();

		});
	},

	shouldDisplayPaginationUI: function () {

		// only display pagination UI while an action is selected
		return !!this.highlightedAction;
		
	},

	applyEventListenersToEmotion: function (emotion, handlersByEvent) {

		let graphContainer = this.graphContainers[emotion];
		Object.keys(handlersByEvent).forEach(event => {
			graphContainer.on(event, handlersByEvent[event]);
		});

	},

	paginateElement: function (dir) {

		let nextIndex = 0,
			actionsData = this.actionsData[this.currentEmotion].allActions;

		if (this.highlightedAction) {
			nextIndex = actionsData.findIndex(s => s.name === this.highlightedAction.name) + dir;
			nextIndex = nextIndex >= actionsData.length ? 0 : nextIndex < 0 ? actionsData.length - 1 : nextIndex;
		}

		this.setHighlightedAction(actionsData[nextIndex]);

	},

	setHighlightedAction: function (action) {

		this.highlightedAction = action;

		if (action) {

			let secondaryData;
			if (action.valence) {
				secondaryData = {
					body: action.valence && appStrings().getStr(`emotionsData.metadata.actions.qualities[${ action.valence - 1 }].body`),
					classes: [
						this.currentEmotion,
						_.findKey(VALENCES, (val) => val === action.valence).toLowerCase()
					]
				};
				secondaryData.body = secondaryData.body.replace(/In this state/, 'In a state of ' + action.state.toLowerCase());
				secondaryData.body = secondaryData.body.replace(/this action/, GRAMMAR_TRANSLATE[action.name.toLowerCase()]);
			}

			dispatcher.popupChange('actions', action.name, action.desc, secondaryData);

		} else {

			this.resetCallout();

		}

		this.displayHighlightedAction(action);

	},

	displayHighlightedAction: function (action, valence) {

		let highlightedAction = action || this.highlightedAction || null,
			arrowSelection = this.graphContainers[this.currentEmotion].selectAll('g.action-arrow'),
			labelSelection = this.labelContainers[this.currentEmotion].selectAll('div.label');

		if (highlightedAction) {

			if (valence) {

				// if valence specified, highlight all actions of that valence
				arrowSelection
					.classed('muted', d => {
						if (valence) {
							return d.valence !== valence;
						} else {
							return false;
						}
					});

			} else {

				// if no valence specified, highlight only the specified action
				arrowSelection
					.classed('muted', (data, index) => data.name !== highlightedAction.name);

			}

			this.setLabelStates(this.labelContainers[this.currentEmotion], [highlightedAction.name]);
		} else {

			arrowSelection
				.classed('muted', false);

			this.setLabelStates(this.labelContainers[this.currentEmotion], []);
		}

		/*
		if (!action && this.highlightedValence) {
			this.displayHighlightedValence();
		}
		*/

	},

	onActionMouseOver: function (d, i) {

		if (this.mouseOutTimeout) {
			clearTimeout(this.mouseOutTimeout);
		}
		this.displayHighlightedAction(d, d.valence);

	},

	onActionMouseOut: function (d, i) {

		this.mouseOutTimeout = setTimeout(() => {
			this.displayHighlightedAction(null);
		}, 350);

	},

	onActionMouseClick: function (d, i) {

		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		if (this.mouseOutTimeout) {
			clearTimeout(this.mouseOutTimeout);
		}
		this.setHighlightedAction(d);

	},

	resetCallout: function () {
		dispatcher.popupChange();
		dispatcher.changeCallout(this.currentEmotion, appStrings().getStr('emotionsData.metadata.actions.header'), appStrings().getStr('emotionsData.metadata.actions.body'));
	}

	/*
	setHighlightedValence: function (valence, preventRecursion) {

		this.highlightedValence = valence;

		if (!preventRecursion) {
			this.setHighlightedAction(null, true);
		}

		if (valence) {
			let valenceKey;
			switch (valence) {
				case VALENCES.CONSTRUCTIVE:
					valenceKey = 0;
					break;
				case VALENCES.BOTH:
					valenceKey = 2;
					break;
				case VALENCES.DESTRUCTIVE:
					valenceKey = 1;
					break;
			}
			dispatcher.changeCallout(this.currentEmotion, emotionsData.metadata.actions.qualities[valenceKey].header, emotionsData.metadata.actions.qualities[valenceKey].body);
		} else {
			this.resetCallout();
		}

		this.displayHighlightedValence(valence);

	},

	displayHighlightedValence: function (valence) {

		if (!this.currentEmotion) { return; }

		valence = valence || this.highlightedValence || null;

		let valenceClass = Object.keys(VALENCES).find(key => VALENCES[key] === valence);
		if (valenceClass) {
			valenceClass = valenceClass.toLowerCase();
		}

		let graphContainer = this.graphContainers[this.currentEmotion];
		graphContainer.selectAll('path.valence')
			.style('opacity', function () {
				if (valenceClass) {
					return this.classList.contains(valenceClass) ? 1.0 : 0.5;
				} else {
					return null;
				}
			})
			.classed('highlighted', function () {
				if (valenceClass) {
					return this.classList.contains(valenceClass);
				} else {
					return null;
				}
			});

		graphContainer.selectAll('g.action-arrow')
			.classed('muted', d => {
				if (valence) {
					return d.valence !== valence;
				} else {
					return false;
				}
			});

	},

	onValenceMouseOver: function (d, i) {

		let valence = VALENCES[d.data.name];
		if (valence) {
			this.displayHighlightedValence(valence);
		}

	},

	onValenceMouseOut: function (d, i) {

		let valence = VALENCES[d.data.name];
		if (valence) {
			this.displayHighlightedValence(null);
		}

	},

	onValenceMouseClick: function (d, i) {

		if (d3.event) {
			d3.event.stopImmediatePropagation();
		}

		let valence = VALENCES[d.data.name];
		if (valence) {
			this.setHighlightedValence(valence);
		}

	},
	*/

};
