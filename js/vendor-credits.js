(() => {
  'use strict';
  const categoryCredits = [
    { categories: ['pins'], vendor: 'custom-comet', credit: 'Pins by' },
    { categories: ['posters'], vendor: 'seizure-palace', credit: 'Printed by' },
    { categories: ['shirts', 'caps'], vendor: 'garment-decor', credit: 'Printed by' },
  ];
  const locationOf = vendor => `${vendor.city}, ${vendor.state_abbr}`;
  const formatList = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

  function vendorName(vendor) {
    for (const link of [vendor.website, vendor.instagram]) {
      if (!link) continue;
      try {
        const url = new URL(link);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') continue;
        const anchor = document.createElement('a');
        anchor.href = url.href;
        anchor.textContent = vendor.name;
        return anchor;
      } catch { /* An invalid website must not block a valid Instagram link. */ }
    }
    return document.createTextNode(vendor.name);
  }

  function renderProduct(target, categories, vendors) {
    const types = new Set(categories.map(name => name.trim().toLowerCase()));
    const rule = categoryCredits.find(item => item.categories.some(category => types.has(category)));
    if (!rule || !Object.hasOwn(vendors, rule.vendor)) return;
    const vendor = vendors[rule.vendor];
    target.replaceChildren(`${rule.credit} `, vendorName(vendor), ` in ${locationOf(vendor)}`);
    target.hidden = false;
  }

  function renderAbout(target, vendors) {
    const list = target.querySelector('[data-vendor-list]');
    const rows = Object.values(vendors).map(vendor => {
      const row = document.createElement('li');
      const name = document.createElement('strong');
      name.append(vendorName(vendor));
      row.append(name, `, ${locationOf(vendor)}: ${formatList.format(vendor.makes)}`);
      return row;
    });
    if (!rows.length) return;
    list.replaceChildren(...rows);
    target.hidden = false;
  }

  async function init(url, { productCredit, categories, aboutCredits }) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`vendors.json: HTTP ${response.status}`);
    const config = await response.json();
    if (!config?.vendors || typeof config.vendors !== 'object' || Array.isArray(config.vendors)) {
      throw new Error('Invalid print-shop configuration.');
    }
    if (productCredit) renderProduct(productCredit, categories, config.vendors);
    if (aboutCredits) renderAbout(aboutCredits, config.vendors);
  }

  window.FirelightVendorCredits = Object.freeze({ init });
})();
