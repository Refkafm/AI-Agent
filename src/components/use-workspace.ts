"use client";
import { useEffect, useState, useRef } from "react";
import { initialState, validState, type WorkspaceState } from "@/lib/domain";
const KEY = "astra-workspace-v1";
export function useWorkspace() {
  const [state, setState] = useState<WorkspaceState>(initialState);
  const [ready, setReady] = useState(false);
  const dirty = useRef(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (validState(parsed)) setState(parsed);
        else
          setStorageError(
            "Data lokal tidak valid. Data contoh dimuat; data lama diganti hanya setelah Anda menyimpan perubahan.",
          );
      }
    } catch {
      setStorageError("Penyimpanan browser tidak bisa dibaca.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready || !dirty.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      setStorageError(
        "Perubahan hanya tersimpan selama sesi ini. Penyimpanan browser tidak tersedia; gunakan Ekspor.",
      );
    }
  }, [state, ready]);
  function update(
    change: (s: WorkspaceState) => WorkspaceState,
    message: string,
  ) {
    dirty.current = true;
    setState((s) => ({
      ...change(s),
      activities: [
        {
          id: crypto.randomUUID(),
          text: message,
          at: new Date().toISOString(),
        },
        ...s.activities,
      ].slice(0, 100),
    }));
  }
  return { state, ready, update, storageError };
}
