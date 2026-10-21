"use client";

import { targetGroups, targetModels } from "@/src/lib/graphtool/targets";
import { sameModel } from "@/src/lib/graphtool/model-identity";
import type { GraphToolController } from "@/src/lib/graphtool/use-graph-tool";
import { Button } from "./button";

export function TargetSelector({ tool }: { tool: GraphToolController }) {
  return <div className="targets collapseTools box-border flex max-h-17 shrink-0 items-start overflow-x-auto overflow-y-hidden p-4">{targetGroups.map((group, index) => <div className={`targetClass flex flex-[auto_0_0] ${index ? "ml-4 border-l border-(--background-color-contrast-more) px-4" : ""}`} key={group.type}>
    <div className="targetLabel mr-2.5 flex items-center font-mono text-[11px] leading-none text-(--background-color-contrast-more) uppercase after:whitespace-pre after:content-['_targets:']"><span>{group.type}</span></div>
    {group.targets.map((name) => {
      const model = targetModels.find((entry) => entry.name === name)!;
       const selected = tool.active.some((entry) => sameModel(entry, model));
      return <Button key={name} className={`target [&+.target]:ml-1.5 ${selected ? "active" : ""}`} aria-pressed={selected}
        onClick={(event) => { void tool.choose(model, !event.ctrlKey && !event.metaKey); }}
        onAuxClick={(event) => { if (event.button === 1) { event.preventDefault(); void tool.choose(model, false); } }}>{name}</Button>;
    })}
  </div>)}</div>;
}
