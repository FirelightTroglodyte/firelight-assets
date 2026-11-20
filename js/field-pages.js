(() => {
  'use strict';
  const { assetUrl, loadShows, loadArtists, loadArtistDesignCount } = window.FirelightTheme;
  const dateFormat = new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  const numberFormat = new Intl.NumberFormat('en');

  function append(parent, tag, className, text) {
    const child = document.createElement(tag);
    if (className) child.className = className;
    if (text) child.textContent = text;
    parent.append(child);
    return child;
  }

  function eligibleURL(value, hosts) {
    if (typeof value !== 'string') return;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && !url.username && !url.password && (!hosts || hosts.includes(url.hostname))) return url.href;
    } catch { /* Omit missing or invalid links. */ }
  }

  function photoURL(path) {
    if (typeof path !== 'string') return;
    if (/^img\/[\w./-]+$/i.test(path) && !path.split('/').some(part => !part || part === '..' || part === '.')) return assetUrl(path);
    return eligibleURL(path);
  }

  function isLocated(show) {
    return Number.isFinite(show.lat) && Math.abs(show.lat) <= 90
      && Number.isFinite(show.lng) && Math.abs(show.lng) <= 180;
  }

  async function renderRoad(page) {
    const map = page.querySelector('[data-road-map]');
    const mapCanvas = map.querySelector('[data-tour-map]');
    const back = map.querySelector('[data-road-back]');
    const status = page.querySelector('[data-road-timeline-status]');
    const timeline = page.querySelector('[data-road-timeline]');
    let selected, opener, lastTear = -Infinity;
    function showOnMap() {
      if (selected) map.dispatchEvent(new CustomEvent('firelight:show-stop', { detail: selected }));
    }
    map.addEventListener('firelight:map-ready', showOnMap);
    back.addEventListener('click', () => {
      opener?.scrollIntoView({ block: 'center', behavior: 'instant' });
      opener?.focus({ preventScroll: true });
    });
    function select(show, trigger) {
      opener?.removeAttribute('aria-current');
      opener = trigger;
      opener.setAttribute('aria-current', 'true');
      selected = show;
      back.hidden = false;
      map.scrollIntoView({ block: 'start', behavior: 'instant' });
      mapCanvas.focus({ preventScroll: true });
      if (map.classList.contains('tour-hero--ready')) showOnMap();
      const now = performance.now();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || now - lastTear < 550) return;
      lastTear = now;
      // The jump is immediate; the torn stub follows the ticket to the map.
      const stub = trigger.querySelector('.road-ticket__counter');
      const tear = append(map, 'span', 'road-ticket__tear', stub.textContent.trim());
      tear.setAttribute('aria-hidden', 'true');
      setTimeout(() => tear.remove(), 660);
    }

    function ticket(list, { show, number }) {
      const future = show.status === 'Upcoming';
      const row = append(list, 'li', `road-ticket${future ? ' road-ticket--future' : ''}${number === 1 || number === 50 ? ' road-ticket--milestone' : ''}`);
      const locatable = isLocated(show);
      const body = append(row, locatable ? 'button' : 'div', 'road-ticket__face');
      if (locatable) {
        body.type = 'button';
        body.setAttribute('aria-controls', 'road-map');
        body.addEventListener('click', () => select(show, body));
      }
      const counter = append(body, 'span', 'road-ticket__counter');
      append(counter, 'span', 'road-ticket__eyebrow', 'Show');
      append(counter, 'span', 'road-ticket__number', String(number).padStart(2, '0'));
      if (number === 1) append(counter, 'span', 'road-ticket__stamp', 'First show');
      if (number === 50) append(counter, 'span', 'road-ticket__stamp road-ticket__stamp--50', '50');
      const content = append(body, 'span', 'road-ticket__details');
      const date = append(content, 'time', 'road-ticket__eyebrow', dateFormat.format(new Date(`${show.date}T00:00:00Z`)));
      date.dateTime = show.date;
      append(content, 'span', 'road-ticket__venue', show.venue);
      append(content, 'span', 'road-ticket__place', `${show.city}, ${show.country}`);
      if (typeof show.memory === 'string' && show.memory.trim()) append(content, 'span', 'road-ticket__memory', show.memory.trim().replace(/\s+/g, ' '));
      const image = photoURL(show.photo);
      if (image) {
        const photo = append(body, 'img', 'road-ticket__photo');
        photo.alt = typeof show.photo_alt === 'string' ? show.photo_alt : '';
        photo.loading = 'lazy';
        photo.decoding = 'async';
        photo.addEventListener('error', () => photo.remove(), { once: true });
        photo.src = image;
      }
      if (locatable) append(body, 'span', 'road-ticket__action', 'Fly to stop ↗');
      const setlist = eligibleURL(show.weirdoswarm_url, ['weirdoswarm.org', 'www.weirdoswarm.org']);
      if (setlist) append(row, 'a', 'road-ticket__setlist', 'Setlist on Weirdo Swarm →').href = setlist;
    }

    try {
      const shows = await loadShows();
      const attended = shows.filter(show => show.status === 'Attended');
      const upcoming = shows.filter(show => show.status === 'Upcoming');
      const numbered = (items, offset) => items.map((show, index) => ({ show, number: offset + index + 1 }));
      const renderGroup = (id, title, records, empty) => {
        const part = append(timeline, 'section', `road-run road-run--${id}`);
        const heading = append(part, 'h3', '', title);
        heading.id = `road-run-${id}`;
        part.setAttribute('aria-labelledby', heading.id);
        if (!records.length) { append(part, 'p', '', empty); return; }
        let year, list;
        for (const record of records) {
          const nextYear = record.show.date.slice(0, 4);
          if (year !== nextYear) {
            year = nextYear;
            append(part, 'h4', 'road-year', year);
            list = append(part, 'ol', 'road-run__list');
          }
          ticket(list, record);
        }
      };
      renderGroup('upcoming', 'Up next', numbered(upcoming, attended.length), 'No upcoming stops on the calendar.');
      renderGroup('attended', 'Been there', numbered(attended, 0).reverse(), 'No attended shows in the archive yet.');
      status.hidden = true;
    } catch (error) {
      status.textContent = 'The ticket archive could not load. Try refreshing the page.';
      console.warn('Firelight: could not load the ticket timeline.', error);
    }
  }

  async function renderStats(page) {
    const status = page.querySelector('[data-about-stats-status]');
    const put = (key, amount) => {
      const stat = page.querySelector(`[data-about-stat="${key}"]`);
      stat.querySelector('dd').textContent = numberFormat.format(amount);
      stat.hidden = false;
    };
    const [shows, artists, artistDesigns] = await Promise.allSettled([loadShows(), loadArtists(), loadArtistDesignCount()]);
    if (shows.status === 'fulfilled') {
      const attended = shows.value.filter(show => show.status === 'Attended');
      const clean = value => value.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
      const venueKey = show => {
        const venue = clean(show.venue).replace(/^poppodium 013$/, '013 poppodium');
        return JSON.stringify([venue, clean(show.city), clean(show.country)]);
      };
      put('attended', attended.length);
      put('countries', new Set(attended.map(show => clean(show.country))).size);
      put('venues', new Set(attended.map(venueKey)).size);
      put('upcoming', shows.value.length - attended.length);
    }
    if (artists.status === 'fulfilled') put('artists', new Set(artists.value.map(artist => artist.slug).filter(Boolean)).size);
    const originalCount = Number(page.dataset.aboutOriginalCount || NaN);
    const hasDesignTotal = artistDesigns.status === 'fulfilled' && Number.isSafeInteger(originalCount) && originalCount >= 0;
    if (hasDesignTotal) put('designs', artistDesigns.value + originalCount);
    if (shows.status === 'fulfilled' && artists.status === 'fulfilled' && hasDesignTotal) status.hidden = true;
    else status.textContent = 'Some archive counts could not load. Try refreshing the page.';
  }

  window.FirelightFieldPages = Object.freeze({
    init: page => page.hasAttribute('data-road-page') ? renderRoad(page) : renderStats(page),
  });
})();
