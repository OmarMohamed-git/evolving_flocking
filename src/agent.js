// =====================================================================
// agent.js - what one boid is, how it decides, and how it moves
// =====================================================================
//
// PROVIDES: makeBoid, align, cohere, separate, flock, integrate, wrap
// NEEDS:    Vector2 (vector.js), params and SIZE (config.js),
//           world (world.js) - for its width and height
//
// This file deals with an INDIVIDUAL. It does not know how many boids
// exist, how they find each other, or how they are drawn.
//
// Note that the rules take `neighbours` as an ARGUMENT rather than going
// and looking them up. A boid therefore never learns that a population,
// or later a spatial grid, exists. That keeps the rules testable on a
// hand-written list of three boids, with no World anywhere in sight.
//
// Each neighbour arrives as { other, dx, dy, distSq }, where dx/dy is the
// offset from this boid to that one, already corrected for the world
// wrapping. The rules can therefore treat space as flat and infinite.

// Build one boid: somewhere random, moving flat out in a random direction.
function makeBoid() {
  // A full turn is 2*PI radians, so this covers every direction.
  const angle = Math.random() * Math.PI * 2;

  return {
    position: new Vector2(Math.random() * world.width,
                          Math.random() * world.height),

    // Velocity now carries BOTH direction and speed, where it used to be
    // a bare unit vector with speed applied separately at move time. It
    // had to change: alignment works by nudging velocity, so velocity has
    // to be the thing that varies.
    velocity: Vector2.fromAngle(angle).mult(params.maxSpeed),

    // This frame's steering forces, summed. Cleared after every step -
    // see integrate() for why that matters.
    acceleration: new Vector2(),
  };
}


// ---------------------------------------------------------------------
// The rules
// ---------------------------------------------------------------------

// ALIGNMENT: steer to match the average heading of visible neighbours.
//
// Every Reynolds rule has the same four-step shape, and it is worth
// reading this one closely because separation and cohesion differ only in
// how they answer step 1:
//
//   1. work out a DESIRED velocity from the neighbours
//   2. scale that desire up to max speed - a boid always wants to go flat out
//   3. steering = desired - current velocity
//   4. cap the steering at maxForce
//
// STEP 3 IS THE ONE THAT MATTERS. The force is not "the way I want to
// go". It is "the correction that turns what I am doing into what I
// want". A boid already travelling in the desired direction gets a force
// of almost zero, and does nothing - which is correct, and is not what
// you would get by just steering toward the desire.
//
// Step 4 is what makes it look alive. A capped correction cannot reverse
// a velocity in one frame, so turns take time and come out as arcs.
function align(b, neighbours) {
  // Nobody in sight: no opinion, zero force. Returning a zero vector
  // rather than null means the caller can add it unconditionally.
  if (neighbours.length === 0) return new Vector2();

  // Step 1: the average heading of everyone I can see.
  const sum = new Vector2();
  for (const n of neighbours) sum.add(n.other.velocity);
  sum.div(neighbours.length);

  // Neighbours heading in exactly opposite directions can average to
  // nothing. There is no direction to steer toward, so do not invent one -
  // setMagnitude on a zero vector would be a divide by zero.
  if (sum.magnitudeSq() === 0) return new Vector2();

  // Steps 2, 3 and 4, reading in the order they happen. This is the shape
  // the mutating Vector2 style was chosen for.
  return sum.setMagnitude(params.maxSpeed)
            .sub(b.velocity)
            .limit(params.maxForce);
}

// COHESION: steer toward the average position of visible neighbours.
//
// Same four-step shape as align(). Only step 1 differs - it averages
// WHERE the neighbours are instead of where they are going.
//
// The offsets are averaged rather than the positions. Averaging positions
// would give the flock's centre as an absolute coordinate, which then has
// to be subtracted from this boid's position to get a direction - and at
// the screen seam that subtraction is wrong. A flock straddling the edge
// would compute its centre in the middle of the canvas and the whole
// flock would turn round and fly at it.
//
// Averaging the already-wrapped offsets skips the problem entirely: the
// average of "12 left, 5 up" and "8 left, 1 down" IS the direction to the
// local centre, with no absolute coordinate involved anywhere.
//
// This is the first rule where the torus actually bites. Alignment dodged
// it because velocities do not care where you are.
function cohere(b, neighbours) {
  if (neighbours.length === 0) return new Vector2();

  // Step 1: the average offset to everyone I can see - which points at
  // the middle of them.
  const sum = new Vector2();
  for (const n of neighbours) sum.add(new Vector2(n.dx, n.dy));
  sum.div(neighbours.length);

  // A boid sitting exactly at the centre of its neighbours has nowhere to
  // steer, and setMagnitude on a zero vector would be a divide by zero.
  if (sum.magnitudeSq() === 0) return new Vector2();

  // Steps 2, 3 and 4 - identical to alignment.
  return sum.setMagnitude(params.maxSpeed)
            .sub(b.velocity)
            .limit(params.maxForce);
}

