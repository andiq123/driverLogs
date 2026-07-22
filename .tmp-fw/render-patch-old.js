    if (opts.patchBody && sameSlug && !opts.forceRemount) {
      captureSettingsDrafts();
      var body = existing.querySelector('.svc-drawer-body');
      if (body) body.innerHTML = serviceSettingsHTML(svc, dbs);
      applyDrawerFolds(settingsSlug);
