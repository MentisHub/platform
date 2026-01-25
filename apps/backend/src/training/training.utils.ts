export function findActiveTrainingRun<T extends { fab: unknown }>(
  trainingRuns: T[],
): T | undefined {
  return trainingRuns.find((run) => run.fab !== null);
}
