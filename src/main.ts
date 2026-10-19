import {RoomMusic} from './music-player';
import {spectatorPanel,audiencePanel} from './spectator-ui';
import {followChat} from './chat-scroll';
import {spinGameWheel} from './game-wheel';
import {jackPlay,jackSettings,bindJack,pickJackMarble} from './jackaroo-ui';
import './jackaroo.css';
import {clubGames,clubSettings,clubPlay,bindClub} from './club-ui';
import './club.css';
import {infoHtml} from './info-ui';
import {rooftopAudio} from './rooftop-audio';
import {charadeLobby,charadePlay,charadeRecap,peekControls,aftermathControls,bindParty} from './party-ui';
import './party.css';
import {pokerSettings,pokerPlay,bindPoker} from './poker-ui';
import './poker.css';
import {backgrounds,expansionSettings,expansionPlay,expansionLobby,mountExpansion,bindExpansion,raidHtml,rpgPick} from './expansion-ui';
import {chaosFields,chaosHud} from './chaos-ui';
import {tickChaosAudio} from './chaos-audio';
import {triviaCategories,easyQuestionCounts} from "../shared/trivia";
import {charadeCategories} from "../shared/charades";
import { GameAudio } from './audio';
import { socialHTML, tradeDraft, resetTradeDraft } from './social';
import type { GameEvent } from '../shared/types';
import { validateRules, orderCards } from '../shared/rules';
import './style.css';
import { GameScene } from './scene';
import { defaults, games, type Action, type Card, type Game, type Rules, type View } from '../shared/types';
const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const rank = (r: number) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' }[r] || String(r));
let room: View | undefined, id = '', connected = false, socket: WebSocket, draft: Rules = { ...defaults }, filter = 'all', rulesTab = 'general', selected = new Set<string>(), peek: Card[] = [];
let pendingCreate: Rules | undefined;
let shelfOpen=true, rulesOpen=true, chatOpen=true, handListOpen=false, layoutInstance=-1;
let infoTab='games';
let chatFollower:ReturnType<typeof followChat>|undefined,chatRoom='';
let camera = 'third', reconnectTimer: ReturnType<typeof setTimeout>, scene: GameScene | undefined, help = false;
const audio = new GameAudio();
const music = new RoomMusic(send);
let seenEvent = 0, eventRoom = '', effectTimer: ReturnType<typeof setTimeout>;
document.addEventListener('pointerdown', () => {void audio.unlock();music.enable();}, {capture:true});
document.addEventListener('keydown', () => {void audio.unlock();music.enable();}, {capture:true});
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `<div class="shell"><aside class="sidebar" id="sidebar"></aside><main><header id="header"></header><div class="workspace"><section class="table-area"><div id="intro"></div><div class="stage"><div class="stage-top" id="stage-top"></div><div id="scene" aria-label="Low polygon multiplayer game table"></div><div id="stage-bottom"></div><div id="effects-layer" aria-live="polite"></div></div><div id="play-panel"></div></section><aside class="right-rail"><button id="rules-toggle" data-action="toggleRules"></button><section class="rules-panel" id="rules-panel"></section><section id="audience-panel"></section><div id="activity"></div></aside></div><footer><span>MADE FOR GAME NIGHT. BUILT FOR YOUR RULES.</span><span>SELF-HOSTED <i></i> VERSION 0.20.1</span></footer></main></div><div id="toast" role="status" aria-live="polite"></div><div id="modal-root"></div>`;
try {
    scene = new GameScene(document.querySelector('#scene')!);scene.onAim=send;
}
catch {
    document.querySelector('#scene')!.innerHTML = '<div class="scene-fallback">♠<br>Your table is ready.<small>Enable WebGL to see the low-poly room.</small></div>';
}
function send(a: Action) { if (!connected) {
    toast('Reconnecting to the game server…');
    return;
} socket.send(JSON.stringify(a)); }
function toast(text: string) { const el = document.querySelector('#toast')!; el.textContent = text; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 4000); }
function connect() { clearTimeout(reconnectTimer); socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/ws`); socket.onopen = () => socket.send(JSON.stringify({ type: 'hello', token: sessionStorage.getItem('house-token') })); socket.onmessage = e => { const msg = JSON.parse(e.data); if (msg.type === 'session') {
    sessionStorage.setItem('house-token', msg.token);
    id = msg.id;
    connected = true;
    render();
} if (msg.type === 'state') {
    const first = !room;
    const previousPhase = room?.phase;
    const changed = JSON.stringify(room?.rules) !== JSON.stringify(msg.room.rules);
    room = msg.room;
    peek=room!.peek||[];
    if(room!.phase === 'playing' && layoutInstance !== room!.gameInstance){ layoutInstance=room!.gameInstance;shelfOpen=false;rulesOpen=false;handListOpen=false;selected.clear();peek=[];chatOpen=innerWidth>760; }
    if(room!.phase === 'lobby' && previousPhase !== 'lobby'){shelfOpen=true;rulesOpen=true;chatOpen=true;}

    if (first || changed)
        draft = { ...room!.rules };
    if (first && pendingCreate) {
        draft = pendingCreate;
        pendingCreate = undefined;
        send({ type: 'rules', rules: draft });
    }
    camera = room!.spectating?'third':first ? draft.camera : camera;
    selected = new Set([...selected].filter(c => room!.hand.some(h => h.id === c)));
    render();
    if (first)
        history.replaceState(null, '', `?room=${room!.code}`);
} if (msg.type === 'left') {
    room = undefined; shelfOpen=true;rulesOpen=true;chatOpen=true;layoutInstance=-1;
    selected.clear();
    peek = [];
    history.replaceState(null, '', location.pathname);
    render();
} if(msg.type==='musicResults')music.resultsMessage(msg);
if (msg.type === 'error'){music.error(msg.message);toast(msg.message);} if (msg.type === 'peek') {
    peek = msg.cards;
    renderPlay();
    setTimeout(() => { peek = []; renderPlay(); }, Math.max(0, msg.expires - Date.now()));
} }; socket.onclose = () => { connected = false;music.update(room,id,false); renderHeader(); reconnectTimer = setTimeout(connect, 1800); }; socket.onerror = () => socket.close(); }
const button = (label: string, action: string, disabled = false, cls = '') => `<button class="${cls}" data-action="${action}" ${disabled ? 'disabled' : ''}>${label}</button>`;
function render() {
    const focus = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    const focusId = focus?.id;
    const position = focus && 'selectionStart' in focus ? focus.selectionStart : null;
    const drafts = new Map(['spectator-target','bj-bet','bj-pair','bj-trio','scribble-award-target','sore-loser-target','poker-raise','chat','guess','trivia-answer','player-name','room-code','scribble-guess','rpg-name','rpg-inventory','rpg-notes','rpg-narrative','rpg-enemy-name','rpg-enemy-x','rpg-enemy-y','rpg-enemy-hp','rpg-enemy-ac','rpg-target','rpg-die','rpg-ability'].map(key => [key, (document.getElementById(key) as HTMLInputElement | null)?.value]));
    if(room?.phase==='lobby') resetTradeDraft();
    applyLayout();
    music.update(room,id,connected);
    renderSidebar(); renderHeader(); renderIntro(); renderStage(); renderRules(); renderPlay(); renderActivity();document.querySelector('#audience-panel')!.innerHTML=audiencePanel(room,id);
    for (const [key, value] of drafts) {
        const field = document.getElementById(key) as HTMLInputElement | null;
        if (field && value !== undefined) if(field instanceof HTMLSelectElement){if(Array.from(field.options).some(o=>o.value===value))field.value=value;}else field.value = value;
    }
    if (focusId) {
        const field = document.getElementById(focusId) as HTMLInputElement | null;
        if (field) { field.focus({ preventScroll: true }); if (position !== null && !['number','range','checkbox','color'].includes(field.type)) field.setSelectionRange(position, position); }
    }
    document.querySelector('.workspace')!.classList.toggle('board-layout', ['property','life'].includes(draft.game));
    scene?.update(draft.game, room, id, draft.background);
    if (scene) {scene.mode = camera;scene.setSelected(selected);}
    applyLayout();
    mountExpansion(room,id,send);
    document.querySelector('#raid-hud')?.remove();if(room&&room.phase==='playing'&&room.rules.chaosRaid&&room.players.length>1&&!room.spectating){const hud=document.createElement('div');hud.id='raid-hud';hud.innerHTML=raidHtml(room,id);document.querySelector('.stage')!.append(hud);}
    chaosHud(room?.spectating?undefined:room,id);
    presentEvents();
}
function renderSidebar() { document.querySelector('#sidebar')!.innerHTML = `<a class="brand" href="/" aria-label="House Rules home"><span class="brand-mark">H<span>R</span></span><span>HOUSE<br>RULES<span class="brand-dot">.</span></span></a><button class="spin-game-button" data-action="spinGame" ${locked()?'disabled':''}><span>◉</span> Spin the wheel<small>Pick a random game</small></button><div class="side-label">YOUR GAME SHELF <span>${Object.keys(games).length}</span></div><div class="filters">${['all', 'cards', 'party', 'tabletop'].map(f => `<button data-filter="${f}" class="${filter === f ? 'active' : ''}">${f === 'all' ? 'All games' : f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div><nav aria-label="Game presets">${Object.entries(games).filter(([, g]) => filter === 'all' || g.category.toLowerCase() === filter).map(([key, g]) => `<button class="game-item ${draft.game === key ? 'active' : ''}" data-game="${key}" ${room && (room.host !== id || room.phase !== 'lobby') ? 'disabled' : ''}><span class="game-icon ${key}">${g.icon}</span><span><strong>${g.name}</strong><small>${g.category} <b>·</b> ${g.players} PLAYERS</small></span><span class="game-arrow">↗</span></button>`).join('')}</nav><div class="side-bottom"><div class="tiny-dice">⚄</div><strong>The best rule?<br>Make it your own.</strong><p>Familiar games. Unfamiliar twists.<br>Entirely your table.</p><button class="text-btn" data-action="help">Info <span>↗</span></button></div>`; }
function renderHeader() {
  const live = !!room && room.phase !== 'lobby';
  document.querySelector('header')!.innerHTML=`<div class="header-left">${button('☰ Games','toggleShelf',false,'shelf-toggle '+(shelfOpen?'active':''))}<div class="breadcrumb">${live?esc(games[room!.rules.game].name):'Game room'} <span>/</span> <strong>${live?'Round '+room!.round:room?'The living room':'Create your night'}</strong></div></div><div class="header-right">${room?.host===id&&live?`<div class="host-controls">${button('Restart','restartAsk',false,'secondary')}${room.phase==='playing'?button('End game','endAsk',false,'secondary'):''}${button('Lobby','resetAsk',false,'text-btn')}</div>`:''}${button('Chat','toggleChat',false,'chat-toggle')}<button class="sound-control" data-action="sound" aria-label="${audio.muted?'Enable sound':'Mute sound'}">${audio.muted?'♬ Sound off':'♫ Sound on'}</button><button class="music-button" data-action="music" aria-label="Open music player">♫ Music</button><span class="connection ${connected?'online':''}"><i></i>${connected?'Connected':'Reconnecting'}</span>${button('Info','help',false,'help-btn')}</div>`;
}
function renderIntro() { const g = games[draft.game]; document.querySelector('#intro')!.innerHTML = `<div class="eyebrow"><span></span> YOUR TABLE. YOUR RULES.</div><div class="intro-title"><h1>${room ? esc(g.name) : 'Good friends.<br><em>Questionable rules.</em>'}</h1><span class="edition">THE GAME NIGHT<br>SANDBOX</span></div><p>${room ? esc(g.description) : 'Pick a classic. Bend the rules. Make a night of it.'}</p>`; }
function renderStage() {
    const g = games[draft.game];
    document.querySelector('#stage-top')!.innerHTML = `<div class="table-name"><span class="live-dot"></span><strong>${room ? room.phase === 'lobby' ? 'WAITING ROOM' : room.phase === 'finished' ? 'GAME COMPLETE' : 'AT THE TABLE' : 'YOUR NEXT GAME NIGHT'}</strong><span>${room ? `${room.players.length}/${room.rules.maxPlayers} seated` : 'Low-poly living room'}</span></div><div class="camera-switch" aria-label="Camera view">${['property','life','rpg'].includes(draft.game) ? `<button data-action="boardZoom" class="${scene?.closeBoard ? 'active' : ''}">⌕ Board zoom</button>` : ''}<button data-camera="third" class="${camera === 'third' ? 'active' : ''}" title="Third-person view">◈ Overview</button><button ${room?.spectating?'disabled':''} data-camera="first" class="${camera === 'first' ? 'active' : ''}" title="First-person view">◉ My seat</button></div>`;
    const deadline=room?.clash?.expires||room?.lastPlay?.expires;if(deadline)document.querySelector('.table-name')!.insertAdjacentHTML('beforeend',`<span class="challenge-clock">Call window <b data-countdown="${deadline}"></b></span>`);
    document.querySelector('#tarneeb-status')?.remove();
    if(room && draft.game==='tarneeb' && room.phase!=='lobby'){
      const entries=room.trick.length?room.trick:room.lastTrick||[];
      const status=document.createElement('div');status.id='tarneeb-status';status.innerHTML=`<div class="tarneeb-scoreboard" aria-label="Tarneeb team scoreboard">${[0,1].map(team=>`<div><strong>TEAM ${team+1}</strong><span>${room!.players.filter((_,i)=>i%2===team).map(p=>esc(p.name)).join(' + ')}</span><b>${room!.tricks[team]} / 13 hands won</b><em>${room!.teamScores[team]} total points</em></div>`).join('')}</div><div class="table-trick-readout"><small>${room.trick.length?'ON THE TABLE':!room.lastTrick?.length?'PLAYED CARDS · EMPTY':room.trickCollectUntil>Date.now()?'COLLECTING TRICK':'LAST TRICK · TEAM '+(room.lastTrickTeam+1)}</small>${entries.map(t=>`<span class="${t.card.suit==='♥'||t.card.suit==='♦'?'red':''}"><b>${rank(t.card.rank)}${t.card.suit}</b> ${esc(room!.players.find(p=>p.id===t.player)?.name)}</span>`).join('')}</div>`;
      document.querySelector('.stage')!.append(status);
    }
    const seats = room?.players || [];
    document.querySelector('#stage-bottom')!.innerHTML = `<div class="stage-caption"><span>${g.icon}</span><div><small>${g.category} COLLECTION</small><strong>${g.name}</strong></div><span class="pill">${room?.phase === 'playing' ? 'ROUND ' + room.round : 'CUSTOMIZABLE'}</span></div>${seats.length ? `<div class="seats">${seats.map((p, i) => `<div class="seat ${room?.phase === 'playing' && room.turn === i ? 'turn' : ''}"><span style="--player:${esc(p.color)}" class="avatar">${esc(p.name[0].toUpperCase())}</span><div><strong>${esc(p.name)}${p.id === id ? ' <small>(you)</small>' : ''}</strong><small>${!p.connected ? 'Away' : room?.phase === 'lobby' ? p.id === room.host ? 'Host' : p.ready ? 'Ready ✓' : 'Not ready' : ['property', 'life'].includes(draft.game) ? `$${p.cash} · Tile ${p.position + 1}` : ['poker','blackjack'].includes(draft.game)?p.cash+' chips':draft.game==='werewolf'?(room?.werewolf?.alive.includes(p.id)?'Alive':'Eliminated'):draft.game==='darts'?(room?.darts?.remaining[p.id]??draft.dartsStart)+' remaining':draft.game==='beerpong'?'Team '+((room?.pong?.teams.findIndex(t=>t.includes(p.id))??room!.players.indexOf(p)%2)+1)+' · '+p.score+' cups hit':room?.solitaire?'Solitaire · '+room.solitaire.moves+' moves':draft.game==='rpg'?`${room?.rpg?.characters.find(c=>c.owner===p.id)?.class||'adventurer'} · HP ${room?.rpg?.characters.find(c=>c.owner===p.id)?.hp||0}`:['charades','trivia','scribble'].includes(draft.game) ? draft.game==='trivia'&&p.id===room?.triviaMaster?'Trivia master':p.score + (p.score===1?' point':' points') : p.handCount + ' cards'}</small></div>${room?.host === id && p.id !== id && room.phase === 'lobby' ? `<button class="kick" data-target="${p.id}" data-kind="kick" title="Remove ${esc(p.name)}">×</button>` : ''}</div>`).join('')}</div>` : `<div class="preview-note"><i></i> A seat for everyone. A rule for anything.</div>`}`;

    if(room?.phase === 'playing' && ['property','life'].includes(draft.game)) {
      const mine = room.players[room.turn]?.id === id, busy = room.busyUntil > Date.now();
      document.querySelector('#stage-bottom')!.insertAdjacentHTML('beforeend', `<div class="board-table-controls"><span>Dice: ${room.rollDice.join(' + ') || '—'}</span>${button('⚄ Roll at table','roll',!mine||room.rolled||busy,'primary')}${button('Pass at table →','endTurn',!mine||!room.rolled||busy||!!room.pendingLife,'secondary')}</div>`);
    }
    if(room?.duel && [room.duel.acePlayer,room.duel.trumpPlayer].includes(id)) {
      document.querySelector('#stage-bottom')!.insertAdjacentHTML('beforeend', `<div class="table-duel-controls"><span>Beat ${room.duel.round} · <b data-countdown="${room.duel.ends}"></b></span>${['jab','hook','block'].map(move=>`<button data-boxing="${move}" class="secondary" ${room!.duel!.ready.includes(id)?'disabled':''}>${move[0].toUpperCase()+move.slice(1)}</button>`).join('')}</div>`);
    }
}
const toggle = (key: keyof Rules, title: string, description: string) => `<label class="rule-toggle"><span><strong>${title}</strong><small>${description}</small></span><input type="checkbox" data-rule="${key}" ${draft[key] ? 'checked' : ''} ${locked() ? 'disabled' : ''}><span class="switch"></span></label>`;
const slider = (key: keyof Rules, title: string, min: number, max: number, step = 1, suffix = '') => `<label class="rule-slider"><span>${title}<output>${esc(draft[key])}${suffix}</output></span><input type="range" data-rule="${key}" min="${min}" max="${max}" step="${step}" value="${draft[key]}" ${locked() ? 'disabled' : ''}></label>`;
const textfield = (key: keyof Rules, title: string, placeholder: string, multiline = false) => `<label class="rule-text"><span>${title}</span>${multiline ? `<textarea data-rule="${key}" placeholder="${placeholder}" ${locked() ? 'disabled' : ''}>${esc(draft[key])}</textarea>` : `<input data-rule="${key}" value="${esc(draft[key])}" placeholder="${placeholder}" ${locked() ? 'disabled' : ''}>`}</label>`;
function locked() { return !!room && (room.host !== id || room.phase !== 'lobby'); }
function renderRules() {
    const card = ['jackaroo','bluff', 'tarneeb', 'cards','poker'].includes(draft.game);
    let fields = '';
    if (rulesTab === 'general')
        fields = `<div class="rules-section-title">THE TABLE</div>${slider('maxPlayers', 'Player limit', 2, 8)}<label class="rule-text"><span>Game background</span><select data-rule="background" ${locked()?'disabled':''}>${Object.entries(backgrounds).map(([value,title])=>`<option value="${value}" ${draft.background===value?'selected':''}>${title}</option>`).join('')}</select></label><label class="rule-text"><span>Default perspective</span><select data-rule="camera" ${locked() ? 'disabled' : ''}><option value="third" ${draft.camera === 'third' ? 'selected' : ''}>Third person · Overview</option><option value="first" ${draft.camera === 'first' ? 'selected' : ''}>First person · Your seat</option></select></label>${toggle('reverseTurns', 'Reverse turn order', 'Go against the grain. Literally.')}${draft.background==='rooftop'?toggle('rooftopAntics','Rooftop loser exits','Losing avatars jump off the roof and parachute back.'):''}${toggle('soreLoser','Sore loser paintball','After a heavy loss, tag a rival once with a cartoon paintball.')}<div class="rules-section-title">A LITTLE MISCHIEF</div>${card ? toggle('allowPeeking', 'Allow card peeking', 'A sneaky look at up to 3 cards.') + toggle('catchPeeking', 'Catch a peeker', '1-second slap window · 4-second reveal · 8-play cooldown.') + textfield('penalty', 'Caught-peeking penalty', 'Speak like a pirate until your next turn') : draft.game==='poker'?'<p class="muted">Hole cards stay private until showdown. Poker chaos uses bonus points and between-hand chip challenges.</p>':'<p class="muted">Peeking rules are available in card games. Switch to a card preset to try them.</p>'}`;
    if (rulesTab === 'game') {
        if (card)
            fields = `<div class="rules-section-title">THE DECK</div>${draft.game === 'tarneeb' ? '<p class="muted">One 52-card deck. Four players. Partners sit in alternating seats.</p>' : slider('decks', 'Number of decks', 1, 3)}${draft.game === 'cards' ? `<label class="rule-text"><span>Card table layout</span><select data-rule="cardLayout" ${locked()?'disabled':''}><option value="free" ${draft.cardLayout==='free'?'selected':''}>Free card sandbox</option><option value="solitaire" ${draft.cardLayout==='solitaire'?'selected':''}>Klondike Solitaire · one player</option></select></label>`+slider('handSize', 'Starting hand', 1, 20) : ''}${draft.game === 'bluff' ? slider('challengeSeconds', 'Challenge window', 5, 30, 1, 's') : ''}${draft.game === 'tarneeb' ? toggle('followSuit', 'Must follow suit', 'Play the led suit if you have it.') + toggle('boxingDuels', 'Box for your ace', 'Fight when an opponent trumps your ace.') + slider('challengeSeconds','Challenge countdown',5,30,1,'s') + slider('targetScore', 'Winning team score', 10, 100) : ''}<p class="rule-callout">${draft.game === 'bluff' ? 'The rank advances A → K. You can play 1–4 cards face down and claim the current rank.' : draft.game === 'tarneeb' ? 'Bid 7–13 tricks. The highest bidder picks trump. Seats 1 + 3 face seats 2 + 4.' : 'Draw, play, collect, and pass. Your group decides the objective.'}</p>`;
        if (draft.game === 'charades')
            fields = `<div class="rules-section-title">THE SPOTLIGHT</div><label class="rule-text"><span>Charades category · 100 prompts each</span><select data-rule="charadeCategory" ${locked()?'disabled':''}>${Object.entries(charadeCategories).map(([value,title])=>`<option value="${value}" ${draft.charadeCategory===value?'selected':''}>${title}</option>`).join('')}</select></label>${slider('charadeSeconds', 'Guessing time per teammate', 15, 180, 5, 's')}${slider('charadeRounds','Rounds per pair',1,5)}<p class="rule-callout">Each person guesses for the full timer. Their partner acts, then they swap roles for another full timer. Both turns count toward the pair’s total. Choose partners in the lobby.</p>${toggle('allowSkipping', 'Allow skipping', 'Sometimes a prompt just isn’t it.')}${slider('skipPenalty', 'Points lost per skip', 0, 5)}${textfield('charadePrompts', 'Your own prompts', 'One prompt per line. Leave blank for the house collection.', true)}`;
        if (['property', 'life'].includes(draft.game))
            fields = `<div class="rules-section-title">THE BANK</div>${slider('startingCash', 'Starting cash', 100, 10000, 100, ' $')}${slider('salary', 'Pass Home bonus', 0, 2000, 50, ' $')}${slider('roundLimit', 'Round limit', 3, 50)}${draft.game === 'property' ? slider('rentMultiplier', 'Rent multiplier', .25, 5, .25, '×') + toggle('freeParking', 'Rest-stop jackpot', 'Collect taxes paid into the pot.') + toggle('allowTrading', 'Property negotiations', 'Offer cash and property to any player.') + toggle('tradeSlaps', 'Refusal slap', 'Turn down a deal with a cartoon slap.') : '<p class="rule-callout">Choose a career. Take the steady path or chance a bigger reward. Highest net worth wins.</p>'}`;
    }
    if(rulesTab==='game'&&draft.game==='trivia')fields=`<div class="rules-section-title">THE QUIZ ROUND</div><label class="rule-text"><span>Question difficulty</span><select data-rule="triviaDifficulty" ${locked()?'disabled':''}><option value="easy" ${draft.triviaDifficulty==='easy'?'selected':''}>Easy · everyday knowledge</option><option value="mixed" ${draft.triviaDifficulty==='mixed'?'selected':''}>Mixed · full question bank</option></select></label><label class="rule-text"><span>Answer format</span><select data-rule="triviaFormat" ${locked()?'disabled':''}><option value="typed" ${draft.triviaFormat==='typed'?'selected':''}>Type an answer</option><option value="choices" ${draft.triviaFormat==='choices'?'selected':''}>Multiple choice · select an answer</option></select></label><p class="rule-callout">Easy questions only; rounds cap at the available easy questions in the selected category (${easyQuestionCounts[draft.triviaCategory]} for this category). Mixed includes all 100 questions. No repeated questions within a round.</p><label class="rule-text"><span>Who plays?</span><select data-rule="triviaHostMode" ${locked()?'disabled':''}><option value="everyone" ${draft.triviaHostMode==='everyone'?'selected':''}>Everyone plays · automatic questions</option><option value="master" ${draft.triviaHostMode==='master'?'selected':''}>With a trivia master</option></select></label><label class="rule-text"><span>Automatic round category</span><select data-rule="triviaCategory" ${locked()?'disabled':''}>${Object.entries(triviaCategories).map(([value,title])=>`<option value="${value}" ${draft.triviaCategory===value?'selected':''}>${title}</option>`).join('')} </select></label>${slider('triviaQuestions','Questions per round',1,100)}${slider('triviaSeconds','Time per question',5,180,5,'s')}<label class="rule-text"><span>Answer mode</span><select data-rule="triviaMode" ${locked()?'disabled':''}><option value="ffa" ${draft.triviaMode==='ffa'?'selected':''}>Free for all</option><option value="turns" ${draft.triviaMode==='turns'?'selected':''}>Turn based</option></select></label><p class="rule-callout">Everyone plays mode asks questions automatically using the chosen category. With a master, the volunteer asks questions and selects the category. Correct typed answers or selected choices earn the point automatically; the master can award spoken answers.</p>`;
    if(rulesTab==='game'&&draft.game==='jackaroo')fields=jackSettings(draft,locked());
    if(rulesTab==='game'&&clubGames.includes(draft.game))fields=clubSettings(draft,locked());
    if(rulesTab==='game'&&draft.game==='poker')fields=pokerSettings(draft,locked());
    if(rulesTab==='game'&&['scribble','rpg'].includes(draft.game))fields=expansionSettings(draft,locked());
    if(rulesTab==='chaos')fields=chaosFields(draft,locked(),room?.players.length);
    if (rulesTab === 'notes')
        fields = `<div class="rules-section-title">YOUR HOUSE CONTRACT</div>${textfield('customNotes', 'Rules everyone agrees to', 'e.g. Winner picks the next game. No table talk after a bid.', true)}<p class="rule-callout">Written rules and funny penalties are carried out by your group. Toggles and parameters are enforced by the game.</p><div class="rules-section-title">SAVE YOUR RECIPE</div>${button('↓ Export rules', 'export', false, 'secondary full')}<label class="import-label">↑ Import rules<input type="file" id="import-rules" accept="application/json,.json" ${locked() ? 'disabled' : ''}></label>`;
    document.querySelector('#rules-panel')!.innerHTML = `<div class="rules-heading"><span class="rules-icon">☷</span><div><h2>House rules</h2><p>A classic, with your signature.</p></div><span class="rule-count">${draft.allowPeeking ? '✦' : '◈'}</span></div><div class="rule-tabs">${['general', 'game', 'chaos', 'notes'].map(t => `<button data-tab="${t}" class="${rulesTab === t ? 'active' : ''}">${t === 'general' ? 'The basics' : t === 'game' ? 'Game rules' : t==='chaos'?'Chaos':'Custom'}</button>`).join('')}</div><div class="rule-fields">${fields}</div><div class="rules-bottom"><span><i class="${locked() ? 'locked' : ''}"></i>${locked() ? room?.phase === 'lobby' ? 'Host controls the rules' : 'Rules locked during play' : room ? 'Changes apply to everyone' : 'Set the tone before you host'}</span>${room?.host === id && room.phase === 'lobby' ? button('Apply house rules ↗', 'apply', false, 'primary full') : !room ? '<div class="rules-tip">A little chaos makes a great story.</div>' : ''}</div>`;
}
function cardHTML(c: Card, selectable = true) { return `<button class="playing-card ${c.suit === '♥' || c.suit === '♦' ? 'red' : ''} ${selected.has(c.id) ? 'selected' : ''}" ${selectable ? `data-card="${esc(c.id)}"` : 'disabled'} aria-label="${rank(c.rank)} ${c.suit}" aria-pressed="${selected.has(c.id)}"><span>${rank(c.rank)}<small>${c.suit}</small></span><b>${c.suit}</b><span class="card-foot">${rank(c.rank)}</span></button>`; }
function renderPlay() {
    const el = document.querySelector('#play-panel')!;
    renderPeekQuickEvent();
    const g = games[draft.game];
    if (!room) {
        const invite = new URLSearchParams(location.search).get('room') || '';
        el.innerHTML = `<div class="host-panel"><div><span class="eyebrow">LET’S GET THE GROUP TOGETHER</span><h2>Every great night starts <br>with an open table.</h2></div><form id="room-form"><label>Your name<input id="player-name" maxlength="24" placeholder="What should we call you?" value="${esc(localStorage.getItem('house-name') || '')}" required></label><div class="host-actions"><button class="primary" type="submit" name="intent" value="create" ${connected ? '' : 'disabled'}>Host a table <span>↗</span></button><button class="secondary" type="submit" name="intent" value="join" ${connected ? '' : 'disabled'}>Join friends</button><button class="secondary" type="submit" name="intent" value="watch" ${connected?'':'disabled'}>Watch as spectator</button></div><input id="room-code" maxlength="6" placeholder="ROOM CODE TO JOIN" aria-label="Room code to join" value="${esc(invite)}"></form></div>`;
        return;
    }
    if(room.spectating){el.innerHTML=spectatorPanel(room,id);updateTimers();return;}
    if(room.raid&&room.raid.phase!=='offer'){const d=room.raid;el.innerHTML=`<div class="gameplay boxing-status"><strong>Winner Takes It · Boxing Club</strong><p>${d.phase==='ready'?'Get ready… moves unlock after the countdown.':d.phase==='fight'?'Choose secretly: jab beats hook, hook beats block, block beats jab.':`${esc(room.players.find(p=>p.id===d.from)?.name)}: ${esc(d.lastBeat?.a)} · ${esc(room.players.find(p=>p.id===d.to)?.name)}: ${esc(d.lastBeat?.b)}`}</p><span>Beat ${d.round}/3 · ${d.wins.join(' : ')} · <b data-countdown="${d.ends}"></b></span></div>`;return;}
    const me = room.players.find(p => p.id === id), myTurn = room.players[room.turn]?.id === id, host = room.host === id;
    if (room.phase === 'lobby') {
        el.innerHTML = `<div class="lobby-panel"><div><small class="eyebrow">INVITE YOUR PEOPLE</small><div class="invite-code">${room.code} ${button('⧉ Copy invite', 'invite', false, 'text-btn')}</div><p>${g.name} · ${room.players.length} at the table · ${['jackaroo','tarneeb'].includes(draft.game) ? '4 needed · opposite seats are partners' : ['cards','rpg','blackjack','darts'].includes(draft.game) ? '1–8 players' :draft.game==='werewolf'?'4–8 players':draft.game==='beerpong'?'2, 4, 6 or 8 · alternating seats form teams' : draft.game==='charades'?'2, 4, 6 or 8 · choose your pair below':'2–8 players'}</p></div><div class="lobby-actions">${button(host ? 'Start game →' : me?.ready ? 'Ready ✓' : 'I’m ready', '' + (host ? 'start' : 'ready'), !connected || (host&&draft.game==='jackaroo'&&room.players.length!==4) || (host&&draft.game==='werewolf'&&(room.players.length<4||draft.wolfCount*2>=room.players.length)) ||(host&&draft.game==='beerpong'&&![2,4,6,8].includes(room.players.length)) || (host && draft.game==='trivia' && (room.players.length<2||draft.triviaHostMode==='master'&&!room.triviaMaster)) || (host&&draft.game==='cards'&&draft.cardLayout==='solitaire'&&room.players.length!==1)||(host && draft.game==='charades' && ![2,4,6,8].includes(room.players.length)), 'primary')}${!host?button('Watch instead','spectate',false,'text-btn'):''}${button('Leave table', 'leave', false, 'text-btn')}</div></div>${draft.game==='trivia'&&draft.triviaHostMode==='master'?`<div class="trivia-lobby"><h3>Trivia master</h3><p>${room.triviaMaster?esc(room.players.find(p=>p.id===room!.triviaMaster)?.name)+' will ask the questions.':'One person volunteers to ask questions; everyone else competes.'}</p>${room.rules.game!=='trivia'?host?button('Apply Trivia rules','apply',false,'primary'):'Waiting for the host to apply Trivia rules.':button(room.triviaMaster===id?'Release master seat':'Volunteer as trivia master','triviaVolunteer',!!room.triviaMaster&&room.players.some(p=>p.id===room!.triviaMaster)&&room.triviaMaster!==id,'secondary')}</div>`:''}${charadeLobby(room,id)}${expansionLobby(room,id)}${draft.customNotes ? `<div class="house-contract"><strong>Tonight’s house contract</strong><p>${esc(draft.customNotes)}</p></div>` : ''}`;
        return;
    }
    if (room.phase === 'finished') {
        el.innerHTML = `<div class="winner-panel"><span>✦</span><div><small>THE HOUSE HAS SPOKEN</small><h2>${room.endReason==='tableFlip'?'Table flipped. Nobody wins.':room.endedEarly?'Game ended early.':esc(room.winner)+' wins.'}</h2><p>${room.endedEarly?'No winner was declared. Ready for another round?':'Good game. Questionable decisions.'}</p></div>${host ? button('Restart game →', 'restartAsk', false, 'primary')+button('Edit rules / lobby', 'lobby', false, 'secondary') : '<p>Waiting for the host to open a new game.</p>'}</div>`;
        if(draft.game==='jackaroo')el.insertAdjacentHTML('beforeend',jackPlay(room,id));if(clubGames.includes(draft.game))el.insertAdjacentHTML('beforeend',clubPlay(room,id));if(draft.game==='poker')el.insertAdjacentHTML('beforeend',pokerPlay(room,id));
        if(draft.game==='trivia')el.insertAdjacentHTML('beforeend',`<div class="charades-recap"><h3>Trivia results · ${room.trivia?.category?esc(triviaCategories[room.trivia.category]):'Round ended'}</h3>${room.trivia?.current?`<p>Final question: ${esc(room.trivia.current.question)}<br>Answer: <strong>${esc(room.trivia.current.answer)}</strong></p>`:''}${room.players.filter(p=>p.id!==room!.trivia?.master).sort((a,b)=>b.score-a.score).map(p=>`<div><strong>${esc(p.name)}${p.id===id?' (you)':''}</strong><b>${p.score} ${p.score===1?'point':'points'}</b><span>${p.correctAnswers} correct</span></div>`).join('')}</div>`);
        if(draft.game==='charades')el.insertAdjacentHTML('beforeend',charadeRecap(room,id));
        el.insertAdjacentHTML('beforeend',aftermathControls(room,id));
        return;
    }
    const jack=jackPlay(room,id);if(jack){el.innerHTML=jack+peekControls(room,id);return;}
    const charade=charadePlay(room,id);if(charade){el.innerHTML=charade;return;}
    const poker=pokerPlay(room,id);if(poker){el.innerHTML=poker+peekControls(room,id);return;}
    const club=clubPlay(room,id);if(club){el.innerHTML=club;return;}
    const extra=expansionPlay(room,id);if(extra){el.innerHTML=extra;if(room.busyUntil>Date.now()||room.raid)el.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.disabled=true);return;}
    let controls = '', content = '';
    if (['cards', 'bluff', 'tarneeb'].includes(draft.game)) {
        content = `<div class="hand-header"><div><span class="eyebrow">YOUR HAND</span><span>${room.hand.length} cards · ${selected.size} selected</span></div><span class="turn-label ${myTurn ? 'yours' : ''}">${myTurn ? 'Your move' : esc(room.players[room.turn]?.name) + '’s move'}</span></div><div class="hand">${orderCards(room.hand,draft.game).map(c => cardHTML(c)).join('')}</div>`;
        if (draft.game === 'bluff')
            controls = `<div class="current-claim">${room.lastPlay?.hidden ? `Unseen play · <strong data-countdown="${room.lastPlay.expires}"></strong>` : room.lastPlay ? `${esc(room.players.find(p => p.id === room!.lastPlay!.player)?.name)} claims ${room.lastPlay.count} × ${rank(room.lastPlay.claim)} · <strong data-countdown="${room.lastPlay.expires}"></strong>` : `Claim this turn: <strong>${rank(room.claim)}</strong>`} <span>Pile: ${room.pileCount}</span></div>${room.lastPlay ? button('Call bluff!', 'challenge', room.lastPlay.player === id, 'danger') : ''}${button(`Play ${selected.size || ''} as ${rank(room.claim)} →`, 'play', !myTurn || !selected.size || !!room.lastPlay, 'primary')}`;
        if (draft.game === 'cards')
            controls = `${button('Play selected', 'play', !myTurn || !selected.size, 'primary')}${button('Draw', 'draw', !myTurn || !room.deckCount, 'secondary')}${button('Collect pile', 'collect', !myTurn || !room.pileCount, 'secondary')}${button('Pass turn →', 'pass', !myTurn, 'text-btn')}<span class="muted">${room.deckCount} in deck · ${room.pileCount} on table</span>`;
        if (draft.game === 'tarneeb') {
            controls = `<span class="team-scores">TEAM 1 <b>${room.teamScores[0]}</b> / TEAM 2 <b>${room.teamScores[1]}</b></span>`;
            if (room.tarneebPhase === 'bid')
                controls += `<label class="bid-label">Bid <select id="bid-value">${Array.from({ length: 13 - room.bid }, (_, i) => `<option>${room!.bid + i + 1}</option>`).join('')}</select></label>${button('Place bid', 'bid', !myTurn, 'primary')}${button('Pass', 'bidPass', !myTurn, 'secondary')}<span class="muted">Current bid: ${room.bid === 6 ? 'none' : room.bid}</span>`;
            if (room.tarneebPhase === 'trump')
                controls += `<span>Choose trump:</span>${['♠', '♥', '♦', '♣'].map(s => `<button class="suit-btn" data-suit="${s}" ${myTurn ? '' : 'disabled'}>${s}</button>`).join('')}`;
            if (room.tarneebPhase === 'play')
                controls += `<span class="muted">Contract ${room.bid} · Trump ${room.trump} · Tricks ${room.tricks.join(' / ')}</span>${button('Play card →', 'play', !myTurn || selected.size !== 1, 'primary')}`;
            if (room.tarneebPhase === 'handEnd')
                controls += button('Deal next hand →', 'nextHand', !myTurn, 'primary');
            content += `<div class="trick-cards">${(room.trick.length ? room.trick : room.lastTrick || []).map(t => `<div>${cardHTML(t.card, false)}<small>${esc(room!.players.find(p => p.id === t.player)?.name)}</small></div>`).join('')}</div>`;
        }
        content+=peekControls(room,id);
    }
    if(draft.game==='trivia'&&room.trivia){
      const t=room.trivia,master=t.master===id,eligible=room.players.filter(p=>p.id!==t.master&&p.connected&&(!t.activePlayer||p.id===t.activePlayer)&&!t.excluded?.includes(p.id)),mine=!master&&(!t.activePlayer||t.activePlayer===id)&&!t.excluded?.includes(id)&&!(draft.triviaFormat==='choices'&&t.attempted?.includes(id));
      content=`<div class="trivia-heading"><span class="eyebrow">${master?'YOU ARE THE TRIVIA MASTER':'TRIVIA ROUND'} · ${draft.triviaMode==='ffa'?'FREE FOR ALL':'TURN BASED'}</span><strong>${t.category?esc(triviaCategories[t.category]):'Choose the round category'}</strong><span>Question ${t.current?t.index+1:0} / ${t.total}</span></div>`;
      if(t.phase==='choose'){content+=master?`<label class="rule-text"><span>Round category · easy or mixed</span><select id="trivia-category">${Object.entries(triviaCategories).map(([key,title])=>`<option value="${key}">${title}</option>`).join('')}</select></label>`:'<p>The trivia master is choosing the category.</p>';controls=master?button('Begin round','triviaBegin',false,'primary'):'';}
      else{content+=`<div class="trivia-question"><h2>${esc(t.current?.question)}</h2>${t.phase==='question'?`<b class="timer" data-countdown="${t.ends}"></b>`:''}</div><div class="trivia-choices">${t.current?.choices.map(choice=>`<button class="secondary" data-trivia-choice="${esc(choice)}" data-question="${t.current?.id}" ${!mine||t.phase!=='question'?'disabled':''}>${esc(choice)}</button>`).join('')}</div>`;
        if(master)content+=`<p class="trivia-answer-key">Master's answer: <strong>${esc(t.current?.answer)}</strong></p>`;
        if(t.phase==='question'){
          content+=`<p class="muted">${t.activePlayer?'Answering turn: '+esc(room.players.find(p=>p.id===t.activePlayer)?.name):draft.triviaFormat==='choices'?'First correct choice gets the point.':'First correct typed answer gets the point.'}</p>`;
          controls=master?`<label class="bid-label">Spoken winner <select id="trivia-award-target">${eligible.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></label>${button('Award point ★','triviaAward',!eligible.length,'primary')}${button('Skip / no point','triviaSkip',false,'secondary')}`:mine&&draft.triviaFormat==='choices'?'<span class="muted">Choose one answer above · one attempt per question.</span>':mine?`<form id="trivia-answer-form"><input id="trivia-answer" data-question="${t.current?.id}" aria-label="Trivia answer" maxlength="300" placeholder="Type your answer…" required autocomplete="off"><button class="primary">Answer →</button></form>`:'<span class="muted">'+(t.excluded?.includes(id)?'Hot Potato: out for this question.':t.attempted?.includes(id)?'Answer locked. Wait for the next question.':'Wait for your answering turn.')+'</span>';
        }else{content+=`<p class="trivia-outcome">${t.winner?esc(room.players.find(p=>p.id===t.winner)?.name)+' gets the point! ★':t.reason==='timeout'?'Time is up.':'No point awarded.'} Answer: <strong>${esc(t.current?.answer)}</strong></p>`;controls=master||!t.master&&host?button('Next question →','triviaNext',false,'primary'):'<span class="muted">'+(!t.master?'Next question starts automatically.':'The master will ask the next question.')+'</span>';}
      }
      content+=`<div class="trivia-scores">${room.players.filter(p=>p.id!==t.master).map(p=>`<span>${esc(p.name)} <b>${p.score}</b></span>`).join('')}</div><small class="trivia-credit">Questions: <a href="https://opentdb.com/" target="_blank" rel="noreferrer">Open Trivia DB</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></small>`;
    }
    if (['property', 'life'].includes(draft.game) && me) {
        const t = room.tiles[me.position];
        content = `<div class="board-stats"><div><small>YOUR BALANCE</small><strong>$${me.cash.toLocaleString()}</strong></div><div><small>YOUR SPACE · ${me.position + 1}/24</small><strong>${esc(t.name)}</strong></div><div><small>LAST ROLL</small><strong>${room.lastRoll || '—'}</strong></div><div><small>TURN</small><strong>${myTurn ? 'You' : esc(room.players[room.turn]?.name)}</strong></div></div><div class="board-map">${room.tiles.map((tile, i) => `<div class="board-tile ${me.position === i ? 'here' : ''}" style="${tile.owner ? 'border-color:' + room!.players.find(p => p.id === tile.owner)?.color : ''}"><small>${i + 1} · ${tile.type}</small><strong>${esc(tile.name)}</strong><span>${room!.players.filter(p => p.position === i).map(p => `<span class="tile-player"><i style="background:${p.color}"></i>${esc(p.name)}${p.id===id?' (you)':''}</span>`).join('')}${tile.type === 'property' && draft.game === 'property' ? '$' + tile.price : ''}</span></div>`).join('')}</div>`;
        if (room.pendingLife && myTurn) {
            content += `<div class="life-choice"><h3>${room.pendingLife.kind === 'career' ? 'Choose your career' : 'A fork in the road'}</h3>${button(room.pendingLife.kind === 'career' ? 'Maker · +$100' : 'Steady path · +$100', 'life0', false, 'secondary')}${button(room.pendingLife.kind === 'career' ? 'Explorer · +$50' : 'Take a chance · +$350 / −$150', 'life1', false, 'secondary')}</div>`;
        }
        controls = `${button('⚄ Roll dice', 'roll', !myTurn || room.rolled, 'primary')}${draft.game === 'property' ? button(`Buy space · $${t.price}`, 'buy', !myTurn || !room.rolled || t.type !== 'property' || !!t.owner || me.cash < t.price, 'secondary') : ''}${button('End turn →', 'endTurn', !myTurn || !room.rolled || !!room.pendingLife, 'secondary')}`;
        if (draft.game === 'property') {
            content += `<div class="properties">${room.tiles.map((tile, i) => tile.owner === id ? `<button class="secondary" data-sell="${i}">Sell ${esc(tile.name)} · $${Math.floor(tile.price * .75)}</button>` : '').join('')}</div>`;
        }
    }
    content += socialHTML(room, id);
    el.innerHTML = `<div class="gameplay">${content}<div class="play-controls">${controls}</div></div>${host ? `<div class="reset-line">${button('Return everyone to lobby', 'resetAsk', false, 'text-btn')}</div>` : ''}`;
    if(room.busyUntil > Date.now() || room.clash || room.duel) {
        el.querySelectorAll<HTMLButtonElement>('.play-controls button').forEach(b => b.disabled = true);
        const deal = [...room.events].reverse().find(e => e.kind === 'deal');
        if(deal && Number(deal.data.ends) > Date.now()) {
            el.querySelector('.gameplay')?.classList.add('is-dealing');
            el.querySelectorAll<HTMLElement>('.hand > .playing-card').forEach((c,i) => c.style.setProperty('--deal-delay', (1100+i*30)+'ms'));
        }
    }
    const board = ['property','life'].includes(room.rules.game);
    if(board){const toolbar=el.querySelector('.play-controls');toolbar?.insertAdjacentHTML('beforeend',button('Inspect board','boardMap',false,'text-btn'));}
    if(['cards','bluff','tarneeb'].includes(room.rules.game))el.querySelector('.hand-header')?.insertAdjacentHTML('beforeend',button(handListOpen?'Hide hand list':'Hand list','handList',false,'text-btn hand-list-toggle'));
    renderPeekQuickEvent();
    scene?.setSelected(selected);
    updateTimers();
}
function renderActivity() {
 const activity=document.querySelector<HTMLElement>('#activity')!;
 if(!room){chatFollower?.destroy();chatFollower=undefined;chatRoom='';activity.innerHTML='<section class="activity waiting-chat"><h3>Table talk</h3><p>Your people, your conversation. Host or join a table to get the night started.</p></section>';return;}
 if(chatRoom!==room.code||!chatFollower){
  chatFollower?.destroy();chatRoom=room.code;
  activity.innerHTML='<section class="activity"><div class="activity-heading"><h3>Table talk <span>ROOM '+esc(room.code)+'</span></h3></div><div class="activity-log" role="log" aria-live="polite" aria-label="Table conversation"></div><form id="chat-form"><input id="chat" maxlength="240" aria-label="Table message"><button aria-label="Send table message">↗</button></form></section>';
  chatFollower=followChat(activity.querySelector<HTMLElement>('.activity-log')!);
 }
 const quiet=!!room.werewolf&&room.phase==='playing'&&(room.spectating||!room.werewolf.alive.includes(id)||room.werewolf.phase==='night');
 const input=activity.querySelector<HTMLInputElement>('#chat')!;input.disabled=quiet;input.placeholder=quiet?'Quiet until daylight / observe if eliminated':'A little table talk…';activity.querySelector<HTMLButtonElement>('form button')!.disabled=quiet;
 const format=new Intl.DateTimeFormat(undefined,{hour:'2-digit',minute:'2-digit'});
 chatFollower.update(room.messages.map((message,i)=>`<p data-message-id="${message.id}" class="${i===room!.messages.length-1?'latest':''}"><time>${esc(format.format(message.at))}</time><span>${esc(message.text)}</span></p>`).join(''));
}
function chooseGame(game:Game){
 if(locked())return;draft.game=game;
 draft.maxPlayers=['jackaroo','tarneeb'].includes(game)?4:8;
 if(['jackaroo','tarneeb','poker'].includes(game))draft.decks=1;
 selected.clear();render();
}
function renderPeekQuickEvent(){
    let layer=document.querySelector<HTMLElement>("#peek-quick-event");
    if(!layer){layer=document.createElement("div");layer.id="peek-quick-event";document.querySelector(".stage")?.append(layer);}
    const peeker=room?.phase==="playing" && ["jackaroo","bluff","tarneeb","cards","poker"].includes(room.rules.game) && room.rules.catchPeeking ? room.players.find(p=>p.peekTarget===id && p.catchUntil>Date.now() && p.peekingUntil>Date.now()) : undefined;
    layer.innerHTML=peeker?`<div class="peek-qte" data-expires="${peeker.catchUntil}" role="alert"><strong>${esc(peeker.name)} is peeking at YOUR cards!</strong><button class="danger" data-kind="catch" data-target="${peeker.id}">Slap the peeker ✋ <b data-countdown="${peeker.catchUntil}"></b></button><small>Catch them now · 8-hand peek cooldown</small></div>`:"";
}
function updateTimers() {document.querySelectorAll<HTMLButtonElement>('[data-ready-at]').forEach(b=>{const remaining=Math.max(0,Math.ceil((Number(b.dataset.readyAt)-Date.now())/1000));b.disabled=room?.phase!=='playing'||remaining>0;b.textContent=b.dataset.readyTitle+(remaining?' · '+remaining+'s':'');}); document.querySelectorAll<HTMLElement>(".peek-qte").forEach(el=>{if(Number(el.dataset.expires)<=Date.now())el.remove();}); document.querySelectorAll<HTMLElement>('[data-countdown]').forEach(el => { el.textContent = Math.max(0, Math.ceil((Number(el.dataset.countdown) - Date.now()) / 1000)) + 's'; }); }
setInterval(updateTimers, 250);
setInterval(()=>{tickChaosAudio(audio,room);rooftopAudio(audio,room);},100);
app.addEventListener('click', async (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!el || el.hasAttribute('disabled'))
        return;
    if(el.dataset.spectatorAction){send({type:el.dataset.spectatorAction,target:(document.querySelector('#spectator-target') as HTMLSelectElement)?.value});return;}
    if(el.dataset.kickSpectator){send({type:'kickSpectator',target:el.dataset.kickSpectator});return;}
    if(el.dataset.infoTab){infoTab=el.dataset.infoTab;showHelp();return;}
    if(el.dataset.triviaChoice!==undefined){send({type:'triviaAnswer',text:el.dataset.triviaChoice,question:el.dataset.question});return;}
    if (el.dataset.filter) {
        filter = el.dataset.filter;
        renderSidebar();
    }
    if (el.dataset.game) chooseGame(el.dataset.game as Game);
    if (el.dataset.tab) {
        rulesTab = el.dataset.tab;
        renderRules();
    }
    if (el.dataset.camera) {
        camera = room?.spectating?'third':el.dataset.camera;
        if (scene)
            scene.mode = camera;
        applyLayout(); renderStage(); renderPlay(); scene?.update(draft.game,room,id,draft.background); scene?.setSelected(selected);
    }
    if (el.dataset.card) {
        const c = el.dataset.card;
        if (selected.has(c))
            selected.delete(c);
        else if (selected.size < (draft.game === 'tarneeb' ? 1 : 4))
            selected.add(c);
        else
            toast('Select up to ' + (draft.game === 'tarneeb' ? 1 : 4) + ' cards.');
        renderPlay();
    }
    if (el.dataset.suit)
        send({ type: 'trump', suit: el.dataset.suit });
    if (el.dataset.kind)
        send({ type: el.dataset.kind, target: el.dataset.target });
    if (el.dataset.sell)
        send({ type: 'sell', tile: Number(el.dataset.sell) });
    const action = el.dataset.action;
    if (!action)
        return;
    if(action==='spinGame'){spinGameWheel(document.querySelector<HTMLElement>('#modal-root')!,chooseGame,()=>!locked());return;}
    if(action.startsWith('chaos')){if(action==='chaosYes'||action==='chaosNo')send({type:'chaosVote',yes:action==='chaosYes'});else if(action==='chaosReportWord')send({type:action,target:(document.querySelector('#chaos-offender') as HTMLSelectElement)?.value});else send({type:action});return;}
    if(action==='takeSeat'||action==='spectate'){send({type:action});return;}
    if (action === 'toggleShelf'){shelfOpen=!shelfOpen;applyLayout();renderHeader();return;}
    if (action === 'toggleRules'){rulesOpen=!rulesOpen;applyLayout();return;}
    if (action === 'toggleChat'){chatOpen=!chatOpen;applyLayout();return;}
    if (action === 'handList'){handListOpen=!handListOpen;applyLayout();renderPlay();return;}
    if (action === 'boardMap'){showBoard();return;}
    if (action === 'restartAsk' || action === 'endAsk') {
      const restart=action==='restartAsk';
      document.querySelector('#modal-root')!.innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><h2>${restart?'Restart this game?':'End this game early?'}</h2><p>${restart?'Everyone starts a fresh game with the same rules. Current hands, points, cash and properties reset.':'This ends the current game for everyone without declaring a winner.'}</p>${button(restart?'Restart now':'End game now',restart?'confirmRestart':'confirmEnd',false,'primary')}${button('Keep playing','closeHelp',false,'secondary')}</div></div>`;return;
    }
    if(action==='confirmRestart'||action==='confirmEnd'){document.querySelector('#modal-root')!.innerHTML='';send({type:action==='confirmRestart'?'restart':'endGame'});return;}
    if(action==='music'){music.toggle();return;}
    if (action === 'sound') { audio.toggle(); renderHeader(); return; }
    if (action === 'boardZoom') { if(scene) scene.closeBoard = !scene.closeBoard; renderStage(); return; }
    if (action === 'help') {
        help = true;
        showHelp();
        return;
    }
    if (action === 'closeHelp') {
        help = false;
        document.querySelector('#modal-root')!.innerHTML = '';
        return;
    }
    if (action === 'apply') {
        send({ type: 'rules', rules: draft });
        return;
    }
    if (action === 'start') {
        send({ type: 'start', rules: draft });
        return;
    }
    if (action === 'play') {
        send({ type: 'play', cards: [...selected], claim: room?.claim });
        return;
    }
    if (action === 'bid') {
        send({ type: 'bid', value: Number((document.querySelector('#bid-value') as HTMLSelectElement).value) });
        return;
    }
    if (action === 'bidPass') {
        send({ type: 'bid', value: 0 });
        return;
    }
    if(action==='triviaBegin'){send({type:action,category:(document.querySelector('#trivia-category') as HTMLSelectElement).value});return;}
    if(action==='triviaAward'){send({type:action,target:(document.querySelector('#trivia-award-target') as HTMLSelectElement).value});return;}
    if (action === 'award') {
        send({ type: 'award', target: (document.querySelector('#award-target') as HTMLSelectElement).value });
        return;
    }
    if (action === 'life0' || action === 'life1') {
        send({ type: 'lifeChoice', choice: action === 'life0' ? 0 : 1 });
        return;
    }
    if (action === 'invite') {
        const url = `${location.origin}/?room=${room!.code}`;
        try {
            await navigator.clipboard.writeText(url);
            toast('Invite copied. Send it to your friends.');
        }
        catch {
            toast('Invite: ' + url);
        }
        return;
    }
    if (action === 'resetAsk') {
        document.querySelector('#modal-root')!.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">Reset this game?</h2><p>This ends the current round for everyone and opens the rules editor.</p>${button('Return to lobby', 'confirmReset', false, 'primary')}${button('Keep playing', 'closeHelp', false, 'secondary')}</div></div>`;
        return;
    }
    if (action === 'confirmReset') {
        document.querySelector('#modal-root')!.innerHTML = '';
        send({ type: 'lobby' });
        return;
    }
    if (action === 'export') {
        const blob = new Blob([JSON.stringify({ version: 1, rules: draft }, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'house-rules-' + draft.game + '.json';
        a.click();
        URL.revokeObjectURL(a.href);
        return;
    }
    send({ type: action });
});
app.addEventListener('input', e => { const el = e.target as HTMLInputElement; if (el.dataset.rule) {
    const key = el.dataset.rule as keyof Rules;
    const value = el.type === 'checkbox' ? el.checked : (el.type === 'range'||el.type==='number'||typeof draft[key]==='number') ? Number(el.value) : el.value;
    (draft as unknown as Record<string, unknown>)[key] = value;
    if (el.type === 'range') {
        const output = el.parentElement?.querySelector('output');
        if (output)
            output.textContent = el.value + (['dartsAimSpeed','pongAimSpeed'].includes(key)?'×':'');
    }
    if(key==='background'){scene?.environment.update(draft.background);renderRules();}
    if (key === 'camera') {
        camera = el.value;
        if (scene)
            scene.mode = camera;
        renderStage();
    }
} });
app.addEventListener('change', async (e) => { const el = e.target as HTMLInputElement; if (el.id === 'import-rules' && el.files?.[0]) {
    try {
        const parsed = JSON.parse(await el.files[0].text());
        if (parsed.version !== 1 || !parsed.rules || !games[parsed.rules.game as Game])
            throw new Error();
        draft = validateRules({ ...defaults, ...parsed.rules });
        render();
        toast('Rules loaded. Apply them to share with the table.');
    }
    catch {
        toast('That file is not a House Rules preset.');
    }
} });
app.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (form.id === 'room-form') {
        const name = (document.querySelector('#player-name') as HTMLInputElement).value.trim();
        const intent = (e as SubmitEvent).submitter?.getAttribute('value') || 'create';
        localStorage.setItem('house-name', name);
        if (intent === 'create')
            pendingCreate = { ...draft };
        send({ type: intent, name, code: (document.querySelector('#room-code') as HTMLInputElement).value.trim() });
    }
    if (form.id === 'chat-form') {
        const input = document.querySelector('#chat') as HTMLInputElement;
        if (input.value.trim()) {
            send({ type: 'chat', text: input.value });
            input.value = '';
        }
    }
    if(form.id==='trivia-answer-form'){const input=document.querySelector<HTMLInputElement>('#trivia-answer')!;send({type:'triviaAnswer',question:(document.querySelector('#trivia-answer') as HTMLInputElement)?.dataset.question,text:input.value});input.value='';}
    if (form.id === 'guess-form') {
        const input = document.querySelector('#guess') as HTMLInputElement;
        send({ type: 'guess', text: input.value });
        input.value = '';
    }
});
function showHelp(){document.querySelector('#modal-root')!.innerHTML=infoHtml(infoTab,draft,room?.players.length);}



const labels: Record<string, string> = {
  deal:'Shuffle up. Cards coming your way…',roll:'Dice rolling · follow your token',play:'Card on the table',draw:'One card coming your way',collect:'Picking up the pile',
  bid:'A bold bid',bidPass:'Passing the bid',trump:'Trump has been chosen',trick:'Trick won',challenge:'Calling that bluff!',peek:'A sneaky peek',catch:'Caught red-handed!',
  charadeTurn:'Partners, get ready!',soreLoserShot:'SORE LOSER · PAINTBALL!',rooftopJump:'Rooftop exit · parachute deployed',
  pokerAction:'Poker action',pokerStreet:'Community cards dealt',pokerWin:'Pot awarded!',
  triviaCorrect:'Correct! ★ One point earned',triviaQuestion:'Next question · get ready',triviaResult:'Question resolved',
  start:'Game on!',correct:'That’s it! Points on the board',skip:'Next prompt!',timeout:'Time’s up!',buy:'A new property owner',sell:'Back to the bank',
  tradeOffer:'A deal is on the table',tradeAccept:'Deal accepted · assets exchanged',slap:'NO DEAL! ✋',tradeReject:'Offer refused',tradeCancel:'Offer withdrawn',
  clash:'TRUMP ON AN ACE? 🥊',duelStart:'DING DING! Settle it in the ring',duelRound:'POW! Moves revealed',duelEnd:'Bout settled · back to the cards',clashPass:'Trump stands',
  endGame:'Game ended early',restart:'Fresh round. Same house rules.',lobby:'Back at the table',lifeChoice:'A new path',pass:'Passing the turn',endTurn:'Next player’s move',win:'A winner at the table!'
};
function presentEvents() {
  if(!room) {eventRoom='';seenEvent=0;return;}
  if(eventRoom!==room.code){eventRoom=room.code;seenEvent=room.events.at(-1)?.id||0;return;}
  const fresh=room.events.filter(e=>e.id>seenEvent);if(!fresh.length)return;
  seenEvent=fresh.at(-1)!.id;
  for(const e of fresh){if(Date.now()-e.at>5000)continue;scene?.play(e);audio.play(e);}
  const event=[...fresh].reverse().find(e=>e.kind.startsWith('chaos')&&e.kind!=='chaosHot') || fresh.find(e=>e.kind==='challenge') || fresh.find(e=>e.kind==='slap') || fresh.find(e=>e.kind==='trick') || fresh.find(e=>e.kind==='win') || [...fresh].reverse().find(e=>labels[e.kind]);if(!event)return;
  
  const layer=document.querySelector('#effects-layer')!;clearTimeout(effectTimer);
  const actor=room.players.find(p=>p.id===event.actor)?.name;
  const title=['wolf','bj','dart','pong'].some(p=>event.kind.startsWith(p))?String(event.data.text||({wolfPhase:event.data.phase==='night'?'Night falls · keep your role secret':event.data.phase==='day'?'Daylight · discuss your suspicions':'Voting is open',wolfEliminated:'A player was eliminated',bjResult:'Blackjack · hand settled'} as Record<string,string>)[event.kind]||''):event.kind.startsWith('poker')?String(event.data.text||labels[event.kind]):event.kind==='chaosDie'?'CHAOS DIE · '+event.data.face+' · '+event.data.text:event.kind.startsWith('chaos')?String(event.data.text||event.data.reason||({chaosCoin:event.data.won?'DOUBLE OR NOTHING · DOUBLE!':'DOUBLE OR NOTHING · NOTHING!',chaosDie:'CHAOS DIE · '+event.data.face+' · '+event.data.text,chaosSeats:'SEAT ROULETTE!',chaosCyclone:'CYCLONE!',chaosFlip:'TABLE FLIP!',chaosBlackout:'BLACKOUT!',chaosRobin:'ROBIN HOOD!',chaosWord:'SECRET WORD SEALED',chaosOffender:'BANNED WORD · '+event.data.word,chaosBoom:'HOT POTATO EXPLODED!',chaosVote:'VOTE TO REWIND'} as Record<string,string>)[event.kind]||'CHAOS!'):event.kind==="challenge"?`${room.players.find(p=>p.id===String(event.data.player))?.name}: ${event.data.liar?"BLUFF CAUGHT!":"TOLD THE TRUTH!"} · ${room.players.find(p=>p.id===String(event.data.loser))?.name} takes ${event.data.count} ${event.data.count===1?"card":"cards"}`:event.kind==="slap"&&event.data.reason==="peek"?"CAUGHT PEEKING! ✋ · 8 hands cooldown":labels[event.kind];
  layer.innerHTML=`<div class="action-banner ${event.kind==='slap'||event.kind.startsWith('duel')?'comic':''}"><span>${esc(actor||'THE TABLE')}</span><strong>${esc(title)}</strong></div>`;
  effectTimer=setTimeout(()=>layer.innerHTML='',event.kind==='deal'?3400:event.kind==='roll'?2400:event.kind==='challenge'?3200:1600);
}
app.addEventListener('click', e=>{
  const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button||button.disabled)return;
  if(button.dataset.response)send({type:button.dataset.response,offer:button.dataset.offer});
  if(button.dataset.duelAction)send({type:button.dataset.duelAction});
  if(button.dataset.boxing)send({type:'punch',move:button.dataset.boxing});
});
app.addEventListener('input', e=>{
  const input=e.target as HTMLInputElement;
  if(input.id==='trade-give-cash')tradeDraft.giveCash=Number(input.value);
  if(input.id==='trade-want-cash')tradeDraft.wantCash=Number(input.value);
  if(input.dataset.tradeSide){const key=input.dataset.tradeSide==='give'?'giveTiles':'wantTiles',tile=Number(input.value);tradeDraft[key]=tradeDraft[key].filter(i=>i!==tile);if(input.checked)tradeDraft[key].push(tile);}
});
app.addEventListener('change',e=>{const input=e.target as HTMLSelectElement;if(input.id==='trade-partner'){tradeDraft.to=input.value;tradeDraft.wantTiles=[];renderPlay();}});
app.addEventListener('submit',e=>{if((e.target as HTMLFormElement).id==='trade-form'){e.preventDefault();send({type:'tradeOffer',target:tradeDraft.to,giveCash:tradeDraft.giveCash,wantCash:tradeDraft.wantCash,giveTiles:tradeDraft.giveTiles,wantTiles:tradeDraft.wantTiles});}});
app.addEventListener('toggle',e=>{const details=e.target as HTMLDetailsElement;if(details.matches?.('.negotiation details'))tradeDraft.open=details.open;},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){document.querySelector('#modal-root')!.innerHTML='';help=false;}});


