import dispatcher from './dispatcher.js';

class PopupManager {
	constructor() {
		this.selected = null;
		this.template = null;
		this.currentName = null;
		this.popups = {};
		this.init();
	}

	init() {
		// create the template node
		if (!this.template) this.initTemplate();
		this.template.classList.add('popup-template');
	}


	open(props) {
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


		// set w/h
		let w = clone.offsetWidth + 100;
		w = Math.min(w, 250);

		clone.style.cssText = `width: ${w}px;`;
		clone.offsetWidth; // force repaint

		let h = clone.offsetHeight;
		clone.style.cssText = 'width: 0px; height: 0px;';
		clone.offsetWidth; // force repaint

		clone.classList.add('transition');
		clone.style.cssText = `width: ${w}px; height: ${h}px; opacity: 1;`;
	}

	resetPopup(key) {
		if (!this.popups[key]) return;

		const target = this.popups[key].target;
		const popup = this.popups[key].popup;

		popup.removeEventListener('transitionend', this.onTransitionOut, false);
		popup.classList.remove('fade-out');
		target.classList.add('popped');
	}

	onTransitionOut(key, e) {
		if (!this.popups[key]) return;
		if (this.popups[key].abortTransition) return;

		const target = this.popups[key].target;
		const popup = this.popups[key].popup;

		popup.removeEventListener('transitionend', this.onTransitionOut, false);

		popup.querySelector('.close')
			.removeEventListener('click', this.onPopupCloseButtonClick, false);

		target.removeChild(popup);
		delete this.popups[key];
	}

	close(key) {
		if (this.popups[key].state === 'active') return;

		const target = this.popups[key].target;
		const popup = this.popups[key].popup;

		popup.addEventListener('transitionend', this.onTransitionOut.bind(this, key), false);

		target.classList.remove('popped');
		popup.classList.add('fade-out');
	}

	closeAll() {
		Object.keys(this.popups).forEach((key) => {
			this.popups[key].state = '';
			this.close(key);
		});
	}

	reset() {
		this.selected = null;
		this.currentName = null;
		this.closeAll();
	}

	onPopupCloseButtonClick(id, e) {
		e.preventDefault();
		e.stopPropagation();
		this.popups[id].state = '';
		dispatcher.popupCloseButtonClicked(this.popups[id].section, this.popups[id].name);
		this.closeAll();
	}

	initTemplate() {
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

	makeID(section, name) {
		return `${section}:${name}`;
	}

	getTarget(selector) {
		return document.querySelector(`[data-popuptarget="${selector}"]`);
	}

	manage(section, name, desc) {
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
				section,
				name,
				id,
				state: 'active'
			});

		} else if (!name) {
			this.reset();
		}
	}

	exists(section, name) {
		const id = this.makeID(section, name);
		return this.popups[id] ? true : false;
	}
}

let popupManager = new PopupManager();

export default popupManager;
