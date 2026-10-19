import type {JackarooState} from './jackaroo.js';
import type {WerewolfState,WerewolfView,BlackjackState,BlackjackView,DartsState,PongState} from './club.js';
import type {PokerState,PokerView} from './poker.js';
import type {SolitaireState,SolitaireView,ScribbleState,ScribbleView,RpgState,Raid,RaidView} from './expansion.js';
import type {ChaosState} from './chaos.js';
import type {TriviaState,TriviaView} from "./trivia.js";
import type {CharadeCategory} from "./charades.js";
export type Game = 'jackaroo' | 'bluff' | 'tarneeb' | 'cards' | 'charades' | 'trivia' | 'property' | 'life' | 'scribble' | 'rpg' | 'poker' | 'werewolf' | 'blackjack' | 'darts' | 'beerpong';
export type Suit = '♠' | '♥' | '♦' | '♣';
export interface Card {
    id: string;
    rank: number;
    suit: Suit;
}
export interface Rules {
 jackarooSeconds:number;jackarooSplitSeven:boolean;jackarooFiveAny:boolean;jackarooTenBurn:boolean;jackarooKingSweep:boolean;jackarooProtectedStart:boolean;
wolfCount:number;wolfNightSeconds:number;wolfDaySeconds:number;wolfVoteSeconds:number;wolfSeer:boolean;wolfDoctor:boolean;wolfReveal:boolean;wolfRepeatSave:boolean;
blackjackDecks:number;blackjackSeconds:number;blackjackRounds:number;blackjackMin:number;blackjackMax:number;blackjackSideBets:boolean;blackjackHitSoft17:boolean;
dartsAimSpeed:number;pongAimSpeed:number;aimSeconds:number;aimRounds:number;dartsStart:number;dartsDoubleOut:boolean;pongCups:number;pongRedemption:boolean;pongBallsBack:boolean;
    triviaFormat:'typed'|'choices'; triviaDifficulty:'easy'|'mixed';
    charadeRounds:number;rooftopAntics:boolean;soreLoser:boolean;
    pokerStack:number;pokerSmallBlind:number;pokerBigBlind:number;pokerSeconds:number;pokerHands:number;
    triviaHostMode:'everyone'|'master'; triviaCategory:keyof typeof import('./trivia.js').triviaCategories; cardLayout:'free'|'solitaire'; scribbleSeconds:number; scribbleRounds:number; rpgMap:'crypt'|'ruins'|'cavern'; chaosRaid:boolean;
    chaosHotPotato:boolean; chaosSeatRoulette:boolean; chaosCyclone:boolean; chaosDouble:boolean; chaosDie:boolean; chaosTableFlip:boolean; chaosBlackout:boolean; chaosRobin:boolean; chaosBanned:boolean; chaosDare:boolean; chaosWarp:boolean;
    chaosHotSeconds:number; chaosMinSeconds:number; chaosShrinkSeconds:number; chaosSeatEvery:number; chaosRandomPercent:number; chaosDoublePercent:number;
    chaosHotOutcome:'penalty'|'forced'|'random'; chaosHandsTravel:boolean; chaosDirection:'left'|'right'; chaosCycloneTrigger:'round'|'random'; chaosFlipMode:'scores'|'order'; chaosWords:string; chaosDares:string;

