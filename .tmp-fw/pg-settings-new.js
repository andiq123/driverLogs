    if (isPg) {
      return ''
        +'<div class="settings settings-drawer settings-pg">'
          +pgVolumeHTML(svc)
          +pgEnvBoardHTML(svc, envVal)
          +pgSQLHTML(svc)
          +'<section class="drawer-section drawer-section-card drawer-section-compact" aria-labelledby="pg-name-'+esc(svc.slug)+'">'
            +'<header class="drawer-section-head">'
              +'<h3 id="pg-name-'+esc(svc.slug)+'" class="drawer-section-title">Display name</h3>'
            +'</header>'
            +uiField({
              label: 'Display name',
              meta: 'label',
              control: uiInput({ name: 'name', value: nameVal })
            })
          +'</section>'
          +uiFooter({
            left: '<span class="ghost">Delete drops this database · volume kept</span>',
            right: '<button type="button" class="btn danger" data-action="svc:delete:'+esc(svc.slug)+'">Delete</button>'
              +'<button type="button" class="btn primary" data-action="svc:save:'+svc.slug+'">Save</button>'
          })
        +'</div>';
    }
