// ==UserScript==
// @name         Odoo: Chatter Drawer Management
// @namespace    https://telephone-business-systems-inc.odoo.com/odoo
// @version      1.1.0
// @description  control the display of the Odoo chatter portion of the screen when reviewing detailed records
// @author       Roberto PORFIRIO
// @match        https://*.odoo.com/odoo/*
// @updateURL    https://raw.githubusercontent.com/Telephone-Business-Systems-Inc/tampermonkey-scripts/refs/heads/main/scripts/odoo-chatter-drawer.meta.js
// @downloadURL  https://raw.githubusercontent.com/Telephone-Business-Systems-Inc/tampermonkey-scripts/refs/heads/main/scripts/odoo-chatter-drawer.user.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BTN_ID = 'tm-chatter-drawer-btn';
  const BACKDROP_ID = 'tm-chatter-backdrop';
  const KEY_STATE = 'odoo_chatter_state';
  const KEY_LAST = 'odoo_chatter_last_visible';

  // --- Drawer width (used in drawer/floating mode) ---
  const MAX_DRAWER_WIDTH = 600;
  let drawerWidth = 420;

  // --- Pinned width: clamp(MIN, viewport * PCT, MAX) ---
  // Evaluated at transition time so it responds to window resizes between navigations.
  const MIN_PINNED_WIDTH = 320;
  const PINNED_WIDTH_PCT = 0.28;
  const MAX_PINNED_WIDTH = 480;

  function getPinnedWidth() {
    return Math.min(
      MAX_PINNED_WIDTH,
      Math.max(MIN_PINNED_WIDTH, Math.round(window.innerWidth * PINNED_WIDTH_PCT))
    );
  }

  let currentChatter = null;

  function getChatter() {
    return document.querySelector('.o-mail-ChatterContainer');
  }

  function getFormSheet() {
    return document.querySelector('.o_form_sheet_bg');
  }

  function getBackdrop() {
    return document.getElementById(BACKDROP_ID);
  }

  function getButton() {
    return document.getElementById(BTN_ID);
  }

  function getState() {
    return sessionStorage.getItem(KEY_STATE) || 'closed';
  }

  function getLastVisible() {
    return sessionStorage.getItem(KEY_LAST) || 'drawer';
  }

  function saveState(state) {
    sessionStorage.setItem(KEY_STATE, state);
    if (state !== 'closed') {
      sessionStorage.setItem(KEY_LAST, state);
    }
  }

  function expandFormSheet() {
    const sheet = getFormSheet();
    if (!sheet) return;
    sheet.style.flex = '1 1 100%';
    sheet.style.maxWidth = '100%';
  }

  function releaseFormSheet() {
    const sheet = getFormSheet();
    if (!sheet) return;
    sheet.style.flex = '';
    sheet.style.maxWidth = '';
  }

  // Strips all script-applied styles — used when leaving drawer mode entirely.
  function clearDrawerStyles(chatter) {
    Object.assign(chatter.style, {
      position: '',
      top: '',
      right: '',
      width: '',
      height: '',
      zIndex: '',
      overflowY: '',
      background: '',
      boxShadow: '',
      transform: '',
      transition: '',
      display: '',
      flex: '',
      maxWidth: '',
    });
  }

  // Applies a viewport-aware width constraint for pinned (inline) mode.
  // Uses clearDrawerStyles first to remove any leftover drawer positioning,
  // then constrains the chatter column without affecting its flow in the layout.
  function setPinnedStyles(chatter) {
    clearDrawerStyles(chatter);
    const width = getPinnedWidth();
    chatter.style.flex = '0 0 ' + width + 'px';
    chatter.style.maxWidth = width + 'px';
  }

  function setButtonAppearance(btn, state) {
    if (state === 'closed') {
      btn.textContent = 'Show Chatter';
      btn.className = 'btn btn-primary';
    } else if (state === 'drawer') {
      btn.textContent = 'Pin Chatter';
      btn.className = 'btn btn-secondary';
    } else {
      btn.textContent = 'Hide Chatter';
      btn.className = 'btn btn-secondary';
    }
  }

  function updateButton(state) {
    const btn = getButton();
    if (btn) setButtonAppearance(btn, state);
  }

  function transitionTo(newState) {
    const chatter = getChatter();
    if (!chatter) return;

    const prevState = getState();
    saveState(newState);
    updateButton(newState);

    const backdrop = getBackdrop();

    if (newState === 'drawer') {
      chatter.style.display = '';
      Object.assign(chatter.style, {
        position: 'fixed',
        top: '0',
        right: '0',
        width: drawerWidth + 'px',
        height: '100%',
        zIndex: '1050',
        overflowY: 'auto',
        background: 'var(--o-view-background-color, #ffffff)',
        boxShadow: '-4px 0 16px rgba(0,0,0,0.15)',
        transform: 'translateX(100%)',
        transition: 'none',
      });
      expandFormSheet();
      if (backdrop) backdrop.style.display = 'block';
      requestAnimationFrame(() => {
        chatter.style.transition = 'transform 200ms ease';
        chatter.style.transform = 'translateX(0)';
      });

    } else if (newState === 'pinned') {
      setPinnedStyles(chatter);
      releaseFormSheet();
      if (backdrop) backdrop.style.display = 'none';

    } else {
      if (backdrop) backdrop.style.display = 'none';
      if (prevState === 'drawer') {
        chatter.style.transition = 'transform 200ms ease';
        chatter.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (getState() === 'closed') {
            clearDrawerStyles(chatter);
            chatter.style.display = 'none';
            expandFormSheet();
          }
        }, 210);
      } else {
        clearDrawerStyles(chatter);
        chatter.style.display = 'none';
        expandFormSheet();
      }
    }
  }

  function onButtonClick() {
    const state = getState();
    if (state === 'closed') transitionTo('drawer');
    else if (state === 'drawer') transitionTo('pinned');
    else transitionTo('closed');
  }

  function onAltC() {
    const state = getState();
    transitionTo(state === 'closed' ? getLastVisible() : 'closed');
  }

  function onAltX() {
    const state = getState();
    if (state === 'drawer') transitionTo('pinned');
    else if (state === 'pinned') transitionTo('drawer');
  }

  function injectBackdrop() {
    if (getBackdrop()) return;
    const backdrop = document.createElement('div');
    backdrop.id = BACKDROP_ID;
    Object.assign(backdrop.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.25)',
      zIndex: '1049',
      display: 'none',
    });
    backdrop.addEventListener('click', () => transitionTo('closed'));
    document.body.appendChild(backdrop);
  }

  function injectButton() {
    if (getButton()) return;
    const btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.title = 'Cycle state | Alt+Shift+C: toggle | Alt+Shift+X: swap mode';
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '9999',
    });
    setButtonAppearance(btn, getState());
    btn.addEventListener('click', onButtonClick);
    document.body.appendChild(btn);
  }

  function injectKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (!e.altKey || e.ctrlKey || !e.shiftKey || e.metaKey) return;
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        onAltC();
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        onAltX();
      }
    });
  }

  function setupChatter(chatter) {
    requestAnimationFrame(() => {
      const rect = chatter.getBoundingClientRect();
      drawerWidth = rect.width > 0
        ? Math.min(Math.round(rect.width), MAX_DRAWER_WIDTH)
        : 420;

      const saved = getState();
      if (saved === 'drawer') {
        transitionTo('drawer');
      } else if (saved === 'pinned') {
        setPinnedStyles(chatter);
        releaseFormSheet();
        updateButton('pinned');
      } else {
        chatter.style.display = 'none';
        expandFormSheet();
        updateButton('closed');
      }
    });
  }

  function init(chatter) {
    currentChatter = chatter;
    setupChatter(chatter);
    injectBackdrop();
    injectButton();
  }

  function teardown() {
    currentChatter = null;
    const btn = getButton();
    if (btn) btn.remove();
    const backdrop = getBackdrop();
    if (backdrop) backdrop.remove();
  }

  injectKeyboardShortcuts();

  const observer = new MutationObserver(() => {
    const chatter = getChatter();
    if (chatter && chatter !== currentChatter) {
      init(chatter);
    } else if (!chatter && currentChatter) {
      teardown();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  const chatter = getChatter();
  if (chatter) init(chatter);
})();
