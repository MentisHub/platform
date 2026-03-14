import { Topbar } from "@/components/layout/nav/topbar";

export default function DashboardLayout({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen" style={{ background: "var(--surface-0)" }}>
      {sidebar}
      <Topbar />
      <div className="flex flex-col flex-1 pl-14 pt-10 min-w-0">
        {children}
      </div>
    </div>
  );
}
