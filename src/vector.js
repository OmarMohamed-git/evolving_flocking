// =====================================================================
// vector.js - 2D vector maths
// =====================================================================
//
// PROVIDES: class Vector2
// NEEDS:    nothing
//
// This file knows nothing about boids, canvases or screens. That is the
// point of it being first and separate: it is pure maths, it can never
// break because of a change elsewhere, and once it is right it is done.
//
// A vector is an arrow: a direction plus a length. (3, 4) points 3 right
// and 4 down, and is 5 long. Positions, directions, velocities and
// steering forces are all pairs of numbers added, scaled and measured the
// same way - so each operation is written once here rather than twice, a
// line for x and a line for y, everywhere they are used.
//
// MUTATING STYLE: every method below changes the vector it is called on
// and returns `this`, rather than returning a fresh vector. Two
// consequences, both deliberate:
//
//   1. Calls chain, and read in the order they happen:
//        sum.div(n).setMagnitude(maxSpeed).sub(velocity).limit(maxForce)
//
//   2. `a.add(b)` WRECKS a. If a is still needed afterwards, it has to be
//      copied first with .clone(). That rule is the price of this style,
//      and forgetting it is the bug it produces.

class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  // Copy. The guard against every mutating method in this class.
  clone() {
    return new Vector2(this.x, this.y);
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  // Nose to tail: walk this arrow, then walk v from where it ended.
  // This is what actually moves a boid - position.add(step).
  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  // The arrow FROM v TO this - "where am I relative to you".
  // All three flocking rules are built on this one.
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  // Stretch or shrink. Direction unchanged.
  mult(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  // Shrink. Mostly used for averaging: sum.div(count).
  //
  // Dividing by zero would give Infinity, then NaN, and a boid whose
  // position is NaN vanishes permanently with no error. Guarding here is
  // cheaper than finding that later.
  div(s) {
    if (s === 0) return this;
    this.x /= s;
    this.y /= s;
    return this;
  }

  // Length of the arrow. Pythagoras. For a position difference this is a
  // distance; for a velocity it is a speed.
  magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  // Length SQUARED - skips the square root.
  //
  // Comparing distances does not need the real length: if a^2 < b^2 then
  // a < b. Neighbour searches do that comparison for every pair of boids,
  // every frame, so skipping a square root there is worth having.
  magnitudeSq() {
    return this.x * this.x + this.y * this.y;
  }

  // Throw away the length, keep the direction. Result is exactly 1 long.
  //
  // The zero check matters: a vector of length 0 has no direction to keep,
  // and dividing by 0 would turn it into NaN.
  normalise() {
    const m = this.magnitude();
    return m === 0 ? this : this.div(m);
  }

  // "Same direction, but exactly this long."
  // Every steering rule ends up wanting this: a rule decides a direction,
  // then asks for that direction at full speed.
  setMagnitude(m) {
    return this.normalise().mult(m);
  }

  // Shorten if too long, leave alone otherwise. Direction never changes.
  //
  // This is what gives a boid finite turning ability: a steering force
  // capped at maxForce cannot instantly reverse the velocity, so turns
  // have to be arcs. Comparing squares avoids a square root in the common
  // case where nothing needs limiting.
  limit(max) {
    if (this.magnitudeSq() > max * max) this.setMagnitude(max);
    return this;
  }

  // Turn the arrow back into an angle, for ctx.rotate().
  // NOTE THE ORDER inside atan2: y first, then x.
  heading() {
    return Math.atan2(this.y, this.x);
  }

  // Build a unit vector from an angle. cos gives the x part, sin the y
  // part, and together they are always exactly 1 long.
  static fromAngle(angle) {
    return new Vector2(Math.cos(angle), Math.sin(angle));
  }
}