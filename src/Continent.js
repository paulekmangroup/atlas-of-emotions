import _ from 'lodash';
import d3 from 'd3';
import d3Transform from 'd3-transform';
import TWEEN from 'tween.js';

import Circle from './Circle.js';

const FRAMERATE = 60;
const HIGHLIGHT_ALPHA_MOD = 1.5;
const UNHIGHLIGHT_ALPHA_MOD = 0.3;
const HIGHLIGHT_SPEED_MOD = 2.0;
const UNHIGHLIGHT_SPEED_MOD = 0.5;

export default class Continent {

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

	constructor (emotion, container, continentGeom) {

		if (!Continent.transforms) {
			Continent.initTransforms(continentGeom.w, continentGeom.h);
		}

		this.initInstanceProperties(emotion, container, continentGeom);

	}

	initInstanceProperties (emotion, container, continentGeom) {

		let emotionIndex = Object.keys(Continent.configsByEmotion).indexOf(emotion);
		if (emotionIndex === -1) {
			throw new Error('Invalid emotion "' + emotion + '" for continent.');
		}

		this.id = emotion,
		this.name = emotion.toUpperCase(),
		this.colorPalette = Continent.configsByEmotion[emotion].colorPalette.concat();

		this.spawnConfig = {
			lastSpawn: 0,
			minDelay: 2 * FRAMERATE,
			freq: 0.015
		};

		this.drift = {
			x: 0,
			y: 0,
			sinCtr: Math.random() * 2*Math.PI,
			cosCtr: Math.random() * 2*Math.PI
		};

		this.centerX = continentGeom.centerX;
		this.centerY = continentGeom.centerY;

		// copy transforms onto this Continent instance
		Object.assign(this, Continent.transforms[emotionIndex]);

		this.scaleX = 1.0;
		this.scaleY = 1.0;

		this.circles = [];
		this.isHighlighted = false;

		this.d3Selection = container.append('g')
			.classed('continent ' + this.id, true)
			.datum(this);

	}

	update (state, frameCount) {

		if (this.tweens) {
			_.values(this.tweens).forEach(tween => {
				tween.update(state.time);
			});
		}

		let newCircle,
			circle,
			alphaMod,
			speedMod,
			scale;

		// probabilistically spawn new Circles
		newCircle = Circle.spawn(this, frameCount);
		if (newCircle) {
			this.circles.push(newCircle);
		}

		// set alpha and speed based on interaction
		if (!state.someContinentIsHighlighted) {
			alphaMod = 1.0;
			speedMod = 1.0;
		} else {
			alphaMod = this.isHighlighted ? HIGHLIGHT_ALPHA_MOD : UNHIGHLIGHT_ALPHA_MOD;
			speedMod = this.isHighlighted ? HIGHLIGHT_SPEED_MOD : UNHIGHLIGHT_SPEED_MOD;
		}

		// apply drift
		this.wander(this.drift, 3);
		this.d3Selection
			.attr('transform', d3Transform()
				.translate(
					this.centerX + this.x + this.drift.x,
					this.centerY + this.y + this.drift.y
				)
				.scale(
					this.scaleX,
					this.scaleY
				)
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

	addTween (props, time, func=TWEEN.Easing.Linear.None) {

		if (!this.tweens) {
			this.tweens = {};
		}

		let key = Object.keys(props).sort().join(',');
		if (this.tweens[key]) {
			this.tweens[key].stop();
		}

		this.tweens[key] = new TWEEN.Tween(this)
			.to(props, time)
			.onComplete(() => { delete this.tweens[key]; })
			.easing(func)
			.start();

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


};
