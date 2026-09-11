/* ddd review page script. Plain browser JS, embedded once, no network. The diagram
   runtime (runtime.js) owns pan/zoom, the global finder and the fold toggles; this
   file owns what is page-level: the theme toggle, the exhibit filters, the index
   tab that marks the chapter in view, and the "/" shortcut into the finder. */
(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'ddd-review-theme';

  /* ---- theme: follow the OS until the reader chooses, then remember ---- */
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') root.setAttribute('data-theme', t);
    else root.removeAttribute('data-theme');
    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) {
      var dark = current() === 'dark';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.textContent = dark ? 'Light' : 'Dark';
      btn.title = dark ? 'Switch to the light theme' : 'Switch to the dark theme';
    }
  }
  function current() {
    var set = root.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* file:// may deny storage; the toggle still works for the session */ }
  /* A data-theme already on <html> (the PNG renders pin one) wins over storage. */
  if (!root.getAttribute('data-theme') && saved) applyTheme(saved);
  else applyTheme(root.getAttribute('data-theme'));
  var toggle = document.querySelector('[data-theme-toggle]');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = current() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try { localStorage.setItem(KEY, next); } catch (e) { /* see above */ }
    });
  }

  /* ---- exhibit filters: one kind at a time, or everything ---- */
  var filters = Array.prototype.slice.call(document.querySelectorAll('#worklist button.f'));
  filters.forEach(function (b) {
    b.addEventListener('click', function () {
      filters.forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
      b.classList.add('on');
      b.setAttribute('aria-pressed', 'true');
      var f = b.getAttribute('data-f');
      Array.prototype.forEach.call(document.querySelectorAll('#worklist .card'), function (c) {
        c.classList.toggle('is-filtered', f !== 'all' && c.getAttribute('data-kind') !== f);
      });
    });
  });

  /* ---- index tabs: mark the chapter that owns the top of the viewport ---- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('nav.tabs a[href^="#"]'));
  var sections = tabs.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  function markCurrent() {
    var y = window.scrollY + 140;
    var cur = null;
    for (var i = 0; i < sections.length; i++) if (sections[i].offsetTop <= y) cur = sections[i];
    tabs.forEach(function (a) {
      var on = cur && a.getAttribute('href') === '#' + cur.id;
      a.classList.toggle('is-current', !!on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
  }
  var ticking = false;
  window.addEventListener('scroll', function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { markCurrent(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', markCurrent);
  markCurrent();

  /* ---- header shadow once the page has scrolled under it ---- */
  var head = document.querySelector('header.docket');
  function shade() { if (head) head.classList.toggle('is-stuck', window.scrollY > 4); }
  window.addEventListener('scroll', shade, { passive: true });
  shade();

  /* ---- "/" focuses the finder; Escape clears it (runtime handles the rest) ---- */
  var finder = document.querySelector('[data-ddd-search]');
  document.addEventListener('keydown', function (e) {
    if (!finder) return;
    if (e.key === '/' && document.activeElement !== finder && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
      e.preventDefault();
      finder.focus();
      finder.select();
    }
  });

  /* ---- a hash that lands inside a closed fold opens the fold ---- */
  function openTarget() {
    var id = location.hash.slice(1);
    if (!id) return;
    var el = document.getElementById(id);
    if (!el) return;
    var p = el;
    while (p) { if (p.tagName === 'DETAILS') p.open = true; p = p.parentElement; }
  }
  window.addEventListener('hashchange', openTarget);
  openTarget();
})();
