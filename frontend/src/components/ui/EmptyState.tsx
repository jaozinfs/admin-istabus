import type { ReactNode } from 'react';

export default function EmptyState({
  title,
  hint,
  action,
  icon = 'inbox',
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: 'inbox' | 'search' | 'chart';
}) {
  return (
    <div className="empty-state fade-up">
      <span className="empty-icon" aria-hidden>
        {icon === 'search' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
        ) : icon === 'chart' ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19V5" strokeLinecap="round" />
            <path d="M4 19h16" strokeLinecap="round" />
            <path d="M8 15v-4" strokeLinecap="round" />
            <path d="M12 15V8" strokeLinecap="round" />
            <path d="M16 15v-7" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 8h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
            <path d="M8 8V6a4 4 0 0 1 8 0v2" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <p className="empty-title">{title}</p>
      {hint ? <p className="empty-hint">{hint}</p> : null}
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
