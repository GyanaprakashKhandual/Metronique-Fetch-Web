const mongoose = require('mongoose');

class MongooseService {
    constructor() {
        this.models = new Map();
        this.connections = new Map();
    }

    async createDynamicModel(modelName, schemaDefinition) {
        console.log(`[MongooseService] Creating dynamic model: ${modelName}`);

        try {
            if (this.models.has(modelName)) {
                console.log(`[MongooseService] Model already exists: ${modelName}`);
                return this.models.get(modelName);
            }

            const schema = new mongoose.Schema(schemaDefinition, {
                timestamps: true,
                collection: modelName.toLowerCase()
            });

            const model = mongoose.model(modelName, schema);
            this.models.set(modelName, model);

            console.log(`[MongooseService] Dynamic model created: ${modelName}`);
            return model;
        } catch (error) {
            console.error(`[MongooseService] Error creating dynamic model:`, error.message);
            throw error;
        }
    }

    async createDocument(modelName, documentData) {
        console.log(`[MongooseService] Creating document in model: ${modelName}`);

        try {
            const Model = this.getModel(modelName);

            const document = new Model(documentData);
            const saved = await document.save();

            console.log(`[MongooseService] Document created successfully: ${saved._id}`);
            return saved;
        } catch (error) {
            console.error(`[MongooseService] Error creating document:`, error.message);
            throw error;
        }
    }

    async findDocuments(modelName, query = {}, options = {}) {
        console.log(`[MongooseService] Finding documents in model: ${modelName}`);

        try {
            const Model = this.getModel(modelName);

            let dbQuery = Model.find(query);

            if (options.select) {
                dbQuery = dbQuery.select(options.select);
            }

            if (options.skip) {
                dbQuery = dbQuery.skip(options.skip);
            }

            if (options.limit) {
                dbQuery = dbQuery.limit(options.limit);
            }

            if (options.sort) {
                dbQuery = dbQuery.sort(options.sort);
            }

            const documents = await dbQuery.exec();
            const total = await Model.countDocuments(query);

            console.log(`[MongooseService] Found ${documents.length} documents (total: ${total})`);

            return {
                documents: documents,
                total: total,
                returned: documents.length
            };
        } catch (error) {
            console.error(`[MongooseService] Error finding documents:`, error.message);
            throw error;
        }
    }

    async findDocumentById(modelName, documentId) {
        console.log(`[MongooseService] Finding document by ID: ${documentId}`);

        try {
            const Model = this.getModel(modelName);
            const document = await Model.findById(documentId);

            if (!document) {
                console.warn(`[MongooseService] Document not found: ${documentId}`);
                return null;
            }

            console.log(`[MongooseService] Document found: ${documentId}`);
            return document;
        } catch (error) {
            console.error(`[MongooseService] Error finding document by ID:`, error.message);
            throw error;
        }
    }

    async updateDocument(modelName, documentId, updateData) {
        console.log(`[MongooseService] Updating document: ${documentId}`);

        try {
            const Model = this.getModel(modelName);
            const document = await Model.findByIdAndUpdate(documentId, updateData, { new: true, runValidators: true });

            if (!document) {
                throw new Error(`Document not found: ${documentId}`);
            }

            console.log(`[MongooseService] Document updated successfully: ${documentId}`);
            return document;
        } catch (error) {
            console.error(`[MongooseService] Error updating document:`, error.message);
            throw error;
        }
    }

    async deleteDocument(modelName, documentId) {
        console.log(`[MongooseService] Deleting document: ${documentId}`);

        try {
            const Model = this.getModel(modelName);
            const result = await Model.findByIdAndDelete(documentId);

            if (!result) {
                throw new Error(`Document not found: ${documentId}`);
            }

            console.log(`[MongooseService] Document deleted successfully: ${documentId}`);
            return { success: true, deletedId: documentId };
        } catch (error) {
            console.error(`[MongooseService] Error deleting document:`, error.message);
            throw error;
        }
    }

    async deleteMany(modelName, query) {
        console.log(`[MongooseService] Deleting multiple documents from: ${modelName}`);

        try {
            const Model = this.getModel(modelName);
            const result = await Model.deleteMany(query);

            console.log(`[MongooseService] ${result.deletedCount} documents deleted`);
            return { success: true, deletedCount: result.deletedCount };
        } catch (error) {
            console.error(`[MongooseService] Error deleting multiple documents:`, error.message);
            throw error;
        }
    }

    async updateMany(modelName, query, updateData) {
        console.log(`[MongooseService] Updating multiple documents in: ${modelName}`);

        try {
            const Model = this.getModel(modelName);
            const result = await Model.updateMany(query, { $set: updateData });

            console.log(`[MongooseService] ${result.modifiedCount} documents updated`);
            return { success: true, modifiedCount: result.modifiedCount };
        } catch (error) {
            console.error(`[MongooseService] Error updating multiple documents:`, error.message);
            throw error;
        }
    }

