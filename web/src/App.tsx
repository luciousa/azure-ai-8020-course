import { useEffect, useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { buildSidebarGroups, extractHeadings, headingToId, loadDocs } from './content';
import type { CourseDoc } from './types';

type ThemeName = 'dark-academia' | 'kindle' | 'google-books';
type FontName = 'literata' | 'merriweather' | 'source-sans';
type FontSizeName = 'compact' | 'comfortable' | 'large';

interface ReaderSettings {
  theme: ThemeName;
  font: FontName;
  fontSize: FontSizeName;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'kindle',
  font: 'literata',
  fontSize: 'comfortable',
};

const THEME_CHOICES: Array<{ value: ThemeName; title: string; description: string }> = [
  {
    value: 'kindle',
    title: 'Kindle Paper',
    description: 'Warm paper background, soft contrast, and distraction-free reading.',
  },
  {
    value: 'google-books',
    title: 'Google Books Daylight',
    description: 'Neutral bright canvas with crisp typography for dense study sessions.',
  },
  {
    value: 'dark-academia',
    title: 'Dark Academia',
    description: 'Textured nocturnal reading mode with editorial contrast.',
  },
];

const FONT_CHOICES: Array<{ value: FontName; title: string; description: string }> = [
  {
    value: 'literata',
    title: 'Literata',
    description: 'Bookish serif tuned for long reading spans.',
  },
  {
    value: 'merriweather',
    title: 'Merriweather',
    description: 'Sturdy serif with stronger rhythm for headings and body.',
  },
  {
    value: 'source-sans',
    title: 'Source Sans 3',
    description: 'Clean sans option for faster scanning and modern textbook feel.',
  },
];

const FONT_SIZE_CHOICES: Array<{ value: FontSizeName; title: string; description: string }> = [
  {
    value: 'compact',
    title: 'Compact',
    description: 'Smaller text for denser information per screen.',
  },
  {
    value: 'comfortable',
    title: 'Comfortable',
    description: 'Balanced default for long study sessions.',
  },
  {
    value: 'large',
    title: 'Large',
    description: 'Bigger text for easier readability and presentation mode.',
  },
];

function useDocs() {
  const [docs, setDocs] = useState<CourseDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadDocs()
      .then((loaded) => {
        if (active) {
          setDocs(loaded);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { docs, loading };
}

function useReaderSettings() {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    try {
      const stored = localStorage.getItem('reader-settings');
      if (!stored) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(stored) as Partial<ReaderSettings>;
      const theme = parsed.theme ?? DEFAULT_SETTINGS.theme;
      const font = parsed.font ?? DEFAULT_SETTINGS.font;
      const fontSize = parsed.fontSize ?? DEFAULT_SETTINGS.fontSize;
      return {
        theme: THEME_CHOICES.some((t) => t.value === theme) ? theme : DEFAULT_SETTINGS.theme,
        font: FONT_CHOICES.some((f) => f.value === font) ? font : DEFAULT_SETTINGS.font,
        fontSize: FONT_SIZE_CHOICES.some((f) => f.value === fontSize) ? fontSize : DEFAULT_SETTINGS.fontSize,
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    localStorage.setItem('reader-settings', JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-font', settings.font);
    document.documentElement.setAttribute('data-font-size', settings.fontSize);
  }, [settings]);

  return { settings, setSettings };
}

function Sidebar({
  docs,
  query,
  setQuery,
  mobileOpen,
  setMobileOpen,
}: {
  docs: CourseDoc[];
  query: string;
  setQuery: (v: string) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}) {
  const filtered = useMemo(() => {
    if (!query.trim()) return docs;
    return docs.filter((doc) => doc.searchText.includes(query.toLowerCase().trim()));
  }, [docs, query]);

  const groups = useMemo(() => buildSidebarGroups(filtered), [filtered]);

  return (
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <p className="kicker">Course Atlas</p>
        <h1>Azure AI 80/20</h1>
        <div className="quick-links">
          <NavLink to="/" end onClick={() => setMobileOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/settings" onClick={() => setMobileOpen(false)}>
            Reader settings
          </NavLink>
        </div>
      </div>
      <label className="search-wrap">
        <span>Search documents</span>
        <input
          type="search"
          placeholder="Week, lab, module, FERPA..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <nav className="sidebar-nav">
        {groups.map((group) => (
          <section key={group.label} className="group">
            <h2>{group.label}</h2>
            <ul>
              {group.docs.map((doc) => (
                <li key={doc.id}>
                  <NavLink
                    to={`/doc/${doc.id}`}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={() => setMobileOpen(false)}
                  >
                    <span className="doc-title">{doc.title}</span>
                    <span className="doc-meta">{doc.sourcePath}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      <button className="mobile-close" onClick={() => setMobileOpen(false)}>
        Close
      </button>
    </aside>
  );
}

function SettingsPage({
  settings,
  setSettings,
}: {
  settings: ReaderSettings;
  setSettings: (updater: (prev: ReaderSettings) => ReaderSettings) => void;
}) {
  return (
    <main className="reader settings-page">
      <header className="doc-header">
        <p className="kicker">Personalize reading</p>
        <h2>Reader settings</h2>
        <p className="settings-intro">
          Switch between Kindle-like and Google Books-inspired themes, and pick your preferred reading font.
        </p>
        <p className="settings-current">
          Current size: <strong>{FONT_SIZE_CHOICES.find((s) => s.value === settings.fontSize)?.title}</strong>
        </p>
      </header>

      <section className="settings-grid">
        <article className="settings-panel">
          <h3>Theme</h3>
          <div className="option-list">
            {THEME_CHOICES.map((theme) => (
              <label key={theme.value} className="option-card">
                <input
                  type="radio"
                  name="theme"
                  checked={settings.theme === theme.value}
                  onChange={() => setSettings((prev) => ({ ...prev, theme: theme.value }))}
                />
                <span className="option-title">{theme.title}</span>
                <span className="option-description">{theme.description}</span>
              </label>
            ))}
          </div>
        </article>

        <article className="settings-panel">
          <h3>Font</h3>
          <div className="option-list">
            {FONT_CHOICES.map((font) => (
              <label key={font.value} className="option-card">
                <input
                  type="radio"
                  name="font"
                  checked={settings.font === font.value}
                  onChange={() => setSettings((prev) => ({ ...prev, font: font.value }))}
                />
                <span className="option-title">{font.title}</span>
                <span className="option-description">{font.description}</span>
              </label>
            ))}
          </div>
        </article>

        <article className="settings-panel">
          <h3>Font size</h3>
          <div className="option-list">
            {FONT_SIZE_CHOICES.map((size) => (
              <label key={size.value} className="option-card">
                <input
                  type="radio"
                  name="font-size"
                  checked={settings.fontSize === size.value}
                  onChange={() => setSettings((prev) => ({ ...prev, fontSize: size.value }))}
                />
                <span className="option-title">{size.title}</span>
                <span className="option-description">{size.description}</span>
              </label>
            ))}
          </div>
        </article>
      </section>

      <section className="settings-preview">
        <h3>Live preview</h3>
        <p>
          Education analytics works best when people can read deeply: attendance trends, assessment summaries, and
          intervention context all become more useful when typography and contrast fit the reader.
        </p>
      </section>
    </main>
  );
}

function Home({ docs }: { docs: CourseDoc[] }) {
  const weekCount = new Set(docs.map((d) => d.week).filter((w): w is number => w !== null)).size;
  return (
    <main className="reader home">
      <header className="hero">
        <p className="kicker">Documentation experience</p>
        <h2>A modern reading interface for the Azure AI 80/20 course</h2>
        <p>
          This app composes core course documents into a structured atlas with sidebar navigation, quick search,
          and long-form reading ergonomics.
        </p>
        <div className="hero-stats">
          <div>
            <strong>{docs.length}</strong>
            <span>Documents indexed</span>
          </div>
          <div>
            <strong>{weekCount}</strong>
            <span>Weeks grouped</span>
          </div>
        </div>
      </header>
      <section className="next-steps">
        <h3>Start reading</h3>
        <p>Choose a document from the left sidebar. For quickest orientation, start with README and course overview.</p>
        <div className="chip-row">
          {docs.slice(0, 4).map((doc) => (
            <Link key={doc.id} to={`/doc/${doc.id}`} className="chip">
              {doc.title}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function Reader({ docs }: { docs: CourseDoc[] }) {
  const { docId } = useParams();
  const index = docs.findIndex((d) => d.id === docId);
  const doc = index >= 0 ? docs[index] : null;

  if (!doc) {
    return (
      <main className="reader not-found">
        <h2>Document not found</h2>
        <p>The selected document is missing from the current content index.</p>
      </main>
    );
  }

  const headings = extractHeadings(doc.body);
  const prev = index > 0 ? docs[index - 1] : null;
  const next = index < docs.length - 1 ? docs[index + 1] : null;

  const markdownComponents: Components = {
    h2: ({ children }) => {
      const text = String(children);
      return <h2 id={headingToId(text)}>{children}</h2>;
    },
    h3: ({ children }) => {
      const text = String(children);
      return <h3 id={headingToId(text)}>{children}</h3>;
    },
  };

  return (
    <main className="reader">
      <header className="doc-header">
        <p className="kicker">{doc.sourcePath}</p>
        <h2>{doc.title}</h2>
      </header>

      <div className="doc-layout">
        <article className="markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {doc.body}
          </ReactMarkdown>
        </article>

        {headings.length > 0 ? (
          <aside className="toc">
            <h3>On this page</h3>
            <ul>
              {headings.map((h) => (
                <li key={h.id} className={h.level === 3 ? 'sub' : ''}>
                  <a href={`#${h.id}`}>{h.text}</a>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>

      <footer className="doc-footer">
        {prev ? (
          <Link to={`/doc/${prev.id}`} className="nav-card">
            <span>Previous</span>
            <strong>{prev.title}</strong>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/doc/${next.id}`} className="nav-card right">
            <span>Next</span>
            <strong>{next.title}</strong>
          </Link>
        ) : (
          <span />
        )}
      </footer>
    </main>
  );
}

export default function App() {
  const { docs, loading } = useDocs();
  const { settings, setSettings } = useReaderSettings();
  const [query, setQuery] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="shell loading">
        <p>Indexing course documents…</p>
      </div>
    );
  }

  return (
    <div className="shell">
      <button className="mobile-open" onClick={() => setMobileOpen(true)}>
        Open navigation
      </button>
      <Sidebar docs={docs} query={query} setQuery={setQuery} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <Routes>
        <Route path="/" element={<Home docs={docs} />} />
        <Route path="/doc/:docId" element={<Reader docs={docs} />} />
        <Route path="/settings" element={<SettingsPage settings={settings} setSettings={setSettings} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
