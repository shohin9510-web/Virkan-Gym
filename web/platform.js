/* Thin adapter. All training logic is in app.js. No remote scripts. */
(function () {
  'use strict';
  const bridge = window.VirkanNative;
  const isAndroid = !!bridge && typeof bridge.saveBackup === 'function';
  window.VirkanPlatform = Object.freeze({
    isAndroid,
    saveBackup(text, filename) {
      if (!isAndroid) throw new Error('Android export is not available');
      bridge.saveBackup(String(text), String(filename));
    }
  });
  if (isAndroid) document.documentElement.classList.add('native-app');
})();
