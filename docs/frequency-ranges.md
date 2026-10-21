# Frequency range presets

`public/data/ranges/index.json` is the single JSON source for the **Range type**
dropdown, range buttons, graph bands and descriptions. It includes **Default**,
**Delta Force** and **CS2**. Game boundaries preserve the supplied TXT data;
games without supplied data are not invented or listed.

The dropdown stays on the right of the range toolbar, after **Air** in Default.
The range buttons can scroll horizontally on narrow screens while the dropdown
stays visible. Selection uses the same MUI menu, right-side Phosphor tick and
animejs/Morphicons chevron as the other dropdowns.

## JSON structure

The file contains an array of presets. For example:

```json
{
  "id": "delta-force",
  "name": "Delta Force",
  "icon": "/icon/Delta Force.png",
  "display": "bands",
  "ranges": [
    {
      "id": "footsteps",
      "name": "Footsteps",
      "from": 150,
      "to": 330,
      "color": "#d97706",
      "description": "The region assigned to the body of footsteps in this preset."
    }
  ]
}
```

- `id`: unique lowercase kebab-case identifier for the preset or range.
- `name`: the displayed dropdown or range-button label.
- `icon`: optional preset logo path in `public/icon`, referenced as `/icon/<file>`.
  Delta Force and CS2 use the supplied PNGs. The menu and selected Range type
  button render them to the left of the preset name at 16×16 without
  changing their original files; missing logos fall back to the Phosphor game icon.
  Default has no logo unless one is configured. Filenames may contain spaces.
- `display`: `highlight` for the original hover/selection guide, or `bands` for
  always-visible colored, hatched graph regions with labels.
- `from` / `to`: numeric Hz boundaries, with `20 <= from < to <= 20000`.
- `description`: required non-empty text for **every range**. Click a range to
  show it in the existing description article; click again to collapse it.
  Descriptions are rendered as text, not HTML.
- `color`: optional six-digit hex color. Bands otherwise use the graph accent.
- `width`: optional percentage for legacy `highlight` layout. Default retains
  the original seven widths and descriptions; game bands use real log-Hz geometry.

Descriptions supplied with this migration are editable explanations of the
provided visual regions, not official or isolated measurements of a game's sounds.

## Behavior

- Changing Range type closes the old description and clears its hover/selection,
  including when the new preset has fewer ranges. Height motion stays animejs-driven.
- Game bands respect the current graph zoom, keep unassigned gaps empty and are
  included in PNG/SVG exports. Default retains the original guide highlight.
- Selecting a range is only a visual guide. It does **not** change EQ bands,
  AutoEQ settings, USB/DAC configuration or measurement curves.
- Add another preset directly to the JSON array; it automatically joins the menu.
  Next.js dev reloads JSON edits; rebuild production to update its bundled presets.
- Invalid IDs, duplicate IDs, missing descriptions, invalid Hz bounds and malformed
  colors fail validation with a field-specific error rather than breaking silently.

The implementation is in `src/lib/graphtool/frequency-ranges.ts`,
`src/components/ui/frequency-guide.tsx` and `frequency-range-overlay.tsx`.
Tests live directly in `tests/frequency-ranges.test.ts` and `frequency-ranges.spec.ts`.
