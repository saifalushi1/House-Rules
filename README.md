# House Rules

![House Rules poster: friends playing cards, charades, trivia and board games around a low-poly table](docs/images/house-rules-poster.png)

A self-hosted TypeScript game-night sandbox. Low-poly 3D table and avatars, private hands, live shared rooms, and host-editable presets. Version 0.8 adds Trivia with 1,000 questions across ten categories and expands pair Charades to 1,900 prompts across 19 categories.

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
| Charades | 2, 4, 6 or 8 players in pairs; 19 categories with 100 prompts each, custom prompts, prompt and match timers, partner guesses, spoken-answer awards, skipping and a final pair/personal recap. Use an existing group call when apart. |
| Trivia | 2–8 players, a volunteer trivia master, ten categories with 100 questions each, timed rounds, typed or spoken answers, free-for-all or turn-based scoring, gold-star celebrations and a final scoreboard. |
| Block Party | Original simplified property-trading game: 24 spaces, two dice, purchases, rent, tax pot, events, property sell-back, bankruptcy, and net-worth win. |
| Life Paths | Original simplified life-path game: one die, career selection, safe/risky choices, events, cash, and round-limit win. |

The board presets are small original games inspired by property-trading and life-journey mechanics. They are not full reproductions of Monopoly or The Game of Life: no auctions, mortgages, house-building systems, or full career/family simulation yet. Cash and player-to-player property trades are now supported.

