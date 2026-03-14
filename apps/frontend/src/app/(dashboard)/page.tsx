import { Header } from "@/components/layout/header";
import { ProjectsView } from "@/features/projects/projects-view";

export default function ProjectsPage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <Header title="Projects" />
      <main className="flex-1 p-6">
        <ProjectsView />
      </main>
    </div>
  );
}
