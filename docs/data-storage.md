# Model and target storage

```text
public/data/
├── models/
│   ├── index.json
│   ├── 7HZ/
│   │   ├── Zero 2 L.txt
│   │   └── Zero 2 R.txt
│   ├── Moondrop/
│   │   ├── Aria L.txt
│   │   └── Aria R.txt
│   ├── Tanchjim/
│   ├── TruthEars/
│   └── _unassigned/
└── targets/
    ├── index.json
    └── Shiori Target.txt
```

## Adding a model

Declare the brand and model in `public/data/models/index.json`:

```json
[
  { "name": "Brand A", "models": ["Example"] },
  { "name": "Brand B", "models": [{ "name": "Example", "file": "Example" }] }
]
```

Place the measurement files at `models/Brand A/Example L.txt`, `models/Brand A/Example R.txt`,
and similarly in `models/Brand B/`. Brand and directory names are case-sensitive.
Models with only one channel are also supported. `file` defaults to `name`; do not include
the `.txt` extension, channel suffix, or directory path.

Variants use a `file` array and optional `suffix` or `prefix` labels, as before:

```json
{ "name": "Example", "file": ["Example Red", "Example Blue"], "suffix": ["Red", "Blue"] }
```

The `+` button for viewing/selecting variants only appears when the `file` array has
at least two items. A single-item array preserves the exact filename/label but does
not have a button to open the list.

Do not declare duplicate model names or reuse measurement files for two models within
the same brand. The same model/file names may be used across different brands; paths,
cache, selection state, colors, and share identifiers all distinguish the brand and
the model/target.

## Adding a target

In `public/data/targets/index.json`, add the name to the `targets` array of the
corresponding group:

```json
{ "type": "Preference", "targets": ["Shiori", "Example"] }
```

Place `Example Target.txt` in `public/data/targets/`. A target may appear in multiple
groups but has only one shared data/state. Targets are not included in the model
directory and do not require a brand directory.

## Share URLs

The new URL format shortens models to `<brand>_<file>` and uses `targets/<file>` for
targets. For example:

```text
?share=targets/Shiori%2520Target,Moondrop_Moca,TruthEars_Zero
```

Legacy links with the full identifiers `models/<brand>/<file>` and `targets/<file>` are
still supported. Simple filename URLs such as `?share=Aria,Shiori_Target` are also
supported when no matching model with a shortened brand identifier is found first and
only one model/target matches the filename. If multiple brands use the same filename,
the ambiguous item is ignored rather than loading the wrong item. Legacy links are
normalized to the new format; mixing formats does not add duplicate models. Internal
cache and identifiers retain the category/brand/file structure as before, and data
paths do not change.
