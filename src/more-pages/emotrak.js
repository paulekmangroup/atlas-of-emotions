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
		this.data = data.emotrak;

		this.sectionContainer = containerNode;

		this.wrapper = this.sectionContainer.querySelector('.wrapper');

		this.setContent();
		this.isInited = true;

	},

	setContent: function() {
		if (!this.wrapper) return;

		const table = document.createElement('div');
		const introRow = document.createElement('div');
		const subRow = document.createElement('div');
		const signup = document.createElement('div');

		signup.innerHTML = '<div id="mc_embed_signup"><form action="//eveekman.us12.list-manage.com/subscribe/post?u=a8f41488aed929208e96dcf44&amp;id=073f16206c" method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form" class="validate" target="_blank" novalidate><div id="mc_embed_signup_scroll"><label for="mce-EMAIL">Subscribe for EmoTrak Release Updates</label><input type="email" value="" name="EMAIL" class="email" id="mce-EMAIL" placeholder="email address" required><div style="position: absolute; left: -5000px;" aria-hidden="true"><input type="text" name="b_a8f41488aed929208e96dcf44_073f16206c" tabindex="-1" value=""></div><div class="clear"><input type="submit" value="Subscribe" name="subscribe" id="mc-embedded-subscribe" class="button"></div></div></form></div>';

		table.classList.add('tb');
		introRow.classList.add('tb-row');
		subRow.classList.add('tb-row');

		introRow.appendChild(utils.makeBlock(this.data.title, this.data.desc));

		const subBlocks = document.createElement('div');
		subBlocks.classList.add('sub-blocks');

		this.data.subsections.forEach(section => {
			if(section.image){
				subBlocks.appendChild(utils.makeImageBlock(section.title, section.desc, section.image, 'jpg'));
			} else if (section.mail){
				subBlocks.appendChild(signup);
			} else {
				subBlocks.appendChild(utils.makeBlock(section.title, section.desc));
			}
		});

		subRow.appendChild(subBlocks);

		subRow.appendChild(subBlocks);
		table.appendChild(introRow);
		table.appendChild(subRow);
		this.wrapper.appendChild(table);
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

		if (this.wrapper) {
			document.querySelector('.sub-blocks').scrollTo(0, 0);
		}
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
