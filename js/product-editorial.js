(() => {
  'use strict';
  const product = document.querySelector('[data-product-permalink]');

  function element(parent, tag, { text, className } = {}) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    parent.append(node);
    return node;
  }

  function initGallery() {
    const track = product.querySelector('[data-gallery-track]');
    const zoom = product.querySelector('[data-product-zoom]');
    if (!track) return;
    const photos = [...track.querySelectorAll('[data-gallery-photo]')];
    const controls = product.querySelector('[data-gallery-controls]');
    const counter = product.querySelector('[data-gallery-counter]');
    const fullPhotos = [...track.querySelectorAll('[data-gallery-full]')];
    const loadPhoto = img => { img.src = img.dataset.galleryFull; delete img.dataset.galleryFull; };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        for (const { target, isIntersecting } of entries) {
          if (!isIntersecting) continue;
          observer.unobserve(target);
          loadPhoto(target);
        }
      }, { threshold: .25 });
      fullPhotos.forEach(img => observer.observe(img));
    } else fullPhotos.forEach(loadPhoto);
    function selectCurrent() {
      const index = Math.max(0, Math.min(photos.length - 1, Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
      controls?.querySelectorAll('button').forEach((button, i) => {
        if (i === index) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
      if (counter) counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(photos.length).padStart(2, '0')}`;
    }
    if (controls) {
      controls.hidden = false;
      controls.addEventListener('click', event => {
        const button = event.target.closest('[data-gallery-index]');
        if (!button) return;
        track.scrollTo({ left: Number(button.dataset.galleryIndex) * track.clientWidth,
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
      });
      track.addEventListener('scroll', selectCurrent, { passive: true });
      selectCurrent();
    }
    if (typeof zoom?.showModal === 'function') {
      product.querySelector('[data-zoom-hint]').textContent = 'Tap or click a photo to zoom';
      const enlarged = zoom.querySelector('img');
      track.addEventListener('click', event => {
        const photo = event.target.closest('[data-gallery-photo]');
        if (!photo || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || zoom.open) return;
        event.preventDefault();
        const image = photo.querySelector('img');
        enlarged.alt = image.alt;
        enlarged.onerror = () => { enlarged.onerror = null; enlarged.src = image.currentSrc; };
        enlarged.src = photo.href;
        zoom.showModal();
      });
      zoom.addEventListener('click', event => { if (event.target === zoom) zoom.close(); });
    }
  }

  const drawer = document.querySelector('[data-mini-cart]');
  let pending;
  let opener;
  drawer?.addEventListener('close', () => {
    if (drawer.open) return;
    pending?.abort();
    if (opener?.isConnected && opener.getClientRects().length) opener.focus({ preventScroll: true });
    opener = null;
  });
  async function openCart(optionId, trigger) {
    if (typeof drawer?.showModal !== 'function') return;
    pending?.abort();
    const request = new AbortController();
    pending = request;
    const status = drawer.querySelector('[data-mini-cart-status]');
    const contents = drawer.querySelector('[data-mini-cart-details]');
    const next = drawer.querySelector('[data-mini-cart-next]');
    contents.replaceChildren();
    next.replaceChildren();
    drawer.querySelector('.mini-cart__view')?.remove();
    status.textContent = 'Added! Checking your cart…';
    opener = trigger;
    if (!drawer.open) drawer.showModal();
    try {
      // Read the same cart and prices Big Cartel renders for shoppers.
      // The theme does not keep a cart copy or calculate subtotals.
      const response = await fetch('/cart?firelight-mini=1', { cache: 'no-store', signal: request.signal });
      if (!response.ok) throw new Error(`Cart: HTTP ${response.status}`);
      const snapshot = document.createElement('template');
      snapshot.innerHTML = await response.text();
      if (request.signal.aborted || !drawer.open) return;
      const source = snapshot.content.querySelector('#cart-form');
      const line = [...(source?.querySelectorAll('[data-cart-option]') || [])]
        .find(item => Number(item.dataset.cartOption) === optionId);
      const subtotal = source?.querySelector('[data-cart-subtotal]');
      const checkout = source?.querySelector('button[name="checkout"]');
      if (!line || !subtotal?.textContent.trim() || !checkout || source.getAttribute('action') !== '/cart') throw new Error('Could not read the native cart');

      const item = element(contents, 'div', { className: 'mini-cart__item' });
      const productLink = line.querySelector('[data-cart-product-link]');
      if (productLink) item.append(document.importNode(productLink, true));
      const variant = line.querySelector('[data-cart-option-name]')?.textContent;
      if (variant) element(item, 'p', { text: variant });
      element(item, 'p', { text: `In your cart: ${line.dataset.cartLineQuantity}` });
      const total = element(contents, 'p', { className: 'mini-cart__subtotal' });
      element(total, 'span', { text: 'Subtotal' });
      element(total, 'strong', { text: subtotal.textContent.trim() });

      // Preserve the native checkout submitter and the native cart inputs.
      const form = element(next, 'form');
      form.method = source.method;
      form.action = '/cart';
      form.dataset.miniCheckout = '';
      for (const input of source.querySelectorAll('input[name]:not([disabled])')) {
        const field = element(form, 'input');
        field.type = 'hidden';
        field.name = input.name;
        field.value = input.value;
      }
      const button = document.importNode(checkout, true);
      button.classList.add('button');
      button.textContent = 'Checkout →';
      form.append(button);
      const cartLink = element(next, 'a', { text: 'View cart →', className: 'mini-cart__view' });
      cartLink.href = '/cart';
      status.textContent = '';
    } catch (error) {
      if (request.signal.aborted) return;
      console.warn('Firelight: mini-cart could not read the cart.', error);
      status.textContent = 'Your item was added. Open your cart to review it and check out.';
      const link = element(next, 'a', { text: 'View cart →', className: 'button' });
      link.href = '/cart';
    }
  }

  if (product) initGallery();
  window.FirelightProduct = Object.freeze({ openCart });
})();
