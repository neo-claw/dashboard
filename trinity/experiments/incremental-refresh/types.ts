export interface InteractionsToRefreshRow {
  id: number;
  interaction_id: string;
  due_to_col_update: string;
  from_table: string;
  refresh_status: 'pending' | 'in_progress' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface FetchPendingResult {
  ids: string[]; // array of interaction_id
  count: number;
}

export interface RefreshInteractionsParams {
  batchSize?: number;
}

export interface ProcessBatchResult {
  processed: number;
  errors: number;
}

export interface TrackChangePayload {
  interaction_id: string;
  due_to_col_update: string;
  from_table: string;
}
