/*
 * Afrakoma team site: settings.
 *
 * API_URL is the Apps Script web app URL (ends in /exec).
 * Get it from Apps Script: Deploy > Manage deployments > Web app URL.
 * Until it is set, the site shows a clear "not connected yet" message
 * instead of failing silently.
 */
window.AFK_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbz4Gp4QdIC-3m6h8NgIJ0kvtUK1lNYTC0HHZdQB6FSVpAXOUEK8bH5tAAb1wBJVucwoLw/exec',

  // Role keys used everywhere (must match the Role column in the Roster tab).
  ROLES: {
    desk:     { name: 'Verification Desk', training: 'training/verification-desk.html' },
    panel:    { name: 'Selection Panel',   training: 'training/selection-panel.html' },
    callers:  { name: 'Callers',           training: 'training/callers.html' },
    director: { name: 'Program Director',  training: 'training/program-director.html' }
  }
};
