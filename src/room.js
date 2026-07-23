const COLORS = ['#ef4444','#3b82f6','#22c55e','#eab308','#a855f7','#f97316','#14b8a6','#ec4899','#64748b','#84cc16'];
const TASKS = [
  { id: 'wires', name: '配線修理', x: 170, y: 130 },
  { id: 'scan', name: 'スキャン', x: 810, y: 130 },
  { id: 'fuel', name: '燃料補給', x: 170, y: 500 },
  { id: 'code', name: 'コード入力', x: 810, y: 500 }
];

export class GameRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.players = new Map();
    this.hostId = null;
    this.phase = 'lobby';
    this.bodies = [];
    this.votes = new Map();
    this.meetingEndsAt = 0;
    this.sabotage = null;
  }

  async fetch(request) {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();

    const id = crypto.randomUUID();
    const player = {
      id,
      name: `Player-${id.slice(0, 4)}`,
      color: COLORS[this.players.size % COLORS.length],
      x: 490,
      y: 320,
      alive: true,
      role: 'crew',
      tasks: [],
      completed: [],
      ready: false,
      socket: server,
      attackCooldownUntil: 0
    };

    this.players.set(id, player);
    if (!this.hostId) this.hostId = id;

    server.addEventListener('message', event => this.onMessage(player, event.data));
    server.addEventListener('close', () => this.removePlayer(id));
    server.addEventListener('error', () => this.removePlayer(id));

    this.send(player, { type: 'welcome', selfId: id, hostId: this.hostId });
    this.broadcastState();

    return new Response(null, { status: 101, webSocket: client });
  }

  onMessage(player, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    const handlers = {
      join: () => this.join(player, msg),
      move: () => this.move(player, msg),
      start: () => this.startGame(player),
      task: () => this.completeTask(player, msg),
      attack: () => this.attack(player, msg),
      report: () => this.report(player, msg),
      emergency: () => this.startMeeting(player, '緊急会議が開かれました'),
      chat: () => this.chat(player, msg),
      vote: () => this.vote(player, msg),
      sabotage: () => this.setSabotage(player, msg),
      fixSabotage: () => this.fixSabotage(player),
      rematch: () => this.resetLobby(player)
    };
    handlers[msg.type]?.();
  }

  join(player, msg) {
    player.name = cleanName(msg.name);
    this.broadcastState();
  }

  move(player, msg) {
    if (this.phase !== 'playing' || !player.alive) return;
    const x = clamp(Number(msg.x), 40, 940);
    const y = clamp(Number(msg.y), 60, 580);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    player.x = x;
    player.y = y;
    this.broadcast({ type: 'playerMoved', id: player.id, x, y });
  }

  startGame(player) {
    if (player.id !== this.hostId || this.phase !== 'lobby') return;
    const active = [...this.players.values()];
    if (active.length < 2) return this.send(player, { type: 'error', message: '2人以上必要です' });

    this.phase = 'playing';
    this.bodies = [];
    this.votes.clear();
    this.sabotage = null;
    const impostorCount = active.length >= 7 ? 2 : 1;
    const shuffled = [...active].sort(() => Math.random() - 0.5);
    const impostors = new Set(shuffled.slice(0, impostorCount).map(p => p.id));

    active.forEach((p, i) => {
      p.alive = true;
      p.role = impostors.has(p.id) ? 'impostor' : 'crew';
      p.x = 430 + (i % 4) * 40;
      p.y = 280 + Math.floor(i / 4) * 45;
      p.completed = [];
      p.tasks = p.role === 'crew' ? TASKS.map(t => t.id) : [];
      p.attackCooldownUntil = Date.now() + 10000;
      this.send(p, { type: 'role', role: p.role, tasks: TASKS });
    });
    this.broadcastState();
  }

  completeTask(player, msg) {
    if (this.phase !== 'playing' || !player.alive || player.role !== 'crew') return;
    const id = String(msg.taskId || '');
    if (!player.tasks.includes(id) || player.completed.includes(id)) return;
    player.completed.push(id);
    this.broadcastState();
    this.checkWin();
  }

  attack(player, msg) {
    if (this.phase !== 'playing' || !player.alive || player.role !== 'impostor') return;
    if (Date.now() < player.attackCooldownUntil) return;
    const target = this.players.get(String(msg.targetId || ''));
    if (!target || !target.alive || target.role === 'impostor') return;
    if (distance(player, target) > 90) return;
    target.alive = false;
    this.bodies.push({ id: crypto.randomUUID(), playerId: target.id, name: target.name, x: target.x, y: target.y });
    player.attackCooldownUntil = Date.now() + 15000;
    this.broadcastState();
    this.checkWin();
  }

  report(player, msg) {
    if (this.phase !== 'playing' || !player.alive) return;
    const body = this.bodies.find(b => b.id === msg.bodyId && Math.hypot(player.x - b.x, player.y - b.y) < 110);
    if (!body) return;
    this.startMeeting(player, `${player.name} が ${body.name} を発見しました`);
  }

  startMeeting(player, reason) {
    if (this.phase !== 'playing' || !player.alive) return;
    this.phase = 'meeting';
    this.votes.clear();
    this.bodies = [];
    this.meetingEndsAt = Date.now() + 45000;
    this.broadcast({ type: 'meetingStarted', reason, endsAt: this.meetingEndsAt });
    setTimeout(() => this.resolveVotes(), 45000);
    this.broadcastState();
  }

  chat(player, msg) {
    if (this.phase !== 'meeting' || !player.alive) return;
    const text = String(msg.text || '').trim().slice(0, 120);
    if (!text) return;
    this.broadcast({ type: 'chat', playerId: player.id, name: player.name, text });
  }

  vote(player, msg) {
    if (this.phase !== 'meeting' || !player.alive || this.votes.has(player.id)) return;
    const targetId = msg.targetId === 'skip' ? 'skip' : String(msg.targetId || '');
    if (targetId !== 'skip') {
      const target = this.players.get(targetId);
      if (!target || !target.alive) return;
    }
    this.votes.set(player.id, targetId);
    this.broadcastState();
    const alive = [...this.players.values()].filter(p => p.alive).length;
    if (this.votes.size >= alive) this.resolveVotes();
  }

  resolveVotes() {
    if (this.phase !== 'meeting') return;
    const counts = new Map();
    for (const target of this.votes.values()) counts.set(target, (counts.get(target) || 0) + 1);
    let top = 'skip';
    let topCount = 0;
    let tied = false;
    for (const [target, count] of counts) {
      if (count > topCount) { top = target; topCount = count; tied = false; }
      else if (count === topCount) tied = true;
    }
    let ejected = null;
    if (!tied && top !== 'skip') {
      const p = this.players.get(top);
      if (p) { p.alive = false; ejected = { id: p.id, name: p.name, role: p.role }; }
    }
    this.phase = 'playing';
    this.votes.clear();
    this.broadcast({ type: 'meetingEnded', ejected, tied, skipped: top === 'skip' });
    this.broadcastState();
    this.checkWin();
  }

  setSabotage(player, msg) {
    if (this.phase !== 'playing' || !player.alive || player.role !== 'impostor' || this.sabotage) return;
    const kind = ['lights', 'reactor'].includes(msg.kind) ? msg.kind : 'lights';
    this.sabotage = { kind, endsAt: Date.now() + 30000 };
    this.broadcastState();
    setTimeout(() => {
      if (this.sabotage?.kind === kind && Date.now() >= this.sabotage.endsAt) this.finish('impostor', '妨害が成功しました');
    }, 30500);
  }

  fixSabotage(player) {
    if (this.phase !== 'playing' || !player.alive || !this.sabotage) return;
    this.sabotage = null;
    this.broadcastState();
  }

  checkWin() {
    if (this.phase !== 'playing') return;
    const alive = [...this.players.values()].filter(p => p.alive);
    const impostors = alive.filter(p => p.role === 'impostor').length;
    const crew = alive.filter(p => p.role === 'crew').length;
    if (impostors === 0) return this.finish('crew', '侵入者を全員追放しました');
    if (impostors >= crew) return this.finish('impostor', '侵入者がクルーと同数になりました');
    const crews = [...this.players.values()].filter(p => p.role === 'crew');
    if (crews.length && crews.every(p => p.tasks.length === p.completed.length)) this.finish('crew', '全タスクを完了しました');
  }

  finish(winner, reason) {
    this.phase = 'finished';
    this.sabotage = null;
    this.broadcast({ type: 'gameOver', winner, reason });
    this.broadcastState();
  }

  resetLobby(player) {
    if (player.id !== this.hostId || this.phase !== 'finished') return;
    this.phase = 'lobby';
    this.bodies = [];
    this.sabotage = null;
    for (const p of this.players.values()) {
      p.alive = true; p.role = 'crew'; p.tasks = []; p.completed = [];
    }
    this.broadcastState();
  }

  removePlayer(id) {
    this.players.delete(id);
    if (this.hostId === id) this.hostId = this.players.keys().next().value || null;
    this.broadcastState();
    this.checkWin();
  }

  publicState(forPlayer) {
    return {
      type: 'state',
      phase: this.phase,
      hostId: this.hostId,
      selfId: forPlayer.id,
      sabotage: this.sabotage,
      bodies: this.bodies,
      votesCast: this.votes.size,
      players: [...this.players.values()].map(p => ({
        id: p.id, name: p.name, color: p.color, x: p.x, y: p.y,
        alive: p.alive, completed: p.completed.length, totalTasks: p.tasks.length, completedTaskIds: p.completed,
        role: this.phase === 'finished' || p.id === forPlayer.id ? p.role : undefined
      }))
    };
  }

  broadcastState() {
    for (const p of this.players.values()) this.send(p, this.publicState(p));
  }

  broadcast(data) {
    for (const p of this.players.values()) this.send(p, data);
  }

  send(player, data) {
    try { player.socket.send(JSON.stringify(data)); } catch { /* ignore */ }
  }
}

function cleanName(value) {
  return String(value || 'Player').replace(/[<>]/g, '').trim().slice(0, 14) || 'Player';
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

