// konami.jsx
// Listens globally for the Konami code (↑↑↓↓←→←→BA) and fires onActivate.
// Renders a faint hint at bottom-left that lights up as you input it.

const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

function KonamiGate({ accent = '#c96442', onActivate, hintVisible = true, armed = true }) {
  const [progress, setProgress] = React.useState(0);
  const bufferRef = React.useRef([]);

  React.useEffect(() => {
    if (!armed) return;
    function onKey(e) {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.key === 'B' || e.key === 'A' ? e.key.toLowerCase() : e.key;
      const buf = bufferRef.current;
      const needed = KONAMI[buf.length];
      if (k === needed) {
        buf.push(k);
        setProgress(buf.length);
        if (buf.length === KONAMI.length) {
          bufferRef.current = [];
          setProgress(0);
          onActivate && onActivate();
        }
      } else if (k === KONAMI[0]) {
        bufferRef.current = [k];
        setProgress(1);
      } else {
        bufferRef.current = [];
        setProgress(0);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onActivate, armed]);

  if (!hintVisible) return null;
  const glyphs = ['↑','↑','↓','↓','←','→','←','→','B','A'];
  return (
    <div
      style={{
        position: 'fixed', left: 12, bottom: 12, zIndex: 2147483645,
        display: 'flex', gap: 4, padding: '6px 10px',
        background: 'rgba(20,18,16,0.65)', borderRadius: 999,
        fontFamily: '"JetBrains Mono", ui-monospace, monospace',
        fontSize: 11, color: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(6px)',
        opacity: progress > 0 ? 1 : 0.5,
        transition: 'opacity .2s',
        pointerEvents: 'none', userSelect: 'none',
      }}
      title="Try the Konami code"
    >
      {glyphs.map((g, i) => (
        <span key={i} style={{
          width: 11, textAlign: 'center',
          color: i < progress ? accent : 'inherit',
          textShadow: i < progress ? `0 0 6px ${accent}` : 'none',
          fontWeight: i < progress ? 700 : 400,
          transition: 'color .15s',
        }}>{g}</span>
      ))}
    </div>
  );
}

Object.assign(window, { KonamiGate });
