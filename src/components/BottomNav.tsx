import React from 'react'

type Tab = 'today' | 'streak'

interface Props {
  active: Tab
  onNavigate: (tab: Tab) => void
}

export default function BottomNav({ active, onNavigate }: Props) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'calc(60px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '4px',
        gap: '0',
        zIndex: 100,
      }}
    >
      <TabButton
        label="Today"
        isActive={active === 'today'}
        onClick={() => onNavigate('today')}
        icon={<CircleIcon active={active === 'today'} />}
      />
      <TabButton
        label="Streak"
        isActive={active === 'streak'}
        onClick={() => onNavigate('streak')}
        icon={<GridIcon active={active === 'streak'} />}
      />
    </nav>
  )
}

function TabButton({
  label,
  isActive,
  onClick,
  icon,
}: {
  label: string
  isActive: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        maxWidth: 120,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '3px',
        padding: '8px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: isActive ? 'var(--fg)' : 'var(--fg-subtle)',
        transition: 'color 0.15s',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {icon}
      <span style={{ fontSize: '11px', fontWeight: isActive ? 600 : 400 }}>{label}</span>
    </button>
  )
}

function CircleIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12" cy="12" r="7"
        stroke="currentColor"
        strokeWidth={active ? 2.5 : 1.5}
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.15 : 0}
      />
    </svg>
  )
}

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="4" width="6" height="6" rx="1.5"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.5}
        fillOpacity={active ? 1 : 0}
      />
      <rect x="14" y="4" width="6" height="6" rx="1.5"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.5}
        fillOpacity={active ? 0.5 : 0}
      />
      <rect x="4" y="14" width="6" height="6" rx="1.5"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.5}
        fillOpacity={active ? 0.5 : 0}
      />
      <rect x="14" y="14" width="6" height="6" rx="1.5"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={active ? 0 : 1.5}
        fillOpacity={active ? 0.25 : 0}
      />
    </svg>
  )
}
