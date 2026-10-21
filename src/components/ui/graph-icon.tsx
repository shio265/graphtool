"use client";

import type { IconProps } from "@phosphor-icons/react";
import { Check, CheckCircle, Download, Eye, EyeSlash, GameController, Info, Minus, Plus, PushPin, PushPinSlash, ThumbsUp, Upload, UploadSimple, Usb, WarningCircle, WaveSine, X } from "@/src/lib/graphtool/icons";
import { PhosphorMorphIcon } from "./phosphor-morph-icon";

const icons = { remove: X, baseline: Minus, squiggle: WaveSine, hide: Eye, hidden: EyeSlash, pin: PushPin, unpin: PushPinSlash,
  plus: Plus, minus: Minus, thumbsUp: ThumbsUp, upload: UploadSimple, usb: Usb, load: Download, save: Upload, check: Check, success: CheckCircle, game: GameController, warning: WarningCircle, info: Info };

export type GraphIconName = keyof typeof icons;

interface GraphIconProps extends Omit<IconProps, "ref" | "size"> {
  name: GraphIconName;
  small?: boolean;
  size?: number;
  morphTo?: GraphIconName;
  active?: boolean;
}

export function GraphIcon({ name, className = "", small = false, size = small ? 16 : 20, morphTo, active = false, weight = "regular", ...props }: GraphIconProps) {
  const Icon = icons[name];
  const iconClass = `graph-icon pointer-events-none block shrink-0 ${className}`;
  if (morphTo) return <PhosphorMorphIcon {...props} from={Icon} to={icons[morphTo]} active={active} size={size} weight={weight}
    className={iconClass} aria-hidden="true" focusable="false" />;
  return <Icon {...props} size={size} weight={weight} className={iconClass} aria-hidden="true" focusable="false" data-icon-library="phosphor" />;
}
