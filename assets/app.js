/*
 * Afrakoma team site: shared behaviour for the pledge and tasks pages.
 *
 *   AFK.api(action, payload)   POST to the Apps Script backend, returns parsed JSON
 *   AFK.session                read / save / clear the signed-in person (this tab only)
 *   AFK.role(key)              role details from config.js
 *   AFK.param(name)            read a ?query parameter from the URL
 *   AFK.show(el, text, kind)   show an error or success message in an element
 *
 * Security notes for reviewers:
 *   - The access code is kept in sessionStorage, which is cleared when the tab closes.
 *   - The backend re-checks email + code on every call; nothing here is trusted.
 *   - No applicant data is ever written into this public code.
 */
(function () {
  'use strict';

  var config = window.AFK_CONFIG || {};
  var SESSION_KEY = 'afk-team-session';

  /**
   * Calls the backend. Body is JSON sent as text/plain so the browser does not
   * send a CORS preflight, which Apps Script cannot answer.
   * Always resolves to an object with ok:true|false; network errors become ok:false.
   */
  function api(action, payload) {
    if (!config.API_URL || config.API_URL.indexOf('https://script.google.com/') !== 0) {
      return Promise.resolve({ ok: false, error: 'The team site is not connected to its data yet. Tell the Program Director.' });
    }
    var body = Object.assign({ action: action }, payload || {});
    return fetch(config.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    })
      .then(function (res) { return res.json(); })
      .catch(function () {
        return { ok: false, error: 'Could not reach the team site data. Check your connection and try again.' };
      });
  }

  /** Signed-in person for this browser tab: { email, code, name, role, pledged }. */
  var session = {
    get: function () {
      try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); }
      catch (e) { return null; }
    },
    save: function (data) {
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch (e) { /* tab will ask again */ }
    },
    clear: function () {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* nothing to clear */ }
    }
  };

  function role(key) {
    return (config.ROLES || {})[key] || null;
  }

  function param(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  /** Writes a message into el. kind: 'err' or 'good'. Empty text hides it. */
  function show(el, text, kind) {
    if (!el) return;
    el.textContent = text || '';
    el.className = 'msg ' + (kind || 'err');
    el.hidden = !text;
  }

  window.AFK = { api: api, session: session, role: role, param: param, show: show };
})();
