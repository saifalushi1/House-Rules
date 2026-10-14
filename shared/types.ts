export type Game = 'bluff' | 'tarneeb' | 'cards' | 'charades' | 'property' | 'life';
export type Suit = '♠' | '♥' | '♦' | '♣';
export interface Card {
    id: string;
    rank: number;
    suit: Suit;
}
export interface Rules {
    allowTrading: boolean;
    tradeSlaps: boolean;
    boxingDuels: boolean;
    game: Game;
    background: 'garage' | 'forest' | 'speakeasy';
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
export const defaults: Rules = { allowTrading: true, tradeSlaps: true, boxingDuels: true, game: 'bluff', background: 'forest', camera: 'third', maxPlayers: 8, allowPeeking: false, catchPeeking: true, penalty: 'Speak like a pirate until your next turn', decks: 1, handSize: 7, followSuit: true, targetScore: 31, challengeSeconds: 12, reverseTurns: false, charadeSeconds: 60, allowSkipping: true, skipPenalty: 0, charadePrompts: '', startingCash: 1500, salary: 200, rentMultiplier: 1, freeParking: true, roundLimit: 15, customNotes: '' };
export const games: Record<Game, {
    name: string;
    category: string;
    description: string;
    icon: string;
    players: string;
}> = {
    bluff: { name: 'Bluff', category: 'CARDS', description: 'Keep a straight face. Call their bluff. Lose all your cards.', icon: '♠', players: '2–8' },
    tarneeb: { name: 'Tarneeb', category: 'CARDS', description: 'Two teams. Thirteen tricks. One very confident bid.', icon: '♦', players: '4' },
    cards: { name: 'Card sandbox', category: 'CARDS', description: 'A deck, a table, and whatever rules your group invents.', icon: '♣', players: '1–8' },
    charades: { name: 'Charades', category: 'PARTY', description: 'Act it out. Take a guess. Absolutely no words.', icon: '✦', players: '2–8' },
    property: { name: 'Block Party', category: 'TABLETOP', description: 'Buy the neighborhood. Collect rent. Make questionable deals.', icon: '⌂', players: '2–8' },
    life: { name: 'Life Paths', category: 'TABLETOP', description: 'Choose your path, chase a career, and see where life takes you.', icon: '⚑', players: '2–8' }
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
    trickCollectUntil: number;
    lastTrickTeam: number;
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
export type View = Omit<Room, 'players' | 'deck' | 'charadeBag' | 'lastPlay' | 'charade' | 'duel' | 'tradeOffers'> & {
    tradeOffers: TradeOffer[];
    duel?: Omit<BoxingDuel, 'choices'> & { ready: string[] };
    players: PublicPlayer[];
    hand: Card[];
    deckCount: number;
    pileCount: number;
    lastPlay?: {
        player: string;
        count: number;
        claim: number;
        expires: number;
    };
    charade?: {
        ends: number;
        actor: string;
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

