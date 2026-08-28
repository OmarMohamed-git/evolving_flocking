'use strict';

const COLOURS = {
  background: '#0b0f14',
  prey: '#7fd4ff',
  predator: '#ff5c5c',
  selected: '#ffe066',
  neighbour: '#ffffff',
  perceptionRing: 'rgba(255, 224, 102, 0.55)',
  separationRing: 'rgba(255, 122, 184, 0.45)',
  neighbourLink: 'rgba(255, 224, 102, 0.30)',
  velocity: '#c9d6e3',
  alignment: '#5cff9d',
  cohesion: '#c98bff',
  separation: '#ff7ab8',
};

const ARROW_HEAD_LENGTH = 6;
const VELOCITY_ARROW_SCALE = 0.45;
const FORCE_ARROW_SCALE = 0.55;
const SHORTEST_VISIBLE_ARROW = 3;

function drawScene(ctx, selectedBoid) {
  clearCanvas(ctx);
  drawPopulation(ctx, world.prey, COLOURS.prey);
  drawPopulation(ctx, world.predators, COLOURS.predator);

  if (selectedBoid && world.preyGrid) drawInspector(ctx, selectedBoid);
}

function clearCanvas(ctx) {
  ctx.fillStyle = COLOURS.background;
  ctx.fillRect(0, 0, world.width, world.height);
}

function drawPopulation(ctx, population, colour) {
  ctx.fillStyle = colour;
  for (const boid of population) drawBoid(ctx, boid);
}

function drawBoid(ctx, boid) {
  ctx.save();
  ctx.translate(boid.position.x, boid.position.y);
  ctx.rotate(boid.velocity.angle);

  ctx.beginPath();
  ctx.moveTo(BOID_SIZE, 0);
  ctx.lineTo(-BOID_SIZE * 0.6, BOID_SIZE * 0.6);
  ctx.lineTo(-BOID_SIZE * 0.6, -BOID_SIZE * 0.6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawInspector(ctx, boid) {
  const neighbours = neighboursOf(boid, world.preyGrid);

  drawPerceptionRings(ctx, boid);
  drawNeighbourLinks(ctx, boid, neighbours);
  drawNeighbours(ctx, neighbours);
  drawSteeringArrows(ctx, boid, neighbours);

  ctx.fillStyle = COLOURS.selected;
  drawBoid(ctx, boid);
}

function drawPerceptionRings(ctx, boid) {
  ctx.setLineDash([5, 5]);
  ctx.lineWidth = 1.5;

  drawRing(ctx, boid.position, params.perceptionRadius, COLOURS.perceptionRing);
  drawRing(ctx, boid.position, params.separationRadius, COLOURS.separationRing);

  ctx.setLineDash([]);
}

function drawRing(ctx, centre, radius, colour) {
  ctx.strokeStyle = colour;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawNeighbourLinks(ctx, boid, neighbours) {
  ctx.strokeStyle = COLOURS.neighbourLink;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (const neighbour of neighbours) {
    const seenAt = boid.position.plus(neighbour.offset);
    ctx.moveTo(boid.position.x, boid.position.y);
    ctx.lineTo(seenAt.x, seenAt.y);
  }

  ctx.stroke();
}

function drawNeighbours(ctx, neighbours) {
  ctx.fillStyle = COLOURS.neighbour;
  for (const neighbour of neighbours) drawBoid(ctx, neighbour.other);
}

function drawSteeringArrows(ctx, boid, neighbours) {
  drawArrow(ctx, boid.position, boid.velocity, COLOURS.velocity, VELOCITY_ARROW_SCALE);

  const forces = [
    [alignmentForce(boid, neighbours).times(params.alignmentWeight), COLOURS.alignment],
    [cohesionForce(boid, neighbours).times(params.cohesionWeight), COLOURS.cohesion],
    [separationForce(boid, neighbours).times(params.separationWeight), COLOURS.separation],
  ];

  for (const [force, colour] of forces) {
    drawArrow(ctx, boid.position, force, colour, FORCE_ARROW_SCALE);
  }
}

function drawArrow(ctx, origin, vector, colour, scale) {
  const length = vector.length * scale;
  if (length < SHORTEST_VISIBLE_ARROW) return;

  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(vector.angle);
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.lineTo(length - ARROW_HEAD_LENGTH, ARROW_HEAD_LENGTH * 0.6);
  ctx.lineTo(length - ARROW_HEAD_LENGTH, -ARROW_HEAD_LENGTH * 0.6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
