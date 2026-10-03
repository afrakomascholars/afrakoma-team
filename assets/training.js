/* Afrakoma team site: training page behaviour (checklists, call script stepper, score calculator, situation picker). Built by build_training.py. */

(function () {
  'use strict';

  // ---- Checklists -------------------------------------------------------
  // Each .cl block is a checklist. Ticks are saved in localStorage under a
  // key per page, so progress survives a reload on the same device.
  var storeKey = 'afk26-' + document.body.dataset.page;

  function loadTicks() {
    try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); }
    catch (e) { return {}; } // private mode or blocked storage: start empty
  }
  function saveTicks(state) {
    try { localStorage.setItem(storeKey, JSON.stringify(state)); }
    catch (e) { /* storage unavailable: ticks just won't persist */ }
  }

  var ticks = loadTicks();
  document.querySelectorAll('.cl').forEach(function (list) {
    var boxes = list.querySelectorAll('input[type=checkbox]');
    var fill = list.querySelector('.fl');
    var label = list.querySelector('.lb');

    // Redraws the progress bar and "n of m done" text.
    function refresh() {
      var done = 0;
      boxes.forEach(function (b) { if (b.checked) done++; });
      if (fill) fill.style.width = (boxes.length ? (100 * done / boxes.length) : 0) + '%';
      if (label) label.textContent = done + ' of ' + boxes.length + ' done';
    }

    boxes.forEach(function (b) {
      b.checked = !!ticks[b.id];
      b.addEventListener('change', function () { ticks[b.id] = b.checked; saveTicks(ticks); refresh(); });
    });

    var reset = list.querySelector('.reset');
    if (reset) reset.addEventListener('click', function () {
      boxes.forEach(function (b) { b.checked = false; delete ticks[b.id]; });
      saveTicks(ticks); refresh();
    });
    refresh();
  });

  // ---- Call script stepper (callers page) --------------------------------
  // Shows one .sp step at a time with Back / Next buttons.
  document.querySelectorAll('.stepper').forEach(function (stepper) {
    var steps = stepper.querySelectorAll('.sp');
    var i = 0;
    var count = stepper.querySelector('.cnt');
    var back = stepper.querySelector('.pv');
    var next = stepper.querySelector('.nx');
    function show() {
      steps.forEach(function (s, j) { s.style.display = j === i ? 'block' : 'none'; });
      count.textContent = 'Step ' + (i + 1) + ' of ' + steps.length;
      back.disabled = i === 0;
      next.disabled = i === steps.length - 1;
    }
    back.addEventListener('click', function () { if (i > 0) { i--; show(); } });
    next.addEventListener('click', function () { if (i < steps.length - 1) { i++; show(); } });
    show();
  });

  // ---- Score calculator (Selection Panel page) ---------------------------
  // Total = need/5*45 + merit/5*35 + payItForward/5*20, shown once all three are picked.
  var calc = document.getElementById('calc');
  if (calc) {
    var updateTotal = function () {
      var v = {};
      calc.querySelectorAll('.crit').forEach(function (c) {
        var picked = c.querySelector('input:checked');
        v[c.dataset.k] = picked ? Number(picked.value) : 0;
      });
      var total = v.need / 5 * 45 + v.merit / 5 * 35 + v.pif / 5 * 20;
      document.getElementById('total').textContent =
        (v.need && v.merit && v.pif) ? String(Math.round(total * 10) / 10) : '\u2013';
    };
    calc.addEventListener('change', updateTotal);
    updateTotal();

    // Typing a BECE aggregate picks the matching merit band automatically.
    var agg = document.getElementById('agg');
    if (agg) agg.addEventListener('input', function () {
      var a = Number(agg.value), band = 0;
      if (a >= 6 && a <= 54) band = a <= 10 ? 5 : a <= 15 ? 4 : a <= 20 ? 3 : a <= 25 ? 2 : 1;
      if (band) {
        var radio = calc.querySelector('.crit[data-k=merit] input[value="' + band + '"]');
        if (radio) { radio.checked = true; updateTotal(); }
      }
      document.getElementById('aggout').textContent = band ? ('Merit score: ' + band) : 'Enter an aggregate from 6 to 54';
    });
  }

  // ---- "What do I do if" picker (callers page) ---------------------------
  var situation = document.getElementById('sit');
  if (situation) {
    var answers = document.getElementById('sitout');
    situation.addEventListener('change', function () {
      answers.querySelectorAll('[data-s]').forEach(function (d) { d.hidden = d.dataset.s !== situation.value; });
    });
  }
})();
