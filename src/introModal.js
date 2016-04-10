// import _ from 'lodash';
// import d3 from 'd3';
// import TWEEN from 'tween.js';

import dispatcher from './dispatcher.js';
import emotionsData from '../static/emotionsData.json';
import sassVars from '../scss/variables.json';

// TODO: this copy should go elsewhere
const LETS_GET_STARTED = 'Let\'s get started',
	START_FROM_BEGINNING = 'Take it from the top',
	TELL_ME_MORE = 'Tell me more';

export default {

	modalContainer: null,

	init (modalContainer) {

		this.modalContainer = modalContainer;
		this.initCover();
		this.initPages();
		this.initInteraction();

	},

	initCover () {

		// TODO: some (many?) of these elements will exist on all pages,
		// so store them locally for reuse.

		let contentContainer = document.createElement('div');
		contentContainer.classList.add('content');
		this.modalContainer.appendChild(contentContainer);

		let modalHeadline = document.createElement('h2');
		modalHeadline.classList.add('headline');
		modalHeadline.textContent = emotionsData.metadata.intro.header;

		let modalCopy = document.createElement('p');
		modalCopy.classList.add('body');
		modalCopy.innerHTML = emotionsData.metadata.intro.body;

		let buttonFooter = document.createElement('div');
		buttonFooter.classList.add('footer');

		let moreButton = document.createElement('h3');
		moreButton.classList.add('button', 'more');
		moreButton.textContent = TELL_ME_MORE;
		buttonFooter.appendChild(moreButton);

		let exitButton = document.createElement('h3');
		exitButton.classList.add('button', 'exit');
		exitButton.textContent = '<a href="#">LETS_GET_STARTED</a>';
		buttonFooter.appendChild(exitButton);

		contentContainer.appendChild(modalHeadline);
		contentContainer.appendChild(modalCopy);
		contentContainer.appendChild(buttonFooter);

	},

	initPages () {

		// TODO

	},

	initInteraction () {

		// TODO: toggle event handlers when modal opened/closed
		this.modalContainer.addEventListener('mouseover', event => {

			if (event.target.classList.contains('button')) {
				event.target.classList.add('active');
				event.stopImmediatePropagation();
			}

		});

		this.modalContainer.addEventListener('mouseout', event => {

			if (event.target.classList.contains('button')) {
				event.target.classList.remove('active');
				event.stopImmediatePropagation();
			}

		});

		this.modalContainer.addEventListener('click', event => {

			if (event.target.classList.contains('button')) {
				if (event.target.classList.contains('exit')) {
					dispatcher.navigate(dispatcher.HOME);
				} else {
					console.log(">>>>> clicked");
				}
				event.stopImmediatePropagation();
			}

		});

	},

	setExitButtonText (atStart) {

		let exitButton = this.modalContainer.querySelector('.button.exit');
		if (exitButton) {
			exitButton.textContent = atStart ? LETS_GET_STARTED : START_FROM_BEGINNING;
		}

	}

};
