/**
 * Shared musical material, written once in notation.ts format (sounding pitch)
 * and used by both lessons and the sheet music library, so the two never
 * disagree. LH voicings stay in C position: C = C3 E3 G3, F = C3 F3 A3,
 * G = B2 D3 G3 — the standard beginner "minimal movement" chord shapes.
 */

export const SUNRISE_STEPS_RH = "C4:q E4:q D4:q F4:q | E4:q G4:q F4:q E4:q | D4:h C4:h";

export const FIRST_LIGHT_RH = "C4:q E4:q G4:h | F4:q E4:q D4:h | E4:q F4:q G4:q E4:q | D4:h C4:h";
/** Bass notes under First Light: I – V – I – V I. */
export const FIRST_LIGHT_LH = "C3:w | G3:w | C3:w | G3:h C3:h";

/** Beethoven, Symphony No. 9, "Ode to Joy" theme in C (public domain). */
export const ODE_TO_JOY_RH =
  "E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | E4:q. D4:8 D4:h | E4:q E4:q F4:q G4:q | G4:q F4:q E4:q D4:q | C4:q C4:q D4:q E4:q | D4:q. C4:8 C4:h";
/** Left-hand block chords under the theme: I V I V | I V I V–I. */
export const ODE_TO_JOY_LH =
  "C3+E3+G3:w | B2+D3+G3:w | C3+E3+G3:w | B2+D3+G3:w | C3+E3+G3:w | B2+D3+G3:w | C3+E3+G3:w | B2+D3+G3:h C3+E3+G3:h";
/** First phrase only (bars 1–4), for the lesson. */
export const ODE_TO_JOY_PHRASE_RH = ODE_TO_JOY_RH.split("|").slice(0, 4).join("|");
export const ODE_TO_JOY_PHRASE_LH = ODE_TO_JOY_LH.split("|").slice(0, 4).join("|");

/** "Ah ! vous dirai-je, maman" (1761), public domain. */
export const TWINKLE_RH =
  "C4:q C4:q G4:q G4:q | A4:q A4:q G4:h | F4:q F4:q E4:q E4:q | D4:q D4:q C4:h | G4:q G4:q F4:q F4:q | E4:q E4:q D4:h | G4:q G4:q F4:q F4:q | E4:q E4:q D4:h | C4:q C4:q G4:q G4:q | A4:q A4:q G4:h | F4:q F4:q E4:q E4:q | D4:q D4:q C4:h";
/** Bass notes following the harmony (I, IV, V) of each half bar. */
export const TWINKLE_LH =
  "C3:w | F3:h C3:h | F3:h C3:h | G3:h C3:h | C3:h G3:h | C3:h G3:h | C3:h G3:h | C3:h G3:h | C3:w | F3:h C3:h | F3:h C3:h | G3:h C3:h";

/** I – IV – V – I in C with left-hand C-position voicings. */
export const PROGRESSION_I_IV_V_LH = "C3+E3+G3:w | C3+F3+A3:w | B2+D3+G3:w | C3+E3+G3:w";
