import { useId, type ReactNode } from 'react';
import { Icon, type IconName } from '@/app/Icon';
import type { RoomInfo } from '@/engine/builders/building';
import { formatHour, SEASON_LABEL, type Season } from '@/engine/environment/solar';
import { FACADE_PALETTES, FRAME_COLORS, findFacade, findInterior, INTERIOR_STYLES } from '@/engine/materials/palettes';
import { LAYER_LABELS, VIEW_LABELS, type LayerId, type ViewerSettings, type ViewId } from '@/engine/types';
import { QUALITY_LABELS, type QualityChoice } from './quality';
import { CUT_MAX, CUT_MIN, HOUR_MAX, HOUR_MIN } from './settings';

export type PanelTab = 'niveaux' | 'vues' | 'soleil' | 'couleurs' | 'affichage';

const TABS: { id: PanelTab; label: string; icon: IconName; procedural?: boolean }[] = [
  { id: 'niveaux', label: 'Niveaux', icon: 'layers', procedural: true },
  { id: 'vues', label: 'Vues', icon: 'eye' },
  { id: 'soleil', label: 'Soleil', icon: 'sun' },
  { id: 'couleurs', label: 'Couleurs', icon: 'palette', procedural: true },
  { id: 'affichage', label: 'Affichage', icon: 'sliders' },
];

export interface ViewerPanelProps {
  readonly settings: ViewerSettings;
  readonly onChange: (patch: Partial<ViewerSettings>) => void;
  readonly levels: readonly { id: string; name: string; shortName: string }[];
  readonly rooms: readonly RoomInfo[];
  readonly activeRoom: string | null;
  readonly onView: (view: ViewId) => void;
  readonly onRoom: (room: RoomInfo) => void;
  readonly touring: boolean;
  readonly onToggleTour: () => void;
  readonly quality: QualityChoice;
  readonly onQuality: (q: QualityChoice) => void;
  readonly assumptions: readonly string[];
  readonly procedural: boolean;
  readonly tab: PanelTab;
  readonly onTab: (tab: PanelTab) => void;
  readonly collapsed: boolean;
}

