import type { ReactNode } from 'react'

export type HubTab = 'play' | 'inventory' | 'friends' | 'account' | 'guide'

const TABS: { id: HubTab; label: string }[] = [
  { id: 'play', label: 'Play' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'friends', label: 'Friends' },
  { id: 'account', label: 'Account' },
  { id: 'guide', label: 'Guide' },
]

interface AppShellProps {
  activeTab: HubTab
  onTabChange: (tab: HubTab) => void
  /** Incoming play invites — shows a badge on Friends. */
  friendsInviteCount?: number
  children: ReactNode
}

function TabList({
  activeTab,
  onTabChange,
  friendsInviteCount = 0,
  className,
}: {
  activeTab: HubTab
  onTabChange: (tab: HubTab) => void
  friendsInviteCount?: number
  className: string
}) {
  return (
    <nav className={className} aria-label="Main">
      {TABS.map((tab) => {
        const showInviteBadge =
          tab.id === 'friends' && friendsInviteCount > 0
        const label = showInviteBadge
          ? `Friends, ${friendsInviteCount} play invite${
              friendsInviteCount === 1 ? '' : 's'
            }`
          : tab.label

        return (
          <button
            key={tab.id}
            type="button"
            className={`hub-tab${activeTab === tab.id ? ' is-active' : ''}${
              showInviteBadge ? ' has-badge' : ''
            }`}
            aria-current={activeTab === tab.id ? 'page' : undefined}
            aria-label={label}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="hub-tab-label">{tab.label}</span>
            {showInviteBadge ? (
              <span className="hub-tab-badge" aria-hidden="true">
                {friendsInviteCount > 9 ? '9+' : friendsInviteCount}
              </span>
            ) : null}
          </button>
        )
      })}
    </nav>
  )
}

export function AppShell({
  activeTab,
  onTabChange,
  friendsInviteCount = 0,
  children,
}: AppShellProps) {
  return (
    <div className="app app-hub">
      <header className="hub-header">
        <h1 className="brand">Nicer Dicer</h1>
        <TabList
          activeTab={activeTab}
          onTabChange={onTabChange}
          friendsInviteCount={friendsInviteCount}
          className="hub-nav hub-nav-top"
        />
      </header>

      <div className="hub-pane" role="tabpanel">
        {children}
      </div>

      <TabList
        activeTab={activeTab}
        onTabChange={onTabChange}
        friendsInviteCount={friendsInviteCount}
        className="hub-nav hub-nav-bottom"
      />
    </div>
  )
}
