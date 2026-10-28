/** Jeu d'icônes linéaires (24 × 24, trait 1,7). */
const PATHS = {
  back: 'M15 5l-7 7 7 7',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6L6 18',
  camera: 'M4 8h3l2-2.5h6L17 8h3v11H4zM12 17a4 4 0 100-8 4 4 0 000 8z',
  share: 'M8 12h8M12 8v-4m0 0L9 7m3-3l3 3M6 11v8h12v-8',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  layers: 'M12 4l8 4-8 4-8-4 8-4zM4 12l8 4 8-4M4 16l8 4 8-4',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4',
  palette: 'M12 3.5a8.5 8.5 0 100 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-1-1.5-1-2.6 0-1 .8-1.7 1.8-1.7h2.2a3.7 3.7 0 003.7-3.7c0-4.1-3.8-7.3-8.5-7.3zM7.5 12.5h.01M9 8h.01M14 7h.01',
  sliders: 'M5 6h14M5 12h14M5 18h14M9 4v4M15 10v4M8 16v4',
  play: 'M8 5.5v13l10.5-6.5z',
  stop: 'M7 7h10v10H7z',
  download: 'M12 4v11m0 0l-4.5-4.5M12 15l4.5-4.5M5 19.5h14',
  file: 'M7 3.5h7l4.5 4.5v12.5h-11.5zM14 3.5V8h4.5',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  lock: 'M6.5 11V8a5.5 5.5 0 0111 0v3M5 11h14v9.5H5z',
  logout: 'M15 4h4.5v16H15M10 8l-4 4 4 4M6 12h10',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  arrow: 'M5 12h14m0 0l-6-6m6 6l-6 6',
  panel: 'M4 5h16v14H4zM9.5 5v14',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, title }: { name: IconName; size?: number; title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  );
}

export function BrandMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="14" fill="#1b1a18" />
      <path d="M14 46V28l18-12 18 12v18" fill="none" stroke="#e8c39e" strokeWidth="4" strokeLinejoin="round" />
      <path d="M26 46V34h12v12" fill="none" stroke="#e8c39e" strokeWidth="4" />
    </svg>
  );
}
