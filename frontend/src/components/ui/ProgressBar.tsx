export default function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
}: {
  value: number;
  max?: number;
  tone?: 'accent' | 'ok' | 'warn' | 'danger';
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  const toneClass =
    tone === 'ok'
      ? 'is-ok'
      : tone === 'warn'
        ? 'is-warn'
        : tone === 'danger'
          ? 'is-danger'
          : '';

  return (
    <div
      className={`bar ${toneClass}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
