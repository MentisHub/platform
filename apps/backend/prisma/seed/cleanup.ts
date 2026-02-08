import { PrismaClient } from '@prisma/client';

export async function cleanUp(prisma: PrismaClient): Promise<void> {
  console.log('Cleaning up existing data...');

  await prisma.artifact.deleteMany();
  await prisma.roundParticipant.deleteMany();
  await prisma.round.deleteMany();
  await prisma.runParticipant.deleteMany();
  await prisma.trainingRun.deleteMany();
  await prisma.node.deleteMany();
  await prisma.fab.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.projectCollaborator.deleteMany();
  await prisma.project.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  console.log('  Cleanup completed\n');
}
