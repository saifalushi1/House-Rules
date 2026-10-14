# House Rules

A self-hosted TypeScript game-night sandbox. Low-poly 3D table and avatars, private hands, live shared rooms, and host-editable presets.

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

## Included games

| Preset | Playable behavior |
| --- | --- |
| Bluff / Bullshit | Deal the whole deck; claim A–K in sequence, play 1–4 hidden cards, timed challenges, liar or caller takes the pile, first empty hand wins after the challenge window. |
| Tarneeb | Four seats, alternating partnerships, 7–13 auction, trump selection, optional follow-suit enforcement, trick winner, hand scoring, and target team score. |
| Card sandbox | Private hands, draw, play face up, collect pile, pass turn. Your group decides the objective. |
| Charades | Secret actor prompt, custom prompt list, timer, text guesses, actor-confirmed spoken guesses, skipping, scoring, turn rotation and round limit. Use an existing group call when apart. |
| Block Party | Original simplified property-trading game: 24 spaces, two dice, purchases, rent, tax pot, events, property sell-back, bankruptcy, and net-worth win. |
| Life Paths | Original simplified life-path game: one die, career selection, safe/risky choices, events, cash, and round-limit win. |

The board presets are small original games inspired by property-trading and life-journey mechanics. They are not full reproductions of Monopoly or The Game of Life: no auctions, mortgages, house-building systems, or full career/family simulation yet. Cash and player-to-player property trades are now supported.

Tarneeb uses the common scoring variation: a made bid scores tricks won, an unbid sweep scores 16, a made bid of 13 scores 26, a failed bid subtracts the contract, and defenders score their tricks when the contract fails. Regional rules vary. Reference: [Pagat's Tarneeb rules](https://www.pagat.com/auctionwhist/tarneeb.html).

## House rules

The host can edit rules before a game or return everyone to the lobby to change them. Start Game applies the current draft. Apply House Rules shares a draft without starting.

- General: player limit, default first/third-person view, reverse turns.
- Cards: peeking, catching peekers, penalty text, deck count, hand size, challenge window, follow suit, target score.
- Charades: custom prompts (one per line), time per prompt, skip toggle and penalty, rounds per player.
- Boards: starting cash, Home bonus, round limit, rent multiplier, rest-stop jackpot.
- Custom: written house contract and JSON rule import/export.

Peeking reveals up to three cards for four seconds. Another player can catch the peeker during that window. The server announces the chosen funny penalty; the group carries it out. Text house rules are group agreements, not executable scripts. You can change your own camera during play.

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
- `shared/types.ts`: TypeScript contracts and preset metadata.
- `tests/`: rule, privacy and two-client integration tests.

The server never sends opponents' private hands or a charades prompt to guessers. Explicitly enabled peeking is the exception. Session tokens live in the browser tab's session storage. Refreshing the same tab reconnects to the saved seat. Closing a tab preserves the seat in the room, but a new tab has a new token; return to the lobby to remove abandoned seats. In the lobby, host responsibility transfers if the host disconnects. During play, the original host can resume the same tab; otherwise restart/reset with that session before continuing.

Rooms are in memory. Restarting the server clears games. Disconnected rooms expire after 12 hours. There are no bots, voice/video calls, saved accounts, durable games, arbitrary code rules, or full drag-and-drop tabletop physics yet. Fonts have browser fallbacks if Google Fonts cannot load.

## Verification

46 automated tests pass, including a full 13-trick Tarneeb hand, challenge resolution, timer behavior, private views, validation, scoring, board actions and a real two-client reconnect flow. Browser checks cover room creation, joining, private deals, card selection/play, calling bluff, camera switching, enlarged board views, negotiation offers and refusals, and host rule editing.

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

When peeking is enabled, the character leans toward the target. With catching enabled, only that target receives a two-second Slap the peeker event. A successful slap stops the peek immediately, plays the cartoon slap, and blocks the peeker for eight subsequent Bluff plays. The server validates the target, deadline and cooldown. Failed/late reactions do not apply a cooldown. Restart clears it. Peeks otherwise last four seconds.

First-person hands sit closer to the player, with smaller cards and rows for large Bluff hands, leaving the center pile visible. Selected cards glow with a minimal lift; hand-list selection stays inside its card footprint so adjacent cards remain accessible.


## Version 0.5: Tarneeb table and three environments

Tarneeb hands group by suit (spades, hearts, diamonds, clubs), with 2 through K then A in each suit. Partner seats cannot peek at each other: both the UI and authoritative server enforce this. All card games now limit a peek to four seconds; Bluff retains its two-second slap opportunity.

Played Tarneeb cards show larger rank/suit faces at the center and a readable player/card summary. Each completed four-card trick pauses play briefly, then moves to the winning team's side pile. The scoreboard shows partner names, hands/tricks won out of 13, and cumulative match points. The last trick remains listed for reference. A new deal clears trick piles and counts while preserving match points.

In lobby House rules → The basics → Game background, choose Big garage, Forest clearing, or Speakeasy, then Apply house rules. The shared setting is locked during games and included in exported rules. Garage scenery includes a tool wall, workbench, refrigerator, tool chest and tires. The forest includes trees, rocks and four low-poly animals with grazing and flower-sniffing loops. The speakeasy includes a bar, bottles, stools, lamps, chandelier and seven NPCs with drinking and laughing loops. Environments are generated in code without external model downloads.

Bluff always shows the Play button. It stays disabled throughout the call window and unlocks for the next player after the window closes, once cards are selected. Calling bluff still preserves the next seat.

## Version 0.6: scenery boundaries and idle activities

Lobby scenes place the game caption and seat information in a separate opaque footer below the canvas, preventing the background from cutting through the bottom strip at different screen sizes. Active game controls retain their table overlay.

Forest animals now stay at four fixed patches and repeat grazing or flower-sniffing actions. Speakeasy patrons stay near the bar and side tables, raising beer mugs or laughing. They no longer orbit the game table. Activity animation changes head/arm/body joints without translating actors into player space. Tests sample 90 seconds of animation for both environments and check world bounds against the table/player exclusion area and the floor.

## Version 0.6.1: speakeasy furniture clearance

Patrons stand in open side aisles and clear patches beside the furniture. None stands inside a stool or side table. Collision verification samples every 100 ms across 90 seconds, checking each animated body against every static fixture with 20 cm clearance and against other patrons with 10 cm clearance. The existing table/player exclusion checks remain in place.
