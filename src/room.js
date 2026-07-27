import { DurableObject } from "cloudflare:workers";

const COLORS = ["red", "blue", "green", "pink", "orange", "yellow", "cyan", "purple", "white", "lime"];
const HATS = new Set(["none", "cap", "crown", "antenna", "beanie", "hardhat", "wizard", "flower", "halo"]);
const MAP_VERSION = "aurora-ai-cpu-meeting-talk-v57";
const LOCKERS = [
  { id: "medical", x: -29.3, z: -19.4, exitX: -27.7, exitZ: -19.4 },
  { id: "security", x: -19.2, z: -4.5, exitX: -17.6, exitZ: -4.5 },
  { id: "weapons", x: 27, z: 17.2, exitX: 25.4, exitZ: 17.2 },
  { id: "storage", x: -12, z: -19.5, exitX: -10.4, exitZ: -19.5 },
];
const EMERGENCY_BUTTON = { x: 0, z: 0 };
const DOOR_BARRIERS = Object.freeze([{"x":0,"z":6,"w":4.42,"d":0.56},{"x":-5,"z":-6,"w":3.42,"d":0.56},{"x":4,"z":-6,"w":3.42,"d":0.56},{"x":-7,"z":-2,"w":0.56,"d":3.62},{"x":7,"z":3,"w":0.56,"d":3.62},{"x":0,"z":13,"w":4.22,"d":0.56},{"x":-9,"z":18,"w":0.56,"d":3.82},{"x":9,"z":16,"w":0.56,"d":3.82},{"x":-22,"z":18,"w":0.56,"d":3.82},{"x":-27,"z":13,"w":3.82,"d":0.56},{"x":-27,"z":10,"w":3.82,"d":0.56},{"x":-22,"z":2,"w":0.56,"d":3.02},{"x":-21,"z":2,"w":0.56,"d":3.02},{"x":-11,"z":-2,"w":0.56,"d":3.62},{"x":-20,"z":-6,"w":2.82,"d":0.56},{"x":-20,"z":-12,"w":2.82,"d":0.56},{"x":-19,"z":-17,"w":0.56,"d":3.42},{"x":-5,"z":-12,"w":3.42,"d":0.56},{"x":-14,"z":-16,"w":0.56,"d":3.42},{"x":-2,"z":-17,"w":0.56,"d":3.42},{"x":4,"z":-13,"w":3.42,"d":0.56},{"x":2,"z":-17,"w":0.56,"d":3.42},{"x":12,"z":-16,"w":0.56,"d":3.22},{"x":15,"z":-16,"w":0.56,"d":3.22},{"x":24.5,"z":-11,"w":3.02,"d":0.56},{"x":23,"z":3,"w":0.56,"d":3.22},{"x":24.5,"z":-5,"w":3.02,"d":0.56},{"x":26,"z":5,"w":3.22,"d":0.56},{"x":17,"z":16,"w":0.56,"d":3.42},{"x":19,"z":10.5,"w":3.02,"d":0.56},{"x":26,"z":10.5,"w":3.22,"d":0.56},{"x":11,"z":3,"w":0.56,"d":3.42},{"x":21,"z":3,"w":0.56,"d":3.22},{"x":19,"z":8,"w":3.02,"d":0.56},{"x":-23,"z":2,"w":0.56,"d":2.72},{"x":-20,"z":2,"w":0.56,"d":2.72},{"x":-14,"z":-17,"w":0.56,"d":3.12},{"x":20.75,"z":3,"w":0.56,"d":2.92},{"x":23.25,"z":3,"w":0.56,"d":2.92}]);
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
const AI_ZONES = Object.freeze([
  { id: "hub", x: 0, z: 0, w: 14, d: 12 },
  { id: "atrium", x: 0, z: 18, w: 18, d: 10 },
  { id: "reactorRoom", x: -27, z: 18, w: 10, d: 10 },
  { id: "engineRoom", x: -27, z: 6, w: 10, d: 8 },
  { id: "securityRoom", x: -16, z: -2, w: 10, d: 8 },
  { id: "medicalRoom", x: -25, z: -17, w: 12, d: 10 },
  { id: "storageRoom", x: -8, z: -17, w: 12, d: 10 },
  { id: "commsRoom", x: 7, z: -17, w: 10, d: 8 },
  { id: "shieldRoom", x: 20, z: -15, w: 10, d: 8 },
  { id: "navigationRoom", x: 29, z: 0, w: 12, d: 10 },
  { id: "weaponsRoom", x: 23, z: 15, w: 12, d: 9 },
  { id: "adminRoom", x: 16, z: 4, w: 10, d: 8 },
  { id: "c-hub-north", x: 0, z: 9.5, w: 4.2, d: 7 },
  { id: "c-reactor-atrium", x: -15.5, z: 18, w: 13, d: 3.8 },
  { id: "c-reactor-engine", x: -27, z: 11.5, w: 4, d: 3 },
  { id: "c-engine-security", x: -21.5, z: 2, w: 3, d: 3.2 },
  { id: "c-security-hub", x: -9, z: -2, w: 4, d: 3.8 },
  { id: "c-security-medical", x: -20, z: -9, w: 3.2, d: 6 },
  { id: "c-medical-storage", x: -16.5, z: -17, w: 5, d: 3.6 },
  { id: "c-hub-storage", x: -5, z: -9, w: 3.6, d: 6 },
  { id: "c-storage-comms", x: 0, z: -17, w: 4, d: 3.6 },
  { id: "c-hub-comms", x: 4, z: -9.5, w: 3.6, d: 7 },
  { id: "c-comms-shield", x: 13.5, z: -16, w: 3, d: 3.4 },
  { id: "c-shield-navigation", x: 24.5, z: -8, w: 3.5, d: 6 },
  { id: "c-hub-admin", x: 9, z: 3, w: 4, d: 3.6 },
  { id: "c-admin-navigation", x: 22, z: 3, w: 2.5, d: 3.4 },
  { id: "c-admin-weapons", x: 19, z: 9.25, w: 3.5, d: 2.5 },
  { id: "c-weapons-navigation", x: 26, z: 7.75, w: 3.5, d: 5.5 },
  { id: "c-atrium-weapons", x: 13, z: 16, w: 8, d: 3.6 },
]);
const AI_ZONE_LABELS = Object.freeze({
  hub: "中央ホール", atrium: "アトリウム", reactorRoom: "リアクター室", engineRoom: "エンジン室",
  securityRoom: "セキュリティ室", medicalRoom: "医務室", storageRoom: "倉庫", commsRoom: "通信室",
  shieldRoom: "シールド室", navigationRoom: "ナビゲーション室", weaponsRoom: "武器庫", adminRoom: "管理室",
});
const aiZoneLabel = (player) => {
  const zone = AI_ZONES[nearestAiZoneIndex(player)];
  if (!zone) return "中央付近";
  if (AI_ZONE_LABELS[zone.id]) return AI_ZONE_LABELS[zone.id];
  const nearbyRoom = AI_ZONES
    .filter((candidate) => AI_ZONE_LABELS[candidate.id])
    .sort((a, b) => Math.hypot(player.x - a.x, player.z - a.z) - Math.hypot(player.x - b.x, player.z - b.z))[0];
  return AI_ZONE_LABELS[nearbyRoom?.id] || "通路";
};
const AI_ZONE_INDEX = new Map(AI_ZONES.map((zone, index) => [zone.id, index]));
const AI_ZONE_LINKS = AI_ZONES.map(() => []);
for (let a = 0; a < AI_ZONES.length; a += 1) {
  for (let b = a + 1; b < AI_ZONES.length; b += 1) {
    const first = AI_ZONES[a];
    const second = AI_ZONES[b];
    const gapX = Math.max(0, Math.abs(first.x - second.x) - (first.w + second.w) / 2);
    const gapZ = Math.max(0, Math.abs(first.z - second.z) - (first.d + second.d) / 2);
    const overlapX = Math.min(first.x + first.w / 2, second.x + second.w / 2) - Math.max(first.x - first.w / 2, second.x - second.w / 2);
    const overlapZ = Math.min(first.z + first.d / 2, second.z + second.d / 2) - Math.max(first.z - first.d / 2, second.z - second.d / 2);
    if (gapX <= 1.2 && gapZ <= 1.2 && (overlapX > 0.3 || overlapZ > 0.3)) {
      AI_ZONE_LINKS[a].push(b);
      AI_ZONE_LINKS[b].push(a);
    }
  }
}
const pointInAiZone = (point, zone, margin = 0.35) =>
  point.x >= zone.x - zone.w / 2 + margin && point.x <= zone.x + zone.w / 2 - margin &&
  point.z >= zone.z - zone.d / 2 + margin && point.z <= zone.z + zone.d / 2 - margin;
