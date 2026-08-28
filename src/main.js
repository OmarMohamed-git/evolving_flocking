'use strict';

const MAX_FRAME_SECONDS = 0.1;

const CONTROL_SECTIONS = [
  {
    title: 'Population',
    controls: [
      { key: 'preyCount', label: 'Prey', swatch: 'prey', min: 0, max: 1000, step: 10,
        onChange: value => resizePopulation(world.prey, value) },
      { key: 'predatorCount', label: 'Predators', swatch: 'predator', min: 0, max: 20, step: 1,
        onChange: value => resizePopulation(world.predators, value) },
    ],
  },
  {
    title: 'Movement',
    controls: [
      { key: 'maxSpeed', label: 'Max speed', min: 0, max: 300, step: 5, unit: 'px/s' },
      { key: 'maxTurnForce', label: 'Turning force', min: 20, max: 800, step: 10, unit: 'px/s²' },
    ],
  },
  {
    title: 'Flocking',
    controls: [
      { key: 'perceptionRadius', label: 'Perception radius', min: 5, max: 200, step: 1, unit: 'px' },
      { key: 'separationRadius', label: 'Separation radius', min: 1, max: 120, step: 1, unit: 'px' },
      { key: 'alignmentWeight', label: 'Alignment', swatch: 'alignment', min: 0, max: 3, step: 0.05, decimals: 2 },
      { key: 'cohesionWeight', label: 'Cohesion', swatch: 'cohesion', min: 0, max: 3, step: 0.05, decimals: 2 },
      { key: 'separationWeight', label: 'Separation', swatch: 'separation', min: 0, max: 4, step: 0.05, decimals: 2 },
    ],
  },
];

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let pointerPosition = null;
let lockedBoid = null;
let lastFrameTime = performance.now();

function formatValue(control, value) {
  const number = value.toFixed(control.decimals ?? 0);
  return control.unit ? `${number} ${control.unit}` : number;
}

function controlMarkup(control) {
  const swatch = control.swatch ? `<i class="dot ${control.swatch}"></i>` : '';

  return `
    <div class="control">
      <label for="${control.key}">
        <span>${swatch}${control.label}</span>
        <span class="value" id="${control.key}-value"></span>
      </label>
      <input type="range" id="${control.key}"
             min="${control.min}" max="${control.max}" step="${control.step}"
             value="${params[control.key]}">
    </div>`;
}

function sectionMarkup(section) {
  return `<h2>${section.title}</h2>${section.controls.map(controlMarkup).join('')}`;
}

function connectControl(control) {
  const input = document.getElementById(control.key);
  const readout = document.getElementById(`${control.key}-value`);

  const apply = () => {
    const value = Number(input.value);
    params[control.key] = value;
    readout.textContent = formatValue(control, value);
    control.onChange?.(value);
  };

  input.addEventListener('input', apply);
  apply();
}

function buildControls() {
  const panel = document.getElementById('controls');
  panel.innerHTML = CONTROL_SECTIONS.map(sectionMarkup).join('');
  CONTROL_SECTIONS.flatMap(section => section.controls).forEach(connectControl);
}

function fitCanvasToWindow() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  world.width = canvas.width;
  world.height = canvas.height;
}

function canvasPositionOf(event) {
  const bounds = canvas.getBoundingClientRect();
  return new Vector2(event.clientX - bounds.left, event.clientY - bounds.top);
}

function boidUnderInspection() {
  if (lockedBoid && world.prey.includes(lockedBoid)) return lockedBoid;

  lockedBoid = null;
  return pointerPosition ? nearestBoid(pointerPosition, world.prey) : null;
}

function connectPointer() {
  canvas.addEventListener('mousemove', event => { pointerPosition = canvasPositionOf(event); });
  canvas.addEventListener('mouseleave', () => { pointerPosition = null; });
  canvas.addEventListener('click', event => {
    lockedBoid = lockedBoid ? null : nearestBoid(canvasPositionOf(event), world.prey);
  });
}

function frame(timestamp) {
  const elapsed = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;

  update(Math.min(elapsed, MAX_FRAME_SECONDS));
  drawScene(ctx, boidUnderInspection());

  requestAnimationFrame(frame);
}

function start() {
  window.addEventListener('resize', fitCanvasToWindow);
  fitCanvasToWindow();
  connectPointer();
  buildControls();
  requestAnimationFrame(frame);
}

start();
