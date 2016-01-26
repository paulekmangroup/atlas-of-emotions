import d3 from 'd3';

const STROKE_WIDTH_MIN = 0.4,
	STROKE_WIDTH_VAR = 1.2,
	SIZE_MOD = 1 / (1 + 0.5 * (STROKE_WIDTH_MIN + STROKE_WIDTH_VAR)),
	BASE_SPEED = 0.05;

export default class Circle {

	static BASE_ALPHA = 0.5;

	// Note: continent.spawnConfig.lastSpawn is mutated by this function
	static spawn (continent, frameCount, forceSpawn) {

		if (forceSpawn || frameCount - continent.spawnConfig.lastSpawn > continent.spawnConfig.minDelay) {
			if (forceSpawn || Math.random() < continent.spawnConfig.freq) {
				if (!forceSpawn) {
					continent.spawnConfig.lastSpawn = frameCount;
				}
				return new Circle(continent.circleWrapper, continent.colorPalette, continent.size);
			} else {
				return null;
			}
		}

	}

	/**
	 * Called by Continent.js to get properties for Circle-like objects
	 * that unfortunately exist outside of our happy OOP structure here.
	 */
	static getStrokeProps (colorPalette, size) {

		let color = colorPalette[Math.floor(Math.random() * colorPalette.length)].join(','),
			alpha = Circle.BASE_ALPHA,
			weight = Math.round(0.4*size*SIZE_MOD + Math.random() * 1.2*size*SIZE_MOD);

		return {
			'stroke': 'rgba(' + color + ',' + alpha + ')',
			'sw': weight
		};

	}

	constructor (container, colorPalette, size) {

		// Scale `size` down to account for stroke weight,
		// to keep all stroked ellipses within `size`.
		this.size = size * SIZE_MOD;

		this.radius = 0;
		this.rSpeed = Math.random() * 0.2;
		this.initSpeed = this.rSpeed;
		this.weight = Math.round(0.4*size + Math.random() * 1.2*size);
		this.alpha = Circle.BASE_ALPHA;

		this.color = colorPalette[Math.floor(Math.random() * colorPalette.length)].join(',');

		this.d3Wrapper = container.append('circle')
			.attr('cx', 0)
			.attr('cy', 0)
			.attr('r', this.radius)
			.attr('stroke', 'rgb(' + this.color + ')')
			.attr('stroke-opacity', this.alpha);

	}

	update (alphaMod, speedMod) {
		this.draw(alphaMod);
		this.grow(speedMod);
	}

	draw (alphaMod) {

		// limit stroke to edge of circle
		let sw = this.calcStrokeWidth();

		this.d3Wrapper
			.attr('r', this.radius)
			.attr('stroke-width', sw)
			.attr('stroke', 'rgb(' + this.color + ')')
			.attr('stroke-opacity', this.alpha * alphaMod);

	}

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
			this.alpha = Math.max(0, Circle.BASE_ALPHA * (maxRad - this.radius) / (0.5 * this.weight));
		}
	}

	calcStrokeWidth () {

		return Math.min(this.weight, (this.size + 0.5*this.weight - this.radius));

	}

	isAlive () {
		return this.alpha > 0.01;
	}

};
