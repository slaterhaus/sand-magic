import { BRUSH_ELEMENTS, ELEMENTS, EMPTY, type ElementId } from '../elements';
import type { Grid } from '../engine/grid';
import type { Controls } from './input';

export function buildControls(
  root: HTMLElement, grid: Grid, controls: Controls, stepOnce: () => void,
): void {
  const palette = document.createElement('div');
  palette.className = 'palette';
  const buttons = new Map<ElementId, HTMLButtonElement>();

  const pick = (id: ElementId): void => {
    controls.element = id;
    for (const [bid, btn] of buttons) btn.classList.toggle('selected', bid === id);
  };

  for (const id of [...BRUSH_ELEMENTS, EMPTY]) {
    const def = ELEMENTS[id];
    const btn = document.createElement('button');
    btn.className = 'element-btn';
    const label = id === EMPTY ? 'Eraser' : def.name;
    const swatchColor = id === EMPTY ? '#1a1e26' : def.colors[0];
    btn.innerHTML = `<span class="swatch" style="background:${swatchColor}"></span>${label}`;
    btn.addEventListener('click', () => pick(id));
    buttons.set(id, btn);
    palette.appendChild(btn);
  }
  root.appendChild(palette);
  pick(controls.element);

  const brush = document.createElement('label');
  brush.className = 'brush';
  brush.innerHTML = `Brush size <input type="range" min="1" max="20" value="${controls.radius}">`;
  brush.querySelector('input')!.addEventListener('input', e => {
    controls.radius = Number((e.target as HTMLInputElement).value);
  });
  root.appendChild(brush);

  const row = document.createElement('div');
  row.className = 'buttons';

  const pause = document.createElement('button');
  pause.textContent = '⏸ Pause';
  pause.addEventListener('click', () => {
    controls.paused = !controls.paused;
    pause.textContent = controls.paused ? '▶ Play' : '⏸ Pause';
  });

  const step = document.createElement('button');
  step.textContent = '⏭ Step';
  step.addEventListener('click', () => {
    if (controls.paused) stepOnce();
  });

  const clear = document.createElement('button');
  clear.textContent = '🧹 Fresh world';
  clear.addEventListener('click', () => openClearConfirm(grid));

  row.append(pause, step, clear);
  root.appendChild(row);
}

function openClearConfirm(grid: Grid): void {
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="dialog">
      <p>Start a fresh world? Your discoveries stay safe in your journal! ✨</p>
      <div class="dialog-buttons">
        <button class="yes">Fresh world</button>
        <button class="no">Keep playing</button>
      </div>
    </div>`;
  overlay.querySelector('.yes')!.addEventListener('click', () => {
    grid.clear();
    overlay.remove();
  });
  overlay.querySelector('.no')!.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}
