  function services(s) {
    var gh = github || {};
    if (navView === 'settings') return settingsWorkspaceView(s);
    if (navView === 'activity') return activityMainView();
    if (navView !== 'projects') return '';
    if (manageTab === 'network') manageTab = 'services';
    return projectsWorkspaceView(s, gh);
  }

  function groupTileHTML(g, isActive) {
    var disk = g.disk_bytes ? fmtBytes(g.disk_bytes) : '';
    var count = g.service_count != null ? g.service_count : 0;
    var bits = [];
    if (count) bits.push(count + (count === 1 ? ' service' : ' services'));
    if (disk) bits.push(disk);
    return ''
      +'<button type="button" class="group-tile'+(isActive ? ' active' : '')+'" data-action="group:open:'+esc(g.slug)+'">'
        +'<div class="group-tile-main">'
          +'<div class="group-tile-title">'+esc(g.name || g.slug)+'</div>'
          +'<div class="group-tile-sub"><span class="mono">'+esc(g.slug)+'</span>'
            +(bits.length ? (' · ' + esc(bits.join(' · '))) : '')
          +'</div>'
        +'</div>'
        +'<span class="group-tile-chev" aria-hidden="true"></span>'
      +'</button>';
  }

  function groupsSidebarHTML() {
    var n = (groups || []).length;
    var cards = (groups || []).map(function(g){ return groupTileHTML(g, activeGroup === g.slug); }).join('');
    var empty = ''
      +'<div class="ws-empty ws-empty-compact">'
        +'<strong>No groups yet</strong>'
        +'<p>Create a group to deploy databases and Go apps.</p>'
        +'<button type="button" class="btn primary btn-compact" data-action="wizard:group">New group</button>'
      +'</div>';
    return ''
      +'<div class="ws-col ws-col-groups">'
        +'<div class="ws-section-head">'
          +'<div class="ws-section-title"><h3>Groups</h3><span class="gd-count">'+String(n)+'</span></div>'
        +'</div>'
        +'<div class="group-tile-list group-tile-list-col">'+(n ? cards : empty)+'</div>'
      +'</div>';
  }

  function projectsWelcomePane() {
    return ''
      +'<div class="ws-col ws-col-main projects-welcome">'
        +'<div class="projects-welcome-inner">'
          +'<div class="projects-welcome-icon" aria-hidden="true">'+ico('app')+'</div>'
          +'<h3>Select a group</h3>'
          +'<p class="ghost">Choose a project from the list or create a new group to deploy services.</p>'
          +'<button type="button" class="btn primary" data-action="wizard:group">New group</button>'
        +'</div>'
      +'</div>';
  }

  function projectsWorkspaceView(s, gh) {
    var mainPane = activeGroup ? groupDetailPane(s, gh) : projectsWelcomePane();
    return ''
      +'<div class="nav-page" data-view="projects">'
        +'<div class="rack">'
          +'<section class="panel panel-svc panel-manage panel-workspace panel-projects-crm">'
            +'<header class="ws-head">'
              +'<div class="ws-head-main">'
                +'<div class="ws-title-block"><h2>Projects</h2><p class="ghost">Groups &amp; services</p></div>'
              +'</div>'
              +'<div class="ws-head-actions">'
                +'<button type="button" class="btn primary btn-compact" data-action="wizard:group">New group</button>'
              +'</div>'
            +'</header>'
            +'<div class="ws-body projects-split">'
              + groupsSidebarHTML()
              + mainPane
            +'</div>'
          +'</section>'
        +'</div>'
      +'</div>';
  }

  function groupDetailPane(s, gh) {
    var g = (groups || []).filter(function(x){ return x.slug === activeGroup; })[0] || { slug: activeGroup, name: activeGroup };
    var list = deployed || [];
    var dbs = list.filter(function(x){ return x.type === 'postgres'; });
    var apps = list.filter(function(x){ return x.type !== 'postgres'; });
    var dbCards = dbs.map(function(svc){ return serviceCard(svc, dbs); }).join('');
    var appCards = apps.map(function(svc){ return serviceCard(svc, dbs); }).join('');
    var draftName = (groupDraft && groupDraft.name != null) ? groupDraft.name : (g.name || g.slug);
    var savedName = g.name || g.slug;
    var nameDirty = String(draftName).trim() !== String(savedName).trim();
    var empty = navLoading
      ? ('<div class="gd-empty gd-empty-loading"><div class="nav-spinner" aria-hidden="true"></div><p>Loading…</p></div>')
      : (''
        +'<div class="gd-empty">'
          +'<div class="gd-empty-ill" aria-hidden="true">'+ico('plus')+'</div>'
          +'<strong>Nothing here yet</strong>'
          +'<p>Add a database first, then an app — link them so the app gets <code>DB_*</code> automatically.</p>'
          +'<button type="button" class="btn primary" data-action="wizard:open">'+ico('plus')+' Add service</button>'
        +'</div>');
    function lane(opts) {
      return ''
        +'<div class="svc-lane kind-'+opts.kind+'">'
          +'<div class="svc-lane-head">'
            +'<div class="svc-lane-title">'+ico(opts.ico)+'<h3>'+esc(opts.title)+'</h3><span class="gd-count">'+opts.count+'</span></div>'
            +(opts.action || '')
          +'</div>'
          +'<div class="svc-grid-canvas"><div class="svc-list svc-grid'+(navLoading?' is-loading':'')+'">'+(opts.body || '')+'</div></div>'
        +'</div>';
    }
    var canvasInner;
    if (!list.length) {
      canvasInner = empty;
    } else {
      canvasInner = ''
        +(dbs.length || true
          ? lane({ kind: 'db', ico: 'db', title: 'Databases', count: dbs.length,
              body: dbCards || '<div class="svc-lane-empty">No database — add one to store app data.</div>',
              action: '<button type="button" class="rw-add-btn" data-action="wizard:type:postgres">'+ico('plus')+' Database</button>' })
          : '')
        +lane({ kind: 'app', ico: 'app', title: 'Apps', count: apps.length,
            body: appCards || '<div class="svc-lane-empty">No app yet — deploy a Go service and link a database.</div>',
            action: '<button type="button" class="rw-add-btn rw-add-primary" data-action="wizard:type:go">'+ico('plus')+' App</button>' });
    }
    var body = ''
      +'<div class="rw-canvas'+(settingsSlug?' drawer-open':'')+'" data-canvas="1">'
        +'<svg class="rw-links" aria-hidden="true"><g class="rw-links-g"></g></svg>'
        +canvasInner
      +'</div>';
    return ''
      +'<div class="ws-col ws-col-main panel-group-detail">'
        +'<header class="gd-head">'
          +'<button type="button" class="btn btn-quiet btn-back btn-icon" data-action="group:back" title="Back to groups" aria-label="Back">'+ico('back')+'</button>'
          +'<div class="gd-identity">'
            +'<label class="gd-label" for="group-name">Group</label>'
            +'<div class="gd-name-row">'
              +uiInput({ name: 'group-name', id: 'group-name', value: draftName, placeholder: 'Name this group', className: 'gd-name-input' })
              +'<button type="button" class="btn primary btn-compact gd-save'+(nameDirty?' is-dirty':'')+(busy['group:save']?' loading':'')+'" data-action="group:save" data-baseline="'+esc(savedName)+'" '+(busy['group:save'] || !nameDirty?'disabled':'')+' title="Save name"><span class="spinner"></span><span>Save</span></button>'
            +'</div>'
            +'<div class="gd-meta"><span class="mono">'+esc(g.slug)+'</span></div>'
          +'</div>'
          +'<div class="gd-head-actions">'
            +'<button type="button" class="btn btn-quiet danger-soft btn-compact" data-action="group:delete:'+esc(g.slug)+'" title="Delete group">'+ico('trash')+' Delete</button>'
          +'</div>'
        +'</header>'
        +'<div class="gd-body rw-canvas-wrap">'
          + body
        +'</div>'
      +'</div>';
  }

