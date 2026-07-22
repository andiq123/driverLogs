  function setDrawerScrollLock(lock) {
    var html = document.documentElement;
    if (lock) {
      if (html.classList.contains('drawer-open')) return;
      var y = window.scrollY || window.pageYOffset || 0;
      html.dataset.drawerLockY = String(y);
      html.style.setProperty('--drawer-lock-y', '-' + y + 'px');
      html.classList.add('drawer-open');
      return;
    }
    if (!html.classList.contains('drawer-open')) return;
    var restore = parseInt(html.dataset.drawerLockY || '0', 10) || 0;
    html.classList.remove('drawer-open');
    html.style.removeProperty('--drawer-lock-y');
    delete html.dataset.drawerLockY;
    window.scrollTo(0, restore);
  }
