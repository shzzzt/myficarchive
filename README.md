# My Fic Archive (React Native)

A cozy, offline, single-user fanfic reading journal for Android and iOS.
Built with Expo SDK 58 + Expo Router. All data stays on the phone (SQLite).

## Try it on your phone

```sh
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or the Camera app (iOS).

## Install it for real (Android APK)

```sh
npx eas-cli@latest build -p android --profile preview
```

EAS builds in the cloud and gives you an APK link to install. A free Expo account is needed.
For iPhone, keep using Expo Go or build with an Apple developer account (`-p ios`).

## Checks

```sh
npm run typecheck     # TypeScript
npx expo lint         # ESLint
npm test              # spreadsheet import, backup round-trip and EPUB parsing (Node)
```

## Layout

- `src/app/`: screens (Expo Router). `(tabs)/` = Library, Authors, Stats, Backup;
  `fic/[id]` detail, `edit/[id]` add/edit (`new` for a new fic), `author/[name]`
- `src/lib/`: pure logic with no React Native imports: fic model, filters, backup formats,
  `importers/` (.xlsx reader with hyperlinks and fill colors, CSV)
- `src/state/`: SQLite storage, library context, toasts/confirm, drafts (kv-store)
- `src/ui/`: theme tokens (light/dark, color palettes generated from three hues in `theme.tsx`), shared components, sky/lace/cover art

## Reading in the app

On a fic's page, **Upload EPUB or PDF to read here** copies the file into the app
(`<documents>/books/`, or IndexedDB on web), so it works offline even if the original is deleted.

- **EPUB**: the book's own styles are dropped so the settings always apply. **Aa** picks the font
  (Classic = the phone's serif, or the bundled Literata, Lora, EB Garamond, Atkinson Hyperlegible
  and Nunito, each with real italics and bold, in `src/lib/reader-fonts.ts`), line spacing
  (Snug / Cozy / Airy / Roomy presets plus fine-tuning), text size, margins and page color
  (Paper / Sepia / Night). The panel only dims the page lightly so changes show live.
  The list icon opens the contents.
- **PDF**: rendered with pdf.js, bundled in `assets/pdfjs/` (`npm run copy:pdfjs` after
  upgrading `pdfjs-dist`). **Aa** has zoom and page color. PDFs keep their own fonts.
- Tap the page to hide or show the bars. Your place is saved per file and shown on the fic page;
  opening a "Want to Read" fic in the reader marks it "Reading".
- Backups list attached files but don't contain them: after restoring on a new phone, upload
  the files again. Removing a file asks first; a deleted fic's files are cleaned up on the
  next launch, so Undo still works.

## Data safety

- Every save is written to SQLite before the screen updates; failed saves say so.
- Unsaved edits and journal entries are kept as drafts and offered back next time.
- Deleting asks first and offers Undo. Leaving an edited form asks before discarding.
- Back up from the **Backup** tab (JSON or CSV via the share sheet, e.g. to Google Drive).
  Backups from the web version of the app import here too.

## Spreadsheet import rules

- **Template:** Backup tab → **Get the Excel template**, or `assets/templates/my-fic-archive-template.xlsx`.
  It has dropdowns for fic status, reading status, rating and favorite, date checks, header tips
  and a "How to use" tab. Regenerate it with `python scripts/make-template.py` (needs openpyxl).
- Columns are found by header text, in any order: Title, Author (both required), Words, Fic status,
  Reading status, My rating, Favorite, Tags, EPUB link, PDF link, AO3 link, Summary, My thoughts,
  Started, Finished. Common variants work too (e.g. "Writer", "Stars", "Notes", "Date finished").
  With no header row, A = author, B = title, C = words, D = summary.
- Tabs named like "How to use", "Guide" or "Instructions" are ignored.
- Ratings can be 4.5, 4,5 or ★★★★½; dates can be Excel dates or typed like 2026-09-12; tags are
  separated by commas or semicolons; Favorite accepts Yes / ✓ / ♥.
- A hyperlink on the title cell (or a `HYPERLINK()` formula) becomes the file link.
- With no Fic status column, rows with a light-blue fill import as **Ongoing**.
- Blank, header and note rows are skipped, and so are fics already in the library (same title + author).
- Fics without a reading status start as *Want to Read*.
