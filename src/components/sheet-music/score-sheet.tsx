"use client";

import { useEffect, useRef, useState } from "react";
import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import { cn } from "@/lib/cn";

type Status = "loading" | "ready" | "error";

/**
 * Renders MusicXML with OpenSheetMusicDisplay (loaded lazily, client only) and
 * moves its cursor to `cursor` — the index of a note/rest event — or hides it
 * when null. Monophonic scores have exactly one cursor step per event.
 */
export function ScoreSheet({
  xml,
  cursor,
  loadingLabel,
  errorLabel,
  className,
}: {
  xml: string;
  cursor: number | null;
  loadingLabel: string;
  errorLabel: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OpenSheetMusicDisplay | null>(null);
  const position = useRef(0);
  const [status, setStatus] = useState<Status>("loading");
  // How many positions OSMD's cursor visits — compared against our own step
  // model in end-to-end tests to prove playback and practice stay in sync.
  const [cursorSteps, setCursorSteps] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;

    (async () => {
      const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
      if (disposed) return;
      const osmd = new OpenSheetMusicDisplay(el, {
        backend: "svg",
        autoResize: true,
        autoBeam: true,
        drawTitle: true,
        drawComposer: true,
        drawPartNames: false,
        drawCredits: true,
        followCursor: false,
        defaultColorMusic: "#16162a",
        cursorsOptions: [{ type: 0, color: "#7c6bff", alpha: 0.4, follow: false }],
      });
      osmd.zoom = el.clientWidth < 560 ? 0.62 : el.clientWidth < 900 ? 0.82 : 1;
      await osmd.load(xml);
      if (disposed) return;
      osmd.render();
      osmdRef.current = osmd;
      osmd.cursor.reset();
      let count = 0;
      while (!osmd.cursor.Iterator.EndReached && count < 10_000) {
        count += 1;
        osmd.cursor.next();
      }
      osmd.cursor.reset();
      osmd.cursor.hide();
      position.current = 0;
      setCursorSteps(count);
      setStatus("ready");
    })().catch((error: unknown) => {
      console.error("[MusicPath] Score failed to render", error);
      if (!disposed) setStatus("error");
    });

    return () => {
      disposed = true;
      try {
        osmdRef.current?.clear();
      } catch {
        // Already torn down.
      }
      osmdRef.current = null;
      el.innerHTML = "";
    };
  }, [xml]);

  useEffect(() => {
    const osmd = osmdRef.current;
    if (status !== "ready" || !osmd) return;
    const c = osmd.cursor;
    if (cursor === null) {
      c.hide();
      return;
    }
    if (cursor < position.current) {
      c.reset();
      position.current = 0;
    }
    while (position.current < cursor) {
      c.next();
      position.current += 1;
    }
    c.show();
  }, [cursor, status]);

  return (
    <div className={cn("relative", className)} data-score-ready={status === "ready"} data-cursor-steps={cursorSteps ?? undefined}>
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col gap-4 p-8" aria-busy>
          <span className="sr-only">{loadingLabel}</span>
          <div className="mx-auto h-6 w-1/3 animate-pulse rounded bg-ink-950/10" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded bg-[repeating-linear-gradient(180deg,rgb(0_0_0/0.08)_0_1px,transparent_1px_11px)]" />
          ))}
        </div>
      )}
      {status === "error" && <p className="p-8 text-center text-sm text-ink-600">{errorLabel}</p>}
      <div ref={containerRef} className={cn("min-h-56", status === "error" && "hidden")} />
    </div>
  );
}
