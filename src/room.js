const COLORS = ['red', 'blue', 'green', 'pink', 'orange', 'yellow', 'cyan', 'purple', 'white', 'lime'];
const SPAWNS = [
  [-5, -2], [-2, -2], [1, -2], [4, -2],
  [-5, 1], [-2, 1], [1, 1], [4, 1],
  [-3, 4], [3, 4]
];
const TASKS = ['reactor', 'wires', 'scanner', 'cargo'];

function uid() {
  return crypto.randomUUID();
}

function safeName(value) {
  return String(value || 'Player').replace(/[<>]/g, '').trim().slice(0, 16) || 'Player';
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = new Map();
    this.roomCode = null;
    this.phase = 'lobby';
    this.hostId = null;
    this.players = new Map();
    this.votes = new Map();
    this.meetingEndsAt = 0;
    this.winner = null;
    this.sabotage = null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    this.roomCode ||= String(url.searchParams.get('room') || '').toUpperCase();
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const id = uid();
    this.sessions.set(id, server);

    server.addEventListener('message', event => this.onMessage(id, event.data));
    server.addEventListener('close', () => this.disconnect(id));
    server.addEventListener('error', () => this.disconnect(id));

    server.send(JSON.stringify({ type: 'hello', id, room: this.roomCode }));
    return new Response(null, { status: 101, webSocket: client });
  }

  send(id, payload) {
    const socket = this.sessions.get(id);
    if (!socket) return;
    try { socket.send(JSON.stringify(payload)); } catch {}
  }

  broadcast(payload, exceptId = null) {
    const encoded = JSON.stringify(payload);
    for (const [id, socket] of this.sessions) {
      if (id === exceptId) continue;
      try { socket.send(encoded); } catch {}
    }
  }

  publicState(forId = null) {
    const viewer = this.players.get(forId);
    return {
      room: this.roomCode,
      phase: this.phase,
      hostId: this.hostId,
      winner: this.winner,
      sabotage: this.sabotage,
      meetingEndsAt: this.meetingEndsAt,
      players: [...this.players.values()].map(player => ({
        id: player.id,
        name: player.name,
        color: player.color,
        x: player.x,
        z: player.z,
        rotation: player.rotation,
        alive: player.alive,
        connected: player.connected,
        host: player.id === this.hostId,
        role: player.id === forId || !player.alive || this.phase === 'finished' ? player.role : undefined,
        tasksDone: player.id === forId ? player.tasksDone : undefined,
        taskTotal: player.id === forId ? player.tasks.length : undefined,
        ghost: !player.alive
      }))
    };
  }

  syncAll() {
    for (const id of this.sessions.keys()) this.send(id, { type: 'state', state: this.publicState(id) });
  }

  onMessage(id, raw) {
    let message;
    try { message = JSON.parse(raw); } catch { return; }

    if (message.type === 'join') return this.join(id, message);
    const player = this.players.get(id);
    if (!player) return;

    switch (message.type) {
      case 'move': this.move(player, message); break;
      case 'start': this.start(player); break;
      case 'taskComplete': this.completeTask(player, message); break;
      case 'kill': this.kill(player, message); break;
      case 'report': this.report(player, message); break;
      case 'meeting': this.startMeeting(player, '緊急会議'); break;
      case 'vote': this.vote(player, message); break;
      case 'chat': this.chat(player, message); break;
      case 'sabotage': this.startSabotage(player, message); break;
      case 'fixSabotage': this.fixSabotage(player); break;
      case 'returnLobby': this.returnLobby(player); break;
      default: break;
    }
  }

  join(id, message) {
    if (this.phase !== 'lobby') {
      this.send(id, { type: 'error', message: 'ゲーム進行中のため参加できません。' });
      return;
    }
    if (this.players.size >= 10) {
      this.send(id, { type: 'error', message: 'ルームは満員です。' });
      return;
    }

    const index = this.players.size;
    const [x, z] = SPAWNS[index % SPAWNS.length];
    const player = {
      id,
      name: safeName(message.name),
      color: COLORS[index % COLORS.length],
      x, z,
      rotation: 0,
      alive: true,
      connected: true,
      role: 'crew',
      tasks: [],
      tasksDone: 0,
      emergencyUsed: false,
      lastKillAt: 0
    };
    this.players.set(id, player);
    if (!this.hostId) this.hostId = id;
    this.syncAll();
  }

  move(player, message) {
    if (!['playing', 'meeting'].includes(this.phase)) return;
    if (this.phase === 'meeting') return;
    const x = Number(message.x);
    const z = Number(message.z);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    const maxStep = player.alive ? 1.2 : 1.8;
    if (Math.hypot(x - player.x, z - player.z) > maxStep) return;
    player.x = Math.max(-11, Math.min(11, x));
    player.z = Math.max(-7, Math.min(9, z));
    player.rotation = Number.isFinite(Number(message.rotation)) ? Number(message.rotation) : player.rotation;
    this.broadcast({ type: 'playerMoved', id: player.id, x: player.x, z: player.z, rotation: player.rotation }, player.id);
  }

  start(player) {
    if (player.id !== this.hostId || this.phase !== 'lobby') return;
    if (this.players.size < 2) {
      this.send(player.id, { type: 'error', message: 'テスト版では2人以上で開始できます。' });
      return;
    }
    const list = [...this.players.values()];
    const impostorCount = list.length >= 7 ? 2 : 1;
    const shuffled = [...list].sort(() => Math.random() - 0.5);
    const impostors = new Set(shuffled.slice(0, impostorCount).map(p => p.id));
    list.forEach((p, index) => {
      const [x, z] = SPAWNS[index % SPAWNS.length];
      Object.assign(p, {
        x, z, rotation: 0, alive: true,
        role: impostors.has(p.id) ? 'impostor' : 'crew',
        tasks: [...TASKS].sort(() => Math.random() - 0.5).slice(0, 3),
        tasksDone: 0,
        emergencyUsed: false,
        lastKillAt: 0
      });
    });
    this.phase = 'playing';
    this.winner = null;
    this.sabotage = null;
    this.votes.clear();
    this.syncAll();
  }

  completeTask(player, message) {
    if (this.phase !== 'playing' || !player.alive || player.role !== 'crew') return;
    const task = String(message.task || '');
    if (!player.tasks.includes(task)) return;
    const completed = player.completedTasks ||= new Set();
    if (completed.has(task)) return;
    completed.add(task);
    player.tasksDone = completed.size;
    this.syncAll();
    this.checkWin();
  }

  kill(player, message) {
    if (this.phase !== 'playing' || !player.alive || player.role !== 'impostor') return;
    if (Date.now() - player.lastKillAt < 15000) return;
    const target = this.players.get(String(message.targetId || ''));
    if (!target || !target.alive || target.role === 'impostor') return;
    if (distance(player, target) > 2.2) return;
    target.alive = false;
    player.lastKillAt = Date.now();
    this.syncAll();
    this.checkWin();
  }

  report(player, message) {
    if (this.phase !== 'playing' || !player.alive) return;
    const body = this.players.get(String(message.bodyId || ''));
    if (!body || body.alive || distance(player, body) > 2.8) return;
    this.startMeeting(player, `${body.name}が倒れているのを発見`);
  }

  startMeeting(player, reason) {
    if (this.phase !== 'playing' || !player.alive) return;
    if (reason === '緊急会議') {
      if (player.emergencyUsed) return;
      player.emergencyUsed = true;
    }
    this.phase = 'meeting';
    this.votes.clear();
    this.meetingEndsAt = Date.now() + 45000;
    this.broadcast({ type: 'meetingStarted', reason, state: this.publicState() });
    this.state.storage.setAlarm(this.meetingEndsAt);
    this.syncAll();
  }

  vote(player, message) {
    if (this.phase !== 'meeting' || !player.alive) return;
    const target = String(message.targetId || 'skip');
    if (target !== 'skip' && !this.players.has(target)) return;
    this.votes.set(player.id, target);
    this.broadcast({ type: 'voteCount', count: this.votes.size });
    const aliveCount = [...this.players.values()].filter(p => p.alive).length;
    if (this.votes.size >= aliveCount) this.finishMeeting();
  }

  finishMeeting() {
    if (this.phase !== 'meeting') return;
    const tally = new Map();
    for (const target of this.votes.values()) tally.set(target, (tally.get(target) || 0) + 1);
    let top = 'skip';
    let topCount = -1;
    let tied = false;
    for (const [target, count] of tally) {
      if (count > topCount) { top = target; topCount = count; tied = false; }
      else if (count === topCount) tied = true;
    }
    let ejected = null;
    if (!tied && top !== 'skip') {
      const target = this.players.get(top);
      if (target?.alive) { target.alive = false; ejected = { id: target.id, name: target.name, role: target.role }; }
    }
    this.phase = 'playing';
    this.meetingEndsAt = 0;
    this.votes.clear();
    this.broadcast({ type: 'meetingEnded', ejected });
    this.syncAll();
    this.checkWin();
  }

  chat(player, message) {
    if (this.phase !== 'meeting') return;
    const text = String(message.text || '').replace(/[<>]/g, '').trim().slice(0, 120);
    if (!text) return;
    this.broadcast({ type: 'chat', from: player.name, text, alive: player.alive });
  }

  startSabotage(player, message) {
    if (this.phase !== 'playing' || !player.alive || player.role !== 'impostor' || this.sabotage) return;
    const kind = ['lights', 'reactor'].includes(message.kind) ? message.kind : 'lights';
    this.sabotage = { kind, endsAt: Date.now() + (kind === 'reactor' ? 30000 : 20000) };
    this.broadcast({ type: 'sabotage', sabotage: this.sabotage });
    this.state.storage.setAlarm(this.sabotage.endsAt);
    this.syncAll();
  }

  fixSabotage(player) {
    if (this.phase !== 'playing' || !player.alive || !this.sabotage) return;
    this.sabotage = null;
    this.broadcast({ type: 'sabotageFixed' });
    this.syncAll();
  }

  checkWin() {
    if (this.phase === 'finished') return;
    const alive = [...this.players.values()].filter(p => p.alive);
    const impostors = alive.filter(p => p.role === 'impostor').length;
    const crew = alive.filter(p => p.role === 'crew').length;
    const crewPlayers = [...this.players.values()].filter(p => p.role === 'crew');
    const allTasksDone = crewPlayers.length > 0 && crewPlayers.every(p => p.tasksDone >= p.tasks.length);

    if (impostors === 0 || allTasksDone) return this.finish('crew');
    if (impostors >= crew) return this.finish('impostor');
  }

  finish(winner) {
    this.phase = 'finished';
    this.winner = winner;
    this.sabotage = null;
    this.broadcast({ type: 'gameFinished', winner });
    this.syncAll();
  }

  returnLobby(player) {
    if (player.id !== this.hostId || this.phase !== 'finished') return;
    this.phase = 'lobby';
    this.winner = null;
    this.sabotage = null;
    for (const p of this.players.values()) {
      p.alive = true;
      p.role = 'crew';
      p.tasks = [];
      p.tasksDone = 0;
      p.completedTasks = new Set();
    }
    this.syncAll();
  }

  disconnect(id) {
    this.sessions.delete(id);
    const player = this.players.get(id);
    if (!player) return;
    this.players.delete(id);
    if (this.hostId === id) this.hostId = this.players.keys().next().value || null;
    if (this.players.size === 0) {
      this.phase = 'lobby';
      this.winner = null;
      this.sabotage = null;
    }
    this.syncAll();
    if (this.phase === 'playing') this.checkWin();
  }

  async alarm() {
    if (this.phase === 'meeting' && this.meetingEndsAt && Date.now() >= this.meetingEndsAt) this.finishMeeting();
    if (this.sabotage && Date.now() >= this.sabotage.endsAt) {
      if (this.sabotage.kind === 'reactor') this.finish('impostor');
      else {
        this.sabotage = null;
        this.broadcast({ type: 'sabotageFixed' });
        this.syncAll();
      }
    }
  }
}