    async aggregateDocuments(modelName, pipeline) {
        console.log(`[MongooseService] Running aggregation pipeline on: ${modelName}`);

        try {
            const Model = this.getModel(modelName);
            const results = await Model.aggregate(pipeline);

            console.log(`[MongooseService] Aggregation completed: ${results.length} results`);
            return results;
        } catch (error) {
            console.error(`[MongooseService] Error running aggregation:`, error.message);
            throw error;
        }
    }

    async countDocuments(modelName, query = {}) {
        console.log(`[MongooseService] Counting documents in: ${modelName}`);

        try {
            const Model = this.getModel(modelName);
            const count = await Model.countDocuments(query);

            console.log(`[MongooseService] Document count: ${count}`);
            return count;
        } catch (error) {
            console.error(`[MongooseService] Error counting documents:`, error.message);
            throw error;
        }
    }

    async distinctValues(modelName, field, query = {}) {
        console.log(`[MongooseService] Finding distinct values for field: ${field}`);

        try {
            const Model = this.getModel(modelName);
            const values = await Model.distinct(field, query);

            console.log(`[MongooseService] Found ${values.length} distinct values`);
            return values;
        } catch (error) {
            console.error(`[MongooseService] Error finding distinct values:`, error.message);
            throw error;
        }
    }

    async bulkWrite(modelName, operations) {
        console.log(`[MongooseService] Executing bulk write operations on: ${modelName}`);

        try {
            const Model = this.getModel(modelName);
            const result = await Model.collection.bulkWrite(operations);

            console.log(`[MongooseService] Bulk write completed: ${result.result.ok === 1 ? 'success' : 'failed'}`);
            return result;
        } catch (error) {
            console.error(`[MongooseService] Error executing bulk write:`, error.message);
            throw error;
        }
    }

    async createIndex(modelName, indexSpec, options = {}) {
        console.log(`[MongooseService] Creating index on model: ${modelName}`);

        try {
            const Model = this.getModel(modelName);
            await Model.collection.createIndex(indexSpec, options);

            console.log(`[MongooseService] Index created successfully`);
            return { success: true };
        } catch (error) {
            console.error(`[MongooseService] Error creating index:`, error.message);
            throw error;
        }
    }

    async getIndexes(modelName) {
        console.log(`[MongooseService] Fetching indexes for model: ${modelName}`);

        try {
            const Model = this.getModel(modelName);
            const indexes = await Model.collection.getIndexes();

            console.log(`[MongooseService] Found ${indexes.length} indexes`);
            return indexes;
        } catch (error) {
            console.error(`[MongooseService] Error fetching indexes:`, error.message);
            throw error;
        }
    }

    async validateSchema(modelName, documentData) {
        console.log(`[MongooseService] Validating document against schema: ${modelName}`);

        try {
            const Model = this.getModel(modelName);
            const document = new Model(documentData);
            const errors = document.validateSync();

            if (errors) {
                console.warn(`[MongooseService] Validation errors found: ${Object.keys(errors.errors).length}`);
                return {
                    valid: false,
                    errors: Object.keys(errors.errors).map(key => ({
                        field: key,
                        message: errors.errors[key].message
                    }))
                };
            }

            console.log(`[MongooseService] Document validation successful`);
            return { valid: true, errors: [] };
        } catch (error) {
            console.error(`[MongooseService] Error validating document:`, error.message);
            throw error;
        }
    }

    async getModelStats(modelName) {
        console.log(`[MongooseService] Getting statistics for model: ${modelName}`);

        try {
            const Model = this.getModel(modelName);
            const documentCount = await Model.countDocuments();
            const indexes = await Model.collection.getIndexes();

            console.log(`[MongooseService] Model statistics: ${documentCount} documents, ${Object.keys(indexes).length} indexes`);

            return {
                model: modelName,
                documentCount: documentCount,
                indexCount: Object.keys(indexes).length,
                indexes: indexes
            };
        } catch (error) {
            console.error(`[MongooseService] Error getting model statistics:`, error.message);
            throw error;
        }
    }

    getModel(modelName) {
        console.log(`[MongooseService] Retrieving model: ${modelName}`);

        if (!this.models.has(modelName)) {
            try {
                const model = mongoose.model(modelName);
                this.models.set(modelName, model);
                return model;
            } catch (error) {
                throw new Error(`Model not found: ${modelName}`);
            }
        }

        return this.models.get(modelName);
    }

    getAllModels() {
        console.log(`[MongooseService] Retrieving all registered models`);

        const modelList = Array.from(this.models.keys());
        console.log(`[MongooseService] Found ${modelList.length} models`);

        return modelList;
    }

    async dropCollection(modelName) {
        console.log(`[MongooseService] Dropping collection: ${modelName}`);

        try {
            const Model = this.getModel(modelName);
            await Model.collection.drop();

            this.models.delete(modelName);
            console.log(`[MongooseService] Collection dropped successfully: ${modelName}`);

            return { success: true, message: `Collection dropped: ${modelName}` };
        } catch (error) {
            console.error(`[MongooseService] Error dropping collection:`, error.message);
            throw error;
        }
    }
}

module.exports = new MongooseService();