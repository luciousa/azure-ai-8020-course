import type { CourseDoc, DocKind, SidebarGroup } from './types';

const markdownModules = import.meta.glob(
  [
    '../../README.md',
    '../../course-overview.md',
    '../../week-0[1-8]/*.md',
  ],
  { query: '?raw', import: 'default' }
) as Record<string, () => Promise<string>>;

const rootPriority: Record<string, number> = {
  '../../README.md': 0,
  '../../course-overview.md': 1,
};

function extractTitle(body: string, fallback: string): string {
  const titleMatch = body.match(/^#\s+(.+)$/m);
  return titleMatch?.[1]?.trim() ?? fallback;
}

function slugFromPath(path: string): string {
  return path
    .replace('../../', '')
    .replace(/\.md$/i, '')
    .replace(/[\\/]/g, '--')
    .toLowerCase();
}

function inferKind(path: string): DocKind {
  if (!path.includes('/')) return 'root';
  if (path.includes('/module-')) return 'module';
  if (path.includes('/lab-')) return 'lab';
  if (path.includes('/checklist-')) return 'checklist';
  return 'other';
}

function inferWeek(path: string): number | null {
  const weekMatch = path.match(/week-(\d{2})/);
  return weekMatch ? Number(weekMatch[1]) : null;
}

function kindRank(kind: DocKind): number {
  switch (kind) {
    case 'module':
      return 0;
    case 'lab':
      return 1;
    case 'checklist':
      return 2;
    case 'root':
      return 3;
    default:
      return 4;
  }
}

export function headingToId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function extractHeadings(markdown: string): Array<{ level: 2 | 3; text: string; id: string }> {
  const headings: Array<{ level: 2 | 3; text: string; id: string }> = [];
  const regex = /^(##|###)\s+(.+)$/gm;
  let match: RegExpExecArray | null = regex.exec(markdown);
  while (match) {
    const level = match[1] === '##' ? 2 : 3;
    const text = match[2]?.trim() ?? '';
    headings.push({ level, text, id: headingToId(text) });
    match = regex.exec(markdown);
  }
  return headings;
}

export async function loadDocs(): Promise<CourseDoc[]> {
  const entries = Object.entries(markdownModules);
  const loaded = await Promise.all(
    entries.map(async ([modulePath, loader]) => {
      const raw = (await loader()) as string;
      const sourcePath = modulePath.replace('../../', '');
      const pathParts = sourcePath.split('/');
      const filename = pathParts[pathParts.length - 1];
      const fallbackTitle = filename ? filename.replace(/\.md$/i, '') : sourcePath;
      const title = extractTitle(raw, fallbackTitle);
      const kind = inferKind(sourcePath);
      const week = inferWeek(sourcePath);
      return {
        id: slugFromPath(modulePath),
        title,
        kind,
        week,
        sourcePath,
        body: raw,
        searchText: `${title}\n${sourcePath}\n${raw}`.toLowerCase(),
      } satisfies CourseDoc;
    })
  );

  loaded.sort((a, b) => {
    const aIsRoot = a.kind === 'root';
    const bIsRoot = b.kind === 'root';
    if (aIsRoot && bIsRoot) {
      return (rootPriority[`../../${a.sourcePath}`] ?? 99) - (rootPriority[`../../${b.sourcePath}`] ?? 99);
    }
    if (aIsRoot !== bIsRoot) return aIsRoot ? -1 : 1;
    if (a.week !== b.week) return (a.week ?? 99) - (b.week ?? 99);
    if (kindRank(a.kind) !== kindRank(b.kind)) return kindRank(a.kind) - kindRank(b.kind);
    return a.sourcePath.localeCompare(b.sourcePath);
  });

  return loaded;
}

export function buildSidebarGroups(docs: CourseDoc[]): SidebarGroup[] {
  const rootDocs = docs.filter((doc) => doc.kind === 'root');
  const weekMap = new Map<number, CourseDoc[]>();

  for (const doc of docs) {
    if (doc.week === null) continue;
    const existing = weekMap.get(doc.week) ?? [];
    existing.push(doc);
    weekMap.set(doc.week, existing);
  }

  const groups: SidebarGroup[] = [];
  if (rootDocs.length > 0) {
    groups.push({ label: 'Core', docs: rootDocs });
  }

  const orderedWeeks = [...weekMap.keys()].sort((a, b) => a - b);
  for (const week of orderedWeeks) {
    groups.push({
      label: `Week ${String(week).padStart(2, '0')}`,
      docs: weekMap.get(week) ?? [],
    });
  }
  return groups;
}
