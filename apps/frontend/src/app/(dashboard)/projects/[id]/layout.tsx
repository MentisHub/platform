import { ProjectCrumb } from "@/features/projects/components/project-crumb";

interface Props {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: Props) {
  const { id } = await params;
  return (
    <>
      <ProjectCrumb projectId={id} />
      {children}
    </>
  );
}
