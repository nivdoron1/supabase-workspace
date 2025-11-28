import path from 'path';
import fs from 'fs-extra';
import inquirer from 'inquirer';
import { execa } from 'execa';

// Template files content
const DATABASE_TYPES_TEMPLATE = `export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = any;

export type Tables<
    Database = any,
    SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database,
    TableName extends string & keyof (Database[SchemaName] extends { Tables: any }
        ? Database[SchemaName]['Tables']
        : any) = string & keyof (Database[SchemaName] extends { Tables: any }
            ? Database[SchemaName]['Tables']
            : any)
> = (Database[SchemaName] extends { Tables: any }
    ? Database[SchemaName]['Tables']
    : any)[TableName] extends { Row: infer R }
    ? R
    : any

export type TablesInsert<
    Database = any,
    SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database,
    TableName extends string & keyof (Database[SchemaName] extends { Tables: any }
        ? Database[SchemaName]['Tables']
        : any) = string & keyof (Database[SchemaName] extends { Tables: any }
            ? Database[SchemaName]['Tables']
            : any)
> = (Database[SchemaName] extends { Tables: any }
    ? Database[SchemaName]['Tables']
    : any)[TableName] extends { Insert: infer I }
    ? I
    : any

export type TablesUpdate<
    Database = any,
    SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database,
    TableName extends string & keyof (Database[SchemaName] extends { Tables: any }
        ? Database[SchemaName]['Tables']
        : any) = string & keyof (Database[SchemaName] extends { Tables: any }
            ? Database[SchemaName]['Tables']
            : any)
> = (Database[SchemaName] extends { Tables: any }
    ? Database[SchemaName]['Tables']
    : any)[TableName] extends { Update: infer U }
    ? U
    : any

export type Enums<
    Database = any,
    SchemaName extends string & keyof Database = 'public' extends keyof Database
    ? 'public'
    : string & keyof Database,
    EnumName extends string & keyof (Database[SchemaName] extends { Enums: any }
        ? Database[SchemaName]['Enums']
        : any) = string & keyof (Database[SchemaName] extends { Enums: any }
            ? Database[SchemaName]['Enums']
            : any)
> = (Database[SchemaName] extends { Enums: any }
    ? Database[SchemaName]['Enums']
    : any)[EnumName]
`;

const VITE_ENV_TEMPLATE = `/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PUBLIC_SUPABASE_URL: string
    readonly VITE_PUBLIC_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
`;

const DATABASE_SERVICE_TEMPLATE = `/* eslint-disable */
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
 * This is a pure function version of the old \`staticFilters\` method.
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
    const fullSelect = extension ? \`\${extension}\` : \`\${selectString}\`;

    let query = supabase
        .from(tableName)
        .select(fullSelect, { count: 'exact' });

    query = applyFilters(query, filters);

    if (search) {
        const { column, value, ilike = true } = search;
        query = ilike
            ? query.ilike(column as string, \`%\${value}%\`)
            : query.like(column as string, \`%\${value}%\`);
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
        query = query.ilike(column as string, \`%\${searchTerm}%\`);
    } else {
        query = query.like(column as string, \`%\${searchTerm}%\`);
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
        .channel(\`\${String(tableName)}-all\`)
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
        .channel(\`\${String(tableName)}-insert\`)
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
        .channel(\`\${String(tableName)}-update\`)
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
        .channel(\`\${String(tableName)}-delete\`)
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
    const channelName = \`\${String(tableName)}-filter\${channelSuffix ? \`-\${channelSuffix}\` : ''
        }\`;
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
        \`\${String(column)}=eq.\${value}\`,
        callback,
        \`\${String(column)}-\${value}\`
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
`;

