  function pgVolumeHTML(svc) {
    var vol = (svc.volume && String(svc.volume).trim()) || 'infra_firewifi_pgdata';
    var sizeRaw = (svc.volume_size && String(svc.volume_size).trim()) || (svc.volume_bytes ? fmtBytes(svc.volume_bytes) : '');
    var size = sizeRaw || '—';
    var img = (svc.engine_image && String(svc.engine_image).trim()) || 'postgres:16-alpine';
    var host = '127.0.0.1:5432';
    return ''
      +'<div class="pg-meta">'
        +'<div class="pg-meta-row"><span class="k">Volume</span><span class="v mono">'+esc(vol)+'</span></div>'
        +'<div class="pg-meta-row"><span class="k">Size</span><span class="v">'+esc(size)+' · shared engine</span></div>'
        +'<div class="pg-meta-row"><span class="k">Image</span><span class="v mono">'+esc(img)+'</span></div>'
        +'<div class="pg-meta-row"><span class="k">Host</span><span class="v mono">'+esc(host)+'</span></div>'
      +'</div>';
  }
