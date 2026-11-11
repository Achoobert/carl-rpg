# Dungeon Crawler Carl RPG

![Foundry v14](https://img.shields.io/badge/foundry-v14-green)

An unofficial Foundry VTT system implementing the tabletop RPG rules for
*Dungeon Crawler Carl*.

This is a fan project, not affiliated with or endorsed by Matt Dinniman or
the rulebook's publisher, Renegade Game Studios. Use at your own risk.

## Features

- Full Skill/Spell/Damage Effect/Class/Race compendium content, organized
  into Folders by category
- A homebrew ChangeEntry modifier engine driving Stat/Skill/damage/resource
  bonuses from owned items
- A multi-type damage pipeline (DR -> Resistance/Vulnerability/Immunity ->
  whole-slot Health Bar consumption), including a Shield-style secondary HP
  pool and toggled ongoing spell effects
- Roll flows for Skill Checks, Attacks (with a Damage Effect picker and
  Mana-cost-variant support), Heals, and Evade Checks, each with an
  apply-on-click chat card
- A GM Toolbox for party-wide rests and floor tracking
- RollTables for loot and encounter content
- A rulebook PDF importer for the GM's own copies of the books (see below)

## Importing your rulebooks

This system does not ship any rulebook text or art. If you own the PDFs, the
GM can read them into a world:

1. Open the **Items** sidebar and click **Import Rulebook PDF** (also under
   Configure Settings > Game Settings).
2. Pick a book. It is read in your browser.
3. Check what to import. Pages that look like maps show as thumbnails; uncheck
   any that are art.

What it finds, in any of the books:

- **Gear** ("Gear Slot:" entries) as Items. Simple bullets like "+1 Dexterity",
  "+3 Double Tap Skill" or "Resistance to Fire damage" become modifiers.
- **Spells** as Spell Items.
- **Mob and Boss stat blocks** as Mob Actors, with Health Bar, stats and
  attacks.
- **Achievements** as pages in an Achievements Journal Entry.
- **Maps** as gridless Scenes. Map images are saved to
  `carl-rpg/<book>/maps/` in your Foundry Data folder.

Everything goes into folders named after the book. Importing the same book
again updates those documents instead of making copies.

## Installation

In Foundry's Game Systems tab, install via manifest URL:

```
https://github.com/Achoobert/carl-rpg/releases/latest/download/system.json
```

## Development

```
npm install
npm run build          # compile Sass -> css/carl-rpg.css
npm run build:packs    # compile yml_source/<pack>/*.yml -> the LevelDB packs Foundry reads
npm run unpack:packs   # the reverse - pull in-world compendium edits back into yml_source/
```

`build:packs`/`unpack:packs` need exclusive access to the compiled `packs/`
LevelDB directories, so Foundry must be fully closed while either runs.

To see what the PDF importer pulls out of a book without Foundry:

```
npm run import:pdf -- "path/to/book.pdf"   # writes yml_local/<book>/ (gitignored)
```

Never commit that output, or any book text, to this repo or its compendiums.

See `CHANGELOG.md` for release history.

## License

MIT - see `LICENSE.txt`.
