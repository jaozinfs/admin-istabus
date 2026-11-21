import type { CSSProperties } from 'react';

export function Bone({
  width = '100%',
  height = 14,
  radius = 10,
  className = '',
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`bone-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius: radius,
        display: 'inline-block',
        ...style,
      }}
      aria-hidden
    />
  );
}

export function StatSkeleton() {
  return (
    <div className="panel stat fade-up" aria-hidden>
      <Bone width="42%" height={11} />
      <div style={{ marginTop: 14 }}>
        <Bone width="55%" height={28} radius={12} />
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="table-skeleton" aria-busy="true" aria-live="polite">
      <div className="table-skeleton-head">
        {Array.from({ length: cols }).map((_, i) => (
          <Bone key={`h-${i}`} width={`${60 + (i % 3) * 12}%`} height={10} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div className="table-skeleton-row" key={`r-${r}`}>
          {Array.from({ length: cols }).map((_, c) => (
            <Bone
              key={`c-${r}-${c}`}
              width={`${50 + ((r + c) % 4) * 12}%`}
              height={c === 0 ? 18 : 12}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="fade-up" aria-busy="true">
      <Bone width={120} height={12} />
      <div style={{ marginTop: 14 }}>
        <Bone width="48%" height={30} radius={12} />
      </div>
      <div style={{ marginTop: 10 }}>
        <Bone width="68%" height={14} />
      </div>
      <div className="toolbar" style={{ marginTop: 18 }}>
        <Bone width={90} height={28} radius={999} />
        <Bone width={70} height={28} radius={999} />
        <Bone width={110} height={28} radius={999} />
      </div>
      <div className="detail-grid" style={{ marginTop: 8 }}>
        <div className="panel">
          <Bone width="40%" height={16} />
          <div className="quota-grid" style={{ marginTop: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div className="quota-card" key={i}>
                <Bone width="50%" height={10} />
                <div style={{ marginTop: 12 }}>
                  <Bone width="70%" height={22} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <Bone width="100%" height={8} radius={999} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <Bone width="55%" height={16} />
          <div className="stack" style={{ marginTop: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Bone key={i} width="100%" height={42} radius={14} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CardListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mobile-card-list" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="mobile-card" key={i}>
          <Bone width="62%" height={16} />
          <div style={{ marginTop: 8 }}>
            <Bone width="40%" height={12} />
          </div>
          <div className="mobile-card-meta" style={{ marginTop: 14 }}>
            <Bone width={72} height={24} radius={999} />
            <Bone width={88} height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}
