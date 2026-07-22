    if (opts.patchBody && sameSlug && !opts.forceRemount) {
      captureSettingsDrafts();
      var body = existing.querySelector('.svc-drawer-body');
      if (body) body.innerHTML = serviceSettingsHTML(svc, dbs);
      var toolbar = existing.querySelector('.svc-drawer-toolbar');
      if (toolbar) toolbar.innerHTML = drawerToolbarHTML(svc);
      applyDrawerFolds(settingsSlug);
