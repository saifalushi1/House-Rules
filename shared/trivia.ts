export const triviaCategories={general:'General knowledge',science:'Science & nature',sports:'Sports',history:'History',geography:'Geography',movies:'Movies',music:'Music',television:'Television',computers:'Computers',games:'Video games'} as const;
export type TriviaCategory=keyof typeof triviaCategories;
export interface TriviaQuestion{id:string;question:string;answer:string;choices:string[];difficulty:string}
export interface TriviaState{master:string;category?:TriviaCategory;phase:'choose'|'question'|'result';index:number;total:number;ends:number;activePlayer?:string;questions:TriviaQuestion[];current?:TriviaQuestion;winner?:string;reason?:'correct'|'awarded'|'timeout'|'skipped'}
export interface TriviaView extends Omit<TriviaState,'questions'|'current'>{current?:Omit<TriviaQuestion,'answer'> & {answer?:string}}
