const DatabaseConnection = require('../models/database.connection.model');
const connectionService = require('./connection.service');

class MongoDBService {
    async getCollections(dbConnectionId) {
        console.log(`[MongoDBService] Fetching collections for database: ${dbConnectionId}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collections = await connection.db.listCollections().toArray();
            console.log(`[MongoDBService] Found ${collections.length} collections`);

            return collections.map(c => c.name);
        } catch (error) {
            console.error(`[MongoDBService] Error fetching collections:`, error.message);
            throw error;
        }
    }

    async analyzeCollectionSchema(dbConnectionId, collectionName) {
        console.log(`[MongoDBService] Analyzing schema for collection: ${collectionName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collection = connection.db.collection(collectionName);
            const sampleCount = 10;
            const samples = await collection.find({}).limit(sampleCount).toArray();

            const schema = this.inferSchema(samples);
            const count = await collection.countDocuments();

            console.log(`[MongoDBService] Schema analysis completed for ${collectionName}: ${count} documents`);

            return {
                name: collectionName,
                count: count,
                schema: schema,
                sampleSize: samples.length
            };
        } catch (error) {
            console.error(`[MongoDBService] Error analyzing schema:`, error.message);
            throw error;
        }
    }

    inferSchema(documents) {
        console.log(`[MongoDBService] Inferring schema from ${documents.length} documents`);

        const schema = {};

        documents.forEach(doc => {
            Object.keys(doc).forEach(key => {
                if (key === '_id') return;

                const value = doc[key];
                const type = this.getType(value);

                if (!schema[key]) {
                    schema[key] = {
                        name: key,
                        types: new Set(),
                        nullable: false,
                        examples: []
                    };
                }

                schema[key].types.add(type);
                schema[key].nullable = schema[key].nullable || value === null;

                if (schema[key].examples.length < 3) {
                    schema[key].examples.push(value);
                }
            });
        });

        return Object.values(schema).map(field => ({
            name: field.name,
            types: Array.from(field.types),
            nullable: field.nullable,
            examples: field.examples
        }));
    }

    getType(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (Array.isArray(value)) return 'array';
        if (value instanceof Date) return 'date';
        if (value instanceof Object) return 'object';
        return typeof value;
    }

    async queryCollection(dbConnectionId, collectionName, query = {}, options = {}) {
        console.log(`[MongoDBService] Querying collection: ${collectionName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collection = connection.db.collection(collectionName);
            const skip = options.skip || 0;
            const limit = options.limit || 10;

            let dbQuery = collection.find(query);

            if (options.sort) {
                dbQuery = dbQuery.sort(options.sort);
            }

            if (skip > 0) {
                dbQuery = dbQuery.skip(skip);
            }

            if (limit > 0) {
                dbQuery = dbQuery.limit(limit);
            }

            const results = await dbQuery.toArray();
            const total = await collection.countDocuments(query);

            console.log(`[MongoDBService] Query returned ${results.length} results (total: ${total})`);

            return {
                collection: collectionName,
                query: query,
                results: results,
                total: total,
                returned: results.length
            };
        } catch (error) {
            console.error(`[MongoDBService] Error querying collection:`, error.message);
            throw error;
        }
    }

    async getCollectionStats(dbConnectionId, collectionName) {
        console.log(`[MongoDBService] Getting collection statistics: ${collectionName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collection = connection.db.collection(collectionName);
            const stats = await collection.stats();

            console.log(`[MongoDBService] Statistics retrieved for ${collectionName}`);

            return {
                name: collectionName,
                count: stats.count,
                size: stats.size,
                avgDocSize: stats.avgObjSize,
                storageSize: stats.storageSize,
                indexSize: stats.totalIndexSize,
                indexes: stats.nindexes
            };
        } catch (error) {
            console.error(`[MongoDBService] Error getting collection stats:`, error.message);
            throw error;
        }
    }

    async getIndexes(dbConnectionId, collectionName) {
        console.log(`[MongoDBService] Fetching indexes for collection: ${collectionName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collection = connection.db.collection(collectionName);
            const indexes = await collection.getIndexes();

            console.log(`[MongoDBService] Found ${indexes.length} indexes for ${collectionName}`);

            return indexes.map(idx => ({
                name: idx.name,
                keys: idx.key,
                unique: idx.unique || false,
                sparse: idx.sparse || false
            }));
        } catch (error) {
            console.error(`[MongoDBService] Error fetching indexes:`, error.message);
            throw error;
        }
    }

    async insertDocument(dbConnectionId, collectionName, document) {
        console.log(`[MongoDBService] Inserting document into collection: ${collectionName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collection = connection.db.collection(collectionName);
            const result = await collection.insertOne(document);

            console.log(`[MongoDBService] Document inserted successfully: ${result.insertedId}`);

            return {
                success: true,
                insertedId: result.insertedId
            };
        } catch (error) {
            console.error(`[MongoDBService] Error inserting document:`, error.message);
            throw error;
        }
    }

    async updateDocument(dbConnectionId, collectionName, filter, update, options = {}) {
        console.log(`[MongoDBService] Updating document in collection: ${collectionName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collection = connection.db.collection(collectionName);
            const result = await collection.updateOne(filter, { $set: update }, options);

            console.log(`[MongoDBService] Document updated: ${result.modifiedCount} documents modified`);

            return {
                success: true,
                matched: result.matchedCount,
                modified: result.modifiedCount
            };
        } catch (error) {
            console.error(`[MongoDBService] Error updating document:`, error.message);
            throw error;
        }
    }

    async deleteDocument(dbConnectionId, collectionName, filter) {
        console.log(`[MongoDBService] Deleting document from collection: ${collectionName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collection = connection.db.collection(collectionName);
            const result = await collection.deleteOne(filter);

            console.log(`[MongoDBService] Document deleted: ${result.deletedCount} documents removed`);

            return {
                success: true,
                deleted: result.deletedCount
            };
        } catch (error) {
            console.error(`[MongoDBService] Error deleting document:`, error.message);
            throw error;
        }
    }

    async aggregateCollection(dbConnectionId, collectionName, pipeline) {
        console.log(`[MongoDBService] Running aggregation pipeline on collection: ${collectionName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collection = connection.db.collection(collectionName);
            const results = await collection.aggregate(pipeline).toArray();

            console.log(`[MongoDBService] Aggregation completed: ${results.length} results`);

            return {
                collection: collectionName,
                results: results,
                count: results.length
            };
        } catch (error) {
            console.error(`[MongoDBService] Error running aggregation:`, error.message);
            throw error;
        }
    }

    async createIndex(dbConnectionId, collectionName, indexSpec, options = {}) {
        console.log(`[MongoDBService] Creating index on collection: ${collectionName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collection = connection.db.collection(collectionName);
            const indexName = await collection.createIndex(indexSpec, options);

            console.log(`[MongoDBService] Index created successfully: ${indexName}`);

            return {
                success: true,
                indexName: indexName
            };
        } catch (error) {
            console.error(`[MongoDBService] Error creating index:`, error.message);
            throw error;
        }
    }

    async getDatabaseStats(dbConnectionId) {
        console.log(`[MongoDBService] Getting database statistics`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const stats = await connection.db.stats();

            console.log(`[MongoDBService] Database statistics retrieved`);

            return {
                collections: stats.collections,
                dataSize: stats.dataSize,
                storageSize: stats.storageSize,
                indexes: stats.indexes,
                views: stats.views || 0
            };
        } catch (error) {
            console.error(`[MongoDBService] Error getting database stats:`, error.message);
            throw error;
        }
    }

    async validateCollectionData(dbConnectionId, collectionName, schema = {}) {
        console.log(`[MongoDBService] Validating data in collection: ${collectionName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mongodb') {
                throw new Error('Not a MongoDB connection');
            }

            const collection = connection.db.collection(collectionName);
            const documents = await collection.find({}).toArray();

            const issues = [];

            documents.forEach((doc, index) => {
                Object.keys(schema).forEach(field => {
                    const value = doc[field];

                    if (schema[field].required && value === undefined) {
                        issues.push({
                            documentIndex: index,
                            field: field,
                            issue: 'Missing required field',
                            severity: 'error'
                        });
                    }

                    if (schema[field].type && value !== undefined && typeof value !== schema[field].type) {
                        issues.push({
                            documentIndex: index,
                            field: field,
                            issue: `Type mismatch: expected ${schema[field].type}, got ${typeof value}`,
                            severity: 'warning'
                        });
                    }
                });
            });

            console.log(`[MongoDBService] Validation completed: ${issues.length} issues found`);

            return {
                collection: collectionName,
                totalDocuments: documents.length,
                issues: issues,
                valid: issues.filter(i => i.severity === 'error').length === 0
            };
        } catch (error) {
            console.error(`[MongoDBService] Error validating collection data:`, error.message);
            throw error;
        }
    }
}

module.exports = new MongoDBService();