// SEPARATION: steer away from neighbours that are too close.
//
// The odd one out of the three. The other two look at every neighbour in
// the perception radius; this one only reacts inside a much smaller
// personal-space radius, and stays silent otherwise. Most of the time,
// for most boids, it returns zero.
//
// THE 1/DISTANCE WEIGHTING IS THE WHOLE RULE.
//
// Without it, a boid pressed against another pushes exactly as hard as
// one at the edge of its personal space, and the flock behaves like a gas -
// evenly spread, no structure. Weighting each push by how close it is
// means the rule is nearly silent at normal spacing and overwhelming on
// contact, which is what produces a flock with a definite density rather
// than one that either collapses or disperses.
//
// How the weighting happens without a square root:
//
//   (-dx, -dy)  points away from the neighbour, and is `dist` long
//   .div(distSq)  makes it  dist / dist^2  =  1 / dist  long
//
// So the result is a unit vector away from that neighbour, scaled by
// 1/distance. Twice as close, twice as hard a shove - and Math.sqrt is
// never called.
function separate(b, neighbours) {
  const radiusSq = params.separationRadius * params.separationRadius;
  const steer = new Vector2();
  let count = 0;

  for (const n of neighbours) {
    // Only things inside personal space. Everything else is fine where it
    // is - that is alignment and cohesion's business, not this rule's.
    if (n.distSq > radiusSq) continue;

    // Two boids at exactly the same point have no direction to separate
    // along, and dividing by zero would produce NaN and lose the boid
    // permanently. Rare, but it happens once cohesion has piled them up.
    if (n.distSq === 0) continue;

    steer.add(new Vector2(-n.dx, -n.dy).div(n.distSq));
    count++;
  }

  // Nobody too close: no opinion at all. This is the normal case.
  if (count === 0) return steer;

  // Steps 2, 3 and 4 - identical to the other two rules. Note the sum is
  // NOT divided by count: this is not an average. Being crowded by six
  // boids should push harder than being crowded by one.
  return steer.setMagnitude(params.maxSpeed)
              .sub(b.velocity)
              .limit(params.maxForce);
}

// Run every rule, weight the results, and accumulate them into this
// frame's acceleration.
//
// Adding the forces is how a boid resolves conflicting advice: each rule
// votes with an arrow, and the sum is the compromise it actually follows.
// The weights decide how loud each voice is.
//
// All three Reynolds rules, and they genuinely disagree: cohesion pulls
// inwards, separation pushes outwards, alignment wants to keep pace with
// the group. The boid follows none of them - it follows the sum.
//
// That standoff IS the flock. Cohesion alone collapses it to a point;
// separation alone scatters it; the shape you see on screen is the
// distance at which those two cancel, with alignment giving it a heading.
//
// .mult() modifies, but each force here is a fresh vector the rule just
// returned, so there is nothing being damaged by weighting it in place.
function flock(b, neighbours) {
  const alignment = align(b, neighbours);
  const cohesion = cohere(b, neighbours);
  const separation = separate(b, neighbours);

  b.acceleration.add(alignment.mult(params.alignmentWeight));
  b.acceleration.add(cohesion.mult(params.cohesionWeight));
  b.acceleration.add(separation.mult(params.separationWeight));
}


// ---------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------

// Turn this frame's acceleration into movement.
//
// Three layers, each nudging the next - acceleration changes velocity,
// velocity changes position. Nothing is ever set directly, which is what
// gives a boid momentum: it carries its old motion and has to be argued
// out of it.
function integrate(b, dt) {
  // .clone() IS LOAD-BEARING in both lines below. mult() modifies the
  // vector it is called on, so without the copies this would permanently
  // scale acceleration and velocity themselves by dt every frame.
  b.velocity.add(b.acceleration.clone().mult(dt)).limit(params.maxSpeed);
  b.position.add(b.velocity.clone().mult(dt));

  // CLEAR THE ACCELERATION. Forces are this frame's opinion, recomputed
  // from scratch next frame - not a running total. Leave this out and the
  // pushes accumulate, and every boid rockets off screen within seconds.
  b.acceleration.set(0, 0);

  wrap(b);
}

// Toroidal world: leaving one edge means entering the opposite one.
// No walls, so nothing piles up in corners and a flock is never shaped
// by the boundary.
//
// The SIZE margin lets a boid slide fully off screen before reappearing,
// instead of its nose popping out of the far edge while its tail is still
// visible on this one.
function wrap(b) {
  const p = b.position;
  if (p.x < -SIZE) p.x = world.width + SIZE;
  if (p.x > world.width + SIZE) p.x = -SIZE;
  if (p.y < -SIZE) p.y = world.height + SIZE;
  if (p.y > world.height + SIZE) p.y = -SIZE;
}
