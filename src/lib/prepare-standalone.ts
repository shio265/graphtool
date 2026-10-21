import { access, cp } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Next traces server dependencies, but static/browser assets need copying. */
export async function prepareStandalone(projectDir: string): Promise<string> {
  const root = resolve(projectDir);
  const standalone = join(root, ".next", "standalone");
  const assets = [
    { source: join(root, "public"), destination: join(standalone, "public") },
    { source: join(root, ".next", "static"), destination: join(standalone, ".next", "static") },
  ];

  // Fail before copying anything if this is not a complete standalone build.
  await access(join(standalone, "server.js")).catch((cause: unknown) => {
    throw new Error("Standalone server is missing. Run next build with output: standalone first.", { cause });
  });
  await Promise.all(assets.map(({ source }) => access(source)));
  await Promise.all(assets.map(({ source, destination }) => cp(source, destination, { recursive: true, force: true })));
  return standalone;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await prepareStandalone(fileURLToPath(new URL("../../", import.meta.url)));
    console.info("Copied standalone assets successfully.");
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
