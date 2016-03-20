import dispatcher from './dispatcher.js';
import sassVars from '../scss/variables.json';

class PopupManager {
	constructor () {
		this.selected = null;
		this.template = null;
		this.currentName = null;
		this.popups = {};
		this.init();
	}

	init () {
		// create the template node
		if (!this.template) this.initTemplate();
		this.template.classList.add('popup-template');
	}


	open (props) {
		this.closeAll();

		const clone = this.template.cloneNode(true);
		clone.style.display = 'block';

		clone.querySelector('.body')
			.textContent = props.desc;

		clone.querySelector('.close')
			.addEventListener('click', this.onPopupCloseButtonClick.bind(this, props.id), false);

		props.popup = clone;
		this.popups[props.id] = props;

		props.target.appendChild(clone);
		props.target.classList.add('popped');

		if (props.target.getAttribute('data-clip')) {
			props.target.classList.add('unclip');
		}

		// set w/h
		let w = clone.offsetWidth + 100;
		w = Math.max(w, 250);

		clone.style.cssText = `width: ${w}px;`;
		clone.offsetWidth; // force repaint

		// measure elements while at full size
		let h = clone.offsetHeight,
			popupWidth = props.target.offsetWidth,
			popupHeight = props.target.offsetHeight;

		clone.style.cssText = 'width: 0px; height: 0px;';
		clone.offsetWidth; // force repaint

		if (props.secondaryData) {

			let secondaryContainer = document.createElement('div');
			secondaryContainer.classList.add('secondary');
			secondaryContainer.style.height = `${popupHeight}px`;

			let direction = 'left';
			// TODO: determine distance to edges and choose 'left' or 'right'
			// TODO: gradient background
			secondaryContainer.style[direction] = `${popupWidth - 2}px`;	// -2 to account for some box measurement problem i can't figure out
			if (props.secondaryData.classes) {
				secondaryContainer.classList.add(...props.secondaryData.classes);
			}

			let secondaryBody = document.createElement('p');
			secondaryBody.classList.add('body');
			secondaryBody.textContent = props.secondaryData.body;
			// secondaryBody.style.maxHeight = `calc(${h}px - 0.5em)`;
			secondaryContainer.appendChild(secondaryBody);

			props.target.appendChild(secondaryContainer);
			props.target.classList.add('has-secondary');

			setTimeout(() => {
				secondaryContainer.style.width = `${popupWidth}px`;
				secondaryContainer.style.opacity = 1.0;
			}, sassVars.ui.popups.duration.open * 0.5 * 1000);

		}

		clone.classList.add('transition');
		clone.style.cssText = `width: ${w}px; height: ${h}px;`;
	}

	resetPopup (key) {
		if (!this.popups[key]) return;

		const target = this.popups[key].target;
		const popup = this.popups[key].popup;

		popup.removeEventListener('transitionend', this.onTransitionOut, false);
		popup.classList.remove('fade-out');
		target.classList.add('popped');
	}

	onTransitionOut (key, e) {
		if (!this.popups[key]) return;
		if (this.popups[key].abortTransition) return;

		const target = this.popups[key].target;
		const popup = this.popups[key].popup;

		popup.removeEventListener('transitionend', this.onTransitionOut, false);

		popup.querySelector('.close')
			.removeEventListener('click', this.onPopupCloseButtonClick, false);

		target.classList.remove('unclip');
		target.removeChild(popup);
		delete this.popups[key];
	}

	close (key) {
		if (this.popups[key].state === 'active') return;

		const target = this.popups[key].target;
		const popup = this.popups[key].popup;

		let closePopup = () => {
			popup.addEventListener('transitionend', this.onTransitionOut.bind(this, key), false);
			target.classList.remove('popped');
			popup.classList.add('fade-out');
		};

		if (target.classList.contains('has-secondary')) {

			// if secondary container exists, close it (fast) and then the popup
			let secondaryContainer = target.querySelector('.secondary');
			secondaryContainer.addEventListener('transitionend', (event) => {
				target.removeChild(secondaryContainer);
				target.classList.remove('has-secondary');
				closePopup();
			});
			secondaryContainer.classList.add('closing');
			secondaryContainer.style.width = '0px';

		} else {

			// else, just the popup immediately
			closePopup();

		}

	}

	closeAll () {
		Object.keys(this.popups).forEach((key) => {
			this.popups[key].state = '';
			this.close(key);
		});
	}

	reset () {
		this.selected = null;
		this.currentName = null;
		this.closeAll();
	}

	onPopupCloseButtonClick (id, e) {
		e.preventDefault();
		e.stopPropagation();
		this.popups[id].state = '';
		dispatcher.popupCloseButtonClicked(this.popups[id].section, this.popups[id].name);
		this.closeAll();
	}

	initTemplate () {
		this.template = document.createElement('div');

		const close = document.createElement('button');
		close.classList.add('close');
		// close.innerHTML = '&times;';

		// Probably won't need this but
		// leaving it for now...
		const title = document.createElement('h3');
		title.classList.add('title');

		const body = document.createElement('p');
		body.classList.add('body');

		this.template.appendChild(close);
		this.template.appendChild(title);
		this.template.appendChild(body);

		this.template.style.display = 'none';

		document.body.appendChild(this.template);
	}

	makeID (section, name) {
		return `${section}:${name}`;
	}

	getTarget (selector) {
		return document.querySelector(`[data-popuptarget="${selector}"]`);
	}

	manage (section, name, desc, secondaryData) {
		const id = this.makeID(section, name);
		const keys = Object.keys(this.popups);
		if (name && section) {
			if (this.popups[id]) {
				if (this.popups[id].state === 'active') return;
				this.abortTransition = true;
				this.resetPopup(id);
			};

			if (this.popups[id] && this.popups[id].state === 'active') return;

			const target = this.getTarget(id);
			if (!target) return;

			this.selected = id;
			this.currentName = name;

			this.open({
				target,
				desc,
				secondaryData,
				section,
				name,
				id,
				state: 'active'
			});

		} else if (!name) {
			this.reset();
		}
	}

	exists (section, name) {
		const id = this.makeID(section, name);
		return this.popups[id] ? true : false;
	}
}

let popupManager = new PopupManager();

export default popupManager;
