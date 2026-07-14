export type DocKind = 'root' | 'module' | 'lab' | 'checklist' | 'other';

export interface CourseDoc {
  id: string;
  title: string;
  kind: DocKind;
  week: number | null;
  sourcePath: string;
  body: string;
  searchText: string;
}

export interface SidebarGroup {
  label: string;
  docs: CourseDoc[];
}
