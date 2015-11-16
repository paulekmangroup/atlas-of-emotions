import dispatcher from './dispatcher.js';
import _ from 'lodash';
import d3 from 'd3';
import d3Transform from 'd3-transform';
import penner from 'penner';

let labelContainer,
	continentContainer,
	centerX,
	centerY,
	continents,
	continentTransforms,
	frameCount = 0,
	currentEmotion = null;



const continentsSection = {

	isInited: false,
	isActive: false,

	init: function (container) {

		this.update = this.update.bind(this);

		labelContainer = document.createElement('div');
		labelContainer.id = 'continent-labels';
		container.appendChild(labelContainer);
		continentContainer = d3.select(container).append('svg')
			.attr('width', '100%')
			.attr('height', '100%');

		let w = container.offsetWidth,
			h = container.offsetHeight;

		centerX = 0.55 * w;
		centerY = 0.5 * h;

		// map each emotion to a Continent instance
		continents = _.values(dispatcher.EMOTIONS).map(emotion => new Continent(emotion, w, h, continentContainer));

		this.initContinentLabels();

		this.isInited = true;

		this.setActive(true, container);

		this.update();

	},

	setEmotion: function (emotion) {

		if (emotion === currentEmotion) { return; }

		if (currentEmotion) {

			// -->> TODO: keep in mind what happens if setEmotion() is called during a transition! <<--

			// TODO:
			// transition from one emotion to another
			// implement as Promise chain? steps will overlap.

			// transitions.unfocusContinents(currentEmotion)
			// 1a. fade out and shrink circles of current continent;
			// 1b. pull circles together toward center along horizontal axis as they fade/shrink

			// transitions.panToContinent(currentEmotion)
			// 1c. while 1a-b happens, pan toward continent location from current continent's location, according to all continents view layout.

			// transitions.focusZoomedInContinent(currentEmotion)
			// 2a. fade in and grow all circles for zoomed continent view from center of circle
			//		random colors or picked from mocks?

			// transitions.spreadFocusedContinent(currentEmotion)
			// 2b. spread circles along horizontal axis as they fade in + grow
			// 2c. (later) allow circles to drift slightly along horizontal axis only. this motion can be reflected in the states view as well.

		} else {

			// TODO:
			// transition from all continents view into single continent view
			// implement as Promise chain? steps will overlap.

			// transitions.unfocusContinents(all other continents)
			// 1. fade out and shrink all but focused continent

			// transitions.panToContinent(currentEmotion)
			// transitions.focusZoomedOutContinent(currentEmotion)
			// 2a. zoom in on focused continent and pan to center
			// 2b. while zooming, remove/add enough circles to match number of states
			// 2c. while 2a-b happens, tween colors of circles to match mocks? or leave them randomized?

			// transitions.spreadFocusedContinent()
			// 2d. while 2a-c happens, execute (currentEmotion):2b-c above.

			this.transitions.unfocusContinents(continents
				.filter(continent => continent.id !== emotion)
				.map(continent => continent.id)
			);
		}

		currentEmotion = emotion;

	},

	/**
	 * Functions that perform transitions between continent views
	 */
	transitions: {

		// 2a. zoom in on focused continent and pan to center
		// 2b. while zooming, remove/add enough circles to match number of states
		// 2c. while 2a-b happens, tween colors of circles to match mocks? or leave them randomized?
		focusZoomedOutContinent: function (emotion) {

		},

		// 2a. fade in and grow all circles for zoomed continent view from center of circle
		//		random colors or picked from mocks?
		focusZoomedInContinent: function (emotion) {

		},

		// 1c. while 1a-b happens, pan toward continent location from current continent's location, according to all continents view layout.
		panToContinent: function (emotion) {

		},

		// 2b. spread circles along horizontal axis as they fade in + grow
		// 2c. (later) allow circles to drift slightly along horizontal axis only. this motion can be reflected in the states view as well.
		spreadFocusedContinent: function (emotion) {

		},

		// 1. fade out and shrink all but focused continent / 
		// 1a. fade out and shrink circles of continent;
		// 1b. pull circles together toward center along horizontal axis as they fade/shrink
		//		note: for zoomed-out continents, circles will already be centered, but that's ok.
		unfocusContinents: function (emotions) {

			let tgtContinents = continents.filter(continent => ~emotions.indexOf(continent.id));
			let translate;
			tgtContinents.forEach(continent => {

				// TODO:
				// 1. turn off spawning
				// 2. shrink all circles down in a set amount of time...probably easiest to just shrink the container.
				// 3. move circles toward center

				// turn off spawning, in a way it can easily be turned back on
				continent.spawnConfig.freq *= -1;


				// TODO MONDAY
				// continents should maintain position and scale as their own variable (state),
				// and there should be only one place (within update())
				// that sets the transform from those values.
				// never even read from attr('transform'), just use those vals.
				// then, set up RAF function that decreases continent.scale over time.

				// scale down to nothing
				// translate = /translate\((.*)\)/.exec(continent.d3Selection.attr('transform'));
				translate = /translate\(([^\)]*)\)/.exec(continent.d3Selection.attr('transform'));
				translate = translate ? translate[1].split(',') : [0, 0];
				continent.d3Selection
					.attr('transform', d3Transform()
						.translate(translate[0], translate[1])
						.scale(0, 0)
					);


			});

		},

	},

	initContinentLabels: function () {

		continents.forEach(function (continent) {

			let label = document.createElement('div');
			label.innerHTML = '<a href="#' + continent.id + '"><h3>' + continent.name.toUpperCase() + '</h3></a>';
			label.style.left = Math.round(centerX + continent.x + continent.label.x) + 'px';
			label.style.top = Math.round(centerY + continent.y + continent.label.y) + 'px';
			labelContainer.appendChild(label);

			setTimeout(function () {
				label.classList.add('visible');
			}, 1000);

		});

	},

	setActive: function (val, container) {

		let section = this;
		this.isActive = val;

		continents.forEach(function (continent, i) {
			continent.d3Selection
				.on('mouseenter', val ? section.onContinentMouseEnter : null)
				.on('mouseleave', val ? section.onContinentMouseLeave : null)
				.on('mouseup', val ? section.onContinentMouseUp : null);
		});

	},

	update: function () {

		let updateState = {
			someContinentIsHighlighted: continents.some(function (continent) { return continent.isHighlighted; })
		};

		continents.forEach(continent => continent.update(updateState));

		frameCount++;
		if (this.isActive) {
			window.requestAnimationFrame(this.update);
		}

	},

	onContinentMouseEnter: function () {

		let continent = d3.select(this).datum();
		if (continent) {
			continents.forEach(c => {
				c.isHighlighted = (c === continent);
			});
		}

	},

	onContinentMouseLeave: function () {

		let continent = d3.select(this).datum();
		if (continent) {
			continent.isHighlighted = false;
		}

	},

	onContinentMouseUp: function (event) {

		continents.some(function (continent) {
			if (continent.isHighlighted) {
				dispatcher.navigate(dispatcher.SECTIONS.CONTINENTS, continent.id);
				return true;
			}
		});

	}

};


