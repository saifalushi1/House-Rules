# House Rules

![House Rules poster: friends playing cards, charades, trivia and board games around a low-poly table](docs/images/house-rules-poster.png)

A self-hosted TypeScript game-night sandbox with 14 game presets. Low-poly 3D table and avatars, private hands, live shared rooms, and host-editable presets. Version 0.12 adds chosen Charades teammates and full timed turns, four-player Scribble scoring receipts, shared peek/slap rules for all multiplayer card presets, a game-ending d6 Table Flip, and rooftop animations with cosmetic paintball retaliation. No-limit Texas Hold’em includes private cards, betting rounds, side pots and showdown. Also includes Scribble, a D&D-style tabletop RPG, Klondike Solitaire, optional-master Trivia, a challenge-and-steal chaos rule, and seven environments. Trivia has 1,000 questions across ten categories; pair Charades has 1,900 prompts across 19 categories.

## Version 0.15 · four more games for the table

| Game | Players | What you can play |
| --- | --- | --- |
| Werewolf / Mafia | 4–8 | Secret roles, timed nights, day discussion and voting. |
| Blackjack | 1–8 | House dealer, chip bets, hit/stand/double and two optional side bets. |
| Darts | 1–8 | 301/501, three darts per turn, optional double-out and timed aiming. |
| Beer pong | 2, 4, 6, 8 | Team shots, six/ten cups, balls back and two-shot redemption. |

Choose a preset from **Games**, edit **Game rules** in the lobby, then start. All four have polygon table props, action animations, synthesized sound, live multiplayer state, restart and early-end controls. Restart your running server after updating, then refresh each browser to load the new game list and server logic together. Existing rooms are kept in memory only and disappear when the server stops.

**Werewolf / Mafia:** the house variant uses werewolves, villagers and optional seer/doctor. Wolves know their pack; the seer privately checks whether a player is a wolf; the doctor protects one person each night. Doctor repeat saves and elimination-role reveals are configurable. Night always runs its full timer; public messages never identify who acted. Discuss during the day, then vote once or abstain. A tied plurality eliminates nobody. The village wins when no wolves remain; wolves win at parity. Eliminated players observe and cannot chat or vote. All roles are revealed when the game ends, including an early ending. Public chat is locked at night. External group voice follows the same silence rules on trust; the app does not record or moderate voice. Werewolves must be fewer than half the group.

**Blackjack:** uses the same starting-chip setting and chip models as Hold’em. Each player locks a main wager plus optional Perfect Pairs and 21+3 stakes, or sits out. Everyone plays against the automatic dealer. The dealer’s hole card is absent from client views until dealer play or settlement. Naturals pay 3:2, normal wins 1:1 and ties push. Double is available on the initial two cards with sufficient chips and draws exactly one card. The dealer stands on 17 by default; hitting soft 17 is configurable. This first house preset has **no split or insurance**. Perfect Pairs pays mixed 5:1, same color 12:1 and same suit 25:1. 21+3 pays flush 5:1, straight 10:1, trips 30:1, straight flush 40:1 and suited trips 100:1. Winning stakes are returned as well. Side bets settle on the opening two cards plus the dealer upcard. A betting timeout sits out; a decision timeout stands. The highest chip balance wins after the configured hands. Ending early or returning to the lobby refunds unsettled main wagers and unresolved side stakes; already settled side bets remain settled. Play chips only.

**Darts:** select 301 or 501 and optional double-out. Tap/click the target (or adjust with arrow keys), set power near 65%, then throw as the moving accuracy marker crosses its center. The server adds release-dependent dispersion and scores the actual landing point: singles, doubles, triples and 25/50 bulls. Overshooting zero, leaving one on double-out, or checking out without a double restores the whole turn’s starting score. Three throws per turn; timeouts miss. Exact zero wins. At the round limit the lowest remainder wins, with ties shared; zero disables that limit.

**Beer pong:** alternating lobby seats create fixed teams, shown at the table. Teammates rotate each shot. Aim at the opposing cup rack, use power near 70% and time the release. Hits remove cups on the server. Each team gets two shots; sinking both returns the balls if enabled. After a rack is cleared, optional redemption gives the other team two shots to clear the remaining opposing cups. Success starts three-cup overtime; failure awards the original clearing team. At the round limit the team with more surviving cups wins; equal counts tie. No drinking is required.

**Chaos in these modes:** score-changing effects use a separate bonus tally, preserving faction victory, main wager payouts, X01 scores and cup racks. Cyclone passes that tally. Hot Potato skips the Werewolf owner’s action for the current phase, forfeits an active Blackjack main bet (or refunds a locked bet and sits out during betting), skips the rest of a darts turn, or misses one pong shot. Seat Roulette changes future turn order; pong teams stay fixed. Blackjack seat changes and cash challenges wait until between hands. Winner Takes It wagers bonus points in the other three games; Werewolf challengers must be alive and pong challengers must be opponents. Challenge and rewind timers pause/resume game deadlines. Blackout masks unlit public observations without exposing roles or dealer cards. Banned Word applies to allowed day chat and host-reported voice slips. Time Warp cannot erase information someone has already seen; secret night actions do not advertise an undo snapshot.

## Version 0.14 · paced chaos and easier party play

The header’s **Info** button has **Games** and **Modifiers & custom rules** tabs, including every chaos toggle, all twelve Chaos Die faces, game options, peeking, negotiations, custom agreements and host controls.

