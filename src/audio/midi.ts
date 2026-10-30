import { audioEngine } from "./engine";

export type MidiStatus = "idle" | "requesting" | "connected" | "unsupported" | "denied";

export interface MidiState {
  status: MidiStatus;
  devices: readonly string[];
}

type Listener = () => void;

const NOTE_OFF = 0x80;
const NOTE_ON = 0x90;
const CONTROL_CHANGE = 0xb0;
const ALL_NOTES_OFF = 123;

/**
 * Bridges Web MIDI keyboards into the audio engine. Access is only requested
 * on an explicit user action because browsers show a permission prompt.
 */
class MidiBridge {
  private access: MIDIAccess | null = null;
  private state: MidiState = { status: "idle", devices: [] };
  private listeners = new Set<Listener>();
  private bound = new WeakSet<MIDIInput>();

  getState = (): MidiState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  isSupported(): boolean {
    return typeof navigator !== "undefined" && "requestMIDIAccess" in navigator;
  }

  async connect(): Promise<MidiStatus> {
    if (!this.isSupported()) {
      this.setState({ status: "unsupported", devices: [] });
      return "unsupported";
    }
    if (this.access) return this.state.status;

    this.setState({ ...this.state, status: "requesting" });
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
    } catch {
      this.setState({ status: "denied", devices: [] });
      return "denied";
    }

    this.access.addEventListener("statechange", () => this.syncInputs());
    this.syncInputs();
    return "connected";
  }

  private syncInputs(): void {
    if (!this.access) return;
    const devices: string[] = [];
    this.access.inputs.forEach((input) => {
      if (input.state === "connected") {
        devices.push(input.name ?? "MIDI device");
        if (!this.bound.has(input)) {
          this.bound.add(input);
          input.addEventListener("midimessage", (event) => this.handleMessage(input, event));
        }
      } else {
        // An unplugged device can never send its note-offs.
        audioEngine.releaseSource(`midi:${input.id}`);
      }
    });
    this.setState({ status: "connected", devices });
  }

  private handleMessage(input: MIDIInput, event: MIDIMessageEvent): void {
    const data = event.data;
    if (!data || data.length < 2) return;
    const command = data[0] & 0xf0;
    const note = data[1];
    const velocity = data[2] ?? 0;
    const source = `midi:${input.id}`;

    if (command === NOTE_ON && velocity > 0) {
      audioEngine.noteOn(note, source, velocity / 127);
    } else if (command === NOTE_OFF || (command === NOTE_ON && velocity === 0)) {
      audioEngine.noteOff(note, source);
    } else if (command === CONTROL_CHANGE && note === ALL_NOTES_OFF) {
      audioEngine.releaseSource(source);
    }
  }

  private setState(state: MidiState): void {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}

export const midiBridge = new MidiBridge();
