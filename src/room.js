import { DurableObject } from "cloudflare:workers";

const COLORS = ["red", "blue", "green", "pink", "orange", "yellow", "cyan", "purple", "white", "lime"];
const HATS = new Set(["none", "cap", "crown", "antenna", "beanie", "hardhat", "wizard", "flower", "halo"]);
const MAP_VERSION = "aurora-natural-gemini-dialogue-v64";
const LOCKERS = [
  { id: "medical", x: -29.3, z: -19.4, exitX: -27.7, exitZ: -19.4 },
  { id: "security", x: -19.2, z: -4.5, exitX: -17.6, exitZ: -4.5 },
  { id: "weapons", x: 27, z: 17.2, exitX: 25.4, exitZ: 17.2 },
  { id: "storage", x: -12, z: -19.5, exitX: -10.4, exitZ: -19.5 },
];
const EMERGENCY_BUTTON = { x: 0, z: 0 };
const DOOR_BARRIERS = Object.freeze([{"x":0,"z":6,"w":4.42,"d":0.56},{"x":-5,"z":-6,"w":3.42,"d":0.56},{"x":4,"z":-6,"w":3.42,"d":0.56},{"x":-7,"z":-2,"w":0.56,"d":3.62},{"x":7,"z":3,"w":0.56,"d":3.62},{"x":0,"z":13,"w":4.22,"d":0.56},{"x":-9,"z":18,"w":0.56,"d":3.82},{"x":9,"z":16,"w":0.56,"d":3.82},{"x":-22,"z":18,"w":0.56,"d":3.82},{"x":-27,"z":13,"w":3.82,"d":0.56},{"x":-27,"z":10,"w":3.82,"d":0.56},{"x":-22,"z":2,"w":0.56,"d":3.02},{"x":-21,"z":2,"w":0.56,"d":3.02},{"x":-11,"z":-2,"w":0.56,"d":3.62},{"x":-20,"z":-6,"w":2.82,"d":0.56},{"x":-20,"z":-12,"w":2.82,"d":0.56},{"x":-19,"z":-17,"w":0.56,"d":3.42},{"x":-5,"z":-12,"w":3.42,"d":0.56},{"x":-14,"z":-16,"w":0.56,"d":3.42},{"x":-2,"z":-17,"w":0.56,"d":3.42},{"x":4,"z":-13,"w":3.42,"d":0.56},{"x":2,"z":-17,"w":0.56,"d":3.42},{"x":12,"z":-16,"w":0.56,"d":3.22},{"x":15,"z":-16,"w":0.56,"d":3.22},{"x":24.5,"z":-11,"w":3.02,"d":0.56},{"x":23,"z":3,"w":0.56,"d":3.22},{"x":24.5,"z":-5,"w":3.02,"d":0.56},{"x":26,"z":5,"w":3.22,"d":0.56},{"x":17,"z":16,"w":0.56,"d":3.42},{"x":19,"z":10.5,"w":3.02,"d":0.56},{"x":26,"z":10.5,"w":3.22,"d":0.56},{"x":11,"z":3,"w":0.56,"d":3.42},{"x":21,"z":3,"w":0.56,"d":3.22},{"x":19,"z":8,"w":3.02,"d":0.56},{"x":-23,"z":2,"w":0.56,"d":2.72},{"x":-20,"z":2,"w":0.56,"d":2.72},{"x":-14,"z":-17,"w":0.56,"d":3.12},{"x":20.75,"z":3,"w":0.56,"d":2.92},{"x":23.25,"z":3,"w":0.56,"d":2.92}]);
// クライアントと同じ壁・設備の当たり判定。CPUの壁抜け防止に使用します。
const AI_COLLISION_WALLS = Object.freeze([{"x":-4.65,"z":6,"w":4.7,"d":0.48},{"x":4.65,"z":6,"w":4.7,"d":0.48},{"x":-6.9,"z":-6,"w":0.20000000000000018,"d":0.48},{"x":-0.5,"z":-6,"w":5.4,"d":0.48},{"x":6.4,"z":-6,"w":1.2000000000000002,"d":0.48},{"x":7,"z":-2.45,"w":0.48,"d":7.1},{"x":7,"z":5.45,"w":0.48,"d":1.0999999999999996},{"x":-7,"z":-4.95,"w":0.48,"d":2.1},{"x":-7,"z":2.95,"w":0.48,"d":6.1},{"x":0,"z":23,"w":18,"d":0.48},{"x":-5.6,"z":13,"w":6.8,"d":0.48},{"x":5.6,"z":13,"w":6.8,"d":0.48},{"x":9,"z":13.5,"w":0.48,"d":1},{"x":9,"z":20.5,"w":0.48,"d":5},{"x":-9,"z":14.5,"w":0.48,"d":3},{"x":-9,"z":21.5,"w":0.48,"d":3},{"x":-27,"z":23,"w":10,"d":0.48},{"x":-30.5,"z":13,"w":3,"d":0.48},{"x":-23.5,"z":13,"w":3,"d":0.48},{"x":-22,"z":14.5,"w":0.48,"d":3},{"x":-22,"z":21.5,"w":0.48,"d":3},{"x":-32,"z":18,"w":0.48,"d":10},{"x":-30.5,"z":10,"w":3,"d":0.48},{"x":-23.5,"z":10,"w":3,"d":0.48},{"x":-27,"z":2,"w":10,"d":0.48},{"x":-22,"z":6.8,"w":0.48,"d":6.4},{"x":-32,"z":6,"w":0.48,"d":8},{"x":-16,"z":2,"w":10,"d":0.48},{"x":-14.75,"z":-6,"w":7.5,"d":0.48},{"x":-11,"z":-4.95,"w":0.48,"d":2.1},{"x":-11,"z":0.9500000000000002,"w":0.48,"d":2.1},{"x":-21,"z":-2.8,"w":0.48,"d":6.4},{"x":-26.25,"z":-12,"w":9.5,"d":0.48},{"x":-25,"z":-22,"w":12,"d":0.48},{"x":-19,"z":-20.4,"w":0.48,"d":3.2},{"x":-19,"z":-13.6,"w":0.48,"d":3.2},{"x":-31,"z":-17,"w":0.48,"d":10},{"x":-10.4,"z":-12,"w":7.2,"d":0.48},{"x":-2.5999999999999996,"z":-12,"w":1.2000000000000002,"d":0.48},{"x":-8,"z":-22,"w":12,"d":0.48},{"x":-2,"z":-20.4,"w":0.48,"d":3.2},{"x":-2,"z":-13.6,"w":0.48,"d":3.2},{"x":-14,"z":-19.9,"w":0.48,"d":4.2},{"x":-14,"z":-13.1,"w":0.48,"d":2.2},{"x":2.0999999999999996,"z":-13,"w":0.20000000000000018,"d":0.48},{"x":8.9,"z":-13,"w":6.2,"d":0.48},{"x":7,"z":-21,"w":10,"d":0.48},{"x":12,"z":-19.35,"w":0.48,"d":3.3},{"x":12,"z":-13.65,"w":0.48,"d":1.2999999999999998},{"x":2,"z":-19.9,"w":0.48,"d":2.2},{"x":2,"z":-14.1,"w":0.48,"d":2.2},{"x":18.95,"z":-11,"w":7.9,"d":0.48},{"x":20,"z":-19,"w":10,"d":0.48},{"x":25,"z":-15,"w":0.48,"d":8},{"x":15,"z":-18.35,"w":0.48,"d":1.2999999999999998},{"x":15,"z":-12.65,"w":0.48,"d":3.3},{"x":23.65,"z":5,"w":1.2999999999999998,"d":0.48},{"x":31.35,"z":5,"w":7.3,"d":0.48},{"x":30.55,"z":-5,"w":8.9,"d":0.48},{"x":35,"z":0,"w":0.48,"d":10},{"x":23,"z":-1.85,"w":0.48,"d":6.3},{"x":23,"z":4.85,"w":0.48,"d":0.2999999999999998},{"x":23,"z":19.5,"w":12,"d":0.48},{"x":17.2,"z":10.5,"w":0.40000000000000036,"d":0.48},{"x":22.45,"z":10.5,"w":3.7,"d":0.48},{"x":28.35,"z":10.5,"w":1.2999999999999998,"d":0.48},{"x":29,"z":15,"w":0.48,"d":9},{"x":17,"z":12.35,"w":0.48,"d":3.7},{"x":17,"z":18.65,"w":0.48,"d":1.7000000000000002},{"x":14.2,"z":8,"w":6.4,"d":0.48},{"x":20.8,"z":8,"w":0.40000000000000036,"d":0.48},{"x":16,"z":0,"w":10,"d":0.48},{"x":21,"z":0.6499999999999999,"w":0.48,"d":1.2999999999999998},{"x":21,"z":6.35,"w":0.48,"d":3.3},{"x":11,"z":0.6000000000000001,"w":0.48,"d":1.2000000000000002},{"x":11,"z":6.4,"w":0.48,"d":3.2},{"x":-2.025,"z":13,"w":0.15000000000000013,"d":0.48},{"x":2.025,"z":13,"w":0.15000000000000013,"d":0.48},{"x":-2.025,"z":6,"w":0.15000000000000013,"d":0.48},{"x":2.025,"z":6,"w":0.15000000000000013,"d":0.48},{"x":2.1,"z":9.5,"w":0.48,"d":7},{"x":-2.1,"z":9.5,"w":0.48,"d":7},{"x":-15.5,"z":19.9,"w":13,"d":0.48},{"x":-15.5,"z":16.1,"w":13,"d":0.48},{"x":-9,"z":16.175,"w":0.48,"d":0.1499999999999999},{"x":-9,"z":19.825,"w":0.48,"d":0.1499999999999999},{"x":-22,"z":16.175,"w":0.48,"d":0.1499999999999999},{"x":-22,"z":19.825,"w":0.48,"d":0.1499999999999999},{"x":-28.925,"z":13,"w":0.1499999999999999,"d":0.48},{"x":-25.075,"z":13,"w":0.1499999999999999,"d":0.48},{"x":-28.925,"z":10,"w":0.1499999999999999,"d":0.48},{"x":-25.075,"z":10,"w":0.1499999999999999,"d":0.48},{"x":-25,"z":11.5,"w":0.48,"d":3},{"x":-29,"z":11.5,"w":0.48,"d":3},{"x":-21.5,"z":3.6,"w":3,"d":0.48},{"x":-21.5,"z":0.3999999999999999,"w":3,"d":0.48},{"x":-20,"z":0.4750000000000001,"w":0.48,"d":0.15000000000000013},{"x":-20,"z":3.525,"w":0.48,"d":0.15000000000000013},{"x":-23,"z":0.4750000000000001,"w":0.48,"d":0.15000000000000013},{"x":-23,"z":3.525,"w":0.48,"d":0.15000000000000013},{"x":-9,"z":-0.10000000000000009,"w":4,"d":0.48},{"x":-9,"z":-3.9,"w":4,"d":0.48},{"x":-7,"z":-3.825,"w":0.48,"d":0.1499999999999999},{"x":-7,"z":-0.17500000000000004,"w":0.48,"d":0.1499999999999999},{"x":-11,"z":-3.825,"w":0.48,"d":0.1499999999999999},{"x":-11,"z":-0.17500000000000004,"w":0.48,"d":0.1499999999999999},{"x":-21.525,"z":-6,"w":0.15000000000000013,"d":0.48},{"x":-18.475,"z":-6,"w":0.15000000000000013,"d":0.48},{"x":-21.525,"z":-12,"w":0.15000000000000013,"d":0.48},{"x":-18.475,"z":-12,"w":0.15000000000000013,"d":0.48},{"x":-18.4,"z":-9,"w":0.48,"d":6},{"x":-21.6,"z":-9,"w":0.48,"d":6},{"x":-16.5,"z":-15.2,"w":5,"d":0.48},{"x":-16.5,"z":-18.8,"w":5,"d":0.48},{"x":-14,"z":-18.725,"w":0.48,"d":0.15000000000000013},{"x":-14,"z":-15.275,"w":0.48,"d":0.15000000000000013},{"x":-19,"z":-18.725,"w":0.48,"d":0.15000000000000013},{"x":-19,"z":-15.275,"w":0.48,"d":0.15000000000000013},{"x":-6.725,"z":-6,"w":0.15000000000000013,"d":0.48},{"x":-3.275,"z":-6,"w":0.15000000000000013,"d":0.48},{"x":-6.725,"z":-12,"w":0.15000000000000013,"d":0.48},{"x":-3.275,"z":-12,"w":0.15000000000000013,"d":0.48},{"x":-3.2,"z":-9,"w":0.48,"d":6},{"x":-6.8,"z":-9,"w":0.48,"d":6},{"x":0,"z":-15.2,"w":4,"d":0.48},{"x":0,"z":-18.8,"w":4,"d":0.48},{"x":2,"z":-18.725,"w":0.48,"d":0.15000000000000013},{"x":2,"z":-15.275,"w":0.48,"d":0.15000000000000013},{"x":-2,"z":-18.725,"w":0.48,"d":0.15000000000000013},{"x":-2,"z":-15.275,"w":0.48,"d":0.15000000000000013},{"x":2.275,"z":-6,"w":0.15000000000000013,"d":0.48},{"x":5.725,"z":-6,"w":0.15000000000000013,"d":0.48},{"x":2.275,"z":-13,"w":0.15000000000000013,"d":0.48},{"x":5.725,"z":-13,"w":0.15000000000000013,"d":0.48},{"x":5.8,"z":-9.5,"w":0.48,"d":7},{"x":2.2,"z":-9.5,"w":0.48,"d":7},{"x":13.5,"z":-14.3,"w":3,"d":0.48},{"x":13.5,"z":-17.7,"w":3,"d":0.48},{"x":15,"z":-17.625,"w":0.48,"d":0.1499999999999999},{"x":15,"z":-14.375,"w":0.48,"d":0.1499999999999999},{"x":12,"z":-17.625,"w":0.48,"d":0.1499999999999999},{"x":12,"z":-14.375,"w":0.48,"d":0.1499999999999999},{"x":22.825,"z":-5,"w":0.1499999999999999,"d":0.48},{"x":26.175,"z":-5,"w":0.1499999999999999,"d":0.48},{"x":22.825,"z":-11,"w":0.1499999999999999,"d":0.48},{"x":26.175,"z":-11,"w":0.1499999999999999,"d":0.48},{"x":26.25,"z":-8,"w":0.48,"d":6},{"x":22.75,"z":-8,"w":0.48,"d":6},{"x":9,"z":4.8,"w":4,"d":0.48},{"x":9,"z":1.2,"w":4,"d":0.48},{"x":11,"z":1.275,"w":0.48,"d":0.15000000000000013},{"x":11,"z":4.725,"w":0.48,"d":0.15000000000000013},{"x":7,"z":1.275,"w":0.48,"d":0.15000000000000013},{"x":7,"z":4.725,"w":0.48,"d":0.15000000000000013},{"x":22,"z":4.7,"w":2.5,"d":0.48},{"x":22,"z":1.3,"w":2.5,"d":0.48},{"x":23.25,"z":1.375,"w":0.48,"d":0.1499999999999999},{"x":23.25,"z":4.625,"w":0.48,"d":0.1499999999999999},{"x":20.75,"z":1.375,"w":0.48,"d":0.1499999999999999},{"x":20.75,"z":4.625,"w":0.48,"d":0.1499999999999999},{"x":17.325,"z":10.5,"w":0.1499999999999999,"d":0.48},{"x":20.675,"z":10.5,"w":0.1499999999999999,"d":0.48},{"x":17.325,"z":8,"w":0.1499999999999999,"d":0.48},{"x":20.675,"z":8,"w":0.1499999999999999,"d":0.48},{"x":20.75,"z":9.25,"w":0.48,"d":2.5},{"x":17.25,"z":9.25,"w":0.48,"d":2.5},{"x":24.325,"z":10.5,"w":0.1499999999999999,"d":0.48},{"x":27.675,"z":10.5,"w":0.1499999999999999,"d":0.48},{"x":24.325,"z":5,"w":0.1499999999999999,"d":0.48},{"x":27.675,"z":5,"w":0.1499999999999999,"d":0.48},{"x":27.75,"z":7.75,"w":0.48,"d":5.5},{"x":24.25,"z":7.75,"w":0.48,"d":5.5},{"x":13,"z":17.8,"w":8,"d":0.48},{"x":13,"z":14.2,"w":8,"d":0.48},{"x":17,"z":14.275,"w":0.48,"d":0.15000000000000013},{"x":17,"z":17.725,"w":0.48,"d":0.15000000000000013},{"x":9,"z":14.275,"w":0.48,"d":0.15000000000000013},{"x":9,"z":17.725,"w":0.48,"d":0.15000000000000013}]);
const AI_COLLISION_PROPS = Object.freeze([{"x":-18,"z":-2,"w":1.8,"d":1.6},{"x":-10.5,"z":-14.5,"w":1.6,"d":1.6},{"x":-5.2,"z":-19.2,"w":1.8,"d":1.5},{"x":18.2,"z":-16.8,"w":1.6,"d":1.6},{"x":25.5,"z":13,"w":1.5,"d":1.5},{"x":-29.3,"z":-19.4,"w":1.15,"d":0.9},{"x":-19.2,"z":-4.5,"w":1.15,"d":0.9},{"x":27,"z":17.2,"w":1.15,"d":0.9},{"x":-12,"z":-19.5,"w":1.15,"d":0.9}]);
const AI_COLLISION_OBJECTS = Object.freeze([...AI_COLLISION_WALLS, ...AI_COLLISION_PROPS]);
const AI_MAP_BOUNDS = Object.freeze({ minX: -33.2, maxX: 35.2, minZ: -22.2, maxZ: 23.2 });

