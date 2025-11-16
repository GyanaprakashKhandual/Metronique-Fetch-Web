const connectionService = require('./connection.service');
const mongoDBService = require('./mongodb.service');
const mysqlService = require('./mysql.service');
const postgresService = require('./postgresql.service');
const DatabaseConnection = require('../models/database.connection.model');

class QueryExecutorService {
    async executeQuery(dbConnectionId, query, options = {}) {
        console.log(`[QueryExecutorService] Executing query on database: ${dbConnectionId}`);

        const startTime = Date.now();

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            let result;

            switch (dbConnection.type) {
                case 'mongodb':
                    result = await this.executeMongoDBQuery(dbConnectionId, query, options);
                    break;
                case 'mysql':
                case 'mariadb':
                    result = await this.executeMySQLQuery(dbConnectionId, query, options);
                    break;
                case 'postgresql':
                    result = await this.executePostgresQuery(dbConnectionId, query, options);
                    break;
                default:
                    throw new Error(`Unsupported database type: ${dbConnection.type}`);
            }

            const executionTime = Date.now() - startTime;

            await this.recordQueryExecution(dbConnectionId, query, result, executionTime);

            console.log(`[QueryExecutorService] Query executed successfully in ${executionTime}ms`);

            return {
                success: true,
                result: result,
                executionTime: executionTime
            };
        } catch (error) {
            console.error(`[QueryExecutorService] Error executing query:`, error.message);

            const executionTime = Date.now() - startTime;
            await this.recordQueryExecution(dbConnectionId, query, null, executionTime, error.message);

            throw error;
        }
    }

    async executeMongoDBQuery(dbConnectionId, query, options) {
        console.log(`[QueryExecutorService] Executing MongoDB query`);

        try {
            const mongoQuery = JSON.parse(typeof query === 'string' ? query : JSON.stringify(query));

            if (mongoQuery.action === 'find') {
                return await mongoDBService.queryCollection(
                    dbConnectionId,
                    mongoQuery.collection,
                    mongoQuery.filter || {},
                    mongoQuery.options || {}
                );
            } else if (mongoQuery.action === 'aggregate') {
                return await mongoDBService.aggregateCollection(
                    dbConnectionId,
                    mongoQuery.collection,
                    mongoQuery.pipeline
                );
            } else if (mongoQuery.action === 'insertOne') {
                return await mongoDBService.insertDocument(
                    dbConnectionId,
                    mongoQuery.collection,
                    mongoQuery.document
                );
            } else if (mongoQuery.action === 'updateOne') {
                return await mongoDBService.updateDocument(
                    dbConnectionId,
                    mongoQuery.collection,
                    mongoQuery.filter,
                    mongoQuery.update
                );
            } else if (mongoQuery.action === 'deleteOne') {
                return await mongoDBService.deleteDocument(
                    dbConnectionId,
                    mongoQuery.collection,
                    mongoQuery.filter
                );
            }

            throw new Error(`Unknown MongoDB action: ${mongoQuery.action}`);
        } catch (error) {
            console.error(`[QueryExecutorService] MongoDB query execution error:`, error.message);
            throw error;
        }
    }

    async executeMySQLQuery(dbConnectionId, query, options) {
        console.log(`[QueryExecutorService] Executing MySQL query`);

        try {
            const sqlQuery = typeof query === 'string' ? query : query.sql;

            if (!sqlQuery) {
                throw new Error('SQL query is required');
            }

            const result = await mysqlService.executeSQLQuery(dbConnectionId, sqlQuery, options.params || []);
            return result.results;
        } catch (error) {
            console.error(`[QueryExecutorService] MySQL query execution error:`, error.message);
            throw error;
        }
    }

    async executePostgresQuery(dbConnectionId, query, options) {
        console.log(`[QueryExecutorService] Executing PostgreSQL query`);

        try {
            const sqlQuery = typeof query === 'string' ? query : query.sql;

            if (!sqlQuery) {
                throw new Error('SQL query is required');
            }

            const result = await postgresService.executeSQLQuery(dbConnectionId, sqlQuery, options.params || []);
            return result.rows;
        } catch (error) {
            console.error(`[QueryExecutorService] PostgreSQL query execution error:`, error.message);
            throw error;
        }
    }

    async executeMultipleQueries(dbConnectionId, queries, options = {}) {
        console.log(`[QueryExecutorService] Executing ${queries.length} queries sequentially`);

        const results = [];
        const errors = [];

        for (let i = 0; i < queries.length; i++) {
            try {
                const result = await this.executeQuery(dbConnectionId, queries[i], options);
                results.push(result);
            } catch (error) {
                console.error(`[QueryExecutorService] Error executing query ${i}:`, error.message);
                errors.push({
                    queryIndex: i,
                    error: error.message
                });

                if (options.stopOnError) {
                    throw error;
                }
            }
        }

        console.log(`[QueryExecutorService] Batch execution completed: ${results.length} successful, ${errors.length} failed`);

        return {
            successful: results.length,
            failed: errors.length,
            results: results,
            errors: errors
        };
    }

    async explainQuery(dbConnectionId, query) {
        console.log(`[QueryExecutorService] Explaining query execution plan`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            let explanation;

            if (dbConnection.type === 'mysql' || dbConnection.type === 'mariadb') {
                const explainQuery = `EXPLAIN ${query}`;
                const result = await mysqlService.executeSQLQuery(dbConnectionId, explainQuery);
                explanation = result.results;
            } else if (dbConnection.type === 'postgresql') {
                const explainQuery = `EXPLAIN ANALYZE ${query}`;
                const result = await postgresService.executeSQLQuery(dbConnectionId, explainQuery);
                explanation = result.rows;
            } else {
                throw new Error('Query explanation not supported for this database type');
            }

            console.log(`[QueryExecutorService] Query explanation generated`);

            return {
                query: query,
                explanation: explanation
            };
        } catch (error) {
            console.error(`[QueryExecutorService] Error explaining query:`, error.message);
            throw error;
        }
    }

    async validateQuery(dbConnectionId, query) {
        console.log(`[QueryExecutorService] Validating query syntax`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            if (dbConnection.type === 'mongodb') {
                try {
                    JSON.parse(typeof query === 'string' ? query : JSON.stringify(query));
                    console.log(`[QueryExecutorService] MongoDB query is valid`);
                    return { valid: true, message: 'Query is valid' };
                } catch (error) {
                    throw new Error(`Invalid MongoDB query: ${error.message}`);
                }
            } else if (dbConnection.type === 'mysql' || dbConnection.type === 'mariadb' || dbConnection.type === 'postgresql') {
                const connection = await connectionService.getConnection(dbConnectionId);
                const sqlQuery = `PREPARE stmt FROM '${query.replace(/'/g, "''")}'`;

                try {
                    if (dbConnection.type === 'postgresql') {
                        await connection.client.query(`PREPARE stmt AS ${query}`);
                        await connection.client.query('DEALLOCATE stmt');
                    }

                    console.log(`[QueryExecutorService] SQL query is valid`);
                    return { valid: true, message: 'Query is valid' };
                } catch (error) {
                    throw new Error(`Invalid SQL query: ${error.message}`);
                }
            }

            return { valid: false, message: 'Unknown database type' };
        } catch (error) {
            console.error(`[QueryExecutorService] Error validating query:`, error.message);
            return { valid: false, message: error.message };
        }
    }

    async recordQueryExecution(dbConnectionId, query, result, executionTime, error = null) {
        console.log(`[QueryExecutorService] Recording query execution`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                return;
            }

            await dbConnection.incrementUsage(executionTime);

            console.log(`[QueryExecutorService] Query execution recorded`);
        } catch (error) {
            console.error(`[QueryExecutorService] Error recording query execution:`, error.message);
        }
    }

    async getQueryHistory(dbConnectionId, options = {}) {
        console.log(`[QueryExecutorService] Retrieving query history`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            const history = dbConnection.testHistory || [];
            const limit = options.limit || 50;
            const offset = options.offset || 0;

            const paginatedHistory = history.slice(offset, offset + limit);

            console.log(`[QueryExecutorService] Retrieved ${paginatedHistory.length} query history records`);

            return {
                total: history.length,
                returned: paginatedHistory.length,
                history: paginatedHistory
            };
        } catch (error) {
            console.error(`[QueryExecutorService] Error retrieving query history:`, error.message);
            throw error;
        }
    }

    async analyzeQueryPerformance(dbConnectionId, query) {
        console.log(`[QueryExecutorService] Analyzing query performance`);

        try {
            const explanation = await this.explainQuery(dbConnectionId, query);

            const performance = {
                query: query,
                explanation: explanation.explanation,
                recommendations: []
            };

            if (explanation.explanation) {
                if (Array.isArray(explanation.explanation)) {
                    const fullScan = explanation.explanation.some(e => e.Extra && e.Extra.includes('Using where'));
                    if (fullScan) {
                        performance.recommendations.push('Consider adding an index to improve performance');
                    }

                    const tempTable = explanation.explanation.some(e => e.Extra && e.Extra.includes('Using temporary'));
                    if (tempTable) {
                        performance.recommendations.push('Query is using temporary table; consider restructuring');
                    }
                }
            }

            console.log(`[QueryExecutorService] Performance analysis completed with ${performance.recommendations.length} recommendations`);

            return performance;
        } catch (error) {
            console.error(`[QueryExecutorService] Error analyzing query performance:`, error.message);
            throw error;
        }
    }

    async estimateQueryCost(dbConnectionId, query) {
        console.log(`[QueryExecutorService] Estimating query cost`);

        try {
            const dbConnection = await DatabaseConnection.findById(dbConnectionId);

            if (!dbConnection) {
                throw new Error('Database connection not found');
            }

            if (dbConnection.type === 'postgresql') {
                const explanation = await this.explainQuery(dbConnectionId, query);

                let totalCost = 0;
                if (Array.isArray(explanation.explanation)) {
                    explanation.explanation.forEach(line => {
                        const costMatch = line.match(/cost=([0-9.]+)/);
                        if (costMatch) {
                            totalCost += parseFloat(costMatch[1]);
                        }
                    });
                }

                return {
                    databaseType: 'postgresql',
                    estimatedCost: totalCost,
                    unit: 'disk pages'
                };
            }

            console.log(`[QueryExecutorService] Query cost estimated`);
            return { estimatedCost: 0, message: 'Query cost estimation not available for this database type' };
        } catch (error) {
            console.error(`[QueryExecutorService] Error estimating query cost:`, error.message);
            throw error;
        }
    }
}

module.exports = new QueryExecutorService();