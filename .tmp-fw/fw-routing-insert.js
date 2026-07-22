
  var _routeSync = false;

  function routePath() {
    if (navView === 'overview') return '/overview';
    if (navView === 'activity') return '/activity';
    if (navView === 'settings') {
      return settingsTab === 'storage' ? '/settings/storage' : '/settings';
    }
    if (navView === 'projects') {
      if (activeGroup) {
        if (settingsSlug) {
          return '/projects/' + encodeURIComponent(activeGroup) + '/' + encodeURIComponent(settingsSlug);
        }
        return '/projects/' + encodeURIComponent(activeGroup);
      }
      return '/projects';
    }
    return '/overview';
  }

  function parseRoute(path) {
    var p = String(path || '/').replace(/\/+$/, '') || '/';
    if (p === '/' || p === '/overview') return { navView: 'overview' };
    if (p === '/activity') return { navView: 'activity' };
    if (p === '/settings') return { navView: 'settings', settingsTab: 'github' };
    if (p === '/settings/storage') return { navView: 'settings', settingsTab: 'storage' };
    if (p === '/projects') return { navView: 'projects' };
    var m = p.match(/^\/projects\/([^/]+)(?:\/([^/]+))?$/);
    if (m) {
      var out = { navView: 'projects', activeGroup: decodeURIComponent(m[1]) };
      if (m[2]) out.settingsSlug = decodeURIComponent(m[2]);
      return out;
    }
    return { navView: 'overview' };
  }

  function applyRoute(route, opts) {
    opts = opts || {};
    route = route || {};
    navView = route.navView || 'overview';
    if (route.navView === 'settings') {
      activeGroup = null;
      settingsSlug = null;
      settingsTab = route.settingsTab || 'github';
      dockerOpen = settingsTab === 'storage';
      manageTab = 'services';
    } else if (route.navView === 'projects') {
      activeGroup = route.activeGroup || null;
      settingsSlug = route.settingsSlug || null;
      if (!activeGroup) {
        deployed = [];
        navLoading = false;
      } else {
        navLoading = true;
        deployed = [];
      }
      manageTab = 'services';
      dockerOpen = false;
    } else if (navView === 'overview') {
      activeGroup = null;
      settingsSlug = null;
      manageTab = 'services';
      dockerOpen = false;
    } else if (navView === 'activity') {
      activeGroup = null;
      settingsSlug = null;
      manageTab = 'services';
      dockerOpen = false;
    }
    if (opts.render === false) return;
    if (navView === 'settings' && settingsTab === 'storage') {
      manageLoading = true;
      render(opts);
      refreshManage({ animate: true });
      return;
    }
    if (navView === 'projects') {
      render(opts);
      refreshServices({ soft: true });
      return;
    }
    render(opts);
    if (navView === 'overview') refreshConfig(true);
  }

  function syncRouteFromState(replace) {
    if (_routeSync) return;
    var path = routePath();
    var cur = location.pathname.replace(/\/+$/, '') || '/';
    var next = path.replace(/\/+$/, '') || '/';
    if (cur === next) return;
    var st = { fw: 1, path: next };
    if (replace) history.replaceState(st, '', next);
    else history.pushState(st, '', next);
  }
