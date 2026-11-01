import type { BookFile } from './fic';

export function kindFromName(name: string, mime?: string | null): BookFile['kind'] | null {
  const n = name.toLowerCase();
  if (n.endsWith('.epub') || mime === 'application/epub+zip') return 'epub';
  if (n.endsWith('.pdf') || mime === 'application/pdf') return 'pdf';
  return null;
}
