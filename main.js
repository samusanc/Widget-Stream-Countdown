// ─── Store key — must be unique per overlay ───────────────
// Matches the storeName field. Fallback used in editor.
var STORE_KEY = 'stream_timer_v1';

// ─── Defaults (editor preview fallback) ──────────────────
var DEFAULTS = {
  segments: [
    { name: 'Just chat', minutes: 1,   color: '#5eead4' },
    { name: 'AI',        minutes: 1,   color: '#818cf8' },
    { name: 'Japanese',  minutes: 1,   color: '#fb923c' }
  ],
  startOffsetMs: 0   // how many ms already elapsed when timer starts
};

// ─── Runtime state ───────────────────────────────────────
var config   = null;   // { segments[], startOffsetMs }
var totalMs  = 0;
var elapsed  = 0;      // ms elapsed from widget start point
var startTs  = null;
var ticker   = null;
var seLoaded = false;
var fd       = null;   // raw fieldData reference

// ─── Helpers ─────────────────────────────────────────────
function calcTotal(segs) {
  return segs.reduce(function(s, seg) {
    return s + seg.minutes * 60000;
  }, 0);
}

function activeSegIndex(ms) {
  var acc = 0;
  for (var i = 0; i < config.segments.length; i++) {
    acc += config.segments[i].minutes * 60000;
    if (ms < acc) return i;
  }
  return config.segments.length - 1;
}

function segsFromFields(f) {
  var segs = [], i = 1;
  while (f['seg' + i + 'Name'] !== undefined) {
    var mins = parseFloat(f['seg' + i + 'Minutes']);
    segs.push({
      name:    String(f['seg' + i + 'Name']),
      minutes: isNaN(mins) || mins <= 0 ? 1 : mins,
      color:   f['seg' + i + 'Color'] || '#ffffff'
    });
    i++;
  }
  return segs.length ? segs : null;
}

// Convert fields startHours/startMins/startSecs into ms offset
function offsetFromFields(f) {
  var h = parseFloat(f.startHours) || 0;
  var m = parseFloat(f.startMins)  || 0;
  var s = parseFloat(f.startSecs)  || 0;
  return Math.max(0, (h * 3600 + m * 60 + s) * 1000);
}

// ─── Build DOM once ───────────────────────────────────────
function buildBar() {
  var barOuter = document.getElementById('barOuter');
  var segNames = document.getElementById('segNames');
  barOuter.innerHTML = '';
  segNames.innerHTML = '';

  config.segments.forEach(function(seg, i) {
    var pct = (seg.minutes * 60000 / totalMs * 100).toFixed(3) + '%';

    var lbl = document.createElement('div');
    lbl.className   = 'seg-name-item state-upcoming';
    lbl.id          = 'lbl-' + i;
    lbl.textContent = seg.name;
    lbl.style.width = pct;
    lbl.style.color = seg.color;
    segNames.appendChild(lbl);

    var slot = document.createElement('div');
    slot.className   = 'bar-seg state-upcoming';
    slot.id          = 'slot-' + i;
    slot.style.width = pct;

    var track = document.createElement('div');
    track.className             = 'bar-track';
    track.style.backgroundColor = seg.color;
    slot.appendChild(track);

    var fill = document.createElement('div');
    fill.className             = 'bar-fill';
    fill.id                    = 'fill-' + i;
    fill.style.backgroundColor = seg.color;
    slot.appendChild(fill);

    var shimmer = document.createElement('div');
    shimmer.className = 'bar-shimmer';
    slot.appendChild(shimmer);

    barOuter.appendChild(slot);
  });
}

// ─── Render frame ─────────────────────────────────────────
function render() {
  var clamped   = Math.min(elapsed, totalMs);
  var activeIdx = activeSegIndex(Math.min(clamped, totalMs - 1));
  var acc       = 0;

  config.segments.forEach(function(seg, i) {
    var segStart = acc;
    var segEnd   = acc + seg.minutes * 60000;
    acc          = segEnd;

    var slot = document.getElementById('slot-' + i);
    var fill = document.getElementById('fill-' + i);
    var lbl  = document.getElementById('lbl-' + i);

    if (clamped >= segEnd) {
      slot.className   = 'bar-seg state-done';
      lbl.className    = 'seg-name-item state-done';
      fill.style.width = '100%';
    } else if (i === activeIdx) {
      var localPct = ((clamped - segStart) / (seg.minutes * 60000) * 100).toFixed(3) + '%';
      slot.className   = 'bar-seg state-active';
      lbl.className    = 'seg-name-item state-active';
      fill.style.width = localPct;
    } else {
      slot.className   = 'bar-seg state-upcoming';
      lbl.className    = 'seg-name-item state-upcoming';
      fill.style.width = '0%';
    }
  });
}

