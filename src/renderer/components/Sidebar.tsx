import { useMemo, useRef, useEffect } from "react";
import { GaugeIcon } from "./ui/gauge";
import { CircleDollarSignIcon } from "./ui/circle-dollar-sign";
import { BlocksIcon } from "./ui/blocks";
import { BotIcon } from "./ui/bot";
import { FileTextIcon } from "./ui/file-text";
import { TerminalIcon } from "./ui/terminal";
import { SettingsIcon } from "./ui/settings";
import { HelpCircleIcon } from "./ui/help-circle";
import { PanelLeftCloseIcon } from "./ui/panel-left-close";
import { PanelLeftOpenIcon } from "./ui/panel-left-open";
import { useSettingsStore, useTranslations } from "../stores/settings";

type Page =
  | "dashboard"
  | "quota"
  | "providers"
  | "agents"
  | "apiKeys"
  | "logs"
  | "settings"
  | "about";

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute left-full ml-2 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-lg text-sm text-[var(--text-primary)] whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-lg">
        {label}
        <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-[var(--bg-secondary)] border-l border-b border-[var(--glass-border)] rotate-45" />
      </div>
    </div>
  );
}

function SidebarIcon({ page, isActive }: { page: Page; isActive: boolean }) {
  const gaugeRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const dollarRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const folderRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const botRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const fileTextRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const terminalRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const settingsRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);
  const helpCircleRef = useRef<{
    startAnimation: () => void;
    stopAnimation: () => void;
  }>(null);

  useEffect(() => {
    const refs = {
      dashboard: gaugeRef,
      quota: dollarRef,
      providers: folderRef,
      agents: botRef,
      apiKeys: fileTextRef,
      logs: terminalRef,
      settings: settingsRef,
      about: helpCircleRef,
    };

    const ref = refs[page as keyof typeof refs];
    if (ref?.current) {
      if (isActive) {
        ref.current.startAnimation();
      } else {
        ref.current.stopAnimation();
      }
    }
  }, [page, isActive]);

  const icons: Record<Page, React.ReactNode> = {
    dashboard: <GaugeIcon ref={gaugeRef} size={20} />,
    quota: <CircleDollarSignIcon ref={dollarRef} size={20} />,
    providers: <BlocksIcon ref={folderRef} size={20} />,
    agents: <BotIcon ref={botRef} size={20} />,
    apiKeys: <FileTextIcon ref={fileTextRef} size={20} />,
    logs: <TerminalIcon ref={terminalRef} size={20} />,
    settings: <SettingsIcon ref={settingsRef} size={20} />,
    about: <HelpCircleIcon ref={helpCircleRef} size={20} />,
  };

  return (
    <div
      className={`flex items-center justify-center w-5 h-5 ${isActive ? "drop-shadow-[var(--glow-primary)]" : ""}`}
    >
      {icons[page]}
    </div>
  );
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const t = useTranslations();
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore(
    (state) => ({
      sidebarCollapsed: state.sidebarCollapsed,
      setSidebarCollapsed: state.setSidebarCollapsed,
    }),
  );

  const navItems: { id: Page; label: string }[] = useMemo(
    () => [
      { id: "dashboard", label: t.nav.dashboard },
      { id: "quota", label: t.nav.quota },
      { id: "providers", label: t.nav.providers },
      { id: "agents", label: t.nav.agents },
      { id: "apiKeys", label: t.nav.apiKeys },
      { id: "logs", label: t.nav.logs },
      { id: "settings", label: t.nav.settings },
      { id: "about", label: t.nav.about },
    ],
    [t],
  );

  const NavButton = ({ item }: { item: { id: Page; label: string } }) => {
    const isActive = currentPage === item.id;
    const button = (
      <button
        onClick={() => onNavigate(item.id)}
        className={`nav-item w-full flex items-center ${sidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive ? "nav-item-active" : "nav-item-inactive"
        }`}
      >
        <span
          className={`flex-shrink-0 ${isActive ? "drop-shadow-[var(--glow-primary)]" : ""}`}
        >
          <SidebarIcon page={item.id} isActive={isActive} />
        </span>
        <span
          className={`whitespace-nowrap transition-all duration-300 ${
            sidebarCollapsed
              ? "w-0 opacity-0 overflow-hidden"
              : "w-auto opacity-100"
          }`}
        >
          {item.label}
        </span>
      </button>
    );

    if (sidebarCollapsed) {
      return <Tooltip label={item.label}>{button}</Tooltip>;
    }
    return button;
  };

  return (
    <aside
      className={`glass-sidebar flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${sidebarCollapsed ? "w-[72px]" : "w-64"}`}
    >
      <div
        className={`p-4 border-b border-[var(--glass-border)] flex items-center min-h-[68px] transition-all duration-300 overflow-hidden ${
          sidebarCollapsed ? "justify-center" : "gap-3"
        }`}
      >
        <span className="text-2xl text-[var(--accent-primary)] glow-primary flex-shrink-0">
          ◈
        </span>
        <div
          className={`transition-all duration-300 overflow-hidden ${
            sidebarCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          }`}
        >
          <div className="text-lg font-bold text-[var(--text-primary)] whitespace-nowrap">
            CLIPlus
          </div>
          <div className="text-xs text-[var(--text-dim)] whitespace-nowrap">
            Proxy Manager
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-x-hidden overflow-y-auto">
        {navItems.map((item) => (
          <NavButton key={item.id} item={item} />
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--glass-border)] overflow-hidden flex justify-center">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 group"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={
            sidebarCollapsed
              ? t.sidebar.expandSidebar
              : t.sidebar.collapseSidebar
          }
          title={
            sidebarCollapsed
              ? t.sidebar.expandSidebar
              : t.sidebar.collapseSidebar
          }
        >
          {sidebarCollapsed ? (
            <PanelLeftOpenIcon size={20} />
          ) : (
            <PanelLeftCloseIcon size={20} />
          )}
        </button>
      </div>
    </aside>
  );
}

export type { Page };
