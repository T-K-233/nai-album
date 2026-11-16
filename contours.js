const cellSize = 13;
const levelStep = 0.19;
const frameInterval = 1000 / 24;

// Sample a slowly changing terrain and trace its equal-height lines.
function elevation(x, y, time) {
  return Math.sin(x * 1.08 + y * 0.41 + 0.55 * Math.sin(y * 1.1 + time))
    + 0.72 * Math.cos(y * 1.39 - x * 0.64 + 0.45 * Math.sin(x * 0.85 - time * 0.7))
    + 0.36 * Math.sin(x * 1.74 + y * 1.57 - time * 0.4);
}

export function animateContours(canvas) {
  const context = canvas.getContext('2d');
  if (!context) return;

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let columns;
  let rows;
  let samples;
  let frame;
  let lastDraw = -Infinity;
  let time = 0;

  function draw() {
    const { clientWidth, clientHeight } = canvas;
    context.clearRect(0, 0, clientWidth, clientHeight);
    for (let row = 0; row <= rows; row++) {
      for (let column = 0; column <= columns; column++) {
        samples[row * (columns + 1) + column] = elevation(
          column * cellSize / 265 + 0.6, row * cellSize / 265 + 0.3, time,
        );
      }
    }

    context.beginPath();
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const index = row * (columns + 1) + column;
        const a = samples[index];
        const b = samples[index + 1];
        const c = samples[index + columns + 2];
        const d = samples[index + columns + 1];
        const x = column * cellSize;
        const y = row * cellSize;
        const first = Math.ceil(Math.min(a, b, c, d) / levelStep);
        const last = Math.floor(Math.max(a, b, c, d) / levelStep);

        for (let step = first; step <= last; step++) {
          const level = step * levelStep;
          const points = [];
          if ((a < level) !== (b < level)) points.push([x + cellSize * (level - a) / (b - a), y]);
          if ((b < level) !== (c < level)) points.push([x + cellSize, y + cellSize * (level - b) / (c - b)]);
          if ((d < level) !== (c < level)) points.push([x + cellSize * (level - d) / (c - d), y + cellSize]);
          if ((a < level) !== (d < level)) points.push([x, y + cellSize * (level - a) / (d - a)]);
          if (points.length === 2) {
            context.moveTo(...points[0]);
            context.lineTo(...points[1]);
          } else if (points.length === 4) {
            // In a saddle cell, pair crossings around the corners opposite the center.
            const centerBelow = (a + b + c + d) / 4 < level;
            const offset = (a < level) === centerBelow ? 0 : 1;
            context.moveTo(...points[offset]);
            context.lineTo(...points[offset + 1]);
            context.moveTo(...points[offset + 2]);
            context.lineTo(...points[(offset + 3) % 4]);
          }
        }
      }
    }
    context.stroke();
  }

  function resize() {
    const scale = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * scale);
    canvas.height = Math.round(canvas.clientHeight * scale);
    columns = Math.ceil(canvas.clientWidth / cellSize);
    rows = Math.ceil(canvas.clientHeight / cellSize);
    samples = new Float32Array((columns + 1) * (rows + 1));
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.strokeStyle = '#d1d1d1';
    context.lineWidth = 1;
    context.lineCap = 'round';
    draw();
  }

  function tick(timestamp) {
    if (timestamp - lastDraw >= frameInterval) {
      if (Number.isFinite(lastDraw)) time += Math.min(timestamp - lastDraw, 100) / 5500;
      lastDraw = timestamp;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    lastDraw = -Infinity;
    if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(tick);
  }

  new ResizeObserver(resize).observe(canvas);
  reducedMotion.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  resize();
  syncMotion();
}
