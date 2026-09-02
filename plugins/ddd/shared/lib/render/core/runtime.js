/* ddd review runtime. Plain browser JS, embedded once per page, no network.
   Works on every svg[data-diagram]: pan/zoom, a node finder, focus node,
   relationship trace and expand/collapse for details trees. Exposes
   window.dddRuntime = {pan, zoom, search, focus, trace, toggle}.

   Page hooks it binds to (all optional):
     input[data-ddd-search]            the finder; Enter jumps to the first match
     [data-ddd-search-count]           receives "N matches"
     [data-search-row]                 non-SVG rows hidden when they do not match
     [data-ddd-toggle=expand|collapse|toggle] [data-ddd-scope=<selector>]
                                       buttons that open/close details trees
     #<id> in the URL                  opens enclosing details, focuses the node
   Elements it creates: button.ddd-fit after each diagram, div.ddd-tooltip
   once per page (positioned inline; style the rest in page CSS). */
(function () {
  'use strict';
  if (window.dddRuntime) return;

  var SEL_DIAGRAM = 'svg[data-diagram]';
  var SEL_NODE = '[data-node-id]';
  var SEL_EDGE = '[data-edge]';
  var tooltip = null;
  var focused = null;

  function all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function diagrams() { return all(SEL_DIAGRAM); }
  function diagramOf(el) { return el && el.closest ? el.closest(SEL_DIAGRAM) : null; }
  function resolve(target, selector) {
    if (typeof target === 'string') return document.querySelector(target);
    if (target && target.nodeType === 1) return selector && !target.matches(selector) ? target.closest(selector) : target;
    return null;
  }

  /* ---- pan / zoom (viewBox based, so no transform fights with the CSS) ---- */
  function viewBox(svg) {
    var v = svg.getAttribute('viewBox').split(/[\s,]+/).map(Number);
    return { x: v[0], y: v[1], w: v[2], h: v[3] };
  }
  function setViewBox(svg, v) {
    svg.setAttribute('viewBox', [v.x, v.y, v.w, v.h].map(function (n) { return Math.round(n * 100) / 100; }).join(' '));
  }
  function home(svg) {
    if (!svg.dataset.home) svg.dataset.home = svg.getAttribute('viewBox');
    return svg.dataset.home.split(/[\s,]+/).map(Number);
  }
  function fit(svg) {
    var h = home(svg);
    setViewBox(svg, { x: h[0], y: h[1], w: h[2], h: h[3] });
  }
  function pan(target, dx, dy) {
    var svg = resolve(target, SEL_DIAGRAM);
    if (!svg) return;
    home(svg);
    var v = viewBox(svg);
    var rect = svg.getBoundingClientRect();
    var k = v.w / Math.max(1, rect.width);
    setViewBox(svg, { x: v.x - dx * k, y: v.y - dy * k, w: v.w, h: v.h });
  }
  function zoom(target, factor, clientX, clientY) {
    var svg = resolve(target, SEL_DIAGRAM);
    if (!svg) return;
    home(svg);
    var v = viewBox(svg);
    var rect = svg.getBoundingClientRect();
    var fx = clientX === undefined ? 0.5 : (clientX - rect.left) / Math.max(1, rect.width);
    var fy = clientY === undefined ? 0.5 : (clientY - rect.top) / Math.max(1, rect.height);
    var h = home(svg);
    var nw = Math.min(h[2] * 8, Math.max(h[2] / 16, v.w / factor));
    var nh = v.h * (nw / v.w);
    setViewBox(svg, { x: v.x + (v.w - nw) * fx, y: v.y + (v.h - nh) * fy, w: nw, h: nh });
  }
  function bindPanZoom(svg) {
    if (svg.dataset.dddBound) return;
    svg.dataset.dddBound = '1';
    home(svg);
    var drag = null;
    /* Plain wheel scrolls the page; zoom needs ctrl/cmd (pinch sends ctrlKey)
       or a diagram the reader has clicked into, so a page of 15 diagrams does
       not trap the scroll wheel. */
    svg.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey && !svg.dataset.dddActive) return;
      e.preventDefault();
      zoom(svg, e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
    }, { passive: false });
    svg.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      diagrams().forEach(function (other) { delete other.dataset.dddActive; });
      svg.dataset.dddActive = '1';
      drag = { x: e.clientX, y: e.clientY, moved: false };
    });
    window.addEventListener('mousemove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x; var dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 3) return;
      drag.moved = true;
      pan(svg, dx, dy);
      drag.x = e.clientX; drag.y = e.clientY;
    });
    window.addEventListener('mouseup', function () {
      if (drag && drag.moved) svg.dataset.dddDragged = '1';
      drag = null;
    });
    svg.addEventListener('dblclick', function (e) { e.preventDefault(); fit(svg); });
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'ddd-fit';
    button.textContent = 'Fit';
    button.title = 'Reset pan and zoom (double-click the diagram does the same)';
    button.setAttribute('data-ddd-fit', svg.getAttribute('data-diagram'));
    button.addEventListener('click', function () { fit(svg); });
    svg.parentNode.insertBefore(button, svg.nextSibling);
  }

  /* ---- focus: click a node, see only what touches it ---- */
  function clearFocus() {
    focused = null;
    all('.is-focus, .is-related').forEach(function (el) { el.classList.remove('is-focus', 'is-related'); });
    diagrams().forEach(function (svg) { svg.classList.remove('has-focus'); });
  }
  function focus(target) {
    if (target === null || target === undefined) { clearFocus(); return null; }
    var node = typeof target === 'string' ? null : resolve(target, SEL_NODE);
    var id = typeof target === 'string' ? target : (node ? node.getAttribute('data-node-id') : null);
    if (!id) { clearFocus(); return null; }
    if (focused === id) { clearFocus(); return null; }
    clearFocus();
    focused = id;
    diagrams().forEach(function (svg) {
      var nodes = all(SEL_NODE, svg).filter(function (n) { return n.getAttribute('data-node-id') === id; });
      if (!nodes.length) return;
      svg.classList.add('has-focus');
      nodes.forEach(function (n) { n.classList.add('is-focus'); });
      all(SEL_EDGE, svg).forEach(function (edge) {
        var from = edge.getAttribute('data-from'); var to = edge.getAttribute('data-to');
        if (from !== id && to !== id) return;
        edge.classList.add('is-related');
        var other = from === id ? to : from;
        all(SEL_NODE, svg).forEach(function (n) { if (n.getAttribute('data-node-id') === other) n.classList.add('is-related'); });
        all('[data-edge-label="' + from + '->' + to + '"]', svg).forEach(function (l) { l.classList.add('is-related'); });
      });
    });
    return id;
  }

  /* ---- search: dim everything whose label or id does not match ---- */
  function search(query) {
    var q = String(query || '').trim().toLowerCase();
    diagrams().forEach(function (svg) {
      var nodes = all(SEL_NODE, svg);
      nodes.forEach(function (n) { n.classList.remove('is-match'); });
      if (!q) { svg.classList.remove('has-search'); return; }
      svg.classList.add('has-search');
      nodes.forEach(function (n) {
        var hay = [n.getAttribute('data-node-id'), n.getAttribute('data-label'), n.getAttribute('data-search-text')].join(' ').toLowerCase();
        if (hay.indexOf(q) !== -1) n.classList.add('is-match');
      });
    });
    all('[data-search-row]').forEach(function (row) {
      var hay = (row.getAttribute('data-search-row') + ' ' + row.textContent).toLowerCase();
      row.hidden = q ? hay.indexOf(q) === -1 : false;
    });
    var count = all('.is-match').length;
    all('[data-ddd-search-count]').forEach(function (el) { el.textContent = q ? count + ' match' + (count === 1 ? '' : 'es') : ''; });
    return count;
  }
  function bindSearch() {
    var input = document.querySelector('[data-ddd-search]');
    if (!input) return;
    var timer = null;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { search(input.value); }, 80);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; search(''); }
      if (e.key === 'Enter') {
        var first = document.querySelector('.is-match');
        if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); focus(first.getAttribute('data-node-id')); }
      }
    });
    if (input.value) search(input.value);
  }

  /* ---- trace: hover an edge, read from -> to -> label ---- */
  function ensureTooltip() {
    if (tooltip) return tooltip;
    tooltip = document.createElement('div');
    tooltip.className = 'ddd-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    /* Positioning is what makes the feature exist; looks are left to page CSS. */
    tooltip.style.position = 'absolute';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.zIndex = '1000';
    tooltip.hidden = true;
    document.body.appendChild(tooltip);
    return tooltip;
  }
  function edgeText(edge) {
    var from = edge.getAttribute('data-from-label') || edge.getAttribute('data-from') || '?';
    var to = edge.getAttribute('data-to-label') || edge.getAttribute('data-to') || '?';
    var label = edge.getAttribute('data-label');
    var kind = edge.getAttribute('data-kind');
    return from + ' → ' + to + (label ? ' → ' + label : '') + (kind ? '  [' + kind + ']' : '');
  }
  function trace(target, clientX, clientY) {
    var tip = ensureTooltip();
    var edge = target === null || target === undefined ? null : resolve(target, SEL_EDGE);
    if (!edge) { tip.hidden = true; return null; }
    var text = edgeText(edge);
    tip.textContent = text;
    tip.hidden = false;
    var x = clientX === undefined ? edge.getBoundingClientRect().left : clientX;
    var y = clientY === undefined ? edge.getBoundingClientRect().top : clientY;
    tip.style.left = (x + window.scrollX + 14) + 'px';
    tip.style.top = (y + window.scrollY + 14) + 'px';
    return text;
  }
  function bindTrace(svg) {
    svg.addEventListener('mouseover', function (e) {
      var edge = e.target.closest ? e.target.closest(SEL_EDGE) : null;
      if (edge) trace(edge, e.clientX, e.clientY);
    });
    svg.addEventListener('mousemove', function (e) {
      if (tooltip && !tooltip.hidden) { tooltip.style.left = (e.clientX + window.scrollX + 14) + 'px'; tooltip.style.top = (e.clientY + window.scrollY + 14) + 'px'; }
    });
    svg.addEventListener('mouseout', function (e) {
      if (e.target.closest && e.target.closest(SEL_EDGE)) trace(null);
    });
  }

  /* ---- toggle: expand/collapse details trees ---- */
  function toggle(target, open) {
    var root = target === undefined ? document : resolve(target);
    if (!root) return 0;
    var list = root.matches && root.matches('details') ? [root].concat(all('details', root)) : all('details', root);
    list.forEach(function (d) { d.open = open === undefined ? !d.open : !!open; });
    return list.length;
  }
  function bindToggles() {
    all('[data-ddd-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        var mode = button.getAttribute('data-ddd-toggle');
        var scope = button.getAttribute('data-ddd-scope');
        toggle(scope || undefined, mode === 'expand' ? true : mode === 'collapse' ? false : undefined);
      });
    });
  }

  /* ---- permalinks: #id opens the containing details and focuses the node ---- */
  function reveal(el) {
    var d = el.parentElement;
    while (d) { if (d.tagName === 'DETAILS') d.open = true; d = d.parentElement; }
    el.scrollIntoView({ block: 'center' });
  }
  function permalink() {
    var hash = decodeURIComponent((location.hash || '').slice(1));
    if (!hash) return;
    var el = document.getElementById(hash);
    if (el) reveal(el);
    var node = document.querySelector('[data-node-id="' + hash.replace(/"/g, '') + '"]');
    if (node) { if (!el) reveal(node); focus(hash); }
  }

  /* ---- wiring ---- */
  function onClick(e) {
    var node = e.target.closest ? e.target.closest(SEL_NODE) : null;
    var svg = diagramOf(e.target);
    if (!svg) diagrams().forEach(function (other) { delete other.dataset.dddActive; });
    if (svg && svg.dataset.dddDragged) { delete svg.dataset.dddDragged; return; }
    if (node) {
      var link = e.target.closest('a');
      if (link && link.getAttribute('href') && link.getAttribute('href').charAt(0) !== '#') return;
      e.preventDefault();
      focus(node.getAttribute('data-node-id'));
      return;
    }
    if (svg) clearFocus();
  }
  function onKey(e) {
    if (e.key === 'Escape') { clearFocus(); trace(null); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches(SEL_NODE)) {
      e.preventDefault();
      focus(e.target.getAttribute('data-node-id'));
    }
  }
  function init() {
    diagrams().forEach(function (svg) { bindPanZoom(svg); bindTrace(svg); });
    bindSearch();
    bindToggles();
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', permalink);
    permalink();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.dddRuntime = { pan: pan, zoom: zoom, search: search, focus: focus, trace: trace, toggle: toggle, fit: fit, init: init };
})();
