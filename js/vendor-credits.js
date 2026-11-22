(() => {
  'use strict';
  const automatic = [
    { categories: ['pin', 'pins'], vendor: 'custom-comet', credit: 'Pins by' },
    { categories: ['poster', 'posters'], vendor: 'seizure-palace', credit: 'Screen printed by' },
  ];
  const printShops = new Set(['garment-decor', 'seizure-palace']);
  const apparel = new Set(['shirt', 'shirts', 'tee', 'tees', 'cap', 'caps', 'hat', 'hats']);
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

  function renderProduct(target, permalink, categories, { vendors, product_vendors }) {
    const types = new Set(categories.map(name => name.trim().toLowerCase()));
    const rule = automatic.find(item => item.categories.some(category => types.has(category)));
    const assigned = [...types].some(type => apparel.has(type)) ? product_vendors[permalink] : null;
    const key = rule?.vendor || (printShops.has(assigned) ? assigned : null);
    if (!key || !Object.hasOwn(vendors, key)) return;
    const vendor = vendors[key];
    target.replaceChildren(`${rule?.credit || 'Printed by'} `, vendorName(vendor), ` in ${locationOf(vendor)}`);
    target.hidden = false;
  }

  function renderAbout(target, { vendors }) {
    const list = target.querySelector('[data-vendor-list]');
    const rows = Object.values(vendors).map(vendor => {
      const row = document.createElement('li');
      const name = document.createElement('strong');
      name.append(vendorName(vendor));
      row.append(name, ` — ${locationOf(vendor)} — ${formatList.format(vendor.makes)}`);
      return row;
    });
    if (!rows.length) return;
    list.replaceChildren(...rows);
    target.hidden = false;
  }

  async function init(url, { productCredit, permalink, categories, aboutCredits }) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`vendors.json: HTTP ${response.status}`);
    const config = await response.json();
    if (!config?.vendors || !config?.product_vendors) throw new Error('Invalid print-shop configuration.');
    if (productCredit) renderProduct(productCredit, permalink, categories, config);
    if (aboutCredits) renderAbout(aboutCredits, config);
  }

  window.FirelightVendorCredits = Object.freeze({ init });
})();
