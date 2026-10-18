import { requireSupabase } from './supabase';

export type CommunityTable =
  | 'social_posts'
  | 'social_comments'
  | 'social_post_likes'
  | 'marketplace_items'
  | 'community_polls'
  | 'poll_options'
  | 'poll_votes'
  | 'social_events'
  | 'event_interests'
  | 'announcements'
  | 'emergency_sos'
  | 'complaint_tickets'
  | 'visitor_logs'
  | 'maintenance_bills';

export async function fetchRows<T>(
  table: CommunityTable,
  orderColumn = 'created_at',
  ascending = false
): Promise<T[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from(table)
    .select('*')
    .order(orderColumn, { ascending });
  if (error) throw new Error(`Unable to load ${table}: ${error.message}`);
  return (data ?? []) as T[];
}

export async function insertRow<T extends Record<string, unknown>>(
  table: CommunityTable,
  values: T
) {
  const client = requireSupabase();
  const { data, error } = await client.from(table).insert(values).select().single();
  if (error) throw new Error(`Unable to create ${table}: ${error.message}`);
  return data;
}

export async function updateRow<T extends Record<string, unknown>>(
  table: CommunityTable,
  id: string,
  values: T
) {
  const client = requireSupabase();
  const { data, error } = await client.from(table).update(values).eq('id', id).select().single();
  if (error) throw new Error(`Unable to update ${table}: ${error.message}`);
  return data;
}

export async function deleteRow(table: CommunityTable, id: string) {
  const client = requireSupabase();
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) throw new Error(`Unable to delete ${table}: ${error.message}`);
}
