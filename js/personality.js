(() => {
  'use strict';

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const forced = matchMedia('(forced-colors: active)');
  const vaultKeys = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const logo = document.querySelector('.shell-brand');
  const face = logo?.querySelector('.shell-brand__face');
  const mascot = document.querySelector('[data-goblin-signal]');
  const openDialog = () => [...document.querySelectorAll('dialog[open]')].at(-1);
  const reduced = () => motion.matches;
  const playing = new Set();
  const play = (element, frames, options) => {
    if (reduced() || !element?.animate) return;
    const animation = element.animate(frames, options);
    playing.add(animation);
    animation.finished.then(() => playing.delete(animation), () => playing.delete(animation));
  };
  let ready = false;

  function append(parent, tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    parent.append(node);
    return node;
  }

  function init({ discount = '' } = {}) {
    if (!logo || ready || /^\/(?:cart|checkout)(?:\/|$)/i.test(location.pathname)) return;
    ready = true;
    const { assetUrl } = window.FirelightTheme;
    const profile = document.querySelector('.shell-footer__swarm')?.href;
    const note = append(document.body, 'aside', 'goblin-toast');
    note.setAttribute('aria-label', 'Firelight message');
    const noteLive = append(note, 'div', 'goblin-toast__message');
    const noteActions = append(note, 'div', 'goblin-toast__actions');
    const announcer = append(document.body, 'div', 'shell-sr');
    announcer.setAttribute('role', 'status');
    let noteTimer, technoTimer, activeNote, techno = false;
    let gizz = '', vault = [];

    function dismiss() {
      clearTimeout(noteTimer);
      note.className = 'goblin-toast';
      noteLive.replaceChildren();
      noteActions.replaceChildren();
      activeNote = null;
    }

    function toast(kind, title, message, action) {
      dismiss();
      activeNote = kind;
      note.classList.add('goblin-toast--open', `goblin-toast--${kind}`);
      append(noteLive, 'strong', '', title);
      if (message) append(noteLive, 'p', '', message);
      announcer.textContent = [title, message].filter(Boolean).join(' ');
      if (kind === 'hq') {
        const goblin = append(noteLive, 'img', 'goblin-toast__goblin');
        goblin.src = assetUrl('img/goblin-mark.png');
        goblin.alt = '';
        goblin.width = 64;
        goblin.height = 64;
      }
      if (action?.href) append(noteActions, 'a', '', action.label).href = action.href;
      if (action?.run) {
        const button = append(noteActions, 'button', '', action.label);
        button.type = 'button';
        button.addEventListener('click', action.run);
      }
      const close = append(noteActions, 'button', 'goblin-toast__close', '×');
      close.type = 'button';
      close.setAttribute('aria-label', 'Dismiss Firelight message');
      close.addEventListener('click', dismiss);
      if (!action && kind !== 'swarm') {
        noteTimer = setTimeout(() => {
          if (!note.contains(document.activeElement) && !note.matches(':hover')) dismiss();
        }, 5800);
      }
    }

    function swarm() {
      if (activeNote !== 'swarm') play(face, [{ rotate: '0deg' }, { rotate: '360deg' }], { duration: 850, easing: 'ease-in-out' });
      const code = typeof discount === 'string' ? discount.trim() : '';
      toast('swarm', 'The swarm sees you.', code ? `Use code ${code} at checkout.` : '');
    }

    function openVault() {
      toast('vault', 'Bootleg Vault', 'Thank you for keeping fan-made merch alive. With love, Firelight Troglodyte.',
        profile ? { href: profile, label: 'Find us on Weirdo Swarm →' } : undefined);
    }

    function readKey(key) {
      const now = key.length === 1 ? key.toLowerCase() : key;
      gizz = /^[a-z]$/.test(now) ? (gizz + now).slice(-4) : '';
      if (gizz === 'gizz') { gizz = ''; swarm(); }
      vault.push(now);
      while (!vault.every((part, i) => part === vaultKeys[i])) vault.shift();
      if (vault.length === vaultKeys.length) { vault = []; openVault(); }
    }

    document.addEventListener('keydown', event => {
      if (event.isComposing || event.repeat || event.ctrlKey || event.metaKey || event.altKey || openDialog()
        || event.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
      if (event.key === 'Escape') { stopTechno(); dismiss(); return; }
      readKey(event.key);
    });

    function stopTechno() {
      clearTimeout(technoTimer);
      techno = false;
      document.body.classList.remove('goblin-techno');
      if (activeNote === 'techno') dismiss();
    }

    let taps = [];
    logo.addEventListener('click', event => {
      if (!event.detail || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
        || location.pathname !== new URL(logo.href).pathname) return;
      // On Home the logo already points to this page. Keep the home jump, but
      // do not reload between taps. Other pages keep the native home link.
      event.preventDefault();
      if (location.hash) history.replaceState(history.state, '', logo.href);
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (techno) { stopTechno(); taps = []; return; }
      const now = performance.now();
      taps = [...taps.filter(time => now - time < 1800), now];
      if (taps.length !== 5) return;
      taps = [];
      techno = true;
      document.body.classList.add('goblin-techno');
      toast('techno', 'Goblin Techno mode', reduced() ? 'Ten seconds, no motion.' : 'Ten seconds of rhythm. No flashing.',
        { label: 'Stop mode', run: stopTechno });
      technoTimer = setTimeout(stopTechno, 10000);
    });

    // Touch has no hardware key sequence, so give it an equally hidden signal box.
    let signal;
    let signalTimer, heldSignal;
    let hqTimer, hqTarget, touchStart;
    const clearHold = () => { clearTimeout(signalTimer); clearTimeout(hqTimer); touchStart = null; heldSignal = false; };

    function signalBox() {
      if (openDialog() || typeof window.HTMLDialogElement?.prototype.showModal !== 'function') return;
      if (!signal) {
        signal = append(document.body, 'dialog', 'goblin-signal');
        signal.setAttribute('aria-labelledby', 'goblin-signal-title');
        const heading = append(signal, 'h2', '', 'Goblin signal box');
        heading.id = 'goblin-signal-title';
        const label = append(signal, 'label', '', 'Type a signal');
        const input = append(label, 'input');
        input.type = 'text';
        input.autocomplete = 'off';
        input.autocapitalize = 'none';
        input.spellcheck = false;
        input.maxLength = 24;
        input.addEventListener('input', () => {
          if (!input.value.toLowerCase().includes('gizz')) return;
          signal.close();
          swarm();
        });
        append(signal, 'p', '', 'Or tap a sequence:');
        const pad = append(signal, 'div', 'goblin-signal__keys');
        const symbols = [['ArrowUp', '↑', 'Up'], ['ArrowDown', '↓', 'Down'], ['ArrowLeft', '←', 'Left'], ['ArrowRight', '→', 'Right'], ['b', 'B', 'B'], ['a', 'A', 'A']];
        for (const [key, symbol, description] of symbols) {
          const button = append(pad, 'button', '', symbol);
          button.type = 'button';
          button.setAttribute('aria-label', description);
          button.addEventListener('click', () => {
            readKey(key);
            if (activeNote === 'vault') signal.close();
          });
        }
        const close = append(signal, 'button', 'button button--ghost', 'Close');
        close.type = 'button';
        close.autofocus = true;
        close.addEventListener('click', () => signal.close());
        signal.addEventListener('close', () => { input.value = ''; gizz = ''; vault = []; });
      }
      if (activeNote) dismiss();
      signal.showModal();
    }

    const hqPin = node => node?.closest?.('.tour-marker--hq');
    function greet() {
      if (openDialog()) return;
      toast('hq', 'Hello from Bootleg HQ', 'A wave from Portland.');
    }

    document.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse') return;
      clearHold();
      const pin = hqPin(event.target);
      const foot = event.target?.closest?.('[data-goblin-signal]');
      if (!pin && !foot) return;
      touchStart = [event.clientX, event.clientY];
      if (foot) signalTimer = setTimeout(() => { heldSignal = true; }, 650);
      else hqTimer = setTimeout(() => {
        if (!pin.isConnected) return;
        greet();
      }, 3000);
    }, { passive: true });
    document.addEventListener('pointermove', event => {
      if (touchStart && event.pointerType !== 'mouse'
        && Math.hypot(event.clientX - touchStart[0], event.clientY - touchStart[1]) > 14) clearHold();
    }, { passive: true });
    for (const type of ['pointerup', 'pointercancel']) document.addEventListener(type, event => {
      // Open after release so the long press cannot click a newly shown key or close button.
      if (heldSignal && event.type === 'pointerup') setTimeout(signalBox, 90);
      clearHold();
    }, { passive: true });
    document.addEventListener('contextmenu', event => {
      if (event.pointerType === 'touch' && (hqPin(event.target) || event.target?.closest?.('[data-goblin-signal]'))) event.preventDefault();
    });

    function aimHQ(pin, active) {
      if (!pin || pin === hqTarget) return;
      clearTimeout(hqTimer);
      hqTarget = pin;
      hqTimer = setTimeout(() => { if (pin.isConnected && active()) greet(); }, 3000);
    }
    function cancelHQ(pin, relatedTarget) {
      if (pin && hqTarget === pin && hqPin(relatedTarget) !== pin) { hqTarget = null; clearTimeout(hqTimer); }
    }
    document.addEventListener('pointerover', event => {
      if (event.pointerType === 'mouse') {
        const pin = hqPin(event.target);
        aimHQ(pin, () => pin.matches(':hover'));
      }
    });
    document.addEventListener('pointerout', event => {
      if (event.pointerType === 'mouse') cancelHQ(hqPin(event.target), event.relatedTarget);
    });
    document.addEventListener('focusin', event => {
      const pin = hqPin(event.target);
      aimHQ(pin, () => pin.contains(document.activeElement));
    });
    document.addEventListener('focusout', event => cancelHQ(hqPin(event.target), event.relatedTarget));

    if (mascot && 'IntersectionObserver' in window) {
      const wave = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting) || reduced()) return;
        wave.disconnect();
        mascot.classList.add('goblin-wave');
      }, { threshold: .3 });
      wave.observe(mascot);
    }

    initCardTilt();

    motion.addEventListener('change', () => {
      if (reduced()) for (const animation of playing) animation.cancel();
    });
    let lastBurst = -Infinity;
    document.addEventListener('firelight:added-to-cart', ({ detail: trigger }) => {
      if (!trigger?.isConnected || reduced()) return;
      const now = performance.now();
      if (now - lastBurst < 480) return;
      lastBurst = now;
      const options = { duration: 420, easing: 'ease-out' };
      play(trigger, [{ scale: '1' }, { scale: '.92 .82' }, { scale: '1.06 1.04' }, { scale: '1' }], options);
      play(document.querySelector('.shell-cart [data-cart-count]'),
        [{ scale: '1' }, { scale: '1.25' }, { scale: '1' }], options);
      burst(trigger);
      if (matchMedia('(pointer: coarse)').matches) {
        try { navigator.vibrate?.(12); } catch { /* Haptics are optional. */ }
      }
    });

    console.info("  /\\_/\\\n ( o v o )\n  > ^ <\nMade by fans, for fans. Hi from Firelight Troglodyte.");
  }

  function burst(trigger) {
    const dialog = openDialog();
    const box = append(dialog || document.body, 'div', `goblin-burst${dialog ? ' goblin-burst--inside' : ''}`);
    box.setAttribute('aria-hidden', 'true');
    if (!dialog) {
      const rect = trigger.getBoundingClientRect();
      box.style.left = `${rect.left + rect.width / 2}px`;
      box.style.top = `${rect.top + rect.height / 2}px`;
    }
    for (let i = 0; i < 10; i += 1) {
      const chip = append(box, 'i');
      const angle = i * (Math.PI * 2 / 10);
      chip.style.setProperty('--confetti-x', `${Math.cos(angle) * (36 + (i % 3) * 10)}px`);
      chip.style.setProperty('--confetti-y', `${Math.sin(angle) * (25 + (i % 3) * 6)}px`);
      chip.style.setProperty('--confetti-turn', `${(i - 5) * 58}deg`);
    }
    setTimeout(() => box.remove(), 580);
  }

  function initCardTilt() {
    if (!fine.matches || forced.matches || reduced()) return;
    let frame = 0, pointer, tilt;
    function clear() {
      cancelAnimationFrame(frame);
      frame = 0;
      tilt?.classList.remove('goblin-tilt');
      tilt = null;
    }
    function paint() {
      frame = 0;
      const { x, y, card } = pointer;
      if (tilt && card !== tilt) tilt.classList.remove('goblin-tilt');
      tilt = card;
      if (card) {
        const rect = card.closest('article')?.getBoundingClientRect() || card.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const clamp = value => Math.min(1, Math.max(-1, value));
        card.style.setProperty('--tilt-y', `${clamp((x - rect.left) * 2 / rect.width - 1) * 3.6}deg`);
        card.style.setProperty('--tilt-x', `${clamp(1 - (y - rect.top) * 2 / rect.height) * 3.6}deg`);
        card.classList.add('goblin-tilt');
      }
    }
    document.addEventListener('pointermove', event => {
      const card = event.target?.closest?.('.home-drop__card');
      if (!card || event.pointerType !== 'mouse' || reduced() || forced.matches || !fine.matches || openDialog()) { if (frame || tilt) clear(); return; }
      pointer = { x: event.clientX, y: event.clientY, card };
      if (!frame) frame = requestAnimationFrame(paint);
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', clear);
    document.addEventListener('keydown', clear);
    window.addEventListener('blur', clear);
    motion.addEventListener('change', clear);
    forced.addEventListener('change', clear);
  }

  window.FirelightPersonality = Object.freeze({ init });
})();
