const DatabaseConnection = require('../models/database.connection.model');
const connectionService = require('./connection.service');
const mongoDBService = require('./mongodb.service');
const mysqlService = require('./mysql.service');
const postgresService = require('./postgresql.service');

class SchemaAnalyzerService {
    async analyzeSchema(dbConnectionId, userId, metadata = {}) {
        console.log(`[SchemaAnalyzerService] Analyzing database schema: ${dbConnectionId}`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            let schema;

            switch (dbConnection.type) {
                case 'mongodb':
                    schema = await this.analyzeMongoDBSchema(dbConnectionId);
                    break;
                case 'mysql':
                case 'mariadb':
                    schema = await this.analyzeMySQLSchema(dbConnectionId);
                    break;
                case 'postgresql':
                    schema = await this.analyzePostgresSchema(dbConnectionId);
                    break;
                default:
                    throw new Error(`Unsupported database type: ${dbConnection.type}`);
            }

            dbConnection.schema = schema;
            dbConnection.schema.analyzed = true;
            dbConnection.schema.analyzedAt = new Date();

            await dbConnection.save();

            console.log(`[SchemaAnalyzerService] Schema analysis completed for ${dbConnection.name}`);
            return schema;
        } catch (error) {
            console.error(`[SchemaAnalyzerService] Error analyzing schema:`, error.message);
            throw error;
        }
    }

    async analyzeMongoDBSchema(dbConnectionId) {
        console.log(`[SchemaAnalyzerService] Analyzing MongoDB schema`);

        try {
            const collections = await mongoDBService.getCollections(dbConnectionId);
            const collectionSchemas = [];

            for (const collectionName of collections) {
                try {
                    const collectionSchema = await mongoDBService.analyzeCollectionSchema(dbConnectionId, collectionName);
                    collectionSchemas.push(collectionSchema);
                } catch (error) {
                    console.warn(`[SchemaAnalyzerService] Error analyzing collection ${collectionName}:`, error.message);
                }
            }

            return {
                type: 'mongodb',
                collections: collectionSchemas,
                totalCollections: collectionSchemas.length
            };
        } catch (error) {
            console.error(`[SchemaAnalyzerService] Error analyzing MongoDB schema:`, error.message);
            throw error;
        }
    }

    async analyzeMySQLSchema(dbConnectionId) {
        console.log(`[SchemaAnalyzerService] Analyzing MySQL schema`);

        try {
            const tables = await mysqlService.getTables(dbConnectionId);
            const tableSchemas = [];

            for (const tableName of tables) {
                try {
                    const tableSchema = await mysqlService.getTableSchema(dbConnectionId, tableName);
                    const foreignKeys = await mysqlService.getForeignKeys(dbConnectionId, tableName);

                    tableSchemas.push({
                        ...tableSchema,
                        foreignKeys: foreignKeys
                    });
                } catch (error) {
                    console.warn(`[SchemaAnalyzerService] Error analyzing table ${tableName}:`, error.message);
                }
            }

            const relationships = this.detectTableRelationships(tableSchemas);

            return {
                type: 'mysql',
                tables: tableSchemas,
                totalTables: tableSchemas.length,
                relationships: relationships
            };
        } catch (error) {
            console.error(`[SchemaAnalyzerService] Error analyzing MySQL schema:`, error.message);
            throw error;
        }
    }

    async analyzePostgresSchema(dbConnectionId) {
        console.log(`[SchemaAnalyzerService] Analyzing PostgreSQL schema`);

        try {
            const tables = await postgresService.getTables(dbConnectionId);
            const tableSchemas = [];

            for (const tableName of tables) {
                try {
                    const tableSchema = await postgresService.getTableSchema(dbConnectionId, tableName);
                    const foreignKeys = await postgresService.getForeignKeys(dbConnectionId, tableName);
                    const relationships = await postgresService.getTableRelationships(dbConnectionId, tableName);

                    tableSchemas.push({
                        ...tableSchema,
                        foreignKeys: foreignKeys,
                        relationships: relationships
                    });
                } catch (error) {
                    console.warn(`[SchemaAnalyzerService] Error analyzing table ${tableName}:`, error.message);
                }
            }

            const relationships = this.detectTableRelationships(tableSchemas);

            return {
                type: 'postgresql',
                tables: tableSchemas,
                totalTables: tableSchemas.length,
                relationships: relationships
            };
        } catch (error) {
            console.error(`[SchemaAnalyzerService] Error analyzing PostgreSQL schema:`, error.message);
            throw error;
        }
    }