const GENERATE_TEMPLATE = `/* eslint-disable */
// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const supabase_workspace_name = path.basename(path.resolve(__dirname, '../../../'));

// Get types path from command line argument or use default
const typesPathArg = process.argv[2];
if (!typesPathArg) {
    console.error('❌ Error: Types path argument is required');
    console.error('Usage: node generate.js <path-to-types.ts>');
    process.exit(1);
}

// Resolve the absolute path to the types file
const typesFilePath = path.isAbsolute(typesPathArg)
    ? typesPathArg
    : path.resolve(process.cwd(), typesPathArg);

if (!fs.existsSync(typesFilePath)) {
    console.error(\`❌ Error: Types file not found at \${typesFilePath}\`);
    process.exit(1);
}

const outputBasePath = path.join(process.cwd(), 'src/lib/api'); // Output to current package's src/lib/api

interface RelationshipInfo {
    targetTable: string;
    isArray: boolean; // true for one-to-many, false for many-to-one/one-to-one
    foreignKey: string; // The foreign key constraint name
}

function extractTableAndViewNamesFromTypes(): Record<string, boolean> {
    try {
        const content = fs.readFileSync(typesFilePath, 'utf8');

        const extractBlockNames = (blockName: 'Tables' | 'Views') => {
            const blockStart = content.indexOf(\`\${blockName}: {\`);
            if (blockStart === -1) {
                console.warn(\`⚠️  Could not find \${blockName} block\`);
                return [];
            }

            const lines = content.slice(blockStart).split('\\n');
            const names: string[] = [];

            let depth = 0;
            let insideBlock = false;

            for (const line of lines) {
                if (line.includes(\`\${blockName}: {\`)) {
                    insideBlock = true;
                    depth = 1;
                    continue;
                }

                if (!insideBlock) continue;

                const openBraces = (line.match(/{/g) || []).length;
                const closeBraces = (line.match(/}/g) || []).length;
                depth += openBraces - closeBraces;

                // Match lines like "chat_conversations: {"
                const match = line.match(/^\\s*([a-zA-Z0-9_]+):\\s*{\\s*$/);
                if (match) {
                    const name = match[1];
                    if (!['Row', 'Insert', 'Update', 'Relationships'].includes(name)) {
                        names.push(name);
                    }
                }

                if (depth === 0) break;
            }

            return names;
        };

        const tables = extractBlockNames('Tables');
        const views = extractBlockNames('Views');
        return {
            ...Object.fromEntries(tables.map((t) => [t, false])),
            ...Object.fromEntries(views.map((v) => [v, true])),
        };
    } catch (err) {
        console.error('❌ Failed to extract table/view names:', err);
        return {};
    }
}

function extractRelationshipsFromTypes(): Record<string, RelationshipInfo[]> {
    try {
        const content = fs.readFileSync(typesFilePath, 'utf8');

        const relationships: Record<string, RelationshipInfo[]> = {};

        // Find the Tables block and extract relationships for each table
        const tablesStart = content.indexOf('Tables: {');
        if (tablesStart === -1) {
            console.warn('⚠️  Could not find Tables block for relationships');
            return {};
        }

        const tablesContent = content.slice(tablesStart);
        const lines = tablesContent.split('\\n');

        let currentTable = '';
        let insideRelationships = false;
        let depth = 0;
        let insideRelationshipObject = false;
        let currentRelationship: Partial<RelationshipInfo & { foreignKeyName: string }> =
            {};

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Check if we're entering a table definition
            const tableMatch = line.match(/^\\s*([a-zA-Z0-9_]+):\\s*{\\s*$/);
            if (
                tableMatch &&
                !['Row', 'Insert', 'Update', 'Relationships'].includes(tableMatch[1])
            ) {
                currentTable = tableMatch[1];
                relationships[currentTable] = [];
                insideRelationships = false;
                depth = 1;
                continue;
            }

            if (!currentTable) continue;

            // Track depth for table structure
            const openBraces = (line.match(/{/g) || []).length;
            const closeBraces = (line.match(/}/g) || []).length;
            depth += openBraces - closeBraces;

            // Check if we're entering Relationships block
            if (trimmedLine === 'Relationships: [') {
                insideRelationships = true;
                continue;
            }

            if (insideRelationships) {
                // Check if we're starting a new relationship object
                if (trimmedLine === '{') {
                    insideRelationshipObject = true;
                    currentRelationship = {};
                    continue;
                }

                // Check if we're ending a relationship object
                if (trimmedLine === '}' || trimmedLine === '},') {
                    if (
                        insideRelationshipObject &&
                        currentRelationship.targetTable &&
                        currentRelationship.foreignKey
                    ) {
                        // Check for duplicates before adding
                        const exists = relationships[currentTable].some(
                            (rel) =>
                                rel.targetTable === currentRelationship.targetTable &&
                                rel.foreignKey === currentRelationship.foreignKey
                        );

                        if (!exists) {
                            relationships[currentTable].push({
                                targetTable: currentRelationship.targetTable!,
                                isArray: currentRelationship.isArray!,
                                foreignKey: currentRelationship.foreignKey!,
                            });
                        }
                    }
                    insideRelationshipObject = false;
                    currentRelationship = {};
                    continue;
                }

                if (insideRelationshipObject) {
                    // Extract foreignKeyName
                    const foreignKeyMatch = trimmedLine.match(
                        /foreignKeyName:\\s*"([^"]+)"/
                    );
                    if (foreignKeyMatch) {
                        currentRelationship.foreignKey = foreignKeyMatch[1];
                    }

                    // Extract referencedRelation (this is the actual target table)
                    const referencedRelationMatch = trimmedLine.match(
                        /referencedRelation:\\s*"([^"]+)"/
                    );
                    if (referencedRelationMatch) {
                        currentRelationship.targetTable = referencedRelationMatch[1];
                    }

                    // Extract isOneToOne
                    const isOneToOneMatch = trimmedLine.match(
                        /isOneToOne:\\s*(true|false)/
                    );
                    if (isOneToOneMatch) {
                        currentRelationship.isArray = isOneToOneMatch[1] === 'false';
                    }
                }

                // Exit relationships block
                if (trimmedLine === ']') {
                    insideRelationships = false;
                }
            }

            // Exit table if depth returns to 0
            if (depth === 0) {
                currentTable = '';
            }
        }

        console.log(
            '📊 Extracted relationships:',
            JSON.stringify(relationships, null, 2)
        );
        return relationships;
    } catch (err) {
        console.error('❌ Failed to extract relationships:', err);
        return {};
    }
}

// Example: Get all table names from the Database type
const tableNames: Record<string, boolean> = extractTableAndViewNamesFromTypes();
const relationships: Record<string, RelationshipInfo[]> =
    extractRelationshipsFromTypes();

// Util to write a file with content
function writeFile(folderPath: string, fileName: string, content: string) {
    const filePath = path.join(folderPath, fileName);
    if (fs.existsSync(filePath)) {
        console.log(\`⏩ Skipped (already exists): \${filePath}\`);
        return;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(\`✅ Created \${filePath}\`);
}

// Template for types.ts with relationships
function typesTemplate(tableName: string, isViews?: boolean) {
    const cap = capitalize(tableName);
    const tableRelationships = relationships[tableName] || [];

    // Generate relationship type definitions
    const relationshipTypes = tableRelationships
        .map((rel) => {
            const relationshipType = rel.isArray
                ? \`Tables<'\${rel.targetTable}'>[]\`
                : \`Tables<'\${rel.targetTable}'> | null\`;

            // Use target table name as property name instead of foreign key name
            const propertyName = rel.isArray ? rel.targetTable : rel.targetTable;

            return \`  \${propertyName}?: \${relationshipType};\`;
        })
        .join('\\n');

    const hasRelationships = relationshipTypes.length > 0;

    if (isViews) {
        const baseType = \`import type { Tables } from '../../../types';

export type \${cap} = Tables<'\${tableName}'>\`;

        if (hasRelationships) {
            return \`\${baseType} & {
\${relationshipTypes}
};\`;
        } else {
            return \`\${baseType};\`;
        }
    }

    const baseTypes = \`import type { Tables, TablesInsert, TablesUpdate } from '../../../types';

export type \${cap} = Tables<'\${tableName}'>\`;

    const insertUpdateTypes = \`export type \${cap}Insert = TablesInsert<'\${tableName}'>;
export type \${cap}Update = TablesUpdate<'\${tableName}'>;\`;

    if (hasRelationships) {
        return \`\${baseTypes} & {
\${relationshipTypes}
};

\${insertUpdateTypes}\`;
    } else {
        return \`\${baseTypes};

\${insertUpdateTypes}\`;
    }
}

// --- TEMPLATES UPDATED ---

// NEW: Template for service.ts (Pure Function Style)
function serviceTemplate(tableName: string) {
    const serviceName = camelCase(tableName) + 'Service'; // e.g., driveWatchesService

    return \`import { SupabaseService } from '@\${supabase_workspace_name}/supabase-core';
import { supabase } from '../../../client';

/**
 * A pre-configured service object for interacting
 * with the '\${tableName}' table.
 *
 * This object contains all generic CRUD methods.
 * You can add custom, table-specific methods to this object.
 */
export const \${serviceName} = {
  ...SupabaseService(supabase, '\${tableName}'),

  // --- Add custom methods below ---
  //
  // Example custom method:
  // async getActiveItems() {
  //   const { data, error } = await supabase
  //     .from('\${tableName}')
  //     .select('*')
  //     .eq('is_active', true);
  //
  //   if (error) throw error;
  //   return data || [];
  // }
  //
  // --- End custom methods ---
};
\`;
}

// REMOVED: engineTemplate function

// --- HELPERS UPDATED ---

// Capitalize helper
function capitalize(str: string) {
    return str
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

// NEW: camelCase helper
function camelCase(str: string) {
    const pascal = capitalize(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

// --- GENERATOR UPDATED ---

// Main generator
function generate() {
    if (!fs.existsSync(outputBasePath)) {
        fs.mkdirSync(outputBasePath, { recursive: true });
    }

    const serviceImports: string[] = [];

    for (const [tableName, isView] of Object.entries(tableNames)) {
        const folderPath = path.join(outputBasePath, tableName);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        writeFile(
            folderPath,
            \`\${tableName}.types.ts\`,
            typesTemplate(tableName, isView)
        );
        writeFile(folderPath, 'service.ts', serviceTemplate(tableName));
        // REMOVED: writeFile(folderPath, 'engine.ts', engineTemplate(tableName));

        // For index.ts
        serviceImports.push(\`export * from './\${tableName}/service';\`); // UPDATED
    }

    // Generate index.ts
    const indexContent = [...serviceImports].join('\\n');
    writeFile(outputBasePath, 'index.ts', indexContent);

    console.log('🎉 Generation complete with relationships!');
}

generate();
`;