export function ViewerPanel(props: ViewerPanelProps) {
  const tabs = TABS.filter((t) => props.procedural || !t.procedural);
  const panelId = useId();
  return (
    <aside className="panel" data-collapsed={props.collapsed} aria-label="Réglages de la maquette">
      <span className="panel__grip" aria-hidden />
      <div className="panel__tabs" role="tablist" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${panelId}-${t.id}`}
            aria-selected={props.tab === t.id && !props.collapsed}
            aria-controls={`${panelId}-body`}
            className="panel__tab"
            onClick={() => props.onTab(t.id)}
          >
            <Icon name={t.icon} size={20} />
            {t.label}
          </button>
        ))}
      </div>
      <div className="panel__body" role="tabpanel" id={`${panelId}-body`} aria-labelledby={`${panelId}-${props.tab}`}>
        {props.tab === 'niveaux' && <LevelsTab {...props} />}
        {props.tab === 'vues' && <ViewsTab {...props} />}
        {props.tab === 'soleil' && <SunTab {...props} />}
        {props.tab === 'couleurs' && <ColorsTab {...props} />}
        {props.tab === 'affichage' && <DisplayTab {...props} />}
      </div>
    </aside>
  );
}

function Section({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel__section">
      <h3 className="panel__label">
        <span>{label}</span>
        {value !== undefined && <output>{value}</output>}
      </h3>
      {children}
    </section>
  );
}

function LevelsTab({ settings, onChange, levels }: ViewerPanelProps) {
  const options = [{ id: 'all', shortName: 'Tout' }, ...[...levels].reverse()];
  const cutEnabled = settings.level !== 'all' && !settings.exploded;
  const current = levels.find((l) => l.id === settings.level);
  return (
    <>
      <Section label="Niveau affiché" value={current?.name ?? 'Maison entière'}>
        <div className="segmented" role="group" aria-label="Niveau affiché">
          {options.map((o) => (
            <button key={o.id} type="button" aria-pressed={settings.level === o.id} onClick={() => onChange({ level: o.id })}>
              {o.shortName}
            </button>
          ))}
        </div>
      </Section>
      <Section label="Hauteur de coupe" value={`${settings.cut.toFixed(2).replace('.', ',')} m`}>
        <input
          className="range"
          type="range"
          min={CUT_MIN}
          max={CUT_MAX}
          step={0.05}
          value={settings.cut}
          disabled={!cutEnabled}
          aria-label="Hauteur de coupe des murs"
          onChange={(e) => onChange({ cut: Number(e.target.value) })}
        />
        <p className="hint">{cutEnabled ? 'Abaissez la coupe pour plonger dans les pièces.' : 'Choisissez un niveau pour activer la coupe.'}</p>
      </Section>
      <Section label="Vue éclatée">
        <label className="switch">
          <span>Séparer les niveaux</span>
          <input type="checkbox" checked={settings.exploded} onChange={(e) => onChange({ exploded: e.target.checked })} />
        </label>
      </Section>
    </>
  );
}

function ViewsTab({ onView, rooms, onRoom, activeRoom, touring, onToggleTour, levels }: ViewerPanelProps) {
  return (
    <>
      <Section label="Points de vue">
        <div className="chip-row">
          {(Object.keys(VIEW_LABELS) as ViewId[]).map((v) => (
            <button key={v} type="button" className="chip" onClick={() => onView(v)}>
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </Section>
      {rooms.length > 0 && (
        <>
          <Section label="Visite guidée">
            <button type="button" className={touring ? 'btn btn--sm' : 'btn btn--primary btn--sm'} onClick={onToggleTour} style={{ width: '100%' }}>
              <Icon name={touring ? 'stop' : 'play'} size={16} /> {touring ? 'Arrêter la visite' : 'Lancer la visite des pièces'}
            </button>
          </Section>
          {[...levels].reverse().map((level) => {
            const list = rooms.filter((r) => r.levelId === level.id);
            if (!list.length) return null;
            return (
              <Section key={level.id} label={level.name}>
                <ul className="room-list">
                  {list.map((r) => (
                    <li key={r.id}>
                      <button type="button" aria-current={activeRoom === r.id} onClick={() => onRoom(r)}>
                        <span>{r.name}</span>
                        <small>{r.area.toFixed(1).replace('.', ',')} m²</small>
                      </button>
                    </li>
                  ))}
                </ul>
              </Section>
            );
          })}
        </>
      )}
    </>
  );
}

function SunTab({ settings, onChange }: ViewerPanelProps) {
  const night = settings.hour < 6.5 || settings.hour > 19.5;
  return (
    <>
      <div className="sun-dial">
        <Icon name="sun" size={30} />
        <div>
          <div className="sun-dial__time">{formatHour(settings.hour)}</div>
          <div className="sun-dial__meta">{SEASON_LABEL[settings.season]}</div>
        </div>
      </div>
      <Section label="Heure solaire">
        <input
          className="range"
          type="range"
          min={HOUR_MIN}
          max={HOUR_MAX}
          step={0.25}
          value={settings.hour}
          aria-label="Heure de la journée"
          onChange={(e) => onChange({ hour: Number(e.target.value) })}
        />
      </Section>
      <Section label="Saison">
        <div className="segmented" role="group" aria-label="Saison">
          {(Object.keys(SEASON_LABEL) as Season[]).map((s) => (
            <button key={s} type="button" aria-pressed={settings.season === s} onClick={() => onChange({ season: s })}>
              {SEASON_LABEL[s].split(' · ')[0]}
            </button>
          ))}
        </div>
      </Section>
      <Section label="Ambiances">
        <div className="chip-row">
          <button type="button" className="chip" onClick={() => onChange({ hour: 8.5 })}>Matin</button>
          <button type="button" className="chip" onClick={() => onChange({ hour: 13 })}>Midi</button>
          <button type="button" className="chip" onClick={() => onChange({ hour: 18.5 })}>Golden hour</button>
          <button type="button" className="chip" onClick={() => onChange({ hour: 21 })}>Soirée</button>
        </div>
        <p className="hint">
          {night ? 'La nuit, les pièces s\'éclairent : idéal pour juger des volumes intérieurs.' : 'Ombres calculées pour la latitude d\'Oued Ksari (36,7° N), nord supposé en haut du plan.'}
        </p>
      </Section>
    </>
  );
}

function ColorPicker({ value, onPick, label }: { value: string; onPick: (hex: string) => void; label: string }) {
  return (
    <label className="color-input" title={label} style={{ background: value }}>
      <input type="color" value={value} aria-label={label} onChange={(e) => onPick(e.target.value)} />
      <span aria-hidden>+</span>
    </label>
  );
}

function ColorsTab({ settings, onChange }: ViewerPanelProps) {
  const facade = findFacade(settings.facade);
  const interior = findInterior(settings.interior);
  const frame = settings.frame ?? facade.frame;
  return (
    <>
      <Section label="Façade" value={settings.wall ? 'Personnalisée' : facade.name}>
        <div className="swatches">
          {FACADE_PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              className="swatch"
              aria-pressed={settings.facade === p.id && !settings.wall}
              onClick={() => onChange({ facade: p.id, wall: null, frame: null })}
            >
              <span className="swatch__colors" aria-hidden>
                <span style={{ background: p.wall }} />
                <span style={{ background: p.accent }} />
                <span style={{ background: p.stone }} />
                <span style={{ background: p.frame }} />
              </span>
              {p.name}
            </button>
          ))}
        </div>
        <div className="dots" style={{ marginTop: 10 }}>
          <span className="hint" style={{ margin: 0, flex: 1 }}>Enduit sur mesure</span>
          <ColorPicker value={settings.wall ?? facade.wall} label="Couleur d'enduit personnalisée" onPick={(wall) => onChange({ wall })} />
        </div>
      </Section>
      <Section label="Menuiseries">
        <div className="dots" role="group" aria-label="Couleur des menuiseries">
          {FRAME_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className="dot"
              title={c.name}
              aria-label={c.name}
              aria-pressed={frame.toLowerCase() === c.value.toLowerCase()}
              style={{ background: c.value }}
              onClick={() => onChange({ frame: c.value })}
            />
          ))}
          <ColorPicker value={frame} label="Couleur de menuiserie personnalisée" onPick={(v) => onChange({ frame: v })} />
        </div>
      </Section>
      <Section label="Ambiance intérieure" value={interior.name}>
        <div className="style-cards">
          {INTERIOR_STYLES.map((s) => (
            <button key={s.id} type="button" className="style-card" aria-pressed={settings.interior === s.id} onClick={() => onChange({ interior: s.id, accent: null })}>
              <span className="style-card__strip" aria-hidden>
                <span style={{ background: s.parquet }} />
                <span style={{ background: s.walls }} />
                <span style={{ background: s.fabric }} />
                <span style={{ background: s.fabricAccent }} />
                <span style={{ background: s.cabinet }} />
              </span>
              <strong>{s.name}</strong>
              <small>{s.description}</small>
            </button>
          ))}
        </div>
        <div className="dots" style={{ marginTop: 10 }}>
          <span className="hint" style={{ margin: 0, flex: 1 }}>Couleur des textiles</span>
          <ColorPicker value={settings.accent ?? interior.fabricAccent} label="Couleur d'accent des textiles" onPick={(accent) => onChange({ accent })} />
        </div>
      </Section>
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => onChange({ facade: 'chaux', wall: null, frame: null, interior: 'scandinave', accent: null })}>
        Réinitialiser les couleurs
      </button>
    </>
  );
}

function DisplayTab({ settings, onChange, quality, onQuality, assumptions, procedural }: ViewerPanelProps) {
  const layers = (Object.keys(LAYER_LABELS) as LayerId[]).filter((id) => procedural || id === 'labels');
  return (
    <>
      {procedural && (
        <Section label="Calques">
          <ul className="switch-list">
            {layers.map((id) => (
              <li key={id}>
                <label className="switch">
                  <span>{LAYER_LABELS[id]}</span>
                  <input
                    type="checkbox"
                    checked={settings.layers[id]}
                    onChange={(e) => onChange({ layers: { ...settings.layers, [id]: e.target.checked } })}
                  />
                </label>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section label="Qualité de rendu">
        <div className="segmented" role="group" aria-label="Qualité de rendu">
          {(Object.keys(QUALITY_LABELS) as QualityChoice[]).map((q) => (
            <button key={q} type="button" aria-pressed={quality === q} onClick={() => onQuality(q)}>
              {QUALITY_LABELS[q]}
            </button>
          ))}
        </div>
        <p className="hint">« Haute » active l'occlusion ambiante et les ombres 4K. « Économie » préserve la batterie.</p>
      </Section>
      {assumptions.length > 0 && (
        <Section label="Hypothèses">
          <ul className="note-list hint" style={{ marginTop: 0 }}>
            {assumptions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
