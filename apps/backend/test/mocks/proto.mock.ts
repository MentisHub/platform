/**
 * Mock for @platform/proto gRPC clients
 */

export class ControlClient {
  constructor(address: string, credentials: any) {}
  startRun(request: any, callback: any) {}
  stopRun(request: any, callback: any) {}
}

export class FleetClient {
  constructor(address: string, credentials: any) {}
  deactivateNode(request: any, callback: any) {}
}