const nearestAiZoneIndex = (point) => {
  const containing = AI_ZONES.findIndex((zone) => pointInAiZone(point, zone));
  if (containing >= 0) return containing;
  let best = 0;
  let bestDistance = Infinity;
  AI_ZONES.forEach((zone, index) => {
    const distance = Math.hypot(point.x - zone.x, point.z - zone.z);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
};
const buildAiRoute = (from, target) => {
  const start = nearestAiZoneIndex(from);
  const goal = nearestAiZoneIndex(target);
  if (start === goal) return [{ x: target.x, z: target.z }];
  const queue = [start];
  const previous = new Map([[start, -1]]);
  while (queue.length) {
    const current = queue.shift();
    if (current === goal) break;
    for (const next of AI_ZONE_LINKS[current]) {
      if (previous.has(next)) continue;
      previous.set(next, current);
      queue.push(next);
    }
  }
  if (!previous.has(goal)) return [{ x: target.x, z: target.z }];
  const indexes = [];
  for (let current = goal; current !== -1; current = previous.get(current)) indexes.push(current);
  indexes.reverse();
  const route = indexes.slice(1).map((index) => ({ x: AI_ZONES[index].x, z: AI_ZONES[index].z }));
  route.push({ x: target.x, z: target.z });
  return route;
};


export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.sessions = new Map();
    this.players = new Map();
    this.votes = new Map();
    this.roomCode = "";
    this.phase = "lobby";
    this.hostId = null;
    this.winner = null;
    this.sabotage = null;
    this.meetingEndsAt = 0;
    this.practiceMode = false;
    this.settings = { ...DEFAULT_SETTINGS };
    this.moveTicks = 0;
    this.lastAiTickAt = 0;
    this.lastAiPersistAt = 0;
    this.aiTickRunning = false;

    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment();
      if (attachment?.id) this.sessions.set(attachment.id, ws);
    }

    this.ready = this.ctx.blockConcurrencyWhile(async () => {
      const saved = await this.ctx.storage.get("gameState");
      if (saved) this.restoreState(saved);

      // Durable Objectの再起動後に、切断済みプレイヤーだけが保存状態へ
      // 残ることがあります。現在接続中のWebSocketを基準に整理します。
      const connectedIds = new Set(this.sessions.keys());
      for (const [playerId, player] of [...this.players.entries()]) {
        if (!player.isBot && !connectedIds.has(playerId)) this.players.delete(playerId);
      }

      this.hostId = this.pickHumanHost(this.hostId);
      const hasConnectedHuman = [...this.players.values()].some((player) => !player.isBot && connectedIds.has(player.id));
      if (!hasConnectedHuman) {
        await this.resetEmptyRoom();
      } else {
        await this.persist();
      }
    });
  }

  restoreState(saved) {
    this.roomCode = saved.roomCode || "";
    this.phase = saved.phase || "lobby";
    this.hostId = saved.hostId || null;
    this.winner = saved.winner || null;
    this.sabotage = saved.sabotage || null;
    this.meetingEndsAt = Number(saved.meetingEndsAt) || 0;
    this.practiceMode = Boolean(saved.practiceMode);
    this.settings = { ...DEFAULT_SETTINGS, ...(saved.settings || {}) };
    this.players = new Map((saved.players || []).map((p) => [p.id, {
      ...p,
      completedTasks: new Set(p.completedTasks || []),
      carryingCargo: Boolean(p.carryingCargo),
      groupVoiceJoined: Boolean(p.groupVoiceJoined),
      meetingEligible: p.meetingEligible !== false,
      isBot: Boolean(p.isBot),
      aiPath: Array.isArray(p.aiPath) ? p.aiPath : [],
      aiPendingReplies: Array.isArray(p.aiPendingReplies) ? p.aiPendingReplies : [],
    }]));
    this.votes = new Map(saved.votes || []);

    this.hostId = this.pickHumanHost(this.hostId);
  }

  serializableState() {
    return {
      roomCode: this.roomCode,
      phase: this.phase,
      hostId: this.hostId,
      winner: this.winner,
      sabotage: this.sabotage,
      meetingEndsAt: this.meetingEndsAt,
      practiceMode: this.practiceMode,
      mapVersion: MAP_VERSION,
      settings: this.settings,
      players: [...this.players.values()].map((p) => ({
        ...p,
        completedTasks: [...(p.completedTasks || [])],
      })),
      votes: [...this.votes.entries()],
    };
  }

  pickHumanHost(preferredId = null) {
    if (preferredId) {
      const preferred = this.players.get(preferredId);
      if (preferred && !preferred.isBot && this.sessions.has(preferredId)) return preferredId;
    }
    return [...this.players.values()].find((player) => !player.isBot && this.sessions.has(player.id))?.id || null;
  }

  async persist() {
    await this.ctx.storage.put("gameState", this.serializableState());
  }

  async resetEmptyRoom() {
    this.players.clear();
    this.votes.clear();
    this.phase = "lobby";
    this.hostId = null;
    this.winner = null;
    this.sabotage = null;
    this.meetingEndsAt = 0;
    this.practiceMode = false;
    this.settings = { ...DEFAULT_SETTINGS };
    await this.ctx.storage.deleteAlarm();
    await this.persist();
  }

  async fetch(request) {
    await this.ready;

    // 誰も接続していないのに前回の進行状態が残っている場合は、
    // 新しい参加者を受け入れる前にロビーへ自動復帰します。
    if (this.sessions.size === 0 && this.players.size === 0 && this.phase !== "lobby") {
      await this.resetEmptyRoom();
    }

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const url = new URL(request.url);
    const requestedRoom = String(url.searchParams.get("room") || "").toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(requestedRoom)) {
      return new Response("Invalid room code", { status: 400 });
    }

    if (this.roomCode && this.roomCode !== requestedRoom) {
      return new Response("Room mismatch", { status: 409 });
    }
    this.roomCode ||= requestedRoom;

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const id = uid();

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id });
    this.sessions.set(id, server);
    this.send(id, { type: "hello", id, room: this.roomCode });

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, message) {
    await this.ready;
    const id = ws.deserializeAttachment()?.id;
    if (!id) return;
    this.sessions.set(id, ws);
    const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
    await this.onMessage(id, raw);
  }

  async webSocketClose(ws) {
    await this.ready;
    const id = ws.deserializeAttachment()?.id;
    if (id) await this.disconnect(id);
  }

  async webSocketError(ws, error) {
    console.error("GameRoom WebSocket error", error);
    await this.ready;
    const id = ws.deserializeAttachment()?.id;
    if (id) await this.disconnect(id);
  }

  send(id, payload) {
    const ws = this.sessions.get(id);
    if (!ws) return;
    try {
      ws.send(JSON.stringify(payload));
    } catch (error) {
      console.error("WebSocket send failed", error);
      this.sessions.delete(id);
    }
  }

  broadcast(payload, except = null) {
    const encoded = JSON.stringify(payload);
    for (const [id, ws] of this.sessions) {
      if (id === except) continue;
      try {
        ws.send(encoded);
      } catch (error) {
        console.error("WebSocket broadcast failed", error);
        this.sessions.delete(id);
      }
    }
  }

  publicState(forId = null) {
    const viewer = forId ? this.players.get(forId) : null;
    const visiblePlayers = [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        x: p.x,
        z: p.z,
        rotation: p.rotation,
        alive: p.alive,
        connected: Boolean(p.isBot) || this.sessions.has(p.id),
        bot: Boolean(p.isBot),
        host: p.id === this.hostId,
        role: p.id === forId ? p.role : undefined,
        tasks: p.id === forId ? p.tasks : undefined,
        completedTasks: p.id === forId ? [...(p.completedTasks || [])] : undefined,
        tasksDone: p.id === forId ? p.tasksDone : undefined,
        taskTotal: p.id === forId ? p.tasks.length : undefined,
        emergencyUsed: p.id === forId ? p.emergencyUsed : undefined,
        lastKillAt: p.id === forId ? p.lastKillAt : undefined,
        reported: p.reported || false,
        ghost: !p.alive,
        spectator: Boolean(p.spectator),
        meetingEligible: p.meetingEligible !== false,
        hidden: Boolean(p.hidden),
        hiddenAt: p.hidden ? p.hiddenAt || null : null,
        carryingCargo: Boolean(p.carryingCargo),
        hat: p.hat || "none",
        shielded: Boolean(p.shielded) && (p.id === forId || this.phase === "finished"),
        abilityUsed: p.id === forId ? Boolean(p.abilityUsed) : undefined,
        downedAt: p.id === forId || !p.alive ? Number(p.downedAt || 0) : undefined,
        bodyX: !p.alive && p.downedAt ? Number.isFinite(Number(p.bodyX)) ? Number(p.bodyX) : Number(p.x) : undefined,
        bodyZ: !p.alive && p.downedAt ? Number.isFinite(Number(p.bodyZ)) ? Number(p.bodyZ) : Number(p.z) : undefined,
        bodyRotation: !p.alive && p.downedAt ? Number(p.bodyRotation || 0) : undefined,
        attackable: Boolean(
          viewer && viewer.role === "impostor" && viewer.alive && !viewer.spectator &&
          p.id !== forId && p.alive && p.role !== "impostor" && !p.spectator && !p.hidden
        ),
      }));
    if (this.practiceMode && this.phase === "playing" && viewer?.role === "impostor") {
      visiblePlayers.push({
        id: "__practice_target__",
        name: "訓練用ターゲット",
        color: "cyan",
        x: -2.0,
        z: -3.5,
        rotation: Math.PI / 2,
        alive: true,
        connected: false,
        host: false,
        reported: false,
        ghost: false,
        spectator: false,
        meetingEligible: true,
        hidden: false,
        hiddenAt: null,
        carryingCargo: false,
        hat: "none",
        shielded: false,
        practiceTarget: true,
        attackable: true,
      });
    }
    return {
      room: this.roomCode,
      phase: this.phase,
      hostId: this.hostId,
      winner: this.winner,
      sabotage: this.sabotage,
      meetingEndsAt: this.meetingEndsAt,
      practiceMode: this.practiceMode,
      mapVersion: MAP_VERSION,
      settings: this.settings,
      serverTime: Date.now(),
      players: visiblePlayers,
    };
  }

  syncAll() {
    for (const id of this.sessions.keys()) {
      this.send(id, { type: "state", state: this.publicState(id) });
    }
  }

  async onMessage(id, raw) {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return this.send(id, { type: "error", message: "不正な通信データです。" });
    }

    if (message.type === "join") {
      await this.join(id, message);
      return;
    }

    const player = this.players.get(id);
    if (!player) {
      this.send(id, { type: "error", message: "プレイヤー情報が見つかりません。入り直してください。" });
      return;
    }

    switch (message.type) {
      case "move":
        this.move(player, message);
        break;
      case "botControl":
        await this.botControl(player, message);
        break;
      case "aiTick":
        await this.aiTick(player);
        break;
      case "start":
        await this.start(player);
        break;
      case "settings":
        await this.updateSettings(player, message.settings);
        break;
      case "taskComplete":
        await this.completeTask(player, message);
        break;
      case "cargoState":
        await this.setCargoState(player, message);
        break;
      case "kill":
        await this.kill(player, message);
        break;
      case "report":
        await this.report(player, message);
        break;
      case "meeting":
        if (this.sabotage) {
          this.send(player.id, { type: "error", message: "妨害が発生している間は緊急会議を開けません。" });
          break;
        }
        if (Math.hypot(player.x - EMERGENCY_BUTTON.x, player.z - EMERGENCY_BUTTON.z) > 3.0) {
          this.send(player.id, { type: "error", message: "中央の緊急ボタンに近づいてください。" });
          break;
        }
        await this.startMeeting(player, "緊急会議");
        break;
      case "vote":
        await this.vote(player, message);
        break;
      case "chat":
        this.chat(player, message);
        break;
      case "voiceSignal":
        this.voiceSignal(player, message);
        break;
      case "voiceAudio":
        this.voiceAudio(player, message);
        break;
      case "meetingVoiceAudio":
        this.meetingVoiceAudio(player, message);
        break;
      case "groupVoiceControl":
        await this.groupVoiceControl(player, message);
        break;
      case "groupVoiceAudio":
        this.groupVoiceAudio(player, message);
        break;
      case "callControl":
        this.callControl(player, message);
        break;
      case "sabotage":
        await this.startSabotage(player, message);
        break;
      case "fixSabotage":
        await this.fixSabotage(player, message);
        break;
      case "returnLobby":
        await this.returnLobby(player);
        break;
      case "customize":
        await this.customize(player, message);
        break;
      case "revive":
        await this.revive(player, message);
        break;
      case "protect":
        await this.protect(player, message);
        break;
      case "inspect":
        await this.inspect(player, message);
        break;
      case "hide":
        await this.toggleHide(player, message);
        break;
      case "moderate":
        await this.moderate(player, message);
        break;
      default:
        this.send(id, { type: "error", message: "未対応の操作です。" });
    }
  }

  async join(id, message) {
    // クライアントとサーバーの更新順が前後しても、参加自体は止めません。
    // 現在の通信形式に互換性があるため、版の違いは警告扱いにします。
    const clientVersion = String(message.clientVersion || "");
    if (clientVersion && clientVersion !== MAP_VERSION) {
      console.warn("Hidden Crew version mismatch", { clientVersion, serverVersion: MAP_VERSION });
    }
    if (this.players.has(id)) {
      this.send(id, { type: "joined", id, room: this.roomCode, phase: this.phase });
      this.send(id, { type: "state", state: this.publicState(id) });
      return;
    }
    // ゲーム開始後の参加者も観戦者にはせず、通常のクルーとして参加させます。
    // 終了画面中だけは、次のロビーへ戻るまで待機扱いにします。
    const joiningActiveGame = this.phase === "playing" || this.phase === "meeting";
    const joiningAfterFinish = this.phase === "finished";
    const maxPlayers = 12;
    if (this.players.size >= maxPlayers) {
      this.send(id, { type: "error", message: "ルームは満員です。" });
      return;
    }

    const index = this.players.size;
    const requestedColor = String(message.color || "").toLowerCase();
    const selectedColor = COLORS.includes(requestedColor) ? requestedColor : COLORS[index % COLORS.length];
    const [x, z] = SPAWNS[index % SPAWNS.length];
    const lateJoinTasks = joiningActiveGame
      ? shuffled(TASKS).slice(0, this.settings.tasks)
      : [];
    this.players.set(id, {
      id,
      name: cleanName(message.name),
      color: selectedColor,
      x,
      z,
      rotation: 0,
      alive: !joiningAfterFinish,
      role: joiningAfterFinish ? "spectator" : "crew",
      tasks: lateJoinTasks,
      completedTasks: new Set(),
      tasksDone: 0,
      emergencyUsed: false,
      lastKillAt: 0,
      reported: joiningAfterFinish,
      spectator: joiningAfterFinish,
      meetingEligible: this.phase !== "meeting" && !joiningAfterFinish,
      hidden: false,
      hiddenAt: null,
      carryingCargo: false,
      hat: HATS.has(String(message.hat || "none")) ? String(message.hat || "none") : "none",
      groupVoiceJoined: false,
      isBot: false,
      shielded: false,
      abilityUsed: false,
      downedAt: 0,
      bodyX: null,
      bodyZ: null,
      bodyRotation: 0,
    });
    if (!this.hostId && !joiningAfterFinish) this.hostId = id;
    await this.persist();
    this.send(id, { type: "joined", id, room: this.roomCode, phase: this.phase });
    this.syncAll();
  }

  createBot() {
    if (this.players.size >= 12) return null;
    const usedNames = new Set([...this.players.values()].map((player) => player.name));
    const usedColors = new Set([...this.players.values()].map((player) => player.color));
    const name = BOT_NAMES.find((candidate) => !usedNames.has(candidate)) || `CPU ${this.players.size + 1}`;
    const color = COLORS.find((candidate) => !usedColors.has(candidate)) || COLORS[this.players.size % COLORS.length];
    const hats = [...HATS].filter((hat) => hat !== "none");
    const id = `bot-${uid()}`;
    const [x, z] = SPAWNS[this.players.size % SPAWNS.length];
    const now = Date.now();
    const bot = {
      id,
      name,
      color,
      x,
      z,
      rotation: 0,
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
      hat: hats[Math.floor(Math.random() * hats.length)] || "none",
      groupVoiceJoined: false,
      shielded: false,
      abilityUsed: false,
      downedAt: 0,
      bodyX: null,
      bodyZ: null,
      bodyRotation: 0,
      isBot: true,
      aiPath: [],
      aiGoalKey: "",
      aiGoalX: x,
      aiGoalZ: z,
      aiRouteAt: 0,
      aiActionKey: "",
      aiActionAt: 0,
      aiVoteAt: 0,
      aiMeetingSpoken: false,
      aiPendingReplies: [],
      aiLastMeetingReplyAt: 0,
      aiSuspectId: null,
      aiNextSabotageAt: now + 18000 + Math.random() * 18000,
      aiPatrolIndex: Math.floor(Math.random() * TASKS.length),
    };
    this.players.set(id, bot);
    return bot;
  }

  async botControl(player, message) {
    if (player.id !== this.hostId || player.isBot || this.phase !== "lobby") {
      this.send(player.id, { type: "error", message: "CPUはホストがロビーで追加・削除できます。" });
      return;
    }
    const action = String(message.action || "");
    if (action === "add") {
      if (!this.createBot()) {
        this.send(player.id, { type: "error", message: "参加人数は最大12人です。" });
        return;
      }
    } else if (action === "remove") {
      const bot = [...this.players.values()].reverse().find((item) => item.isBot);
      if (!bot) {
        this.send(player.id, { type: "error", message: "削除できるCPUがいません。" });
        return;
      }
      this.players.delete(bot.id);
      this.votes.delete(bot.id);
    } else {
      return;
    }
    await this.persist();
    this.syncAll();
  }

  botActionReady(bot, key, now, minimum = 650, maximum = 1250) {
    if (bot.aiActionKey !== key) {
      bot.aiActionKey = key;
      bot.aiActionAt = now + minimum + Math.random() * Math.max(0, maximum - minimum);
      return false;
    }
    return now >= Number(bot.aiActionAt || 0);
  }

  moveBotToward(bot, target, key, dt, moves) {
    if (!target || !Number.isFinite(target.x) || !Number.isFinite(target.z)) return false;
    const goalMoved = Math.hypot(Number(bot.aiGoalX || 0) - target.x, Number(bot.aiGoalZ || 0) - target.z) > 2.2;
    if (bot.aiGoalKey !== key || !Array.isArray(bot.aiPath) || bot.aiPath.length === 0 || goalMoved || Date.now() - Number(bot.aiRouteAt || 0) > 5500) {
      bot.aiGoalKey = key;
      bot.aiGoalX = target.x;
      bot.aiGoalZ = target.z;
      bot.aiRouteAt = Date.now();
      bot.aiPath = buildAiRoute(bot, target);
    }
    while (bot.aiPath.length && Math.hypot(bot.x - bot.aiPath[0].x, bot.z - bot.aiPath[0].z) < 0.72) bot.aiPath.shift();
    const waypoint = bot.aiPath[0] || target;
    const dx = waypoint.x - bot.x;
    const dz = waypoint.z - bot.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.05) return true;
    const speed = (2.15 + ((bot.id.charCodeAt(bot.id.length - 1) || 0) % 5) * 0.06) * this.settings.speed;
    const step = Math.min(distance, speed * clamp(dt, 0.05, 0.42));
    const nextX = bot.x + dx / distance * step;
    const nextZ = bot.z + dz / distance * step;
    if (this.sabotage?.kind === "doors" && segmentHitsDoor(bot.x, bot.z, nextX, nextZ)) return false;
    bot.x = clamp(nextX, -33.2, 35.2);
    bot.z = clamp(nextZ, -22.2, 23.2);
    bot.rotation = Math.atan2(dx, dz);
    moves.push({ id: bot.id, x: bot.x, z: bot.z, rotation: bot.rotation });
    return Math.hypot(bot.x - target.x, bot.z - target.z) < 0.9;
  }

  nearestPlayerFor(bot, predicate) {
    let best = null;
    let bestDistance = Infinity;
    for (const target of this.players.values()) {
      if (target.id === bot.id || !predicate(target)) continue;
      const distance = dist(bot, target);
      if (distance < bestDistance) {
        best = target;
        bestDistance = distance;
      }
    }
    return { player: best, distance: bestDistance };
  }

  broadcastBotMeetingChat(bot, text, replyTo = null) {
    const cleaned = String(text || "").replace(/[<>]/g, "").trim().slice(0, 120);
    if (!cleaned || this.phase !== "meeting" || !bot?.alive || bot.meetingEligible === false) return;
    this.broadcast({
      type: "chat",
      from: bot.name,
      fromId: bot.id,
      text: cleaned,
      alive: true,
      phase: "meeting",
      bot: true,
      replyTo,
      spoken: true,
    });
  }

  mentionedPlayerInText(text) {
    const normalized = String(text || "").toLowerCase().replace(/[\s　]/g, "");
    if (!normalized) return null;
    const candidates = [...this.players.values()]
      .filter((player) => player.alive && player.meetingEligible !== false && !player.practiceTarget)
      .sort((a, b) => b.name.length - a.name.length);
    return candidates.find((player) => {
      const full = player.name.toLowerCase().replace(/[\s　]/g, "");
      const short = full.replace(/^cpu/, "");
      return normalized.includes(full) || (short.length >= 2 && normalized.includes(short));
    }) || null;
  }

  chooseBotSuspect(bot, excludedIds = new Set()) {
    const remembered = bot.aiSuspectId ? this.players.get(bot.aiSuspectId) : null;
    if (remembered?.alive && remembered.meetingEligible !== false && remembered.id !== bot.id && !excludedIds.has(remembered.id)) return remembered;
    const candidates = [...this.players.values()].filter((target) =>
      target.alive && target.meetingEligible !== false && target.id !== bot.id && !target.practiceTarget && !excludedIds.has(target.id)
    );
    if (!candidates.length) return null;
    if (bot.role === "impostor") {
      const crew = candidates.filter((target) => target.role !== "impostor");
      if (crew.length) return crew[Math.floor(Math.random() * crew.length)];
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  buildBotMeetingReply(bot, sender, text) {
    const source = String(text || "").trim();
    const compact = source.toLowerCase().replace(/[\s　]/g, "");
    const mentioned = this.mentionedPlayerInText(source);
    const accused = mentioned?.id === bot.id && /(怪し|人狼|犯人|やった|倒した|殺|うそ|嘘|投票)/.test(compact);
    const asksWhere = /(どこ|場所|いた|居た|現在地|アリバイ)/.test(compact);
    const asksWho = /(誰|だれ|怪し|人狼|犯人|投票先)/.test(compact);
    const asksSaw = /(見た|みた|目撃|近く|一緒)/.test(compact);
    const asksWhy = /(なぜ|なんで|理由|根拠)/.test(compact);
    const zone = aiZoneLabel(bot);
    const senderName = sender?.name || "みんな";
    const suspect = this.chooseBotSuspect(bot, new Set([sender?.id].filter(Boolean)));
    const suspectName = suspect?.name || "まだ分かりません";
    const hasMemory = Boolean(bot.aiSuspectId && this.players.get(bot.aiSuspectId)?.alive);

    if (accused) {
      if (bot.role === "impostor") {
        return `${senderName}、私は違います。${zone}にいました。むしろ${suspectName}の動きが気になります。`;
      }
      return `${senderName}、私は人狼ではありません。${zone}で行動していました。私を追放するとクルーが不利です。`;
    }
    if (mentioned?.id === bot.id && asksWhere) return `${senderName}、私は会議前まで${zone}にいました。`;
    if (mentioned?.id === bot.id && asksWhy) {
      return hasMemory
        ? `${senderName}、${suspectName}を近くで見かけた直後に異変があったからです。`
        : `${senderName}、決定的な証拠はありません。位置と動きから判断しています。`;
    }
    if (asksWhere && !asksWho) return `私は会議前まで${zone}にいました。近くにいた人は覚えていません。`;
    if (asksSaw) {
      return hasMemory
        ? `${suspectName}を近くで見ました。断定はできませんが、注意した方がいいです。`
        : `決定的な瞬間は見ていません。私は${zone}にいました。`;
    }
    if (asksWho) {
      return hasMemory
        ? `私は${suspectName}が怪しいと思います。動きが不自然でした。`
        : `まだ証拠が少ないです。今はスキップもありだと思います。`;
    }
    if (mentioned && mentioned.id !== bot.id) {
      if (mentioned.id === bot.aiSuspectId) return `${mentioned.name}は少し怪しいです。近くで不自然な動きを見ました。`;
      return `${mentioned.name}については、今のところ決め手がありません。`;
    }
    const generic = [
      `私は${zone}にいました。情報がある人は教えてください。`,
      hasMemory ? `${suspectName}の動きを確認したいです。` : "証拠が少ないので、場所を順番に確認しましょう。",
      "急いで決めず、目撃情報を整理した方がいいと思います。",
    ];
    return generic[Math.floor(Math.random() * generic.length)];
  }

  queueBotMeetingReplies(sender, text) {
    if (this.phase !== "meeting" || !sender?.alive || sender.meetingEligible === false || sender.isBot) return;
    const now = Date.now();
    const bots = [...this.players.values()].filter((bot) => bot.isBot && bot.alive && bot.meetingEligible !== false);
    if (!bots.length) return;
    const mentioned = this.mentionedPlayerInText(text);
    const selected = [];
    if (mentioned?.isBot) selected.push(mentioned);
    const remaining = bots
      .filter((bot) => !selected.includes(bot))
      .sort((a, b) => {
        const aPriority = a.aiSuspectId ? 0 : 1;
        const bPriority = b.aiSuspectId ? 0 : 1;
        return aPriority - bPriority || Number(a.aiLastMeetingReplyAt || 0) - Number(b.aiLastMeetingReplyAt || 0) || Math.random() - 0.5;
      });
    const replyCount = mentioned?.isBot ? 1 : Math.min(2, bots.length);
    while (selected.length < replyCount && remaining.length) selected.push(remaining.shift());
    selected.forEach((bot, index) => {
      const pending = Array.isArray(bot.aiPendingReplies) ? bot.aiPendingReplies : [];
      if (pending.length >= 2) return;
      const reply = this.buildBotMeetingReply(bot, sender, text);
      pending.push({ at: now + 650 + index * 950 + Math.random() * 500, text: reply, replyTo: sender.id });
      bot.aiPendingReplies = pending;
      bot.aiVoteAt = Math.max(Number(bot.aiVoteAt || 0), now + 4300 + index * 900);
    });
  }

  scheduleOpeningBotTalk(reporter, reason) {
    const now = Date.now();
    const bots = [...this.players.values()].filter((bot) => bot.isBot && bot.alive && bot.meetingEligible !== false);
    const speakers = bots
      .sort((a, b) => Number(Boolean(b.aiSuspectId)) - Number(Boolean(a.aiSuspectId)) || Math.random() - 0.5)
      .slice(0, Math.min(2, bots.length));
    speakers.forEach((bot, index) => {
      let text;
      if (reporter?.id === bot.id) text = `${reason}。私は${aiZoneLabel(bot)}付近で見つけました。`;
      else if (bot.aiSuspectId && this.players.get(bot.aiSuspectId)?.alive) text = `私は${this.players.get(bot.aiSuspectId).name}の動きが気になっています。`;
      else text = `私は会議前まで${aiZoneLabel(bot)}にいました。`;
      bot.aiPendingReplies = [{ at: now + 1000 + index * 1300 + Math.random() * 450, text, replyTo: null }];
      bot.aiVoteAt = now + 7000 + index * 900 + Math.random() * 3500;
    });
  }

  async aiTick(player) {
    if (player.id !== this.hostId || player.isBot || !this.sessions.has(player.id)) return;
    if (this.phase !== "playing" && this.phase !== "meeting") return;
    const now = Date.now();
    if (this.aiTickRunning || now - this.lastAiTickAt < 190) return;
    this.aiTickRunning = true;
    const dt = clamp((now - (this.lastAiTickAt || now - 240)) / 1000, 0.08, 0.4);
    this.lastAiTickAt = now;
    try {
      if (this.phase === "meeting") {
        await this.runAiMeeting(now);
      } else {
        await this.runAiPlaying(now, dt);
      }
      if (now - this.lastAiPersistAt > 2500) {
        this.lastAiPersistAt = now;
        await this.persist();
      }
    } finally {
      this.aiTickRunning = false;
    }
  }

  async runAiMeeting(now) {
    const bots = [...this.players.values()].filter((bot) => bot.isBot && bot.alive && bot.meetingEligible !== false);
    for (const bot of bots) {
      if (this.phase !== "meeting") break;
      const pending = Array.isArray(bot.aiPendingReplies) ? bot.aiPendingReplies : [];
      const readyIndex = pending.findIndex((reply) => Number(reply?.at || 0) <= now);
      if (readyIndex >= 0) {
        const [reply] = pending.splice(readyIndex, 1);
        bot.aiPendingReplies = pending;
        bot.aiMeetingSpoken = true;
        bot.aiLastMeetingReplyAt = now;
        this.broadcastBotMeetingChat(bot, reply.text, reply.replyTo || null);
      }
      if (this.votes.has(bot.id)) continue;
      if (!bot.aiVoteAt) bot.aiVoteAt = now + 6500 + Math.random() * 5000;
      if (pending.length) bot.aiVoteAt = Math.max(bot.aiVoteAt, Number(pending[pending.length - 1]?.at || 0) + 900);
      if (now < bot.aiVoteAt) continue;
      const eligible = [...this.players.values()].filter((target) => target.alive && target.meetingEligible !== false && target.id !== bot.id && !target.practiceTarget);
      let targetId = "skip";
      const suspect = bot.aiSuspectId ? this.players.get(bot.aiSuspectId) : null;
      if (suspect?.alive && suspect.meetingEligible !== false && suspect.id !== bot.id && Math.random() < 0.9) {
        targetId = suspect.id;
        if (!bot.aiMeetingSpoken) {
          bot.aiMeetingSpoken = true;
          this.broadcastBotMeetingChat(bot, `${suspect.name}が怪しいと思います。動きが不自然でした。`);
        }
      } else if (bot.role === "impostor") {
        const crewTargets = eligible.filter((target) => target.role !== "impostor");
        if (crewTargets.length && Math.random() > 0.16) targetId = crewTargets[Math.floor(Math.random() * crewTargets.length)].id;
      } else if (eligible.length && Math.random() > 0.62) {
        targetId = eligible[Math.floor(Math.random() * eligible.length)].id;
      }
      await this.vote(bot, { targetId });
    }
  }

  async runAiPlaying(now, dt) {
    const bots = [...this.players.values()].filter((bot) => bot.isBot && bot.alive && !bot.spectator);
    const moves = [];
    for (const bot of bots) {
      if (this.phase !== "playing") break;
      if (bot.hidden) {
        bot.hidden = false;
        bot.hiddenAt = null;
      }

      const nearbyBody = [...this.players.values()].find((target) =>
        !target.alive && !target.reported && target.downedAt && dist(bot, bodyPoint(target)) <= 2.8
      );
      const bodyAbilityAvailable = nearbyBody && (
        (bot.role === "doctor" && !bot.abilityUsed && now - nearbyBody.downedAt <= 19500) ||
        (bot.role === "detective" && !bot.abilityUsed)
      );
      if (nearbyBody && !bodyAbilityAvailable && (bot.role !== "impostor" || Math.random() < 0.12) && this.botActionReady(bot, `report:${nearbyBody.id}`, now, 450, 1000)) {
        await this.report(bot, { bodyId: nearbyBody.id });
        break;
      }

      if (this.sabotage && bot.role !== "impostor") {
        const station = SABOTAGE_STATIONS[this.sabotage.kind];
        const point = station ? TASK_POSITIONS[station] : null;
        if (point) {
          this.moveBotToward(bot, point, `repair:${station}`, dt, moves);
          if (Math.hypot(bot.x - point.x, bot.z - point.z) <= 3.1 && this.botActionReady(bot, `fix:${station}`, now, 500, 1150)) {
            await this.fixSabotage(bot, { station });
          }
          continue;
        }
      }

      if (bot.role === "doctor" && !bot.abilityUsed) {
        const body = [...this.players.values()].find((target) =>
          !target.alive && !target.reported && !target.spectator && target.downedAt && now - target.downedAt <= 19500
        );
        if (body) {
          const point = bodyPoint(body);
          this.moveBotToward(bot, point, `revive:${body.id}`, dt, moves);
          if (dist(bot, point) <= 2.7 && this.botActionReady(bot, `revive-action:${body.id}`, now, 450, 900)) await this.revive(bot, { targetId: body.id });
          continue;
        }
      }

      if (bot.role === "detective" && !bot.abilityUsed) {
        const body = [...this.players.values()].find((target) => !target.alive && !target.reported && target.downedAt);
        if (body) {
          const point = bodyPoint(body);
          this.moveBotToward(bot, point, `inspect:${body.id}`, dt, moves);
          if (dist(bot, point) <= 3.0 && this.botActionReady(bot, `inspect-action:${body.id}`, now, 450, 900)) await this.inspect(bot, { targetId: body.id });
          continue;
        }
      }

      if (bot.role === "guard" && !bot.abilityUsed) {
        const protectedTarget = this.nearestPlayerFor(bot, (target) => target.alive && !target.spectator && target.role !== "impostor" && !target.shielded).player;
        if (protectedTarget) {
          this.moveBotToward(bot, protectedTarget, `protect:${protectedTarget.id}`, dt, moves);
          if (dist(bot, protectedTarget) <= 2.65 && this.botActionReady(bot, `protect-action:${protectedTarget.id}`, now, 400, 850)) await this.protect(bot, { targetId: protectedTarget.id });
          continue;
        }
      }

      if (bot.role === "impostor") {
        if (!this.sabotage && now >= Number(bot.aiNextSabotageAt || 0)) {
          const kinds = ["lights", "comms", "doors", "reactor"];
          bot.aiNextSabotageAt = now + 24000 + Math.random() * 22000;
          await this.startSabotage(bot, { kind: kinds[Math.floor(Math.random() * kinds.length)] });
        }
        const targetInfo = this.nearestPlayerFor(bot, (target) => target.alive && !target.spectator && !target.hidden && target.role !== "impostor");
        const target = targetInfo.player;
        if (target) {
          const witnesses = [...this.players.values()].filter((other) =>
            other.alive && other.id !== bot.id && other.id !== target.id && !other.hidden && dist(other, target) < 5.2
          );
          const cooldownReady = now - Number(bot.lastKillAt || 0) >= this.settings.killCooldown * 1000;
          if (targetInfo.distance <= 2.65 && cooldownReady && (witnesses.length === 0 || Math.random() < 0.06) && this.botActionReady(bot, `kill:${target.id}`, now, 350, 750)) {
            await this.kill(bot, { targetId: target.id });
            continue;
          }
          if (targetInfo.distance < 23) {
            this.moveBotToward(bot, target, `hunt:${target.id}`, dt, moves);
            continue;
          }
        }
        const fakeTask = TASKS[bot.aiPatrolIndex % TASKS.length];
        const fakePoint = TASK_POSITIONS[fakeTask];
        if (this.moveBotToward(bot, fakePoint, `fake:${fakeTask}`, dt, moves)) bot.aiPatrolIndex = (bot.aiPatrolIndex + 1) % TASKS.length;
        continue;
      }

      const pendingTask = bot.tasks.find((task) => !bot.completedTasks.has(task));
      if (!pendingTask) {
        const patrolTask = TASKS[bot.aiPatrolIndex % TASKS.length];
        const patrolPoint = TASK_POSITIONS[patrolTask];
        if (this.moveBotToward(bot, patrolPoint, `patrol:${patrolTask}`, dt, moves)) bot.aiPatrolIndex = (bot.aiPatrolIndex + 1) % TASKS.length;
        continue;
      }

      if (pendingTask === "cargo") {
        if (!bot.carryingCargo) {
          this.moveBotToward(bot, CARGO_PICKUP, "cargo:pickup", dt, moves);
          if (dist(bot, CARGO_PICKUP) <= 2.8 && this.botActionReady(bot, "cargo:load", now, 700, 1400)) {
            bot.carryingCargo = true;
            bot.aiActionKey = "";
          }
        } else {
          this.moveBotToward(bot, CARGO_DELIVERY, "cargo:delivery", dt, moves);
          if (dist(bot, CARGO_DELIVERY) <= 2.8 && this.botActionReady(bot, "cargo:complete", now, 700, 1400)) await this.completeTask(bot, { task: "cargo" });
        }
        continue;
      }

      const taskPoint = TASK_POSITIONS[pendingTask];
      if (!taskPoint) continue;
      this.moveBotToward(bot, taskPoint, `task:${pendingTask}`, dt, moves);
      if (dist(bot, taskPoint) <= 3.0 && this.botActionReady(bot, `task-action:${pendingTask}`, now, 750, 1550)) await this.completeTask(bot, { task: pendingTask });
    }
    if (moves.length) this.broadcast({ type: "botMoves", moves, serverTime: now });
  }

  async updateSettings(player, settings = {}) {
    if (player.id !== this.hostId || this.phase !== "lobby") {
      this.send(player.id, { type: "error", message: "ホストだけがロビーでルールを変更できます。" });
      return;
    }
    this.settings = {
      impostors: clamp(Number(settings.impostors) || 1, 1, 3),
      tasks: clamp(Number(settings.tasks) || 6, 4, 10),
      speed: clamp(Number(settings.speed) || 1, 0.75, 1.3),
      killCooldown: clamp(Number(settings.killCooldown) || 15, 8, 45),
      meetingTime: clamp(Number(settings.meetingTime) || 45, 20, 90),
      revealRoles: false,
    };
    await this.persist();
    this.syncAll();
  }

  move(player, message) {
    if (this.phase !== "playing" || player.hidden || player.spectator) return;
    const x = Number(message.x);
    const z = Number(message.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;

    // 通信の揺れで正しい移動が破棄されないように余裕を持たせつつ、瞬間移動は拒否します。
    const allowed = (player.alive ? 3.6 : 5.0) * this.settings.speed;
    if (Math.hypot(x - player.x, z - player.z) > allowed) {
      this.send(player.id, { type: "playerMoved", id: player.id, x: player.x, z: player.z, rotation: player.rotation, serverTime: Date.now() });
      return;
    }

    if (player.alive && this.sabotage?.kind === "doors" && segmentHitsDoor(player.x, player.z, x, z)) {
      this.send(player.id, { type: "playerMoved", id: player.id, x: player.x, z: player.z, rotation: player.rotation, serverTime: Date.now() });
      return;
    }

    player.x = clamp(x, -33.2, 35.2);
    player.z = clamp(z, -22.2, 23.2);
    const rotation = Number(message.rotation);
    if (Number.isFinite(rotation)) player.rotation = rotation;

    // 送信者を含む全員へ同じ座標を返し、端末間の位置ずれを防ぎます。
    this.broadcast({ type: "playerMoved", id: player.id, x: player.x, z: player.z, rotation: player.rotation, serverTime: Date.now() });
    this.moveTicks += 1;
    if (this.moveTicks % 30 === 0) this.syncAll();
  }

  async start(player) {
    if (player.id !== this.hostId) {
      this.send(player.id, { type: "error", message: "ゲームを開始できるのはホストだけです。" });
      return;
    }
    if (this.phase !== "lobby") {
      this.send(player.id, { type: "error", message: "現在はゲームを開始できません。" });
      return;
    }

    let list = [...this.players.values()];
    const humanPlayers = list.filter((item) => !item.isBot);
    const botPlayers = list.filter((item) => item.isBot);
    if (humanPlayers.length === 1 && botPlayers.length === 0) {
      while (this.players.size < 6) this.createBot();
      list = [...this.players.values()];
      this.send(player.id, { type: "abilityResult", message: "一人プレイ用にCPUを5人追加しました。" });
    }
    if (list.length === 0) {
      this.send(player.id, { type: "error", message: "参加者がいません。" });
      return;
    }

    this.practiceMode = false;
    // CPUを含めた参加者全体から役職を決め、必ずクルー側を1人以上残します。
    const impostorCount = Math.min(this.settings.impostors, Math.max(1, list.length - 1));
    const impostorIds = new Set(shuffled(list).slice(0, impostorCount).map((item) => item.id));

    list.forEach((item, index) => {
      const [x, z] = SPAWNS[index % SPAWNS.length];
      Object.assign(item, {
        x,
        z,
        rotation: 0,
        alive: true,
        role: impostorIds.has(item.id) ? "impostor" : "crew",
        tasks: shuffled(TASKS).slice(0, this.settings.tasks),
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
        aiPendingReplies: [],
        aiLastMeetingReplyAt: 0,
        aiSuspectId: null,
        aiNextSabotageAt: Date.now() + 18000 + Math.random() * 18000,
      });
    });

    const crewPlayers = list.filter((item) => item.role === "crew" && !item.spectator);
    const specialRoles = ["doctor", "detective", "guard"];
    shuffled(crewPlayers).slice(0, Math.min(specialRoles.length, Math.max(0, crewPlayers.length - 1))).forEach((item, index) => {
      item.role = specialRoles[index];
    });

    this.phase = "playing";
    this.winner = null;
    this.sabotage = null;
    this.meetingEndsAt = 0;
    this.votes.clear();
    await this.ctx.storage.deleteAlarm();
    await this.persist();
    this.broadcast({ type: "gameStarted", practiceMode: this.practiceMode });
    this.syncAll();
  }

  async setCargoState(player, message) {
    if (this.phase !== "playing" || !player.alive || player.spectator) return;
    const active = Boolean(message.active);
    if (active) {
      if (Math.hypot(player.x - CARGO_PICKUP.x, player.z - CARGO_PICKUP.z) > 3.2) {
        this.send(player.id, { type: "error", message: "保管庫の貨物端末の近くで積み込んでください。" });
        return;
      }
    }
    player.carryingCargo = active;
    await this.persist();
    this.syncAll();
  }

  async completeTask(player, message) {
    if (this.phase !== "playing" || !player.alive || player.role === "impostor" || player.spectator) return;
    const task = String(message.task || "");
    if (!player.tasks.includes(task) || player.completedTasks.has(task)) return;
    if (task !== "cargo") {
      const point = TASK_POSITIONS[task];
      const nearSecurity = task === "security" && SECURITY_ACCESS_POINTS.some((access) => Math.hypot(player.x - access.x, player.z - access.z) <= 3.6);
      if (!point || (!nearSecurity && Math.hypot(player.x - point.x, player.z - point.z) > 3.6)) {
        this.send(player.id, { type: "error", message: "タスク端末の近くで操作してください。" });
        return;
      }
    }
    if (task === "cargo") {
      if (!player.carryingCargo) {
        this.send(player.id, { type: "error", message: "先に保管庫で荷物を積み込んでください。" });
        return;
      }
      if (Math.hypot(player.x - CARGO_DELIVERY.x, player.z - CARGO_DELIVERY.z) > 3.2) {
        this.send(player.id, { type: "error", message: "荷物を管理室の搬入口まで運んでください。" });
        return;
      }
      player.carryingCargo = false;
    }
    player.completedTasks.add(task);
    player.tasksDone = player.completedTasks.size;
    await this.persist();
    this.syncAll();
    await this.checkWin({ tasksOnly: true });
  }

  async kill(player, message) {
    if (this.phase !== "playing") {
      this.send(player.id, { type: "error", message: "ゲーム中だけ攻撃できます。" });
      return;
    }
    if (!player.alive || player.role !== "impostor") {
      this.send(player.id, { type: "error", message: "攻撃は生存中の侵入者だけが使えます。" });
      return;
    }
    const remaining = this.settings.killCooldown * 1000 - (Date.now() - player.lastKillAt);
    if (remaining > 0) {
      this.send(player.id, { type: "error", message: `攻撃可能まであと${Math.ceil(remaining / 1000)}秒です。` });
      return;
    }
    const targetId = String(message.targetId || "");
    if (this.practiceMode && targetId === "__practice_target__") {
      const practiceTarget = { x: -2.0, z: -3.5 };
      if (dist(player, practiceTarget) > 2.8) {
        this.send(player.id, { type: "error", message: "訓練用ターゲットにもう少し近づいてください。" });
        return;
      }
      player.lastKillAt = Date.now();
      await this.persist();
      this.broadcast({ type: "killEffect", killerId: player.id, targetId });
      this.send(player.id, { type: "abilityResult", message: "訓練用ターゲットへの攻撃に成功しました。" });
      this.syncAll();
      return;
    }
    const target = this.players.get(targetId);
    if (!target || !target.alive || target.role === "impostor" || target.spectator || target.hidden) {
      this.send(player.id, { type: "error", message: "攻撃できる対象が見つかりません。" });
      return;
    }
    if (dist(player, target) > 2.8) {
      this.send(player.id, { type: "error", message: "対象から離れすぎています。" });
      return;
    }

    if (target.shielded) {
      target.shielded = false;
      player.lastKillAt = Date.now();
      await this.persist();
      this.send(player.id, { type: "error", message: "シールドに攻撃を防がれました。" });
      this.send(target.id, { type: "abilityResult", message: "警備員のシールドが攻撃を防ぎました。" });
      this.syncAll();
      return;
    }
    target.alive = false;
    target.hidden = false;
    target.carryingCargo = false;
    target.reported = false;
    target.downedAt = Date.now();
    target.bodyX = Number(target.x);
    target.bodyZ = Number(target.z);
    target.bodyRotation = Number(target.rotation || 0);
    player.lastKillAt = Date.now();
    for (const witness of this.players.values()) {
      if (!witness.isBot || !witness.alive || witness.role === "impostor" || witness.id === target.id) continue;
      if (dist(witness, target) <= 8.2) witness.aiSuspectId = player.id;
    }
    await this.persist();
    this.broadcast({ type: "killEffect", killerId: player.id, targetId: target.id });
    this.syncAll();
    await this.checkWin();
  }

  async report(player, message) {
    if (this.phase !== "playing" || !player.alive) return;
    const body = this.players.get(String(message.bodyId || ""));
    if (!body || body.alive || body.reported || !body.downedAt || dist(player, bodyPoint(body)) > 2.8) return;
    body.reported = true;
    await this.startMeeting(player, `${body.name}が倒れているのを発見`);
  }

  async startMeeting(player, reason) {
    if (this.phase !== "playing" || !player.alive) return;
    if (reason === "緊急会議") {
      if (player.emergencyUsed) {
        this.send(player.id, { type: "error", message: "緊急会議はすでに使用済みです。" });
        return;
      }
      player.emergencyUsed = true;
    }

    const sabotageWasActive = Boolean(this.sabotage);
    this.sabotage = null;
    this.phase = "meeting";
    this.votes.clear();
    for (const item of this.players.values()) {
      item.meetingEligible = item.alive;
      if (item.isBot) {
        item.aiVoteAt = Date.now() + 6500 + Math.random() * 5000;
        item.aiMeetingSpoken = false;
        item.aiPendingReplies = [];
        item.aiLastMeetingReplyAt = 0;
      }
    }
    this.scheduleOpeningBotTalk(player, reason);
    this.meetingEndsAt = Date.now() + this.settings.meetingTime * 1000;
    await this.ctx.storage.setAlarm(this.meetingEndsAt);
    await this.persist();
    if (sabotageWasActive) this.broadcast({ type: "sabotageFixed" });
    this.broadcast({ type: "meetingStarted", reason });
    this.syncAll();
  }

  async vote(player, message) {
    if (this.phase !== "meeting" || !player.alive || player.meetingEligible === false || this.votes.has(player.id)) return;
    const targetId = String(message.targetId || "skip");
    if (targetId !== "skip") {
      const target = this.players.get(targetId);
      if (!target?.alive || target.meetingEligible === false) return;
    }

    this.votes.set(player.id, targetId);
    await this.persist();
    const aliveCount = [...this.players.values()].filter((item) => item.alive && item.meetingEligible !== false).length;
    this.broadcast({ type: "voteCount", count: this.votes.size, total: aliveCount });
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
    this.votes.clear();
    for (const item of this.players.values()) {
      item.meetingEligible = true;
      item.aiVoteAt = 0;
      item.aiMeetingSpoken = false;
      item.aiPendingReplies = [];
      item.aiLastMeetingReplyAt = 0;
      if (!item.alive) item.reported = true;
      if (item.aiSuspectId && !this.players.get(item.aiSuspectId)?.alive) item.aiSuspectId = null;
    }
    await this.ctx.storage.deleteAlarm();
    await this.persist();
    this.broadcast({ type: "meetingEnded", ejected });
    this.syncAll();
    await this.checkWin();
  }

  chat(player, message) {
    const text = String(message.text || "").replace(/[<>]/g, "").trim().slice(0, 120);
    if (!text || !this.sessions.has(player.id)) return;
    if (this.phase === "meeting" && (!player.alive || player.meetingEligible === false)) return;
    const now = Date.now();
    if (player.lastChatAt && now - player.lastChatAt < 450) return;
    player.lastChatAt = now;
    const payload = { type: "chat", from: player.name, fromId: player.id, text, alive: player.alive, phase: this.phase, bot: Boolean(player.isBot) };
    if (this.phase === "meeting" && !player.isBot) this.queueBotMeetingReplies(player, text);
    if (this.phase === "playing" && !player.alive) {
      for (const target of this.players.values()) {
        if (!target.alive && this.sessions.has(target.id)) this.send(target.id, payload);
      }
      return;
    }
    this.broadcast(payload);
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
        aiSuspectId: null,
        aiNextSabotageAt: Date.now() + 18000 + Math.random() * 18000,
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
