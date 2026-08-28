// =====================================================================
// config.js - every tunable number, in one place
// =====================================================================
//
// PROVIDES: params, SIZE
// NEEDS:    nothing
//
// Two reasons this is its own file rather than a few constants scattered
// wherever they are used:
//
//   1. Stage 4 of the plan deletes the hand-tuned flocking weights and
//      moves them onto each individual as a heritable genome. That stays
//      a small edit only if they all live in one known place.
//
//   2. Stage 5 records which parameters produced each run. Serialising
//      one object is a line; hand-listing constants scattered across five
//      files is a maintenance problem that silently goes stale.

// Written to by the sliders, read by the simulation. Nothing else talks
// to the sliders - this object is the whole interface between the panel
// and the code.
const params = {
  preyCount: 200,
  predatorCount: 3,

  // --- movement limits ---

  // A CAP, not a setting. Boids always try to move flat out; this is how
  // fast flat out is. Pixels per SECOND, not per frame.
  maxSpeed: 100,

  // The strongest steering force a boid can apply, in pixels per second
  // per second. This is its turning ability: a force capped here cannot
  // instantly reverse a velocity, so every turn has to be an arc.
  //
  // Small  = ponderous, wide sweeping turns.
  // Large  = twitchy, snaps to new headings.
  // Not on a slider yet, but it is one line to add if it is worth playing with.
  maxForce: 200,

  // --- flocking ---

  // How far a boid can see, in pixels. Nothing outside this radius exists
  // as far as that boid is concerned - there is no global view anywhere
  // in this simulation.
  perceptionRadius: 60,

  // How loudly each rule speaks when the forces are summed. Separation
  // gets its own weight when it arrives.
  //
  // These weights are the hand-tuned magic numbers the plan deletes in
  // stage 4, replacing them with values each boid inherits and mutates.
  alignmentWeight: 1.0,
  cohesionWeight: 1.0,
};

// How big a triangle is, in pixels. Used by the renderer to draw one, and
// by the wrapping logic to decide when a boid is fully off screen.
const SIZE = 10;
