/**
 * Mock DockerService for NestJS DI
 */
export type MockDockerService = {
  execInContainer: jest.Mock;
  startSuperExecContainer: jest.Mock;
  stopSuperExecContainer: jest.Mock;
  onModuleInit: jest.Mock;
};

export const createMockDockerService = (): MockDockerService => ({
  execInContainer: jest.fn().mockResolvedValue({
    stdout: '',
    stderr: '',
  }),
  startSuperExecContainer: jest
    .fn()
    .mockImplementation((trainingRunId: string) =>
      Promise.resolve(`serverapp-${trainingRunId.slice(0, 8)}`),
    ),
  stopSuperExecContainer: jest.fn().mockResolvedValue(undefined),
  onModuleInit: jest.fn(),
});

/**
 * Reset all Docker mocks
 */
export const resetDockerMocks = (dockerService: MockDockerService) => {
  dockerService.execInContainer.mockClear();
  dockerService.startSuperExecContainer.mockClear();
  dockerService.stopSuperExecContainer.mockClear();
};

/**
 * Helper to mock exec output
 */
export const mockExecOutput = (
  dockerService: MockDockerService,
  stdout: string,
  stderr: string = '',
) => {
  dockerService.execInContainer.mockResolvedValueOnce({ stdout, stderr });
};

/**
 * Helper to mock exec error
 */
export const mockExecError = (
  dockerService: MockDockerService,
  error: Error | string,
) => {
  dockerService.execInContainer.mockRejectedValueOnce(
    typeof error === 'string' ? new Error(error) : error,
  );
};

/**
 * Helper to mock container start failure
 */
export const mockContainerStartError = (
  dockerService: MockDockerService,
  error: Error | string,
) => {
  dockerService.startSuperExecContainer.mockRejectedValueOnce(
    typeof error === 'string' ? new Error(error) : error,
  );
};

/**
 * Mock for Flower CLI registration output
 */
export const mockFlowerNodeRegistration = (
  dockerService: MockDockerService,
  nodeId: string,
) => {
  dockerService.execInContainer.mockResolvedValueOnce({
    stdout: JSON.stringify({ nodeId }),
    stderr: '',
  });
};

/**
 * Mock for Flower CLI registration output (legacy format)
 */
export const mockFlowerNodeRegistrationLegacy = (
  dockerService: MockDockerService,
  nodeId: string,
) => {
  dockerService.execInContainer.mockResolvedValueOnce({
    stdout: `SuperNode registered successfully!\nID: ${nodeId}`,
    stderr: '',
  });
};
