(() => {
  'use strict';
  const { assetUrl, loadArtists, HQ, artistRosterUrl, artistStoryUrl } = window.FirelightTheme;
  const dialog = document.querySelector('[data-artist-drawer]');
  const body = dialog.querySelector('[data-artist-body]');
  const closeButton = dialog.querySelector('button');
  const categories = new Map(Array.from(document.querySelector('[data-artist-category-index]').content.children,
    row => [row.dataset.categoryName, row.dataset.categoryUrl]));
  let version = 0;
  let opener;

  function add(parent, tag, text = '', className = '') {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    parent.append(node);
    return node;
  }

  function https(value) {
    try { const url = new URL(value); return url.protocol === 'https:' ? url : null; }
    catch { return null; }
  }
  function storyUrl(artist) {
    return artistStoryUrl(artist.slug);
  }
  function flag(code) {
    return /^[A-Z]{2}$/.test(code || '') ? String.fromCodePoint(...Array.from(code, letter => 127397 + letter.charCodeAt(0))) : '';
  }
  function portrait(parent, artist, context = 'card') {
    if (typeof artist.portrait !== 'string' || !artist.portrait) return;
    const validLocal = /^img\/[^?#]+$/.test(artist.portrait) && !artist.portrait.split('/').includes('..');
    const url = validLocal ? assetUrl(artist.portrait) : https(artist.portrait)?.href;
    if (!url) return;
    const story = context === 'story';
    const variants = artist.portrait_variants;
    const variant = variants?.[story ? 'large' : 'small'];
    const picture = document.createElement('picture');
    picture.className = `artist-portrait${artist.hq ? ' artist-portrait--hq' : ''}`;
    let source;
    if (variant && /^img\/artists\/[\w-]+\.webp$/i.test(variant.src) && Number.isSafeInteger(variant.width) && variant.width > 0) {
      picture.style.setProperty('--portrait-native-width', `${variant.width}px`);
      source = add(picture, 'source');
      source.type = 'image/webp';
      const responsive = story && variants.small && /^img\/artists\/[\w-]+\.webp$/i.test(variants.small.src)
        && Number.isSafeInteger(variants.small.width) && variants.small.width > 0 && variants.small.width < variant.width
        ? [variants.small, variant] : [variant];
      source.srcset = responsive.map(item => `${assetUrl(item.src)} ${item.width}w`).join(', ');
      source.sizes = story ? '(max-width: 767px) calc(100vw - 3rem), (max-width: 1150px) 40vw, 520px'
        : context === 'card' ? '(max-width: 420px) 40vw, 240px' : '128px';
    }
    const image = add(picture, 'img');
    image.alt = artist.hq ? 'Firelight Troglodyte goblin logo' : `Portrait of ${artist.name}`;
    image.loading = context === 'card' ? 'lazy' : 'eager';
    image.decoding = 'async';
    if (story) image.fetchPriority = 'high';
    image.width = artist.hq ? 144 : 400;
    image.height = artist.hq ? 144 : 500;
    image.addEventListener('error', () => {
      // A browser may support WebP yet fail to fetch the preferred file.
      if (source?.isConnected && image.currentSrc !== image.src) source.remove();
      else picture.remove();
    });
    image.src = url;
    parent.append(picture);
  }
  function place(parent, artist) {
    const line = add(parent, 'p', '', 'artist-place');
    const symbol = flag(artist.country_code);
    if (symbol) add(line, 'span', symbol, 'artist-place__flag').setAttribute('aria-hidden', 'true');
    add(line, 'span', [artist.city, artist.country].filter(Boolean).join(', '));
  }
  function renderCategoryHeader(header, artist) {
    const copy = header.querySelector('[data-shop-artist-copy]');
    copy.querySelector('h1').textContent = artist.name;
    const imageSlot = document.createDocumentFragment();
    portrait(imageSlot, artist, 'drawer');
    header.prepend(imageSlot);
    place(copy, artist);
    add(copy, 'a', 'Full story →', 'artist-story-link').href = storyUrl(artist);
  }
  function renderMadeWith(section, artist) {
    const link = add(section.querySelector('[data-product-maker-card]'), 'a', '', 'product-maker__card');
    link.href = storyUrl(artist);
    link.dataset.artistTrigger = artist.slug;
    link.setAttribute('aria-haspopup', 'dialog');
    portrait(link, artist, 'drawer');
    const copy = add(link, 'div');
    add(copy, 'strong', artist.name);
    place(copy, artist);
    add(copy, 'span', 'Artist field notes →', 'artist-story-link');
    section.hidden = false;
  }
  function profileDetails(parent, artist, heading = 'h2') {
    if (!artist.hq && artist.collab_volume) add(parent, 'p', `Collab Vol. ${String(artist.collab_volume).padStart(2, '0')}`, 'stamp stamp--collab');
    const title = add(parent, heading, artist.name);
    place(parent, artist);
    const ig = https(artist.instagram);
    const studio = artist.studio_handle?.replace(/^'/, '');
    if (studio && !ig && heading !== 'h1') add(parent, 'p', studio);
    if (ig && ['instagram.com', 'www.instagram.com'].includes(ig.hostname)) add(parent, 'a', 'Instagram ↗').href = ig.href;
    return { title, instagram: ig?.href };
  }

  const sentenceSegmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('en', { granularity: 'sentence' }) : null;
  function sentences(text) {
    return sentenceSegmenter ? Array.from(sentenceSegmenter.segment(text), part => part.segment)
      : (text.match(/[\s\S]+?(?:[.!?]+["'”’)\]]*(?=\s|$)|$)/g) || []);
  }

  // Topic changes in the single-cell stories. These only add paragraph
  // boundaries; all text still comes directly from Bio & story.
  const storyBreaks = {
    julia: ['I often listen to King Gizzard'],
    viktor: ['Apart from tattooing', 'For my relation to KGLW', 'Their music inspires'],
    malwina: ['I love blending', 'I have to admit'],
  };
  function paragraphs(artist, text) {
    const fromSheet = text.split(/\r\n|\n|\r/).map(part => part.trim()).filter(Boolean);
    if (fromSheet.length > 1) return fromSheet;
    const breaks = storyBreaks[artist.slug] || [];
    const result = [];
    let paragraph = '';
    for (const sentence of sentences(text)) {
      if (paragraph && (breaks.some(start => sentence.trimStart().startsWith(start)) || paragraph.trim().split(/\s+/).length > 105)) {
        result.push(paragraph.trim());
        paragraph = '';
      }
      paragraph += sentence;
    }
    if (paragraph.trim()) result.push(paragraph.trim());
    return result;
  }

  function drawerProfile(parent, artist) {
    const header = add(parent, 'div', '', 'artist-profile');
    portrait(header, artist, 'drawer');
    profileDetails(add(header, 'div'), artist).title.id = 'artist-drawer-title';
    if (artist.hq) {
      add(parent, 'p', 'Designed in-house by Firelight Troglodyte');
      return;
    }
    const excerpt = sentences(artist.bio_story?.trim() || '').slice(0, 2).join('').trim();
    if (excerpt) add(parent, 'p', excerpt, 'artist-bio');
    add(parent, 'a', 'Full story →', 'artist-story-link').href = storyUrl(artist);
  }

  function editorialProfile(page, artist) {
    const feature = add(page, 'section', '', 'artist-feature');
    portrait(feature, artist, 'story');
    const copy = add(feature, 'div', '', 'artist-feature__copy');
    const { instagram } = profileDetails(add(copy, 'header'), artist, 'h1');
    if (artist.pull_quote?.trim()) add(copy, 'blockquote', artist.pull_quote, 'artist-quote');
    const text = artist.bio_story?.trim();
    if (text) {
      const prose = add(copy, 'div', '', 'artist-feature__prose');
      for (const paragraph of paragraphs(artist, text)) add(prose, 'p', paragraph, 'artist-bio');
    }
    const site = https(artist.website_shop);
    if (site && site.href !== instagram) add(copy, 'a', 'Website / shop ↗').href = site.href;
  }

  function processCollage(parent, artist) {
    if (!Array.isArray(artist.process_photos)) return;
    const prefix = `img/artists/${artist.slug}-process-`;
    const paths = [...new Set(artist.process_photos)].filter(path => typeof path === 'string' && path.startsWith(prefix)
      && /^[\w-]+\.(jpg|webp)$/i.test(path.slice(prefix.length)));
    if (!paths.length) return;
    const section = add(parent, 'section', '', 'artist-process');
    add(section, 'h2', 'From the studio');
    const grid = add(section, 'div', '', 'artist-process__grid');
    paths.forEach((path, index) => {
      const frame = add(grid, 'figure', '', 'artist-process__photo');
      const image = add(frame, 'img');
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = `${artist.name} — process photo ${index + 1}`;
      image.addEventListener('error', () => {
        frame.remove();
        if (!grid.childElementCount) section.remove();
      });
      image.src = assetUrl(path);
    });
  }

  function designs(parent, artist, heading = 'h3') {
    if (!artist.designs?.length) return;
    add(parent, heading, 'Designs');
    const list = add(parent, 'ul', '', 'artist-designs');
    for (const name of artist.designs) add(list, 'li', name);
  }

  async function categoryProducts(artist) {
    const route = categories.get(artist.big_cartel_category);
    if (!route) return null;
    const url = new URL(route, location.origin);
    if (url.origin !== location.origin || !url.pathname.startsWith('/category/')) throw new Error('Invalid category URL.');
    url.searchParams.set('firelight-drawer', '1');
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Category: HTTP ${response.status}`);
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const strip = doc.querySelector('template[data-artist-product-strip]');
    if (!strip) throw new Error('No product strip in this category response. Check your Products template.');
    return strip.content.children.length ? document.importNode(strip.content, true) : null;
  }

  async function fillProducts(parent, artist, story = false) {
    const section = add(parent, 'section', '', 'artist-catalog');
    if (categories.has(artist.big_cartel_category)) add(section, 'p', 'Checking the print table…', 'artist-catalog__loading').setAttribute('role', 'status');
    try {
      const products = await categoryProducts(artist);
      section.replaceChildren();
      if (products) {
        const sectionTitle = artist.hq ? 'In-house releases' : 'Made with us';
        add(section, story ? 'h2' : 'h3', sectionTitle);
        if (story) products.querySelectorAll('.artist-product h4').forEach(title => {
          const heading = document.createElement('h3');
          heading.textContent = title.textContent;
          title.replaceWith(heading);
        });
        const multiple = products.childElementCount > 1;
        if (multiple) add(section, 'p', 'Swipe for more releases →', 'artist-catalog__hint');
        const strip = add(section, 'div', '', 'artist-catalog__strip');
        if (multiple) {
          strip.tabIndex = 0;
          strip.setAttribute('role', 'region');
          strip.setAttribute('aria-label', sectionTitle);
        }
        strip.append(products);
      } else if (artist.hq) add(section, 'p', 'No in-house releases are listed yet.');
      else if (!story) designs(section, artist);
    } catch (error) {
      section.replaceChildren();
      add(section, 'p', 'Products could not load. Try again in a moment.').setAttribute('role', 'status');
      if (!story) designs(section, artist);
      console.warn('Firelight: could not load category products.', error);
    }
  }

  async function open({ slug, category }, trigger) {
    const token = ++version;
    opener = trigger?.isConnected ? trigger : null;
    body.replaceChildren();
    add(body, 'h2', 'Loading field notes…').id = 'artist-drawer-title';
    if (!dialog.open) dialog.showModal();
    body.scrollTop = 0;
    closeButton.focus({ preventScroll: true });
    try {
      const artist = slug === HQ.slug ? HQ : (await loadArtists()).find(candidate =>
        slug ? candidate.slug === slug : category && candidate.big_cartel_category === category);
      if (!dialog.open || token !== version) return;
      if (!artist) throw new Error('Artist record not found.');
      body.replaceChildren();
      drawerProfile(body, artist);
      fillProducts(body, artist);
    } catch (error) {
      if (!dialog.open || token !== version) return;
      body.replaceChildren();
      add(body, 'h2', 'Artist details unavailable').id = 'artist-drawer-title';
      add(body, 'a', 'Back to the artist roster →').href = artistRosterUrl;
      console.warn('Firelight:', error);
    }
  }

  function posterWall(parent, artists, includeHQ = false) {
    const grid = add(parent, 'ul', '', 'artists-grid');
    for (const artist of includeHQ ? [...artists, HQ] : artists) {
      const href = artist.hq ? categories.get(HQ.big_cartel_category) : storyUrl(artist);
      const card = add(add(grid, 'li'), href ? 'a' : 'div', '', `artist-card${artist.hq ? ' artist-card--hq' : ''}`);
      if (href) card.href = href;
      const kicker = artist.hq ? 'Firelight Originals' : artist.collab_volume ? `Collab Vol. ${String(artist.collab_volume).padStart(2, '0')}` : '';
      const front = add(card, 'div', '', 'artist-card__face artist-card__front');
      if (kicker) add(front, 'span', kicker, 'artist-card__edition');
      portrait(front, artist);
      add(front, 'span', artist.name, 'artist-card__name');
      const notes = add(card, 'div', '', 'artist-card__face artist-card__notes');
      add(notes, 'span', artist.name, 'artist-card__name').setAttribute('aria-hidden', 'true');
      place(notes, artist);
      if (!artist.hq) {
        const count = artist.designs?.length || 0;
        add(notes, 'span', `${count} ${count === 1 ? 'collab' : 'collabs'}`, 'artist-card__edition');
      }
      if (href) add(notes, 'span', artist.hq ? 'Shop Originals →' : 'Read the story →', 'artist-card__cta');
    }
  }

  function renderPage(page, permalink, artists) {
    page.replaceChildren();
    if (permalink === 'artists') {
      page.parentElement.classList.add('artist-index');
      add(page, 'p', 'Field notes from the artists behind Firelight’s collabs.', 'artist-index__deck');
      posterWall(page, artists, true);
      return;
    }
    const artist = artists.find(item => item.slug === permalink);
    if (!artist) return;
    page.parentElement.querySelector('[data-custom-title]').hidden = true;
    page.classList.add('artist-story');
    add(page, 'a', '← All artists', 'artist-back').href = artistRosterUrl;
    editorialProfile(page, artist);
    processCollage(page, artist);
    if (artist.designs?.length) designs(add(page, 'section', '', 'artist-design-section'), artist, 'h2');
    fillProducts(page, artist, true);
    const others = artists.filter(item => item.slug !== permalink);
    if (others.length) {
      const more = add(page, 'section', '', 'artist-more');
      add(more, 'h2', 'More artists');
      posterWall(more, others);
    }
  }

  dialog.addEventListener('close', () => {
    version++;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
    opener = null;
  });
  let outside = false;
  dialog.addEventListener('pointerdown', event => { outside = event.target === dialog; });
  dialog.addEventListener('click', event => { if (outside && event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('a[href], button:not(:disabled), select:not(:disabled), [tabindex="0"]')]
      .filter(node => node.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  });
  const mobile = matchMedia('(width < 768px)');
  let touch;
  dialog.addEventListener('touchstart', event => {
    const target = event.target;
    if (!mobile.matches || event.touches.length !== 1 || target.closest('a, button, select, .artist-catalog__strip')) return;
    if (!target.closest('[data-artist-swipe]') && body.scrollTop > 1) return;
    const { clientX, clientY } = event.touches[0];
    touch = [clientX, clientY];
  }, { passive: true });
  dialog.addEventListener('touchcancel', () => { touch = null; });
  dialog.addEventListener('touchend', event => {
    if (!touch) return;
    const { clientX, clientY } = event.changedTouches[0], down = clientY - touch[1], across = Math.abs(clientX - touch[0]);
    touch = null;
    if (down >= 65 && down > across * 1.5 && dialog.open) dialog.close();
  }, { passive: true });

  window.FirelightArtists = Object.freeze({ open, renderPage, renderCategoryHeader, renderMadeWith });
})();
