import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { BrandMark } from '@/app/Icon';
import { useDocumentTitle } from '@/app/useDocumentTitle';
import { MAX_ATTEMPTS, PIN_LENGTH, pinGuard } from './pin';

type Status = { tone: 'info' | 'error'; text: string };

export function PinPage() {
  useDocumentTitle('Accès');
  const navigate = useNavigate();
  const location = useLocation();
  const [digits, setDigits] = useState<string[]>(() => Array(PIN_LENGTH).fill(''));
  const [status, setStatus] = useState<Status>({ tone: 'info', text: '' });
  const [locked, setLocked] = useState(() => pinGuard.isLocked());
  const [remaining, setRemaining] = useState(() => pinGuard.remainingAttempts());
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  // Source de vérité synchrone : plusieurs saisies peuvent arriver avant un rendu (autoremplissage).
  const digitsRef = useRef(digits);
  const setAll = (next: string[]) => {
    digitsRef.current = next;
    setDigits(next);
  };

  useEffect(() => {
    if (!locked) inputs.current[0]?.focus();
  }, [locked]);

  if (pinGuard.isAuthenticated()) return <Navigate to="/projects" replace />;

  const from = (location.state as { from?: string } | null)?.from;
  const target = from && from.startsWith('/projects') ? from : '/projects';

  const submit = async (code: string) => {
    if (busy || locked) return;
    setBusy(true);
    const result = await pinGuard.verify(code);
    setBusy(false);
    switch (result.status) {
      case 'ok':
        navigate(target, { replace: true });
        return;
      case 'locked':
        setLocked(true);
        setRemaining(0);
        return;
      case 'invalid':
        setStatus({ tone: 'error', text: `Le code comporte ${PIN_LENGTH} chiffres.` });
        return;
      case 'wrong':
        setRemaining(result.remaining);
        setStatus({ tone: 'error', text: `Code incorrect — ${result.remaining} essai${result.remaining > 1 ? 's' : ''} restant${result.remaining > 1 ? 's' : ''}.` });
        setShake(true);
        window.setTimeout(() => setShake(false), 400);
        setAll(Array(PIN_LENGTH).fill(''));
        inputs.current[0]?.focus();
    }
  };

  const update = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    if (!clean) {
      setAll(digitsRef.current.map((v, i) => (i === index ? '' : v)));
      return;
    }
    const next = [...digitsRef.current];
    clean
      .slice(0, PIN_LENGTH - index)
      .split('')
      .forEach((ch, k) => (next[index + k] = ch));
    setAll(next);
    const focusAt = Math.min(index + clean.length, PIN_LENGTH - 1);
    inputs.current[focusAt]?.focus();
    if (next.every(Boolean)) void submit(next.join(''));
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digitsRef.current[index] && index > 0) inputs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < PIN_LENGTH - 1) inputs.current[index + 1]?.focus();
    if (e.key === 'Enter') void submit(digitsRef.current.join(''));
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    update(0, e.clipboardData.getData('text'));
  };

  return (
    <main className="pin-page">
      <Blueprint />
      <section className="pin-card" aria-labelledby="pin-title">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <BrandMark />
        </div>
        <p className="eyebrow">Atelier Makhlouf</p>
        <h1 id="pin-title" className="display">
          Espace projets
        </h1>
        <p className="pin-card__lead">Saisissez votre code d'accès à six chiffres.</p>

        {locked ? (
          <div className="pin-locked" role="alert">
            <strong>Accès bloqué.</strong> Trois codes erronés ont été saisis sur cet appareil.
            Contactez l'atelier pour obtenir l'accès. Les maquettes partagées par lien restent consultables.
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit(digits.join(''));
            }}
          >
            <div className="attempts" aria-label={`${remaining} essai(s) restant(s) sur ${MAX_ATTEMPTS}`}>
              {Array.from({ length: MAX_ATTEMPTS }, (_, i) => (
                <span key={i} data-used={i >= remaining} />
              ))}
            </div>
            <fieldset className="pin-inputs" data-error={shake} style={{ border: 0, padding: 0 }}>
              <legend className="visually-hidden">Code PIN</legend>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  value={d}
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  pattern="[0-9]*"
                  maxLength={PIN_LENGTH}
                  aria-label={`Chiffre ${i + 1}`}
                  disabled={busy}
                  onChange={(e) => update(i, e.target.value)}
                  onKeyDown={(e) => onKeyDown(i, e)}
                  onPaste={onPaste}
                  onFocus={(e) => e.target.select()}
                />
              ))}
            </fieldset>
            <p className="pin-status" data-tone={status.tone} role="status" aria-live="polite">
              {status.text}
            </p>
            <button className="btn btn--primary" type="submit" disabled={busy || digits.some((d) => !d)} style={{ width: '100%' }}>
              {busy ? 'Vérification…' : 'Entrer'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

/** Fond décoratif : trame et esquisse de plan tracées à l'ouverture. */
function Blueprint() {
  return (
    <svg className="pin-page__blueprint" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1200" height="800" fill="url(#grid)" />
      <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.55">
        <path className="draw" d="M120 620V300h260v-80h300v400H120z" />
        <path className="draw" d="M380 300v320M680 380H900v240H680M120 460h260" />
        <path className="draw" d="M820 150h220v170H820z" style={{ animationDelay: '0.6s' }} />
        <path className="draw" d="M60 700h1080M160 720v-40M1080 720v-40" style={{ animationDelay: '1s' }} />
      </g>
    </svg>
  );
}
