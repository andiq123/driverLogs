  function pgEnvBoardHTML(svc, envText) {
    var map = dbEnvMapForService(svc, envText);
    var reveal = !!envReveal[svc.slug];
    var rows = DB_ENV_KEYS.map(function(k){
      var val = map[k] || '';
      if (!val && k !== 'DATABASE_URL') return '';
      var shown = reveal ? val : maskEnvValue(val);
      return ''
        +'<div class="env-row" role="row">'
          +'<div class="env-key" role="cell">'+esc(k)+'</div>'
          +'<div class="env-val'+(reveal?'':' masked')+'" role="cell" title="'+(reveal?esc(val):'')+'">'+esc(shown || '—')+'</div>'
          +'<div class="env-actions" data-stop="1" role="cell">'
            +'<button type="button" class="btn btn-quiet btn-compact btn-icon env-copy" data-action="copy:env-key:'+esc(svc.slug)+':'+esc(k)+'" aria-label="Copy '+esc(k)+'" title="Copy" '+(val?'':'disabled')+'>'+ico('copy')+'</button>'
          +'</div>'
        +'</div>';
    }).join('');
    if (!rows.trim()) {
      rows = '<div class="empty dock-empty compact"><p>Connection vars appear after the database is ready</p></div>';
    }
    return ''
      +'<section class="drawer-section drawer-section-card env-board" aria-labelledby="pg-env-'+esc(svc.slug)+'">'
        +'<header class="env-board-head drawer-section-head">'
          +'<div class="drawer-section-head-main">'
            +'<h3 id="pg-env-'+esc(svc.slug)+'" class="drawer-section-title">Environment</h3>'
            +'<span class="ghost drawer-section-sub">For Go apps · os.Getenv / JSON</span>'
          +'</div>'
          +'<div class="env-board-tools" data-stop="1">'
            +'<button type="button" class="btn btn-quiet btn-compact drawer-tool-btn" data-action="envreveal:'+esc(svc.slug)+'">'+(reveal?'Hide':'Show')+'</button>'
            +'<button type="button" class="btn btn-quiet btn-compact drawer-tool-btn" data-action="copy:env-json:'+esc(svc.slug)+'">JSON</button>'
            +'<button type="button" class="btn btn-quiet btn-compact drawer-tool-btn" data-action="copy:env-dotenv:'+esc(svc.slug)+'">KEY=value</button>'
          +'</div>'
        +'</header>'
        +'<div class="env-table" role="table" aria-label="Environment variables">'
          +'<div class="env-row env-head" role="row"><div role="columnheader">Key</div><div role="columnheader">Value</div><div role="columnheader"><span class="sr-only">Actions</span></div></div>'
          +rows
        +'</div>'
        +uiHint('Linked Go apps receive these automatically. Copy JSON for local config.')
      +'</section>';
  }
