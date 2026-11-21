export default function Spinner({
  size = 18,
  label,
}: {
  size?: number;
  label?: string;
}) {
  return (
    <span className="spinner-wrap" role="status" aria-live="polite">
      <span
        className="spinner"
        style={{ width: size, height: size }}
        aria-hidden
      />
      {label ? <span>{label}</span> : <span className="sr-only">Carregando</span>}
    </span>
  );
}
