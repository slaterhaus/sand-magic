import './style.css';
import { SAND } from './elements';
import { Grid } from './engine/grid';
import { stepPhysics } from './engine/physics';
import { stepReactions } from './engine/reactions';
import { Renderer } from './render';
import { attachPainting, type Controls } from './ui/input';

const grid = new Grid(400, 250);
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const renderer = new Renderer(grid, canvas);
const controls: Controls = { element: SAND, radius: 4, paused: false };
const seen = new Set<string>();

attachPainting(canvas, grid, controls);

function simulate(): void {
  stepPhysics(grid);
  stepReactions(grid, seen, () => {}); // journal arrives in Task 8
}

function frame(): void {
  if (!controls.paused) simulate();
  renderer.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
