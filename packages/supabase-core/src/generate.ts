/* eslint-disable */
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
    console.error(`❌ Error: Types file not found at ${typesFilePath}`);
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
            const blockStart = content.indexOf(`${blockName}: {`);
            if (blockStart === -1) {
                console.warn(`⚠️  Could not find ${blockName} block`);
                return [];
            }

            const lines = content.slice(blockStart).split('\n');
            const names: string[] = [];

            let depth = 0;
            let insideBlock = false;

            for (const line of lines) {
                if (line.includes(`${blockName}: {`)) {
                    insideBlock = true;
                    depth = 1;
                    continue;
                }

                if (!insideBlock) continue;

                const openBraces = (line.match(/{/g) || []).length;
                const closeBraces = (line.match(/}/g) || []).length;
                depth += openBraces - closeBraces;

                // Match lines like "chat_conversations: {"
                const match = line.match(/^\s*([a-zA-Z0-9_]+):\s*{\s*$/);
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
        const lines = tablesContent.split('\n');

        let currentTable = '';
        let insideRelationships = false;
        let depth = 0;
        let insideRelationshipObject = false;
        let currentRelationship: Partial<RelationshipInfo & { foreignKeyName: string }> =
            {};

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Check if we're entering a table definition
            const tableMatch = line.match(/^\s*([a-zA-Z0-9_]+):\s*{\s*$/);
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
                        /foreignKeyName:\s*"([^"]+)"/
                    );
                    if (foreignKeyMatch) {
                        currentRelationship.foreignKey = foreignKeyMatch[1];
                    }

                    // Extract referencedRelation (this is the actual target table)
                    const referencedRelationMatch = trimmedLine.match(
                        /referencedRelation:\s*"([^"]+)"/
                    );
                    if (referencedRelationMatch) {
                        currentRelationship.targetTable = referencedRelationMatch[1];
                    }

                    // Extract isOneToOne
                    const isOneToOneMatch = trimmedLine.match(
                        /isOneToOne:\s*(true|false)/
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
        console.log(`⏩ Skipped (already exists): ${filePath}`);
        return;
    }
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Created ${filePath}`);
}

// Template for types.ts with relationships
function typesTemplate(tableName: string, isViews?: boolean) {
    const cap = capitalize(tableName);
    const tableRelationships = relationships[tableName] || [];

    // Generate relationship type definitions
    const relationshipTypes = tableRelationships
        .map((rel) => {
            const relationshipType = rel.isArray
                ? `Tables<'${rel.targetTable}'>[]`
                : `Tables<'${rel.targetTable}'> | null`;

            // Use target table name as property name instead of foreign key name
            const propertyName = rel.isArray ? rel.targetTable : rel.targetTable;

            return `  ${propertyName}?: ${relationshipType};`;
        })
        .join('\n');

    const hasRelationships = relationshipTypes.length > 0;

    if (isViews) {
        const baseType = `import type { Tables } from '../../../types';

export type ${cap} = Tables<'${tableName}'>`;

        if (hasRelationships) {
            return `${baseType} & {
${relationshipTypes}
};`;
        } else {
            return `${baseType};`;
        }
    }

    const baseTypes = `import type { Tables, TablesInsert, TablesUpdate } from '../../../types';

export type ${cap} = Tables<'${tableName}'>`;

    const insertUpdateTypes = `export type ${cap}Insert = TablesInsert<'${tableName}'>;
export type ${cap}Update = TablesUpdate<'${tableName}'>;`;

    if (hasRelationships) {
        return `${baseTypes} & {
${relationshipTypes}
};

${insertUpdateTypes}`;
    } else {
        return `${baseTypes};

${insertUpdateTypes}`;
    }
}

// --- TEMPLATES UPDATED ---

// NEW: Template for service.ts (Pure Function Style)
function serviceTemplate(tableName: string) {
    const serviceName = camelCase(tableName) + 'Service'; // e.g., driveWatchesService

    return `import { SupabaseService } from '@${supabase_workspace_name}/supabase-core';
import { supabase } from '../../../client';

/**
 * A pre-configured service object for interacting
 * with the '${tableName}' table.
 *
 * This object contains all generic CRUD methods.
 * You can add custom, table-specific methods to this object.
 */
export const ${serviceName} = {
  ...SupabaseService(supabase, '${tableName}'),

  // --- Add custom methods below ---
  //
  // Example custom method:
  // async getActiveItems() {
  //   const { data, error } = await supabase
  //     .from('${tableName}')
  //     .select('*')
  //     .eq('is_active', true);
  //
  //   if (error) throw error;
  //   return data || [];
  // }
  //
  // --- End custom methods ---
};
`;
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
            `${tableName}.types.ts`,
            typesTemplate(tableName, isView)
        );
        writeFile(folderPath, 'service.ts', serviceTemplate(tableName));
        // REMOVED: writeFile(folderPath, 'engine.ts', engineTemplate(tableName));

        // For index.ts
        serviceImports.push(`export * from './${tableName}/service';`); // UPDATED
    }

    // Generate index.ts
    const indexContent = [...serviceImports].join('\n');
    writeFile(outputBasePath, 'index.ts', indexContent);

    console.log('🎉 Generation complete with relationships!');
}

generate();