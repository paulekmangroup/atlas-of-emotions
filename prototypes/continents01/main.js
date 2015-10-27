var continentMaker = new p5(function (p) {

	var FRAMERATE = 60;
	var STROKE_WIDTH_MIN = 0.2;
	var STROKE_WIDTH_VAR = 0.6;
	var SIZE_MOD = 1 / (1 + 0.5 * (STROKE_WIDTH_MIN + STROKE_WIDTH_VAR));

	var container = document.getElementById('continents');
	var centerX, centerY;
	var continents;
	var firstDraw = true;

	// size container to viewport
	var headerHeight = 55;	// from main.css
	container.style.height = `${ window.innerHeight - headerHeight }px`;

	var baseSpawnConfig = {
		lastDelay: 0,
		minDelay: 1.35 * FRAMERATE,
		freq: 0.015
	};


	p.setup = function () {

		p.createCanvas(container.offsetWidth, container.offsetHeight);
		p.canvas.id = 'continent-maker';
		p.frameRate(FRAMERATE);
		p.colorMode(p.RGB, 255);
		p.blendMode(p.MULTIPLY);

		centerX = 0.5 * p.width;
		centerY = 0.5 * p.height;

		continents = {
			anger: {
				x: 0.03 * p.width,
				y: -0.20 * p.height,
				spawnConfig: Object.assign({}, baseSpawnConfig),
				colorPalette: [
					[204, 28, 23],
					[208, 46, 53],
					[212, 65, 63],
					[216, 83, 73],
					[220, 102, 83],
					[224, 120, 92],
					[228, 135, 102]
				],
				size: 0.48 * p.height * SIZE_MOD,
				circles: []
			},
			sadness: {
				x: -0.22 * p.width,
				y: -0.14 * p.height,
				spawnConfig: Object.assign({}, baseSpawnConfig),
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
				size: 0.45 * p.height * SIZE_MOD,
				circles: []
			},
			fear: {
				x: -0.06 * p.width,
				y: 0.07 * p.height,
				spawnConfig: Object.assign({}, baseSpawnConfig),
				colorPalette: [
					[143, 39, 139],
					[156, 41, 153],
					[196, 49, 194],
					[209, 51, 207],
					[223, 53, 221],
					[235, 56, 234],
					[248, 58, 248]
				],
				size: 0.35 * p.height * SIZE_MOD,
				circles: []
			},
			enjoyment: {
				x: -0.03 * p.width,
				y: 0.22 * p.height,
				spawnConfig: Object.assign({}, baseSpawnConfig),
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
				size: 0.44 * p.height * SIZE_MOD,
				circles: []
			},
			disgust: {
				x: 0.19 * p.width,
				y: 0.10 * p.height,
				spawnConfig: Object.assign({}, baseSpawnConfig),
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
				size: 0.48 * p.height * SIZE_MOD,
				circles: []
			}
		};

	}

	p.draw = function () {

		var newCircle;
		var continent;
		var circle;

		p.clear();
		p.ellipseMode(p.CENTER);

		Object.keys(continents).forEach(function (continentKey) {
			continent = continents[continentKey];
			if (firstDraw) {
				console.log("size:", continent.size, "w:", p.width, "h:", p.height);
			}
			p.push();
			p.translate(centerX + continent.x, centerY + continent.y);
			newCircle = Circle.spawn(p, continent.colorPalette, continent.size, continent.spawnConfig);
			if (newCircle) {
				continent.circles.push(newCircle);
			}
			for (var i=continent.circles.length-1; i>=0; i--) {
				circle = continent.circles[i];
				if (circle.isAlive()) {
					circle.update();
				} else {
					continent.circles.splice(i, 1);
				}
			};

			p.pop();
		});

		if (firstDraw) {
			container.appendChild(p.canvas);
			firstDraw = false;
		}

	}

	var Circle = function (p, colorPalette, size) {

		var BASE_ALPHA = 0.3;
		var BASE_SPEED = 0.2;

		this.radius = 0;
		this.rSpeed = Math.random() * 0.8;
		this.initSpeed = this.rSpeed;
		this.weight = Math.round(0.2*size + Math.random() * 0.6*size);
		this.alpha = BASE_ALPHA;

		this.color = colorPalette[Math.floor(Math.random() * colorPalette.length)];

		this.update = function () {
			this.draw();
			this.grow();
		}

		this.draw = function () {
			// limit stroke to edge of circle
			var sw = Math.min(this.weight, (size + 0.5*this.weight - this.radius));

			p.noFill();
			p.strokeWeight(sw);
			p.stroke(this.color[0], this.color[1], this.color[2], this.alpha*255)
			p.ellipse(0, 0, this.radius, this.radius);
		};

		// Note: there is no "age", everything that changes is calculated off of this.radius.
		this.grow = function () {
			// stroke is centered on this.radius
			var maxRad = size + 0.5*this.weight;

			// taper off speed as radius approaches maxRad
			this.rSpeed = BASE_SPEED + Math.pow((1 - this.radius / maxRad), 0.5) * this.initSpeed;

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

	// Note: spawnConfig.lastDelay is mutated by this function
	Circle.spawn = function (p, colorPalette, size, spawnConfig) {
		if (p.frameCount - spawnConfig.lastDelay > spawnConfig.minDelay) {
			if (Math.random() < spawnConfig.freq) {
				spawnConfig.lastDelay = p.frameCount;
				return new Circle(p, colorPalette, size);
			} else {
				return null;
			}
		}
	};

});