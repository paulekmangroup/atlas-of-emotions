import _ from 'lodash';
import d3 from 'd3';

const FRAMERATE = 60,
	CONTINENT_HIGHLIGHT_ALPHA_MOD = 1.5,
	CONTINENT_UNHIGHLIGHT_ALPHA_MOD = 0.3,
	CONTINENT_HIGHLIGHT_SPEED_MOD = 2.0,
	CONTINENT_UNHIGHLIGHT_SPEED_MOD = 0.5;

let labelContainer,
	continentContainer,
	centerX,
	centerY,
	continents,
	continentTransforms,
	baseSpawnConfig = {
		lastSpawn: 0,
		minDelay: 1.35 * FRAMERATE,
		freq: 0.015
	},
	frameCount = 0;

const continentsSection = {

	isInited: false,
	isActive: false,

	init: function (container) {

		labelContainer = document.createElement('div');
		labelContainer.id = 'continent-labels';
		container.appendChild(labelContainer);
		continentContainer = d3.select(container).append('svg')
			.attr('width', '100%')
			.attr('height', '100%');

		// p.blendMode(p.MULTIPLY);
		
		let w = container.offsetWidth,
			h = container.offsetHeight;

		centerX = 0.55 * w;
		centerY = 0.5 * h;

		// Assign continents to positions
		this.initContinentValues(w, h);
		continents.forEach(function (continent, i) {
			continent = Object.assign(continent, continentTransforms[i]);
			continent.node = continentContainer.append('g')
				.classed('continent ' + continent.name, true);
		});

		this.initContinentLabels();

		this.isActive = true;
		this.update = this.update.bind(this);
		this.update();

	},

	initContinentValues: function (w, h) {

		// TODO: `Continent` should be a class, or at least have an object factory, to maintain state.
		continents = [
			{
				id: 'anger',
				name: 'anger',
				x: 0.03 * w,
				y: -0.20 * h,
				label: {
					x: 0.19 * w,
					y: -0.13 * h
				},
				spawnConfig: Object.assign({}, baseSpawnConfig),	// mutable (lastSpawn)
				colorPalette: [
					[204, 28, 23],
					[208, 46, 53],
					[212, 65, 63],
					[216, 83, 73],
					[220, 102, 83],
					[224, 120, 92],
					[228, 135, 102]
				],
				size: 0.48 * h,
				circles: [],										// mutable
				isHighlighted: false								// mutable
			},
			{
				id: 'sadness',
				name: 'sadness',
				x: -0.22 * w,
				y: -0.14 * h,
				label: {
					x: -0.24 * w,
					y: -0.01 * h
				},
				spawnConfig: Object.assign({}, baseSpawnConfig),	// mutable (lastSpawn)
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
				],
				size: 0.45 * h,
				circles: [],										// mutable
				isHighlighted: false								// mutable
			},
			{
				id: 'fear',
				name: 'fear',
				x: -0.06 * w,
				y: 0.07 * h,
				label: {
					x: -0.19 * w,
					y: 0.10 * h
				},
				spawnConfig: Object.assign({}, baseSpawnConfig),	// mutable (lastSpawn)
				colorPalette: [
					[143, 39, 139],
					[156, 41, 153],
					[196, 49, 194],
					[209, 51, 207],
					[223, 53, 221],
					[235, 56, 234],
					[248, 58, 248]
				],
				size: 0.35 * h,
				circles: [],										// mutable
				isHighlighted: false								// mutable
			},
			{
				id: 'enjoyment',
				name: 'enjoyment',
				x: -0.03 * w,
				y: 0.22 * h,
				label: {
					x: -0.20 * w,
					y: 0.15 * h
				},
				spawnConfig: Object.assign({}, baseSpawnConfig),	// mutable (lastSpawn)
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
				],
				size: 0.44 * h,
				circles: [],										// mutable
				isHighlighted: false								// mutable
			},
			{
				id: 'disgust',
				name: 'disgust',
				x: 0.19 * w,
				y: 0.10 * h,
				label: {
					x: 0.01 * w,
					y: 0.27 * h
				},
				spawnConfig: Object.assign({}, baseSpawnConfig),	// mutable (lastSpawn)
				colorPalette: [
					[0, 104, 55],
					[0, 110, 57],
					[0, 116, 59],
					[0, 122, 61],
					[0, 128, 63],
					[0, 130, 65],
					[0, 136, 67],
					[0, 142, 69]
				],
				size: 0.48 * h,
				circles: [],										// mutable
				isHighlighted: false								// mutable
			}
		],

		continentTransforms = _.shuffle([
			{
				x: 0.03 * w,
				y: -0.20 * h,
				drift: {											// all mutable values
					x: 0,
					y: 0,
					sinCtr: Math.random() * 2*Math.PI,
					cosCtr: Math.random() * 2*Math.PI,
					// dist: 0,
					// ang: Math.random() * 2*Math.PI
				},
				label: {
					x: 0.19 * w,
					y: -0.13 * h
				},
				size: 0.48 * h
			},
			{
				x: -0.22 * w,
				y: -0.14 * h,
				drift: {											// all mutable values
					x: 0,
					y: 0,
					sinCtr: Math.random() * 2*Math.PI,
					cosCtr: Math.random() * 2*Math.PI,
					// dist: 0,
					// ang: Math.random() * 2*Math.PI
				},
				label: {
					x: -0.24 * w,
					y: -0.01 * h
				},
				size: 0.45 * h
			},
			{
				x: -0.06 * w,
				y: 0.07 * h,
				drift: {											// all mutable values
					x: 0,
					y: 0,
					sinCtr: Math.random() * 2*Math.PI,
					cosCtr: Math.random() * 2*Math.PI,
					// dist: 0,
					// ang: Math.random() * 2*Math.PI
				},
				label: {
					x: -0.19 * w,
					y: 0.10 * h
				},
				size: 0.35 * h
			},
			{
				x: -0.03 * w,
				y: 0.22 * h,
				drift: {											// all mutable values
					x: 0,
					y: 0,
					sinCtr: Math.random() * 2*Math.PI,
					cosCtr: Math.random() * 2*Math.PI,
					// dist: 0,
					// ang: Math.random() * 2*Math.PI
				},
				label: {
					x: -0.20 * w,
					y: 0.15 * h
				},
				size: 0.44 * h
			},
			{
				x: 0.19 * w,
				y: 0.10 * h,
				drift: {											// all mutable values
					x: 0,
					y: 0,
					sinCtr: Math.random() * 2*Math.PI,
					cosCtr: Math.random() * 2*Math.PI,
					// dist: 0,
					// ang: Math.random() * 2*Math.PI
				},
				label: {
					x: 0.01 * w,
					y: 0.27 * h
				},
				size: 0.48 * h
			}
		]);

	},

	initContinentLabels: function () {

		continents.forEach(function (continent) {

			var label = document.createElement('div');
			label.innerHTML = '<a href="#' + continent.id + '"><h3>' + continent.name.toUpperCase() + '</h3></a>';
			label.style.left = Math.round(centerX + continent.x + continent.label.x) + 'px';
			label.style.top = Math.round(centerY + continent.y + continent.label.y) + 'px';
			labelContainer.appendChild(label);

			setTimeout(function () {
				label.classList.add('visible');
			}, 1000);

		});

	},

	update: function () {

		var newCircle,
			circle,
			someContinentIsHighlighted = continents.some(function (continent) { return continent.isHighlighted; }),
			alphaMod,
			speedMod;

		// Draw continents
		continents.forEach(function (continent) {
			/*
			p.push();
			p.translate(centerX + continent.x, centerY + continent.y);
			*/

			// probabilistically spawn new Circles
			newCircle = Circle.spawn(continent);
			if (newCircle) {
				continent.circles.push(newCircle);
			}

			/*
			// set alpha and speed based on interaction
			if (!someContinentIsHighlighted) {
				alphaMod = 1.0;
				speedMod = 1.0;
			} else {
				alphaMod = continent.isHighlighted ? CONTINENT_HIGHLIGHT_ALPHA_MOD : CONTINENT_UNHIGHLIGHT_ALPHA_MOD;
				speedMod = continent.isHighlighted ? CONTINENT_HIGHLIGHT_SPEED_MOD : CONTINENT_UNHIGHLIGHT_SPEED_MOD;
			}
			*/

			/*
			// apply drift
			wander(continent.drift, 3);
			p.translate(continent.drift.x, continent.drift.y);
			*/

			for (var i=continent.circles.length-1; i>=0; i--) {
				circle = continent.circles[i];
				if (circle.isAlive()) {
					circle.update(alphaMod, speedMod);
				} else {
					continent.circles.splice(i, 1);
				}
			};

			/*
			if (continent.isHighlighted) {
				p.stroke(255, 255, 255);
				p.strokeWeight(2);
				p.noFill();
				p.ellipse(0, 0, continent.size, continent.size);
			}
			*/

			/*
			p.pop();
			*/
		});
		
		frameCount++;
		if (this.isActive) {
			window.requestAnimationFrame(this.update);
		}

	},

	/*
	mouseMoved: function (event) {

		var dX, dY;

		continents.forEach(function (continent) {
			dX = centerX + continent.x - p.mouseX;
			dY = centerY + continent.y - p.mouseY;
			continent.isHighlighted = Math.sqrt(dX * dX + dY * dY) < 0.5 * continent.size;
		});
		
	};

	mouseReleased: function () {

		continents.some(function (continent) {
			if (continent.isHighlighted) {
				document.location.hash = continent.id;
				return true;
			}
		});

	};
	*/


	// Random walk
	meander: function (drift, maxDist) {

		var maxSpeed = 2 * 0.01 * maxDist;
		var maxTurn = 2 * 0.002 * Math.PI;
		var x = Math.cos(drift.ang) * drift.dist;
		var y = Math.sin(drift.ang) * drift.dist;
		var angToCenter = Math.atan2(y, x);

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

	},

	// Randomized sinusoidal motion
	wander: function (drift, maxDist) {

		drift.sinCtr += 0.01 + Math.random() * 0.03;
		drift.cosCtr += 0.01 + Math.random() * 0.03;
		drift.x = Math.cos(drift.cosCtr) * maxDist;
		drift.y = Math.sin(drift.sinCtr) * maxDist;

	}

};