function applyLayout() {
  const live=!!room&&room.phase!=='lobby', shell=document.querySelector('.shell')!;
  shell.classList.toggle('live',live);shell.classList.toggle('shelf-hidden',!shelfOpen);shell.classList.toggle('rules-hidden',!rulesOpen);shell.classList.toggle('chat-hidden',!chatOpen);shell.classList.toggle('first-person',camera==='first');shell.classList.toggle('show-hand-list',handListOpen);
  const stage=document.querySelector('.stage')!,panel=document.querySelector('#play-panel')!;
  if(live){if(panel.parentElement!==stage)stage.append(panel);}else if(panel.parentElement===stage)stage.parentElement!.insertBefore(panel,stage.nextSibling);
  const toggle=document.querySelector('#rules-toggle')!;toggle.textContent=(rulesOpen?'▾':'▸')+' House rules';toggle.setAttribute('aria-expanded',String(rulesOpen));
  document.querySelector('#rules-panel')!.setAttribute('aria-hidden',String(!rulesOpen));
}
function showBoard(tileIndex?:number) {
  if(!room)return;
  if(tileIndex===undefined){document.querySelector('#modal-root')!.innerHTML=`<div class="modal-backdrop"><div class="modal board-modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="closeHelp" aria-label="Close board">×</button><h2>Inspect the board</h2><div class="board-map">${room.tiles.map((t,i)=>`<button class="board-tile" data-inspect="${i}"><small>${i+1} · ${t.type}</small><strong>${esc(t.name)}</strong><span>${t.type==='property'?'$'+t.price:''}</span></button>`).join('')}</div></div></div>`;return;}
  const tile=room.tiles[tileIndex],owner=room.players.find(p=>p.id===tile.owner),me=room.players.find(p=>p.id===id)!;
  const canBuy=room.rules.game==='property'&&room.players[room.turn].id===id&&me.position===tileIndex&&room.rolled&&tile.type==='property'&&!tile.owner&&me.cash>=tile.price&&room.busyUntil<=Date.now();
  document.querySelector('#modal-root')!.innerHTML=`<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true"><button class="modal-close" data-action="closeHelp" aria-label="Close space">×</button><small class="eyebrow">SPACE ${tileIndex+1} · ${tile.type}</small><h2>${esc(tile.name)}</h2><p>${owner?'Owned by '+esc(owner.name):'Owned by the bank'}${tile.type==='property'?' · Price $'+tile.price+' · Rent $'+Math.round(tile.rent*room.rules.rentMultiplier):''}</p><p>Here: ${esc(room.players.filter(p=>p.position===tileIndex).map(p=>p.name).join(', ')||'Nobody yet')}</p>${canBuy?button('Buy this property','buyFromTable',false,'primary'):''}${tile.owner===id?`<button class="secondary" data-sell="${tileIndex}">Sell to bank · $${Math.floor(tile.price*.75)}</button>`:''}${owner&&owner.id!==id&&room.rules.allowTrading?`<button class="primary" data-negotiate="${owner.id}">Negotiate with ${esc(owner.name)}</button>`:''}</div></div>`;
}
app.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;if(button.dataset.inspect)showBoard(Number(button.dataset.inspect));if(button.dataset.negotiate){tradeDraft.to=button.dataset.negotiate;tradeDraft.open=true;document.querySelector('#modal-root')!.innerHTML='';renderPlay();}if(button.dataset.action==='buyFromTable'){send({type:'buy'});document.querySelector('#modal-root')!.innerHTML='';}});
if(scene)scene.onPick=(pick)=>{
  if(!room||room.phase!=='playing'||room.spectating)return;
  if(pick.jackMarble){pickJackMarble(pick.jackMarble);renderPlay();return;}
  if(pick.rpgTile){rpgPick(pick.rpgTile.x,pick.rpgTile.y,send);return;}
  if(pick.rpgPawn){const target=document.querySelector<HTMLSelectElement>('#rpg-target');if(target)target.value=pick.rpgPawn;return;}
  if(pick.card){const key=pick.card;if(selected.has(key))selected.delete(key);else if(selected.size<(room.rules.game==='tarneeb'?1:4))selected.add(key);else toast('Select up to '+(room.rules.game==='tarneeb'?1:4)+' cards.');renderPlay();return;}
  if(pick.tile!==undefined){showBoard(pick.tile);return;}
  if(pick.action==='play'){if(!selected.size){toast('Pick your card on the table first.');return;}send({type:'play',cards:[...selected],claim:room.claim});}
  else if(pick.action)send({type:pick.action});
};
bindParty(app,send);
bindClub(app,()=>room,()=>id,send);
bindJack(app,()=>room,send,renderPlay);
bindPoker(app,()=>room,send);
bindExpansion(app,()=>room,()=>id,send,render);
render();
connect();
