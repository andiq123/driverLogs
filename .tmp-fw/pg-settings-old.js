    if (isPg) {
      var pgBusy = !!(busy['svc:start:'+svc.slug] || busy['svc:stop:'+svc.slug] || busy['svc:restart:'+svc.slug]);
      var pgPower = ''
        +'<div class="pg-power" data-stop="1">'
          +(svc.running
            ? btn('Stop', 'svc:stop:'+svc.slug, 'btn-quiet btn-compact', pgBusy)
              + btn('Restart', 'svc:restart:'+svc.slug, 'btn-quiet btn-compact', pgBusy)
            : btn('Start', 'svc:start:'+svc.slug, 'primary btn-compact', pgBusy))
          +'<span class="ghost">'+(svc.running ? 'Shared engine online' : 'Shared engine offline')+'</span>'
        +'</div>';
      return ''
        +'<div class="settings settings-dense settings-flat">'
          +pgPower
          +pgVolumeHTML(svc)
          +pgEnvBoardHTML(svc, envVal)
          +pgSQLHTML(svc)
          +uiField({
            label: 'Display name',
            meta: 'label',
            control: uiInput({ name: 'name', value: nameVal })
          })
          +uiFooter({
            left: '<span class="ghost">Delete drops this database · volume kept</span>',
            right: '<button type="button" class="btn danger" data-action="svc:delete:'+esc(svc.slug)+'">Delete</button>'
              +'<button type="button" class="btn primary" data-action="svc:save:'+svc.slug+'">Save</button>'
          })
        +'</div>';
    }
