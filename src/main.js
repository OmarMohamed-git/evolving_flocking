// =====================================================================
// main.js - the browser end: canvas, sliders, and the frame loop
// =====================================================================
//
// PROVIDES: nothing - this is the file that starts everything
// NEEDS:    everything else, which is why it is loaded last
//
// Everything the browser is responsible for lives here: finding the
// canvas, reacting to the window changing size, reading the sliders, and
// asking to be woken up once per screen repaint.
//
// The simulation files know none of this. They deal in numbers, and this
// file is what connects those numbers to a screen and a mouse.

// ---------------------------------------------------------------------
// 1. Canvas
// ---------------------------------------------------------------------

// `document` is the page. getElementById finds the tag whose id attribute
// is "canvas". The tag itself has no drawing methods - asking it for a
// "2d context" returns a separate object that does.
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// The canvas does not fill the window - the sidebar takes 260px of it.
// clientWidth / clientHeight are the size the browser has actually laid
// this element out at, after the CSS flexbox has done its work. That is
// what to measure, not window.innerWidth.
//
// Assigning to canvas.width sets the real pixel grid AND wipes the canvas
// blank, even when set to the value it already had. The loop repaints
// immediately afterwards, so that does not matter here.
//
// The world is told its own size rather than reading the canvas itself.
// That keeps the simulation independent of anything being drawn.
function fitToWindow() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  world.width = canvas.width;
  world.height = canvas.height;
}


// ---------------------------------------------------------------------
// 2. Sliders
// ---------------------------------------------------------------------

// One function handles every slider, so adding a fourth is one line
// rather than another copy-pasted block.
//
//   id        - matches both the <input id="..."> and the <span id="...-value">
//   key       - which field of params to write into
//   format    - turns the number into the text shown beside the label
//   onChange  - optional extra work to do after params is updated
function bindSlider(id, key, format, onChange) {
  const input = document.getElementById(id);
  const output = document.getElementById(id + '-value');

  function apply() {
    // Slider values arrive as STRINGS - "200", not 200. Convert once,
    // here at the edge, so nothing downstream has to think about it.
    const value = Number(input.value);
    params[key] = value;
    output.textContent = format(value);

    // Most sliders need no follow-up work: the simulation reads params
    // fresh every frame anyway. Population is the exception, because a
    // number changing is not the same as boids appearing.
    if (onChange) onChange(value);
  }

  // 'input' fires continuously while dragging.
  // ('change' would only fire once, on release - less responsive.)
  input.addEventListener('input', apply);

  // Run once at startup so params and the readout match the slider.
  apply();
}


// ---------------------------------------------------------------------
// 3. The frame loop
// ---------------------------------------------------------------------

// requestAnimationFrame(f) means "call f once, just before the next screen
// repaint". It is not a loop on its own - f has to book the next frame at
// the end of itself, which is what makes it run continuously.
//
// The browser passes f a timestamp in milliseconds. Subtracting the
// previous one gives how long that frame actually took, which is dt.
let lastTime = performance.now();

function frame(now) {
  let dt = (now - lastTime) / 1000;   // milliseconds -> seconds
  lastTime = now;

  // Switch to another tab and the browser stops calling this. Come back
  // 30 seconds later and dt is 30 - one update step that teleports every
  // boid across the screen. Capping it means a tab switch costs a small
  // pause instead of a jump.
  if (dt > 0.1) dt = 0.1;

  update(dt);     // world.js - changes the numbers
  draw(ctx);      // render.js - photographs them

  requestAnimationFrame(frame);   // book the next one
}


// ---------------------------------------------------------------------
// 4. Start
// ---------------------------------------------------------------------

// Resizing wipes the canvas, but the loop repaints immediately anyway,
// so there is no draw() call needed here.
window.addEventListener('resize', fitToWindow);

// ORDER MATTERS HERE.
//
// A <canvas> with no width/height attributes defaults to 300x150, and
// world.width stays 0 until fitToWindow() has run. Anything that spawns
// boids before that scatters them across a box in the top-left corner,
// where they stay bunched.
//
// bindSlider() calls its handler once at startup to sync params with the
// slider, and for the population sliders that handler builds the boids.
// So the bindings have to happen AFTER the world has been given its size.
fitToWindow();

// syncPopulation needs to know WHICH list to resize, so each of these
// wraps it in a small function that supplies the right one.
bindSlider('preyCount', 'preyCount', v => String(v), n => syncPopulation(world.prey, n));
bindSlider('predatorCount', 'predatorCount', v => String(v), n => syncPopulation(world.predators, n));
bindSlider('maxSpeed', 'maxSpeed', v => v + ' px/s');
bindSlider('perceptionRadius', 'perceptionRadius', v => v + ' px');

// toFixed(2) keeps the readout a steady width as the value changes, so
// the label does not jitter while being dragged.
bindSlider('alignmentWeight', 'alignmentWeight', v => v.toFixed(2));

requestAnimationFrame(frame);
