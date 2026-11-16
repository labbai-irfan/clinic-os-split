import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, Stethoscope } from 'lucide-react';
import { NAV_ITEMS } from '../../nav-config';
import { usePermission } from '../../hooks/use-permission';
import { useUiStore } from '../../stores/ui-store';
import { cn } from '../../lib/utils';

/** Route prefix match: `/patients` matches `/patients` and `/patients/123`, not `/patients-x`. */
function matchesPath(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function NavRow({
  to,
  label,
  icon: Icon,
  collapsed,
  active,
}: {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  collapsed: boolean;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex min-h-[44px] items-center gap-3 rounded px-3 text-sm font-medium transition-colors',
        active
          ? "bg-primary/10 text-primary before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-primary before:content-['']"
          : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
      )}
    >
      {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />}
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

export function Sidebar({ mobile, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { has } = usePermission();
  const { pathname } = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const collapsed = mobile ? false : sidebarCollapsed;

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || has(item.permission)).map(
    (item) => ({
      ...item,
      children: item.children?.filter((c) => !c.permission || has(c.permission)),
    }),
  );

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'flex h-full flex-col border-r border-border bg-surface',
        collapsed ? 'w-16' : 'w-64',
      )}
      onClick={onNavigate}
    >
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary shadow-sm">
          <Stethoscope className="h-5 w-5 text-primary-foreground" aria-hidden="true" />
        </span>
        {!collapsed && (
          <span className="text-lg font-semibold tracking-tight text-text-primary">ClinicOS</span>
        )}
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {visibleItems.map((item) => {
          const children = item.children ?? [];
          const showChildren = !collapsed && children.length > 0;

          // Exactly ONE row lights up at a time. When children are visible they
          // own the selection (longest matching child wins); the parent then
          // stays neutral. When collapsed (children hidden), the parent lights
          // for its own route or any of its children's routes.
          const bestChild = showChildren
            ? children.reduce<string | null>(
                (best, child) =>
                  matchesPath(pathname, child.to) && (!best || child.to.length > best.length)
                    ? child.to
                    : best,
                null,
              )
            : null;
          const parentActive = showChildren
            ? false
            : matchesPath(pathname, item.to) || children.some((c) => matchesPath(pathname, c.to));

          return (
            <Fragment key={item.to}>
              <NavRow
                to={item.to}
                label={item.label}
                icon={item.icon}
                collapsed={collapsed}
                active={parentActive}
              />
              {showChildren && (
                <div className="ml-8 space-y-1 border-l border-border pl-2">
                  {children.map((child) => (
                    <NavRow
                      key={child.to}
                      to={child.to}
                      label={child.label}
                      collapsed={false}
                      active={child.to === bestChild}
                    />
                  ))}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {!mobile && (
        <button
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="flex min-h-[44px] items-center justify-center gap-2 border-t border-border text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
        >
          <ChevronLeft className={cn('h-5 w-5 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
      )}
    </nav>
  );
}