const STROKE_WIDTH_MIN = 0.2,
	STROKE_WIDTH_VAR = 0.6,
	SIZE_MOD = 1 / (1 + 0.5 * (STROKE_WIDTH_MIN + STROKE_WIDTH_VAR)),
	BASE_ALPHA = 0.35,
	BASE_SPEED = 0.2;

class Circle {

	// Note: continent.spawnConfig.lastSpawn is mutated by this function
	static spawn (continent) {

		if (frameCount - continent.spawnConfig.lastSpawn > continent.spawnConfig.minDelay) {
			if (Math.random() < continent.spawnConfig.freq) {

				continent.spawnConfig.lastSpawn = frameCount;

				let circle = new Circle(continent.colorPalette, continent.size);
				circle.node = continent.node.append('g');

				return circle;

			} else {
				return null;
			}
		}

	}

	constructor (colorPalette, size) {

		// Scale `size` down to account for stroke weight,
		// to keep all stroked ellipses within `size`.
		this.size = size * SIZE_MOD;

		this.radius = 0;
		this.rSpeed = Math.random() * 0.8;
		this.initSpeed = this.rSpeed;
		this.weight = Math.round(0.2*size + Math.random() * 0.6*size);
		this.alpha = BASE_ALPHA;

		this.color = colorPalette[Math.floor(Math.random() * colorPalette.length)];

		// Assigned and appended in Circle.spawn()
		this.node = null;

	}

	update (alphaMod, speedMod) {
		this.draw(alphaMod);
		this.grow(speedMod);
	};

	draw (alphaMod) {
		// limit stroke to edge of circle
		var sw = Math.min(this.weight, (this.size + 0.5*this.weight - this.radius));

		/*
		p.noFill();
		p.strokeWeight(sw);
		p.stroke(this.color[0], this.color[1], this.color[2], this.alpha*255 * alphaMod);
		p.ellipse(0, 0, this.radius, this.radius);
		*/
	};

	// Note: there is no "age", everything that changes is calculated off of this.radius.
	grow (speedMod) {
		// stroke is centered on this.radius
		var maxRad = this.size + 0.5*this.weight;

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
