  function pgSQLHTML(svc) {
    var draft = sqlDraft[svc.slug] != null ? sqlDraft[svc.slug] : 'SELECT now();\n';
    var res = sqlResult[svc.slug];
    var busyQ = !!busy[sqlBusyKey(svc.slug)];
    var engineDown = !svc.running;
    var presets = [
      { id: 'now', label: 'Now' },
      { id: 'tables', label: 'Tables' },
      { id: 'size', label: 'Size' },
      { id: 'activity', label: 'Activity' },
      { id: 'indexes', label: 'Indexes' },
      { id: 'clear', label: 'Clear' }
    ];
    return ''
      +'<section class="drawer-section drawer-section-card sql-box'+(busyQ?' is-running':'')+'" id="sql-box-'+esc(svc.slug)+'" data-sql-slug="'+esc(svc.slug)+'" aria-labelledby="pg-query-'+esc(svc.slug)+'">'
        +'<header class="sql-head drawer-section-head">'
          +'<div class="drawer-section-head-main">'
            +'<h3 id="pg-query-'+esc(svc.slug)+'" class="drawer-section-title">Query console</h3>'
            +'<span class="ghost drawer-section-sub">psql · '+esc(svc.database || svc.slug)+'</span>'
          +'</div>'
        +'</header>'
        +'<textarea class="sql-input" id="sql-'+esc(svc.slug)+'" spellcheck="false" placeholder="SELECT * FROM …" aria-label="SQL query">'+esc(draft)+'</textarea>'
        +'<div class="sql-actions" data-stop="1">'
          +'<div class="sql-actions-primary">'
            +'<button type="button" class="btn primary drawer-tool-btn'+(busyQ?' loading':'')+'" data-action="sql:run:'+esc(svc.slug)+'" data-engine-down="'+(engineDown?'1':'0')+'" '+(busyQ||engineDown?'disabled':'')+(busyQ?' hidden':'')+'>'
              +'<span class="spinner"></span><span>Run</span></button>'
            +'<button type="button" class="btn btn-quiet drawer-tool-btn" data-action="sql:cancel:'+esc(svc.slug)+'"'+(busyQ?'':' hidden')+'>Cancel</button>'
            +(engineDown ? '<span class="ghost sql-engine-hint">Start engine to query</span>' : '')
          +'</div>'
          +'<div class="sql-presets sql-chips" role="group" aria-label="Quick queries">'
            + presets.map(function(p){
                return '<button type="button" class="sql-chip" data-action="sql:preset:'+esc(svc.slug)+':'+esc(p.id)+'"'+(busyQ?' disabled':'')+'>'+esc(p.label)+'</button>';
              }).join('')
          +'</div>'
        +'</div>'
        +'<div class="sql-out" id="sql-out-'+esc(svc.slug)+'">'+sqlOutHTML(res)+'</div>'
      +'</section>';
  }
