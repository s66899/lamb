// 🐏的教务 - 公共工具库（优化版）

var _cache = {};
var _cacheExpiry = {};

var Common = {
  // 简单的防抖
  debounce: function(fn, wait) {
    var timer = null;
    return function() {
      var ctx = this, args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function() { fn.apply(ctx, args); }, wait);
    };
  },

  // 带缓存的 fetch 封装
  apiFetch: function(url, options) {
    options = options || {};
    // 非 GET 请求不走缓存
    if (options.method && options.method !== 'GET') {
      Common.cacheClear();
      return fetch(url, options).then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      });
    }
    // GET 请求先查缓存（5秒短缓存，减少重复请求）
    var cached = Common.cacheGet(url);
    if (cached !== undefined) {
      return Promise.resolve(cached);
    }
    return fetch(url, options).then(function(r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function(data) {
      Common.cacheSet(url, data, 5);
      return data;
    });
  },

  // 内存缓存（带过期时间，单位秒）
  cacheSet: function(key, value, ttlSec) {
    _cache[key] = value;
    _cacheExpiry[key] = ttlSec ? Date.now() + ttlSec * 1000 : 0;
  },
  cacheGet: function(key) {
    var exp = _cacheExpiry[key];
    if (exp && Date.now() > exp) {
      delete _cache[key];
      delete _cacheExpiry[key];
      return undefined;
    }
    return _cache[key];
  },
  cacheClear: function() {
    _cache = {}; _cacheExpiry = {};
  },

  // sessionStorage 缓存 JSON
  ssSet: function(key, value) {
    try { sessionStorage.setItem('jy_' + key, JSON.stringify(value)); } catch(e) {}
  },
  ssGet: function(key) {
    try { var v = sessionStorage.getItem('jy_' + key); return v ? JSON.parse(v) : null; } catch(e) { return null; }
  },
  ssClear: function() {
    try {
      for (var i = sessionStorage.length - 1; i >= 0; i--) {
        var k = sessionStorage.key(i);
        if (k && k.indexOf('jy_') === 0) sessionStorage.removeItem(k);
      }
    } catch(e) {}
  },

  // 教练颜色 - iOS 系统色
  coachColors: {'王教练':'#FF3B30','陈教练':'#007AFF','孙教练':'#FF9500','其他':'#AF52DE'},
  getCoachColor: function(c) { return Common.coachColors[c] || Common.coachColors['其他']; },
  getCoachClass: function(c) {
    if (c === '王教练') return 'coach-wang';
    if (c === '陈教练') return 'coach-chen';
    if (c === '孙教练') return 'coach-sun';
    return '';
  },

  // HTML 转义
  esc: function(s) {
    if (s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  },

  // 格式化日期
  today: function() {
    return new Date().toISOString().slice(0, 10);
  },

  // 轻量同步检查：返回 hash 是否变化
  syncCheck: function(prevHash) {
    return Common.apiFetch('/api/sync').then(function(info) {
      return { changed: info.hash !== prevHash, hash: info.hash, info: info };
    });
  },

  // iOS 风格 HUD Toast
  showToast: function(msg, duration) {
    duration = duration || 1800;
    var containerId = 'commonToastContainer';
    var container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.style.cssText = 'position:fixed;left:0;right:0;bottom:120px;display:flex;flex-direction:column;align-items:center;gap:8px;z-index:9999;pointer-events:none;';
      document.body.appendChild(container);
    }
    var el = document.createElement('div');
    el.style.cssText = 'background:rgba(28,28,30,0.82);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);color:#fff;padding:12px 22px;border-radius:14px;font-size:15px;font-weight:500;z-index:9999;pointer-events:none;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,0.15);opacity:0;transform:translateY(16px) scale(0.96);transition:all 0.35s cubic-bezier(0.25,0.46,0.45,0.94);letter-spacing:0.3px;';
    el.textContent = msg;
    container.appendChild(el);
    // 强制回流触发动画
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) scale(1)';
      });
    });
    setTimeout(function() {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px) scale(0.96)';
      setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
    }, duration);
  }
};