    detectTableRelationships(tableSchemas) {
        console.log(`[SchemaAnalyzerService] Detecting table relationships`);

        const relationships = [];

        tableSchemas.forEach(table => {
            if (table.foreignKeys) {
                table.foreignKeys.forEach(fk => {
                    relationships.push({
                        from: table.name,
                        to: fk.referencedTable,
                        type: 'foreign_key',
                        column: fk.column,
                        referencedColumn: fk.referencedColumn
                    });
                });
            }
        });

        console.log(`[SchemaAnalyzerService] Found ${relationships.length} relationships`);
        return relationships;
    }

    async detectDataTypes(dbConnectionId) {
        console.log(`[SchemaAnalyzerService] Detecting data types used in schema`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);
            const dataTypes = new Set();

            if (dbConnection.schema && dbConnection.schema.tables) {
                dbConnection.schema.tables.forEach(table => {
                    table.columns?.forEach(column => {
                        dataTypes.add(column.type);
                    });
                });
            }

            console.log(`[SchemaAnalyzerService] Found ${dataTypes.size} different data types`);
            return Array.from(dataTypes);
        } catch (error) {
            console.error(`[SchemaAnalyzerService] Error detecting data types:`, error.message);
            throw error;
        }
    }

    async detectIndexes(dbConnectionId) {
        console.log(`[SchemaAnalyzerService] Detecting all indexes in schema`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);
            const indexes = [];

            if (dbConnection.type === 'mongodb' && dbConnection.schema?.collections) {
                for (const collection of dbConnection.schema.collections) {
                    const collectionIndexes = await mongoDBService.getIndexes(dbConnectionId, collection.name);
                    indexes.push(...collectionIndexes.map(idx => ({ collection: collection.name, ...idx })));
                }
            } else if ((dbConnection.type === 'mysql' || dbConnection.type === 'postgresql') && dbConnection.schema?.tables) {
                dbConnection.schema.tables.forEach(table => {
                    table.indexes?.forEach(idx => {
                        indexes.push({ table: table.name, ...idx });
                    });
                });
            }

            console.log(`[SchemaAnalyzerService] Found ${indexes.length} indexes`);
            return indexes;
        } catch (error) {
            console.error(`[SchemaAnalyzerService] Error detecting indexes:`, error.message);
            throw error;
        }
    }

    async generateEntityRelationshipDiagram(dbConnectionId) {
        console.log(`[SchemaAnalyzerService] Generating Entity Relationship Diagram`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection.schema) {
                throw new Error('Schema not analyzed. Please run schema analysis first.');
            }

            const entities = [];
            const relationships = dbConnection.schema.relationships || [];

            if (dbConnection.schema.tables) {
                dbConnection.schema.tables.forEach(table => {
                    entities.push({
                        name: table.name,
                        attributes: table.columns?.map(col => ({
                            name: col.name,
                            type: col.type,
                            isPrimaryKey: col.isPrimaryKey
                        })) || []
                    });
                });
            }

            const erd = {
                entities: entities,
                relationships: relationships.map(r => ({
                    from: r.from,
                    to: r.to,
                    type: r.type
                }))
            };

            console.log(`[SchemaAnalyzerService] ERD generated with ${entities.length} entities and ${relationships.length} relationships`);
            return erd;
        } catch (error) {
            console.error(`[SchemaAnalyzerService] Error generating ERD:`, error.message);
            throw error;
        }
    }

    async detectDataAnomalies(dbConnectionId) {
        console.log(`[SchemaAnalyzerService] Detecting data anomalies in schema`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);
            const anomalies = [];

            if (dbConnection.type === 'mongodb' && dbConnection.schema?.collections) {
                for (const collection of dbConnection.schema.collections) {
                    if (collection.count === 0) {
                        anomalies.push({
                            type: 'empty_collection',
                            name: collection.name,
                            severity: 'warning'
                        });
                    }
                }
            } else if ((dbConnection.type === 'mysql' || dbConnection.type === 'postgresql') && dbConnection.schema?.tables) {
                for (const table of dbConnection.schema.tables) {
                    if (table.rowCount === 0) {
                        anomalies.push({
                            type: 'empty_table',
                            name: table.name,
                            severity: 'warning'
                        });
                    }

                    const nullableColumns = table.columns?.filter(c => c.nullable) || [];
                    if (nullableColumns.length === table.columns?.length) {
                        anomalies.push({
                            type: 'all_columns_nullable',
                            name: table.name,
                            severity: 'medium',
                            columns: nullableColumns.map(c => c.name)
                        });
                    }
                }
            }

            console.log(`[SchemaAnalyzerService] Found ${anomalies.length} data anomalies`);
            return anomalies;
        } catch (error) {
            console.error(`[SchemaAnalyzerService] Error detecting anomalies:`, error.message);
            throw error;
        }
    }

    async getSchemaComparison(dbConnectionId1, dbConnectionId2) {
        console.log(`[SchemaAnalyzerService] Comparing schemas between two databases`);

        try {
            const db1 = await DatabaseConnection.findById(dbConnectionId1);
            const db2 = await DatabaseConnection.findById(dbConnectionId2);

            if (!db1 || !db2) {
                throw new Error('One or both database connections not found');
            }

            const comparison = {
                database1: db1.name,
                database2: db2.name,
                commonEntities: [],
                uniqueToDb1: [],
                uniqueToDb2: [],
                differences: []
            };

            const db1Names = new Set();
            const db2Names = new Set();

            if (db1.schema?.tables) {
                db1.schema.tables.forEach(t => db1Names.add(t.name));
            }

            if (db2.schema?.tables) {
                db2.schema.tables.forEach(t => db2Names.add(t.name));
            }

            comparison.commonEntities = Array.from(db1Names).filter(name => db2Names.has(name));
            comparison.uniqueToDb1 = Array.from(db1Names).filter(name => !db2Names.has(name));
            comparison.uniqueToDb2 = Array.from(db2Names).filter(name => !db1Names.has(name));

            console.log(`[SchemaAnalyzerService] Schema comparison completed: ${comparison.commonEntities.length} common entities`);
            return comparison;
        } catch (error) {
            console.error(`[SchemaAnalyzerService] Error comparing schemas:`, error.message);
            throw error;
        }
    }

    async generateSchemaSummary(dbConnectionId) {
        console.log(`[SchemaAnalyzerService] Generating schema summary`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection.schema) {
                throw new Error('Schema not analyzed');
            }

            const summary = {
                databaseName: dbConnection.name,
                databaseType: dbConnection.type,
                analyzedAt: dbConnection.schema.analyzedAt
            };

            if (dbConnection.type === 'mongodb') {
                summary.collections = dbConnection.schema.totalCollections;
                summary.totalDocuments = dbConnection.schema.collections?.reduce((sum, c) => sum + (c.count || 0), 0) || 0;
            } else {
                summary.tables = dbConnection.schema.totalTables;
                summary.totalRows = dbConnection.schema.tables?.reduce((sum, t) => sum + (t.rowCount || 0), 0) || 0;
                summary.relationships = (dbConnection.schema.relationships || []).length;
            }

            console.log(`[SchemaAnalyzerService] Schema summary generated`);
            return summary;
        } catch (error) {
            console.error(`[SchemaAnalyzerService] Error generating schema summary:`, error.message);
            throw error;
        }
    }
}

module.exports = new SchemaAnalyzerService();