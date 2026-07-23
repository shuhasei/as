export { GameRoom } from './room.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/create-room' && request.method === 'POST') {
      const roomCode = makeRoomCode();
      return Response.json({ roomCode });
    }

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return new Response('WebSocket upgrade required', { status: 426 });
      }
      const roomCode = normalizeRoom(url.searchParams.get('room'));
      if (!roomCode) return new Response('Invalid room', { status: 400 });
      const id = env.GAME_ROOMS.idFromName(roomCode);
      return env.GAME_ROOMS.get(id).fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function normalizeRoom(value) {
  const code = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  return code.length === 6 ? code : '';
}

