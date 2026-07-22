import './style.css';
import { SAND } from './elements';
import { Grid } from './engine/grid';
import { stepPhysics } from './engine/physics';
import { stepReactions } from './engine/reactions';
import { Renderer } from './render';
import { attachPainting, type Controls } from './ui/input';
import { buildControls } from './ui/palette';
import { buildJournalUI, Journal, showToast } from './ui/journal';
import { buildTitleScreen } from './ui/titlescreen';

const grid = new Grid(400, 250);
const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
const renderer = new Renderer(grid, canvas);
const controls: Controls = { element: SAND, radius: 4, paused: false };
const journal = new Journal(localStorage);

attachPainting(canvas, grid, controls);
buildControls(
  document.querySelector<HTMLElement>('#controls')!,
  grid, controls, simulate,
);
buildJournalUI(document.querySelector<HTMLElement>('#controls')!, journal);
buildTitleScreen(document.body);

function simulate(): void {
  stepPhysics(grid);
  stepReactions(grid, journal.seen, d => {
    journal.record(d);
    showToast(d);
  });
}

function frame(): void {
  if (!controls.paused) simulate();
  renderer.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
