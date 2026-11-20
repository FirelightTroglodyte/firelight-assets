(() => {
  'use strict';
  const catalog = document.querySelector('[data-shop-catalog]');
  const grid = catalog?.querySelector('[data-shop-grid]');
  const index = catalog?.querySelector('[data-shop-index]');
  const sortLabel = catalog?.querySelector('[data-shop-sort]');
  if (!grid || !index || !sortLabel) return;
  const pageSize = Number(grid.dataset.pageSize);
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) return;
  const url = new URL(location.href);
  const page = Number(grid.dataset.page || url.searchParams.get('page')) || 1;
  if (!Number.isSafeInteger(page) || page < 1) return;

  const entries = Array.from(index.content.children, ({ dataset }, position) => ({
    id: dataset.id,
    sourcePage: Math.floor(position / pageSize) + 1,
    created: Number(dataset.created) || 0,
    price: dataset.price?.trim() ? Number(dataset.price) : NaN,
    artist: dataset.artist?.trim() || '',
    soldOut: dataset.status === 'sold-out',
    position,
  }));
  if (!entries.length || page > Math.ceil(entries.length / pageSize)) return;
  const controls = sortLabel.querySelector('select');
  const status = catalog.querySelector('[data-shop-sort-status]');
  const pager = catalog.querySelector('[data-shop-pagination]');
  const cards = new Map();
  const pageRequests = new Map();
  const artistOrder = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true });
  const sorts = new Set(['newest', 'price-asc', 'price-desc', 'artist']);
  const collect = root => root.querySelectorAll('[data-shop-card]').forEach(card => cards.set(card.dataset.shopCard, card));
  collect(grid);

  function newest(a, b) {
    return (b.created - a.created) || (Number(b.id) - Number(a.id)) || (a.position - b.position);
  }
  function ordered(sort) {
    return [...entries].sort((a, b) => {
      if (sort.startsWith('price-')) {
        const missing = Number(!Number.isFinite(a.price)) - Number(!Number.isFinite(b.price));
        return missing || ((a.price - b.price) * (sort === 'price-asc' ? 1 : -1)) || newest(a, b);
      }
      if (sort === 'artist') return Number(!a.artist) - Number(!b.artist) || artistOrder.compare(a.artist, b.artist) || newest(a, b);
      return Number(a.soldOut) - Number(b.soldOut) || newest(a, b);
    });
  }

  // Native Big Cartel still renders the pages and cards. Fetch only the
  // source pages needed for this sorted slice, reusing cards already loaded.
  function loadPage(number) {
    if (!pageRequests.has(number)) {
      const requestUrl = new URL(location.pathname, location.origin);
      if (number > 1) requestUrl.searchParams.set('page', number);
      requestUrl.searchParams.set('catalog-cards', '1');
      pageRequests.set(number, fetch(requestUrl, { cache: 'no-store' }).then(async response => {
        if (!response.ok) throw new Error(`Product page ${number}: HTTP ${response.status}`);
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const source = doc.querySelector('[data-shop-grid]');
        if (!source?.querySelector('[data-shop-card]')) throw new Error(`Product cards missing for page ${number}`);
        collect(source);
      }).catch(error => {
        pageRequests.delete(number);
        throw error;
      }));
    }
    return pageRequests.get(number);
  }
  function keepSortInLinks(sort) {
    pager?.querySelectorAll('a[href]').forEach(link => {
      const target = new URL(link.href, location.href);
      if (target.origin === url.origin && target.pathname === url.pathname) {
        if (sort === 'newest') target.searchParams.delete('sort');
        else target.searchParams.set('sort', sort);
        link.href = target.href;
      }
    });
  }
  let applied = 'newest';
  let version = 0;
  async function render(sort) {
    const token = ++version;
    const slice = ordered(sort).slice((page - 1) * pageSize, page * pageSize);
    const needed = [...new Set(slice.filter(item => !cards.has(item.id)).map(item => item.sourcePage))];
    try {
      if (needed.length) {
        grid.setAttribute('aria-busy', 'true');
        status.textContent = 'Sorting the shelf…';
        for (let index = 0; index < needed.length; index += 4) {
          await Promise.all(needed.slice(index, index + 4).map(loadPage));
          if (token !== version) return;
        }
      }
      const orderedCards = slice.map(item => cards.get(item.id));
      if (orderedCards.some(card => !card)) throw new Error('The catalog changed. Refresh and try again.');
      grid.replaceChildren(...orderedCards);
      window.FirelightTheme.brandProductCards(grid);
      applied = sort;
      keepSortInLinks(sort);
      const current = new URL(location.href);
      if (sort === 'newest') current.searchParams.delete('sort');
      else current.searchParams.set('sort', sort);
      if (current.href !== location.href) history.replaceState(history.state, '', current);
      status.textContent = '';
    } catch (error) {
      if (token !== version) return;
      controls.value = applied;
      status.textContent = 'Couldn’t sort the shelf. Try again or refresh.';
      console.warn('Firelight: catalog sort failed.', error);
    } finally {
      if (token === version) grid.removeAttribute('aria-busy');
    }
  }
  controls.addEventListener('change', () => {
    const sort = controls.value;
    if (!sorts.has(sort)) return;
    if (page === 1) render(sort);
    else {
      const target = new URL(location.href);
      target.searchParams.delete('page');
      if (sort === 'newest') target.searchParams.delete('sort');
      else target.searchParams.set('sort', sort);
      location.assign(target);
    }
  });
  const requested = url.searchParams.get('sort');
  controls.value = sorts.has(requested) ? requested : 'newest';
  sortLabel.hidden = false;
  render(controls.value);
})();
