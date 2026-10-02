"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
export default function SoundToggle() {
  const [on, setOn] = useState(false);
  const [error, setError] = useState("");
  const ctx = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      void ctx.current?.close();
    },
    [],
  );
  async function toggle() {
    if (on) {
      if (timer.current) clearInterval(timer.current);
      await ctx.current?.close();
      ctx.current = null;
      setOn(false);
      return;
    }
    try {
      const audio = new AudioContext();
      ctx.current = audio;
      await audio.resume();
      let beat = 0;
      const play = () => {
        if (audio.state !== "running") return;
        const notes = [
          261.63, 329.63, 392, 293.66, 349.23, 440, 246.94, 329.63,
        ];
        const osc = audio.createOscillator(),
          gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = notes[beat++ % notes.length] / 2;
        gain.gain.setValueAtTime(0, audio.currentTime);
        gain.gain.linearRampToValueAtTime(0.035, audio.currentTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 1.2);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + 1.3);
        if (beat % 12 === 0) {
          const chime = audio.createOscillator(),
            v = audio.createGain();
          chime.type = "triangle";
          chime.frequency.value = 880;
          v.gain.setValueAtTime(0.009, audio.currentTime);
          v.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.12);
          chime.connect(v);
          v.connect(audio.destination);
          chime.start();
          chime.stop(audio.currentTime + 0.15);
        }
      };
      play();
      timer.current = setInterval(play, 650);
      setOn(true);
    } catch {
      setError("Audio tidak tersedia");
    }
  }
  return (
    <button
      onClick={toggle}
      aria-pressed={on}
      title={error || "Melodi ambient sintetis, diputar hanya di browser"}
    >
      {on ? <Volume2 size={18} /> : <VolumeX size={18} />}
      <span>{error || (on ? "Sound on" : "Muted")}</span>
    </button>
  );
}