const CARGO_PICKUP = { x: -6, z: -17 };
const CARGO_DELIVERY = { x: 13.2, z: 6.1 };
const SPAWNS = [
  [-4.5, -3.5], [0, -4.5], [4.5, -3.5],
  [-5, 0], [5, 0],
  [-4.5, 3.5], [0, 4.5], [4.5, 3.5],
  [-2.5, -4.5], [2.5, -4.5],
  [-2.5, 4.5], [2.5, 4.5],
];
const TASKS = ["reactor", "engine", "scanner", "security", "wires", "cargo", "comms", "shield", "align", "weapons", "oxygen", "fuel"];
const TASK_LABELS = Object.freeze({
  reactor: "リアクター安定化",
  engine: "エンジン出力調整",
  scanner: "医療スキャン",
  security: "監視カメラ確認",
  wires: "配線修理",
  cargo: "貨物整理",
  comms: "通信周波数調整",
  shield: "シールド同期",
  align: "航路調整",
  weapons: "照準校正",
  oxygen: "酸素フィルター清掃",
  fuel: "燃料補給",
});
const TASK_POSITIONS = Object.freeze({
  reactor: { x: -28, z: 18 },
  engine: { x: -28, z: 6 },
  scanner: { x: -26, z: -17 },
  security: { x: -14, z: -2 },
  wires: { x: -10, z: -17 },
  cargo: CARGO_PICKUP,
  comms: { x: 7, z: -17 },
  shield: { x: 20, z: -15 },
  align: { x: 30, z: 0 },
  weapons: { x: 23, z: 15 },
  oxygen: { x: 2, z: 18 },
  fuel: { x: 16, z: 4 },
});
const SECURITY_ACCESS_POINTS = Object.freeze([{ x: -18, z: -2 }, TASK_POSITIONS.security]);
const SABOTAGE_STATIONS = Object.freeze({ reactor: "reactor", lights: "wires", comms: "comms" });
const DEFAULT_SETTINGS = {
  impostors: 1,
  tasks: 6,
  speed: 1,
  killCooldown: 15,
  meetingTime: 45,
  revealRoles: false,
};