**Trivia:** easy is the default; it draws only easy-tagged questions, including 200 newly authored everyday questions across the ten categories. Each category retains 100 total questions in mixed mode. Easy rounds use the available 28–48 easy questions for their category and cap the requested length without repeats. Choose **Game rules → Answer format → Multiple choice** to show clickable answer options, or keep typed answers. Both formats support everyone/master and free-for-all/turn-based modes. Multiple choice permits one selection per contestant per question; the answer key stays private until resolution (except for the master). The [example question page](https://quizandsurveymaster.com/best-trivia-questions-and-answers/) informed the intended accessible difficulty; its question collection was not imported.

**Scribble:** a short victory chime is broadcast to everyone for each correct guess, including spoken awards. Between drawings, a six-second animated pencil intermission reveals the word and announces the next drawer. Ordinary sound controls still apply.

**Winner Takes It:** accepted challenges move fighters into a polygon boxing ring and place all other players ringside. Each of three beats has a three-second preparation countdown, a ten-second secret decision window and a 2.4-second reveal animation. Jab, hook and block have distinct poses. The server rejects early/duplicate moves; stakes change after the final reveal. Underlying party timers resume with the paused time restored. A disconnect forfeits the bout.

**Seat Roulette** now updates future turn order along with physical seats. It preserves player/team identities, one drawing per player per Scribble round, and consecutive teammate turns in Charades. **Hot Potato** always explodes on its owner and forfeits their opportunity: Bluff/free sandbox skip a turn; Tarneeb auto-plays a random legal card (or automatically passes a bid/selects trump); Poker folds even when checking is free; Charades ends the turn, Scribble closes the drawing, Trivia excludes the owner for that question or ends their answering turn, and board games finish their turn automatically. The old expiry-outcome setting is retained only for importing older rules and no longer changes this behavior. Shield-round protection still applies.

## Start on this machine

Double-click **Start House Rules.cmd**. It uses the installed Node.js runtime (or the bundled Codex runtime), installs missing dependencies, builds if necessary, and starts the server. Keep that terminal open while playing. Press Ctrl+C to stop.

Open **http://localhost:3000**, choose your game and rules, enter your name, and click **Host a table**. Friends enter a name and room code using **Join friends**. Exactly four people are required for Tarneeb; the card sandbox also works solo.

The ready check is a courtesy indicator; the host can start when the required players are present.

## Play with friends

### Same Wi-Fi

The server prints your local network address, such as `http://10.0.0.99:3000`. Friends open that address on their phones or computers. Share the invite link **from this network address**, since a `localhost` invite only works on the host computer. If Windows Firewall asks, allow Node.js on your trusted private network. The server listens on port 3000 on all interfaces.

### Different homes

Use a private VPN connection such as [Tailscale machine sharing](https://tailscale.com/docs/features/sharing), or a WebSocket-capable HTTPS tunnel to local port 3000. A room code by itself does not make your computer reachable across the internet. With a private network, share the host computer's private-network IP and port 3000; follow the provider's access setup. This project has no built-in hosting account, tunnel, or matchmaking service.

Use it with trusted friends. Room codes are lightweight invite gates, not account authentication. No router or firewall changes have been made automatically. For an internet deployment, put the server behind HTTPS and authentication rather than exposing HTTP directly.

## Version 0.12: team turns, shared peeking and rooftop antics

### Charades: choose partners, then play full timed turns

Choose **Charades**, apply its rules, and invite 2, 4, 6 or 8 players. In the lobby, each person clicks **Join pair** to choose a teammate; a pair holds exactly two people. The host can use **Automatic random pairs** instead. Starting fills open slots with unassigned players without breaking chosen partnerships. Team numbers and partnerships remain fixed through chaos seat changes.

Set **Game rules → Guessing time per teammate**, a category, and **Rounds per pair** before starting. At 120 seconds, Pair 1’s first member gets two uninterrupted minutes to guess while their teammate acts. Correct answers and skips replace the prompt without changing or extending the timer. When it expires, the teammates swap roles and the second member gets another full two minutes. Pair 2 then receives the same two turns, followed by any remaining pairs. With more than one round, repeat that schedule. For four people, one round at 120 seconds is eight minutes total. The server gives each new turn its full allowance even if a timer tick arrives late. The former whole-match cutoff is no longer used.

Only the active guesser can type answers. The actor sees the private prompt, skips if allowed, and confirms spoken answers. A correct answer gives one point to the current guesser; both teammates’ personal totals combine into the pair score. Skip penalties apply to that turn’s guesser and pair. The highest pair total wins after all scheduled turns; ties are shared. The results show combined pair points and personal correct-answer counts. These rules replace the older immediate-rotation behavior described in historical version notes below.

### Scribble: four-player scoring and spoken guesses

Drawing turns now follow a fixed roster so a changing chaos order cannot skip someone’s drawing turn. All four players are covered by regression checks: each guesses three drawings and earns drawer points on their own. Every correct guess awards the guesser **5 + one point per ten full seconds remaining**, and the drawer **2 points**, exactly once per guesser per drawing. The score panel lists each person’s earned guessing and drawing totals; chat records both awards. Enabled score-changing chaos rules can still change the final point total, while the earned totals explain the original credits. Delayed guesses from an older drawing are rejected.

For voice play, the drawer selects a player under **Spoken correct guess** and clicks **Award spoken guess**. This uses the same points and duplicate protection as typing. Only the current drawer can award; they cannot award themselves. Secret words stay private until the drawing resolves.

### Shared peeking and the d6 Table Flip

Enable **Allow card peeking** and **Catch a peeker** for Bluff, Tarneeb, free card sandbox or Poker. All use the same lean, one-second victim-only slap event, delayed four-second reveal, and eight-play/hand cooldown after a successful catch. The slap animation briefly pulls first-person cameras back so both characters are visible. Tarneeb partners remain protected. Time Warp votes and challenge offers cannot start during a victim’s reaction window. Disabling catching permits an immediate four-second peek; disabling peeking prevents the feature entirely.

**Table Flip** now rolls an actual six-sided die, flips the table and immediately ends the entire match with **no winner**, for every result. Final score/order totals are left as they were; outstanding gameplay, guesses, prompt timers, votes and duels cannot resume the match. The eligible lowest scorer uses it once per match at a clear table boundary; Poker permits it between hands. Restart resets it. The previous score/order-scramble selector is retained only for old imported recipes and has no effect on this rule.

### City rooftop

The rooftop skyline now has two distant polygon towers and a looping plane/impact sequence, with low-poly smoke and distant impact sounds. The action stays outside the table area. At a normally completed game, losing avatars run to the edge, jump off and parachute back; the camera widens for the seven-second exit. Winners, all-player ties, manual early endings and Table Flip’s no-winner ending do not trigger loser exits. **The basics → Rooftop loser exits** toggles this easter egg.

Enable **Sore loser paintball** under The basics for a once-per-match postgame action in any background. A lowest-scoring losing player may tag another connected avatar after a heavy loss: a gap of at least half the winning total and at least three points, ten remaining cards, or half a starting chip/cash stack as appropriate. Team games compare team results. A colorful paintball flies, splats and briefly knocks the target over; scores and ownership remain final. The button appears only for eligible players and waits for rooftop exits to finish. All effects have synthesized sounds and respect the header mute control.

The v0.12 checks include four-player Scribble rotation/awards, custom teammates, full 120-second turns, eight-player schedules, pair-score conservation, all card peek timings and cooldowns, no-winner endings for every game, rooftop result eligibility and one-use paintball authority. Source modules include server/charades.ts, server/peek.ts, server/aftermath.ts, shared/aftermath.ts and the party/rooftop interface and animation modules.

## Included games

| Preset | Playable behavior |
| --- | --- |
| Poker | 2–8 players, no-limit Texas Hold’em with rotating dealer/blinds, four betting rounds, all-ins, side pots, split pots and automatic showdown. Play chips. |
| Bluff / Bullshit | Deal the whole deck; claim A–K in sequence, play 1–4 hidden cards, timed challenges, liar or caller takes the pile, first empty hand wins after the challenge window. |
| Tarneeb | Four seats, alternating partnerships, 7–13 auction, trump selection, optional follow-suit enforcement, trick winner, hand scoring, and target team score. |
| Card sandbox | Private hands and shared piles, or a one-player Klondike Solitaire layout with stock, waste, tableau runs and suit foundations. |
| Charades | 2, 4, 6 or 8 players in pairs; 19 categories with 100 prompts each, custom prompts, chosen lobby teammates, a full guessing timer for each member, combined pair scores, spoken-answer awards, skipping and a final recap. Use an existing group call when apart. |
| Trivia | 2–8 players; everyone competes with automatic questions, or a volunteer trivia master hosts. Ten categories with 100 questions each, timed rounds and free-for-all/turn-based answers. |
| Scribble | 2–8 players; rotating drawers choose secret words, share a live drawing canvas, and score points for timed guesses. |
| D&D tabletop | 1–8 people; original simplified d20 adventure with a dungeon master, four classes, character sheets, an 8×8 battle map, dice, initiative, spells, combat, XP and gold. |
| Block Party | Original simplified property-trading game: 24 spaces, two dice, purchases, rent, tax pot, events, property sell-back, bankruptcy, and net-worth win. |
| Life Paths | Original simplified life-path game: one die, career selection, safe/risky choices, events, cash, and round-limit win. |

The board presets are small original games inspired by property-trading and life-journey mechanics. They are not full reproductions of Monopoly or The Game of Life: no auctions, mortgages, house-building systems, or full career/family simulation yet. Cash and player-to-player property trades are now supported.

Tarneeb uses the common scoring variation: a made bid scores tricks won, an unbid sweep scores 16, a made bid of 13 scores 26, a failed bid subtracts the contract, and defenders score their tricks when the contract fails. Regional rules vary. Reference: [Pagat's Tarneeb rules](https://www.pagat.com/auctionwhist/tarneeb.html).

## Playing Poker (v0.11)

1. Choose **Poker** from the game shelf and invite 2–8 players.
2. In **House rules → Game rules**, set starting chips (100–10,000), small blind (1–100), big blind (2–200), seconds per turn (10–120), and an optional hand limit (0 means unlimited). The small blind must be below the big blind; the starting stack must cover the big blind. Defaults: 1,000 chips, 5/10 blinds, 45-second turns, unlimited hands.
3. Start to shuffle a single 52-card deck and deal two private hole cards to each funded player. The button posts the small blind heads-up and acts first before the flop; with more players, action begins left of the big blind. After the flop, action starts left of the dealer. The button/blinds rotate each hand and skip empty stacks.
4. Use **Fold**, **Check**, **Call**, **Bet / raise**, or **All-in**. “Raise to” is your total bet for this betting round, including chips already in front of you. Raises must match the previous full raise; smaller raises are allowed only for an all-in. A short all-in alone does not reopen a previous bettor’s raise option, while cumulative short raises can reopen it. When no opponent has chips left to bet, any outstanding call is resolved and the board runs out automatically.
5. The table burns a hidden card before the flop (three community cards), turn and river. At showdown, the server finds each live player’s best five-card hand from seven cards, including ace-low straights. Folded cards stay hidden. Uncontested pots do not reveal the winner’s hole cards. Side pots use only eligible contributors; tied pots split separately, odd chips go left of the button, and unmatched overbets are returned.
6. After the chip award animation, the host clicks **Deal next hand**. Play ends when only one funded player remains or the configured hand limit is reached; the biggest stack wins, including ties. The host can end early, refunding unfinished bets, restart with fresh stacks, or return to the lobby. A timed-out player checks when free and otherwise folds, so a disconnected seat cannot stall the hand indefinitely. Funded players must reconnect before the next deal.

The compact panel shows community cards, your private cards, pot, blinds, turn timer, stacks and last actions. The polygon table shuffles/deals cards, reveals community cards, sends chip stacks into the pot and awards them to winners; checks knock, folds swish and chip wins chime. Both overview and first-person modes keep the board above the controls. Other players’ hole cards, undealt cards and burn cards remain server-private until an actual showdown.

Shared chaos is optional. Poker uses a **separate bonus tally**, awarding a point to each pot winner; score doubling, taxes, penalties and score scrambles affect that tally without changing chips committed to a pot. Seat Roulette and Cyclone wait until a hand ends; Cyclone passes bonus tallies, and hole cards stay attached to their owners. Reverse direction and scrambled order affect subsequent action order as house rules. **Winner Takes It** wagers chip stacks only between completed hands. **Time Warp** restores private cards, bets, pot and stacks with a majority vote. Standard poker always determines the chip winner, regardless of bonus tallies. No real-money payments or buy-ins are implemented.

Implementation: server/poker.ts, shared/poker.ts, src/poker-ui.ts, src/poker-visuals.ts. The 26 poker tests cover ranks/kickers, heads-up and multiway action, minimum raises, short all-ins, deterministic side pots, odd-chip ties, privacy, timeouts, lifecycle, challenge stakes, undo, and 75 randomized all-in tournaments with chip-conservation checks. Betting rules reference: [PokerStars Texas Hold’em rules](https://www.pokerstars.com/poker/games/texas-holdem/).

## Playing Trivia

In **House rules → Game rules → Who plays?**, choose **Everyone plays** to let every person, including the host, compete. Pick the automatic category before starting. No player receives the answer key while a question is open; questions and timers run automatically, with a four-second result pause. Both free-for-all and turn-based answers work. Typed answers are checked by the server. Choose **With a trivia master** for a person to read questions and award spoken answers; the setup below applies to that mode.

1. Select **Trivia** in the lobby and invite at least one other player (2–8 people total).
2. One player volunteers as **Trivia master**. The master can be someone other than the room host and does not compete for points.
3. In **House rules → Game rules**, the host chooses the number of questions, time per question, and **Free for all** or **Turn based**. Apply the rules and start the game.
4. The master chooses the round category: General knowledge, Science & nature, Sports, History, Geography, Movies, Music, Television, Computers, or Video games.
5. Contestants type answers while the timer runs. In free-for-all, the first correct answer wins the point. In turn-based play, only the active contestant can answer, and turns rotate each question.
6. For answers spoken over your group call or in person, the master awards the point to the eligible contestant. The master sees the answer key, can skip questions, and advances after each result.

Each correct answer gives one point, plays a success sound, and pops a gold star above the scorer. A timeout gives no point. After the configured questions, the scoreboard shows contestant totals and the winner or tied winners. The host can end early or restart. The full question bank is bundled with the server, so playing does not depend on an external trivia API.

## Shared chaos rules (v0.10)

Before starting, open **House rules → Chaos**. Enable any combination of the twelve rules, configure their parameters, and **Apply house rules** or start the game. Everything is off by default. All players share the same server-controlled outcomes and receive corresponding 3D animations and synthesized action sounds. During play, expand **✹ Chaos** on the left edge of the table, below the player totals for timers, the current die modifier, turn order, bonus tallies, dares, flip controls and rewind voting.

| Rule | Behavior and controls | Animation and sound |
| --- | --- | --- |
| Hot Potato | Configurable fuse, minimum and shrink per turn. Expiry forfeits the current opportunity using the game-specific behavior described above. | Small explosion over the owner, bomb fuse, accelerating ticks and boom. |
| Seat Roulette | Shuffle seats and future turn order every N turns. Hands travel or stay according to the toggle; team identities stay fixed. | Avatars hop to their new seats; whoosh and boing. |
| Cyclone | At round boundaries or random turn starts, pass hands left/right. In games without hands, pass the bonus chaos tallies instead. | Cards fan out and orbit; shuffle riffle and wind. |
| Double or Nothing | A separate chance slider (20% by default) rolls once per eligible gain, then flips a fair coin. Bluff pile pickups and free card-sandbox draws/collections receive twice as many real cards or none. Extra cards have unique IDs; erased pickups return to the stock. A room-wide 1,040-card guard skips the wager before excessive growth. Tarneeb and party/board games wager positive score or cash gains. Ordinary card plays do not trigger a flip. Fixed Poker and Solitaire hands stay intact. | Giant spinning coin; ring, jackpot or sad trombone. |
| Chaos Die | Roll a d12 each round for a shared modifier, listed below. | Oversized polygon die tumbles above the table with its numbered result; rattle and thud. |
| Table Flip | Once per match, a lowest-scoring player rolls a d6 and ends the entire game. Every result (1–6) ends with nobody winning. Ties for lowest qualify. | Six-sided die tumbles, then the table flips; rattle, crash and rumble. |
| Blackout | Ten seconds with a fixed spotlight on the player active when darkness starts. Unlit players’ actions, sounds and system messages are concealed from other clients; card totals and table observations stay at their last visible values. Your own hand and turn controls stay usable. An unseen Bluff play retains an anonymous call window. Concealed activity never reappears in the feed when lights return. | Lights cut to one spotlight; power-down hum and thunder. |
| Robin Hood | A gaining leader transfers one cash unit or point to last place, once per accepted action. Team/pair totals are treated as one score. | Coins arc between players; ka-ching. |
| Banned Word | A random single word from the host's list changes each round. Only the host sees the active word until an offence reveals it. Chat and typed guesses are checked as whole words, ignoring case. The host reports voice slips with the player selector. | Sealed-word stamp, red X over the offender; thunk and buzzer. |
| Dare Wheel | Penalties spin a dare from the host's list, one per line. Hot Potato and banned-word penalties, caught peeking/bluffs, skips, timeouts and rejected offers can trigger it. Dares are social instructions carried out by the group. | Descending spinning wheel and flicking pointer; slowing clicks and fanfare. |
| Time Warp | Any player can request undo of the last accepted gameplay action within 30 seconds. A strict majority of connected players must vote yes within 12 seconds; the requester votes yes automatically. Gameplay actions pause during voting. | Scene desaturates; cards and board tokens move backward; rewind squeal. |

**Chaos Die faces:** 1 double gains, 2 zero gains, 3 reverse turn direction, 4 half-length hot fuse, 5 Robin's tax, 6 blackout, 7 Cyclone left, 8 Cyclone right, 9 seat shuffle, 10 a dare for everyone, 11 bonus point for each scoring unit, 12 shield from chaos penalties and score doubling/tax for that round. Die-selected effects can run even when their individual toggle is off.

**Round boundaries:** a full turn cycle in Bluff, Card sandbox and board games; each completed trick in Tarneeb; a new Charades prompt; a new Trivia question. A round-end Cyclone in Trivia also queues when the current question resolves. Seat and hand swaps wait until deal/dice animations, Bluff challenge windows, boxing, pending life choices and partially played Tarneeb tricks are clear. Physical swaps do not change who owns the current turn or which players are teammates. Seat Roulette makes the new seat order the future turn order.

Card-game chaos tallies do not replace the usual victory condition. Cardless Cyclone passes a separate bonus tally rather than moving property ownership, master roles or team membership. Tarneeb still requires the final chaos-adjusted team total to reach its target. Correct-answer counts remain a count of correct answers even when points double or are erased.

Time Warp restores hands, piles, positions, cash, scores, rules-derived state and remaining timer durations; it preserves chat, connection status and the current host. Undo snapshots and future questions remain private on the server. A successful rewind consumes the snapshot. Timer expiry or a new gameplay action invalidates an older snapshot; voting is cancelled if a voter disconnects. An action that ends the match can be rewound from the results screen. Rewinding cannot make players forget a card, prompt or answer already revealed. Restarting clears votes, flip usage, tallies, dares and timers.

Voice is still provided by your group call, so Banned Word does not automatically transcribe microphones. On-screen effects and action audio work in both camera modes; first-person briefly pulls back for large chaos events so they remain visible. Use the header sound control to mute all action sounds.

## House rules

The host can edit rules before a game or return everyone to the lobby to change them. Start Game applies the current draft. Apply House Rules shares a draft without starting.

- General: player limit, default first/third-person view, reverse turns.
- Cards: peeking, catching peekers, penalty text, deck count, hand size, challenge window, follow suit, target score.
- Charades: category, custom prompts (one per line), guessing time per teammate (15–180 seconds), rounds per pair (1–5), skip toggle/penalty and chosen or automatic lobby teams.
- Trivia: questions per round (1–100), seconds per question (5–180), free-for-all or turn-based answers. The trivia master chooses the category after the game starts.
- Boards: starting cash, Home bonus, round limit, rent multiplier, rest-stop jackpot.
- Custom: written house contract and JSON rule import/export.

In Bluff, Tarneeb, free card sandbox and Poker, peeking reveals up to three held cards (two in Poker). With catching enabled, the victim first gets one second to slap; cards remain private until that window ends, then a fresh four-second reveal begins. A successful slap cancels the reveal and blocks the peeker for eight accepted card plays, or eight completed Poker hands. Tarneeb partners cannot peek at each other; folded Poker hands and Solitaire cannot be peeked at. The server announces the chosen funny penalty; the group carries it out. Text house rules are group agreements, not executable scripts. You can change your own camera during play.

## Development

Requires **Node.js 22+** and npm or pnpm. [Download Node.js](https://nodejs.org/en/download).

```powershell
npm install
npm run dev
```

The dev client opens on `http://localhost:5173` and proxies WebSockets to the game server at port 3000.

```powershell
npm run build
npm test
npm start
```

Build before running the integration tests. To select a different production port:

```powershell
$env:PORT = '4000'
npm start
```

## Architecture

- `src/main.ts`: browser interface, rules editor and WebSocket client.
- `src/scene.ts`: low-poly geometry, animated cards, dice, tokens, avatars, combat and camera.
- `src/audio.ts`: original synthesized Web Audio action effects and immediate mute.
- `src/social.ts`: negotiation offers and boxing controls.
- `server/interactions.ts`: atomic trades, offer expiry, private boxing moves and duel outcomes.
- `server/index.ts`: HTTP/static server, rooms, session resume, WebSocket connections, payload limits, heartbeat and rate limiting.
- `server/engine.ts`: authoritative game rules, actions, private per-player views and timers.
- `server/chaos.ts`: shared chaos triggers, score adapters, private undo snapshots and voting.
- `src/chaos-ui.ts`, `src/chaos-visuals.ts`, `src/chaos-audio.ts`: chaos controls, 3D effects and synthesized audio.
- `server/trivia.ts` and `server/trivia-bank.ts`: trivia roles, question timers, scoring, answer privacy and the bundled question bank.
- `server/charade-prompts.ts` and `server/charade-extras.ts`: bundled charades collections.
- `shared/types.ts`: TypeScript contracts and preset metadata.
- `tests/`: rule, privacy and two-client integration tests.

The server never sends opponents' private hands or a charades prompt to guessers. Explicitly enabled peeking is the exception. Session tokens live in the browser tab's session storage. Refreshing the same tab reconnects to the saved seat. Closing a tab preserves the seat in the room, but a new tab has a new token; return to the lobby to remove abandoned seats. In the lobby, host responsibility transfers if the host disconnects. During play, the original host can resume the same tab; otherwise restart/reset with that session before continuing.

Rooms are in memory. Restarting the server clears games. Disconnected rooms expire after 12 hours. There are no bots, voice/video calls, saved accounts, durable games, arbitrary code rules, or full drag-and-drop tabletop physics yet. Fonts have browser fallbacks if Google Fonts cannot load.

## Verification

170 automated tests pass, including a full 13-trick Tarneeb hand, challenge resolution, timer behavior, private views, validation, scoring, board actions and a real two-client reconnect flow. Browser checks cover room creation, joining, private deals, card selection/play, calling bluff, camera switching, enlarged board views, negotiation offers and refusals, and host rule editing.

## Version 0.2: the table comes alive

Actions now have original synthesized sounds and corresponding 3D feedback: cards flutter, dice tumble to the real values, tokens hop space by space and pulse at their current square, money actions sparkle, and charades actors gesture. All card presets animate shuffling and individual cards being dealt at the start and on a Tarneeb redeal. Inputs pause during setup and dice/token movement so turns cannot race the animation. Sound starts after your first click or keypress, as required by browsers; use Sound on/off in the header to mute immediately.

Block Party and Life Paths use the entire content width. Board zoom shows a close overhead view; switch it off to see the whole table. Roll at table and Pass at table keep the action controls beside the 3D view. First person hides your own avatar so its head and hat cannot clip into the camera.

### Negotiations

In Block Party, open Make a deal. Choose a player, cash amounts, and the properties each side will exchange. Any connected, solvent player can negotiate without waiting for their turn. Offers expire after 90 seconds. Only the recipient can accept or refuse, and the sender can cancel. The server rechecks balances and ownership at acceptance and makes the entire exchange together. A stale offer transfers nothing.

The Property negotiations toggle enables trading. Refusal slap controls whether rejecting an offer sends the recipient's avatar over to deliver a cartoon slap to the sender. Refusal does not change cash, ownership, or turns.

### Box for your ace

Tarneeb's Box for your ace toggle enables an ace-versus-trump challenge. When an opponent attempts a trump on the led suit's ace, the ace holder has the configured challenge countdown (12 seconds by default) to let it stand or challenge. Ordinary follow-suit rules still apply first; hosts can disable Must follow suit for a wilder preset. The card remains pending until the challenge is resolved.

A bout has three simultaneous-choice beats, each with an 8-second deadline. Jab beats hook, hook beats block, and block beats jab. Your move stays private until both players choose or the deadline ends. A missed input forfeits that beat; a tied bout keeps the trump's normal strength. Other players watch the avatar boxing and sounds at the table.

If the ace side wins, the attempted trump is still played and consumed but cannot win this trick. If the trump side wins, the card has its normal strength. This preserves the hand's card count and resumes the existing turn order. Subsequent trumps can still contest the trick. Turn actions pause throughout the challenge. Use Jab, Hook, and Block beside the table, or the detailed boxing panel below it.


## Version 0.3: play at the table

Hosts can End game early without declaring a winner or Restart with the same rules. Restart deals fresh hands and resets game state; chat stays in the room. Pending offers and boxing challenges are cleared. Only the host can control the game lifecycle.

Starting a game closes the Games shelf and House rules. Header Games and House rules buttons reopen them. Chat sits under rules on the right, fills the space when rules close, and shows oldest-to-newest messages with local time-only timestamps. Gameplay controls stay inside the table view without scrolling the page.

My seat shows your private cards face up in 3D. Click cards to select them, then click the green PLAY area; click the blue DRAW DECK in Card sandbox to draw. Hand list offers accessible card buttons. Board tiles open a property inspector and dice can be clicked to roll. Card games have no decorative dice or yellow box; only Card sandbox shows its draw deck.

Tarneeb shows the ace-versus-trump challenge countdown. The ace holder can choose Skip challenge / continue to accept the pending trump immediately. This is the optional boxing house rule; Tarneeb does not use Bluff's call-a-bluff mechanic. The host can configure its response time in House rules.


## Version 0.4: Bluff reactions

Bluff hands sort A (1) through K (13), then by suit. Calling bluff preserves the already-selected next seat in either outcome. The reveal banner names the accused, the result and the pile recipient. The caller throws cards toward the accused, then the pile flies into the recipient's hand; inputs briefly pause for this animation.

When peeking is enabled, the character leans toward the target. With catching enabled, only that target receives a one-second Slap the peeker event. A successful slap stops the peek immediately, plays the cartoon slap, and blocks the peeker for eight subsequent card plays (completed hands in Poker). The server validates the target, deadline and cooldown. Failed/late reactions do not apply a cooldown. Restart clears it. Peeks otherwise last four seconds.

First-person hands sit closer to the player, with smaller cards and rows for large Bluff hands, leaving the center pile visible. Selected cards glow with a minimal lift; hand-list selection stays inside its card footprint so adjacent cards remain accessible.


## Version 0.5: Tarneeb table and three environments

Tarneeb hands group by suit (spades, hearts, diamonds, clubs), with 2 through K then A in each suit. Partner seats cannot peek at each other: both the UI and authoritative server enforce this. All card games now limit a peek to four seconds; Bluff retains its one-second slap opportunity.

Played Tarneeb cards show larger rank/suit faces at the center and a readable player/card summary. Each completed four-card trick pauses play briefly, then moves to the winning team's side pile. The scoreboard shows partner names, hands/tricks won out of 13, and cumulative match points. The last trick remains listed for reference. A new deal clears trick piles and counts while preserving match points.

In lobby House rules → The basics → Game background, choose Big garage, Forest clearing, or Speakeasy, then Apply house rules. The shared setting is locked during games and included in exported rules. Garage scenery includes a tool wall, workbench, refrigerator, tool chest and tires. The forest includes trees, rocks and four low-poly animals with grazing and flower-sniffing loops. The speakeasy includes a bar, bottles, stools, lamps, chandelier and seven NPCs with drinking and laughing loops. Environments are generated in code without external model downloads.

Bluff always shows the Play button. It stays disabled throughout the call window and unlocks for the next player after the window closes, once cards are selected. Calling bluff still preserves the next seat.

## Version 0.6: scenery boundaries and idle activities

Lobby scenes place the game caption and seat information in a separate opaque footer below the canvas, preventing the background from cutting through the bottom strip at different screen sizes. Active game controls retain their table overlay.

Forest animals now stay at four fixed patches and repeat grazing or flower-sniffing actions. Speakeasy patrons stay near the bar and side tables, raising beer mugs or laughing. They no longer orbit the game table. Activity animation changes head/arm/body joints without translating actors into player space. Tests sample 90 seconds of animation for both environments and check world bounds against the table/player exclusion area and the floor.

## Version 0.6.1: speakeasy furniture clearance

Patrons stand in open side aisles and clear patches beside the furniture. None stands inside a stool or side table. Collision verification samples every 100 ms across 90 seconds, checking each animated body against every static fixture with 20 cm clearance and against other patrons with 10 cm clearance. The existing table/player exclusion checks remain in place.


## Version 0.7: pair charades and safe peeking

Charades accepts 2, 4, 6 or 8 players. The lobby supports chosen teammates or automatic pairs; unassigned players fill open pair slots. Only the actor's partner may submit guesses or be awarded a spoken answer. Each member receives a full timed guessing turn, with their partner acting, before the next pair plays. Correct answers count once for the pair and once for the guesser's personal correct-answer count. Skip penalties affect pair points without reducing the count of correct answers.

Before starting, select one of ten categories under House rules → Game rules. Each category has 100 prompts (50 distinct scenes and 50 specific scenario twists), for a total of 1,000. Categories cover animals, jobs, sports, everyday life, food, travel, fantasy, objects, emotions, and celebrations. Custom prompts may override the category collection. The whole-match timer defaults to five minutes and can be set from 30 seconds to 20 minutes; the prompt timer is bounded by the match deadline. Skipping cannot extend the whole match. The recap lists your correct guesses and each pair's correct-answer total and points, including when the host ends early.

In Bluff with catching enabled, peeking begins with a one-second reaction window. No target cards are sent to the peeker during that window. If the target does not slap, the server starts a fresh four-second reveal window. A slap cancels the reveal and retains the eight-play cooldown. During a slap involving your seat, first-person view briefly pulls back to show both characters and the impact, then returns to your seat. Other card games retain their four-second peek rules.


## Version 0.8: expanded charades and Trivia

Charades now has 19 categories with 100 prompts each (1,900 total). New categories: Countries, Brands, Fictional characters, Accents, Superheroes & villains, Cars, Anime, Historical figures, Movies & TV shows. Sports already had 100 prompts and remains available. The accents category is a voice round, with 50 accent settings and two performance scenarios each. Spoken guesses can be awarded by the actor to their partner. Other charades categories retain the normal pantomime rules.

Trivia supports 2–8 people, including one master and at least one contestant. In the lobby, a player volunteers as the master; host and master may be different people. The host sets 1–100 questions per round, 5–180 seconds per question, and Free for all or Turn based under Game rules. Start the game, then the master chooses one of ten round categories, with 100 questions each: General knowledge, Science & nature, Sports, History, Geography, Movies, Music, Television, Computers, Video games.

The master reads the question and sees the private answer key. Contestants see the question and shuffled answer choices. A correct typed answer earns one point automatically; capitalization, punctuation, accents and leading articles are normalized. Other phrasing may require a spoken-answer award. In Free for all, the first correct submission closes the question. In Turn based, only the active contestant can answer or receive a spoken-answer award; answering turns rotate each question, excluding the master. The master can award a point for a spoken answer, skip a question, or advance after resolution. Timeouts close without a point. Every correct answer pops a gold star above the scorer's model and plays a success sound. The final scoreboard excludes the master and names the highest scorer or a tie.

Questions are bundled locally from [Open Trivia DB](https://opentdb.com/) and work without a live API. The imported data uses [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); attribution and changes are documented in [server/TRIVIA-DATA-LICENSE.md](server/TRIVIA-DATA-LICENSE.md) and linked inside Trivia. The source is user-contributed. Seven dated or law-related questions were replaced during preparation. The master can review the key and skip an unsuitable question. The full question bank is never sent to clients. Only the master receives the answer key while a question is open; contestants see the answer after the question resolves.

Implementation: server/trivia.ts owns roles, timers, scoring and private views; server/trivia-bank.ts contains 1,000 questions; shared/trivia.ts contains public category names and contracts; server/charade-extras.ts contains the new charades collections. Automated tests cover every category count, question-bank uniqueness and structure, role permissions, answer privacy, duplicate scoring, timeouts, turn rules, spoken awards, skips and game lifecycle. Browser checks cover guest master selection, typed and spoken scoring, active-player controls, star animation, results and the accents voice round.


## Version 0.10: drawing, adventures and solo cards

### Scribble

Choose **Scribble** on the shelf and invite 2–8 players. Game rules set 20–180 seconds per drawing and 1–8 drawing turns per person. The drawer has 15 seconds to choose one of three secret words; an absent drawer gets an automatic choice. Only the drawer sees the live word. Everyone else sees the shared canvas and letter count. Draw with a mouse or touch, choose a brush color/size, and clear the canvas when needed. Correct guesses are normalized for case and punctuation, score once per person, reward the drawer, and pop a gold star with a success sound. The word is revealed after everyone guesses or the clock runs out, then the next drawer starts after four seconds. Final scores include every player.

The server validates stroke colors, sizes, coordinates, ownership and bounded canvas capacity. Drawing survives page refresh within the same seat. Time Warp can undo a word choice or scored guess, but individual pen segments do not replace the undo snapshot; use Clear drawing for ink. No live word or choice list is sent to guessers.

### Klondike Solitaire

Select **Card sandbox → Game rules → Card table layout → Klondike Solitaire** and start with exactly one player. This is a real one-deck Klondike layout, rather than a private hand pretending to be Solitaire. Seven tableau piles contain 1–7 cards with only their tops initially face up; the remaining 24 cards form the stock. Draw one card at a time to waste, or recycle exhausted stock. Select a face-up card/run, then a Column or Foundation destination. Tableau runs descend in alternating colors, empty columns require kings, and four foundations build ace through king by suit. A newly uncovered tableau card flips face up. All four completed foundations win the game. The move count is shared with the server. Illegal moves and face-down selection are rejected without changing piles; covered identities and stock are never sent to the browser. Restart reshuffles; Time Warp can undo a move.

### Winner Takes It

Enable **House rules → Chaos → Winner Takes It**. Challenge another player using the table control. The recipient can accept or refuse within 15 seconds. Accepted duels run three simultaneous-choice beats: jab beats hook, hook beats block, block beats jab. Each beat lasts eight seconds and choices remain private until both players submit or the timer expires. Missed input loses to a submitted move. Tied duels transfer nothing; a participant who disconnects forfeits an accepted duel. Existing prompt/question timers pause and resume with the remaining time.

The game chooses the stake dynamically: card hands in Bluff/Tarneeb/free card sandbox, chips between Poker hands, cash in the board games, gold in the RPG, or points in party games. Winning a hand wager **exchanges the two hands** so the winner gets the opponent's hand while preserving the number of players and the deck; it does not leave a Tarneeb seat empty or accidentally give a Bluff opponent an empty-hand win. Tarneeb partners cannot challenge each other. Charades wagers transfer personal points; cross-pair transfers update combined pair totals, while transfers within a pair leave its total unchanged. Other point wagers transfer the loser's positive scoring total, cash/gold wagers transfer their available positive balance, and a draw leaves ownership unchanged. Solitaire is single-player and has no opponent to challenge.

Duels show avatar impacts, hand/coin transfer feedback and corresponding sounds. Only participants choose moves; all players watch. Offers and challenges are cleared on restart, early end or return to the lobby.

### D&D-style tabletop adventure

Choose **D&D tabletop** and 1–8 players. After changing from another preset, apply the house rules to open character setup before starting. The host assigns a dungeon master in the lobby; the DM may also play a hero. Each player names an adventurer and picks Fighter, Rogue, Wizard or Cleric, with editable inventory text and character notes. Sheets show level, XP, gold, HP, armor, six ability scores and remaining spell slots. Saving a character is allowed in the lobby or outside combat. Class presets determine bounded starting statistics; choices and notes survive starting/restarting the session while health, resources and progress reset.

Game rules select a Crypt, Ruins or Cavern battle map. The DM describes scenes, loads encounters, places named enemies with chosen HP/armor, rolls initiative, adjusts health and rests the party. Adventurers control their own minis; the DM controls enemy minis. Click an empty square to move up to three orthogonal steps, with walls and occupied tiles blocking the path. Initiative selects a living pawn's turn. Each combat turn allows one move and one attack/spell, followed by End pawn turn. Melee requires adjacency; Wizard/Cleric spells and Cleric healing reach four squares and consume one of three spell slots. Server dice resolve attack versus armor and damage. Any player can roll d4, d6, d8, d10, d12, d20 or d100 with an optional ability bonus. Cleared encounters grant each adventurer 25 XP and 20 gold; every 100 XP increases the displayed level. Rest heals the party and restores spells outside combat.

The 3D table shows an enlarged battle grid, class-colored hero minis, enemies, health labels and a ring around the active pawn. Movement hops, attacks launch impact effects, spells fly, healing sparkles, dice tumble, and victories pop stars with action sounds. Character details and DM tools fold away to keep the map usable. This is an original simplified d20 sandbox for a D&D-style game night; full official character creation, spells and campaign rules are not automated. The group and DM supply the story and additional rules. Sessions remain in server memory as with the other games.

### Seven environments

In lobby **House rules → The basics → Game background**, choose the existing Garage, Forest or Speakeasy, or new **Sunset beach**, **City rooftop**, **Space lounge** and **Dungeon hall**. New scenery includes palm trees and moving water, a rooftop skyline and twinkling lights, space windows with rotating planets, and dungeon columns/torches with flickering flames. Scenery is generated from original polygon geometry; no external models are required. The shared choice applies to everyone and stays locked during play.

### Trivia content update

The Battle Cats/Moneko critical-percentage question (`general-3`) was replaced with a general-knowledge question asking for the imaginary line separating Earth's Northern and Southern Hemispheres. The answer is Equator. The bank still contains exactly 100 questions per category and 1,000 in total. Attribution and the original replacement are recorded in [server/TRIVIA-DATA-LICENSE.md](server/TRIVIA-DATA-LICENSE.md).

Implementation lives in `server/solitaire.ts`, `server/scribble.ts`, `server/rpg.ts`, `server/raid.ts`, `shared/expansion.ts`, and the corresponding interface/visual/theme modules. Automated checks cover all new game modes, settings, privacy, scoring, timer transitions, card conservation, consent and payouts, RPG authority/turns, state switching and lifecycle. Browser checks cover shared drawing and correct guesses, optional-master controls, a complete cash duel, legal Solitaire moves/stock draws, RPG setup/initiative/dice and compact battle-map controls.