// ─── Persist elapsed to SE store every 5s ─────────────────
var persistCounter = 0;
function maybePersist() {
  persistCounter++;
  if (persistCounter >= 20) {   // 20 * 250ms = 5s
    persistCounter = 0;
    try {
      SE_API.store.set(STORE_KEY, { elapsed: elapsed });
    } catch(e) {}
  }
}

// ─── Timer ───────────────────────────────────────────────
function startTimer() {
  if (ticker) clearInterval(ticker);
  startTs = Date.now() - elapsed;
  ticker  = setInterval(function() {
    elapsed = Date.now() - startTs;
    if (elapsed >= totalMs) {
      elapsed = totalMs;
      render();
      maybePersist();
      clearInterval(ticker);
      ticker = null;
    } else {
      render();
      maybePersist();
    }
  }, 100);
}

// Reset: write fresh offset to store, then restart
function resetTimer() {
  if (ticker) clearInterval(ticker);
  ticker  = null;

  // Use startOffset from fields (the custom start point)
  var offset = fd ? offsetFromFields(fd) : 0;
  elapsed = offset;

  try {
    SE_API.store.set(STORE_KEY, { elapsed: elapsed });
  } catch(e) {}

  render();
  startTimer();
}

// ─── Init ─────────────────────────────────────────────────
function init(segs, offset, storedElapsed) {
  config  = { segments: segs };
  totalMs = calcTotal(segs);

  // If we have a stored value use it, otherwise use the offset
  elapsed = (storedElapsed !== null && storedElapsed !== undefined)
    ? storedElapsed
    : offset;

  buildBar();
  render();
  startTimer();
}

// ─── StreamElements events ─────────────────────────────────

window.addEventListener('onWidgetLoad', function(obj) {
  seLoaded = true;
  fd       = obj.detail.fieldData;

  var storeName = fd.storeName || STORE_KEY;
  STORE_KEY     = storeName || STORE_KEY;

  var segs   = segsFromFields(fd) || DEFAULTS.segments;
  var offset = offsetFromFields(fd);

  // Try to load persisted elapsed from store
  try {
    SE_API.store.get(STORE_KEY).then(function(stored) {
      var storedElapsed = (stored && typeof stored.elapsed === 'number')
        ? stored.elapsed
        : null;

      // If startTimer field is "no" (reset mode), ignore store and use offset
      if (fd.startTimer === 'no') {
        storedElapsed = offset;
        SE_API.store.set(STORE_KEY, { elapsed: storedElapsed });
      }

      init(segs, offset, storedElapsed);
    });
  } catch(e) {
    // SE_API not available (editor preview), just use offset
    init(segs, offset, null);
  }
});

window.addEventListener('onEventReceived', function(obj) {
  if (!obj.detail || !obj.detail.event) return;

  var listener = obj.detail.listener;
  var data     = obj.detail.event;

  // Reset button — per SE docs: listener === 'widget-button'
  if (listener === 'widget-button' && data.field === 'resetBtn') {
    resetTimer();
    return;
  }
});

window.addEventListener('onFieldChange', function(obj) {
  if (!obj.detail) return;
  var name = obj.detail.fieldName;
  fd       = obj.detail.fieldData || fd;

  if (name === 'resetBtn') {
    resetTimer();
    return;
  }

  if (!config || !fd) return;
  var segs = segsFromFields(fd) || config.segments;
  var offset = offsetFromFields(fd);
  init(segs, offset, null);
});

// ─── Editor preview fallback ──────────────────────────────
setTimeout(function() {
  if (!seLoaded) {
    fd = {};
    init(DEFAULTS.segments, 0, null);
  }
}, 500);
