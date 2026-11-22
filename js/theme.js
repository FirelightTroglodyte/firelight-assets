/* Paste this file inline into the marked script blocks in Layout and Maintenance.
 * No bundler, module loader, framework, or third-party UI library required.
 */
function initFirelightTheme() {
  'use strict';
  // EDIT HOMEPAGE FEATURE HERE. Modes: sale, coming-soon, drop, off.
  const FEATURE_MODE = 'sale';
  // EDIT HOME ORDER HERE: 'sale-first' or 'map-first'. After SALE_END, Home is map-first.
  const HOME_LAYOUT = 'sale-first';
  // EDIT HERO PRODUCTS HERE: Big Cartel product permalinks in collage order.
  const HERO_PRODUCTS = [
    'kglw-fov-campground-tee',
    'kglw-fov-gangs-all-here-poster',
  ];
  const SALE_START = '2026-11-23T00:00:00-08:00'; // Nov 23, midnight, Los Angeles
  const SALE_END = '2026-11-29T23:59:00-08:00'; // Nov 29, 11:59 PM, Los Angeles
  const SALE_HEADLINE = 'BLACK FRIDAY ⦿ BOOTLEG BONANZA';
  const SALE_STRIP_HEADLINE = "BLACK FRIDAY ⦿ EVERYTHING'S MARKED DOWN";
  const SALE_SUBLINE = "Everything's marked down! Last chance to snag FOV '26!";
  const DISCOUNT_CODE = '';
  // EDIT SWARM EASTER EGG HERE. Optional public Big Cartel code, blank disables it.
  const DISCOUNT = '';
  const COMING_SOON_HEADLINE = 'The originals return';
  const COMING_SOON_SUBLINE = '';
  const DROP_PRODUCT_PERMALINK = '';
  const DROP_HEADLINE = ''; // Blank uses the product name.
  const DROP_SUBLINE = '';
  const DROP_EDITION_SIZE = null; // An edition total, not an inventory count.
  const DROP_COUNTDOWN_END = ''; // Optional ISO date/time with timezone offset.

  const ASSET_BASE = 'https://cdn.jsdelivr.net/gh/FirelightTroglodyte/firelight-assets@v1.0.1';
  const assetUrl = path => `${ASSET_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const ORIGINAL_CATEGORY = 'Firelight Original';
  const ARTIST_PREFIX = 'Artist – ';
  const categoryName = name => String(name || '').trim().replace(/^Artist - /, ARTIST_PREFIX);
  const artistRosterUrl = '/#artists';
  const published = new Set(Array.from(document.querySelector('[data-published-pages]')?.content.children || [],
    row => row.dataset.permalink));
  const artistStoryUrl = slug => published.has(slug) ? `/${encodeURIComponent(slug)}` : `/?artist=${encodeURIComponent(slug)}#artists`;
  const HQ = Object.freeze({ slug: 'bootleg-hq', name: 'Bootleg HQ', city: 'Portland, Oregon',
    country: 'United States', country_code: 'US', lat: 45.5152, lng: -122.6784,
    portrait: 'img/goblin-mark.png', big_cartel_category: ORIGINAL_CATEGORY, hq: true });
  let artistsRequest;
  function loadArtistRecords() {
    return artistsRequest ||= fetch(assetUrl('data/artists.json')).then(response => {
      if (!response.ok) throw new Error(`artists.json: HTTP ${response.status}`);
      return response.json();
    }).then(records => {
      if (!Array.isArray(records)) throw new Error('Invalid artist records.');
      return records;
    }).catch(error => { artistsRequest = null; throw error; });
  }
  function loadArtists() {
    return loadArtistRecords().then(records => records.filter(artist => artist
      && !['no', 'false', '0'].includes(String(artist.ok_to_feature).trim().toLowerCase())
      && artist.big_cartel_category !== ORIGINAL_CATEGORY && artist.slug !== HQ.slug));
  }
  function loadArtistDesignCount() {
    return loadArtistRecords().then(records => records.reduce((total, artist) => total
      + (Array.isArray(artist?.designs) ? artist.designs.filter(design => typeof design === 'string' && design.trim()).length : 0), 0));
  }
  let showsRequest;
  function loadShows() {
    return showsRequest ||= fetch(assetUrl('data/shows.json')).then(response => {
      if (!response.ok) throw new Error(`shows.json: HTTP ${response.status}`);
      return response.json();
    }).then(records => {
      if (!Array.isArray(records)) throw new Error('Invalid show records.');
      return records.filter(show => show && ['Attended', 'Upcoming'].includes(show.status)
        && typeof show.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(show.date)
        && Number.isFinite(Date.parse(`${show.date}T00:00:00Z`))
        && ['venue', 'city', 'country'].every(key => typeof show[key] === 'string' && show[key].trim()))
        .sort((a, b) => a.date.localeCompare(b.date));
    }).catch(error => { showsRequest = null; throw error; });
  }
  let artistModule;
  function loadArtistUI() {
    return artistModule ||= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = assetUrl('js/artists.js');
      script.onload = () => window.FirelightArtists ? resolve(window.FirelightArtists) : reject(new Error('Artist UI unavailable.'));
      script.onerror = () => { script.remove(); reject(new Error('Artist script could not load.')); };
      document.head.append(script);
    }).catch(error => { artistModule = null; throw error; });
  }
  const openArtist = (identifier, trigger, fallback) => loadArtistUI().then(ui => ui.open(identifier, trigger)).catch(error => {
    console.warn('Firelight: could not open artist details.', error);
    if (fallback) location.assign(fallback);
  });
  window.FirelightTheme = Object.freeze({ ASSET_BASE, assetUrl, loadArtists, loadArtistDesignCount, loadShows, openArtist, addToCart, loadEditorialMerch, brandProductCards,
    HQ, ORIGINAL_CATEGORY, artistRosterUrl, artistStoryUrl });

  // Read Big Cartel's own options, price and quick-add form from the product page.
  async function loadEditorialMerch(permalink, signal) {
    if (!/^[a-z0-9][a-z0-9-]*$/i.test(permalink)) throw new Error('Invalid product permalink.');
    const response = await fetch(`/product/${encodeURIComponent(permalink)}`, { cache: 'no-store', signal });
    if (!response.ok) throw new Error(`Product: HTTP ${response.status}`);
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    const card = page.querySelector('template[data-worn-merch]');
    if (!card?.content.childElementCount) throw new Error('No product card in response.');
    return document.importNode(card.content, true);
  }

  function whenVisible(node, load) {
    if (!('IntersectionObserver' in window)) { load(); return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio > 0)) return;
      observer.disconnect();
      load();
    }, { threshold: .01 });
    observer.observe(node);
  }

  const hasPersonality = Boolean(document.querySelector('.shell-brand')) && !/^\/(?:cart|checkout)(?:\/|$)/i.test(location.pathname);
  function initPersonality() {
    if (!hasPersonality) return;
    document.body.dataset.goblinPointer = '';
    const cursorImage = name => `url("${assetUrl(`img/${name}`)}")`;
    // Hotspots are in CSS pixels; image-set keeps the 2x bitmap the same physical size.
    const cursorSpec = (standard, retina, fallback, x) => {
      const hotspot = `${x} 4`;
      const sharp = `image-set(${cursorImage(standard)} 1x, ${cursorImage(retina)} 2x) ${hotspot}`;
      const plain = `${cursorImage(standard)} ${hotspot}${fallback ? `, ${cursorImage(fallback)} ${hotspot}` : ''}`;
      return window.CSS?.supports('cursor', `${sharp}, auto`) ? `${sharp}, ${plain}` : plain;
    };
    document.body.style.setProperty('--goblin-pointer', cursorSpec('logo-cursor.png', 'logo-cursor@2x.png', null, 16));
    document.body.style.setProperty('--goblin-pointer-large', cursorSpec('logo-cursor-large.png', 'logo-cursor-large@2x.png', null, 18));
    const loader = document.querySelector('[data-goblin-loader]');
    if (loader) {
      try {
        const key = 'firelight-first-visit';
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, '1');
          if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
            loader.hidden = false;
            const hideLoader = () => { loader.hidden = true; };
            setTimeout(hideLoader, 490);
            window.addEventListener('pagehide', hideLoader, { once: true });
          }
        }
      } catch { /* Skip the session-only loader if storage is unavailable. */ }
    }
    const load = () => {
      const script = document.createElement('script');
      script.async = true;
      script.src = assetUrl('js/personality.js');
      script.onload = () => window.FirelightPersonality?.init({ discount: DISCOUNT });
      document.head.append(script);
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(load, { timeout: 650 });
    else setTimeout(load, 0);
  }
  initPersonality();

  // Fonts are hosted alongside images/data, never requested from Google at runtime.
  if ('FontFace' in window) {
    [
      ['Bungee', 'bungee.woff2', { weight: '400' }],
      ['Firelight Symbols', 'noto-sans-symbols-2-shell.woff2', { weight: '400', unicodeRange: 'U+29BF' }],
      ['Space Grotesk', 'space-grotesk.woff2', { weight: '300 700' }],
      ['IBM Plex Mono', 'ibm-plex-mono.woff2', { weight: '400' }],
    ].forEach(([family, file, descriptors]) => {
      const face = new FontFace(family, `url("${assetUrl(`fonts/${file}`)}")`, { ...descriptors, display: 'swap' });
      document.fonts.add(face);
    });
  }

  document.querySelectorAll('[data-asset]').forEach(element => {
    const url = assetUrl(element.dataset.asset);
    if (element.tagName === 'LINK') element.href = url;
    else element.src = url;
  });
  function brandProductCards(root) {
    root.querySelectorAll('[data-product-categories]:not([data-branded])').forEach(marker => {
      marker.dataset.branded = '';
      const categories = Array.from(marker.children, child => categoryName(child.dataset.categoryName));
      const original = categories.includes(ORIGINAL_CATEGORY);
      const collab = categories.find(name => name?.startsWith(ARTIST_PREFIX));
      if (!original && !collab) return;
      const link = !original && marker.hasAttribute('data-artist-link-stamp');
      const stamp = document.createElement(link ? 'a' : 'span');
      stamp.className = `stamp ${original ? 'stamp--original' : 'stamp--collab'}`;
      stamp.textContent = original ? 'FIRELIGHT ORIGINAL' : `COLLAB w/ ${collab.slice(ARTIST_PREFIX.length)}`;
      if (link) { stamp.href = artistRosterUrl; stamp.dataset.artistTrigger = ''; stamp.dataset.artistCategory = collab; }
      marker.after(stamp);
    });
    root.querySelectorAll('[data-product-sale]').forEach(badge => { badge.hidden = FEATURE_MODE === 'sale'; });
  }
  brandProductCards(document);
  initHomeMerch();
  const catalog = document.querySelector('[data-shop-catalog]');
  if (catalog?.querySelector('[data-shop-index]')?.content.childElementCount) {
    const script = document.createElement('script');
    script.src = assetUrl('js/catalog.js');
    document.head.append(script);
  }
  const categoryArtist = catalog?.querySelector('[data-shop-artist]');
  if (categoryArtist) loadArtists().then(artists => {
    const artist = artists.find(item => item.big_cartel_category === categoryName(categoryArtist.dataset.shopArtist));
    if (artist) return loadArtistUI().then(ui => ui.renderCategoryHeader(categoryArtist, artist));
  }).catch(error => console.warn('Firelight: could not load the category artist.', error));

  function initHomeMerch() {
    const shelf = document.querySelector('[data-shelf]');
    const cards = [...(shelf?.querySelectorAll('[data-shelf-product]') || [])];
    const filters = shelf?.querySelector('[data-shelf-filters]');
    if (filters && cards.length) {
      const aliases = {
        caps: ['caps', 'hats'], shirts: ['shirts', 'tees', 't-shirts', 't-shirts & tops'],
        pins: ['pins'], posters: ['posters', 'prints'], originals: [ORIGINAL_CATEGORY.toLowerCase()],
      };
      const categoryNames = cards.map(card => [...card.querySelectorAll('[data-category-name]')]
        .map(category => category.dataset.categoryName.trim().toLowerCase()));
      const chips = [...filters.querySelectorAll('[data-shelf-filter]')];
      filters.hidden = false;
      filters.addEventListener('click', event => {
        const chip = event.target.closest('[data-shelf-filter]');
        if (!chip) return;
        const filter = chip.dataset.shelfFilter;
        chips.forEach(button => button.setAttribute('aria-pressed', String(button === chip)));
        cards.forEach((card, index) => {
          card.hidden = filter !== 'all' && !categoryNames[index].some(name => aliases[filter]?.includes(name));
        });
        shelf.querySelector('[data-shelf-empty]').hidden = cards.some(card => !card.hidden);
      });
    }

    const band = document.querySelector('[data-home-feature]');
    const strip = document.querySelector('[data-sale-strip]');
    const shopSale = document.querySelector('[data-shop-sale]');
    if (!band && !strip && !shopSale) return;
    const home = band?.closest('[data-home-layout]');
    const products = band?.querySelector('[data-feature-products]');
    const productName = card => card.querySelector('h3').textContent;
    const put = (hook, text, root = band) => { const node = root?.querySelector(hook); if (node) node.textContent = text; };
    const reveal = (hook, yes) => { const node = band?.querySelector(hook); if (node) node.hidden = !yes; };
    const intro = (kicker, title, subline) => {
      put('[data-feature-kicker]', kicker);
      put('[data-feature-title]', title);
      put('[data-sale-hero-title]', title);
      put('[data-feature-subline]', subline);
      reveal('[data-feature-subline]', Boolean(subline));
    };
    const cta = (text, href) => {
      const link = band?.querySelector('[data-feature-cta]');
      if (link) { link.textContent = text; link.href = href; link.hidden = false; }
    };
    const instant = value => /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
    const pacificDate = new Intl.DateTimeFormat('en-US', {
      weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/Los_Angeles',
    });
    function drawClock(label, target, now, zone, root = band) {
      const total = Math.max(0, Math.ceil((target - now) / 1000));
      const digits = [Math.floor(total / 86400), Math.floor(total / 3600) % 24, Math.floor(total / 60) % 60, total % 60];
      put('[data-countdown-label]', label, root);
      put('[data-countdown]', digits.map((digit, index) => `${String(digit).padStart(2, '0')}${'dhms'[index]}`).join(' '), root);
      put('[data-countdown-zone]', zone, root);
      const posterClock = root?.querySelector('[data-clearout-clock]:not([hidden])');
      if (posterClock) {
        posterClock.querySelectorAll('[data-clock-number]').forEach((cell, index) => {
          cell.textContent = String(digits[index]).padStart(2, '0');
        });
        posterClock.setAttribute('aria-label', digits.map((digit, index) => `${digit} ${['days', 'hours', 'minutes', 'seconds'][index]}`).join(', '));
      }
      if (root === band) reveal('[data-feature-clock]', true);
    }
    function runClock(update, time = Date.now) {
      let timeout;
      function tick() {
        clearTimeout(timeout);
        const next = update(time());
        if (next > 0) timeout = setTimeout(tick, Math.min(next, 2147483647));
      }
      document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
      window.addEventListener('pageshow', tick);
      tick();
    }

    function featureLink(card, collage = false) {
      const link = document.createElement('a');
      link.className = collage ? 'feature-product clearout-print' : 'feature-product';
      link.href = card.querySelector('a').href;
      const original = card.querySelector('.shelf-card__art img');
      if (original) {
        const image = original.cloneNode();
        if (collage) {
          image.alt = ''; // The label names the same item.
          if (image.srcset) image.sizes = '(max-width: 768px) 65vw, 23vw';
          if (!products.childElementCount) {
            image.loading = 'eager';
            image.fetchPriority = 'high';
          }
          const isPrint = [...card.querySelectorAll('[data-category-name]')]
            .some(category => /^(posters|prints)$/i.test(category.dataset.categoryName.trim()));
          image.classList.toggle('clearout-print__artwork', isPrint);
        }
        link.append(image);
      }
      const name = document.createElement('span');
      name.textContent = productName(card).trim();
      if (collage) {
        const label = document.createElement('span');
        label.className = 'clearout-print__label';
        name.className = 'clearout-print__name';
        const price = document.createElement('span');
        price.className = 'clearout-print__price';
        price.textContent = card.querySelector('.price').textContent.trim();
        label.append(name, price);
        link.append(label);
      } else link.append(name);
      products.append(link);
    }

    if (FEATURE_MODE === 'sale') {
      const start = instant(SALE_START), end = instant(SALE_END);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        console.warn('Firelight: set valid, timezone-qualified sale dates.');
        return;
      }
      intro('Firelight Troglodyte / Sale 01', SALE_HEADLINE, SALE_SUBLINE);
      cta('Shop the clearout', '#home-products');
      put('[data-shop-sale-title]', SALE_HEADLINE, shopSale);
      const preferredLayout = HOME_LAYOUT;
      const shell = strip?.closest('.shell-top');
      const stripAnchor = strip?.previousElementSibling;
      const map = home?.querySelector('[data-home-map]');
      const artists = home?.querySelector('[data-home-artists]');
      const lookbook = home?.querySelector('[data-lookbook-teaser]');
      const clock = band?.querySelector('[data-feature-clock]');
      const copy = band?.querySelector('.home-feature__copy');
      function setHomeOrder(saleFirst) {
        if (!home || !map) return;
        const layout = saleFirst ? 'sale-first' : 'map-first';
        const firstRun = !home.dataset.homeLayout;
        if (home.dataset.homeLayout === layout) return;
        home.dataset.homeLayout = layout;
        if (shell) {
          shell.dataset.homeLayout = layout;
          if (saleFirst) shell.prepend(strip);
          else stripAnchor?.after(strip);
        }
        if (saleFirst) {
          map.dataset.tourInitial = 'collabs';
          shelf.after(map);
          if (artists) map.after(artists); // Keep the roster with the makers map.
          copy.querySelector('.home-feature__actions').before(clock);
        } else {
          delete map.dataset.tourInitial;
          band.before(map);
          if (artists && lookbook) lookbook.before(artists);
          copy.after(clock);
        }
        map.setAttribute('aria-labelledby', saleFirst ? 'makers-title' : 'tour-title');
        map.querySelector('.tour-poster').hidden = saleFirst;
        map.querySelector('[data-makers-heading]').hidden = !saleFirst;
        band.setAttribute('aria-labelledby', saleFirst ? 'clearout-title' : 'feature-title');
        reveal('[data-sale-hero-title]', saleFirst);
        reveal('[data-feature-title]', !saleFirst);
        reveal('[data-clearout-tagline]', saleFirst);
        reveal('[data-clearout-clock]', saleFirst);
        reveal('[data-countdown]', !saleFirst);
        products.replaceChildren();
        if (saleFirst) {
          const catalog = new Map(cards.map(card => [card.dataset.permalink, card]));
          for (const permalink of new Set(HERO_PRODUCTS.slice(0, 4))) {
            const card = catalog.get(permalink);
            if (card?.dataset.status === 'active' && card.querySelector('[data-drop-form]') && card.querySelector('.shelf-card__art img')) {
              featureLink(card, true);
            }
          }
        }
        products.hidden = !products.childElementCount;
        if (firstRun && saleFirst && /^#(?:map|artists|home-products|home-feature)$/.test(location.hash)) {
          requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' }));
        }
      }
      const code = DISCOUNT_CODE.trim();
      if (band && code) {
        put('[data-discount-code]', code);
        reveal('[data-feature-discount]', true);
        band.querySelector('[data-copy-discount]').addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(code);
            put('[data-copy-feedback]', 'Code copied.');
          } catch {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(band.querySelector('[data-discount-code]'));
            selection?.removeAllRanges();
            selection?.addRange(range);
            put('[data-copy-feedback]', 'Select and copy the code.');
          }
        });
      }
      let phase;
      runClock(now => {
        const status = now >= end ? 'ended' : now < start ? 'upcoming' : 'live';
        if (phase !== status) {
          phase = status;
          const saleFirst = Boolean(home && preferredLayout === 'sale-first' && status !== 'ended');
          setHomeOrder(saleFirst);
          if (band) { band.hidden = status === 'ended'; band.dataset.featurePhase = status; }
          if (shopSale) shopSale.hidden = status === 'ended';
          if (strip) {
            strip.hidden = status !== 'live' && !(saleFirst && status === 'upcoming');
            put('[data-sale-strip-title]', status === 'upcoming' ? 'BLACK FRIDAY' : SALE_STRIP_HEADLINE, strip);
          }
          reveal('[data-feature-subline]', Boolean(SALE_SUBLINE) && (saleFirst || status === 'live'));
        }
        if (status === 'ended') return 0;
        const target = status === 'live' ? end : start;
        const label = status === 'live' ? 'Clearout ends in' : `Starts ${pacificDate.format(start)}`;
        if (band) drawClock(label, target, now, 'US Pacific time');
        if (shopSale) drawClock(label, target, now, 'US Pacific time', shopSale);
        if (strip && !strip.hidden) drawClock(label, target, now, '', strip);
        return Math.min(target - now, band || shopSale || strip && !strip.hidden ? 1000 : Infinity);
      }, Date.now);
      return;
    }

    if (!band) return;
    if (FEATURE_MODE === 'coming-soon') {
      intro('Next up', COMING_SOON_HEADLINE, COMING_SOON_SUBLINE);
      cards.filter(card => card.dataset.status === 'coming-soon').forEach(card => featureLink(card));
      const instagram = document.querySelector('[data-feature-instagram]')?.dataset.featureInstagram;
      if (instagram?.startsWith('https://')) cta('Get notified ↗', instagram);
    } else if (FEATURE_MODE === 'drop') {
      const card = cards.find(item => item.dataset.permalink === DROP_PRODUCT_PERMALINK);
      if (!card) { console.warn('Firelight: set a valid drop product permalink.'); return; }
      intro('Featured drop', DROP_HEADLINE || productName(card), DROP_SUBLINE);
      featureLink(card);
      const copy = band.querySelector('.home-feature__copy');
      if (Number.isSafeInteger(DROP_EDITION_SIZE) && DROP_EDITION_SIZE > 0) {
        const edition = document.createElement('p');
        edition.className = 'stamp stamp--collab';
        edition.textContent = `Edition of ${DROP_EDITION_SIZE}`;
        copy.append(edition);
      }
      copy.append(card.querySelector('.price').cloneNode(true));
      const form = card.querySelector('[data-drop-form]');
      cta(card.dataset.status === 'sold-out' ? 'Sold out — view product ↗' :
        card.dataset.status === 'coming-soon' ? 'Coming soon — view product ↗' : 'View product ↗', card.querySelector('a').href);
      if (form) loadArtistUI().then(() => copy.append(form.content.cloneNode(true))).catch(error => {
        console.warn('Firelight: featured product quick add unavailable.', error);
      });
      const end = instant(DROP_COUNTDOWN_END);
      if (Number.isFinite(end)) runClock(now => {
        if (now >= end) { reveal('[data-feature-clock]', false); return 0; }
        drawClock('Drop clock', end, now, '');
        return Math.min(end - now, 1000);
      });
    } else return;
    band.dataset.featurePhase = FEATURE_MODE;
    products.hidden = !products.childElementCount;
    band.hidden = false;
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-artist-trigger]');
    if (!trigger || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    openArtist({ slug: trigger.dataset.artistTrigger, category: trigger.dataset.artistCategory }, trigger, trigger.href);
  });
  const artistPage = document.querySelector('[data-artists-page]');
  const homeRoster = document.querySelector('[data-home-artist-roster]');
  if (homeRoster) {
    const storySlug = new URLSearchParams(location.search).get('artist');
    // Keep the server-rendered category links if optional artist assets aren't available.
    whenVisible(homeRoster.parentElement, () => loadArtists().then(artists =>
      loadArtistUI().then(ui => ui.renderPage(homeRoster, artists.some(artist => artist.slug === storySlug) ? storySlug : 'artists', artists))
    ).catch(error => console.warn('Firelight: artist roster unavailable.', error)));
  }
  if (artistPage) {
    const permalink = artistPage.closest('[data-custom-page]').dataset.customPage;
    loadArtists().then(artists => {
      if (permalink === 'artists') {
        const legacySlug = new URLSearchParams(location.search).get('artist');
        if (artists.some(artist => artist.slug === legacySlug)) {
          location.replace(artistStoryUrl(legacySlug));
          return;
        }
      } else if (!artists.some(artist => artist.slug === permalink)) {
        return; // Ordinary custom page: leave its Big Cartel content alone.
      }
      return loadArtistUI().then(ui => ui.renderPage(artistPage, permalink, artists));
    }).catch(error => {
      const status = artistPage.querySelector('[role="status"]');
      if (status) status.textContent = 'Artist stories could not load. Refresh to try again.';
      console.warn('Firelight: artist page unavailable.', error);
    });
  }

  const homeMap = document.querySelector('[data-home-map]');
  const fieldPage = document.querySelector('[data-road-page], [data-about-page]');
  if (fieldPage) {
    const script = document.createElement('script');
    script.src = assetUrl('js/field-pages.js');
    const fieldPageError = () => {
      fieldPage.querySelector('[data-road-timeline-status], [data-about-stats-status]').textContent = 'This part of the archive could not load. Try refreshing the page.';
    };
    script.onload = () => {
      if (window.FirelightFieldPages) window.FirelightFieldPages.init(fieldPage);
      else fieldPageError();
    };
    script.onerror = fieldPageError;
    document.head.append(script);
  }
  if (homeMap) {
    const shell = document.querySelector('.shell-top');
    if (shell) {
      const fitHome = () => homeMap.style.setProperty('--tour-shell-height', `${shell.offsetHeight}px`);
      fitHome();
      if ('ResizeObserver' in window) new window.ResizeObserver(fitHome).observe(shell);
    }
    whenVisible(homeMap.querySelector('[data-tour-map]'), () => {
      const script = document.createElement('script');
      script.src = assetUrl('js/home-map.js');
      script.onerror = () => {
        homeMap.querySelector('[data-tour-status]').textContent = homeMap.hasAttribute('data-road-map')
          ? 'Map unavailable. You can still browse the tickets below.'
          : 'Map unavailable. The shop and artist links still work.';
      };
      document.head.append(script);
    });
  }

  // The shared shell initializes on every page, not just product pages.
  const menu = document.getElementById('mobile-menu');
  const menuOpen = document.querySelector('[data-menu-open]');
  const mobileViewport = window.matchMedia('(max-width: 62rem)');
  if (menu && menuOpen && typeof menu.showModal === 'function') {
    document.body.classList.add('has-mobile-menu');
    menuOpen.hidden = false;
    menuOpen.setAttribute('aria-expanded', 'false');
    menuOpen.addEventListener('click', () => {
      if (menu.open) return;
      menu.showModal();
      document.body.classList.add('menu-is-open');
      menuOpen.setAttribute('aria-expanded', 'true');
      menu.querySelector('[data-menu-close]')?.focus();
    });
    const closeMenu = () => { if (menu.open) menu.close(); };
    menu.querySelector('[data-menu-close]')?.addEventListener('click', closeMenu);
    menu.addEventListener('click', event => {
      if (event.target.closest('a[href]')) closeMenu();
    });
    menu.addEventListener('close', () => {
      document.body.classList.remove('menu-is-open');
      menuOpen.setAttribute('aria-expanded', 'false');
      if (mobileViewport.matches) menuOpen.focus({ preventScroll: true });
    });
    // Escape is handled natively; close on desktop to avoid a hidden opener
    // leaving the whole page trapped in a modal after rotating/resizing.
    mobileViewport.addEventListener('change', event => { if (!event.matches) closeMenu(); });
    window.addEventListener('pagehide', closeMenu);
  }

  const ticker = document.querySelector('[data-ticker]');
  const tickerToggle = document.querySelector('[data-ticker-toggle]');
  if (ticker && tickerToggle) {
    const copies = ticker.querySelectorAll('.shell-ticker__track > span');
    if (copies.length === 2) {
      const text = copies[0].textContent.trim();
      // Two identical, non-shrinking groups move by exactly one group width.
      // Repeat within each group if necessary to cover even a wide viewport.
      function fitTicker() {
        copies[0].textContent = text + '\u00a0';
        const width = copies[0].getBoundingClientRect().width;
        if (!width) return;
        const repeat = Math.max(1, Math.ceil(ticker.clientWidth / width));
        const content = (text + '\u00a0').repeat(repeat);
        copies[0].textContent = content;
        copies[1].textContent = content;
      }
      fitTicker();
      document.fonts?.ready.then(fitTicker);
      if ('ResizeObserver' in window) new window.ResizeObserver(fitTicker).observe(ticker);
      else window.addEventListener('resize', fitTicker);
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let userPaused = false;
    function syncTicker() {
      const paused = reduceMotion.matches || userPaused;
      ticker.dataset.paused = String(paused);
      tickerToggle.setAttribute('aria-pressed', String(paused));
      tickerToggle.textContent = reduceMotion.matches ? 'Static' : paused ? 'Play' : 'Pause';
      tickerToggle.disabled = reduceMotion.matches;
      tickerToggle.setAttribute('aria-label', reduceMotion.matches
        ? 'Announcement motion disabled by your reduced-motion preference'
        : paused ? 'Play announcement ticker' : 'Pause announcement ticker');
    }
    tickerToggle.hidden = false;
    tickerToggle.addEventListener('click', () => { userPaused = !userPaused; syncTicker(); });
    reduceMotion.addEventListener('change', syncTicker);
    syncTicker();
  }

  let countVersion = 0;
  function updateCartCount(cart) {
    const count = Number(cart?.item_count);
    if (!Number.isInteger(count) || count < 0) return;
    countVersion += 1;
    document.querySelectorAll('[data-cart-count]').forEach(counter => { counter.textContent = String(count); });
    document.querySelectorAll('[data-cart-link]').forEach(link => {
      link.setAttribute('aria-label', `View cart, ${count} ${count === 1 ? 'item' : 'items'}`);
    });
  }
  // Netizen's AJAX contract: submit a purchasable option ID and quantity via
  // Big Cartel's Cart API. Only confirmed cart responses change the badge.
  function addToCart(id, quantity, success, failure, trigger) {
    if (!window.Cart || typeof window.Cart.addItem !== 'function') return false;
    let settled = false;
    const finish = (cart, ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const count = Number(cart?.item_count);
      if (ok && cart?.item_count != null && Number.isInteger(count) && count >= 0) {
        updateCartCount(cart);
        success(cart);
        if (trigger && hasPersonality) {
          requestAnimationFrame(() => document.dispatchEvent(new CustomEvent('firelight:added-to-cart', { detail: trigger })));
        }
      } else failure();
    };
    const timeout = setTimeout(() => finish(null, false), 12000);
    try { window.Cart.addItem(id, quantity, cart => finish(cart, true), () => finish(null, false)); }
    catch { finish(null, false); }
    return true;
  }
  let productView;
  function loadProductUI() {
    return productView ||= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = assetUrl('js/product-editorial.js');
      script.onload = () => window.FirelightProduct ? resolve(window.FirelightProduct) : reject(new Error('Product UI unavailable'));
      script.onerror = () => { script.remove(); reject(new Error('Could not load the product UI')); };
      document.head.append(script);
    }).catch(error => { productView = null; console.warn('Firelight:', error); return null; });
  }
  // The artist drawer, featured drop and editorial cards share native quick-add.
  document.addEventListener('submit', event => {
    const form = event.target;
    if (!form.matches?.('[data-artist-quick-add]')) return;
    if (form.dataset.submitting === 'true') { event.preventDefault(); return; }
    const id = Number(form.elements.namedItem('cart[add][id]')?.value);
    const button = form.querySelector('[type="submit"]');
    const feedback = form.querySelector('[data-cart-feedback]');
    if (!Number.isSafeInteger(id) || id < 1) {
      event.preventDefault();
      if (feedback) feedback.textContent = 'Choose an available option first.';
      return;
    }
    if (typeof window.Cart?.addItem !== 'function') return;
    event.preventDefault();
    const finish = message => {
      if (feedback) feedback.textContent = message;
      button.disabled = false;
      delete form.dataset.submitting;
    };
    form.dataset.submitting = 'true';
    button.disabled = true;
    if (feedback) feedback.textContent = 'Adding to your goblin sack…';
    if (!addToCart(id, 1, () => {
      finish('Added to your cart.');
      loadProductUI().then(view => view?.openCart(id, button));
    },
      () => finish('The store could not confirm this addition. Check your cart before trying again.'), button)) {
      finish('Quick add is unavailable. Open the product to add it to your cart.');
    }
  });
  function refreshCartCount() {
    if (!window.Cart || typeof window.Cart.refresh !== 'function') return;
    const version = countVersion;
    window.Cart.refresh(cart => { if (version === countVersion) updateCartCount(cart); },
      () => console.warn('Firelight: cart count refresh failed; keeping the last confirmed count.'));
  }
  window.addEventListener('pageshow', event => { if (event.persisted) refreshCartCount(); });
  window.addEventListener('focus', refreshCartCount);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshCartCount(); });

  const receipt = document.querySelector('[data-cart-receipt]');
  if (receipt && typeof HTMLFormElement.prototype.requestSubmit === 'function') {
    receipt.dataset.cartEnhanced = '';
    receipt.addEventListener('click', event => {
      const control = event.target.closest('[data-cart-step], [data-cart-remove]');
      if (!control) return;
      const quantity = control.closest('[data-cart-option]')?.querySelector('.option-quantity');
      const form = control.form;
      if (!quantity || !form) return;
      if (control.hasAttribute('data-cart-remove')) {
        const update = form.querySelector('button[name="update"]');
        if (!update) return;
        quantity.value = '0';
        form.requestSubmit(update);
      } else {
        const value = Number(quantity.value);
        const current = Number.isSafeInteger(value) && value >= 0 ? value : 1;
        const limit = Number(quantity.max);
        const next = current + Number(control.dataset.cartStep);
        quantity.value = String(Math.max(1, limit > 0 ? Math.min(limit, next) : next));
      }
    });
  }

  const editorial = document.querySelector('[data-product-permalink]');
  if (editorial) {
    loadProductUI();
    const maker = editorial.querySelector('[data-product-maker]');
    const categories = [...editorial.querySelectorAll('.product-editorial__stamps [data-category-name]')]
      .map(node => categoryName(node.dataset.categoryName));
    const collab = !categories.includes(ORIGINAL_CATEGORY) && categories.find(name => name?.startsWith(ARTIST_PREFIX));
    if (maker && collab) loadArtists().then(artists => {
      const artist = artists.find(record => record.big_cartel_category === collab);
      if (artist) return loadArtistUI().then(ui => ui.renderMadeWith(maker, artist));
    }).catch(error => console.warn('Firelight: could not load the product artist.', error));
  }

  const form = document.querySelector('#add-to-cart-form');
  if (!form) return;
  const button = form.querySelector('#add-to-cart-button');
  let optionInput = form.querySelector('[name="cart[add][id]"]:not([data-grouped-option])');
  const grouped = form.querySelector('[data-option-groups]');
  const flat = form.querySelector('[data-flat-options]');
  const groups = Array.from(form.querySelectorAll('.product_option_group'));
  const sticky = document.querySelector('[data-sticky-buy]');
  const stickyAdd = sticky?.querySelector('[data-sticky-add]');
  const feedback = form.querySelector('[data-cart-feedback]');
  const price = editorial?.querySelector('.product-editorial__price');
  const defaultPrice = price?.innerHTML;
  let product = null;
  let busy = false;
  let usedSticky = false;
  const say = message => { if (feedback) feedback.textContent = message; };
  const selectedValues = () => groups.map(group => Number(group.value)).filter(Boolean);
  const matches = (option, ids) => ids.every(id => option.option_group_values.some(value => Number(value.id) === id));
  const purchaseId = () => {
    const id = Number(optionInput?.value);
    return id > 0 && Number.isSafeInteger(id) && !optionInput.selectedOptions?.[0]?.disabled ? id : 0;
  };
  function syncPurchaseButtons() {
    button.disabled = busy || !purchaseId();
    if (stickyAdd) {
      stickyAdd.disabled = busy;
      stickyAdd.textContent = busy ? 'Adding…' : purchaseId() ? 'Add to cart' : 'Choose an option';
    }
  }
  function displayPrice(amount) {
    if (!price) return;
    if (amount == null || amount === '' || !Number.isFinite(Number(amount))) { price.innerHTML = defaultPrice; return; }
    const { currency = 'USD', moneyFormat = 'sign' } = window.bigcartel?.account || {};
    try {
      const value = new Intl.NumberFormat(navigator.language, { style: 'currency', currency,
        currencyDisplay: moneyFormat === 'code' ? 'code' : 'symbol' });
      price.textContent = moneyFormat === 'none'
        ? value.formatToParts(amount).filter(part => part.type !== 'currency').map(part => part.value).join('').trim()
        : value.format(amount);
    } catch { price.innerHTML = defaultPrice; }
  }

  function resolveGroups() {
    if (grouped.disabled) return;
    optionInput.value = '0';
    if (!product) return;
    groups.forEach((group, index) => {
      const otherIds = groups.slice(0, index).map(other => Number(other.value)).filter(Boolean);
      Array.from(group.options).filter(choice => choice.value).forEach(choice => {
        const candidates = product.options.filter(option => matches(option, [...otherIds, Number(choice.value)]));
        const available = candidates.some(option => !option.sold_out);
        choice.disabled = !available;
        choice.textContent = choice.dataset.name + (available ? '' : candidates.length ? ' — sold out' : ' — unavailable');
      });
      if (group.selectedOptions[0]?.disabled) group.value = '';
    });
    const ids = selectedValues();
    const option = ids.length === groups.length
      ? product.options.find(candidate => matches(candidate, ids) && !candidate.sold_out)
      : null;
    if (option) {
      optionInput.value = option.id;
      displayPrice(option.price);
      say('');
    } else {
      displayPrice(null);
      if (ids.length === groups.length) say('That combination is not available. Please choose another.');
    }
    syncPurchaseButtons();
  }

  const syncSingle = () => {
    syncPurchaseButtons();
    if (optionInput.selectedOptions) displayPrice(purchaseId() ? optionInput.selectedOptions[0]?.dataset.price : null);
  };
  optionInput.addEventListener('change', syncSingle);
  syncSingle();
  if (groups.length) {
    groups.forEach(group => group.addEventListener('change', resolveGroups));
    if (typeof window.Product?.find === 'function') {
      window.Product.find(editorial.dataset.productPermalink,
        data => {
          if (optionInput.value || busy || flat.contains(document.activeElement) ||
            !Array.isArray(data?.options) || !data.options.length || !data.options.every(option => Array.isArray(option.option_group_values))) return;
          product = data;
          optionInput.disabled = true;
          flat.hidden = true;
          grouped.disabled = false;
          grouped.hidden = false;
          optionInput = grouped.querySelector('[data-grouped-option]');
          resolveGroups();
        }, () => { /* The native option list is already available. */ });
    }
  }
  if (stickyAdd && 'IntersectionObserver' in window && typeof form.requestSubmit === 'function') {
    const observeBuy = new IntersectionObserver(([entry]) => {
      sticky.hidden = entry.intersectionRatio >= .75;
    }, { threshold: [.75], rootMargin: '0px 0px -60px 0px' });
    observeBuy.observe(button);
    stickyAdd.addEventListener('click', () => {
      if (!purchaseId()) {
        const choice = groups.find(group => !group.matches(':disabled') && !group.value) || optionInput;
        choice.focus();
        choice.scrollIntoView({ block: 'center' });
        return;
      }
      usedSticky = true;
      if (!form.reportValidity()) { usedSticky = false; return; }
      form.requestSubmit(button);
    });
  }

  form.addEventListener('submit', event => {
    if (busy) { event.preventDefault(); return; }
    if (!purchaseId()) {
      event.preventDefault();
      say('Choose an available option first.');
      return;
    }
    // Leave native POST /cart available if Big Cartel's AJAX API cannot load.
    if (!window.Cart || typeof window.Cart.addItem !== 'function') return;
    event.preventDefault();
    const quantity = Number(form.elements.namedItem('cart[add][quantity]')?.value ?? 1);
    if (!Number.isSafeInteger(quantity) || quantity < 1) { say('Choose a whole quantity of one or more.'); return; }
    busy = true;
    syncPurchaseButtons();
    say('Adding to your goblin sack…');
    const optionId = purchaseId();
    addToCart(optionId, quantity, () => {
      say('Added! Your merch is waiting in the cart.');
      busy = false;
      syncPurchaseButtons();
      const fromSticky = usedSticky;
      usedSticky = false;
      if (!editorial) return;
      loadProductUI().then(view => {
        if (view) view.openCart(optionId, fromSticky && !stickyAdd.closest('[hidden]') ? stickyAdd : button);
        else if (fromSticky) button.scrollIntoView({ block: 'center' });
      }).catch(error => console.warn('Firelight: mini-cart unavailable.', error));
    }, () => {
      say('The store could not confirm this addition. Check your cart before trying again.');
      busy = false;
      syncPurchaseButtons();
      if (usedSticky) feedback?.scrollIntoView({ block: 'center' });
      usedSticky = false;
    }, usedSticky ? stickyAdd : button);
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFirelightTheme, { once: true });
} else {
  initFirelightTheme();
}
