import type { Room } from '../shared/types.js';
/** Keep the legacy recent log and a chronological, timestamped conversation. */
export function recordMessage(r: Room, text: string) {
    r.log.unshift(text);
    r.log = r.log.slice(0, 35);
    r.messages.push({ id: ++r.messageSequence, at: Date.now(), text });
    r.messages = r.messages.slice(-120);
}
