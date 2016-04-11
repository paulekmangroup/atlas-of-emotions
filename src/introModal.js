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

const OVERVIEW_IMG_SIZE = {
	w: 225,
	h: 150
};

export default {

	modalContainer: null,
	pageContainer: null,
	setModalVisibility: null,	// NOTE: this tight coupling is pretty 💩😱, but it's time to finish this site. So, I'm sorry. 😰
	pages: [],
	paginationFooter: null,
	currentPage: Number.NaN,

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

			let modalCaption = document.createElement('figcaption');
			modalCaption.innerHTML = pageData.caption;

			page.appendChild(modalHeadline);
			page.appendChild(modalBody);
			page.appendChild(modalCaption);
			this.pageContainer.appendChild(page);

			return page;

		}));

		//
		// overview
		//
		let overviewPage = this.pages[1];
		let overviewBody = overviewPage.querySelector('.body');

		let imgContainer = document.createElement('figure');
		overviewPage.insertBefore(imgContainer, overviewBody);

		let imgLeftWrapper = document.createElement('div');
		imgLeftWrapper.style.width = '49%';
		let imgLeft = document.createElement('img');
		imgLeft.src = './img/hhAndPaul.jpg';
		imgLeft.style.width = '100%';
		imgLeftWrapper.appendChild(imgLeft);
		imgContainer.appendChild(imgLeftWrapper);

		let imgRightWrapper = document.createElement('div');
		imgRightWrapper.style.width = '49%';
		let imgRight = document.createElement('img');
		imgRight.src = './img/hhAndEve.jpg';
		imgRight.style.width = '100%';
		imgRightWrapper.appendChild(imgRight);
		imgContainer.appendChild(imgRightWrapper);

		overviewPage.insertBefore(overviewPage.querySelector('figcaption'), overviewBody);


		//
		// research
		// 
		let researchPage = this.pages[2];

		//
		// overview
		// 
		let navigationPage = this.pages[3];

		this.paginationFooter = document.createElement('div');
		this.paginationFooter.classList.add('footer', 'pagination');
		pageIds.unshift('cover');
		pageIds.forEach((id, i) => {
			let paginationButton = document.createElement('div');
			paginationButton.classList.add('button', 'pagination');
			paginationButton.setAttribute('data-page-id', i);
			this.paginationFooter.appendChild(paginationButton);
		});
		this.modalContainer.appendChild(this.paginationFooter);

	},

	setActive (val) {

		// TODO: toggle event handlers when modal opened/closed
		this.modalContainer.addEventListener('mouseover', event => {

			if (event.target.classList.contains('button') &&
				parseInt(event.target.dataset.pageId) !== this.currentPage) {
				event.target.classList.add('active');
				event.stopImmediatePropagation();
			}

		});

		this.modalContainer.addEventListener('mouseout', event => {

			if (event.target.classList.contains('button') &&
				parseInt(event.target.dataset.pageId) !== this.currentPage) {
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
		if (index === this.currentPage) { return; }
		this.currentPage = index;

		// container
		this.modalContainer.classList[index ? 'add' : 'remove']('pages');

		// pages
		this.pages.forEach((page, i) => page.classList[i === index ? 'add' : 'remove']('visible'));
		/*
		// pages
		this.pages.forEach((page, i) => {
			if (i === index && !page.classList.contains('visible')) {
				// make visible and fade in after last page fades out
				setTimeout(() => {
					page.classList.add('visible', 'focused');
				}, sassVars.ui.modal.pages.duration * 1000);
			} else if (i !== index && page.classList.contains('visible')) {
				// fade out and make visible on transition end
				page.classList.remove('focused');
				page.addEventListener('transitionend', event => page.classList.remove('visible'));
			}
		});
		*/


		// footers / buttons
		this.paginationFooter.classList[index ? 'add' : 'remove']('visible');

		if (index) {
			let paginationButtons = this.paginationFooter.querySelectorAll('.button');
			for (let i=0; i<paginationButtons.length; i++) {
				paginationButtons[i].classList[index === i ? 'add' : 'remove']('active');
			}
		}

	}

};
