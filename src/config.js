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
  speed: 100,      // pixels per SECOND, not per frame
};

// How big a triangle is, in pixels. Used by the renderer to draw one, and
// by the wrapping logic to decide when a boid is fully off screen.
const SIZE = 10;