class Continent {

	static FRAMERATE = 60;
	static HIGHLIGHT_ALPHA_MOD = 1.5;
	static UNHIGHLIGHT_ALPHA_MOD = 0.3;
	static HIGHLIGHT_SPEED_MOD = 2.0;
	static UNHIGHLIGHT_SPEED_MOD = 0.5;

	static configsByEmotion = {
		'anger': {
			colorPalette: [
				[204, 28, 23],
				[208, 46, 53],
				[212, 65, 63],
				[216, 83, 73],
				[220, 102, 83],
				[224, 120, 92],
				[228, 135, 102]
			]
		},
		'disgust': {
			colorPalette: [
				[0, 104, 55],
				[0, 110, 57],
				[0, 116, 59],
				[0, 122, 61],
				[0, 128, 63],
				[0, 130, 65],
				[0, 136, 67],
				[0, 142, 69]
			]
		},
		'enjoyment': {
			colorPalette: [
				[248, 136, 29],
				[243, 143, 30],
				[243, 136, 33],
				[244, 149, 36],
				[244, 153, 40],
				[245, 156, 43],
				[245, 159, 46],
				[246, 162, 49],
				[247, 169, 56],
				[246, 166, 53],
				[247, 172, 59]
			]
		},
		'fear': {
			colorPalette: [
				[143, 39, 139],
				[156, 41, 153],
				[196, 49, 194],
				[209, 51, 207],
				[223, 53, 221],
				[235, 56, 234],
				[248, 58, 248]
			]
		},
		'sadness': {
			colorPalette: [
				[65, 74, 161],
				[54, 104, 178],
				[49, 124, 189],
				[44, 139, 200],
				[51, 158, 211],
				[85, 172, 217],
				[146, 198, 229],
				[174, 209, 234],
				[195, 218, 238]
			]
		}
	};

