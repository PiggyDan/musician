"use client";

import { ExternalLink, Pause, Play, Square, VolumeX } from "lucide-react";
import { useMemo } from "react";
import { getScore } from "@/content/sheet-music/catalog";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { embedUrl, externalSearchUrl } from "@/lib/catalog/service";
import type { ExternalSearchLink, PlaybackSource } from "@/lib/catalog/types";
import { scoreNotesTimed, scoreSteps } from "@/lib/sheet-music/library";
import { Button } from "@/components/ui/button";
import { useScorePlayback } from "@/components/sheet-music/use-score-playback";

const PROVIDER_NAMES = { youtube: "YouTube", spotify: "Spotify" } as const;

/**
 * The only way MusicPath plays a song. It renders exactly what the catalog
 * says is authorized — our own performance, a licensed file, or an
 * allow-listed official embed — and otherwise says so and links out.
 */
export function AuthorizedPlayer({
  sources,
  externalLinks,
}: {
  sources: readonly PlaybackSource[];
  externalLinks: readonly ExternalSearchLink[];
}) {
  const { t } = useI18n();
  const s = t.songs;
  const source = sources[0];

  return (
    <div>
      {source?.kind === "musicpath-performance" ? (
        <PerformancePlayer scoreId={source.scoreId} />
      ) : source?.kind === "licensed-audio" ? (
        <audio controls preload="none" src={source.url} className="w-full" />
      ) : source?.kind === "official-embed" && embedUrl(source) ? (
        <div>
          <iframe
            src={embedUrl(source)!}
            title={PROVIDER_NAMES[source.provider]}
            className={source.provider === "spotify" ? "h-[152px] w-full rounded-2xl" : "aspect-video w-full rounded-2xl"}
            allow="encrypted-media; picture-in-picture"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="lazy"
          />
          <p className="mt-2 text-xs text-mist-500">
            {format(s.embedNote, { provider: PROVIDER_NAMES[source.provider] })} {source.verifiedBy}.
          </p>
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-4 py-3 text-sm text-mist-300 ring-1 ring-white/10">
          <VolumeX className="size-4 shrink-0 text-mist-500" aria-hidden />
          {s.noRecording}
        </p>
      )}

      {externalLinks.length > 0 && (
        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {externalLinks.map((link) => (
              <a
                key={link.provider}
                href={externalSearchUrl(link)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-white/[0.05] px-4 text-sm text-mist-200 ring-1 ring-white/10 hover:bg-white/[0.09]"
              >
                <ExternalLink className="size-4" aria-hidden />
                {format(s.findOn, { provider: PROVIDER_NAMES[link.provider] })}
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs text-mist-500">{s.externalNote}</p>
        </div>
      )}
    </div>
  );
}

function PerformancePlayer({ scoreId }: { scoreId: string }) {
  const { t } = useI18n();
  const s = t.songs;
  const score = getScore(scoreId)!;
  const steps = useMemo(() => scoreSteps(score), [score]);
  const endBeat = useMemo(() => Math.max(...scoreNotesTimed(score).map((n) => n.start + n.beats)), [score]);
  const playback = useScorePlayback(steps, { beatsPerBar: score.time[0] * (4 / score.time[1]), pickupBeats: 0, endBeat, voice: score.instrument });
  const progress = playback.index === null ? 0 : (playback.index + 1) / steps.length;

  return (
    <div className="rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => (playback.playing ? playback.pause() : void playback.play({ bpm: score.tempo, metronome: false }))}
          aria-label={playback.playing ? s.pause : s.play}
        >
          {playback.playing ? <Pause className="size-4 fill-current" aria-hidden /> : <Play className="size-4 fill-current" aria-hidden />}
          {playback.playing ? s.pause : s.play}
        </Button>
        <Button variant="secondary" onClick={playback.stop} disabled={playback.index === null} aria-label={s.stop}>
          <Square className="size-4" aria-hidden />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{s.performance}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="bg-spectrum h-full transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs text-mist-500">{s.performanceNote}</p>
    </div>
  );
}
