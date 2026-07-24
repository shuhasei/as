import { DurableObject } from "cloudflare:workers";

const COLORS = ["red", "blue", "green", "pink", "orange", "yellow", "cyan", "purple", "white", "lime"];
const MAP_VERSION = "wide-map-v6-movement-privacy";
const SPAWNS = [[-4,-1.5],[-1.5,-1.5],[1.5,-1.5],[4,-1.5],[-4,2],[-1.5,2],[1.5,2],[4,2],[-3,4],[3,4]];
const TASKS = ["reactor", "wires", "scanner", "cargo", "fuel", "align"];
const DEFAULT_SETTINGS = {
  impostors: 1,
  tasks: 4,
  speed: 1,
  killCooldown: 15,
  meetingTime: 45,
  revealRoles: false,
};

const uid = () => crypto.randomUUID();
const cleanName = (value) => String(value || "Player").replace(/[<>]/g, "").trim().slice(0, 16) || "Player";
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const shuffled = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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
      for (const playerId of [...this.players.keys()]) {
        if (!connectedIds.has(playerId)) this.players.delete(playerId);
      }

      if (this.hostId && !this.players.has(this.hostId)) {
        this.hostId = this.players.keys().next().value || null;
      }

      if (this.players.size === 0) {
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
    }]));
    this.votes = new Map(saved.votes || []);

    if (this.hostId && !this.players.has(this.hostId)) {
      this.hostId = this.players.keys().next().value || null;
    }
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
      players: [...this.players.values()].map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        x: p.x,
        z: p.z,
        rotation: p.rotation,
        alive: p.alive,
        connected: this.sessions.has(p.id),
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
        hidden: Boolean(p.hidden) && p.id !== forId ? true : Boolean(p.hidden),
        hat: p.hat || "none",
        shielded: Boolean(p.shielded) && (p.id === forId || this.phase === "finished"),
        abilityUsed: p.id === forId ? Boolean(p.abilityUsed) : undefined,
        downedAt: p.id === forId || !p.alive ? Number(p.downedAt || 0) : undefined,
      })),
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
      case "start":
        await this.start(player);
        break;
      case "settings":
        await this.updateSettings(player, message.settings);
        break;
      case "taskComplete":
        await this.completeTask(player, message);
        break;
      case "kill":
        await this.kill(player, message);
        break;
      case "report":
        await this.report(player, message);
        break;
      case "meeting":
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
        this.inspect(player, message);
        break;
      case "hide":
        await this.toggleHide(player);
        break;
      case "moderate":
        await this.moderate(player, message);
        break;
      default:
        this.send(id, { type: "error", message: "未対応の操作です。" });
    }
  }

  async join(id, message) {
    if (String(message.clientVersion || "") !== MAP_VERSION) {
      this.send(id, { type: "error", message: "ゲームの版が一致しません。全端末でCtrl+Shift+Rを押して更新してください。" });
      return;
    }
    if (this.players.has(id)) {
      this.syncAll();
      return;
    }
    const joiningAsSpectator = this.phase !== "lobby";
    if (joiningAsSpectator && this.players.size >= 12) {
      this.send(id, { type: "error", message: "観戦枠を含めて満員です。" });
      return;
    }
    if ((!joiningAsSpectator && this.players.size >= 10) || (joiningAsSpectator && this.players.size >= 12)) {
      this.send(id, { type: "error", message: "ルームは満員です。" });
      return;
    }

    const index = this.players.size;
    const [x, z] = SPAWNS[index % SPAWNS.length];
    this.players.set(id, {
      id,
      name: cleanName(message.name),
      color: COLORS[index % COLORS.length],
      x,
      z,
      rotation: 0,
      alive: !joiningAsSpectator,
      role: joiningAsSpectator ? "spectator" : "crew",
      tasks: [],
      completedTasks: new Set(),
      tasksDone: 0,
      emergencyUsed: false,
      lastKillAt: 0,
      reported: joiningAsSpectator,
      spectator: joiningAsSpectator,
      hidden: false,
      hat: String(message.hat || "none").slice(0, 12),
      shielded: false,
      abilityUsed: false,
      downedAt: 0,
    });
    if (!this.hostId && !joiningAsSpectator) this.hostId = id;
    await this.persist();
    this.syncAll();
  }

  async updateSettings(player, settings = {}) {
    if (player.id !== this.hostId || this.phase !== "lobby") {
      this.send(player.id, { type: "error", message: "ホストだけがロビーでルールを変更できます。" });
      return;
    }
    this.settings = {
      impostors: clamp(Number(settings.impostors) || 1, 1, 3),
      tasks: clamp(Number(settings.tasks) || 4, 3, 5),
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

    player.x = clamp(x, -17.2, 17.2);
    player.z = clamp(z, -12.2, 12.2);
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

    const list = [...this.players.values()];
    if (list.length === 0) {
      this.send(player.id, { type: "error", message: "参加者がいません。" });
      return;
    }

    this.practiceMode = list.length === 1;
    const impostorCount = this.practiceMode
      ? 0
      : Math.min(this.settings.impostors, Math.max(1, list.length - 1));
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
        lastKillAt: Date.now(),
        reported: false,
        spectator: false,
        hidden: false,
        shielded: false,
        abilityUsed: false,
        downedAt: 0,
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

  async completeTask(player, message) {
    if (this.phase !== "playing" || !player.alive || player.role === "impostor" || player.spectator) return;
    const task = String(message.task || "");
    if (!player.tasks.includes(task) || player.completedTasks.has(task)) return;
    player.completedTasks.add(task);
    player.tasksDone = player.completedTasks.size;
    await this.persist();
    this.syncAll();
    await this.checkWin();
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
    const target = this.players.get(String(message.targetId || ""));
    if (!target || !target.alive || target.role === "impostor" || target.spectator || target.hidden) {
      this.send(player.id, { type: "error", message: "攻撃できる対象が見つかりません。" });
      return;
    }
    if (dist(player, target) > 2.35) {
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
    target.reported = false;
    target.downedAt = Date.now();
    player.lastKillAt = Date.now();
    await this.persist();
    this.broadcast({ type: "killEffect", killerId: player.id, targetId: target.id });
    this.syncAll();
    await this.checkWin();
  }

  async report(player, message) {
    if (this.phase !== "playing" || !player.alive) return;
    const body = this.players.get(String(message.bodyId || ""));
    if (!body || body.alive || body.reported || dist(player, body) > 2.8) return;
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

    this.phase = "meeting";
    this.votes.clear();
    this.meetingEndsAt = Date.now() + this.settings.meetingTime * 1000;
    await this.ctx.storage.setAlarm(this.meetingEndsAt);
    await this.persist();
    this.broadcast({ type: "meetingStarted", reason });
    this.syncAll();
  }

  async vote(player, message) {
    if (this.phase !== "meeting" || !player.alive || this.votes.has(player.id)) return;
    const targetId = String(message.targetId || "skip");
    if (targetId !== "skip" && !this.players.get(targetId)?.alive) return;

    this.votes.set(player.id, targetId);
    await this.persist();
    const aliveCount = [...this.players.values()].filter((item) => item.alive).length;
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
      if (!item.alive) item.reported = true;
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
    const now = Date.now();
    if (player.lastChatAt && now - player.lastChatAt < 450) return;
    player.lastChatAt = now;
    this.broadcast({
      type: "chat",
      from: player.name,
      text,
      alive: player.alive,
      phase: this.phase,
    });
  }

  voiceSignal(player, message) {
    if (this.phase !== "meeting" || !player.alive || !message.signal) return;
    const targetId = String(message.targetId || "");
    const target = this.players.get(targetId);
    if (!target?.alive || !this.sessions.has(targetId)) return;
    this.send(targetId, { type: "voiceSignal", fromId: player.id, signal: message.signal });
  }

  async startSabotage(player, message) {
    if (this.phase !== "playing" || !player.alive || player.role !== "impostor" || this.sabotage) return;
    const kind = ["lights", "reactor", "comms", "doors"].includes(message.kind) ? message.kind : "lights";
    const duration = kind === "reactor" ? 30 : kind === "doors" ? 12 : 25;
    this.sabotage = { kind, endsAt: Date.now() + duration * 1000 };
    await this.ctx.storage.setAlarm(this.sabotage.endsAt);
    await this.persist();
    this.broadcast({ type: "sabotage", sabotage: this.sabotage });
    this.syncAll();
  }

  async fixSabotage(player, message) {
    if (this.phase !== "playing" || !player.alive || !this.sabotage) return;
    if (this.sabotage.kind === "reactor" && message.station !== "reactor") return;
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
    player.hat = String(message.hat || "none").replace(/[^a-z0-9_-]/gi, "").slice(0, 12) || "none";
    await this.persist();
    this.syncAll();
  }

  async revive(player, message) {
    if (this.phase !== "playing" || !player.alive || player.role !== "doctor" || player.abilityUsed) return;
    const target = this.players.get(String(message.targetId || ""));
    if (!target || target.alive || target.reported || target.spectator || dist(player, target) > 2.8) return;
    if (!target.downedAt || Date.now() - target.downedAt > 20000) {
      this.send(player.id, { type: "error", message: "救助可能時間を過ぎています。" });
      return;
    }
    target.alive = true;
    target.reported = false;
    target.downedAt = 0;
    player.abilityUsed = true;
    await this.persist();
    this.broadcast({ type: "abilityResult", message: `${player.name}が${target.name}を救助しました。` });
    this.syncAll();
  }

  async protect(player, message) {
    if (this.phase !== "playing" || !player.alive || player.role !== "guard" || player.abilityUsed) return;
    const target = this.players.get(String(message.targetId || ""));
    if (!target || !target.alive || target.spectator || dist(player, target) > 2.8) return;
    target.shielded = true;
    player.abilityUsed = true;
    await this.persist();
    this.send(player.id, { type: "abilityResult", message: `${target.name}にシールドを付与しました。` });
    this.send(target.id, { type: "abilityResult", message: "警備員からシールドを付与されました。" });
    this.syncAll();
  }

  inspect(player, message) {
    if (this.phase !== "playing" || !player.alive || player.role !== "detective" || player.abilityUsed) return;
    const target = this.players.get(String(message.targetId || ""));
    if (!target || target.alive || target.spectator || dist(player, target) > 3.2) return;
    player.abilityUsed = true;
    const clue = target.role === "impostor" ? "侵入者の痕跡があります。" : "クルー側の痕跡です。";
    this.send(player.id, { type: "abilityResult", message: clue });
    this.persist();
    this.syncAll();
  }

  async toggleHide(player) {
    if (this.phase !== "playing" || !player.alive || player.spectator) return;
    player.hidden = !player.hidden;
    await this.persist();
    this.send(player.id, { type: "abilityResult", message: player.hidden ? "ロッカーに隠れました。移動すると出られません。" : "ロッカーから出ました。" });
    this.syncAll();
  }

  async moderate(player, message) {
    if (player.id !== this.hostId) return;
    const targetId = String(message.targetId || "");
    if (!targetId || targetId === player.id || !this.players.has(targetId)) return;
    this.send(targetId, { type: "error", message: "ホストによってルームから退出されました。" });
    try { this.sessions.get(targetId)?.close(4001, "Removed by host"); } catch {}
    await this.disconnect(targetId);
  }

  async checkWin() {
    if (this.phase === "finished") return;
    const allPlayers = [...this.players.values()];
    const crewAll = allPlayers.filter((item) => item.role !== "impostor" && !item.spectator);
    const tasksComplete = crewAll.length > 0 && crewAll.every((item) => item.tasksDone >= item.tasks.length);

    if (this.practiceMode) {
      if (tasksComplete) await this.finish("crew");
      return;
    }

    const alive = allPlayers.filter((item) => item.alive && !item.spectator);
    const impostors = alive.filter((item) => item.role === "impostor").length;
    const crew = alive.filter((item) => item.role !== "impostor" && !item.spectator).length;
    if (impostors === 0 || tasksComplete) {
      await this.finish("crew");
    } else if (impostors >= crew) {
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
        hidden: false,
        shielded: false,
        abilityUsed: false,
        downedAt: 0,
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
    if (this.hostId === id) this.hostId = this.players.keys().next().value || null;

    if (this.players.size === 0) {
      await this.resetEmptyRoom();
    } else {
      await this.persist();
    }
    this.syncAll();
    if (this.phase === "playing") await this.checkWin();
    if (this.phase === "meeting") {
      const aliveCount = [...this.players.values()].filter((item) => item.alive).length;
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
