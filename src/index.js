import { GameRoom } from './room.js';

export { GameRoom };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

function cleanRoomCode(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'hidden-crew-3d' });
    }

    if (url.pathname === '/ws') {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return json({ error: 'WebSocket upgrade required' }, 426);
      }

      const room = cleanRoomCode(url.searchParams.get('room'));
      if (room.length !== 6) return json({ error: 'Invalid room code' }, 400);

      const id = env.GAME_ROOMS.idFromName(room);
      const stub = env.GAME_ROOMS.get(id);
      return stub.fetch(request);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResponse.headers);
    const isEntryFile = url.pathname === '/' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/game.js');
    if (isEntryFile) {
      headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
    }
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers
    });
  }
};
