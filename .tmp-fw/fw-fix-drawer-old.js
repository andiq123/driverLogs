  function setDrawerScrollLock(lock) {
    var html = document.documentElement;
    if (lock) {
  function closeSettingsDrawer(opts) {
    if (!settingsSlug) return;
    var prev = settingsSlug;
    settingsSlug = null;
    Object.keys(folds).forEach(function(k){ if (k.indexOf(prev+':')===0) delete folds[k]; });
    renderDrawerPortal();
    renderServices(opts || { animate: true });
    syncRouteFromState();
  }
    html.classList.remove('drawer-open');
    html.style.removeProperty('--drawer-lock-y');
    delete html.dataset.drawerLockY;
    window.scrollTo(0, restore);
  }
