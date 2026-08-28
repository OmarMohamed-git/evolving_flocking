// =====================================================================
// render.js - turning world state into pixels
// =====================================================================
//
// PROVIDES: draw
// NEEDS:    world, neighboursOf (world.js), align (agent.js),
//           params and SIZE (config.js)
//
// THE RULE FOR THIS FILE: it reads the world and never writes to it.
// Not one field.
//
// That is not a style preference. Stage 5 runs the simulation headless -
// no canvas, no drawing at all - for long data runs, and those runs have
// to produce numerically identical results to the ones being watched. One
// stray `boid.somethingForDrawing = x` in here and that guarantee is gone,
// silently, and the exported data no longer describes what was on screen.
//
// The inspector overlay below is where that rule was most tempting to
// break. The easy way to draw a boid's steering force is to have the
// simulation stash it on the boid during update(), and read it here. This
// file RECOMPUTES it instead - align() takes a boid and a list and returns
// a fresh vector without touching either. It costs one extra rule
// evaluation per frame, for one boid, and keeps the wall standing.

const BACKGROUND_COLOUR = '#0b0f14';
const PREY_COLOUR = '#7fd4ff';
const PREDATOR_COLOUR = '#ff5c5c';

// Inspector palette. These match the swatches in the sidebar legend.
const SELECTED_COLOUR = '#ffe066';                 // the boid being inspected
const NEIGHBOUR_COLOUR = '#ffffff';                // boids it can see
const PERCEPTION_COLOUR = 'rgba(255, 224, 102, 0.55)';
const LINK_COLOUR = 'rgba(255, 224, 102, 0.30)';
const VELOCITY_COLOUR = '#c9d6e3';                 // where it is going now
const ALIGNMENT_COLOUR = '#5cff9d';                // the steering correction

// Forces and velocities are in pixels per second (and per second squared).
// Drawn at true length they would be far too long, so both are scaled down
// purely for legibility. The RATIO between the two arrows is meaningful;
// their absolute lengths are not.
const VELOCITY_ARROW_SCALE = 0.45;
const FORCE_ARROW_SCALE = 0.55;


function draw(ctx, selected) {
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

  // And the overlay last of all, so nothing paints over it.
  if (selected) drawInspector(ctx, selected);
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

  // heading() is atan2(y, x) - the velocity vector turned back into an
  // angle. Wrapping it in a method means the argument order can only be
  // got wrong in one place, not at every call site.
  ctx.rotate(b.velocity.heading());

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


// ---------------------------------------------------------------------
// The inspector overlay
// ---------------------------------------------------------------------

// Everything one boid can see, and what it decided to do about it.
function drawInspector(ctx, b) {
  const p = b.position;

  // The same call the simulation makes for this boid every frame.
  const neighbours = neighboursOf(b, world.prey);

  // --- perception radius ---
  // Nothing outside this circle exists as far as this boid is concerned.
  // There is no global view anywhere in the simulation.
  ctx.strokeStyle = PERCEPTION_COLOUR;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);              // dashed, so it reads as a boundary
  ctx.beginPath();
  ctx.arc(p.x, p.y, params.perceptionRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);                  // setLineDash is sticky - reset it

  // --- who it can see ---
  // A line to each neighbour. These are exactly the boids whose velocities
  // get averaged, so the count of lines is the size of the average.
  //
  // Drawn with the WRAPPED offset rather than the neighbour's raw
  // position: a neighbour across the screen seam is genuinely close, and
  // the line should be short and run off the edge, not stretch across the
  // whole canvas.
  ctx.strokeStyle = LINK_COLOUR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const other of neighbours) {
    const { dx, dy } = wrappedDelta(p, other.position);
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + dx, p.y + dy);
  }
  ctx.stroke();

  // Mark the neighbours themselves, so they can be told apart from the
  // boids just outside the circle that are being ignored.
  ctx.fillStyle = NEIGHBOUR_COLOUR;
  for (const other of neighbours) drawBoid(ctx, other);

  // --- the two arrows ---
  //
  // These are the whole point of the overlay. Grey is where the boid is
  // going now. Green is the CORRECTION the alignment rule wants to apply
  // to it - not a destination, a difference.
  //
  // When the flock is settled the green arrow shrinks to almost nothing,
  // because the boid is already doing what the rule wants. That shrinking
  // is `steering = desired - current velocity` made visible.
  arrow(ctx, p.x, p.y, b.velocity.x, b.velocity.y,
        VELOCITY_COLOUR, VELOCITY_ARROW_SCALE);

  // Recomputed here rather than read off the boid - see the note at the
  // top of this file. .mult() modifies, so this is applied to the fresh
  // vector align() returned, not to anything the simulation owns.
  const alignment = align(b, neighbours).mult(params.alignmentWeight);
  arrow(ctx, p.x, p.y, alignment.x, alignment.y,
        ALIGNMENT_COLOUR, FORCE_ARROW_SCALE);

  // --- the boid itself, on top of everything ---
  ctx.fillStyle = SELECTED_COLOUR;
  drawBoid(ctx, b);
}

// A line with a head on the end, drawn from (x, y) along (vx, vy).
function arrow(ctx, x, y, vx, vy, colour, scale) {
  const length = Math.hypot(vx, vy) * scale;

  // Below a few pixels the head is bigger than the shaft and it reads as
  // a blob pointing nowhere. Better to draw nothing - and "nothing" is
  // itself information: the rule has no opinion right now.
  if (length < 3) return;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.atan2(vy, vx));   // same trick as the triangle: rotate,
                                    // then draw along +x
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();

  const head = 6;
  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.lineTo(length - head, head * 0.6);
  ctx.lineTo(length - head, -head * 0.6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