    allowTrading: boolean;
    tradeSlaps: boolean;
    boxingDuels: boolean;
    game: Game;
    background: keyof typeof import('./expansion.js').backgrounds;
    camera: 'third' | 'first';
    maxPlayers: number;
    allowPeeking: boolean;
    catchPeeking: boolean;
    penalty: string;
    decks: number;
    handSize: number;
    followSuit: boolean;
    targetScore: number;
    challengeSeconds: number;
    reverseTurns: boolean;
    triviaQuestions: number;
    triviaSeconds: number;
    triviaMode: "ffa" | "turns";
    charadeMatchSeconds: number;
    charadeCategory: CharadeCategory;
    charadeSeconds: number;
    allowSkipping: boolean;
    skipPenalty: number;
    charadePrompts: string;
    startingCash: number;
    salary: number;
    rentMultiplier: number;
    freeParking: boolean;
    roundLimit: number;
    customNotes: string;
}
export const defaults: Rules = {jackarooSeconds:40,jackarooSplitSeven:true,jackarooFiveAny:true,jackarooTenBurn:true,jackarooKingSweep:true,jackarooProtectedStart:true,wolfCount:1,wolfNightSeconds:30,wolfDaySeconds:60,wolfVoteSeconds:30,wolfSeer:true,wolfDoctor:true,wolfReveal:true,wolfRepeatSave:false,blackjackDecks:4,blackjackSeconds:30,blackjackRounds:5,blackjackMin:10,blackjackMax:500,blackjackSideBets:true,blackjackHitSoft17:false,dartsAimSpeed:1,pongAimSpeed:1,aimSeconds:20,aimRounds:20,dartsStart:301,dartsDoubleOut:false,pongCups:6,pongRedemption:true,pongBallsBack:true,triviaFormat:'typed',triviaDifficulty:'easy',charadeRounds:1,rooftopAntics:true,soreLoser:true,pokerStack:1000,pokerSmallBlind:5,pokerBigBlind:10,pokerSeconds:45,pokerHands:0,triviaHostMode:'master',triviaCategory:'general',cardLayout:'free',scribbleSeconds:60,scribbleRounds:2,rpgMap:'crypt',chaosRaid:false,"chaosHotOutcome":"random","chaosHotPotato":false,"chaosSeatRoulette":false,"chaosCyclone":false,"chaosDouble":false,"chaosDie":false,"chaosTableFlip":false,"chaosBlackout":false,"chaosRobin":false,"chaosBanned":false,"chaosDare":false,"chaosWarp":false,"chaosHotSeconds":30,"chaosMinSeconds":5,"chaosShrinkSeconds":2,"chaosSeatEvery":3,"chaosRandomPercent":20,chaosDoublePercent:20,"chaosHandsTravel":true,"chaosDirection":"left","chaosCycloneTrigger":"round","chaosFlipMode":"order","chaosWords":"yes\nno\nokay\nliterally\nactually","chaosDares":"Speak like a pirate until your next turn\nDo a dramatic victory pose\nNarrate your next move like a sports commentator", allowTrading: true, tradeSlaps: true, boxingDuels: true, game: 'bluff', background: 'forest', camera: 'third', maxPlayers: 8, allowPeeking: false, catchPeeking: true, penalty: 'Speak like a pirate until your next turn', decks: 1, handSize: 7, followSuit: true, targetScore: 31, challengeSeconds: 12, reverseTurns: false, triviaQuestions: 10, triviaSeconds: 30, triviaMode: "ffa", charadeMatchSeconds: 300, charadeCategory: "animals", charadeSeconds: 120, allowSkipping: true, skipPenalty: 0, charadePrompts: '', startingCash: 1500, salary: 200, rentMultiplier: 1, freeParking: true, roundLimit: 15, customNotes: '' };
export const games: Record<Game, {
    name: string;
    category: string;
    description: string;
    icon: string;
    players: string;
}> = {
    jackaroo:{name:'Jackaroo',category:'TABLETOP',description:'Play your cards. Race your marbles home. Help your partner win.',icon:'●',players:'4'},
    werewolf:{name:'Werewolf / Mafia',category:'PARTY',description:'Secret roles. Quiet nights. Very loud accusations.',icon:'☾',players:'4–8'},
    blackjack:{name:'Blackjack',category:'CARDS',description:'Beat the house. Play your chips, or try a side bet.',icon:'♣',players:'1–8'},
    darts:{name:'Darts',category:'TABLETOP',description:'Aim. Time your release. Race from 301 or 501 to zero.',icon:'◎',players:'1–8'},
    beerpong:{name:'Shai Pong',category:'PARTY',description:'Two teams, a row of cups, and one perfect shot.',icon:'◡',players:'2, 4, 6, 8'},
    poker:{name:'Poker',category:'CARDS',description:'Texas Hold’em. Read the room. Bet, bluff, and chase the pot.',icon:'♠',players:'2–8'},
    scribble:{name:'Scribble',category:'PARTY',description:'Draw a secret word. Guess your friends’ doodles.',icon:'✎',players:'2–8'},
    rpg:{name:'D&D tabletop',category:'TABLETOP',description:'Character sheets, dice and a dungeon master. Your adventure.',icon:'⚔',players:'1–8'},
    bluff: { name: 'Bluff', category: 'CARDS', description: 'Keep a straight face. Call their bluff. Lose all your cards.', icon: '♠', players: '2–8' },
    tarneeb: { name: 'Tarneeb', category: 'CARDS', description: 'Two teams. Thirteen tricks. One very confident bid.', icon: '♦', players: '4' },
    cards: { name: 'Card sandbox', category: 'CARDS', description: 'A deck, a table, and whatever rules your group invents.', icon: '♣', players: '1–8' },
    charades: { name: 'Charades', category: 'PARTY', description: 'Pair up. Beat the clock. Act it out without words.', icon: '✦', players: '2, 4, 6, 8' },
    trivia: {name:'Trivia',category:'PARTY',description:'Everyone plays, or choose a master. Race for the point.',icon:'★',players:'2–8'},
    property: { name: 'Monopoly', category: 'TABLETOP', description: 'Buy the neighborhood. Collect rent. Make questionable deals.', icon: '⌂', players: '2–8' },
    life: { name: 'The Game of Life', category: 'TABLETOP', description: 'Choose your path, chase a career, and see where life takes you.', icon: '⚑', players: '2–8' }
};
export interface Player {
    id: string;
    name: string;
    connected: boolean;
    ready: boolean;
    color: string;
    hand: Card[];
    cash: number;
    position: number;
    score: number;
    peekRevealed: boolean;
    peekRevealsAt: number;
    correctAnswers: number;
    peekingUntil: number;
    peekTarget?: string;
    catchUntil: number;
    peekBlockedUntil: number;
    bankrupt: boolean;
    career: string;
}
export interface Tile {
    name: string;
    type: 'start' | 'property' | 'event' | 'tax' | 'rest';
    price: number;
    rent: number;
    owner?: string;
}
export interface Room {
 spectators?:import('./spectators.js').Spectator[];spectatorGhost?:import('./spectators.js').SpectatorGhost;
 jackaroo?:JackarooState;
 werewolf?:WerewolfState;blackjack?:BlackjackState;darts?:DartsState;pong?:PongState;
    charadeTeams?:string[][];charadeSession?:{order:string[];index:number;turnEnds:number};
    retaliated:string[];finishEffectsDone:boolean;endReason?:'tableFlip';
    poker?:PokerState;
    solitaire?:SolitaireState; scribble?:ScribbleState; rpg?:RpgState; rpgDm?:string; raid?:Raid;
    chaos?:ChaosState;
    trickCollectUntil: number;
    lastTrickTeam: number;
    triviaMaster?: string;
    trivia?: TriviaState;
    charadeMatchEnds: number;
    charadeCorrect: number[];
    charadeScores: number[];
    bluffPlays: number;
    gameInstance: number;
    endedEarly: boolean;
    messages: TableMessage[];
    messageSequence: number;
    events: GameEvent[];
    eventSequence: number;
    busyUntil: number;
    rollDice: number[];
    tradeOffers: TradeOffer[];
    clash?: TrumpClash;
    duel?: BoxingDuel;
    deniedTrumps: string[];
    code: string;
    host: string;
    players: Player[];
    rules: Rules;
    phase: 'lobby' | 'playing' | 'finished';
    turn: number;
    deck: Card[];
    pile: Card[];
    log: string[];
    round: number;
    winner?: string;
    lastPlay?: {
        player: string;
        cards: Card[];
        claim: number;
        expires: number;
    };
    claim: number;
    trick: {
        player: string;
        card: Card;
    }[];
    tricks: [
        number,
        number
    ];
    teamScores: [
        number,
        number
    ];
    bid: number;
    bidder?: string;
    passes: number;
    bidPassed: string[];
    tarneebPhase: 'bid' | 'trump' | 'play' | 'handEnd';
    trump: Suit;
    tiles: Tile[];
    rolled: boolean;
    lastRoll: number;
    charade?: {
        prompt: string;
        guesser:string;
        ends: number;
        actor: string;
    };
    charadeBag: string[];
    boardPot: number;
    pendingLife?: {
        player: string;
        kind: 'career' | 'crossroads';
    };
    lastTrick?: {
        player: string;
        card: Card;
    }[];
}
export type PublicPlayer = Omit<Player, 'hand'> & {
    handCount: number;
};
export type View = Omit<Room, 'players' | 'deck' | 'charadeBag' | 'lastPlay' | 'charade' | 'duel' | 'tradeOffers' | 'trivia' | 'solitaire' | 'scribble' | 'raid' | 'poker' | 'werewolf' | 'blackjack'> & {
    spectating?:boolean;serverNow?:number;blackoutHidden?:boolean;werewolf?:WerewolfView;blackjack?:BlackjackView;
    poker?:PokerView;
    solitaire?:SolitaireView; scribble?:ScribbleView; raid?:RaidView;
    trivia?: TriviaView;
    tradeOffers: TradeOffer[];
    duel?: Omit<BoxingDuel, 'choices'> & { ready: string[] };
    players: PublicPlayer[];
    hand: Card[];
    deckCount: number;
    pileCount: number;
    lastPlay?: {
        player: string;
        hidden?: boolean;
        count: number;
        claim: number;
        expires: number;
    };
    charade?: {
        ends: number;
        actor: string;
        guesser:string;
        prompt?: string;
    };
    peek?: Card[];
};
export interface Action {
    type: string;
    [key: string]: unknown;
}
export type BoxingMove = 'jab' | 'hook' | 'block';
export interface GameEvent { id: number; kind: string; at: number; actor?: string; target?: string; data: Record<string, unknown> }
export interface TradeOffer { id: string; from: string; to: string; giveCash: number; wantCash: number; giveTiles: number[]; wantTiles: number[]; expires: number }
export interface TrumpClash { acePlayer: string; trumpPlayer: string; card: Card; expires: number }
export interface BoxingDuel { acePlayer: string; trumpPlayer: string; card: Card; round: number; score: [number, number]; ends: number; choices: Record<string, BoxingMove> }
export interface TableMessage { id: number; at: number; text: string }
