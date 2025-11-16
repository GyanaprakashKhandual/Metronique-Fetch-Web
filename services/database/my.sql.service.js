const connectionService = require('./connection.service');

class MySQLService {
    async getTables(dbConnectionId) {
        console.log(`[MySQLService] Fetching tables for database: ${dbConnectionId}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const [rows] = await connection.pool.query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()');
            const tables = rows.map(row => row.TABLE_NAME);

            console.log(`[MySQLService] Found ${tables.length} tables`);

            return tables;
        } catch (error) {
            console.error(`[MySQLService] Error fetching tables:`, error.message);
            throw error;
        }
    }

    async getTableSchema(dbConnectionId, tableName) {
        console.log(`[MySQLService] Analyzing schema for table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const [columns] = await connection.pool.query(`DESCRIBE ${tableName}`);
            const [indexes] = await connection.pool.query(`SHOW INDEXES FROM ${tableName}`);
            const [[{ count }]] = await connection.pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);

            const schema = {
                name: tableName,
                columns: columns.map(col => ({
                    name: col.Field,
                    type: col.Type,
                    nullable: col.Null === 'YES',
                    defaultValue: col.Default,
                    isPrimaryKey: col.Key === 'PRI',
                    isForeignKey: col.Key === 'MUL',
                    extra: col.Extra
                })),
                indexes: indexes.map(idx => ({
                    name: idx.Key_name,
                    columns: [idx.Column_name],
                    unique: idx.Non_unique === 0
                })),
                rowCount: count
            };

            console.log(`[MySQLService] Schema analysis completed for ${tableName}: ${count} rows`);

            return schema;
        } catch (error) {
            console.error(`[MySQLService] Error analyzing table schema:`, error.message);
            throw error;
        }
    }

    async queryTable(dbConnectionId, tableName, options = {}) {
        console.log(`[MySQLService] Querying table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const limit = options.limit || 10;
            const offset = options.offset || 0;
            const where = options.where ? `WHERE ${options.where}` : '';
            const orderBy = options.orderBy ? `ORDER BY ${options.orderBy}` : '';

            const [rows] = await connection.pool.query(
                `SELECT * FROM ${tableName} ${where} ${orderBy} LIMIT ${limit} OFFSET ${offset}`
            );

            const [[{ total }]] = await connection.pool.query(
                `SELECT COUNT(*) as total FROM ${tableName} ${where}`
            );

            console.log(`[MySQLService] Query returned ${rows.length} results (total: ${total})`);

            return {
                table: tableName,
                rows: rows,
                total: total,
                returned: rows.length
            };
        } catch (error) {
            console.error(`[MySQLService] Error querying table:`, error.message);
            throw error;
        }
    }

    async getTableStats(dbConnectionId, tableName) {
        console.log(`[MySQLService] Getting table statistics: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const [stats] = await connection.pool.query(
                `SELECT TABLE_ROWS, AVG_ROW_LENGTH, DATA_LENGTH, INDEX_LENGTH, DATA_FREE FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
                [tableName]
            );

            if (stats.length === 0) {
                throw new Error(`Table not found: ${tableName}`);
            }

            const stat = stats[0];

            console.log(`[MySQLService] Statistics retrieved for ${tableName}`);

            return {
                table: tableName,
                rowCount: stat.TABLE_ROWS,
                avgRowLength: stat.AVG_ROW_LENGTH,
                dataLength: stat.DATA_LENGTH,
                indexLength: stat.INDEX_LENGTH,
                dataFree: stat.DATA_FREE
            };
        } catch (error) {
            console.error(`[MySQLService] Error getting table statistics:`, error.message);
            throw error;
        }
    }

    async getForeignKeys(dbConnectionId, tableName) {
        console.log(`[MySQLService] Fetching foreign keys for table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const [fks] = await connection.pool.query(
                `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
                [tableName]
            );

            const foreignKeys = fks.map(fk => ({
                name: fk.CONSTRAINT_NAME,
                column: fk.COLUMN_NAME,
                referencedTable: fk.REFERENCED_TABLE_NAME,
                referencedColumn: fk.REFERENCED_COLUMN_NAME
            }));

            console.log(`[MySQLService] Found ${foreignKeys.length} foreign keys for ${tableName}`);

            return foreignKeys;
        } catch (error) {
            console.error(`[MySQLService] Error fetching foreign keys:`, error.message);
            throw error;
        }
    }

    async insertRow(dbConnectionId, tableName, data) {
        console.log(`[MySQLService] Inserting row into table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const [result] = await connection.pool.query(
                `INSERT INTO ${tableName} SET ?`,
                [data]
            );

            console.log(`[MySQLService] Row inserted successfully: ID ${result.insertId}`);

            return {
                success: true,
                insertId: result.insertId
            };
        } catch (error) {
            console.error(`[MySQLService] Error inserting row:`, error.message);
            throw error;
        }
    }

    async updateRows(dbConnectionId, tableName, data, whereClause) {
        console.log(`[MySQLService] Updating rows in table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const [result] = await connection.pool.query(
                `UPDATE ${tableName} SET ? WHERE ${whereClause}`,
                [data]
            );

            console.log(`[MySQLService] Rows updated: ${result.changedRows} rows modified`);

            return {
                success: true,
                affectedRows: result.affectedRows,
                changedRows: result.changedRows
            };
        } catch (error) {
            console.error(`[MySQLService] Error updating rows:`, error.message);
            throw error;
        }
    }

    async deleteRows(dbConnectionId, tableName, whereClause) {
        console.log(`[MySQLService] Deleting rows from table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const [result] = await connection.pool.query(
                `DELETE FROM ${tableName} WHERE ${whereClause}`
            );

            console.log(`[MySQLService] Rows deleted: ${result.affectedRows} rows removed`);

            return {
                success: true,
                deletedRows: result.affectedRows
            };
        } catch (error) {
            console.error(`[MySQLService] Error deleting rows:`, error.message);
            throw error;
        }
    }

    async executeSQLQuery(dbConnectionId, sql, params = []) {
        console.log(`[MySQLService] Executing SQL query`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const [results] = await connection.pool.query(sql, params);

            console.log(`[MySQLService] Query executed successfully`);

            return {
                success: true,
                results: results
            };
        } catch (error) {
            console.error(`[MySQLService] Error executing SQL query:`, error.message);
            throw error;
        }
    }

    async getDatabaseStats(dbConnectionId) {
        console.log(`[MySQLService] Getting database statistics`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const [tableStats] = await connection.pool.query(
                `SELECT COUNT(*) as tableCount, SUM(TABLE_ROWS) as totalRows, SUM(DATA_LENGTH) as dataSize FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`
            );

            const stat = tableStats[0];

            console.log(`[MySQLService] Database statistics retrieved`);

            return {
                tables: stat.tableCount,
                totalRows: stat.totalRows || 0,
                dataSize: stat.dataSize || 0
            };
        } catch (error) {
            console.error(`[MySQLService] Error getting database statistics:`, error.message);
            throw error;
        }
    }

    async validateTableData(dbConnectionId, tableName, schema = {}) {
        console.log(`[MySQLService] Validating data in table: ${tableName}`);

        try {
            const connection = await connectionService.getConnection(dbConnectionId);

            if (connection.type !== 'mysql') {
                throw new Error('Not a MySQL connection');
            }

            const [rows] = await connection.pool.query(`SELECT * FROM ${tableName}`);

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

            console.log(`[MySQLService] Validation completed: ${issues.length} issues found`);

            return {
                table: tableName,
                totalRows: rows.length,
                issues: issues,
                valid: issues.filter(i => i.severity === 'error').length === 0
            };
        } catch (error) {
            console.error(`[MySQLService] Error validating table data:`, error.message);
            throw error;
        }
    }

    typeMatches(valueType, expectedType) {
        const typeMap = {
            'int': ['number'],
            'varchar': ['string'],
            'text': ['string'],
            'boolean': ['boolean'],
            'date': ['string', 'object'],
            'datetime': ['string', 'object']
        };

        return typeMap[expectedType]?.includes(valueType) || true;
    }
}

module.exports = new MySQLService();