  function drawerToolbarHTML(svc) {
    var isPg = svc.type === 'postgres';
    var building = !isPg && (svc.status === 'building' || !!(svc.deployments || []).some(function(d){ return d.status === 'building' || d.status === 'queued'; }));
    var failed = !isPg && !building && (svc.status === 'failed' || !!svc.last_error);
    var isUp = !!svc.running && !failed && !building;
    var startStopBusy = !!(busy['svc:start:'+svc.slug] || busy['svc:stop:'+svc.slug]);
    var restartBusy = !!(busy['svc:restart:'+svc.slug]);
    var toolCls = 'drawer-tool-btn btn-compact';
    var acts = '';
    if (isPg) {
      if (isUp) {
        acts = btn('Stop', 'svc:stop:'+svc.slug, toolCls, startStopBusy)
          + btn('Restart', 'svc:restart:'+svc.slug, toolCls, restartBusy);
      } else {
        acts = btn('Start', 'svc:start:'+svc.slug, 'primary ' + toolCls, startStopBusy);
      }
    } else if (building) {
      acts = '<span class="drawer-tool-note ghost" role="status">Deploying…</span>';
    } else {
      if (isUp) {
        acts = btn('Stop', 'svc:stop:'+svc.slug, toolCls, startStopBusy);
      } else {
        acts = btn('Start', 'svc:start:'+svc.slug, 'primary ' + toolCls, startStopBusy);
      }
      acts += btn('Restart', 'svc:restart:'+svc.slug, toolCls, restartBusy || !isUp);
      acts += btn('Logs', 'svc:logs:'+svc.slug, toolCls, false);
    }
    return acts;
  }

  function pgVolumeHTML(svc) {