async function run() {
    const args = process.argv.slice(2);
    const workspaceName = args[0] || 'supabase-workspace';
    const targetDir = path.resolve(process.cwd(), workspaceName);

    if (await fs.pathExists(targetDir)) {
        console.error(`Directory ${workspaceName} already exists. Choose a different name.`);
        process.exit(1);
    }

    // Prompt for additional info
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'gitUrl',
            message: 'Enter Git repository URL (optional):',
        },
        {
            type: 'confirm',
            name: 'createVite',
            message: 'Do you want to create an example Vite app?',
            default: true,
        },
    ]);

    const { gitUrl, createVite } = answers;

    // Create workspace directory
    await fs.mkdirp(targetDir);
    console.log(`Created workspace directory: ${workspaceName}`);

    // Create empty yarn.lock to isolate workspace
    await fs.writeFile(path.join(targetDir, 'yarn.lock'), '');

    // Initialise Yarn workspace
    await execa('yarn', ['init', '-y'], { cwd: targetDir, stdio: 'inherit' });

    // Configure root package.json
    const pkgPath = path.join(targetDir, 'package.json');
    const pkg = await fs.readJson(pkgPath);

    pkg.private = true;
    pkg.workspaces = ['packages/*', 'apps/*'];
    pkg.packageManager = 'yarn@4.12.0';
    pkg.version = '1.0.0';

    if (gitUrl) {
        pkg.repository = gitUrl;
    }

    pkg.scripts = {
        "build": "yarn workspaces foreach --all run build",
        "dev": createVite ? "yarn workspace example run dev" : "echo 'No app to run'",
        "clean": "yarn workspaces foreach --all run clean || true",
        "new-supabase": "./scripts/generate-supabase-package.sh"
    };

    pkg.devDependencies = {
        "typescript": "^5.3.0",
        "vite": "^5.0.0"
    };

    await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    console.log('Configured Yarn workspaces and package.json');

    // Create README.md
    const readmeContent = `# ${workspaceName}

This is a Supabase monorepo workspace generated with \`supabase-workspace-cli\`.

## Structure

- \`packages/supabase-core\`: Core Supabase client and types.
- \`apps/\`: Application packages (e.g., Vite apps).
- \`scripts/\`: Utility scripts.

## Getting Started

1.  Install dependencies:
    \`\`\`bash
    yarn install
    \`\`\`

2.  Build packages:
    \`\`\`bash
    yarn build
    \`\`\`

3.  ${createVite ? 'Run the example app:\n    ```bash\n    yarn dev\n    ```' : 'Create a new app in `apps/`.'}

## Scripts

- \`yarn build\`: Build all workspaces.
- \`yarn dev\`: Run the development server (defaults to example app if present).
- \`yarn clean\`: Clean all workspaces.
- \`yarn new-supabase\`: Generate a new Supabase instance package.
`;
    await fs.writeFile(path.join(targetDir, 'README.md'), readmeContent);
    console.log('Created README.md');

    // Create supabase-core package
    const coreDir = path.join(targetDir, 'packages', 'supabase-core');
    await fs.mkdirp(coreDir);

    // Create supabase-core package.json
    const corePackageJson = {
        name: `@${workspaceName}/supabase-core`,
        version: '1.0.0',
        description: 'Core Supabase client and types for workspace',
        main: 'dist/index.js',
        types: 'dist/index.d.ts',
        scripts: {
            build: 'tsc',
            dev: 'tsc --watch'
        },
        keywords: ['supabase', 'client'],
        license: 'MIT',
        dependencies: {
            '@supabase/supabase-js': '^2.84.0'
        },
        devDependencies: {
            typescript: '^5.3.0'
        }
    };
    await fs.writeJson(path.join(coreDir, 'package.json'), corePackageJson, { spaces: 4 });

    // Create supabase-core tsconfig.json
    const coreTsConfig = {
        compilerOptions: {
            target: 'ES2020',
            module: 'ESNext',
            lib: ['ES2020', 'DOM'],
            declaration: true,
            outDir: './dist',
            rootDir: './src',
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            moduleResolution: 'bundler',
            resolveJsonModule: true,
            types: ['vite/client']
        },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist']
    };
    await fs.writeJson(path.join(coreDir, 'tsconfig.json'), coreTsConfig, { spaces: 4 });

    // Create src directory and files
    const srcDir = path.join(coreDir, 'src');
    await fs.mkdirp(srcDir);

    // Write database.types.ts
    await fs.writeFile(path.join(srcDir, 'database.types.ts'), DATABASE_TYPES_TEMPLATE);

    // Write vite-env.d.ts
    await fs.writeFile(path.join(srcDir, 'vite-env.d.ts'), VITE_ENV_TEMPLATE);

    // Write database.service.ts
    await fs.writeFile(path.join(srcDir, 'database.service.ts'), DATABASE_SERVICE_TEMPLATE);

    // Write generate.ts
    await fs.writeFile(path.join(srcDir, 'generate.ts'), GENERATE_TEMPLATE);

    // Write index.ts
    const indexTs = `
// Export types
export * from './database.types';

export * from './database.service';

`;
    await fs.writeFile(path.join(srcDir, 'index.ts'), indexTs);

    // Copy scripts directory if it exists
    const referenceScriptsPath = path.join(__dirname, '../../scripts');
    const targetScriptsPath = path.join(targetDir, 'scripts');

    if (await fs.pathExists(referenceScriptsPath)) {
        await fs.copy(referenceScriptsPath, targetScriptsPath);
        console.log('Copied scripts directory');
    }

    console.log('Created supabase-core package with all files');

    if (createVite) {
        const appDir = path.join(targetDir, 'apps', 'example');
        await fs.mkdirp(path.dirname(appDir));
        await execa('yarn', ['create', 'vite', 'example', '--template', 'react-ts'], {
            cwd: path.join(targetDir, 'apps'),
            stdio: 'inherit',
        });
        console.log('Created example Vite app');
    }

    console.log('');
    console.log('🎉 Workspace setup complete!');
    console.log('');
    console.log('Next steps:');
    console.log(`  cd ${workspaceName}`);
    console.log('  yarn install');
    console.log('  cd packages/supabase-core && yarn build');
    if (createVite) {
        console.log('  cd apps/example && yarn dev');
    }
    console.log('');
}

run().catch(err => {
    console.error('Error during workspace creation:', err);
    process.exit(1);
});
