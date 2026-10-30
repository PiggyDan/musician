"use client";

import { useEffect, useRef, useState } from "react";
import { useElementWidth } from "@/hooks/use-element-width";
import { isBlackKey, octaveOf, pitchClassName, type Midi } from "@/lib/music/notes";
import { cn } from "@/lib/cn";

export interface StaffGroup {
  /** Notes sounding together (one note, or a chord). */
  keys: readonly Midi[];
  /** Text shown under the note (e.g. its letter, or a chord name). */
  label?: string;
  /** Colour for this group's notes (e.g. to highlight the current one). */
  color?: string;
}

export type StaffKind = "treble" | "bass" | "grand";

function vfKey(midi: Midi): string {
  const natural = isBlackKey(midi) ? midi - 1 : midi;
  const letter = pitchClassName(natural)[0].toLowerCase();
  return `${letter}${isBlackKey(midi) ? "#" : ""}/${octaveOf(natural)}`;
}

/**
 * Engraves a few whole notes or chords on a staff with VexFlow (loaded lazily,
 * client only). Used to teach note reading: the learner sees real notation,
 * not just a highlighted key. A "grand" staff splits notes at Middle C.
 */
export function StaffView({
  kind,
  groups,
  label,
  className,
}: {
  kind: StaffKind;
  groups: readonly StaffGroup[];
  /** Accessible description, e.g. "A note on the second line of the treble staff". */
  label: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const drawRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(wrapRef, 360);
  const [failed, setFailed] = useState(false);
  const signature = JSON.stringify(groups);

  useEffect(() => {
    const el = drawRef.current;
    if (!el || width === 0) return;
    let cancelled = false;

    import("vexflow")
      .then(({ default: Vex }) => {
        if (cancelled) return;
        const VF = Vex.Flow;
        el.innerHTML = "";
        const parsed: StaffGroup[] = JSON.parse(signature);
        const scale = width < 420 ? 1.15 : 1.4;
        const staveWidth = width / scale - 12;
        const grand = kind === "grand";
        const height = (grand ? 230 : 130) * scale;

        const renderer = new VF.Renderer(el, VF.Renderer.Backends.SVG);
        renderer.resize(width, height);
        const ctx = renderer.getContext();
        ctx.scale(scale, scale);

        const makeNote = (clef: "treble" | "bass", group: StaffGroup, keys: readonly Midi[]) => {
          if (keys.length === 0) return new VF.GhostNote({ duration: "w" });
          const sorted = [...keys].sort((a, b) => a - b);
          const note = new VF.StaveNote({ clef, keys: sorted.map(vfKey), duration: "w" });
          sorted.forEach((m, i) => {
            if (isBlackKey(m)) note.addAccidental(i, new VF.Accidental("#"));
          });
          if (group.label) {
            const annotation = new VF.Annotation(group.label).setVerticalJustification(VF.Annotation.VerticalJustify.BOTTOM);
            annotation.setFont("Arial", 11, "bold");
            note.addModifier(0, annotation);
          }
          if (group.color) note.setStyle({ fillStyle: group.color, strokeStyle: group.color });
          return note;
        };

        if (!grand) {
          const clef = kind;
          const stave = new VF.Stave(6, 6, staveWidth).addClef(clef);
          stave.setContext(ctx).draw();
          VF.Formatter.FormatAndDraw(ctx, stave, parsed.map((g) => makeNote(clef, g, g.keys)));
        } else {
          const top = new VF.Stave(22, 6, staveWidth - 16).addClef("treble");
          const bottom = new VF.Stave(22, 106, staveWidth - 16).addClef("bass");
          top.setContext(ctx).draw();
          bottom.setContext(ctx).draw();
          new VF.StaveConnector(top, bottom).setType(VF.StaveConnector.type.BRACE).setContext(ctx).draw();
          new VF.StaveConnector(top, bottom).setType(VF.StaveConnector.type.SINGLE_LEFT).setContext(ctx).draw();
          // Treble gets notes from Middle C up; bass gets the rest. Labels go on the bass part.
          const trebleNotes = parsed.map((g) => makeNote("treble", { ...g, label: undefined }, g.keys.filter((m) => m >= 60)));
          const bassNotes = parsed.map((g) => makeNote("bass", g, g.keys.filter((m) => m < 60)));
          VF.Formatter.FormatAndDraw(ctx, top, trebleNotes);
          VF.Formatter.FormatAndDraw(ctx, bottom, bassNotes);
        }
        setFailed(false);
      })
      .catch((error: unknown) => {
        console.error("[MusicPath] Staff failed to render", error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [kind, signature, width]);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={label}
      className={cn("w-full overflow-hidden rounded-2xl bg-[#fbfaf7] px-1 py-2 ring-1 ring-white/10", className)}
    >
      <div ref={drawRef} aria-hidden data-staff-ready={!failed} />
      {failed && <p className="p-4 text-center text-sm text-neutral-600">{label}</p>}
    </div>
  );
}
