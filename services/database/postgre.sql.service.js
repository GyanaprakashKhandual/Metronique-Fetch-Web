const connectionService = require('./connection.service');

class PostgreSQLService {
    async getTables(dbConnectionId) {
        console.log(`[PostgreSQLService] Fetching tables for database: ${dbConnectionId}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const result = await connection.client.query(
                `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
            );

            const tables = result.rows.map(row => row.table_name);
            console.log(`[PostgreSQLService] Found ${tables.length} tables`);

            return tables;
        } catch (error) {
            console.error(`[PostgreSQLService] Error fetching tables:`, error.message);
            throw error;
        }
    }

    async getTableSchema(dbConnectionId, tableName) {
        console.log(`[PostgreSQLService] Analyzing schema for table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const columnsResult = await connection.client.query(
                `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position`,
                [tableName]
            );

            const indexResult = await connection.client.query(
                `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = $1`,
                [tableName]
            );

            const countResult = await connection.client.query(`SELECT COUNT(*) FROM ${tableName}`);

            const schema = {
                name: tableName,
                columns: columnsResult.rows.map(col => ({
                    name: col.column_name,
                    type: col.data_type,
                    nullable: col.is_nullable === 'YES',
                    defaultValue: col.column_default,
                    isPrimaryKey: col.column_name === 'id',
                    isForeignKey: false
                })),
                indexes: indexResult.rows.map(idx => ({
                    name: idx.indexname,
                    definition: idx.indexdef
                })),
                rowCount: parseInt(countResult.rows[0].count)
            };

            console.log(`[PostgreSQLService] Schema analysis completed for ${tableName}: ${schema.rowCount} rows`);

            return schema;
        } catch (error) {
            console.error(`[PostgreSQLService] Error analyzing table schema:`, error.message);
            throw error;
        }
    }

    async queryTable(dbConnectionId, tableName, options = {}) {
        console.log(`[PostgreSQLService] Querying table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const limit = options.limit || 10;
            const offset = options.offset || 0;
            const where = options.where ? `WHERE ${options.where}` : '';
            const orderBy = options.orderBy ? `ORDER BY ${options.orderBy}` : '';

            const query = `SELECT * FROM ${tableName} ${where} ${orderBy} LIMIT $1 OFFSET $2`;
            const result = await connection.client.query(query, [limit, offset]);

            const countResult = await connection.client.query(
                `SELECT COUNT(*) FROM ${tableName} ${where}`
            );

            const total = parseInt(countResult.rows[0].count);

            console.log(`[PostgreSQLService] Query returned ${result.rows.length} results (total: ${total})`);

            return {
                table: tableName,
                rows: result.rows,
                total: total,
                returned: result.rows.length
            };
        } catch (error) {
            console.error(`[PostgreSQLService] Error querying table:`, error.message);
            throw error;
        }
    }

    async getTableStats(dbConnectionId, tableName) {
        console.log(`[PostgreSQLService] Getting table statistics: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const result = await connection.client.query(
                `SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE tablename = $1 AND schemaname = 'public'`,
                [tableName]
            );

            if (result.rows.length === 0) {
                throw new Error(`Table not found: ${tableName}`);
            }

            const countResult = await connection.client.query(`SELECT COUNT(*) FROM ${tableName}`);
            const rowCount = parseInt(countResult.rows[0].count);

            console.log(`[PostgreSQLService] Statistics retrieved for ${tableName}`);

            return {
                table: tableName,
                rowCount: rowCount,
                size: result.rows[0].size
            };
        } catch (error) {
            console.error(`[PostgreSQLService] Error getting table statistics:`, error.message);
            throw error;
        }
    }

    async getForeignKeys(dbConnectionId, tableName) {
        console.log(`[PostgreSQLService] Fetching foreign keys for table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const result = await connection.client.query(
                `SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name FROM information_schema.key_column_usage WHERE table_name = $1 AND foreign_table_name IS NOT NULL`,
                [tableName]
            );

            const foreignKeys = result.rows.map(fk => ({
                name: fk.constraint_name,
                column: fk.column_name,
                referencedTable: fk.foreign_table_name,
                referencedColumn: fk.foreign_column_name
            }));

            console.log(`[PostgreSQLService] Found ${foreignKeys.length} foreign keys for ${tableName}`);

            return foreignKeys;
        } catch (error) {
            console.error(`[PostgreSQLService] Error fetching foreign keys:`, error.message);
            throw error;
        }
    }

    async insertRow(dbConnectionId, tableName, data) {
        console.log(`[PostgreSQLService] Inserting row into table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const columns = Object.keys(data);
            const values = Object.values(data);
            const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

            const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
            const result = await connection.client.query(query, values);

            console.log(`[PostgreSQLService] Row inserted successfully: ID ${result.rows[0].id}`);

            return {
                success: true,
                id: result.rows[0].id
            };
        } catch (error) {
            console.error(`[PostgreSQLService] Error inserting row:`, error.message);
            throw error;
        }
    }

    async updateRows(dbConnectionId, tableName, data, whereClause) {
        console.log(`[PostgreSQLService] Updating rows in table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const updates = Object.keys(data).map((key, i) => `${key} = $${i + 1}`).join(', ');
            const values = Object.values(data);

            const query = `UPDATE ${tableName} SET ${updates} WHERE ${whereClause}`;
            const result = await connection.client.query(query, values);

            console.log(`[PostgreSQLService] Rows updated: ${result.rowCount} rows modified`);

            return {
                success: true,
                rowsAffected: result.rowCount
            };
        } catch (error) {
            console.error(`[PostgreSQLService] Error updating rows:`, error.message);
            throw error;
        }
    }

    async deleteRows(dbConnectionId, tableName, whereClause) {
        console.log(`[PostgreSQLService] Deleting rows from table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;
            const result = await connection.client.query(query);

            console.log(`[PostgreSQLService] Rows deleted: ${result.rowCount} rows removed`);

            return {
                success: true,
                rowsDeleted: result.rowCount
            };
        } catch (error) {
            console.error(`[PostgreSQLService] Error deleting rows:`, error.message);
            throw error;
        }
    }

    async executeSQLQuery(dbConnectionId, sql, params = []) {
        console.log(`[PostgreSQLService] Executing SQL query`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const result = await connection.client.query(sql, params);

            console.log(`[PostgreSQLService] Query executed successfully: ${result.rowCount} rows`);

            return {
                success: true,
                rows: result.rows,
                rowCount: result.rowCount
            };
        } catch (error) {
            console.error(`[PostgreSQLService] Error executing SQL query:`, error.message);
            throw error;
        }
    }

    async getDatabaseStats(dbConnectionId) {
        console.log(`[PostgreSQLService] Getting database statistics`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const result = await connection.client.query(
                `SELECT COUNT(*) as table_count, SUM(n_live_tup) as total_rows, pg_database_size(current_database()) as size FROM pg_stat_user_tables`
            );

            const stats = result.rows[0];

            console.log(`[PostgreSQLService] Database statistics retrieved`);

            return {
                tables: parseInt(stats.table_count),
                totalRows: stats.total_rows || 0,
                databaseSize: stats.size || 0
            };
        } catch (error) {
            console.error(`[PostgreSQLService] Error getting database statistics:`, error.message);
            throw error;
        }
    }

    async validateTableData(dbConnectionId, tableName, schema = {}) {
        console.log(`[PostgreSQLService] Validating data in table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const result = await connection.client.query(`SELECT * FROM ${tableName}`);
            const rows = result.rows;

            const issues = [];

            rows.forEach((row, index) => {
                Object.keys(schema).forEach(column => {
                    const value = row[column];

                    if (schema[column].required && value === null) {
                        issues.push({
                            rowIndex: index,
                            column: column,
                            issue: 'NULL value in required column',
                            severity: 'error'
                        });
                    }

                    if (schema[column].type && value !== null) {
                        const valueType = typeof value;
                        if (!this.typeMatches(valueType, schema[column].type)) {
                            issues.push({
                                rowIndex: index,
                                column: column,
                                issue: `Type mismatch: expected ${schema[column].type}`,
                                severity: 'warning'
                            });
                        }
                    }
                });
            });

            console.log(`[PostgreSQLService] Validation completed: ${issues.length} issues found`);

            return {
                table: tableName,
                totalRows: rows.length,
                issues: issues,
                valid: issues.filter(i => i.severity === 'error').length === 0
            };
        } catch (error) {
            console.error(`[PostgreSQLService] Error validating table data:`, error.message);
            throw error;
        }
    }

    typeMatches(valueType, expectedType) {
        const typeMap = {
            'integer': ['number'],
            'character varying': ['string'],
            'text': ['string'],
            'boolean': ['boolean'],
            'date': ['string', 'object'],
            'timestamp': ['string', 'object']
        };

        return typeMap[expectedType]?.includes(valueType) || true;
    }

    async getTableRelationships(dbConnectionId, tableName) {
        console.log(`[PostgreSQLService] Analyzing table relationships: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'postgresql') {
                throw new Error('Not a PostgreSQL connection');
            }

            const fkResult = await connection.client.query(
                `SELECT constraint_name, column_name, foreign_table_name, foreign_column_name FROM information_schema.key_column_usage WHERE table_name = $1 AND foreign_table_name IS NOT NULL`,
                [tableName]
            );

            const refResult = await connection.client.query(
                `SELECT constraint_name, table_name, column_name FROM information_schema.key_column_usage WHERE foreign_table_name = $1 AND table_schema = 'public'`,
                [tableName]
            );

            console.log(`[PostgreSQLService] Relationships analyzed for ${tableName}`);

            return {
                table: tableName,
                outgoing: fkResult.rows,
                incoming: refResult.rows
            };
        } catch (error) {
            console.error(`[PostgreSQLService] Error analyzing relationships:`, error.message);
            throw error;
        }
    }
}

module.exports = new PostgreSQLService();