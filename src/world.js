// =====================================================================
// world.js - the populations, who can see whom, and one step of time
// =====================================================================
//
// PROVIDES: world, syncPopulation, wrappedDelta, neighboursOf,
//           nearestBoid, update
// NEEDS:    makeBoid, flock, integrate (agent.js), params (config.js)
//
// The world owns everything that exists, answers "who is near this boid",
// and decides what happens each tick.
//
// It holds its own width and height rather than reading them off the
// canvas. That keeps the simulation independent of anything being drawn -
// which is what stage 5's headless mode needs, where there is no canvas
// at all. main.js pushes the size in whenever the window resizes.

const world = {
  width: 0,
  height: 0,

  // Two separate lists rather than one list with a `type: 'prey'` field
  // on each agent. The single-list version means every loop starts with a
  // filter or an if, and the two species diverge fast: predators get
  // their own speed, their own steering, eventually their own genome.
  prey: [],
  predators: [],
};

// Grow or shrink a population until it matches its slider.
//
// The obvious version - empty the array and rebuild it - would work, but
// 'input' fires on every pixel of slider drag, so dragging from 200 to
// 400 would scrap and rebuild the whole population dozens of times.
// Adding and removing only the difference leaves the existing boids alone.
function syncPopulation(list, target) {
  while (list.length > target) list.pop();
  while (list.length < target) list.push(makeBoid());
}


// ---------------------------------------------------------------------
// Distance on a torus
// ---------------------------------------------------------------------

// The shortest offset from `from` to `to`, accounting for the wrap.
//
// THIS IS NOT OPTIONAL. A boid at x=5 and one at x=1195 on a 1200-wide
// world are 10 pixels apart, not 1190 - they are either side of the seam.
// Plain subtraction says 1190, so they would not see each other, and
// flocks would behave as if the screen edges were walls. Which is the
// exact thing wrapping exists to avoid.
//
// The rule: if a gap is more than half the world wide, going the other
// way round is shorter.
function wrappedDelta(from, to) {
  let dx = to.x - from.x;
  let dy = to.y - from.y;

  if (dx > world.width / 2) dx -= world.width;
  else if (dx < -world.width / 2) dx += world.width;

  if (dy > world.height / 2) dy -= world.height;
  else if (dy < -world.height / 2) dy += world.height;

  return { dx, dy };
}

// Everything in `list` within the perception radius of b, excluding b.
//
// Each entry is { other, dx, dy, distSq } where dx/dy is the WRAPPED
// offset from b to that neighbour - not the neighbour's absolute position -
// and distSq is how far away it is, SQUARED.
//
// Offsets rather than positions, for two reasons. The wrapped distance is
// already computed here to do the radius check, so returning it costs
// nothing and saves every rule recomputing it. And more importantly it
// means the rules in agent.js never have to know the world wraps: they
// receive "that one is 12 left and 5 up from you" and can do their maths
// without a special case at the screen edges.
//
// distSq is passed on un-square-rooted deliberately. Separation is the
// only rule that cares how far away a neighbour is, it only cares about
// the closest few, and it turns out to need the squared value anyway -
// so the square root is never taken at all.
//
// THIS IS THE SLOW, HONEST VERSION: every boid checked against every
// other. With 200 prey that is 40,000 distance checks per frame, which is
// nothing. At 1000 it is a million and the frame rate dies.
//
// The plan says to add a spatial grid in stage 1, before it hurts, and it
// is right - but it is worth dragging the slider up and watching this die
// first. Otherwise the grid is a fix for a problem taken on trust.
function neighboursOf(b, list) {
  const radius = params.perceptionRadius;
  const radiusSq = radius * radius;
  const found = [];

  for (const other of list) {
    if (other === b) continue;   // a boid is not its own neighbour

    const { dx, dy } = wrappedDelta(b.position, other.position);

    // Compare SQUARED distances and skip the square root. If a^2 < b^2
    // then a < b, so the comparison is identical - and this runs tens of
    // thousands of times a frame, where a square root is not free.
    const distSq = dx * dx + dy * dy;
    if (distSq > radiusSq) continue;

    found.push({ other, dx, dy, distSq });
  }

  return found;
}


// The boid closest to a point, used by the inspector overlay to decide
// which one the cursor is pointing at.
//
// Squared distances again - the actual distance is never needed, only
// which one is smallest.
function nearestBoid(x, y, list) {
  const point = { x, y };
  let best = null;
  let bestSq = Infinity;

  for (const b of list) {
    const { dx, dy } = wrappedDelta(point, b.position);
    const dSq = dx * dx + dy * dy;
    if (dSq < bestSq) {
      bestSq = dSq;
      best = b;
    }
  }

  return best;
}


// ---------------------------------------------------------------------
// One tick
// ---------------------------------------------------------------------

// dt is how many SECONDS passed.
//
// TWO PHASES, AND THE ORDER MATTERS.
//
// Every boid's force is worked out BEFORE any boid moves. The tempting
// version - loop once, deciding and moving each boid in turn - means boid
// #2 reacts to #1's new position while #1 reacted to #2's old one. That
// asymmetry is baked into the physics, depends on array order, and is
// essentially impossible to spot by looking at the screen.
//
// Storing the forces first costs one extra pass and removes the whole
// class of problem.
function update(dt) {
  // Phase 1: decide. Nothing moves.
  for (const b of world.prey) {
    const neighbours = neighboursOf(b, world.prey);
    flock(b, neighbours);
  }

  // Phase 2: move.
  for (const b of world.prey) integrate(b, dt);

  // Predators have no rules yet, so they just carry on in a straight line.
  // This is where the two species stop sharing behaviour.
  for (const b of world.predators) integrate(b, dt);
}
