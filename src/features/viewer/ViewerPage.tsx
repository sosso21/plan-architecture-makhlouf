import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '@/app/Icon';
import { NotFoundPage } from '@/app/NotFoundPage';
import { Toast, useToast } from '@/app/Toast';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import type { RoomInfo } from '@/engine/builders/building';
import { VIEW_LABELS, type ViewerSettings, type ViewId } from '@/engine/types';
import { ArchitectureViewer } from '@/engine/Viewer';
import { pinGuard } from '@/features/auth/pin';
import { findProject } from '@/features/projects/registry';
import { browserStore } from '@/lib/storage';
import { saveBlob } from '@/lib/download';
import { detectQuality, hasWebGL2, type QualityChoice } from './quality';
import { parseSettings, serializeSettings } from './settings';
import { ViewerPanel, type PanelTab } from './ViewerPanel';

type LoadState = { phase: 'loading'; message: string } | { phase: 'ready' } | { phase: 'error'; message: string };

const QUALITY_KEY = 'am:viewer:quality';
const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

function readQuality(): QualityChoice {
  try {
    const v = browserStore().getItem(QUALITY_KEY);
    return v === 'high' || v === 'balanced' || v === 'low' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export function ViewerPage() {
  const { slug } = useParams();
  const project = findProject(slug);
  useDocumentTitle(project ? `${project.title} — maquette 3D` : 'Projet introuvable');
  if (!project) return <NotFoundPage />;
  if (!hasWebGL2()) {
    return (
      <main className="empty-state">
        <h1 className="display" style={{ fontSize: '2rem' }}>WebGL 2 indisponible</h1>
        <p style={{ color: 'var(--muted)', maxWidth: '46ch' }}>
          Ce navigateur ne permet pas d'afficher la maquette 3D. Essayez une version récente de Chrome, Edge, Firefox ou Safari.
        </p>
      </main>
    );
  }
  return <ViewerScreen key={project.slug} slug={project.slug} />;
}

function ViewerScreen({ slug }: { slug: string }) {
  const project = findProject(slug)!;
  const procedural = project.scene.kind === 'procedural';
  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<ArchitectureViewer | null>(null);
  const [load, setLoad] = useState<LoadState>({ phase: 'loading', message: 'Lecture des plans…' });
  const [levels, setLevels] = useState<{ id: string; name: string; shortName: string }[]>([]);
  const [rooms, setRooms] = useState<readonly RoomInfo[]>([]);
  const [settings, setSettings] = useState<ViewerSettings>(() => parseSettings(new URLSearchParams(window.location.search), null));
  const [qualityChoice, setQualityChoice] = useState<QualityChoice>(readQuality);
  const [tab, setTab] = useState<PanelTab>(procedural ? 'niveaux' : 'vues');
  const [collapsed, setCollapsed] = useState(isMobile);
  const [touring, setTouring] = useState(false);
  const [activeRoom, setActiveRoom] = useState<RoomInfo | null>(null);
  const toast = useToast();
  // Lu une seule fois : la synchronisation d'URL réécrit ensuite la query.
  const [initialView] = useState(() => {
    const v = new URLSearchParams(window.location.search).get('vue');
    return v && v in VIEW_LABELS ? (v as ViewId) : null;
  });
  const quality = qualityChoice === 'auto' ? detectQuality() : qualityChoice;
  const authenticated = pinGuard.isAuthenticated();

  const update = useCallback((patch: Partial<ViewerSettings>) => setSettings((s) => ({ ...s, ...patch })), []);

  const showRoom = useCallback(
    (room: RoomInfo) => {
      setActiveRoom(room);
      setSettings((s) => ({ ...s, level: room.levelId, exploded: false, cut: Math.min(s.cut, 2.2) }));
      // La coupe doit être appliquée avant le cadrage : on attend le rendu suivant.
      requestAnimationFrame(() => viewerRef.current?.focusRoom(room));
    },
    [],
  );

  const stopTour = useCallback(() => {
    viewerRef.current?.stopTour();
    setTouring(false);
  }, []);

  // Création / destruction du moteur.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let cancelled = false;
    const viewer = new ArchitectureViewer(stage, quality, {
      onRoomSelect: (room) => {
        stopTour();
        showRoom(room);
      },
      onUserInteract: () => {
        if (viewerRef.current) stopTour();
      },
    });
    viewerRef.current = viewer;
    if (import.meta.env.DEV) (window as unknown as { __viewer?: ArchitectureViewer }).__viewer = viewer;
    setLoad({ phase: 'loading', message: 'Lecture des plans…' });

    const run = async () => {
      if (project.scene.kind === 'procedural') {
        const { building, site } = await project.scene.load();
        if (cancelled) return;
        setLoad({ phase: 'loading', message: 'Construction de la maquette…' });
        // Laisse le navigateur afficher le message avant le calcul.
        await new Promise((r) => setTimeout(r, 30));
        if (cancelled) return;
        viewer.load(building, site);
        setLevels([...viewer.levels]);
        setRooms(viewer.rooms);
        setSettings((s) => parseSettings(serializeSettings(s), viewer.levels.map((l) => l.id)));
        if (initialView) viewer.goTo(initialView, false);
      } else {
        const model = project.models.find((m) => m.file === (project.scene as { file: string }).file);
        if (!model) throw new Error('Fichier 3D introuvable');
        await viewer.loadModel(model.url, (r) => setLoad({ phase: 'loading', message: `Téléchargement du modèle… ${Math.round(r * 100)} %` }));
      }
      if (!cancelled) setLoad({ phase: 'ready' });
    };
    run().catch((e: unknown) => !cancelled && setLoad({ phase: 'error', message: e instanceof Error ? e.message : String(e) }));

    return () => {
      cancelled = true;
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [project, quality, showRoom, stopTour, initialView]);

  // Réglages → moteur.
  useEffect(() => {
    if (load.phase !== 'ready') return;
    if (procedural) viewerRef.current?.apply(settings);
    else viewerRef.current?.setSun(settings.season, settings.hour);
  }, [settings, load.phase, procedural]);

  // Réglages → URL (partageable), sans polluer l'historique.
  useEffect(() => {
    const t = window.setTimeout(() => {
      const query = serializeSettings(settings).toString();
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
    }, 250);
    return () => window.clearTimeout(t);
  }, [settings]);

  useEffect(() => () => viewerRef.current?.stopTour(), []);

  const tourRooms = useMemo(() => rooms.filter((r) => r.tour), [rooms]);

  const toggleTour = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    if (touring) {
      stopTour();
      return;
    }
    setTouring(true);
    if (isMobile()) setCollapsed(true);
    viewer.startTour(tourRooms, (room) => room && showRoom(room));
  };

  const onView = (view: ViewId) => {
    stopTour();
    setActiveRoom(null);
    if (view === 'plan' && settings.level === 'all') update({ level: levels[1]?.id ?? 'all' });
    if (view !== 'plan' && view !== 'aerienne' && settings.level !== 'all') update({ level: 'all' });
    viewerRef.current?.goTo(view);
    if (isMobile()) setCollapsed(true);
  };

  const onTab = (next: PanelTab) => {
    if (next === tab) setCollapsed((c) => !c);
    else {
      setTab(next);
      setCollapsed(false);
    }
  };

  const onQuality = (q: QualityChoice) => {
    try {
      browserStore().setItem(QUALITY_KEY, q);
    } catch {
      /* préférence non persistée */
    }
    setQualityChoice(q);
  };

  const screenshot = async () => {
    try {
      const blob = await viewerRef.current?.screenshot();
      if (blob) saveBlob(blob, `${slug}-${new Date().toISOString().slice(0, 10)}.png`);
    } catch {
      toast.show('Capture impossible sur ce navigateur');
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && isMobile()) await navigator.share({ title: project.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.show('Lien de cette vue copié');
      }
    } catch {
      /* partage annulé */
    }
  };

  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => toast.show('Plein écran indisponible'));
  };

  return (
    <div className="viewer">
      <div className="viewer__stage" ref={stageRef} />

      <div className="viewer__top">
        <div className="viewer__title">
          {authenticated ? (
            <Link className="icon-btn" to={`/projects/${slug}`} aria-label="Retour au dossier du projet">
              <Icon name="back" />
            </Link>
          ) : (
            <span className="icon-btn" aria-hidden style={{ cursor: 'default' }}>
              <Icon name="cube" />
            </span>
          )}
          <div style={{ minWidth: 0 }}>
            <h1>{project.title}</h1>
            <p>
              {project.location} · {project.status}
            </p>
          </div>
        </div>
        <div className="viewer__tools">
          <button type="button" className="icon-btn" data-desktop-only="true" aria-pressed={!collapsed} aria-label="Afficher le panneau de réglages" onClick={() => setCollapsed((c) => !c)}>
            <Icon name="panel" />
          </button>
          <button type="button" className="icon-btn" aria-label="Capture d'écran" onClick={screenshot} disabled={load.phase !== 'ready'}>
            <Icon name="camera" />
          </button>
          <button type="button" className="icon-btn" aria-label="Partager cette vue" onClick={share}>
            <Icon name="share" />
          </button>
          <button type="button" className="icon-btn" data-desktop-only="true" aria-label="Plein écran" onClick={fullscreen}>
            <Icon name="expand" />
          </button>
        </div>
      </div>

      {load.phase === 'ready' && (
        <ViewerPanel
          settings={settings}
          onChange={(patch) => {
            if ('level' in patch) setActiveRoom(null);
            update(patch);
          }}
          levels={levels}
          rooms={rooms}
          activeRoom={activeRoom?.id ?? null}
          onView={onView}
          onRoom={(r) => {
            stopTour();
            showRoom(r);
            if (isMobile()) setCollapsed(true);
          }}
          touring={touring}
          onToggleTour={toggleTour}
          quality={qualityChoice}
          onQuality={onQuality}
          assumptions={project.assumptions}
          procedural={procedural}
          tab={tab}
          onTab={onTab}
          collapsed={collapsed}
        />
      )}

      {touring && (
        <div className="tour-chip" role="status" aria-live="polite">
          <span className="tour-chip__pulse" aria-hidden />
          <span>
            Visite · {activeRoom?.name ?? '…'}
            {activeRoom && <span style={{ color: '#a59d92' }}> — {levels.find((l) => l.id === activeRoom.levelId)?.name}</span>}
          </span>
          <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} aria-label="Arrêter la visite" onClick={stopTour}>
            <Icon name="stop" size={16} />
          </button>
        </div>
      )}

      <div className="viewer__loading" data-done={load.phase === 'ready'} aria-hidden={load.phase === 'ready'}>
        <div className="loader" role="status" aria-live="polite">
          <svg viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
            <path className="draw" d="M10 80V40l50-30 50 30v40H10zM45 80V55h30v25" />
          </svg>
          {load.phase === 'error' ? (
            <>
              <p style={{ color: '#ef7d6b' }}>Impossible d'afficher la maquette : {load.message}</p>
              <button type="button" className="btn btn--sm" onClick={() => window.location.reload()}>
                Réessayer
              </button>
            </>
          ) : (
            <p>{load.phase === 'loading' ? load.message : 'Prêt'}</p>
          )}
        </div>
      </div>
      <Toast state={toast} />
    </div>
  );
}

