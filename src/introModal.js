import _ from 'lodash';

import dispatcher from './dispatcher.js';
import appStrings from './appStrings.js';
import sassVars from '../scss/variables.json';

// TODO: this copy should go elsewhere
const GO_TO_ATLAS = 'Go to Atlas',
	BACK = 'Back',
	TAKE_A_TOUR = 'Take a tour',
	IS_UNIVERSAL = 'is universal',
	WHY_AN_ATLAS = 'Why an Atlas?',
	GET_STARTED = 'Get started!',
	LEFT = 'Left',
	RIGHT = 'Right',
	DOWN = 'Down';

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
	isSettingPage: false,

	init (modalContainer, setModalVisibility) {

		this.modalContainer = modalContainer;
		this.setModalVisibility = setModalVisibility;

		this.pageContainer = document.createElement('div');
		this.pageContainer.classList.add('page-container');
		this.modalContainer.appendChild(this.pageContainer);

		// this.initCoverPage();
		this.initPages();

		let closeButton = document.createElement('div');
		closeButton.classList.add('close-button');
		this.modalContainer.appendChild(closeButton);

		this.setActive(true);
		this.setCurrentPage(0);

	},
	/*
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

		let exitButton = document.createElement('h3');
		exitButton.classList.add('button', 'exit', 'cover');
		exitButton.textContent = '<a href="#">GO_TO_ATLAS</a>';
		buttonFooter.appendChild(exitButton);

		let moreButton = document.createElement('h3');
		moreButton.classList.add('button', 'more', 'cover');
		moreButton.textContent = TAKE_A_TOUR;
		buttonFooter.appendChild(moreButton);

		page.appendChild(modalHeadline);
		page.appendChild(modalBody);
		page.appendChild(buttonFooter);
		this.pageContainer.appendChild(page);


	},
	*/
	initPages () {

		let pageIds = [
			'overview',
			'navigation',
			'research'
		];

		this.pages = this.pages.concat(appStrings().getStr('emotionsData.metadata.intro.steps').map((pageData, i) => {

			let page = document.createElement('div');
			page.classList.add('page', pageIds[i]);

			let modalHeadline = document.createElement('h2');
			modalHeadline.classList.add('headline');
			modalHeadline.textContent = pageData.header;

			let modalBody = document.createElement('p');
			modalBody.classList.add('body');
			modalBody.innerHTML = pageData.body;

			// let modalCaption = document.createElement('figcaption');
			// modalCaption.innerHTML = pageData.caption;
			let modalCaption = document.createElement('p');
			modalCaption.classList.add('body', 'two');
			modalCaption.innerHTML = pageData.caption;

			page.appendChild(modalHeadline);
			page.appendChild(modalBody);
			if (pageData.caption && !~pageData.caption.indexOf('intro_caption')) page.appendChild(modalCaption);
			this.pageContainer.appendChild(page);

			return page;

		}));

		//
		// overview
		//
		let overviewPage = this.pages[0];
		let overviewBody = overviewPage.querySelector('.body');

		/*
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
		*/

		// overviewPage.insertBefore(overviewPage.querySelector('.two'), overviewBody);

		let buttonFooter = document.createElement('div');
		buttonFooter.classList.add('footer');

		let exitButton = document.createElement('h3');
		exitButton.classList.add('button', 'exit', 'cover');
		exitButton.textContent = `<a href="#">${ GO_TO_ATLAS }</a>`;
		buttonFooter.appendChild(exitButton);

		let moreButton = document.createElement('h3');
		moreButton.classList.add('button', 'more', 'cover');
		moreButton.textContent = TAKE_A_TOUR;
		buttonFooter.appendChild(moreButton);
		overviewPage.appendChild(buttonFooter);


		//
		// navigation
		//
		let navigationPage = this.pages[1];
		let navDiagram = document.createElement('img');
		navDiagram.src = './img/navigate.png';
		navDiagram.style.width = '100%';
		navigationPage.appendChild(navDiagram);
		// navigationPage.removeChild(navigationPage.querySelector('figcaption'));

		let navDiagramLabels = document.createElement('div');
		navDiagramLabels.classList.add('nav-diagram-labels');
		let navLabelLeft = document.createElement('p');
		navLabelLeft.classList.add('left', 'nav-label');
		navLabelLeft.textContent = LEFT;
		navDiagramLabels.appendChild(navLabelLeft);
		let navLabelRight = document.createElement('p');
		navLabelRight.classList.add('right', 'nav-label');
		navLabelRight.textContent = RIGHT;
		navDiagramLabels.appendChild(navLabelRight);
		let navLabelDown = document.createElement('p');
		navLabelDown.classList.add('down', 'nav-label');
		navLabelDown.textContent = DOWN;
		navDiagramLabels.appendChild(navLabelDown);
		navigationPage.appendChild(navDiagramLabels);

		let navButtonFooter = document.createElement('div');
		navButtonFooter.classList.add('footer');

		let navExitButton = document.createElement('h3');
		navExitButton.classList.add('button', 'pagination', 'cover');
		navExitButton.textContent = BACK;
		navExitButton.setAttribute('data-page-id', 0);
		navButtonFooter.appendChild(navExitButton);

		let navMoreButton = document.createElement('h3');
		navMoreButton.classList.add('button', 'pagination', 'cover');
		navMoreButton.textContent = WHY_AN_ATLAS;
		navMoreButton.setAttribute('data-page-id', 2);
		navButtonFooter.appendChild(navMoreButton);
		navigationPage.appendChild(navButtonFooter);


		//
		// research
		//
		let researchPage = this.pages[2],
			researchData = appStrings().getStr('secondaryData.annex.scientific-basis.content'),
			findResearchDatum = key => {
				let match = researchData.find(datum => datum.desc.toLowerCase().indexOf(key) !== -1);
				return match ? match.name : '';
			},
			surveyResultUniversal = findResearchDatum('universal emotion'),
			surveyResultsEmotions = _.values(dispatcher.EMOTIONS).reduce((obj, emotion) => {
				// 'enjoyment' is called 'happiness' in researchData
				obj[emotion] = findResearchDatum(emotion === 'enjoyment' ? 'happiness' : emotion);
				return obj;
			}, {});

		// let researchCaption = researchPage.querySelector('figcaption');
		// researchPage.querySelector('figcaption').innerHTML = '<span class="big-num">' + surveyResultUniversal + '</span><span class="right">' + researchCaption.textContent + '</span>';

		let vizContainer = document.createElement('div'),
			capitalize = str => str[0].toUpperCase() + str.substr(1);
		vizContainer.classList.add('survey-results');
		_.values(dispatcher.EMOTIONS).forEach(emotion => {
			let viz = document.createElement('div');
			viz.classList.add('viz');
			let bar = document.createElement('div');
			bar.classList.add('bar', emotion);
			bar.style.height = surveyResultsEmotions[emotion];
			bar.style.top = (100 - 3 - parseInt(surveyResultsEmotions[emotion].replace('%', ''))) + '%';
			let copy = document.createElement('p');
			copy.innerHTML = '<span class="big-num">' + surveyResultsEmotions[emotion] + '</span>' + capitalize(emotion) + ' ' + IS_UNIVERSAL;
			viz.appendChild(bar);
			viz.appendChild(copy);
			vizContainer.appendChild(viz);
		});

		researchPage.appendChild(vizContainer);
		researchPage.appendChild(researchPage.querySelector('.two'));

		let resButtonFooter = document.createElement('div');
		resButtonFooter.classList.add('footer');

		let resExitButton = document.createElement('h3');
		resExitButton.classList.add('button', 'pagination', 'cover');
		resExitButton.textContent = BACK;
		resExitButton.setAttribute('data-page-id', 1);
		resButtonFooter.appendChild(resExitButton);

		let resMoreButton = document.createElement('h3');
		resMoreButton.classList.add('button', 'exit', 'cover');
		resMoreButton.textContent = GET_STARTED;
		resButtonFooter.appendChild(resMoreButton);
		researchPage.appendChild(resButtonFooter);



		/*
		//
		// footer
		//
		this.paginationFooter = document.createElement('div');
		this.paginationFooter.classList.add('footer', 'pagination');
		// pageIds.unshift('cover');
		pageIds.forEach((id, i) => {
			let paginationButton = document.createElement('div');
			paginationButton.classList.add('button', 'pagination');
			paginationButton.setAttribute('data-page-id', i);
			this.paginationFooter.appendChild(paginationButton);
		});
		this.modalContainer.appendChild(this.paginationFooter);
		*/

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
			exitButton.textContent = atStart ? GO_TO_ATLAS : BACK;
		}

	},

	setCurrentPage (index) {

		if (isNaN(index)) { return; }
		if (index === this.currentPage) { return; }
		if (this.isSettingPage) { return; }

		// container (pages after cover page are styled differently)
		this.modalContainer.classList[index ? 'add' : 'remove']('pages');

		// pages
		this.pages.forEach((page, i) => page.classList[i === index ? 'add' : 'remove']('visible', 'focused'));

		/*
		// this fanciness didn't work out, taking too much time. nevermind.
		// pages
		if (this.currentPage === 0 || (this.currentPage && index === 0)) {

			// apply transitions between the cover page and other pages
			this.isSettingPage = true;

			let prevPage = this.pages[this.currentPage],
				nextPage = this.pages[index];

			// fade out the last page
			prevPage.classList.remove('focused');
			prevPage.addEventListener('transitionend', pageEvent => {
				// once faded out, remove visibility
				// and change height of modal
				prevPage.classList.remove('visible');
				this.modalContainer.classList[index ? 'add' : 'remove']('pages');
				this.modalContainer.addEventListener('transitionend', modalEvent => {
					if (modalEvent.propertyName === 'height') {
						// once modal height changes,
						// reveal the next page
						nextPage.classList.add('visible');
						setTimeout(() => {
							// transition won't happen if it starts while element is not visible
							nextPage.classList.add('focused');
						}, 1);
						this.isSettingPage = false;
					}
				});
			});

		} else {

			// no transitions between other pages
			this.pages.forEach((page, i) => page.classList[i === index ? 'add' : 'remove']('visible', 'focused'));

		}
		*/

		/*
		// footers / buttons
		this.paginationFooter.classList[index ? 'add' : 'remove']('visible');

		if (index) {
			let paginationButtons = this.paginationFooter.querySelectorAll('.button');
			for (let i=0; i<paginationButtons.length; i++) {
				paginationButtons[i].classList[index === i ? 'add' : 'remove']('active');
			}
		}
		*/

		this.currentPage = index;

	}

};
