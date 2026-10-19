import {addSpectator,removeSpectator} from './spectators.js';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import { WebSocketServer, WebSocket } from 'ws';
import { act, makeRoom, note, player, tick, view } from './engine.js';
import type { Action, Room } from '../shared/types.js';
const rooms = new Map<string, Room>();
const sessions = new Map<string, {
    id: string;
    room?: string;
    socket?: WebSocket;
    lastSeen: number;
}>();
const root = resolve('dist');
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => { try {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
        return;
    }
    const path = decodeURIComponent((req.url || '/').split('?')[0]);
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep) && file !== root) {
        res.writeHead(403);
        res.end();
        return;
    }
    let target = file;
    try {
        if ((await stat(target)).isDirectory())
            target = resolve(target, 'index.html');
    }
    catch {
        target = resolve(root, 'index.html');
    }
    const data = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[extname(target)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
}
catch {
    res.writeHead(404);
    res.end('Build House Rules first: pnpm build');
} });
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 16000 });
function send(ws: WebSocket, data: unknown) { if (ws.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify(data)); }
function broadcast(r: Room) { for (const s of sessions.values())
    if (s.room === r.code && s.socket)
        send(s.socket, { type: 'state', room: view(r, s.id) }); }
function code() { let c: string; do {
    c = randomBytes(4).toString('hex').slice(0, 6).toUpperCase();
} while (rooms.has(c)); return c; }
wss.on('connection', (ws, req) => {
    let token = '';
    let count = 0;
    let window = Date.now();
    let alive = true;
    ws.on('pong', () => alive = true);
    const heartbeat = setInterval(() => { if (!alive) {
        ws.terminate();
        return;
    } alive = false; ws.ping(); }, 30000);
    ws.on('message', raw => {
        try {
            if (Date.now() - window > 1000) {
                window = Date.now();
                count = 0;
            }
            if (++count > 25)
                throw new Error('Slow down a little.');
            const msg = JSON.parse(raw.toString()) as Action;
            if (msg.type === 'hello') {
                if (token)
                    throw new Error('Session is already initialized.');
                token = typeof msg.token === 'string' && sessions.has(msg.token) ? msg.token : randomBytes(24).toString('hex');
                let s = sessions.get(token);
                if (!s) {
                    s = { id: randomBytes(12).toString('hex'), lastSeen: Date.now() };
                    sessions.set(token, s);
                }
                const old = s.socket;
                s.socket = ws;
                if (old && old !== ws)
                    old.close(4000, 'Session opened elsewhere');
                s.lastSeen = Date.now();
                send(ws, { type: 'session', token, id: s.id });
                if (s.room) {
                    const r = rooms.get(s.room);
                    const p = r?.players.find(p => p.id === s.id)||r?.spectators?.find(p=>p.id===s.id);
                    if (r && p) {
                        p.connected = true;
                        broadcast(r);
                    }
                    else
                        s.room = undefined;
                }
                return;
            }
            const s = sessions.get(token);
            if (!s || s.socket !== ws)
                throw new Error('Connect before joining.');
            s.lastSeen = Date.now();
            if (msg.type === 'create' || msg.type === 'join' || msg.type === 'watch') {
                if (s.room)
                    throw new Error('Leave your current room first.');
                if (typeof msg.name !== 'string' || !msg.name.trim())
                    throw new Error('Enter a player name.');
                let r: Room;
                if (msg.type === 'create') {
                    if (rooms.size >= 100)
                        throw new Error('The server is full.');
                    r = makeRoom(code(), s.id);
                    rooms.set(r.code, r);
                }
                else {
                    r = rooms.get(String(msg.code).toUpperCase())!;
                    if (!r)
                        throw new Error('Room not found. Check the invite code.');
                    if (msg.type!=='watch'&&r.phase !== 'lobby')
                        throw new Error('This game has started. Ask the host to return to the lobby.');
                    if (msg.type!=='watch'&&r.players.length >= r.rules.maxPlayers)
                        throw new Error('That table is full.');
                }
                if(msg.type==='watch')addSpectator(r,s.id,msg.name);else r.players.push(player(s.id, msg.name, r.players.length));
                s.room = r.code;
                note(r, msg.type==='watch'?r.spectators!.at(-1)!.name+' joined the audience.':r.players.at(-1)!.name+' joined the table.');
                broadcast(r);
                return;
            }
            const r = rooms.get(s.room || '');
            if (!r)
                throw new Error('Join a room first.');
            if(msg.type==='takeSeat'||msg.type==='spectate'){
                if(r.phase!=='lobby')throw Error('Change roles in the lobby after this game.');
                if(msg.type==='takeSeat'){const spectator=r.spectators?.find(p=>p.id===s.id);if(!spectator)throw Error('Join the audience first.');if(r.players.length>=r.rules.maxPlayers)throw Error('That table is full.');r.players.push(player(s.id,spectator.name,r.players.length));removeSpectator(r,s.id);}
                else{const member=r.players.find(p=>p.id===s.id);if(!member)throw Error('You are already watching.');if(r.host===s.id)throw Error('The host must keep their seat.');const original=r.players;r.players=r.players.filter(p=>p.id!==s.id);try{addSpectator(r,s.id,member.name);}catch(error){r.players=original;throw error;}if(r.triviaMaster===s.id)r.triviaMaster=undefined;if(r.rpgDm===s.id)r.rpgDm=undefined;r.charadeTeams=undefined;}
                note(r,'A guest changed between player and spectator.');broadcast(r);return;
            }
            if (msg.type === 'leave') {
                if (r.phase === 'playing'&&!r.spectators?.some(p=>p.id===s.id))
                    throw new Error('Return to the lobby before leaving. Closing the tab saves your seat.');
                removeSpectator(r,s.id);
                r.players = r.players.filter(p => p.id !== s.id);
                s.room = undefined;
                send(ws, { type: 'left' });
                if (r.host === s.id) {
                    r.host = r.players.find(p => p.connected)?.id || r.players[0]?.id || '';
                }
                if (!r.players.length){
                    rooms.delete(r.code);for(const guest of sessions.values())if(guest.room===r.code){guest.room=undefined;if(guest.socket)send(guest.socket,{type:'left'});}
                }
                else
                    broadcast(r);
                return;
            }
            const result = act(r, s.id, msg);
            if (result?.peek)
                send(ws, { type: 'peek', cards: result.peek, expires: Date.now() + 4000 });
            if (msg.type === 'kick'||msg.type==='kickSpectator') {
                for (const kicked of sessions.values())
                    if (kicked.room === r.code && !r.players.some(p => p.id === kicked.id)&&!r.spectators?.some(p=>p.id===kicked.id)) {
                        kicked.room = undefined;
                        if (kicked.socket)
                            send(kicked.socket, { type: 'left' });
                    }
            }
            broadcast(r);
        }
        catch (error) {
            send(ws, { type: 'error', message: error instanceof Error ? error.message : 'Something went wrong.' });
        }
    });
    ws.on('close', () => { clearInterval(heartbeat); const s = sessions.get(token); if (s?.socket !== ws)
        return; s.socket = undefined; s.lastSeen = Date.now(); const r = rooms.get(s.room || ''); const p = r?.players.find(p => p.id === s.id)||r?.spectators?.find(p=>p.id===s.id); if (r && p) {
        p.connected = false;
        note(r, p.name+(r.spectators?.some(g=>g.id===p.id)?' disconnected from the audience.':' disconnected. Their seat is saved.'));
        if (r.phase === 'lobby' && r.host === p.id)
            r.host = r.players.find(p => p.connected)?.id || p.id;
        broadcast(r);
    } });
});
setInterval(() => { for (const r of rooms.values())
    if (tick(r))
        broadcast(r); const expiry = Date.now() - 12 * 60 * 60 * 1000; for (const [key, r] of rooms)
    if (!r.players.some(p => p.connected) && ![...sessions.values()].some(s => s.room === key && s.lastSeen > expiry))
        rooms.delete(key); for (const [key, s] of sessions)
    if (!s.socket && s.lastSeen < expiry)
        sessions.delete(key); }, 500).unref();
const port = Number(process.env.PORT || 3000);
server.listen(port, '0.0.0.0', () => { console.log(`House Rules server: http://localhost:${port}`); for (const nets of Object.values(networkInterfaces()))
    for (const n of nets || [])
        if (n.family === 'IPv4' && !n.internal)
            console.log(`Friends on your Wi-Fi: http://${n.address}:${port}`); });
if (process.argv.includes('--dev')) {
    const { spawn } = await import('node:child_process');
    const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '0.0.0.0'], { stdio: 'inherit' });
    process.on('SIGINT', () => { vite.kill(); server.close(); process.exit(); });
}