const pointHitsDoor = (x, z, radius = 0.58) => DOOR_BARRIERS.some((door) =>
  Math.abs(x - door.x) < door.w / 2 + radius && Math.abs(z - door.z) < door.d / 2 + radius
);
const segmentHitsDoor = (x1, z1, x2, z2, radius = 0.58) => {
  const distance = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(1, Math.ceil(distance / 0.16));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    if (pointHitsDoor(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, radius)) return true;
  }
  return false;
};
const pointHitsAiMap = (x, z, radius = 0.54, doorsLocked = false) => {
  if (x < AI_MAP_BOUNDS.minX || x > AI_MAP_BOUNDS.maxX || z < AI_MAP_BOUNDS.minZ || z > AI_MAP_BOUNDS.maxZ) return true;
  if (AI_COLLISION_OBJECTS.some((object) =>
    Math.abs(x - object.x) < object.w / 2 + radius && Math.abs(z - object.z) < object.d / 2 + radius
  )) return true;
  return doorsLocked && pointHitsDoor(x, z, radius);
};
const segmentHitsAiMap = (x1, z1, x2, z2, radius = 0.54, doorsLocked = false) => {
  const distance = Math.hypot(x2 - x1, z2 - z1);
  const steps = Math.max(1, Math.ceil(distance / 0.13));
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    if (pointHitsAiMap(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, radius, doorsLocked)) return true;
  }
  return false;
};
const AI_GRID_STEP = 0.72;
const aiGridPoint = (column, row) => ({
  x: AI_MAP_BOUNDS.minX + column * AI_GRID_STEP,
  z: AI_MAP_BOUNDS.minZ + row * AI_GRID_STEP,
});
const aiGridColumn = (x) => Math.round((x - AI_MAP_BOUNDS.minX) / AI_GRID_STEP);
const aiGridRow = (z) => Math.round((z - AI_MAP_BOUNDS.minZ) / AI_GRID_STEP);
const aiGridKey = (column, row) => `${column}:${row}`;
const aiHeapPush = (heap, node) => {
  heap.push(node);
  let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (heap[parent].score <= node.score) break;
    heap[index] = heap[parent];
    index = parent;
  }
  heap[index] = node;
};
const aiHeapPop = (heap) => {
  if (!heap.length) return null;
  const root = heap[0];
  const last = heap.pop();
  if (heap.length && last) {
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= heap.length) break;
      const child = right < heap.length && heap[right].score < heap[left].score ? right : left;
      if (heap[child].score >= last.score) break;
      heap[index] = heap[child];
      index = child;
    }
    heap[index] = last;
  }
  return root;
};
const nearestAiGridCell = (point, doorsLocked = false) => {
  const baseColumn = aiGridColumn(point.x);
  const baseRow = aiGridRow(point.z);
  for (let radius = 0; radius <= 8; radius += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dz = -radius; dz <= radius; dz += 1) {
        if (radius > 0 && Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
        const column = baseColumn + dx;
        const row = baseRow + dz;
        const candidate = aiGridPoint(column, row);
        if (!pointHitsAiMap(candidate.x, candidate.z, 0.52, doorsLocked)) return { column, row, ...candidate };
      }
    }
  }
  return null;
};
const pushPlayerOutsideDoors = (player) => {
  for (const door of DOOR_BARRIERS) {
    const radius = 0.64;
    if (Math.abs(player.x - door.x) >= door.w / 2 + radius || Math.abs(player.z - door.z) >= door.d / 2 + radius) continue;
    if (door.w > door.d) {
      const direction = player.z >= door.z ? 1 : -1;
      player.z = door.z + direction * (door.d / 2 + radius + 0.08);
    } else {
      const direction = player.x >= door.x ? 1 : -1;
      player.x = door.x + direction * (door.w / 2 + radius + 0.08);
    }
  }
};
const uid = () => crypto.randomUUID();
const cleanName = (value) => String(value || "Player").replace(/[<>]/g, "").trim().slice(0, 16) || "Player";
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bodyPoint = (player) => ({
  x: Number.isFinite(Number(player?.bodyX)) ? Number(player.bodyX) : Number(player?.x || 0),
  z: Number.isFinite(Number(player?.bodyZ)) ? Number(player.bodyZ) : Number(player?.z || 0),
});
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const shuffled = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const BOT_NAMES = [
  "CPU アオ", "CPU ミドリ", "CPU ユキ", "CPU ソラ", "CPU モモ", "CPU レン",
  "CPU ハル", "CPU ナギ", "CPU リン", "CPU カイ", "CPU ヒカリ"
];
const BOT_PERSONALITIES = Object.freeze([
  "慎重だけど堅苦しくない。迷うと「たぶん」「まだ何とも言えないかな」と話す",
  "フランクで短め。「うん」「いや」「〜だと思うよ」と友達のように話す",
  "見たことを率直に話す。「〜は見た」「でもそこから先は分からない」と区切る",
  "少し考えながら話す。「えっと」「たしか」を時々使うが、毎回は使わない",
  "落ち着いて柔らかい。「そうだね」「〜じゃないかな」と周りにも話を振る",
]);
const botPersonalityFor = (bot) => {
  const source = String(bot?.name || bot?.id || "CPU");
  let hash = 0;
  for (const char of source) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return BOT_PERSONALITIES[hash % BOT_PERS…21747 tokens truncated…his.votes.size, total: aliveCount });
    if (this.votes.size >= aliveCount) await this.finishMeeting();
  }

  async finishMeeting() {
    if (this.phase !== "meeting") return;
    const tally = new Map();
    for (const target of this.votes.values()) tally.set(target, (tally.get(target) || 0) + 1);

    let top = "skip";
    let max = -1;
    let tie = false;
    for (const [target, count] of tally) {
      if (count > max) {
        top = target;
        max = count;
        tie = false;
      } else if (count === max) {
        tie = true;
      }
    }

    let ejected = null;
    if (!tie && top !== "skip") {
      const target = this.players.get(top);
      if (target?.alive) {
        target.alive = false;
        target.carryingCargo = false;
        ejected = {
          id: target.id,
          name: target.name,
          role: undefined,
        };
      }
    }

    this.phase = "playing";
    this.meetingEndsAt = 0;
    this.pendingClientAiRequests.clear();
    this.votes.clear();
    for (const item of this.players.values()) {
      item.meetingEligible = true;
      item.aiVoteAt = 0;
      item.aiMeetingSpoken = false;
      item.aiPendingReplies = [];
      item.aiLastMeetingReplyAt = 0;
      item.aiReplyInFlight = false;
      item.aiAwaitingClientRequestId = null;
      if (!item.alive) item.reported = true;
      if (item.aiSuspectId && (!this.players.get(item.aiSuspectId)?.alive || Math.random() < 0.35)) item.aiSuspectId = null;
    }
    this.meetingChatHistory = [];
    await this.ctx.storage.deleteAlarm();
    await this.persist();
    this.broadcast({ type: "meetingEnded", ejected });
    this.syncAll();
    await this.checkWin();
  }

  chat(player, message) {
    const text = String(message.text || "").replace(/[<>]/g, "").trim().slice(0, 120);
    const clientMessageId = String(message.clientMessageId || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
    const rejectChat = (reason) => this.send(player.id, { type: "chatError", clientMessageId, message: reason });
    if (!this.sessions.has(player.id)) return;
    if (!text) { rejectChat("メッセージを入力してください。"); return; }
    if (this.phase === "meeting" && (!player.alive || player.meetingEligible === false)) {
      rejectChat("死亡者や会議途中の参加者は会議チャットへ送信できません。");
      return;
    }
    const now = Date.now();
    if (player.lastChatAt && now - player.lastChatAt < 350) {
      rejectChat("送信間隔が短すぎます。少し待ってから送信してください。");
      return;
    }
    player.lastChatAt = now;
    const payload = { type: "chat", from: player.name, fromId: player.id, text, alive: player.alive, phase: this.phase, bot: Boolean(player.isBot), clientMessageId };
    if (this.phase === "meeting") this.recordMeetingChatLine(player.name, text, Boolean(player.isBot));
    if (this.phase === "meeting" && !player.isBot) {
      const task = this.queueBotMeetingReplies(player, text).catch((error) => console.warn("CPU meeting reply failed", error));
      this.ctx.waitUntil(task);
    }
    if (this.phase === "playing" && !player.alive) {
      for (const target of this.players.values()) {
        if (!target.alive && this.sessions.has(target.id)) this.send(target.id, payload);
      }
      this.send(player.id, { type: "chatAck", clientMessageId });
      return;
    }
    this.broadcast(payload);
    this.send(player.id, { type: "chatAck", clientMessageId });
  }

  voiceSignal(player, message) {
    if (!message.signal || !this.sessions.has(player.id) || !player.alive || this.phase === "meeting") return;
    const targetId = String(message.targetId || "");
    const target = this.players.get(targetId);
    if (!targetId || targetId === player.id || !target?.alive || !this.sessions.has(targetId)) {
      this.send(player.id, { type: "callControl", fromId: targetId, action: "unavailable" });
      return;
    }
    this.send(targetId, { type: "voiceSignal", fromId: player.id, signal: message.signal });
  }

  voiceAudio(player, message) {
    if (!player.alive || this.phase === "meeting") return;
    const targetId = String(message.targetId || "");
    const data = typeof message.data === "string" ? message.data : "";
    if (!targetId || targetId === player.id || !data || data.length > 16000) return;
    const target = this.players.get(targetId);
    if (!target?.alive || !this.sessions.has(targetId)) {
      this.send(player.id, { type: "callControl", fromId: targetId, action: "unavailable" });
      return;
    }
    const rate = clamp(Number(message.rate) || 16000, 8000, 24000);
    const seq = Math.max(0, Math.floor(Number(message.seq) || 0));
    this.send(targetId, { type: "voiceAudio", fromId: player.id, rate, seq, data });
  }

  meetingVoiceAudio(player, message) {
    if (this.phase !== "meeting" || !player.alive || player.meetingEligible === false || !this.sessions.has(player.id)) return;
    const data = typeof message.data === "string" ? message.data : "";
    if (!data || data.length > 16000) return;
    const now = Date.now();
    if (player.lastMeetingVoiceAt && now - player.lastMeetingVoiceAt < 55) return;
    player.lastMeetingVoiceAt = now;
    const rate = clamp(Number(message.rate) || 16000, 8000, 24000);
    const seq = Math.max(0, Math.floor(Number(message.seq) || 0));
    for (const target of this.players.values()) {
      if (target.id === player.id || !target.alive || target.meetingEligible === false || !this.sessions.has(target.id)) continue;
      this.send(target.id, {
        type: "meetingVoiceAudio",
        fromId: player.id,
        from: player.name,
        rate,
        seq,
        data,
      });
    }
  }

  async groupVoiceControl(player, message) {
    if (!this.sessions.has(player.id)) return;
    const action = String(message.action || "");
    if (action === "join") {
      if (!player.alive || player.spectator || this.phase === "meeting") {
        player.groupVoiceJoined = false;
      } else player.groupVoiceJoined = true;
    } else if (action === "leave") player.groupVoiceJoined = false;
    else return;
    await this.persist();
    const participantCount = [...this.players.values()].filter((item) => item.alive && !item.spectator && item.groupVoiceJoined && this.sessions.has(item.id)).length;
    for (const target of this.players.values()) {
      if (!this.sessions.has(target.id)) continue;
      this.send(target.id, {
        type: "groupVoiceStatus",
        joined: Boolean(target.groupVoiceJoined),
        participantCount,
      });
    }
  }

  groupVoiceAudio(player, message) {
    if (this.phase === "meeting" || !player.alive || player.spectator || !this.sessions.has(player.id) || !player.groupVoiceJoined) return;
    const data = typeof message.data === "string" ? message.data : "";
    if (!data || data.length > 16000) return;
    const now = Date.now();
    if (player.lastGroupVoiceAt && now - player.lastGroupVoiceAt < 48) return;
    player.lastGroupVoiceAt = now;
    const rate = clamp(Number(message.rate) || 16000, 8000, 24000);
    const seq = Math.max(0, Math.floor(Number(message.seq) || 0));
    for (const target of this.players.values()) {
      if (target.id === player.id || !target.alive || target.spectator || !this.sessions.has(target.id) || !target.groupVoiceJoined) continue;
      this.send(target.id, {
        type: "groupVoiceAudio",
        fromId: player.id,
        from: player.name,
        rate,
        seq,
        data,
      });
    }
  }

  callControl(player, message) {
    const targetId = String(message.targetId || "");
    const action = String(message.action || "");
    if (!targetId || targetId === player.id || !["ring", "accept", "decline", "busy", "hangup", "relay"].includes(action)) return;
    const target = this.players.get(targetId);
    if (!player.alive || this.phase === "meeting" || !target?.alive || !this.sessions.has(targetId)) {
      if (action === "ring" || action === "accept") this.send(player.id, { type: "callControl", fromId: targetId, action: "unavailable" });
      return;
    }
    this.send(targetId, { type: "callControl", fromId: player.id, action });
  }

  async startSabotage(player, message) {
    if (this.phase !== "playing" || !player.alive || player.role !== "impostor" || this.sabotage) return;
    const kind = ["lights", "reactor", "comms", "doors"].includes(message.kind) ? message.kind : "lights";
    const duration = kind === "reactor" ? 30 : kind === "doors" ? 12 : 25;
    this.sabotage = { kind, endsAt: Date.now() + duration * 1000 };
    if (kind === "doors") {
      for (const target of this.players.values()) {
        if (target.alive) pushPlayerOutsideDoors(target);
      }
    }
    await this.ctx.storage.setAlarm(this.sabotage.endsAt);
    await this.persist();
    this.broadcast({ type: "sabotage", sabotage: this.sabotage });
    this.syncAll();
  }

  async fixSabotage(player, message) {
    if (this.phase !== "playing" || !player.alive || !this.sabotage) return;
    const requiredStation = SABOTAGE_STATIONS[this.sabotage.kind];
    if (!requiredStation || String(message.station || "") !== requiredStation) {
      this.send(player.id, { type: "error", message: "この端末では妨害を修理できません。" });
      return;
    }
    const point = TASK_POSITIONS[requiredStation];
    if (!point || Math.hypot(player.x - point.x, player.z - point.z) > 3.6) {
      this.send(player.id, { type: "error", message: "修理端末の近くで操作してください。" });
      return;
    }
    this.sabotage = null;
    await this.ctx.storage.deleteAlarm();
    await this.persist();
    this.broadcast({ type: "sabotageFixed" });
    this.syncAll();
  }

  async customize(player, message) {
    if (this.phase !== "lobby") return;
    const color = String(message.color || "");
    if (COLORS.includes(color)) player.color = color;
    const requestedHat = String(message.hat || "none").replace(/[^a-z0-9_-]/gi, "").slice(0, 12) || "none";
    player.hat = HATS.has(requestedHat) ? requestedHat : "none";
    await this.persist();
    this.syncAll();
  }

  async revive(player, message) {
    if (this.phase !== "playing" || !player.alive || player.role !== "doctor" || player.abilityUsed) return;
    const target = this.players.get(String(message.targetId || ""));
    if (!target || target.alive || target.reported || target.spectator || !target.downedAt || dist(player, bodyPoint(target)) > 2.8) return;
    if (Date.now() - target.downedAt > 20000) {
      this.send(player.id, { type: "error", message: "救助可能時間を過ぎています。" });
      return;
    }
    const reviveAt = bodyPoint(target);
    target.alive = true;
    target.reported = false;
    target.x = reviveAt.x;
    target.z = reviveAt.z;
    target.rotation = Number(target.bodyRotation || target.rotation || 0);
    target.downedAt = 0;
    target.bodyX = null;
    target.bodyZ = null;
    target.bodyRotation = 0;
    player.abilityUsed = true;
    await this.persist();
    this.broadcast({ type: "abilityResult", message: `${player.name}が${target.name}を救助しました。` });
    this.syncAll();
  }

  async protect(player, message) {
    if (this.phase !== "playing" || !player.alive || player.role !== "guard" || player.abilityUsed) return;
    const target = this.players.get(String(message.targetId || ""));
    if (!target || target.id === player.id || !target.alive || target.spectator || dist(player, target) > 2.8) return;
    target.shielded = true;
    player.abilityUsed = true;
    await this.persist();
    this.send(player.id, { type: "abilityResult", message: `${target.name}にシールドを付与しました。` });
    this.send(target.id, { type: "abilityResult", message: "警備員からシールドを付与されました。" });
    this.syncAll();
  }

  async inspect(player, message) {
    if (this.phase !== "playing" || !player.alive || player.role !== "detective" || player.abilityUsed) return;
    const target = this.players.get(String(message.targetId || ""));
    if (!target || target.alive || target.spectator || dist(player, bodyPoint(target)) > 3.2) return;
    player.abilityUsed = true;
    const clue = target.role === "impostor" ? "人狼の痕跡があります。" : "クルー側の痕跡です。";
    this.send(player.id, { type: "abilityResult", message: clue });
    await this.persist();
    this.syncAll();
  }

  async toggleHide(player, message = {}) {
    if (this.phase !== "playing" || !player.alive || player.spectator) return;
    if (player.hidden) {
      const locker = LOCKERS.find((item) => item.id === player.hiddenAt);
      if (!locker) return;
      player.hidden = false;
      player.hiddenAt = null;
      player.x = locker.exitX;
      player.z = locker.exitZ;
      await this.persist();
      this.send(player.id, { type: "abilityResult", message: "ロッカーから出ました。" });
      this.syncAll();
      return;
    }
    const locker = LOCKERS.find((item) => item.id === String(message.lockerId || ""));
    if (!locker || Math.hypot(player.x - locker.exitX, player.z - locker.exitZ) > 2.2) {
      this.send(player.id, { type: "abilityResult", message: "ロッカーの近くまで移動してください。" });
      return;
    }
    const occupied = [...this.players.values()].some((item) => item.id !== player.id && item.hidden && item.hiddenAt === locker.id);
    if (occupied) {
      this.send(player.id, { type: "abilityResult", message: "このロッカーには先客がいます。" });
      return;
    }
    player.hidden = true;
    player.hiddenAt = locker.id;
    player.x = locker.x;
    player.z = locker.z;
    player.rotation = 0;
    await this.persist();
    this.send(player.id, { type: "abilityResult", message: "ロッカーの中に隠れました。外からは見えません。" });
    this.syncAll();
  }

  async moderate(player, message) {
    if (player.id !== this.hostId) return;
    const targetId = String(message.targetId || "");
    if (!targetId || targetId === player.id || !this.players.has(targetId)) return;
    const target = this.players.get(targetId);
    if (target?.isBot) {
      this.players.delete(targetId);
      this.votes.delete(targetId);
      await this.persist();
      this.syncAll();
      return;
    }
    this.send(targetId, { type: "error", message: "ホストによってルームから退出されました。" });
    try { this.sessions.get(targetId)?.close(4001, "Removed by host"); } catch {}
    await this.disconnect(targetId);
  }

  async checkWin({ tasksOnly = false } = {}) {
    if (this.phase === "finished") return;
    const allPlayers = [...this.players.values()];
    const activeCrew = allPlayers.filter((item) => item.alive && item.role !== "impostor" && !item.spectator);
    const tasksComplete = activeCrew.length > 0 && activeCrew.every((item) => item.tasks.length > 0 && item.tasksDone >= item.tasks.length);

    // タスク完了メッセージでは、タスク勝利だけを判定します。
    // 人数差による侵入者勝利は、攻撃・追放・退出などで人数が変わった時だけ判定します。
    if (tasksComplete) {
      await this.finish("crew");
      return;
    }
    if (this.practiceMode || tasksOnly) return;

    const alive = allPlayers.filter((item) => item.alive && !item.spectator);
    const impostors = alive.filter((item) => item.role === "impostor").length;
    const crew = alive.filter((item) => item.role !== "impostor" && !item.spectator).length;
    if (impostors === 0) {
      await this.finish("crew");
    } else if (crew === 0) {
      // 人狼は人数が同数になっただけでは勝利しません。
      // 生存しているクルーを最後の1人まで倒した時点でのみ勝利します。
      await this.finish("impostor");
    }
  }

  async finish(winner) {
    if (this.phase === "finished") return;
    this.phase = "finished";
    this.pendingClientAiRequests.clear();
    this.winner = winner;
    this.sabotage = null;
    this.meetingEndsAt = 0;
    await this.ctx.storage.deleteAlarm();
    await this.persist();
    this.broadcast({ type: "gameFinished", winner });
    this.syncAll();
  }

  async returnLobby(player) {
    if (player.id !== this.hostId || this.phase !== "finished") return;
    this.phase = "lobby";
    this.winner = null;
    this.sabotage = null;
    this.meetingEndsAt = 0;
    this.practiceMode = false;
    this.votes.clear();
    for (const item of this.players.values()) {
      Object.assign(item, {
        alive: true,
        role: "crew",
        tasks: [],
        completedTasks: new Set(),
        tasksDone: 0,
        emergencyUsed: false,
        lastKillAt: 0,
        reported: false,
        spectator: false,
        meetingEligible: true,
        hidden: false,
        hiddenAt: null,
        carryingCargo: false,
        shielded: false,
        abilityUsed: false,
        downedAt: 0,
        bodyX: null,
        bodyZ: null,
        bodyRotation: 0,
        aiPath: [],
        aiGoalKey: "",
        aiActionKey: "",
        aiActionAt: 0,
        aiVoteAt: 0,
        aiMeetingSpoken: false,
        aiAwaitingClientRequestId: null,
        aiSuspectId: null,
        aiSeen: {},
        aiNextObservationAt: 0,
        aiNextSabotageAt: Date.now() + 38000 + Math.random() * 26000,
      });
    }
    await this.ctx.storage.deleteAlarm();
    await this.persist();
    this.syncAll();
  }

  async disconnect(id) {
    this.sessions.delete(id);
    if (!this.players.has(id)) return;

    this.players.delete(id);
    this.votes.delete(id);
    this.hostId = this.pickHumanHost(this.hostId === id ? null : this.hostId);

    const hasConnectedHuman = [...this.players.values()].some((player) => !player.isBot && this.sessions.has(player.id));
    if (!hasConnectedHuman) {
      await this.resetEmptyRoom();
      this.syncAll();
      return;
    }
    await this.persist();
    this.syncAll();
    if (this.phase === "playing") await this.checkWin();
    if (this.phase === "meeting") {
      const aliveCount = [...this.players.values()].filter((item) => item.alive && item.meetingEligible !== false).length;
      if (this.votes.size >= aliveCount) await this.finishMeeting();
    }
  }

  async alarm() {
    await this.ready;
    if (this.phase === "meeting" && this.meetingEndsAt && Date.now() >= this.meetingEndsAt) {
      await this.finishMeeting();
      return;
    }

    if (this.sabotage && Date.now() >= this.sabotage.endsAt) {
      if (this.sabotage.kind === "reactor") {
        await this.finish("impostor");
      } else {
        this.sabotage = null;
        await this.persist();
        this.broadcast({ type: "sabotageFixed" });
        this.syncAll();
      }
    }
  }
}
