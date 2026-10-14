import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { WebSocket } from 'ws';
import { defaults } from '../shared/types.js';
test('real server: two clients join, private deal, reconnect, host controls, lobby reset', async () => {
    const port = 3199;
    const proc = spawn(process.execPath, ['dist-server/server/index.js'], { env: { ...process.env, PORT: String(port) }, stdio: 'pipe' });
    const clients: WebSocket[] = [];
    try {
        await new Promise<void>((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Server did not start')), 8000); proc.stdout.on('data', () => { clearTimeout(timer); resolve(); }); proc.on('error', reject); });
        const client = async (token?: string) => {
            const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
            clients.push(ws);
            const queue: any[] = [];
            const waiting: {
                match: (v: any) => boolean;
                resolve: (v: any) => void;
            }[] = [];
            ws.on('message', data => { const v = JSON.parse(data.toString()); const idx = waiting.findIndex(w => w.match(v)); if (idx >= 0)
                waiting.splice(idx, 1)[0].resolve(v);
            else
                queue.push(v); });
            const wait = (type: string, pred: (v: any) => boolean = () => true) => new Promise<any>((resolve, reject) => { const match = (v: any) => v.type === type && pred(v); const idx = queue.findIndex(match); if (idx >= 0) {
                resolve(queue.splice(idx, 1)[0]);
                return;
            } const timer = setTimeout(() => reject(new Error('Timed out waiting for ' + type)), 5000); waiting.push({ match, resolve: v => { clearTimeout(timer); resolve(v); } }); });
            await new Promise<void>(resolve => ws.on('open', resolve));
            ws.send(JSON.stringify({ type: 'hello', token }));
            const session = await wait('session');
            return { ws, wait, session, send: (v: unknown) => ws.send(JSON.stringify(v)) };
        };
        const a = await client();
        const b = await client();
        a.send({ type: 'create', name: 'Alice' });
        const first = await a.wait('state');
        const code = first.room.code;
        b.send({ type: 'join', code, name: 'Bob' });
        await b.wait('state');
        await a.wait('state', v => v.room.players.length === 2);
        b.send({ type: 'rules', rules: defaults });
        const denied = await b.wait('error');
        assert.match(denied.message, /host/);
        a.send({ type: 'start', rules: { ...defaults, game: 'bluff' } });
        const av = (await a.wait('state', v => v.room.phase === 'playing')).room;
        const bv = (await b.wait('state', v => v.room.phase === 'playing')).room;
        assert.equal(av.hand.length, 26);
        assert.equal(bv.hand.length, 26);
        assert.ok(!av.players[1].hand);
        assert.ok(!av.hand.some((c: any) => bv.hand.some((b: any) => b.id === c.id)));
        b.ws.close();
        await new Promise<void>(resolve => b.ws.on('close', () => resolve()));
        const back = await client(b.session.token);
        assert.equal(back.session.id, b.session.id);
        const recovered = (await back.wait('state')).room;
        assert.equal(recovered.hand.length, 26);
        assert.equal(recovered.code, code);
        await new Promise(resolve => setTimeout(resolve, Math.max(0, av.busyUntil - Date.now() + 100)));
        a.send({ type: 'play', cards: [av.hand[0].id], claim: 1 });
        const played = (await back.wait('state', v => !!v.room.lastPlay)).room;
        assert.equal(played.pile.length, 0);
        assert.equal(played.pileCount, 1);
        assert.ok(!played.lastPlay.cards);
        back.send({ type: 'challenge' });
        await back.wait('state', v => !v.room.lastPlay && v.room.log[0].includes('called bluff'));
        a.send({ type: 'lobby' });
        const lobby = (await back.wait('state', v => v.room.phase === 'lobby')).room;
        assert.equal(lobby.hand.length, 0);
        a.send({ type: 'rules', rules: { ...defaults, game: 'charades', charadePrompts: 'A dancing robot' } });
        await a.wait('state', v => v.room.rules.game === 'charades');
        a.send({ type: 'start' });
        const c1 = (await a.wait('state', v => v.room.phase === 'playing' && v.room.rules.game === 'charades')).room;
        const c2 = (await back.wait('state', v => v.room.phase === 'playing' && v.room.rules.game === 'charades')).room;
        assert.equal(c1.charade.prompt, 'A dancing robot');
        assert.ok(!c2.charade.prompt);
    }
    finally {
        clients.forEach(ws => ws.terminate());
        proc.kill();
    }
});

