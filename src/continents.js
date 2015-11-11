/*
var continentMaker = new p5(function (p) {

	var FRAMERATE = 60;
	var STROKE_WIDTH_MIN = 0.2;
	var STROKE_WIDTH_VAR = 0.6;
	var SIZE_MOD = 1 / (1 + 0.5 * (STROKE_WIDTH_MIN + STROKE_WIDTH_VAR));
	var BASE_ALPHA = 0.35;
	var BASE_SPEED = 0.2;
	var CONTINENT_HIGHLIGHT_ALPHA_MOD = 1.5;
	var CONTINENT_UNHIGHLIGHT_ALPHA_MOD = 0.3;
	var CONTINENT_HIGHLIGHT_SPEED_MOD = 2.0;
	var CONTINENT_UNHIGHLIGHT_SPEED_MOD = 0.5;

	var container = document.getElementById('continents');
	var labelContainer = document.getElementById('continent-labels');
	var centerX, centerY;
	var continents;
	var firstDraw = true;

	// size container to viewport
	var headerHeight = 55;	// from main.css
	container.style.height = (window.innerHeight - headerHeight) + 'px';

	var baseSpawnConfig = {
		lastSpawn: 0,
		minDelay: 1.35 * FRAMERATE,
		freq: 0.015
	};


	p.setup = function () {

		p.createCanvas(container.offsetWidth, container.offsetHeight);
		p.canvas.id = 'continent-maker';
		p.frameRate(FRAMERATE);
		p.colorMode(p.RGB, 255);
		p.blendMode(p.MULTIPLY);

		centerX = 0.55 * p.width;
		centerY = 0.5 * p.height;

		// TODO: `Continent` should be a class, or at least have an object factory, to maintain state.
		continents = [
			{
				id: 'anger',
				name: 'anger',
				x: 0.03 * p.width,
				y: -0.20 * p.height,
				label: {
					x: 0.19 * p.width,
					y: -0.13 * p.height
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
				size: 0.48 * p.height,
				circles: [],										// mutable
				isHighlighted: false								// mutable
			},
			{
				id: 'sadness',
				name: 'sadness',
				x: -0.22 * p.width,
				y: -0.14 * p.height,
				label: {
					x: -0.24 * p.width,
					y: -0.01 * p.height
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
				size: 0.45 * p.height,
				circles: [],										// mutable
				isHighlighted: false								// mutable
			},
			{
				id: 'fear',
				name: 'fear',
				x: -0.06 * p.width,
				y: 0.07 * p.height,
				label: {
					x: -0.19 * p.width,
					y: 0.10 * p.height
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
				size: 0.35 * p.height,
				circles: [],										// mutable
				isHighlighted: false								// mutable
			},
			{
				id: 'enjoyment',
				name: 'enjoyment',
				x: -0.03 * p.width,
				y: 0.22 * p.height,
				label: {
					x: -0.20 * p.width,
					y: 0.15 * p.height
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
				size: 0.44 * p.height,
				circles: [],										// mutable
				isHighlighted: false								// mutable
			},
			{
				id: 'disgust',
				name: 'disgust',
				x: 0.19 * p.width,
				y: 0.10 * p.height,
				label: {
					x: 0.01 * p.width,
					y: 0.27 * p.height
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
				size: 0.48 * p.height,
				circles: [],										// mutable
				isHighlighted: false								// mutable
			}
		],

		continentTransforms = _.shuffle([
			{
				x: 0.03 * p.width,
				y: -0.20 * p.height,
				drift: {											// all mutable values
					x: 0,
					y: 0,
					sinCtr: Math.random() * 2*Math.PI,
					cosCtr: Math.random() * 2*Math.PI,
					// dist: 0,
					// ang: Math.random() * 2*Math.PI
				},
				label: {
					x: 0.19 * p.width,
					y: -0.13 * p.height
				},
				size: 0.48 * p.height
			},
			{
				x: -0.22 * p.width,
				y: -0.14 * p.height,
				drift: {											// all mutable values
					x: 0,
					y: 0,
					sinCtr: Math.random() * 2*Math.PI,
					cosCtr: Math.random() * 2*Math.PI,
					// dist: 0,
					// ang: Math.random() * 2*Math.PI
				},
				label: {
					x: -0.24 * p.width,
					y: -0.01 * p.height
				},
				size: 0.45 * p.height
			},
			{
				x: -0.06 * p.width,
				y: 0.07 * p.height,
				drift: {											// all mutable values
					x: 0,
					y: 0,
					sinCtr: Math.random() * 2*Math.PI,
					cosCtr: Math.random() * 2*Math.PI,
					// dist: 0,
					// ang: Math.random() * 2*Math.PI
				},
				label: {
					x: -0.19 * p.width,
					y: 0.10 * p.height
				},
				size: 0.35 * p.height
			},
			{
				x: -0.03 * p.width,
				y: 0.22 * p.height,
				drift: {											// all mutable values
					x: 0,
					y: 0,
					sinCtr: Math.random() * 2*Math.PI,
					cosCtr: Math.random() * 2*Math.PI,
					// dist: 0,
					// ang: Math.random() * 2*Math.PI
				},
				label: {
					x: -0.20 * p.width,
					y: 0.15 * p.height
				},
				size: 0.44 * p.height
			},
			{
				x: 0.19 * p.width,
				y: 0.10 * p.height,
				drift: {											// all mutable values
					x: 0,
					y: 0,
					sinCtr: Math.random() * 2*Math.PI,
					cosCtr: Math.random() * 2*Math.PI,
					// dist: 0,
					// ang: Math.random() * 2*Math.PI
				},
				label: {
					x: 0.01 * p.width,
					y: 0.27 * p.height
				},
				size: 0.48 * p.height
			}
		]);

	}

	p.draw = function () {

		var newCircle,
			circle,
			someContinentIsHighlighted = continents.some(function (continent) { return continent.isHighlighted; }),
			alphaMod,
			speedMod;

		// Do this once.
		if (firstDraw) {

			// Put the canvas where it belongs
			container.appendChild(p.canvas);

			// Assign continents to positions
			continents.forEach(function (continent, i) {
				continent = Object.assign(continent, continentTransforms[i]);
			});

			// Draw the continent labels
			addContinentLabels();

			firstDraw = false;
		}

		p.clear();
		p.ellipseMode(p.CENTER);

		// Draw continents
		continents.forEach(function (continent) {
			p.push();
			p.translate(centerX + continent.x, centerY + continent.y);

			newCircle = Circle.spawn(p, continent.colorPalette, continent.size, continent.spawnConfig);
			if (newCircle) {
				continent.circles.push(newCircle);
			}

			// set alpha and speed based on interaction
			if (!someContinentIsHighlighted) {
				alphaMod = 1.0;
				speedMod = 1.0;
			} else {
				alphaMod = continent.isHighlighted ? CONTINENT_HIGHLIGHT_ALPHA_MOD : CONTINENT_UNHIGHLIGHT_ALPHA_MOD;
				speedMod = continent.isHighlighted ? CONTINENT_HIGHLIGHT_SPEED_MOD : CONTINENT_UNHIGHLIGHT_SPEED_MOD;
			}

			// apply drift
			wander(continent.drift, 3);
			p.translate(continent.drift.x, continent.drift.y);

			for (var i=continent.circles.length-1; i>=0; i--) {
				circle = continent.circles[i];
				if (circle.isAlive()) {
					circle.update(alphaMod, speedMod);
				} else {
					continent.circles.splice(i, 1);
				}
			};

			if (continent.isHighlighted) {
				p.stroke(255, 255, 255);
				p.strokeWeight(2);
				p.noFill();
				p.ellipse(0, 0, continent.size, continent.size);
			}

			p.pop();
		});

	}

	p.mouseMoved = function () {

		var dX, dY;

		continents.forEach(function (continent) {
			dX = centerX + continent.x - p.mouseX;
			dY = centerY + continent.y - p.mouseY;
			continent.isHighlighted = Math.sqrt(dX * dX + dY * dY) < 0.5 * continent.size;
		});
		
	}

	p.mouseReleased = function () {

		continents.some(function (continent) {
			if (continent.isHighlighted) {
				document.location.hash = continent.id;
				return true;
			}
		});

	}

	var Circle = function (p, colorPalette, size) {

		// Scale `size` down to account for stroke weight,
		// to keep all stroked ellipses within `size`.
		size *= SIZE_MOD;

		this.radius = 0;
		this.rSpeed = Math.random() * 0.8;
		this.initSpeed = this.rSpeed;
		this.weight = Math.round(0.2*size + Math.random() * 0.6*size);
		this.alpha = BASE_ALPHA;

		this.color = colorPalette[Math.floor(Math.random() * colorPalette.length)];

		this.update = function (alphaMod, speedMod) {
			this.draw(alphaMod);
			this.grow(speedMod);
		}

		this.draw = function (alphaMod) {
			// limit stroke to edge of circle
			var sw = Math.min(this.weight, (size + 0.5*this.weight - this.radius));

			p.noFill();
			p.strokeWeight(sw);
			p.stroke(this.color[0], this.color[1], this.color[2], this.alpha*255 * alphaMod)
			p.ellipse(0, 0, this.radius, this.radius);
		};

		// Note: there is no "age", everything that changes is calculated off of this.radius.
		this.grow = function (speedMod) {
			// stroke is centered on this.radius
			var maxRad = size + 0.5*this.weight;

			// taper off speed as radius approaches maxRad
			this.rSpeed = BASE_SPEED + Math.pow((1 - this.radius / maxRad), 0.5) * this.initSpeed;
			this.rSpeed *= speedMod;

			this.radius += this.rSpeed;

			// fade out once radius hits outside edge
			if (this.radius > size) {
				this.alpha = Math.max(0, BASE_ALPHA * (maxRad - this.radius) / (0.5 * this.weight));
			}
		};

		this.isAlive = function () {
			return this.alpha > 0.01;
		}

	};

	// Note: spawnConfig.lastSpawn is mutated by this function
	Circle.spawn = function (p, colorPalette, size, spawnConfig) {

		if (p.frameCount - spawnConfig.lastSpawn > spawnConfig.minDelay) {
			if (Math.random() < spawnConfig.freq) {
				spawnConfig.lastSpawn = p.frameCount;
				return new Circle(p, colorPalette, size);
			} else {
				return null;
			}
		}

	};

	function addContinentLabels () {

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

	}

	// Random walk
	function meander (drift, maxDist) {

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

	}

	// Randomized sinusoidal motion
	function wander (drift, maxDist) {

		drift.sinCtr += 0.01 + Math.random() * 0.03;
		drift.cosCtr += 0.01 + Math.random() * 0.03;
		drift.x = Math.cos(drift.cosCtr) * maxDist;
		drift.y = Math.sin(drift.sinCtr) * maxDist;

	}

});
*/
