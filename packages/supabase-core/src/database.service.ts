/* eslint-disable */
// @ts-nocheck
import {
    Tables,
    TablesInsert,
    TablesUpdate,
} from './database.types';
import {
    RealtimePostgresChangesPayload,
    SupabaseClient,
    RealtimeChannel,
    PostgrestFilterBuilder,
} from '@supabase/supabase-js';

// =================================================================
// Utility Functions (Pure Helpers)
// =================================================================

/**
 * Applies a set of filters to a Supabase query builder.
 * This is a pure function version of the old `staticFilters` method.
 */
export function applyFilters<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    query: PostgrestFilterBuilder<any, any, any>,
    filters?: Partial<Tables<D, SchemaName, T>>
): PostgrestFilterBuilder<any, any, any> {
    if (filters) {
        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== null) {
                query = query.eq(key as string, value);
            }
        }
    }
    return query;
}

// =================================================================
// Core Database Functions (Dependency-Injected)
// =================================================================

// --- Read Operations ---

export async function getAll<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T
): Promise<Tables<D, SchemaName, T>[]> {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) throw error;
    return data || [];
}

export async function getById<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    id: string
): Promise<Tables<D, SchemaName, T> | null> {
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
}

export async function getByIdSafe<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    id: string
): Promise<Tables<D, SchemaName, T> | null> {
    const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .maybeSingle();
    if (error) throw error;
    return data;
}

export async function getPaginated<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D,
    K extends string = '*',
    R = Tables<D, SchemaName, T>,
    E = unknown
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    from: number,
    to: number,
    options?: {
        filters?: Partial<Tables<D, SchemaName, T>>;
        orderBy?: {
            column: keyof Tables<D, SchemaName, T>;
            ascending?: boolean;
        }[];
        search?: {
            column: keyof Tables<D, SchemaName, T>;
            value: string;
            ilike?: boolean;
        };
        select?: K[] | K;
        extension?: string;
        extras?: () => Promise<E>; // ← Extension logic like aggregation
    }
): Promise<{
    data: R[];
    total_items: number;
    from: number;
    to: number;
    page_size: number;
    extras?: E;
}> {
    const {
        filters,
        orderBy,
        search,
        select = '*',
        extension,
        extras,
    } = options || {};

    const selectString = Array.isArray(select) ? select.join(',') : select;
    const fullSelect = extension ? `${extension}` : `${selectString}`;

    let query = supabase
        .from(tableName)
        .select(fullSelect, { count: 'exact' });

    query = applyFilters(query, filters);

    if (search) {
        const { column, value, ilike = true } = search;
        query = ilike
            ? query.ilike(column as string, `%${value}%`)
            : query.like(column as string, `%${value}%`);
    }

    if (orderBy?.length) {
        orderBy.forEach(({ column, ascending = true }) => {
            query = query.order(column as string, { ascending });
        });
    }

    query = query.range(from, to);

    const [result, extraResult] = await Promise.all([query, extras?.()]);

    const { data, error, count } = result;
    if (error) throw error;

    return {
        data: (data || []) as R[],
        total_items: count || 0,
        from,
        to,
        page_size: to - from + 1,
        ...(extraResult ? { extras: extraResult } : {}),
    };
}

export async function getByColumn<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D,
    K extends keyof Tables<D, SchemaName, T> = keyof Tables<D, SchemaName, T>
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    column: K,
    value: Tables<D, SchemaName, T>[K],
    selectString: string = '*'
): Promise<Tables<D, SchemaName, T>[]> {
    const { data, error } = await supabase
        .from(tableName)
        .select(selectString)
        .eq(column as string, value);
    if (error) throw error;
    return data || [];
}

export async function getByColumns<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    filters: Partial<Tables<D, SchemaName, T>>
): Promise<Tables<D, SchemaName, T>[]> {
    let query = supabase.from(tableName).select('*');
    query = applyFilters(query, filters);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// --- Write Operations ---

export async function insert<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    record: TablesInsert<D, SchemaName, T>
): Promise<Tables<D, SchemaName, T>> {
    const { data, error } = await supabase
        .from(tableName)
        .insert([record])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function insertMany<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    records: TablesInsert<D, SchemaName, T>[]
): Promise<Tables<D, SchemaName, T>[]> {
    const { data, error } = await supabase
        .from(tableName)
        .insert(records)
        .select();
    if (error) throw error;
    return data || [];
}

export async function upsert<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    record: TablesInsert<D, SchemaName, T>
): Promise<Tables<D, SchemaName, T>> {
    const { data, error } = await supabase
        .from(tableName)
        .upsert([record])
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function upsertMany<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    records: TablesInsert<D, SchemaName, T>[]
): Promise<Tables<D, SchemaName, T>[]> {
    const { data, error } = await supabase
        .from(tableName)
        .upsert(records)
        .select();
    if (error) throw error;
    return data || [];
}

