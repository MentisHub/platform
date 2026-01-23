import type { StartRunOptions } from 'src/flower/flower.service';

/**
 * Mock FlowerService for NestJS DI
 */
export type MockFlowerService = {
  registerNode: jest.Mock;
  deactivateNode: jest.Mock;
  startRun: jest.Mock;
  stopRun: jest.Mock;
  onModuleInit: jest.Mock;
};

export const createMockFlowerService = (): MockFlowerService => ({
  registerNode: jest.fn().mockImplementation(() => {
    // Generate a numeric node ID like Flower does
    return Promise.resolve(String(Math.floor(Math.random() * 1000000000)));
  }),
  deactivateNode: jest.fn().mockResolvedValue(undefined),
  startRun: jest.fn().mockImplementation(() => {
    // Generate a run ID like Flower does
    return Promise.resolve(String(Math.floor(Math.random() * 1000000)));
  }),
  stopRun: jest.fn().mockResolvedValue(true),
  onModuleInit: jest.fn(),
});

/**
 * Reset all Flower mocks
 */
export const resetFlowerMocks = (flowerService: MockFlowerService) => {
  flowerService.registerNode.mockClear();
  flowerService.deactivateNode.mockClear();
  flowerService.startRun.mockClear();
  flowerService.stopRun.mockClear();
};

/**
 * Helper to mock specific node registration result
 */
export const mockNodeRegistration = (
  flowerService: MockFlowerService,
  nodeId: string,
) => {
  flowerService.registerNode.mockResolvedValueOnce(nodeId);
};

/**
 * Helper to mock node registration failure
 */
export const mockNodeRegistrationError = (
  flowerService: MockFlowerService,
  error: Error | string,
) => {
  flowerService.registerNode.mockRejectedValueOnce(
    typeof error === 'string' ? new Error(error) : error,
  );
};

/**
 * Helper to mock specific run ID
 */
export const mockStartRun = (
  flowerService: MockFlowerService,
  runId: string,
) => {
  flowerService.startRun.mockResolvedValueOnce(runId);
};

/**
 * Helper to mock run start failure
 */
export const mockStartRunError = (
  flowerService: MockFlowerService,
  error: Error | string,
) => {
  flowerService.startRun.mockRejectedValueOnce(
    typeof error === 'string' ? new Error(error) : error,
  );
};

/**
 * Helper to mock stop run failure
 */
export const mockStopRunError = (
  flowerService: MockFlowerService,
  error: Error | string,
) => {
  flowerService.stopRun.mockRejectedValueOnce(
    typeof error === 'string' ? new Error(error) : error,
  );
};

/**
 * Helper to verify startRun was called with expected options
 */
export const expectStartRunCalledWith = (
  flowerService: MockFlowerService,
  expectedOptions: Partial<StartRunOptions>,
) => {
  expect(flowerService.startRun).toHaveBeenCalledWith(
    expect.objectContaining(expectedOptions),
  );
};
