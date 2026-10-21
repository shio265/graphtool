# Shiori Graph Tool (CrinGraph)

My graph tool based on [CrinGraph](https://github.com/mlochbaum/CrinGraph).

This version uses Next.js, React, TypeScript and Material UI, with visx for
graph curves, axes, grids, scales and interactions, and animejs for motion,
while preserving the original graphing workflow.

UI icons use `@phosphor-icons/react`; Morphicons handles changing shapes with
animejs-driven motion, without handwritten icon SVG paths.
DOM fades and slides use animejs WAAPI; graph and icon morphing keep its JS engine.

## The In-Ear Graphing Library

If you're not weirdly obsessed with headphones you can leave at any time.

Crinacle is a reviewer famous around the world (at least, I'm on the
opposite side of it as he is) for his extensive reviews and measurements
of in-ear monitors (IEMs). CrinGraph is the tool which allows readers to
compare measurements against each other, and save easily readable images
to share around the internet. Although it was designed for
[Crin's site](https://crinacle.com/graphs/graphtool/),
the code here can be used freely by anyone under the terms of the
[original license](LICENSE).
There are now many instances, including
[Banbeucmas](https://banbeu.com/graph/tool/),
[HypetheSonics](https://www.hypethesonics.com/iemdbc/),
[Rohsa](https://rohsa.gitlab.io/graphtool/), and
[Super\* Review](https://squig.link/), which has links to even more of
them. If you're interested in using it for your own graphs, see
[Self-host](#self-host) and [Configuration and data](#configuration-and-data).

### What are the squiggles?

If you want the whole story, there's no choice but to get it from
[the man himself](https://crinacle.com/2020/04/08/graphs-101-how-to-read-headphone-measurements/).
5,000 words and you'll still be disappointed when it's over.

The most informative headphone measurement, and the only one handled by
this tool, is the frequency response (FR) graph. An FR graph shows how
loud the headphone will render sounds at different pitches. The higher
the left portion of the graph, the more your brain will rattle; the
higher the right portion of the graph, the more your ears will bleed.
The current industry standard is a "V-shaped" response which applies
both conditions at once. Using an FR graph you may easily see which
headphones conform to this standard and which are insufficiently "fun".

### Sample graphs

[View the original CrinGraph sample graphs.](https://mlochbaum.github.io/CrinGraph/graph.html)

The upstream demo uses synthesized response curves, not real headphones.
Those sample curves are separate from the headphone measurements and target
files included in this fork. To view this fork's data, run the application
locally and select a model or target.

## Self-host

Use Bun to install dependencies and start the development server:

The HID SDK is hosted on GitHub Packages. For a fresh install, configure the
`@shio265` registry and a local token with `read:packages` as described in the
[device EQ guide](docs/device-eq.md#installing-the-sdk). Never expose this token in
client-side environment variables.

```bash
bun install
bun run dev
```

Open [localhost:3000](http://localhost:3000).

For a production build:

```bash
bun run build
bun run start:standalone
```

Set `NEXT_PUBLIC_SITE_URL` to the public website URL before building for deployment
(for example, `https://graphs.example.com`). `/sitemap.xml` lists the homepage,
not `?share=` graph selections. The local default is `http://localhost:3000`;
rebuild when changing the public URL because the sitemap is generated at build time.

The build prepares a self-contained `.next/standalone` folder, including `public`
(measurements, icons and fonts) and `.next/static` (CSS, browser JS and workers).
Next.js does not copy these asset folders into standalone output by default.
If you already ran `next build` directly, run `bun run prepare:standalone` once.

Deploy the **entire** `.next/standalone` folder, including its hidden `.next`
subfolder. From inside the deployed folder, run `bun server.js` or `node server.js`
(Node.js 22+); no dependency install is needed. Set `PORT` and `HOSTNAME` environment
variables to change the listening address. Do not use `next start` for this bundle.

Browser tab icons use Next.js file-based metadata in `src/app/favicon.ico` and
`src/app/icon.png`; `src/app/apple-icon.png` provides the Apple touch icon. They are
included as routes in the standalone build. The PNG icon URLs include content
hashes to avoid reusing previously cached icons.

Unlike the original static tool, this version requires a Next.js build/server;
opening an HTML file or publishing the source directly to GitHub Pages is not sufficient.

## Configuration and data

General graph and EQ settings are in `src/lib/graphtool/config.ts`.
Frequency guide presets and their per-range descriptions are JSON data in
`public/data/ranges/index.json`; see the [frequency range guide](docs/frequency-ranges.md).
Model measurements and targets are stored separately:

```text
public/data/models/index.json       # Model catalog, grouped by brand
public/data/models/<brand>/         # <name> L.txt and <name> R.txt
public/data/targets/index.json      # Target groups
public/data/targets/                # <name> Target.txt
```

Brand folder names must match the catalog. Models in different brands can have
the same name without sharing measurements or selection state. See the
[data storage guide](docs/data-storage.md) for aliases, variants and target configuration.

## Testing

All tests live directly in `tests/`: unit tests use `*.test.ts`, while Playwright
end-to-end tests use `*.spec.ts`. Each runner only collects its own test files.

```bash
bun run typecheck
bun run lint
bun run test
```

End-to-end tests use Playwright and require **Node.js 22+** in PATH:

```bash
bunx playwright install chromium
bun run test:e2e
```

Playwright reuses a server at port 3000 if one is running, or starts a development server.

## Credits

Based on CrinGraph by Marshall Lochbaum. The original license is preserved in
[LICENSE](LICENSE).
