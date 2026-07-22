  function pgEnvBoardHTML(svc, envText) {
    var map = dbEnvMapForService(svc, envText);
    var reveal = !!envReveal[svc.slug];
    var rows = DB_ENV_KEYS.map(function(k){
      var val = map[k] || '';
      if (!val && k !== 'DATABASE_URL') return '';
      var shown = reveal ? val : maskEnvValue(val);
      return ''
        +'<div class="env-row">'
          +'<div class="env-key">'+esc(k)+'</div>'
          +'<div class="env-val'+(reveal?'':' masked')+'" title="'+(reveal?esc(val):'')+'">'+esc(shown || '—')+'</div>'
          +'<div class="env-actions" data-stop="1">'
            +'<button type="button" class="btn btn-quiet btn-compact" data-action="copy:env-key:'+esc(svc.slug)+':'+esc(k)+'" '+(val?'':'disabled')+'>Copy</button>'
          +'</div>'
        +'</div>';
    }).join('');
    if (!rows.trim()) {
      rows = '<div class="empty dock-empty compact"><p>Connection vars appear after the database is ready</p></div>';
    }
    return ''
      +'<div class="env-board">'
        +'<div class="env-board-head">'
          +'<div>'
            +'<strong>Environment variables</strong>'
            +'<span class="ghost">For Go apps · os.Getenv / JSON</span>'
          +'</div>'
          +'<div class="env-board-tools" data-stop="1">'
            +'<button type="button" class="btn btn-quiet btn-compact" data-action="envreveal:'+esc(svc.slug)+'">'+(reveal?'Hide':'Show')+'</button>'
            +'<button type="button" class="btn btn-quiet btn-compact" data-action="copy:env-json:'+esc(svc.slug)+'">JSON</button>'
            +'<button type="button" class="btn btn-quiet btn-compact" data-action="copy:env-dotenv:'+esc(svc.slug)+'">KEY=value</button>'
          +'</div>'
        +'</div>'
        +'<div class="env-table">'
          +'<div class="env-row env-head"><div>Key</div><div>Value</div><div></div></div>'
          +rows
        +'</div>'
        +uiHint('Linked Go apps receive these automatically. Copy JSON for local config.')
      +'</div>';
  }
