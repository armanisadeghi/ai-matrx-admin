// features/education/create/studyFromDeck.ts
//
// What Use existing offers beyond the approved nine kinds, per Education
// screen — always passed explicitly (`EducationCreatePage` has no default).
// A screen that studies FROM a deck (quiz, practice test, oral practice, mind
// map, memory aids, audio study, Add more questions) offers Decks; a screen
// that MAKES a deck offers none.

/** Decks join Use existing on a screen that studies from a deck. */
export const STUDY_FROM_DECK_KINDS: readonly string[] = ["fc_set"];

/** Nothing beyond the approved nine. */
export const NO_EXTRA_KINDS: readonly string[] = [];
