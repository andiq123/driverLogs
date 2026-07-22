  function pgVolumeHTML(svc) {
    var vol = (svc.volume && String(svc.volume).trim()) || 'infra_firewifi_pgdata';
    var sizeRaw = (svc.volume_size && String(svc.volume_size).trim()) || (svc.volume_bytes ? fmtBytes(svc.volume_bytes) : '');
    var size = sizeRaw || '—';
    var img = (svc.engine_image && String(svc.engine_image).trim()) || 'postgres:16-alpine';
    var host = '127.0.0.1:5432';
    return ''
      +'<section class="drawer-section drawer-section-card" aria-labelledby="pg-overview-'+esc(svc.slug)+'">'
        +'<header class="drawer-section-head">'
          +'<h3 id="pg-overview-'+esc(svc.slug)+'" class="drawer-section-title">Overview</h3>'
          +'<span class="drawer-section-meta ghost">Runtime</span>'
        +'</header>'
        +'<dl class="pg-meta pg-meta-grid">'
          +'<div class="pg-meta-row"><dt class="k">Volume</dt><dd class="v mono">'+esc(vol)+'</dd></div>'
          +'<div class="pg-meta-row"><dt class="k">Size</dt><dd class="v">'+esc(size)+' · shared engine</dd></div>'
          +'<div class="pg-meta-row"><dt class="k">Image</dt><dd class="v mono">'+esc(img)+'</dd></div>'
          +'<div class="pg-meta-row"><dt class="k">Host</dt><dd class="v mono">'+esc(host)+'</dd></div>'
        +'</dl>'
      +'</section>';
  }
