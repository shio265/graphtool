"use client";

import { BackdropDialog } from "./backdrop-dialog";

const instructions = [
  "To AutoEQ model A to B, display A and B and remove targets.",
  "Adding or removing bands before AutoEQ may give better results.",
  "Avoid PK filters beyond 15kHz unless you know how your DSP works.",
  "EQing treble requires peak matching and fine-tuning by ear.",
  "Use the Tone Generator at a low listening volume to find peaks and dips.",
];

export function EqualizerGuide({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <BackdropDialog open={open} title="Equalizer Guide" onClose={onClose} wide className="equalizer-guide-dialog">
    <ol className="m-0 space-y-3 pl-5">{instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol>
  </BackdropDialog>;
}