export async function update<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    id: string,
    updates: TablesUpdate<D, SchemaName, T>
): Promise<Tables<D, SchemaName, T>> {
    const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function updateByColumn<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D,
    K extends keyof Tables<D, SchemaName, T> = keyof Tables<D, SchemaName, T>
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    column: K,
    value: Tables<D, SchemaName, T>[K],
    updates: TablesUpdate<D, SchemaName, T>
): Promise<Tables<D, SchemaName, T>[]> {
    const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq(column as string, value)
        .select();
    if (error) throw error;
    return data || [];
}

// --- Delete Operations ---

export async function del<
    D = any,
    T extends string = string
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    id: string
): Promise<void> {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) throw error;
}

export async function deleteByColumn<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D,
    K extends keyof Tables<D, SchemaName, T> = keyof Tables<D, SchemaName, T>
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    column: K,
    value: Tables<D, SchemaName, T>[K]
): Promise<void> {
    const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(column as string, value);
    if (error) throw error;
}

export async function deleteMany<
    D = any,
    T extends string = string
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    ids: string[]
): Promise<void> {
    const { error } = await supabase.from(tableName).delete().in('id', ids);
    if (error) throw error;
}

// --- Advanced Query Methods ---

export async function count<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    filters?: Partial<Tables<D, SchemaName, T>>
): Promise<number> {
    let query = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

    query = applyFilters(query, filters);

    const { count, error } = await query;
    if (error) throw error;
    return count || 0;
}

export async function exists<
    D = any,
    T extends string = string
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    id: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .eq('id', id)
        .single();
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
}

export async function search<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    column: keyof Tables<D, SchemaName, T>,
    searchTerm: string,
    options?: {
        ilike?: boolean;
        limit?: number;
        offset?: number;
    }
): Promise<Tables<D, SchemaName, T>[]> {
    const { ilike = true, limit, offset } = options || {};

    let query = supabase.from(tableName).select('*');

    if (ilike) {
        query = query.ilike(column as string, `%${searchTerm}%`);
    } else {
        query = query.like(column as string, `%${searchTerm}%`);
    }

    if (limit) query = query.limit(limit);
    if (offset) query = query.range(offset, offset + (limit || 100) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

// --- Realtime Subscriptions ---

export function subscribeToAll<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void
): RealtimeChannel {
    return supabase
        .channel(`${String(tableName)}-all`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: String(tableName),
            },
            callback as (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => void
        )
        .subscribe();
}

export function subscribeToInserts<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void
): RealtimeChannel {
    return supabase
        .channel(`${String(tableName)}-insert`)
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: String(tableName),
            },
            callback as (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => void
        )
        .subscribe();
}

export function subscribeToUpdates<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void
): RealtimeChannel {
    return supabase
        .channel(`${String(tableName)}-update`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: String(tableName),
            },
            callback as (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => void
        )
        .subscribe();
}

export function subscribeToDeletes<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void
): RealtimeChannel {
    return supabase
        .channel(`${String(tableName)}-delete`)
        .on(
            'postgres_changes',
            {
                event: 'DELETE',
                schema: 'public',
                table: String(tableName),
            },
            callback as (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => void
        )
        .subscribe();
}

export function subscribeToFilter<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    filter: string,
    callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void,
    channelSuffix?: string
): RealtimeChannel {
    const channelName = `${String(tableName)}-filter${channelSuffix ? `-${channelSuffix}` : ''
        }`;
    return supabase
        .channel(channelName)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: String(tableName),
                filter,
            },
            callback as (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => void
        )
        .subscribe();
}

export function subscribeToColumnFilter<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D,
    K extends keyof Tables<D, SchemaName, T> = keyof Tables<D, SchemaName, T>
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    column: K,
    value: Tables<D, SchemaName, T>[K],
    callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void
): RealtimeChannel {
    return subscribeToFilter(
        supabase,
        tableName,
        `${String(column)}=eq.${value}`,
        callback,
        `${String(column)}-${value}`
    );
}

// --- Composite Operations ---

export async function findOrCreate<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    searchCriteria: Partial<Tables<D, SchemaName, T>>,
    createData: TablesInsert<D, SchemaName, T>
): Promise<Tables<D, SchemaName, T>> {
    const existing = await getByColumns(supabase, tableName, searchCriteria);
    if (existing.length > 0) {
        return existing[0];
    }
    return await insert(supabase, tableName, createData);
}

export async function softDelete<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T,
    id: string,
    deletedAtColumn: keyof TablesUpdate<D, SchemaName, T> = 'deleted_at' as keyof TablesUpdate<D, SchemaName, T>
): Promise<Tables<D, SchemaName, T>> {
    const updates = {
        [deletedAtColumn]: new Date().toISOString(),
    } as TablesUpdate<D, SchemaName, T>;

    return await update(supabase, tableName, id, updates);
}

