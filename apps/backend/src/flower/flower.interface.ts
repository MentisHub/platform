export interface StartRunOptions {
  fabHash: string;
  fabContent: Buffer;
  overrideConfig?: Record<string, any>;
  federation: string;
}

export interface FlowerMessage {
  message_id: string;
  dst_node_id: string;
  src_node_id: string;
  created_at: number;
  reply_created_at: number | null;
  reply_to_message_id: string | null;
  content: Buffer | null;
}

export interface MessageMetrics {
  train_loss?: number;
  train_accuracy?: number;
  num_examples?: number;
  [key: string]: any;
}
