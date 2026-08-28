// =====================================================================
// render.js - turning world state into pixels
// =====================================================================
//
// PROVIDES: draw
// NEEDS:    world (world.js), SIZE (config.js)
//
// THE RULE FOR THIS FILE: it reads the world and never writes to it.
// Not one field.
//
// That is not a style preference. Stage 5 runs the simulation headless -
// no canvas, no drawing at all - for long data runs, and those runs have
// to produce numerically identical results to the ones being watched. One
// stray `boid.somethingForDrawing = x` in here and that guarantee is gone,
// silently, and the exported data no longer describes what was on screen.

const BACKGROUND_COLOUR = '#0b0f14';
const PREY_COLOUR = '#7fd4ff';
const PREDATOR_COLOUR = '#ff5c5c';

function draw(ctx) {
  // Repainting the background is what ERASES the previous frame. Without
  // it, every position every boid has ever occupied stays on screen and
  // the canvas fills with solid streaks.
  //
  // Note this happens ONCE, not once per boid. Doing it inside a loop
  // would erase each boid as the next one is drawn, leaving only the last.
  ctx.fillStyle = BACKGROUND_COLOUR;
  ctx.fillRect(0, 0, world.width, world.height);

  // Predators are drawn last so they sit on top of the prey rather than
  // disappearing underneath them - the canvas paints in call order.
  drawAll(ctx, world.prey, PREY_COLOUR);
  drawAll(ctx, world.predators, PREDATOR_COLOUR);
}

function drawAll(ctx, list, colour) {
  // fillStyle is a setting, not an argument - it stays until changed.
  // Setting it once per species rather than once per boid is not just
  // tidier, it skips a couple of hundred pointless assignments a frame.
  ctx.fillStyle = colour;

  for (const b of list) drawBoid(ctx, b);
}

function drawBoid(ctx, b) {
  // save() snapshots the drawing state, restore() puts it back, so the
  // translate and rotate below apply only to this one boid. Without the
  // pair, every boid's rotation would stack onto the last one's.
  ctx.save();

  // Move the origin onto the boid, then turn the whole canvas to face its
  // direction of travel. The shape below is drawn as if pointing right,
  // and never needs to know about angles.
  ctx.translate(b.position.x, b.position.y);

  // heading() is atan2(y, x) - the direction vector turned back into an
  // angle. Wrapping it in a method means the argument order can only be
  // got wrong in one place, not at every call site.
  ctx.rotate(b.direction.heading());

  ctx.beginPath();
  // Nose along +x, back corners behind it, so the triangle points RIGHT.
  // An angle of 0 also points right, which is why the rotate above aims
  // it correctly without these numbers ever changing.
  ctx.moveTo(SIZE, 0);                   // nose, out in front
  ctx.lineTo(-SIZE * 0.6, SIZE * 0.6);   // back corner
  ctx.lineTo(-SIZE * 0.6, -SIZE * 0.6);  // back corner
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
