/*
 * Afrakoma team site: role tools shown on "Your tasks" (phase 2).
 *
 *   AFK_TOOLS.panel(container, creds)     Selection Panel scoring
 *   AFK_TOOLS.callers(container, creds)   Caller call log
 *   AFK_TOOLS.director(container, creds)  Program Director board
 *
 * tasks.html calls the tool for the signed-in role after sign-in.
 * creds = { email, code } is sent with every backend call; the backend
 * re-checks it and enforces the role, so nothing here is trusted.
 *
 * All text from the backend is inserted with textContent (via el()),
 * never innerHTML, so sheet content cannot inject markup.
 */
(function () {
  'use strict';

  // ===========================================================================
  // Small DOM helpers
  // ===========================================================================

  /**
   * Creates an element. attrs: plain attributes, plus
   *   text: textContent, on: { event: handler }, cls: className.
   * children: array of nodes or strings (strings become text nodes).
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') node.textContent = v;
      else if (k === 'cls') node.className = v;
      else if (k === 'on') Object.keys(v).forEach(function (ev) { node.addEventListener(ev, v[ev]); });
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  /** A status line for "Saving…", errors and confirmations. */
  function statusLine() {
    var p = el('p', { cls: 'msg', role: 'status', hidden: true });
    p.set = function (text, kind) { AFK.show(p, text, kind); };
    return p;
  }

  /** <select> with the given options, current value selected. */
  function select(id, options, value) {
    return el('select', { id: id }, options.map(function (o) {
      return el('option', { value: o, selected: o === value, text: o || 'Choose…' });
    }));
  }

  /** Labelled form field wrapper. */
  function field(label, input, hint) {
    return el('div', { cls: 'field' }, [el('label', { for: input.id, text: label }), input, hint ? el('span', { cls: 'hint', text: hint }) : null]);
  }

  /** Small coloured chip, e.g. "Scored 87" or "Confirmed". kind: ok | warn | plain */
  function chip(text, kind) { return el('span', { cls: 'chip ' + (kind || 'plain'), text: text }); }

  /** Merit band from a BECE aggregate (6 best ... 54). Matches the training rubric. */
  function meritFor(agg) {
    if (!(agg >= 6 && agg <= 54)) return 0;
    return agg <= 10 ? 5 : agg <= 15 ? 4 : agg <= 20 ? 3 : agg <= 25 ? 2 : 1;
  }

  // ===========================================================================
  // Selection Panel: score applications blind
  // ===========================================================================

  var RUBRIC = {
    need: ['No financial need described', 'A general statement of need with few specifics', 'Real hardship; can cover part of the costs',
           'Serious strain, clearly described; can cover only a small part', 'Cannot cover entry costs without help, with clear specifics'],
    merit: ['26 or higher', '21 to 25', '16 to 20', '11 to 15', '6 to 10'],
    pif: ['Blank or off topic', 'A vague or borrowed answer', 'A sincere but general intention',
          'A clear intention with some specifics', 'A specific, realistic plan tied to school, family or community']
  };

  function panelTool(root, creds) {
    var state = { applicants: [] };

    function load() {
      clear(root);
      root.appendChild(el('p', { cls: 'hint', text: 'Loading applications…' }));
      AFK.api('panelList', creds).then(function (res) {
        clear(root);
        if (!res.ok) return root.appendChild(el('p', { cls: 'msg err', text: res.error }));
        state.applicants = res.applicants;
        showList();
      });
    }

    // ---- List of applications with progress ----
    function showList(flash) {
      clear(root);
      var list = state.applicants;
      var done = list.filter(function (a) { return a.myScore; }).length;

      root.appendChild(el('h2', { text: 'Score applications' }));
      if (flash) root.appendChild(el('p', { cls: 'msg good', text: flash }));
      if (!list.length) {
        return root.appendChild(el('div', { cls: 'soon', text: 'No applications are ready yet. The Verification Desk marks each one Ready once its redaction is checked. Come back soon.' }));
      }
      root.appendChild(el('div', { cls: 'prog' }, [
        el('div', { cls: 'tr' }, [el('div', { cls: 'fl', style: 'width:' + (100 * done / list.length) + '%' })]),
        el('div', { cls: 'lb', text: done + ' of ' + list.length + ' scored' })
      ]));
      root.appendChild(el('p', { cls: 'sub', text: 'Read both answers before you look at the aggregate. Your scores are private to you; other panelists cannot see them.' }));

      root.appendChild(el('div', { cls: 'tiles' }, list.map(function (a) {
        return el('button', { cls: 'tile pick', type: 'button', on: { click: function () { showScorer(a); } } }, [
          el('h3', { text: a.id }),
          a.myScore ? chip('Scored ' + a.myScore.total, 'ok') : chip('To score', 'warn'),
          el('span', { cls: 'go', text: a.myScore ? 'Review or change' : 'Score this application' })
        ]);
      })));
    }

    // ---- Scoring form for one application ----
    function showScorer(a) {
      clear(root);
      window.scrollTo(0, root.offsetTop - 20);
      var prev = a.myScore || {};
      var merit = meritFor(a.aggregate);

      root.appendChild(el('button', { cls: 'ghost back', type: 'button', text: 'Back to all applications', on: { click: function () { showList(); } } }));
      root.appendChild(el('h2', { text: 'Application ' + a.id }));

      // Answers first, aggregate last (training rule: stories before numbers).
      root.appendChild(el('h3', { text: 'Financial need, in their words' }));
      root.appendChild(el('blockquote', { cls: 'answer', text: a.prompt1 || '(No answer given)' }));
      root.appendChild(el('h3', { text: 'How they will pay it forward' }));
      root.appendChild(el('blockquote', { cls: 'answer', text: a.prompt2 || '(No answer given)' }));

      var form = el('form', { cls: 'scorer', novalidate: true });
      form.appendChild(criterion('need', 'Financial need', 45, prev.need, prev.needNote));
      form.appendChild(criterion('pif', 'Pay it forward commitment', 20, prev.pif, prev.pifNote));

      // Merit is set by the aggregate band; shown, not chosen.
      var meritBox = el('fieldset', { cls: 'crit' }, [
        el('legend', {}, [el('b', { text: 'Academic merit' }), el('span', { cls: 'wt', text: '35 points' })]),
        el('p', { text: 'BECE aggregate: ' + (a.aggregate || 'missing') + '. Band ' + (merit ? RUBRIC.merit[merit - 1] : 'unknown') + ', so merit scores ' + (merit || '?') + '.' }),
        field('One-line note on merit', el('input', { id: 'meritNote', type: 'text', maxlength: 300, value: prev.meritNote || '' }))
      ]);
      form.appendChild(meritBox);

      var totalEl = el('span', { cls: 'n', text: '–' });
      form.appendChild(el('div', { cls: 'totalbox' }, [totalEl, el('span', { cls: 'of', text: 'out of 100' })]));
      var status = statusLine();
      form.appendChild(status);
      var save = el('button', { type: 'submit', text: a.myScore ? 'Update my score' : 'Save my score' });
      form.appendChild(save);

      function picked(k) { var r = form.querySelector('input[name=' + k + ']:checked'); return r ? Number(r.value) : 0; }
      function updateTotal() {
        var need = picked('need'), pif = picked('pif');
        totalEl.textContent = (need && pif && merit) ? String(Math.round((need / 5 * 45 + merit / 5 * 35 + pif / 5 * 20) * 10) / 10) : '–';
      }
      form.addEventListener('change', updateTotal);
      updateTotal();

      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var body = Object.assign({
          id: a.id, need: picked('need'), merit: merit, pif: picked('pif'),
          needNote: form.querySelector('#needNote').value, meritNote: form.querySelector('#meritNote').value,
          pifNote: form.querySelector('#pifNote').value
        }, creds);
        if (!body.need || !body.pif) return status.set('Pick a score for Financial need and for Pay it forward.');
        if (!merit) return status.set('This application has no valid aggregate. Tell the Program Director.');
        save.disabled = true; status.set('Saving…', 'good');
        AFK.api('panelScore', body).then(function (res) {
          save.disabled = false;
          if (!res.ok) return status.set(res.error);
          a.myScore = { need: body.need, merit: merit, pif: body.pif, total: res.total, needNote: body.needNote, meritNote: body.meritNote, pifNote: body.pifNote };
          showList('Saved ' + a.id + ': ' + res.total + ' out of 100.');
        });
      });
      root.appendChild(form);
    }

    /** One rubric block: five radio options plus a required note. */
    function criterion(key, title, weight, value, note) {
      var opts = [5, 4, 3, 2, 1].map(function (s) {
        return el('label', { cls: 'opt' }, [
          el('input', { type: 'radio', name: key, value: String(s), checked: value === s }),
          el('span', { cls: 'sc', text: String(s) }),
          el('span', { cls: 'tx', text: RUBRIC[key][s - 1] })
        ]);
      });
      return el('fieldset', { cls: 'crit' }, [el('legend', {}, [el('b', { text: title }), el('span', { cls: 'wt', text: weight + ' points' })])]
        .concat(opts)
        .concat([field('One-line note on ' + title.toLowerCase(), el('input', { id: key + 'Note', type: 'text', maxlength: 300, value: note || '' }))]));
    }

    load();
  }

  // ===========================================================================
  // Callers: call log for each Selected family
  // ===========================================================================

  var CHOICE = {
    momoResult: ['', 'Match', 'Check', 'No match'],
    announcement: ['', 'Full', 'First name only'],
    testimonial: ['', 'Recorded', 'Declined', 'Later'],
    outcome: ['', 'In progress', 'Confirmed', 'Unreachable', 'Declined']
  };

  function callersTool(root, creds) {
    var families = [];

    function load(flash) {
      clear(root);
      root.appendChild(el('p', { cls: 'hint', text: 'Loading your families…' }));
      AFK.api('callerList', creds).then(function (res) {
        clear(root);
        if (!res.ok) return root.appendChild(el('p', { cls: 'msg err', text: res.error }));
        families = res.families;
        showList(flash);
      });
    }

    function outcomeChip(f) {
      if (f.outcome === 'Confirmed') return chip('Confirmed', 'ok');
      if (f.outcome === 'Unreachable' || f.outcome === 'Declined') return chip(f.outcome, 'warn');
      return chip(f.outcome || 'Not called yet', 'plain');
    }

    function showList(flash) {
      clear(root);
      root.appendChild(el('h2', { text: 'Your families' }));
      if (flash) root.appendChild(el('p', { cls: 'msg good', text: flash }));
      if (!families.length) {
        return root.appendChild(el('div', { cls: 'soon', text: 'No families on your list yet. They appear here as soon as the Program Director approves the final list.' }));
      }
      var done = families.filter(function (f) { return f.outcome === 'Confirmed'; }).length;
      root.appendChild(el('p', { cls: 'sub', text: done + ' of ' + families.length + ' confirmed. Every family must be reached by Monday, October 5.' }));
      root.appendChild(el('div', { cls: 'tiles' }, families.map(function (f) {
        return el('button', { cls: 'tile pick', type: 'button', on: { click: function () { showFamily(f); } } }, [
          el('h3', { text: f.student }),
          el('p', { text: [f.school, f.region].filter(Boolean).join(', ') }),
          outcomeChip(f),
          el('span', { cls: 'go', text: 'Open call record' })
        ]);
      })));
      root.appendChild(el('p', { cls: 'hint' }, ['Need the script? ', el('a', { href: 'training/callers.html', target: '_blank', rel: 'noopener', text: 'Open the call script in a new tab' })]));
    }

    function showFamily(f) {
      clear(root);
      window.scrollTo(0, root.offsetTop - 20);
      root.appendChild(el('button', { cls: 'ghost back', type: 'button', text: 'Back to your families', on: { click: function () { showList(); } } }));
      root.appendChild(el('h2', { text: f.student }));

      // Who to call and what to check.
      root.appendChild(el('div', { cls: 'tiles' }, [
        el('div', { cls: 'tile' }, [el('h3', { text: 'Call' }), el('p', { text: f.guardian }),
          f.phone ? el('a', { cls: 'btn', href: 'tel:' + f.phone.replace(/[^\d+]/g, ''), text: 'Call ' + f.phone }) : el('p', { text: 'No phone number on file. Tell the Program Director.' })]),
        el('div', { cls: 'tile' }, [el('h3', { text: 'Pay only this MoMo number' }), el('p', { cls: 'big', text: f.momo || 'Missing' }),
          el('p', { cls: 'hint', text: 'The registered name must match ' + (f.guardian || 'the guardian') + ' or ' + f.student + '.' })]),
        el('div', { cls: 'tile' }, [el('h3', { text: 'Confirm the school' }), el('p', { text: [f.school, f.region].filter(Boolean).join(', ') })])
      ]));

      // Call attempts so far.
      root.appendChild(el('h3', { text: 'Call log', style: 'margin-top:20px' }));
      root.appendChild(el('pre', { cls: 'calllog', text: f.callLog || 'No calls logged yet.' }));
      var status = statusLine();
      var quick = el('div', { cls: 'quick' }, ['No answer', 'Asked to call back', 'Spoke with guardian'].map(function (t) {
        return el('button', { cls: 'ghost', type: 'button', text: 'Log: ' + t, on: { click: function () { save(t); } } });
      }));
      root.appendChild(quick);

      // Call record form.
      var form = el('form', { cls: 'form wide', novalidate: true }, [
        field('MoMo registered name (exactly as they say it)', el('input', { id: 'momoName', type: 'text', maxlength: 120, value: f.momoName })),
        field('MoMo result', select('momoResult', CHOICE.momoResult, f.momoResult), 'Match pays. Check or No match goes to the Program Director first.'),
        field('Expected impact (in the guardian\'s words)', el('textarea', { id: 'expectedImpact', rows: 3, maxlength: 1000 }, [f.expectedImpact])),
        field('Announcement choice', select('announcement', CHOICE.announcement, f.announcement), 'If they are unsure, choose First name only.'),
        field('Testimonial', select('testimonial', CHOICE.testimonial, f.testimonial)),
        field('Confirmation contact (phone for SMS, or email)', el('input', { id: 'confirmContact', type: 'text', maxlength: 120, value: f.confirmContact })),
        field('Outcome', select('outcome', CHOICE.outcome, f.outcome)),
        field('Notes for the Program Director', el('textarea', { id: 'notes', rows: 2, maxlength: 1000 }, [f.notes])),
        status,
        el('div', {}, [el('button', { type: 'submit', text: 'Save call record' })])
      ]);
      form.addEventListener('submit', function (ev) { ev.preventDefault(); save(''); });
      root.appendChild(form);

      /** Saves the form; attempt (optional) adds a timestamped call log line. */
      function save(attempt) {
        var body = Object.assign({ id: f.id, attempt: attempt }, creds);
        ['momoName', 'momoResult', 'expectedImpact', 'announcement', 'testimonial', 'confirmContact', 'outcome', 'notes'].forEach(function (k) {
          body[k] = form.querySelector('#' + k).value;
        });
        status.set('Saving…', 'good');
        AFK.api('callerSave', body).then(function (res) {
          if (!res.ok) return status.set(res.error);
          var i = families.indexOf(f);
          families[i] = res.family;
          if (attempt) { showFamily(res.family); return; }
          showList('Saved the call record for ' + res.family.student + '.');
        });
      }
    }

    load();
  }

  // ===========================================================================
  // Program Director: ranking, decisions and call progress
  // ===========================================================================

  function directorTool(root, creds) {
    function load(flash) {
      clear(root);
      root.appendChild(el('p', { cls: 'hint', text: 'Loading the board…' }));
      AFK.api('directorBoard', creds).then(function (res) {
        clear(root);
        if (!res.ok) return root.appendChild(el('p', { cls: 'msg err', text: res.error }));
        render(res, flash);
      });
    }

    function render(b, flash) {
      var selected = b.applicants.filter(function (a) { return a.decision === 'Selected'; }).length;

      root.appendChild(el('div', { cls: 'between' }, [
        el('h2', { text: 'Selection board' }),
        el('button', { cls: 'ghost', type: 'button', text: 'Refresh', on: { click: function () { load(); } } })
      ]));
      if (flash) root.appendChild(el('p', { cls: 'msg good', text: flash }));
      root.appendChild(el('div', { cls: 'tiles' }, [
        el('div', { cls: 'tile date' }, [el('div', { cls: 'd', text: selected + ' of ' + b.cohortSize }), el('div', { cls: 'w', text: 'Students selected' })]),
        el('div', { cls: 'tile date' }, [el('div', { cls: 'd', text: String(b.applicants.length) }), el('div', { cls: 'w', text: 'Applications on the Panel Sheet' })]),
        el('div', { cls: 'tile date' }, [el('div', { cls: 'd', text: String(b.panelists) }), el('div', { cls: 'w', text: 'Active panelists' })])
      ]));

      // Ranking table with a decision dropdown per row.
      var status = statusLine();
      var rows = b.applicants.map(function (a, i) {
        var sel = select('d-' + a.id, ['', 'Selected', 'Reserve', 'Not selected'], a.decision);
        sel.setAttribute('aria-label', 'Decision for ' + a.id);
        sel.addEventListener('change', function () {
          status.set('Saving ' + a.id + '…', 'good');
          AFK.api('directorDecide', Object.assign({ id: a.id, decision: sel.value }, creds)).then(function (res) {
            if (!res.ok) { sel.value = a.decision; return status.set(res.error); }
            load(a.id + ' is now ' + (res.decision || 'undecided') + '.');
          });
        });
        var gapFlag = a.gap !== null && a.gap > 15;
        return el('tr', {}, [
          el('td', { text: a.avgTotal === null ? '–' : String(i + 1) }),
          el('td', {}, [el('b', { text: a.id }), a.ready ? null : chip('Not ready', 'warn')]),
          el('td', { text: a.reviews + ' of ' + b.panelists }),
          el('td', { text: a.avgTotal === null ? '–' : String(a.avgTotal) }),
          el('td', {}, [a.gap === null ? '–' : (gapFlag ? chip(a.gap + ' (discuss)', 'warn') : String(a.gap))]),
          el('td', { text: a.aggregate ? String(a.aggregate) : '–' }),
          el('td', {}, [sel])
        ]);
      });
      root.appendChild(el('p', { cls: 'sub', text: 'Ranked by average total, then need, then pay it forward, then the better aggregate. A gap over 15 points means the panelists should talk it through first.' }));
      root.appendChild(el('div', { cls: 'tw' }, [el('table', {}, [
        el('thead', {}, [el('tr', {}, ['Rank', 'Applicant', 'Reviews', 'Average', 'Gap', 'Aggregate', 'Decision'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, rows)
      ])]));
      root.appendChild(status);

      // Call progress.
      root.appendChild(el('h2', { text: 'Calls and payment checks', style: 'margin-top:32px' }));
      var calls = b.calls.filter(function (c) { return c.decision === 'Selected'; });
      if (!calls.length) {
        root.appendChild(el('div', { cls: 'soon', text: 'Selected families appear here once the Desk has added them to the Winner Call Sheet.' }));
        return;
      }
      root.appendChild(el('p', { cls: 'sub', text: 'Pay only rows with MoMo result Match and outcome Confirmed. Decide every Check or No match yourself first.' }));
      root.appendChild(el('div', { cls: 'tw' }, [el('table', {}, [
        el('thead', {}, [el('tr', {}, ['Student', 'Outcome', 'MoMo', 'Announcement', 'Caller', 'Last update by'].map(function (h) { return el('th', { text: h }); }))]),
        el('tbody', {}, calls.map(function (c) {
          var momo = c.momoResult === 'Match' ? chip('Match', 'ok') : c.momoResult ? chip(c.momoResult, 'warn') : chip('Not checked', 'plain');
          var out = c.outcome === 'Confirmed' ? chip('Confirmed', 'ok') : chip(c.outcome || 'Not called', c.outcome ? 'warn' : 'plain');
          return el('tr', {}, [el('td', { text: c.student }), el('td', {}, [out]), el('td', {}, [momo]),
            el('td', { text: c.announcement || '–' }), el('td', { text: c.caller || 'Any caller' }), el('td', { text: c.updatedBy || '–' })]);
        }))
      ])]));
    }

    load();
  }

  window.AFK_TOOLS = { panel: panelTool, callers: callersTool, director: directorTool };
})();
