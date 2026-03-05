import { Event, EventType } from '@platform/proto';

export const FlowerEvents = {
  // Node lifecycle
  NODE_CONNECTED: 'flower.node.connected',
  NODE_DISCONNECTED: 'flower.node.disconnected',

  // Run lifecycle
  RUN_STARTED: 'flower.run.started',
  RUN_COMPLETED: 'flower.run.completed',
  RUN_FAILED: 'flower.run.failed',

  // Round lifecycle
  ROUND_STARTED: 'flower.round.started',
  ROUND_FIT_STARTED: 'flower.round.fit_started',
  ROUND_FIT_AGGREGATED: 'flower.round.fit_aggregated',
  ROUND_FIT_FAILED: 'flower.round.fit_failed',
  ROUND_EVALUATE_STARTED: 'flower.round.evaluate_started',
  ROUND_EVALUATE_AGGREGATED: 'flower.round.evaluate_aggregated',
  ROUND_EVALUATE_FAILED: 'flower.round.evaluate_failed',
  ROUND_COMPLETED: 'flower.round.completed',
  ROUND_FAILED: 'flower.round.failed',

  // Node training
  NODE_FIT_STARTED: 'flower.node.fit_started',
  NODE_FIT_COMPLETED: 'flower.node.fit_completed',
  NODE_FIT_FAILED: 'flower.node.fit_failed',
  NODE_EVALUATE_STARTED: 'flower.node.evaluate_started',
  NODE_EVALUATE_COMPLETED: 'flower.node.evaluate_completed',
  NODE_EVALUATE_FAILED: 'flower.node.evaluate_failed',
} as const;

export type FlowerEventName = (typeof FlowerEvents)[keyof typeof FlowerEvents];

export const EVENT_TYPE_MAP: Partial<Record<EventType, string>> = {
  [EventType.RUN_STARTED]: FlowerEvents.RUN_STARTED,
  [EventType.RUN_COMPLETED]: FlowerEvents.RUN_COMPLETED,
  [EventType.RUN_FAILED]: FlowerEvents.RUN_FAILED,
  [EventType.ROUND_STARTED]: FlowerEvents.ROUND_STARTED,
  [EventType.ROUND_FIT_STARTED]: FlowerEvents.ROUND_FIT_STARTED,
  [EventType.ROUND_FIT_AGGREGATED]: FlowerEvents.ROUND_FIT_AGGREGATED,
  [EventType.ROUND_FIT_FAILED]: FlowerEvents.ROUND_FIT_FAILED,
  [EventType.ROUND_EVALUATE_STARTED]: FlowerEvents.ROUND_EVALUATE_STARTED,
  [EventType.ROUND_EVALUATE_AGGREGATED]: FlowerEvents.ROUND_EVALUATE_AGGREGATED,
  [EventType.ROUND_EVALUATE_FAILED]: FlowerEvents.ROUND_EVALUATE_FAILED,
  [EventType.ROUND_COMPLETED]: FlowerEvents.ROUND_COMPLETED,
  [EventType.ROUND_FAILED]: FlowerEvents.ROUND_FAILED,
  [EventType.NODE_FIT_STARTED]: FlowerEvents.NODE_FIT_STARTED,
  [EventType.NODE_FIT_COMPLETED]: FlowerEvents.NODE_FIT_COMPLETED,
  [EventType.NODE_FIT_FAILED]: FlowerEvents.NODE_FIT_FAILED,
  [EventType.NODE_EVALUATE_STARTED]: FlowerEvents.NODE_EVALUATE_STARTED,
  [EventType.NODE_EVALUATE_COMPLETED]: FlowerEvents.NODE_EVALUATE_COMPLETED,
  [EventType.NODE_EVALUATE_FAILED]: FlowerEvents.NODE_EVALUATE_FAILED,
};

export interface FlowerRunEventPayload {
  runId: string;
  event: Event;
}

export interface FlowerNodeLifecyclePayload {
  event: Event;
}
