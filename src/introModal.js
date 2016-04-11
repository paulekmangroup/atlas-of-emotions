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
	pageContainer: null,
	setModalVisibility: null,	// NOTE: this tight coupling is pretty 💩😱, but it's time to finish this site. So, I'm sorry. 😰
	pages: [],
	paginationFooter: null,

	init (modalContainer, setModalVisibility) {

		this.modalContainer = modalContainer;
		this.setModalVisibility = setModalVisibility;

		this.pageContainer = document.createElement('div');
		this.pageContainer.classList.add('page-container');
		this.modalContainer.appendChild(this.pageContainer);

		this.initCoverPage();
		this.initPages();

		let closeButton = document.createElement('div');
		closeButton.classList.add('close-button');
		this.modalContainer.appendChild(closeButton);

		this.setActive(true);
		this.setCurrentPage(0);

	},

	initCoverPage () {

		let page = document.createElement('div');
		page.classList.add('page');
		this.pages.push(page);

		let modalHeadline = document.createElement('h2');
		modalHeadline.classList.add('headline');
		modalHeadline.textContent = emotionsData.metadata.intro.header;

		let modalBody = document.createElement('p');
		modalBody.classList.add('body');
		modalBody.innerHTML = emotionsData.metadata.intro.body;

		let buttonFooter = document.createElement('div');
		buttonFooter.classList.add('footer');

		let moreButton = document.createElement('h3');
		moreButton.classList.add('button', 'more', 'cover');
		moreButton.textContent = TELL_ME_MORE;
		buttonFooter.appendChild(moreButton);

		let exitButton = document.createElement('h3');
		exitButton.classList.add('button', 'exit', 'cover');
		exitButton.textContent = '<a href="#">LETS_GET_STARTED</a>';
		buttonFooter.appendChild(exitButton);

		page.appendChild(modalHeadline);
		page.appendChild(modalBody);
		page.appendChild(buttonFooter);
		this.pageContainer.appendChild(page);


	},

	initPages () {

		let pageIds = [
			'overview',
			'research',
			'navigation'
		];

		this.pages = this.pages.concat(emotionsData.metadata.intro.steps.map((pageData, i) => {

			let page = document.createElement('div');
			page.classList.add('page', pageIds[i]);

			let modalHeadline = document.createElement('h2');
			modalHeadline.classList.add('headline');
			modalHeadline.textContent = pageData.header;

			let modalBody = document.createElement('p');
			modalBody.classList.add('body');
			modalBody.innerHTML = pageData.body;

			let modalCaption = document.createElement('p');
			modalCaption.classList.add('caption');
			modalCaption.innerHTML = pageData.caption;

			page.appendChild(modalHeadline);
			page.appendChild(modalBody);
			page.appendChild(modalCaption);
			this.pageContainer.appendChild(page);

			return page;

		}));

		this.paginationFooter = document.createElement('div');
		this.paginationFooter.classList.add('footer', 'pagination');
		pageIds.forEach((id, i) => {
			let paginationButton = document.createElement('div');
			paginationButton.classList.add('button', 'pagination');
			paginationButton.setAttribute('data-page-id', i + 1);
			this.paginationFooter.appendChild(paginationButton);
		});
		this.modalContainer.appendChild(this.paginationFooter);

	},

	setActive (val) {

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
				} else if (event.target.classList.contains('more')) {
					this.setCurrentPage(1);
				} else if (event.target.classList.contains('pagination')) {
					this.setCurrentPage(parseInt(event.target.dataset.pageId));
				}
				event.stopImmediatePropagation();

			} else if (event.target.classList.contains('close-button')) {

				this.setModalVisibility(false);

			}

		});

	},

	setExitButtonText (atStart) {

		let exitButton = this.modalContainer.querySelector('.button.exit');
		if (exitButton) {
			exitButton.textContent = atStart ? LETS_GET_STARTED : START_FROM_BEGINNING;
		}

	},

	setCurrentPage (index) {

		if (isNaN(index)) { return; }

		this.pages.forEach((page, i) => page.classList[i === index ? 'add' : 'remove']('visible'));

		this.paginationFooter.classList[index ? 'add' : 'remove']('visible');

		if (index) {
			let paginationButtons = this.paginationFooter.querySelectorAll('.button');
			for (let i=0; i<paginationButtons.length; i++) {
				paginationButtons[i].classList[index === i + 1 ? 'add' : 'remove']('active');
			}
		}

	}

};
