  function closeSettingsDrawer(opts) {
    if (!settingsSlug) return;
    var prev = settingsSlug;
    settingsSlug = null;
    Object.keys(folds).forEach(function(k){ if (k.indexOf(prev+':')===0) delete folds[k]; });
    renderDrawerPortal();
    renderServices(opts || { animate: true });
    syncRouteFromState();
  }
