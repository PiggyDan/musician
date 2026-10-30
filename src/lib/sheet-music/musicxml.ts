import { MUSICXML_TYPES, measureLength, parseMelody, type NotationEvent } from "./notation";

export type ClefKind = "treble" | "bass" | "treble-8vb";

export interface MusicXmlInput {
  title: string;
  composer: string;
  partName: string;
  /** Licence text embedded in the file; omit to leave it out (on-screen rendering). */
  rights?: string;
  keyFifths: number;
  time: readonly [number, number];
  tempo: number;
  clef: ClefKind;
  /** First measure is an incomplete anacrusis. */
  pickup?: boolean;
  /** Upper (or only) staff, at sounding pitch (see notation.ts). */
  melody: string;
  /** Optional lower staff in bass clef — makes a piano grand staff. */
  bass?: string;
}

/** Fixed so generated files are reproducible (no request-time dates). */
const ENCODING_DATE = "2026-10-30";

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function clefXml(clef: ClefKind, number?: number): string {
  const n = number ? ` number="${number}"` : "";
  if (clef === "bass") return `<clef${n}><sign>F</sign><line>4</line></clef>`;
  if (clef === "treble-8vb") return `<clef${n}><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>`;
  return `<clef${n}><sign>G</sign><line>2</line></clef>`;
}

/** One event → one <note>, or several for a chord (later ones marked <chord/>). */
function eventXml(event: NotationEvent, octaveShift: number, voice: number, staff?: number): string {
  const dot = event.dotted ? "<dot/>" : "";
  const staffXml = staff ? `<staff>${staff}</staff>` : "";
  const tail = `<duration>${event.sixteenths}</duration><voice>${voice}</voice><type>${MUSICXML_TYPES[event.code]}</type>${dot}${staffXml}`;
  if (event.pitches.length === 0) return `<note><rest/>${tail}</note>`;
  return event.pitches
    .map((p, i) => {
      const alter = p.alter !== 0 ? `<alter>${p.alter}</alter>` : "";
      const chord = i > 0 ? "<chord/>" : "";
      return `<note>${chord}<pitch><step>${p.step}</step>${alter}<octave>${p.octave + octaveShift}</octave></pitch>${tail}</note>`;
    })
    .join("");
}

/**
 * Builds a MusicXML 4.0 partwise score: a single staff, or a piano grand staff
 * when `bass` is given (staff 2 follows staff 1 in each measure via <backup>).
 * Guitar-style "treble-8vb" parts are written an octave above sounding pitch
 * with an octave-transposing clef, which is standard guitar notation.
 */
export function toMusicXml(input: MusicXmlInput): string {
  const upper = parseMelody(input.melody).measures;
  const lower = input.bass ? parseMelody(input.bass).measures : null;
  if (lower && lower.length !== upper.length) {
    throw new Error(`Staves have different measure counts (${upper.length} vs ${lower.length})`);
  }
  const octaveShift = input.clef === "treble-8vb" ? 1 : 0;
  const [beats, beatType] = input.time;
  const grand = lower !== null;

  const body = upper
    .map((events, index) => {
      const isPickup = Boolean(input.pickup) && index === 0;
      const number = input.pickup ? index : index + 1;
      const clefs = grand ? `<staves>2</staves>${clefXml(input.clef, 1)}${clefXml("bass", 2)}` : clefXml(input.clef);
      const attrs =
        index === 0
          ? `<attributes><divisions>4</divisions><key><fifths>${input.keyFifths}</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>${clefs}</attributes>` +
            `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${input.tempo}</per-minute></metronome></direction-type><sound tempo="${input.tempo}"/></direction>`
          : "";
      let notes = events.map((e) => eventXml(e, octaveShift, 1, grand ? 1 : undefined)).join("");
      if (lower) {
        const upperLength = events.reduce((sum, e) => sum + e.sixteenths, 0);
        notes += `<backup><duration>${upperLength}</duration></backup>`;
        notes += lower[index].map((e) => eventXml(e, 0, 5, 2)).join("");
      }
      const barline = index === upper.length - 1 ? '<barline location="right"><bar-style>light-heavy</bar-style></barline>' : "";
      return `<measure number="${number}"${isPickup ? ' implicit="yes"' : ""}>${attrs}${notes}${barline}</measure>`;
    })
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>${escapeXml(input.title)}</work-title></work>
  <identification>
    <creator type="composer">${escapeXml(input.composer)}</creator>
${input.rights ? `    <rights>${escapeXml(input.rights)}</rights>\n` : ""}    <encoding><software>MusicPath</software><encoding-date>${ENCODING_DATE}</encoding-date></encoding>
  </identification>
  <part-list><score-part id="P1"><part-name>${escapeXml(input.partName)}</part-name></score-part></part-list>
  <part id="P1">
    ${body}
  </part>
</score-partwise>
`;
}

/** Checks every measure (except a pickup) fills the time signature exactly. */
export function measureErrors(melody: string, time: readonly [number, number], pickup = false): string[] {
  const { measures } = parseMelody(melody);
  const expected = measureLength(time);
  const errors: string[] = [];
  measures.forEach((events, index) => {
    const total = events.reduce((sum, e) => sum + e.sixteenths, 0);
    if (pickup && index === 0) {
      if (total >= expected) errors.push(`pickup measure is a full measure (${total}/${expected})`);
    } else if (total !== expected) {
      errors.push(`measure ${index + 1} has ${total}/${expected} sixteenths`);
    }
  });
  return errors;
}
