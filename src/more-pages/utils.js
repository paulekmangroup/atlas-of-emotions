import dispatcher from '../dispatcher.js';

/**
 * Utility functions for More Info sections...
 */

export function makeBlock(titleStr, descStr) {
	const block = document.createElement('div');
	const title = document.createElement('h3');
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
	const title = document.createElement('h3');
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

export function makeTable(title, rows, subTable) {
	const wrapper = document.createElement('div');
	wrapper.classList.add('annex-table-wrapper');

	const table = document.createElement('table');
	if (!subTable) table.classList.add('annex-table');

	// title
	if (title) {
		const titleRow = document.createElement('tr');
		titleRow.classList.add('title');

		const titleCell = document.createElement('td');
		titleCell.setAttribute('colspan', 2);
		titleCell.innerHTML = title;

		titleRow.appendChild(titleCell);
		table.appendChild(titleRow);
	}

	rows.forEach(row => {
		const tr = document.createElement('tr');
		if (!subTable) tr.classList.add('content');

		const td0 = document.createElement('td');
		const td1 = document.createElement('td');

		if (!subTable) td0.classList.add('upper');

		td0.textContent = row.name;
		if (row.children) {
			if (row.children.length) {
				const child = makeTable(row.desc, row.children, true);
				td1.classList.add('has-sub-table');
				td1.appendChild(child);
			} else {
				tr.classList.add('no-children');
			}
		} else {
			td1.textContent = row.desc;
		}

		tr.appendChild(td0);
		tr.appendChild(td1);

		table.appendChild(tr);

		if (row.formatting) {
			if (row.formatting === 'break') {
				let spacer = document.createElement('tr');
				spacer.classList.add('table-break');
				table.appendChild(spacer);
			}
		}
	});

	if (subTable) return table;

	wrapper.appendChild(table);

	return wrapper;
}