Tarneeb uses the common scoring variation: a made bid scores tricks won, an unbid sweep scores 16, a made bid of 13 scores 26, a failed bid subtracts the contract, and defenders score their tricks when the contract fails. Regional rules vary. Reference: [Pagat's Tarneeb rules](https://www.pagat.com/auctionwhist/tarneeb.html).

## Playing Trivia

1. Select **Trivia** in the lobby and invite at least one other player (2–8 people total).
2. One player volunteers as **Trivia master**. The master can be someone other than the room host and does not compete for points.
3. In **House rules → Game rules**, the host chooses the number of questions, time per question, and **Free for all** or **Turn based**. Apply the rules and start the game.
4. The master chooses the round category: General knowledge, Science & nature, Sports, History, Geography, Movies, Music, Television, Computers, or Video games.
5. Contestants type answers while the timer runs. In free-for-all, the first correct answer wins the point. In turn-based play, only the active contestant can answer, and turns rotate each question.
6. For answers spoken over your group call or in person, the master awards the point to the eligible contestant. The master sees the answer key, can skip questions, and advances after each result.

Each correct answer gives one point, plays a success sound, and pops a gold star above the scorer. A timeout gives no point. After the configured questions, the scoreboard shows contestant totals and the winner or tied winners. The host can end early or restart. The full question bank is bundled with the server, so playing does not depend on an external trivia API.

## House rules

The host can edit rules before a game or return everyone to the lobby to change them. Start Game applies the current draft. Apply House Rules shares a draft without starting.

- General: player limit, default first/third-person view, reverse turns.
- Cards: peeking, catching peekers, penalty text, deck count, hand size, challenge window, follow suit, target score.
- Charades: category, custom prompts (one per line), time per prompt, match time limit, skip toggle and penalty, rounds per player.
- Trivia: questions per round (1–100), seconds per question (5–180), free-for-all or turn-based answers. The trivia master chooses the category after the game starts.
- Boards: starting cash, Home bonus, round limit, rent multiplier, rest-stop jackpot.
- Custom: written house contract and JSON rule import/export.

Peeking reveals up to three cards for four seconds. In Bluff with catching enabled, the target first gets a two-second slap reaction window; cards stay hidden until that window ends. A successful slap cancels the reveal and gives the peeker an eight-play cooldown. Tarneeb partners cannot peek at each other. The server announces the chosen funny penalty; the group carries it out. Text house rules are group agreements, not executable scripts. You can change your own camera during play.

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
- `server/trivia.ts` and `server/trivia-bank.ts`: trivia roles, question timers, scoring, answer privacy and the bundled question bank.
- `server/charade-prompts.ts` and `server/charade-extras.ts`: bundled charades collections.
- `shared/types.ts`: TypeScript contracts and preset metadata.
- `tests/`: rule, privacy and two-client integration tests.

The server never sends opponents' private hands or a charades prompt to guessers. Explicitly enabled peeking is the exception. Session tokens live in the browser tab's session storage. Refreshing the same tab reconnects to the saved seat. Closing a tab preserves the seat in the room, but a new tab has a new token; return to the lobby to remove abandoned seats. In the lobby, host responsibility transfers if the host disconnects. During play, the original host can resume the same tab; otherwise restart/reset with that session before continuing.

Rooms are in memory. Restarting the server clears games. Disconnected rooms expire after 12 hours. There are no bots, voice/video calls, saved accounts, durable games, arbitrary code rules, or full drag-and-drop tabletop physics yet. Fonts have browser fallbacks if Google Fonts cannot load.

## Verification

62 automated tests pass, including a full 13-trick Tarneeb hand, challenge resolution, timer behavior, private views, validation, scoring, board actions and a real two-client reconnect flow. Browser checks cover room creation, joining, private deals, card selection/play, calling bluff, camera switching, enlarged board views, negotiation offers and refusals, and host rule editing.

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


## Version 0.7: pair charades and safe peeking

Charades accepts 2, 4, 6 or 8 players. Adjacent lobby seats form pairs: 1+2, 3+4, 5+6, 7+8. Only the actor's partner may submit guesses or be awarded a spoken answer. Roles alternate through the seats. Correct answers count once for the pair and once for the guesser's personal correct-answer count. Skip penalties affect pair points without reducing the count of correct answers.

Before starting, select one of ten categories under House rules → Game rules. Each category has 100 prompts (50 distinct scenes and 50 specific scenario twists), for a total of 1,000. Categories cover animals, jobs, sports, everyday life, food, travel, fantasy, objects, emotions, and celebrations. Custom prompts may override the category collection. The whole-match timer defaults to five minutes and can be set from 30 seconds to 20 minutes; the prompt timer is bounded by the match deadline. Skipping cannot extend the whole match. The recap lists your correct guesses and each pair's correct-answer total and points, including when the host ends early.

In Bluff with catching enabled, peeking begins with a two-second reaction window. No target cards are sent to the peeker during that window. If the target does not slap, the server starts a fresh four-second reveal window. A slap cancels the reveal and retains the eight-play cooldown. During a slap involving your seat, first-person view briefly pulls back to show both characters and the impact, then returns to your seat. Other card games retain their four-second peek rules.


## Version 0.8: expanded charades and Trivia

Charades now has 19 categories with 100 prompts each (1,900 total). New categories: Countries, Brands, Fictional characters, Accents, Superheroes & villains, Cars, Anime, Historical figures, Movies & TV shows. Sports already had 100 prompts and remains available. The accents category is a voice round, with 50 accent settings and two performance scenarios each. Spoken guesses can be awarded by the actor to their partner. Other charades categories retain the normal pantomime rules.

Trivia supports 2–8 people, including one master and at least one contestant. In the lobby, a player volunteers as the master; host and master may be different people. The host sets 1–100 questions per round, 5–180 seconds per question, and Free for all or Turn based under Game rules. Start the game, then the master chooses one of ten round categories, with 100 questions each: General knowledge, Science & nature, Sports, History, Geography, Movies, Music, Television, Computers, Video games.

The master reads the question and sees the private answer key. Contestants see the question and shuffled answer choices. A correct typed answer earns one point automatically; capitalization, punctuation, accents and leading articles are normalized. Other phrasing may require a spoken-answer award. In Free for all, the first correct submission closes the question. In Turn based, only the active contestant can answer or receive a spoken-answer award; answering turns rotate each question, excluding the master. The master can award a point for a spoken answer, skip a question, or advance after resolution. Timeouts close without a point. Every correct answer pops a gold star above the scorer's model and plays a success sound. The final scoreboard excludes the master and names the highest scorer or a tie.

Questions are bundled locally from [Open Trivia DB](https://opentdb.com/) and work without a live API. The imported data uses [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/); attribution and changes are documented in [server/TRIVIA-DATA-LICENSE.md](server/TRIVIA-DATA-LICENSE.md) and linked inside Trivia. The source is user-contributed. Seven dated or law-related questions were replaced during preparation. The master can review the key and skip an unsuitable question. The full question bank is never sent to clients. Only the master receives the answer key while a question is open; contestants see the answer after the question resolves.

Implementation: server/trivia.ts owns roles, timers, scoring and private views; server/trivia-bank.ts contains 1,000 questions; shared/trivia.ts contains public category names and contracts; server/charade-extras.ts contains the new charades collections. Automated tests cover every category count, question-bank uniqueness and structure, role permissions, answer privacy, duplicate scoring, timeouts, turn rules, spoken awards, skips and game lifecycle. Browser checks cover guest master selection, typed and spoken scoring, active-player controls, star animation, results and the accents voice round.
