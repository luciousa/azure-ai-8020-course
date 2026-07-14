# web

Vite + React + TypeScript documentation web app for this course repository.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Content sources (MVP)

The app indexes these markdown sources at build/dev time:

- `../README.md`
- `../course-overview.md`
- `../week-01` through `../week-08` (`module-*`, `lab-*`, `checklist-*`)

## Navigation model

- Core docs group (`README`, `course-overview`)
- Week-grouped sidebar sections
- Per-document reader route (`/doc/:docId`)
- Settings route (`/settings`) for theme + font + font-size preferences (saved in localStorage)

## Add more content later

To expand coverage to `resources/`, `capstone/`, or `templates/`, update the markdown glob patterns in `src/content.ts` and adjust grouping logic in `buildSidebarGroups`.
