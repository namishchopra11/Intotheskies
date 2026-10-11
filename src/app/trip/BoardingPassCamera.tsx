"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "@/components/ui";

export function BoardingPassCamera({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const active = useRef(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | undefined;
    active.current = true;
    const open = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("unavailable");
        const result = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) {
          result.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = result;
        if (video.current) video.current.srcObject = result;
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Camera access was blocked. Allow it in your browser, or choose a photo instead."
          : "Couldn't open the camera. You can choose a photo instead.");
      }
    };
    void open();
    return () => {
      cancelled = true;
      active.current = false;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const capture = () => {
    const source = video.current;
    if (!source || !source.videoWidth || !source.videoHeight || capturing) return;
    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = source.videoWidth;
    canvas.height = source.videoHeight;
    canvas.getContext("2d")?.drawImage(source, 0, 0);
    canvas.toBlob((blob) => {
      if (!active.current) return;
      if (!blob) {
        setError("Couldn't take that photo. Try again.");
        setCapturing(false);
        return;
      }
      onCapture(new File([blob], `boarding-pass-${Date.now()}.jpg`, { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };

  return (
    <div className="flex flex-col gap-4 pt-1">
      <p className="text-ink-2">Keep the whole boarding pass in view, with the text clear and readable.</p>
      <div className="relative overflow-hidden rounded-card bg-sunk">
        <video ref={video} autoPlay playsInline muted onLoadedData={() => setReady(true)}
          aria-label="Boarding pass camera preview" className="aspect-[4/3] w-full object-contain" />
        {!ready && !error && <p role="status" className="absolute inset-0 flex items-center justify-center text-ink-2">Opening camera…</p>}
      </div>
      {error && <p role="alert" className="text-[14px] text-bad-fg">{error}</p>}
      <Button variant="primary" block icon="camera" disabled={!ready || capturing} onClick={capture}>
        {capturing ? "Saving photo…" : "Take photo"}
      </Button>
      <Button variant="secondary" block onClick={onClose}>Back to files</Button>
      <p className="flex items-start gap-2 text-[13px] text-ink-2"><Icon name="lock" size={16} />Taking a photo only selects it. Tap “Read it” to import.</p>
    </div>
  );
}
