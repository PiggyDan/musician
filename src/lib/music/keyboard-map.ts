/**
 * Computer-keyboard → piano mapping. Uses `KeyboardEvent.code` (physical key
 * position) so the layout works the same on QWERTY, AZERTY and Mongolian
 * Cyrillic keyboards.
 *
 * Home row = white keys, row above = black keys, spanning C → E (17 semitones).
 */
export const KEY_CODE_TO_SEMITONE: Readonly<Record<string, number>> = {
  KeyA: 0, // C
  KeyW: 1, // C#
  KeyS: 2, // D
  KeyE: 3, // D#
  KeyD: 4, // E
  KeyF: 5, // F
  KeyT: 6, // F#
  KeyG: 7, // G
  KeyY: 8, // G#
  KeyH: 9, // A
  KeyU: 10, // A#
  KeyJ: 11, // B
  KeyK: 12, // C
  KeyO: 13, // C#
  KeyL: 14, // D
  KeyP: 15, // D#
  Semicolon: 16, // E
};

export const OCTAVE_DOWN_CODE = "KeyZ";
export const OCTAVE_UP_CODE = "KeyX";

/** Label printed on a piano key for a given semitone offset from the base C. */
export const SEMITONE_TO_KEY_LABEL: Readonly<Record<number, string>> = Object.fromEntries(
  Object.entries(KEY_CODE_TO_SEMITONE).map(([code, semitone]) => [
    semitone,
    code === "Semicolon" ? ";" : code.replace("Key", ""),
  ]),
);
