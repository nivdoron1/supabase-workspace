export type Json =
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
