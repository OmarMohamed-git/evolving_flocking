// =====================================================================
// agent.js - what one boid is, how it decides, and how it moves
// =====================================================================
//
// PROVIDES: makeBoid, align, flock, integrate, wrap
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
  for (const other of neighbours) sum.add(other.velocity);
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

// Run every rule, weight the results, and accumulate them into this
// frame's acceleration.
//
// Adding the forces is how a boid resolves conflicting advice: each rule
// votes with an arrow, and the sum is the compromise it actually follows.
// The weights decide how loud each voice is.
//
// One rule so far, so there is nothing to compromise with yet. The shape
// is here because separation and cohesion slot straight into it.
function flock(b, neighbours) {
  const alignment = align(b, neighbours);

  b.acceleration.add(alignment.mult(params.alignmentWeight));
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
