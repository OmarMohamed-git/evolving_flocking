// =====================================================================
// agent.js - what one boid is, and how one boid moves
// =====================================================================
//
// PROVIDES: makeBoid, moveAll, wrap
// NEEDS:    Vector2 (vector.js), params and SIZE (config.js),
//           world (world.js) - for its width and height
//
// This file deals with an individual and its immediate motion. It does
// not know how many boids exist, how they find each other, or how they
// are drawn.
//
// It is where the three flocking rules will go: each one takes a list of
// neighbours and returns a steering force. Those neighbours will be
// PASSED IN rather than looked up here, so a boid never needs to know
// that a spatial grid exists.

// Build one boid: somewhere random, facing somewhere random.
//
// Direction is kept SEPARATE from speed, as a unit vector - a pair whose
// length is exactly 1. Velocity is then direction x speed, which is what
// lets the speed slider change how fast everything goes without touching
// which way anything is pointing.
function makeBoid() {
  // A full turn is 2*PI radians, so this covers every direction.
  const angle = Math.random() * Math.PI * 2;

  return {
    position: new Vector2(Math.random() * world.width,
                          Math.random() * world.height),

    // A unit vector - length exactly 1. Pure direction, no speed baked in.
    // Once the flocking rules arrive this becomes a full velocity and the
    // speed slider becomes a cap on it, but for now speed lives in params
    // and this stays 1 long.
    direction: Vector2.fromAngle(angle),
  };
}

// Move every boid in a list forward by one frame's worth of time.
function moveAll(list, dt) {
  // Every boid gets the same dt. They are all living through the same
  // frame, so they all experience the same amount of time.
  for (const b of list) {
    // The whole of "move forward" in one line: take the direction, scale
    // it to how far this frame is worth, and add it to the position.
    //
    // .clone() IS LOAD-BEARING. mult() modifies the vector it is called
    // on, so without the copy this would permanently shrink `direction`
    // by a factor of speed*dt every single frame. Within about a second
    // the direction would be so close to zero that the boid stops dead.
    b.position.add(b.direction.clone().mult(params.speed * dt));
    wrap(b);
  }
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
