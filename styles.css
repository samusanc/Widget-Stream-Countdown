* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background: transparent;
  overflow: hidden;
}

.widget {
  width: 100%;
  padding: 6px 12px 8px;
  font-family: 'Rajdhani', sans-serif;
}

/* ── Segment name labels above the bar ── */
.seg-names {
  display: flex;
  width: 100%;
  margin-bottom: 4px;
}

.seg-name-item {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1px;
  text-align: center;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 3px;
  transition: opacity 0.4s;
}

.seg-name-item.done {
  opacity: 0.35;
}

.seg-name-item.active {
  opacity: 1;
}

.seg-name-item.upcoming {
  opacity: 0.55;
}

/* ── Progress bar container ── */
.bar-outer {
  width: 100%;
  height: 22px;
  display: flex;
  border-radius: 11px;
  overflow: hidden;
  gap: 2px;
  background: transparent;
}

/* ── Each segment block inside the bar ── */
.bar-segment {
  height: 100%;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  transition: opacity 0.4s;
}

/* the dark unfilled track behind the fill */
.bar-segment-track {
  position: absolute;
  inset: 0;
  opacity: 0.15;
}

/* the actual colored fill that grows */
.bar-segment-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 0%;
  transition: width 0.35s linear;
}

/* shimmer only on the active fill */
.bar-segment-fill.shimmering::after {
  content: '';
  position: absolute;
  top: 0;
  left: -80%;
  width: 50%;
  height: 100%;
  background: rgba(255, 255, 255, 0.22);
  animation: shimmer 2s infinite linear;
}

@keyframes shimmer {
  0%   { left: -80%; }
  100% { left: 120%; }
}

/* done segments: full opacity fill, no shimmer */
.bar-segment.done .bar-segment-fill {
  width: 100% !important;
}

/* upcoming segments: dim track, no fill */
.bar-segment.upcoming {
  opacity: 0.45;
}

/* first segment gets rounded left corners */
.bar-segment:first-child {
  border-radius: 11px 0 0 11px;
}

/* last segment gets rounded right corners */
.bar-segment:last-child {
  border-radius: 0 11px 11px 0;
}

/* single segment: fully rounded */
.bar-segment:only-child {
  border-radius: 11px;
}

/* ── Bottom row ── */
.time-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 6px;
}

.time-left {
  font-family: 'Orbitron', monospace;
  font-size: 30px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 3px;
  text-shadow: 0 0 14px currentColor;
  transition: color 0.5s;
}

.seg-label {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 1.5px;
  color: #ffffff;
  opacity: 0.7;
  text-transform: uppercase;
  transition: color 0.4s;
}
