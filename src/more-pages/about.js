import d3 from 'd3';
import _ from 'lodash';

import dispatcher from '../dispatcher.js';
import sassVars from '../../scss/variables.json';

const CONTENT = {
	title: "Paul and Eve Ekman created this atlas to aid people in understanding their emotions. In 2009 they presented their research to the Dalai Lama and he requested that it be made available to the general public. They enlisted the help of Stamen Design to realize their vision in a visual fashion.",
	blocks: [
		"<p>Paul Ekman is an American psychologist who is a pioneer in the study of emotions and their relation to facial expressions. He has created an \"atlas of emotions\" with more than ten thousand facial expressions, and has gained a reputation as \"the best human lie detector in the world\".</p><p>He was ranked 59th out of the 100 most cited psychologists of the twentieth century. Ekman conducted seminal research on the specific biological correlates of specific emotions, demonstrating the universality and discreteness of emotions in a Darwinian approach.</p>",
		"<p>Eve Ekman is currently a Post Doctoral Scholar at UCSF’s Osher Center for Integrative Medicine. Ekman’s research interests were inspired by her experience as a medical social worker in the emergency department of San Francisco General Hospital coupled with her training in the applied emotion regulation and mindfulness intervention: Cultivating Emotional Balance, CEB. At the Osher Center for Integrative medicine Eve continues to refine the conceptual framework, research and training in the areas of meaning, empathy and burnout. In addition to research Eve provides training based in Cultivating Emotional Balance to a wide array of clients in technology, health care, criminal justice, law and education both...</p>"
	]

};

export default {

	isInited: false,
	currentEmotion: null,
	wrapper: null,

	init: function (containerNode) {

		this.sectionContainer = containerNode;

		this.wrapper = document.createElement('div');
		this.wrapper.classList.add('wrapper');
		this.sectionContainer.appendChild(this.wrapper);

		this.setContent();
		this.isInited = true;

	},

	setContent: function() {
		if (!this.wrapper) return;

		// title
		const title = document.createElement('div');
		title.classList.add('title');
		title.innerHTML = CONTENT.title;
		this.wrapper.appendChild(title);

		// blocks
		CONTENT.blocks.forEach(block => {
			const el = document.createElement('div');
			el.classList.add('block');
			el.innerHTML = block;
			this.wrapper.appendChild(el);
		});
	},

	setEmotion: function (emotion) {

		return new Promise((resolve, reject) => {

			// TODO: resolve after any intro animations
			// setTimeout(() => {
			resolve();
			// }, sassVars.states.backgrounded.duration.in);

		});

	},

	open: function () {
		console.log('About open');
		this.sectionContainer.classList.add('active');

		if (this.wrapper) {
			this.wrapper.scrollTo(0, 0);
		}
		// any section-wide opening animations not specific to a particular page go here.
		// probably won't be anything here for the more info section.

	},

	close: function () {
		console.log('About close');
		this.sectionContainer.classList.remove('active');
		return new Promise((resolve, reject) => {

			// any closing animation goes here

			resolve();

		});

	}

};
