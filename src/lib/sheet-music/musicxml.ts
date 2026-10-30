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
  /** Melody at sounding pitch (see notation.ts). */
  melody: string;
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

function clefXml(clef: ClefKind): string {
  if (clef === "bass") return "<clef><sign>F</sign><line>4</line></clef>";
  if (clef === "treble-8vb") {
    return "<clef><sign>G</sign><line>2</line><clef-octave-change>-1</clef-octave-change></clef>";
  }
  return "<clef><sign>G</sign><line>2</line></clef>";
}

function noteXml(event: NotationEvent, octaveShift: number): string {
  const dot = event.dotted ? "<dot/>" : "";
  const common = `<duration>${event.sixteenths}</duration><voice>1</voice><type>${MUSICXML_TYPES[event.code]}</type>${dot}`;
  if (event.midi === null) return `<note><rest/>${common}</note>`;
  const alter = event.alter !== 0 ? `<alter>${event.alter}</alter>` : "";
  return `<note><pitch><step>${event.step}</step>${alter}<octave>${(event.octave ?? 4) + octaveShift}</octave></pitch>${common}</note>`;
}

/**
 * Builds a MusicXML 4.0 partwise score for a single-line melody. Guitar-style
 * "treble-8vb" parts are written an octave above sounding pitch with an
 * octave-transposing clef, which is standard guitar notation.
 */
export function toMusicXml(input: MusicXmlInput): string {
  const { measures } = parseMelody(input.melody);
  const octaveShift = input.clef === "treble-8vb" ? 1 : 0;
  const [beats, beatType] = input.time;

  const body = measures
    .map((events, index) => {
      const isPickup = Boolean(input.pickup) && index === 0;
      const number = input.pickup ? index : index + 1;
      const attrs =
        index === 0
          ? `<attributes><divisions>4</divisions><key><fifths>${input.keyFifths}</fifths></key><time><beats>${beats}</beats><beat-type>${beatType}</beat-type></time>${clefXml(input.clef)}</attributes>` +
            `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${input.tempo}</per-minute></metronome></direction-type><sound tempo="${input.tempo}"/></direction>`
          : "";
      const barline =
        index === measures.length - 1 ? '<barline location="right"><bar-style>light-heavy</bar-style></barline>' : "";
      return `<measure number="${number}"${isPickup ? ' implicit="yes"' : ""}>${attrs}${events.map((e) => noteXml(e, octaveShift)).join("")}${barline}</measure>`;
    })
    .join("\n    ");

  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work><work-title>${escapeXml(input.title)}</work-title></work>
  <identification>
    <creator type="composer">${escapeXml(input.composer)}</creator>
${input.rights ? `    <rights>${escapeXml(input.rights)}</rights>
` : ""}    <encoding><software>MusicPath</software><encoding-date>${ENCODING_DATE}</encoding-date></encoding>
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