	static transforms;
	static initTransforms (w, h) {

		Continent.transforms = _.shuffle([
			{
				x: 0.03 * w,
				y: -0.20 * h,
				label: {
					x: 0.19 * w,
					y: -0.13 * h
				},
				size: 0.24 * h
			},
			{
				x: -0.22 * w,
				y: -0.14 * h,
				label: {
					x: -0.24 * w,
					y: -0.01 * h
				},
				size: 0.23 * h
			},
			{
				x: -0.06 * w,
				y: 0.07 * h,
				label: {
					x: -0.19 * w,
					y: 0.10 * h
				},
				size: 0.18 * h
			},
			{
				x: -0.03 * w,
				y: 0.22 * h,
				label: {
					x: -0.20 * w,
					y: 0.15 * h
				},
				size: 0.22 * h
			},
			{
				x: 0.19 * w,
				y: 0.10 * h,
				label: {
					x: 0.01 * w,
					y: 0.27 * h
				},
				size: 0.24 * h
			}
		]);
	}

	constructor (emotion, w, h, container) {

		if (!Continent.transforms) {
			Continent.initTransforms(w, h);
		}

		this.initInstanceProperties(emotion, container);

	}

	initInstanceProperties (emotion, container) {

		let emotionIndex = Object.keys(Continent.configsByEmotion).indexOf(emotion);
		if (emotionIndex === -1) {
			throw new Error('Invalid emotion "' + emotion + '" for continent.');
		}

		this.id = emotion,
		this.name = emotion.toUpperCase(),
		this.colorPalette = Continent.configsByEmotion[emotion].colorPalette.concat();

		this.spawnConfig = {
			lastSpawn: 0,
			minDelay: 2 * Continent.FRAMERATE,
			freq: 0.015
		};

		this.drift = {
			x: 0,
			y: 0,
			sinCtr: Math.random() * 2*Math.PI,
			cosCtr: Math.random() * 2*Math.PI
		};

		// copy transforms onto this Continent instance
		Object.assign(this, Continent.transforms[emotionIndex]);

		this.circles = [];
		this.isHighlighted = false;

		this.d3Selection = container.append('g')
			.classed('continent ' + this.id, true)
			.datum(this);

	}

	update (state) {

		let newCircle,
			circle,
			alphaMod,
			speedMod,
			scale;

		// probabilistically spawn new Circles
		newCircle = Circle.spawn(this);
		if (newCircle) {
			this.circles.push(newCircle);
		}

		// set alpha and speed based on interaction
		if (!state.someContinentIsHighlighted) {
			alphaMod = 1.0;
			speedMod = 1.0;
		} else {
			alphaMod = this.isHighlighted ? Continent.HIGHLIGHT_ALPHA_MOD : Continent.UNHIGHLIGHT_ALPHA_MOD;
			speedMod = this.isHighlighted ? Continent.HIGHLIGHT_SPEED_MOD : Continent.UNHIGHLIGHT_SPEED_MOD;
		}

		// apply drift
		this.wander(this.drift, 3);
		scale = /scale\((.*)\)/.exec(this.d3Selection.attr('transform'));
		scale = scale ? scale[1].split(',') : [1.0, 1.0];
		this.d3Selection
			.attr('transform', d3Transform()
				.translate(
					centerX + this.x + this.drift.x,
					centerY + this.y + this.drift.y)
				.scale(scale[0], scale[1])
			);

		for (let i=this.circles.length-1; i>=0; i--) {
			circle = this.circles[i];
			if (circle.isAlive()) {
				circle.update(alphaMod, speedMod);
			} else {
				this.circles.splice(i, 1);
				circle.d3Selection.remove();
			}
		};

	}

