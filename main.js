// ─────────────────────────────────────────────────────────
//  DEFAULTS — shown in SE editor preview and used as
//  fallback if onWidgetLoad doesn't fire.
//  Live values come from the Fields panel.
// ─────────────────────────────────────────────────────────
var DEFAULTS = {
  segments: [
    { name: 'Just chat', minutes: 1,   color: '#5eead4' },
    { name: 'AI',        minutes: 1,   color: '#818cf8' },
    { name: 'Japanese',  minutes: 1,   color: '#fb923c' }
  ],
  countDown: true
};

// ─── Runtime state ───────────────────────────────────────
var config    = null;   // { segments, countDown }
var totalMs   = 0;
var elapsed   = 0;
var startTs   = null;
var ticker    = null;
var seLoaded  = false;

// ─── Helpers ─────────────────────────────────────────────
function calcTotal(segs) {
  return segs.reduce(function(s, seg) {
    return s + seg.minutes * 60000;
  }, 0);
}

function currentSegmentIndex(ms) {
  var acc = 0;
  for (var i = 0; i < config.segments.length; i++) {
    acc += config.segments[i].minutes * 60000;
    if (ms < acc) return i;
  }
  return config.segments.length - 1;
}

function fmt(ms) {
  var secs = Math.max(0, Math.round(ms / 1000));
  var h    = Math.floor(secs / 3600);
  var m    = Math.floor((secs % 3600) / 60);
  var s    = secs % 60;
  var mm   = String(m).padStart(2, '0');
  var ss   = String(s).padStart(2, '0');
  return h > 0
    ? String(h).padStart(2, '0') + ':' + mm + ':' + ss
    : mm + ':' + ss;
}

// ─── Build the bar DOM (once per init) ───────────────────
function buildBar() {
  var barOuter = document.getElementById('barOuter');
  var segNames = document.getElementById('segNames');
  barOuter.innerHTML = '';
  segNames.innerHTML = '';

  config.segments.forEach(function(seg, i) {
    var widthPct = (seg.minutes * 60000 / totalMs * 100).toFixed(3) + '%';

    // ── name label above bar ──
    var lbl = document.createElement('div');
    lbl.className    = 'seg-name-item upcoming';
    lbl.id           = 'name-' + i;
    lbl.textContent  = seg.name;
    lbl.style.width  = widthPct;
    lbl.style.color  = seg.color;
    segNames.appendChild(lbl);

    // ── segment block ──
    var block = document.createElement('div');
    block.className  = 'bar-segment upcoming';
    block.id         = 'seg-' + i;
    block.style.width = widthPct;

    // dark track (full width, low opacity background)
    var track = document.createElement('div');
    track.className           = 'bar-segment-track';
    track.style.backgroundColor = seg.color;
    block.appendChild(track);

    // colored fill (grows with progress)
    var fill = document.createElement('div');
    fill.className            = 'bar-segment-fill';
    fill.id                   = 'fill-' + i;
    fill.style.backgroundColor = seg.color;
    block.appendChild(fill);

    barOuter.appendChild(block);
  });
}

// ─── Render current elapsed time onto bar ────────────────
function render() {
  var activeIdx   = currentSegmentIndex(Math.min(elapsed, totalMs - 1));
  var activeSeg   = config.segments[activeIdx];
  var displayMs   = config.countDown ? (totalMs - elapsed) : elapsed;

  // accumulate segment starts
  var acc = 0;
  config.segments.forEach(function(seg, i) {
    var segStart = acc;
    var segEnd   = acc + seg.minutes * 60000;
    acc          = segEnd;

    var block = document.getElementById('seg-' + i);
    var fill  = document.getElementById('fill-' + i);
    var name  = document.getElementById('name-' + i);

    if (elapsed >= segEnd) {
      // fully done
      block.className = 'bar-segment done' + (i === 0 ? ' first' : '') + (i === config.segments.length - 1 ? ' last' : '');
      fill.className  = 'bar-segment-fill';
      fill.style.width = '100%';
      name.className  = 'seg-name-item done';
    } else if (i === activeIdx) {
      // currently active: grow the fill
      var progress = (elapsed - segStart) / (seg.minutes * 60000) * 100;
      block.className = 'bar-segment active';
      fill.className  = 'bar-segment-fill shimmering';
      fill.style.width = progress.toFixed(2) + '%';
      name.className  = 'seg-name-item active';
    } else {
      // upcoming
      block.className = 'bar-segment upcoming';
      fill.className  = 'bar-segment-fill';
      fill.style.width = '0%';
      name.className  = 'seg-name-item upcoming';
    }
  });

  // timer + current segment label
  document.getElementById('timeLeft').textContent  = fmt(displayMs);
  document.getElementById('timeLeft').style.color  = activeSeg.color;
  document.getElementById('segLabel').textContent  = activeSeg.name;
  document.getElementById('segLabel').style.color  = activeSeg.color;
}

// ─── Timer control ───────────────────────────────────────
function startTimer() {
  if (ticker) clearInterval(ticker);
  startTs = Date.now() - elapsed;
  ticker  = setInterval(function() {
    elapsed = Date.now() - startTs;
    if (elapsed >= totalMs) {
      elapsed = totalMs;
      render();
      clearInterval(ticker);
      ticker = null;
    } else {
      render();
    }
  }, 250);
}

function resetTimer() {
  if (ticker) clearInterval(ticker);
  ticker  = null;
  elapsed = 0;
  startTs = null;
  render();
  startTimer();
}

// ─── Init ────────────────────────────────────────────────
function init(segs, countDown) {
  config   = { segments: segs, countDown: countDown };
  totalMs  = calcTotal(segs);
  elapsed  = 0;
  buildBar();
  render();
  startTimer();
}

// ─── Parse segments from SE fieldData ────────────────────
function segsFromFields(fd) {
  var segs = [];
  var i    = 1;
  while (fd['seg' + i + 'Name'] !== undefined) {
    segs.push({
      name:    String(fd['seg' + i + 'Name']),
      minutes: parseFloat(fd['seg' + i + 'Minutes']) || 1,
      color:   fd['seg' + i + 'Color'] || '#ffffff'
    });
    i++;
  }
  return segs.length ? segs : null;
}

// ─── StreamElements events ────────────────────────────────
window.addEventListener('onWidgetLoad', function(obj) {
  seLoaded   = true;
  var fd     = obj.detail.fieldData;
  var segs   = segsFromFields(fd) || DEFAULTS.segments;
  var cd     = fd.countDown !== 'no';
  init(segs, cd);
});

// Reset button from SE fields panel
window.addEventListener('onFieldChange', function(obj) {
  var f = obj.detail.fieldName;
  var v = obj.detail.value;

  if (f === 'resetBtn') {
    resetTimer();
    return;
  }

  // re-init if any segment field or countDown changed
  if (f.indexOf('seg') === 0 || f === 'countDown') {
    var fd   = obj.detail.fieldData || {};
    var segs = segsFromFields(fd) || (config ? config.segments : DEFAULTS.segments);
    var cd   = fd.countDown !== undefined ? fd.countDown !== 'no' : (config ? config.countDown : true);
    init(segs, cd);
  }
});

// ─── Fallback for SE editor preview ─────────────────────
setTimeout(function() {
  if (!seLoaded) init(DEFAULTS.segments, DEFAULTS.countDown);
}, 500);
