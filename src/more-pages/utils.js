import dispatcher from '../dispatcher.js';

/**
 * Utility functions for More Info sections...
 */

export function makeBlock(titleStr, descStr) {
	const block = document.createElement('div');
	const title = document.createElement('h4');
	const desc = document.createElement('p');

	block.classList.add('block');
	title.classList.add('title');
	desc.classList.add('desc');

	title.innerHTML = titleStr;
	desc.innerHTML = descStr;

	block.appendChild(title);
	block.appendChild(desc);

	return block;
};

export function makeLinkBlock(linkStr) {
	const block = document.createElement('div');
	const title = document.createElement('h4');
	const link = document.createElement('a');

	block.classList.add('block', 'link');
	title.classList.add('title');

	link.href = linkStr;
	link.target = '_blank';
	link.innerHTML = linkStr;

	title.appendChild(link);
	block.appendChild(title);

	return block;
};

export function makeAnnexBackNav(titleStr) {
	const block = document.createElement('div');
	const btn = document.createElement('button');

	block.classList.add('annex-back-nav');
	btn.textContent = titleStr;
	block.appendChild(btn);

	btn.addEventListener('click', function(e) {
		dispatcher.navigate('more', null, 'annex');
	});

	return block;
};
