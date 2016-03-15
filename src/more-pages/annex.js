import d3 from 'd3';
import _ from 'lodash';

import * as utils from './utils.js';
import dispatcher from '../dispatcher.js';
import sassVars from '../../scss/variables.json';

export default {

	isInited: false,
	currentEmotion: null,
	wrapper: null,

	init: function (containerNode, data) {
		this.data = data.annex;

		this.sectionContainer = containerNode;

		this.wrapper = this.sectionContainer.querySelector('.wrapper');

		this.setContent();
		this.isInited = true;
	},

	makeButton: function (section) {
		const btn = document.createElement('button');
		btn.textContent = section.title;
		btn.setAttribute('data-annexkey', section.key);
		btn.addEventListener('click', function(e) {
			dispatcher.navigate(dispatcher.SECTIONS.MORE, null, dispatcher.ANNEX_DATA_2_PAGE[section.key]);
		});
		return btn;
	},

	setContent: function() {
		if (!this.wrapper) return;
		const sections = Object.keys(this.data).map(key => {
			return {
				key,
				title: this.data[key].title
			};
		});

		sections.sort((a,b) => {
			if(a.title < b.title) return -1;
			if(a.title > b.title) return 1;
			return 0;
		});

		const title = document.createElement('h4');
		title.classList.add('annex-title');
		title.textContent = 'Welcome to the Annex, home to additional information regarding emotions research.';
		this.wrapper.appendChild(title);

		const helper = document.createElement('p');
		helper.classList.add('annex-helper');
		helper.textContent = 'Explore the topics below to learn more:';
		this.wrapper.appendChild(helper);

		const list = document.createElement('ul');
		list.classList.add('annex-btn-list');

		sections.forEach(section => {
			if (section.key && section.title) {
				const li = document.createElement('li');
				li.appendChild(this.makeButton(section));
				list.appendChild(li);
			}
		});

		this.wrapper.appendChild(list);
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
		this.sectionContainer.classList.add('active');
		// any section-wide opening animations not specific to a particular page go here.
		// probably won't be anything here for the more info section.

	},

	close: function () {
		this.sectionContainer.classList.remove('active');
		return new Promise((resolve, reject) => {

			// any closing animation goes here

			resolve();

		});

	}

};
