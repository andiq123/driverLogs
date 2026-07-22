  function pgSQLHTML(svc) {
    var draft = sqlDraft[svc.slug] != null ? sqlDraft[svc.slug] : 'SELECT now();\n';
    var res = sqlResult[svc.slug];
    var busyQ = !!busy[sqlBusyKey(svc.slug)];
    var engineDown = !svc.running;
    return ''
      +'<div class="sql-box'+(busyQ?' is-running':'')+'" id="sql-box-'+esc(svc.slug)+'" data-sql-slug="'+esc(svc.slug)+'">'
        +'<div class="sql-head">'
          +'<strong>Query</strong>'
          +'<span class="ghost">psql · '+esc(svc.database || svc.slug)+'</span>'
        +'</div>'
        +'<textarea class="sql-input" id="sql-'+esc(svc.slug)+'" spellcheck="false" placeholder="SELECT * FROM …">'+esc(draft)+'</textarea>'
        +'<div class="sql-actions" data-stop="1">'
          +'<button type="button" class="btn primary btn-compact'+(busyQ?' loading':'')+'" data-action="sql:run:'+esc(svc.slug)+'" data-engine-down="'+(engineDown?'1':'0')+'" '+(busyQ||engineDown?'disabled':'')+(busyQ?' hidden':'')+'>'
            +'<span class="spinner"></span><span>Run</span></button>'
          +'<button type="button" class="btn btn-quiet btn-compact" data-action="sql:cancel:'+esc(svc.slug)+'"'+(busyQ?'':' hidden')+'>Cancel</button>'
          +'<div class="sql-presets">'
            +'<button type="button" class="btn btn-quiet btn-compact" data-action="sql:preset:'+esc(svc.slug)+':now"'+(busyQ?' disabled':'')+'>Now</button>'
            +'<button type="button" class="btn btn-quiet btn-compact" data-action="sql:preset:'+esc(svc.slug)+':tables"'+(busyQ?' disabled':'')+'>Tables</button>'
            +'<button type="button" class="btn btn-quiet btn-compact" data-action="sql:preset:'+esc(svc.slug)+':size"'+(busyQ?' disabled':'')+'>Size</button>'
            +'<button type="button" class="btn btn-quiet btn-compact" data-action="sql:preset:'+esc(svc.slug)+':activity"'+(busyQ?' disabled':'')+'>Activity</button>'
            +'<button type="button" class="btn btn-quiet btn-compact" data-action="sql:preset:'+esc(svc.slug)+':indexes"'+(busyQ?' disabled':'')+'>Indexes</button>'
            +'<button type="button" class="btn btn-quiet btn-compact" data-action="sql:preset:'+esc(svc.slug)+':clear"'+(busyQ?' disabled':'')+'>Clear</button>'
          +'</div>'
          +(engineDown ? '<span class="ghost">Start engine to query</span>' : '')
        +'</div>'
        +'<div class="sql-out" id="sql-out-'+esc(svc.slug)+'">'+sqlOutHTML(res)+'</div>'
      +'</div>';
  }
