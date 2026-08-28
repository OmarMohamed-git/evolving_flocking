// =====================================================================
// world.js - the populations, and one step of simulated time
// =====================================================================
//
// PROVIDES: world, syncPopulation, update
// NEEDS:    makeBoid and moveAll (agent.js), params (config.js)
//
// The world owns everything that exists and decides what happens each
// tick. Later it also gains the spatial grid that answers "who is near
// this boid" without comparing every pair.
//
// It holds its own width and height rather than reading them off the
// canvas. That keeps the simulation independent of anything being drawn -
// which is what stage 5's headless mode needs, where there is no canvas
// at all. main.js pushes the size in whenever the window resizes.

const world = {
  width: 0,
  height: 0,

  // Two separate lists rather than one list with a `type: 'prey'` field
  // on each agent.
  //
  // The single-list version means every loop starts with a filter or an
  // if, and the two species diverge fast: predators get their own speed,
  // their own steering, and eventually their own genome. Keeping them
  // apart now means those differences have somewhere to live later.
  //
  // The cost is that anything both species do has to be written to work
  // on either list - which is why the functions here and in agent.js take
  // a list as an argument instead of reaching for a global.
  prey: [],
  predators: [],
};

// Grow or shrink a population until it matches its slider.
//
// The obvious version - empty the array and rebuild it - would work, but
// 'input' fires on every pixel of slider drag. Dragging from 200 to 400
// would rebuild the whole population dozens of times, and every boid on
// screen would be scrapped and replaced with each twitch.
//
// Adding and removing only the difference means the boids already flying
// carry on undisturbed, and only the newcomers are new.
function syncPopulation(list, target) {
  while (list.length > target) list.pop();
  while (list.length < target) list.push(makeBoid());
}

// One step of simulated time. dt is how many SECONDS passed.
//
// Both species run through the same function because right now they
// behave identically. The moment predators get their own speed or their
// own steering, this is where they stop sharing it.
function update(dt) {
  moveAll(world.prey, dt);
  moveAll(world.predators, dt);
}
