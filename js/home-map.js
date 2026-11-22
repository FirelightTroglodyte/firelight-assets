(() => {
  'use strict';

  const hero = document.querySelector('[data-home-map]');
  const { assetUrl, loadArtists, loadShows, openArtist, HQ, artistStoryUrl } = window.FirelightTheme || {};
  if (!hero || !assetUrl) return;
  const road = hero.hasAttribute('data-road-map');
  const find = selector => hero.querySelector(selector);
  const status = find('[data-tour-status]');
  const stage = find('[data-tour-map]');
  const sheet = find('[data-tour-sheet]');
  const sheetTitle = find('[data-tour-sheet-title]');
  const sheetContent = find('[data-tour-sheet-content]');
  const listButton = find('[data-tour-list]');
  const resetButton = find('[data-tour-reset]');
  const panButton = find('[data-tour-pan]');
  const deck = find('.tour-deck');
  const key = find('.tour-map-key');
  const toggles = [...hero.querySelectorAll('[data-tour-layer]')];
  const mobile = matchMedia('(width < 768px)');
  const touchView = matchMedia('(pointer: coarse), (max-width: 768px)');
  const initialLayer = road ? 'shows' : hero.dataset.tourInitial === 'collabs' || !mobile.matches ? 'collabs' : 'shows';
  toggles.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.tourLayer === initialLayer)));
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cdn = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet';
  const paused = () => reducedMotion.matches;
  const collabMarkerArt = hq => `<svg class="tour-pin" width="28" height="36" viewBox="0 0 28 36" aria-hidden="true"><path d="M14 35C11 31 1 21 1 14a13 13 0 1 1 26 0c0 7-10 17-13 21Z"/><circle cx="14" cy="11" r="4" fill="#fff"/>${hq ? '<text x="14" y="24" text-anchor="middle">HQ</text>' : ''}</svg>`;
  const showMarkerArt = '<svg class="tour-ticket-pin" width="36" height="36" viewBox="0 0 36 36" aria-hidden="true"><path d="M4 8h28v6a4 4 0 0 0 0 8v6H4v-6a4 4 0 0 0 0-8V8Z"/><path class="tour-marker__feature" d="M12 12v2m0 3v2m0 3v2m5-9h10m-10 6h7"/></svg>';

  function loadLeaflet() {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = `${cdn}.css`;
    css.crossOrigin = 'anonymous';
    css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    const cssReady = new Promise((resolve, reject) => { css.onload = resolve; css.onerror = reject; });
    document.head.append(css);
    const js = document.createElement('script');
    js.src = `${cdn}.js`;
    js.crossOrigin = 'anonymous';
    js.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    const jsReady = new Promise((resolve, reject) => { js.onload = resolve; js.onerror = reject; });
    document.head.append(js);
    return Promise.all([cssReady, jsReady]).then(() => window.L);
  }

  async function data(file) {
    const response = await fetch(assetUrl(`data/${file}.json`));
    if (!response.ok) throw new Error(`${file}.json: HTTP ${response.status}`);
    return response.json();
  }

  function add(node, tag, text, className) {
    const child = document.createElement(tag);
    if (text) child.textContent = text;
    if (className) child.className = className;
    node.append(child);
    return child;
  }

  function safeSwarmURL(value) {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && ['www.weirdoswarm.org', 'weirdoswarm.org'].includes(url.hostname)) return url.href;
    } catch { /* No optional link. */ }
  }

  const showName = show => `${show.venue} · ${show.city}`;
  const describe = (item, layer) => layer === 'shows' ? `${item.status}: ${showName(item)}, ${item.date}` : `${item.name}, ${item.city}`;
  const isLocated = item => Number.isFinite(item.lat) && Math.abs(item.lat) <= 90 && Number.isFinite(item.lng) && Math.abs(item.lng) <= 180;

  function card(item) {
    const article = document.createElement('article');
    article.className = 'tour-card';
    add(article, 'p', `${item.status} / ${item.date}`, 'tour-card__eyebrow');
    add(article, 'h3', item.venue);
    add(article, 'p', [item.city, item.region, item.country].filter(Boolean).join(', '), 'tour-card__place');
    add(article, 'p', item.band);
    if (item.status === 'Upcoming') add(article, 'p', 'See you there', 'tour-card__note');
    const image = item.photo;
    if (typeof image === 'string' && /^img\/[^?#]+$/.test(image) && !image.split('/').includes('..')) {
      const photo = add(article, 'img');
      photo.src = assetUrl(image);
      photo.alt = '';
      photo.loading = 'lazy';
    }
    if (item.memory) add(article, 'p', item.memory);
    const setlist = safeSwarmURL(item.weirdoswarm_url);
    if (setlist) add(article, 'a', 'Setlist on Weirdo Swarm →').href = setlist;
    return article;
  }

  function sheetOpen(title, content, trigger) {
    if (typeof sheet.showModal !== 'function') return false;
    sheetTitle.textContent = title;
    sheetContent.replaceChildren(content);
    if (!sheet.open) {
      sheet.showModal();
      sheet.addEventListener('close', () => {
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
        else (listButton || stage).focus({ preventScroll: true });
      }, { once: true });
    }
    sheetContent.scrollTop = 0;
    return true;
  }

  function entries(items, layer) {
    const fragment = document.createDocumentFragment();
    for (const item of items) {
      if (layer === 'collabs') {
        const button = add(fragment, 'button', `${item.name} — ${item.city}`, 'tour-artist-stop');
        button.type = 'button';
        button.setAttribute('aria-haspopup', 'dialog');
        button.addEventListener('click', () => {
          if (sheet.open) sheet.close();
          openArtist({ slug: item.slug }, listButton, item.hq ? undefined : artistStoryUrl(item.slug));
        });
      } else if (items.length === 1) fragment.append(card(item));
      else {
        const details = add(fragment, 'details', null, 'tour-entry');
        add(details, 'summary', describe(item, layer));
        details.addEventListener('toggle', () => {
          if (details.open && details.children.length === 1) details.append(card(item));
        });
      }
    }
    return fragment;
  }

  // Project the low-resolution Natural Earth geometry once, then paint only
  // the visible canvas tiles. This is a keyless, self-hosted basemap.
  function basemap(L, geography) {
    const project = ([lng, lat]) => {
      const sin = Math.sin(Math.max(-85.051129, Math.min(85.051129, lat)) * Math.PI / 180);
      return [(lng + 180) / 360, .5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)];
    };
    const prepare = rings => {
      const points = rings.map(ring => ring.map(project));
      const limits = [1, 1, 0, 0];
      for (const ring of points) for (const [x, y] of ring) {
        limits[0] = Math.min(limits[0], x); limits[1] = Math.min(limits[1], y);
        limits[2] = Math.max(limits[2], x); limits[3] = Math.max(limits[3], y);
      }
      return { points, limits };
    };
    const land = geography.land.map(prepare);
    const borders = geography.borders.map(line => prepare([line]));
    const grid = [
      ...[-60, -30, 0, 30, 60].map(lat => prepare([[[-180, lat], [180, lat]]])),
      ...[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lng => prepare([[[lng, -85], [lng, 85]]])),
    ];
    const tiles = L.gridLayer({ noWrap: true, maxNativeZoom: 6, keepBuffer: 1,
      attribution: 'Map data: <a href="https://www.naturalearthdata.com/">Natural Earth</a>' });
    tiles.createTile = ({ x, y, z }) => {
      const size = 256;
      const scale = size * 2 ** z;
      const canvas = document.createElement('canvas');
      const density = Math.min(devicePixelRatio || 1, 2);
      canvas.width = canvas.height = size * density;
      const ctx = canvas.getContext('2d');
      ctx.scale(density, density);
      const left = x * size, top = y * size;
      ctx.fillStyle = '#e8a9c5';
      ctx.fillRect(0, 0, size, size);
      const trace = (feature, close) => {
        const [a, b, c, d] = feature.limits;
        if (c * scale < left - 2 || a * scale > left + size + 2 || d * scale < top - 2 || b * scale > top + size + 2) return false;
        ctx.beginPath();
        for (const ring of feature.points) {
          ring.forEach(([px, py], i) => ctx[i ? 'lineTo' : 'moveTo'](px * scale - left, py * scale - top));
          if (close) ctx.closePath();
        }
        return true;
      };
      ctx.fillStyle = '#f1e8cd';
      ctx.strokeStyle = '#a8748e';
      ctx.lineWidth = 1.1;
      for (const feature of land) if (trace(feature, true)) { ctx.fill('evenodd'); ctx.stroke(); }
      ctx.strokeStyle = '#a99a87';
      ctx.lineWidth = .65;
      for (const feature of borders) if (trace(feature, false)) ctx.stroke();
      ctx.strokeStyle = 'rgba(84,50,79,.23)';
      ctx.setLineDash([2, 5]);
      for (const feature of grid) if (trace(feature, false)) ctx.stroke();
      return canvas;
    };
    return tiles;
  }

  // Split crossings at the dateline rather than drawing a line the long way
  // around. The CSV's status, not today's date, styles each arriving leg.
  function tourSegments(shows) {
    return shows.slice(1).map((end, index) => {
      const start = shows[index];
      const delta = end.lng - start.lng;
      let path = [[[start.lat, start.lng], [end.lat, end.lng]]];
      if (Math.abs(delta) > 180) {
        const side = delta > 0 ? -180 : 180;
        const unwrapped = end.lng + side * 2;
        const lat = start.lat + (end.lat - start.lat) * (side - start.lng) / (unwrapped - start.lng);
        path = [[[start.lat, start.lng], [lat, side]], [[lat, -side], [end.lat, end.lng]]];
      }
      return { future: end.status === 'Upcoming', path };
    });
  }

  function buildMap(L, geography, collections) {
    const mobileAtLoad = mobile.matches;
    const map = L.map(stage, {
      minZoom: mobileAtLoad && !road ? .5 : -1, maxZoom: 12, zoomSnap: .25, zoomDelta: .75,
      scrollWheelZoom: true, trackResize: false, zoomControl: false,
      ...(mobileAtLoad && !road ? { maxBounds: [[-85, -185], [85, 185]], maxBoundsViscosity: .8 } : {}),
      zoomAnimation: !paused(), fadeAnimation: !paused(), markerZoomAnimation: !paused(),
      attributionControl: false,
    });
    L.control.attribution({ position: 'bottomright', prefix: '<a href="https://leafletjs.com/">Leaflet</a>' }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    basemap(L, geography).addTo(map);
    const worldView = [[-52, -171], [72, 172]];
    if (mobileAtLoad && !road) map.fitBounds(worldView, { animate: false, maxZoom: 2.5 });
    const markers = L.layerGroup().addTo(map);
    const history = L.polyline([], { color: '#68425d', weight: 2.3, opacity: .78, dashArray: '1 6', interactive: false });
    const future = L.polyline([], { color: '#a81363', weight: 2.8, opacity: .93, dashArray: '2 9', interactive: false });
    const segments = tourSegments(collections.shows);
    let layer = initialLayer, frame = 0, drawn = false;
    let selected;
    let wheelEnabled = false;
    let touchPan = false;
    function setTouchPan(enabled) {
      touchPan = enabled && touchView.matches;
      map.dragging[touchView.matches && !touchPan ? 'disable' : 'enable']();
      stage.classList.toggle('tour-map--panning', touchPan);
      if (!panButton) return;
      panButton.hidden = !touchView.matches;
      panButton.textContent = touchPan ? 'Done panning' : 'Pan map';
      panButton.setAttribute('aria-pressed', String(touchPan));
    }
    panButton?.addEventListener('click', () => setTouchPan(!touchPan));
    touchView.addEventListener('change', () => setTouchPan(false));
    setTouchPan(false);

    // Let the browser scroll normally unless a desktop visitor has opted in.
    // The capture listener gates Leaflet's own wheel handler without changing
    // its zoom speed, cursor anchoring, or trackpad handling.
    stage.addEventListener('wheel', event => {
      if (mobile.matches || !(wheelEnabled || event.ctrlKey || event.metaKey)) event.stopImmediatePropagation();
    }, { capture: true, passive: true });
    stage.addEventListener('click', () => { if (!mobile.matches) wheelEnabled = true; }, { capture: true });
    const leaveMap = event => {
      if (stage.contains(event.target) || panButton?.contains(event.target)) return;
      wheelEnabled = false;
      if (touchPan) setTouchPan(false);
    };
    document.addEventListener('pointerdown', leaveMap);
    document.addEventListener('focusin', leaveMap);
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      wheelEnabled = false;
      if (touchPan) setTouchPan(false);
    });
    window.addEventListener('blur', () => { wheelEnabled = false; });

    function fitActiveLayer() {
      const points = collections[layer].map(item => [item.lat, item.lng]);
      const stageRect = stage.getBoundingClientRect();
      const zoomControls = stage.querySelector('.leaflet-bottom.leaflet-right');
      // Reserve full-width bands for the cassette and the bottom controls.
      // The extra space protects the full marker, not just its center.
      const top = Math.ceil(deck.getBoundingClientRect().bottom - stageRect.top) + 24;
      const bottom = Math.ceil(stageRect.bottom - Math.min(key.getBoundingClientRect().top,
        zoomControls?.getBoundingClientRect().top ?? stageRect.bottom)) + 24;
      map.fitBounds(points.length ? points : worldView, {
        paddingTopLeft: [24, top], paddingBottomRight: [24, bottom],
        maxZoom: points.length ? 7 : 2.5, animate: false,
      });
    }

    function paintRoutes(position) {
      const pastPaths = [], futurePaths = [];
      segments.forEach((leg, index) => {
        const progress = Math.min(1, position - index);
        if (progress <= 0) return;
        const paths = leg.future ? futurePaths : pastPaths;
        leg.path.forEach(([a, b], part) => {
          const step = Math.max(0, Math.min(1, progress * leg.path.length - part));
          if (step) paths.push([a, [a[0] + (b[0] - a[0]) * step, a[1] + (b[1] - a[1]) * step]]);
        });
      });
      history.setLatLngs(pastPaths);
      future.setLatLngs(futurePaths);
    }

    function drawRoutes() {
      history.addTo(map);
      future.addTo(map);
      if (drawn || paused()) { paintRoutes(segments.length); drawn = true; return; }
      const start = performance.now();
      const tick = now => {
        const progress = Math.min(1, (now - start) / 1500);
        paintRoutes(progress * segments.length);
        if (progress < 1 && !paused()) frame = requestAnimationFrame(tick);
        else { paintRoutes(segments.length); drawn = true; }
      };
      frame = requestAnimationFrame(tick);
    }

    function showEntries(items, location, trigger) {
      if (layer === 'collabs' && items.length === 1) {
        const item = items[0];
        openArtist({ slug: item.slug }, trigger, item.hq ? undefined : artistStoryUrl(item.slug));
        return;
      }
      const title = items.length === 1 ? (layer === 'shows' ? 'Show ticket' : 'Collab notes') : `${items.length} map stops`;
      if (mobile.matches && sheetOpen(title, entries(items, layer), trigger)) return;
      const contents = add(document.createDocumentFragment(), 'div', null, 'tour-popup');
      contents.append(entries(items, layer));
      L.popup({ maxWidth: 310, minWidth: 195, maxHeight: 260, autoPanPadding: L.point(20, 32) })
        .setLatLng(location).setContent(contents).openOn(map);
    }

    function renderMarkers() {
      markers.clearLayers();
      const groups = [];
      // Cluster by measured pixel distance at the current zoom. Same-venue
      // dates stay grouped even at maximum zoom and open as an expandable list.
      for (const item of collections[layer]) {
        const point = map.project([item.lat, item.lng], map.getZoom());
        const group = !item.hq && groups.find(candidate => !candidate.items[0].hq && candidate.point.distanceTo(point) <= 36);
        if (group) group.items.push(item);
        else groups.push({ point, items: [item] });
      }
      for (const { point, items } of groups) {
        const cluster = items.length > 1;
        const upcoming = items.every(item => item.status === 'Upcoming');
        const description = cluster ? `${items.length} ${layer === 'shows' ? 'shows' : 'collaborations'} near ${items[0].city}` : describe(items[0], layer);
        const hq = items[0].hq;
        const style = ['tour-marker', `tour-marker--${layer}`, upcoming ? 'tour-marker--future' : '', cluster ? 'tour-marker--cluster' : '', hq ? 'tour-marker--hq' : ''].filter(Boolean).join(' ');
        const pin = layer === 'collabs' && !cluster;
        // Keep 44px hit areas; the pin's tip is at (22, 39) inside that box.
        const icon = L.divIcon({ className: style, iconSize: [44, 44], iconAnchor: pin ? [22, 39] : [22, 22],
          html: cluster ? `<span aria-hidden="true">${items.length}</span>` : pin ? collabMarkerArt(hq) : showMarkerArt });
        const position = map.unproject(point, map.getZoom());
        const marker = L.marker(position, { icon, title: description, autoPanOnFocus: false, zIndexOffset: hq ? 200 : 0 });
        marker.on('add', () => {
          marker.getElement().setAttribute('aria-label', description);
          if (layer === 'collabs' && !cluster) marker.getElement().setAttribute('aria-haspopup', 'dialog');
        });
        marker.on('click', () => {
          const hasDistance = items.some(item => item.lat !== items[0].lat || item.lng !== items[0].lng);
          if (cluster && hasDistance && map.getZoom() < map.getMaxZoom()) {
            const bounds = L.latLngBounds(items.map(item => [item.lat, item.lng]));
            const zoom = Math.min(map.getMaxZoom(), Math.max(map.getZoom() + 1.5, map.getBoundsZoom(bounds, false, L.point(100, 100))));
            map.setView(bounds.getCenter(), zoom, { animate: !paused() });
          } else showEntries(items, position, marker.getElement());
        });
        markers.addLayer(marker);
      }
    }

    function switchLayer(next) {
      layer = next;
      cancelAnimationFrame(frame);
      map.closePopup();
      if (sheet.open) sheet.close();
      for (const button of toggles) button.setAttribute('aria-pressed', String(button.dataset.tourLayer === layer));
      const items = collections[layer];
      const artistCount = layer === 'collabs' ? items.filter(item => !item.hq).length : 0;
      status.textContent = layer === 'collabs' ? `${artistCount} collab${artistCount === 1 ? '' : 's'} + Bootleg HQ`
        : items.length ? `${items.length} shows on tape` : 'No mappable stops on this side.';
      find('[data-tour-legend]').hidden = layer !== 'shows' || !items.length;
      if (listButton) listButton.hidden = !items.length || typeof sheet.showModal !== 'function';
      if (road || !mobile.matches) fitActiveLayer();
      if (layer === 'shows') drawRoutes();
      else { history.remove(); future.remove(); }
      renderMarkers();
    }

    toggles.forEach(button => {
      button.disabled = false;
      button.addEventListener('click', () => { if (button.dataset.tourLayer !== layer) switchLayer(button.dataset.tourLayer); });
    });
    listButton?.addEventListener('click', () => {
      const items = layer === 'shows' ? [...collections.shows].reverse() : collections.collabs;
      sheetOpen(layer === 'shows' ? 'Shows on tape' : 'Collabs on tape', entries(items, layer), listButton);
    });
    resetButton.hidden = false;
    resetButton.addEventListener('click', () => {
      if (road || !mobile.matches) {
        if (road) {
          map.stop();
          selected?.remove();
          status.textContent = collections.shows.length ? `${collections.shows.length} shows on tape` : 'No mappable stops.';
        }
        map.closePopup();
        fitActiveLayer();
      }
    });
    sheet.addEventListener('click', event => { if (event.target === sheet) sheet.close(); });
    mobile.addEventListener('change', () => {
      wheelEnabled = false;
      if (!mobile.matches && map.options.maxBounds) map.setMaxBounds(null);
      map.closePopup();
      if (sheet.open) sheet.close();
    });
    const resize = () => map.invalidateSize({ animate: false, debounceMoveend: true });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
    else window.addEventListener('resize', resize);
    map.on('zoomend', renderMarkers);
    switchLayer(layer);
    if (road) {
      hero.addEventListener('firelight:show-stop', ({ detail: item }) => {
        if (!collections.shows.includes(item)) return;
        const position = [item.lat, item.lng];
        map.stop();
        map.closePopup();
        if (sheet.open) sheet.close();
        selected?.remove();
        selected = L.circleMarker(position, {
          radius: 23, color: '#761149', weight: 3, fillColor: '#f15ab9', fillOpacity: .32, interactive: false,
        }).addTo(map);
        status.textContent = `${item.venue} · ${item.city} · ${item.date}`;
        const zoom = Math.max(7, map.getZoom());
        if (paused()) map.setView(position, zoom, { animate: false });
        else map.flyTo(position, zoom, { duration: 1.35 });
      });
    }
    hero.classList.add('tour-hero--ready');
    if (road) hero.dispatchEvent(new Event('firelight:map-ready'));
  }

  const ready = Promise.all([loadLeaflet(), data('basemap')]);
  const layers = Promise.allSettled([road ? [] : loadArtists(), loadShows ? loadShows() : data('shows')]);
  Promise.all([ready, layers]).then(([[L, geography], [artists, shows]]) => {
    const collections = {
      collabs: [...(artists.status === 'fulfilled' ? artists.value.filter(isLocated) : []), HQ],
      shows: shows.status === 'fulfilled' && Array.isArray(shows.value)
        ? shows.value.filter(show => isLocated(show) && ['Attended', 'Upcoming'].includes(show.status)).sort((a, b) => a.date.localeCompare(b.date))
        : [],
    };
    buildMap(L, geography, collections);
    if (artists.status === 'rejected' || shows.status === 'rejected') {
      add(find('.tour-map-key'), 'p', 'Some stops could not load. Refresh to try again.', 'tour-map-key__error');
    }
  }).catch(error => {
    status.textContent = road ? 'Map unavailable. You can still browse the tickets below.' : 'Map unavailable. The shop and artist links still work.';
    console.warn('Firelight: could not initialize the home map.', error);
  });
})();