	// Randomized sinusoidal motion
	wander (drift, maxDist) {

		drift.sinCtr += 0.01 + Math.random() * 0.03;
		drift.cosCtr += 0.01 + Math.random() * 0.03;
		drift.x = Math.cos(drift.cosCtr) * maxDist;
		drift.y = Math.sin(drift.sinCtr) * maxDist;

	}

	// Random walk
	meander (drift, maxDist) {

		let maxSpeed = 2 * 0.01 * maxDist;
		let maxTurn = 2 * 0.002 * Math.PI;
		let x = Math.cos(drift.ang) * drift.dist;
		let y = Math.sin(drift.ang) * drift.dist;
		let angToCenter = Math.atan2(y, x);

		drift.dist += (-0.5 + Math.random()) * maxSpeed;
		drift.ang +=  (-0.5 + Math.random()) * maxTurn;

		// normalize angles
		while (angToCenter < 0) { angToCenter += 2*Math.PI; }
		while (drift.ang < 0) { drift.ang += 2*Math.PI; }
		drift.ang %= 2*Math.PI;

		// If getting too far away from center, turn back toward center
		if (drift.dist > 0.5 * maxDist) {
			drift.ang += 0.1 * (angToCenter - drift.ang);
		}

	}


}



const STROKE_WIDTH_MIN = 0.4,
	STROKE_WIDTH_VAR = 1.2,
	SIZE_MOD = 1 / (1 + 0.5 * (STROKE_WIDTH_MIN + STROKE_WIDTH_VAR)),
	BASE_ALPHA = 0.4,
	BASE_SPEED = 0.05;

class Circle {

	// Note: continent.spawnConfig.lastSpawn is mutated by this function
	static spawn (continent) {

		if (frameCount - continent.spawnConfig.lastSpawn > continent.spawnConfig.minDelay) {
			if (Math.random() < continent.spawnConfig.freq) {
				continent.spawnConfig.lastSpawn = frameCount;
				return new Circle(continent.d3Selection, continent.colorPalette, continent.size);
			} else {
				return null;
			}
		}

	}

	constructor (container, colorPalette, size) {

		// Scale `size` down to account for stroke weight,
		// to keep all stroked ellipses within `size`.
		this.size = size * SIZE_MOD;

		this.radius = 0;
		this.rSpeed = Math.random() * 0.2;
		this.initSpeed = this.rSpeed;
		this.weight = Math.round(0.4*size + Math.random() * 1.2*size);
		this.alpha = BASE_ALPHA;

		this.color = colorPalette[Math.floor(Math.random() * colorPalette.length)].join(',');

		this.d3Selection = container.append('circle')
			.attr('cx', 0)
			.attr('cy', 0)
			.attr('r', this.radius)
			.style('stroke', 'rgba(' + this.color + ',' + this.alpha + ')');

	}

	update (alphaMod, speedMod) {
		this.draw(alphaMod);
		this.grow(speedMod);
	};

	draw (alphaMod) {

		// limit stroke to edge of circle
		let sw = Math.min(this.weight, (this.size + 0.5*this.weight - this.radius));

		this.d3Selection
			.attr('r', this.radius)
			.style({
				'stroke-width': sw,
				'stroke': 'rgba(' + this.color + ',' + this.alpha * alphaMod + ')'
			});

	};

	// Note: there is no "age", everything that changes is calculated off of this.radius.
	grow (speedMod) {
		// stroke is centered on this.radius
		let maxRad = this.size + 0.5*this.weight;

		// taper off speed as radius approaches maxRad
		this.rSpeed = BASE_SPEED + Math.pow((1 - this.radius / maxRad), 0.5) * this.initSpeed;
		this.rSpeed *= speedMod;

		this.radius += this.rSpeed;

		// fade out once radius hits outside edge
		if (this.radius > this.size) {
			this.alpha = Math.max(0, BASE_ALPHA * (maxRad - this.radius) / (0.5 * this.weight));
		}
	};

	isAlive () {
		return this.alpha > 0.01;
	};

};

export default continentsSection;
