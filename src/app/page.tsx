import { GraphTool } from "@/src/components/graph-tool";
import { buildCatalog } from "@/src/lib/graphtool/data";
import brands from "@/public/data/models/index.json";

export default function Home() {
  return <GraphTool catalog={buildCatalog(brands)} />;
}