// =================================================================
// Service Factory
// =================================================================

/**
 * Creates a service object with methods pre-bound to a specific
 * Supabase client and table name.
 *
 * @param supabase The Supabase client instance
 * @param tableName The name of the table or view
 * @returns An object with all generic service methods
 */
export function SupabaseService<
    D = any,
    T extends string = string,
    SchemaName extends string & keyof D = 'public' extends keyof D ? 'public' : string & keyof D
>(
    supabase: SupabaseClient<D>,
    tableName: T
) {
    return {
        // Read
        getAll: () => getAll(supabase, tableName),
        getById: (id: string) => getById(supabase, tableName, id),
        getByIdSafe: (id: string) => getByIdSafe(supabase, tableName, id),
        getPaginated: <
            K extends string = '*',
            R = Tables<D, SchemaName, T>,
            E = unknown
        >(
            from: number,
            to: number,
            options?: Parameters<typeof getPaginated<D, T, SchemaName, K, R, E>>[4]
        ) => getPaginated<D, T, SchemaName, K, R, E>(supabase, tableName, from, to, options),
        getByColumn: <K extends keyof Tables<D, SchemaName, T>>(
            column: K,
            value: Tables<D, SchemaName, T>[K],
            selectString: string = '*'
        ) => getByColumn(supabase, tableName, column, value, selectString),
        getByColumns: (filters: Partial<Tables<D, SchemaName, T>>) =>
            getByColumns(supabase, tableName, filters),

        // Write
        insert: (record: TablesInsert<D, SchemaName, T>) =>
            insert(supabase, tableName, record),
        insertMany: (records: TablesInsert<D, SchemaName, T>[]) =>
            insertMany(supabase, tableName, records),
        upsert: (record: TablesInsert<D, SchemaName, T>) =>
            upsert(supabase, tableName, record),
        upsertMany: (records: TablesInsert<D, SchemaName, T>[]) =>
            upsertMany(supabase, tableName, records),
        update: (id: string, updates: TablesUpdate<D, SchemaName, T>) =>
            update(supabase, tableName, id, updates),
        updateByColumn: <K extends keyof Tables<D, SchemaName, T>>(
            column: K,
            value: Tables<D, SchemaName, T>[K],
            updates: TablesUpdate<D, SchemaName, T>
        ) =>
            updateByColumn(
                supabase,
                tableName,
                column,
                value,
                updates
            ),

        // Delete
        delete: (id: string) => del(supabase, tableName, id),
        deleteByColumn: <K extends keyof Tables<D, SchemaName, T>>(
            column: K,
            value: Tables<D, SchemaName, T>[K]
        ) =>
            deleteByColumn(
                supabase,
                tableName,
                column,
                value
            ),
        deleteMany: (ids: string[]) => deleteMany(supabase, tableName, ids),

        // Advanced
        count: (filters?: Partial<Tables<D, SchemaName, T>>) =>
            count(supabase, tableName, filters),
        exists: (id: string) => exists(supabase, tableName, id),
        search: (
            column: keyof Tables<D, SchemaName, T>,
            searchTerm: string,
            options?: {
                ilike?: boolean;
                limit?: number;
                offset?: number;
            }
        ) => search(supabase, tableName, column, searchTerm, options),

        // Realtime
        subscribeToAll: (
            callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void
        ) => subscribeToAll(supabase, tableName, callback),
        subscribeToInserts: (
            callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void
        ) => subscribeToInserts(supabase, tableName, callback),
        subscribeToUpdates: (
            callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void
        ) => subscribeToUpdates(supabase, tableName, callback),
        subscribeToDeletes: (
            callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void
        ) => subscribeToDeletes(supabase, tableName, callback),
        subscribeToFilter: (
            filter: string,
            callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void,
            channelSuffix?: string
        ) =>
            subscribeToFilter(
                supabase,
                tableName,
                filter,
                callback,
                channelSuffix
            ),
        subscribeToColumnFilter: <K extends keyof Tables<D, SchemaName, T>>(
            column: K,
            value: Tables<D, SchemaName, T>[K],
            callback: (payload: RealtimePostgresChangesPayload<Tables<D, SchemaName, T>>) => void
        ) =>
            subscribeToColumnFilter(supabase, tableName, column, value, callback),

        // Composite
        findOrCreate: (
            searchCriteria: Partial<Tables<D, SchemaName, T>>,
            createData: TablesInsert<D, SchemaName, T>
        ) =>
            findOrCreate(
                supabase,
                tableName,
                searchCriteria,
                createData
            ),
        softDelete: (
            id: string,
            deletedAtColumn: keyof TablesUpdate<D, SchemaName, T> = 'deleted_at' as keyof TablesUpdate<D, SchemaName, T>
        ) =>
            softDelete(
                supabase,
                tableName,
                id,
                deletedAtColumn
            ),
    };
}