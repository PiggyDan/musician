"use client";

import { Cable, Keyboard, Minus, Plus, Volume1, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { audioEngine, type AudioStatus } from "@/audio/engine";
import { useAudioStatus, useMidiState } from "@/audio/hooks";
import { midiBridge } from "@/audio/midi";
import { useElementWidth } from "@/hooks/use-element-width";
import { format } from "@/i18n";
import { useI18n } from "@/i18n/use-i18n";
import { cn } from "@/lib/cn";
import { MIDI_MAX, offsetWhiteKeys } from "@/lib/music/notes";
import { useSettingsStore } from "@/store/settings";
import { PageHeader } from "@/components/learn/page-header";
import { AudioHint } from "@/components/ui/audio-hint";
import { NoteReadout } from "@/components/piano/note-readout";
import { PianoKeyboard } from "@/components/piano/piano-keyboard";
import { useComputerKeyboard } from "@/components/piano/use-computer-keyboard";

const MIN_WHITE_KEY_PX = 30;
const MAX_WHITE_KEYS = 29; // four octaves + top C
const MIN_OCTAVE = 1;
const MAX_OCTAVE = 6;

export function PianoStudio() {
  const { t } = useI18n();
  const volume = useSettingsStore((s) => s.volume);
  const setVolume = useSettingsStore((s) => s.setVolume);
  const showNoteNames = useSettingsStore((s) => s.showNoteNames);
  const setShowNoteNames = useSettingsStore((s) => s.setShowNoteNames);
  const showKeyHints = useSettingsStore((s) => s.showKeyHints);
  const setShowKeyHints = useSettingsStore((s) => s.setShowKeyHints);
  const audioStatus = useAudioStatus();

  /** The octave the computer keyboard's "A" key plays. */
  const [octave, setOctave] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(containerRef, 1100);

  const whiteKeyCount = Math.min(MAX_WHITE_KEYS, Math.max(8, Math.floor(width / MIN_WHITE_KEY_PX)));
  const octavesShown = Math.floor(whiteKeyCount / 7);
  const baseMidi = (octave + 1) * 12;
  // With room for 3+ octaves, show one octave below the playing octave too.
  // Stay within a real 88-key piano: no lower than C1, no higher than C8.
  let startMidi = Math.max(24, octavesShown >= 3 ? baseMidi - 12 : baseMidi);
  while (startMidi > 24 && offsetWhiteKeys(startMidi, whiteKeyCount - 1) > MIDI_MAX) startMidi -= 12;

  const shiftOctave = (direction: -1 | 1) => {
    setOctave((value) => Math.min(MAX_OCTAVE, Math.max(MIN_OCTAVE, value + direction)));
  };

  useComputerKeyboard({ baseMidi, onOctaveShift: shiftOctave });
  useEffect(() => audioEngine.preload(), []);

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="mx-auto max-w-7xl px-4 pt-32 pb-12 sm:px-6">
      <PageHeader eyebrow={t.studio.eyebrow} title={t.studio.title} subtitle={t.studio.subtitle}>
        <AudioStatusPill status={audioStatus} />
      </PageHeader>

      {/* Controls */}
      <div className="glass mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-3xl px-4 py-4 sm:px-6">
        <label className="flex min-w-52 flex-1 items-center gap-3 sm:max-w-72">
          <VolumeIcon className="size-5 shrink-0 text-mist-200" aria-hidden />
          <span className="sr-only">{t.studio.volume}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            onChange={(event) => setVolume(Number(event.target.value) / 100)}
            className="h-1.5 flex-1 cursor-pointer accent-[#8b7bff]"
            aria-valuetext={`${Math.round(volume * 100)}%`}
          />
          <span className="w-9 text-right font-mono text-xs text-mist-400">{Math.round(volume * 100)}</span>
        </label>

        <div className="flex items-center gap-2" role="group" aria-label={t.studio.octave}>
          <span className="text-sm text-mist-400">{t.studio.octave}</span>
          <IconButton label={t.studio.octaveDown} onClick={() => shiftOctave(-1)} disabled={octave <= MIN_OCTAVE}>
            <Minus className="size-4" />
          </IconButton>
          <output className="w-10 text-center font-mono text-sm" aria-live="polite">
            C{octave}
          </output>
          <IconButton label={t.studio.octaveUp} onClick={() => shiftOctave(1)} disabled={octave >= MAX_OCTAVE}>
            <Plus className="size-4" />
          </IconButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Toggle pressed={showNoteNames} onChange={setShowNoteNames}>
            {t.studio.noteNames}
          </Toggle>
          <Toggle pressed={showKeyHints} onChange={setShowKeyHints} className="max-md:hidden">
            {t.studio.keyHints}
          </Toggle>
        </div>

        <MidiControl />
      </div>

      {/* Instrument */}
      <div ref={containerRef} className="relative mt-8">
        <div aria-hidden className="absolute inset-x-0 -top-12 -bottom-12 -z-10 bg-[radial-gradient(50%_60%_at_50%_60%,rgba(106,85,255,0.2),transparent_70%)]" />
        <PianoKeyboard
          startMidi={startMidi}
          whiteKeyCount={whiteKeyCount}
          showNoteNames={showNoteNames}
          keyHintBase={showKeyHints ? baseMidi : null}
          size="lg"
        />
      </div>

      <AudioHint className="mt-4" iosOnly />

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
        <NoteReadout />
        <aside className="glass hidden rounded-3xl px-5 py-4 md:block" aria-labelledby="kbd-help">
          <p id="kbd-help" className="flex items-center gap-2 text-sm font-medium">
            <Keyboard className="size-4 text-ion" aria-hidden />
            {t.studio.help.title}
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-mist-400">
            <li>{t.studio.help.whiteKeys}</li>
            <li>{t.studio.help.blackKeys}</li>
            <li>{t.studio.help.octave}</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}

function AudioStatusPill({ status }: { status: AudioStatus }) {
  const { t } = useI18n();
  const tone =
    status === "ready" ? "success" : status === "error" || status === "unsupported" ? "warn" : "idle";
  return (
    <p
      role="status"
      className={cn(
        "inline-flex max-w-sm items-center gap-2 rounded-full px-3 py-1.5 text-xs ring-1",
        tone === "success" && "bg-success/10 text-success ring-success/30",
        tone === "warn" && "bg-warn/10 text-warn ring-warn/30",
        tone === "idle" && "bg-white/[0.04] text-mist-400 ring-white/10",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          tone === "success" && "bg-success",
          tone === "warn" && "bg-warn",
          tone === "idle" && "animate-pulse bg-mist-400",
        )}
      />
      {t.audio[status]}
    </p>
  );
}

function MidiControl() {
  const { t } = useI18n();
  const midi = useMidiState();

  if (midi.status === "connected") {
    return (
      <p className="inline-flex max-w-xs items-center gap-2 truncate text-sm text-mist-200">
        <Cable className="size-4 shrink-0 text-success" aria-hidden />
        <span className="truncate">
          {midi.devices.length > 0
            ? format(t.studio.midi.connected, { devices: midi.devices.join(", ") })
            : t.studio.midi.noDevices}
        </span>
      </p>
    );
  }
  if (midi.status === "unsupported" || midi.status === "denied") {
    return (
      <p className="max-w-xs text-xs text-warn">
        {midi.status === "unsupported" ? t.studio.midi.unsupported : t.studio.midi.denied}
      </p>
    );
  }
  return (
    <button
      type="button"
      onClick={() => void midiBridge.connect()}
      disabled={midi.status === "requesting"}
      className="inline-flex h-9 items-center gap-2 rounded-full bg-white/[0.05] px-4 text-sm text-mist-200 ring-1 ring-white/10 transition-colors hover:bg-white/[0.09] disabled:opacity-60 lg:ml-auto"
    >
      <Cable className="size-4" aria-hidden />
      {midi.status === "requesting" ? t.studio.midi.requesting : t.studio.midi.connect}
    </button>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex size-9 items-center justify-center rounded-full bg-white/[0.05] text-mist-200 ring-1 ring-white/10 transition-colors hover:bg-white/[0.1] disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function Toggle({
  pressed,
  onChange,
  children,
  className,
}: {
  pressed: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm ring-1 transition-colors",
        pressed ? "bg-pulse/15 text-mist-50 ring-pulse/40" : "bg-white/[0.03] text-mist-400 ring-white/10 hover:text-mist-200",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-2 rounded-full transition-colors", pressed ? "bg-ion shadow-[0_0_8px_#2fd8ee]" : "bg-mist-500")}
      />
      {children}
    </button>
  );
}
