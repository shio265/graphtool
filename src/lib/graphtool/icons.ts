import type { Icon, IconWeight } from "@phosphor-icons/react";
import { CaretDownIcon as caretDown } from "@phosphor-icons/react/CaretDown";
import { CaretUpIcon as caretUp } from "@phosphor-icons/react/CaretUp";
import { CheckIcon as check } from "@phosphor-icons/react/Check";
import { CheckCircleIcon as success } from "@phosphor-icons/react/CheckCircle";
import { CheckSquareIcon as checkSquare } from "@phosphor-icons/react/CheckSquare";
import { DownloadIcon as load } from "@phosphor-icons/react/Download";
import { EyeIcon as hide } from "@phosphor-icons/react/Eye";
import { EyeSlashIcon as hidden } from "@phosphor-icons/react/EyeSlash";
import { GameControllerIcon as game } from "@phosphor-icons/react/GameController";
import { InfoIcon as info } from "@phosphor-icons/react/Info";
import { MinusIcon as minus } from "@phosphor-icons/react/Minus";
import { PlusIcon as plus } from "@phosphor-icons/react/Plus";
import { PushPinIcon as pin } from "@phosphor-icons/react/PushPin";
import { PushPinSlashIcon as unpin } from "@phosphor-icons/react/PushPinSlash";
import { SquareIcon as square } from "@phosphor-icons/react/Square";
import { ThumbsUpIcon as thumbsUp } from "@phosphor-icons/react/ThumbsUp";
import { UploadIcon as save } from "@phosphor-icons/react/Upload";
import { UploadSimpleIcon as upload } from "@phosphor-icons/react/UploadSimple";
import { UsbIcon as usb } from "@phosphor-icons/react/Usb";
import { WarningCircleIcon as warning } from "@phosphor-icons/react/WarningCircle";
import { WaveSineIcon as squiggle } from "@phosphor-icons/react/WaveSine";
import { XIcon as remove } from "@phosphor-icons/react/X";
import type { IconInput } from "morphicons";
import { svgToIcon } from "morphicons/adapters";
import { preloadRegion } from "morphicons/dom";

// Per-icon entry points keep the rest of Phosphor's catalog out of dev builds.
export const graphIcons = {
  remove, baseline: minus, squiggle, hide, hidden, pin, unpin, plus, minus,
  thumbsUp, upload, usb, load, save, check, success, game, warning, info,
  caretDown, caretUp, square, checkSquare,
};
export type GraphIconName = keyof typeof graphIcons;

interface MorphSource {
  getSnapshot: () => IconInput | undefined;
  subscribe: (listener: () => void) => () => void;
  prepare: (markup: string) => Promise<void>;
}

const sources = new WeakMap<Icon, Map<IconWeight, MorphSource>>();
let regionReady: Promise<unknown> | undefined;

export function getMorphSource(icon: Icon, weight: IconWeight): MorphSource {
  const weights = sources.get(icon) ?? new Map<IconWeight, MorphSource>();
  const cached = weights.get(weight);
  if (cached) return cached;

  let data: IconInput | undefined;
  let pending: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const source: MorphSource = {
    getSnapshot: () => data,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    prepare: (markup) => {
      if (data) return Promise.resolve();
      if (pending) return pending;
      const parsed = svgToIcon(markup);
      regionReady ??= preloadRegion().catch(() => undefined);
      pending = regionReady.then(() => {
        data = parsed;
        listeners.forEach((listener) => listener());
      });
      return pending;
    },
  };
  weights.set(weight, source);
  sources.set(icon, weights);
  return source;
}
