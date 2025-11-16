const DATABASE_TYPES = {
    MONGODB: 'mongodb',
    MYSQL: 'mysql',
    POSTGRESQL: 'postgresql',
    SQLITE: 'sqlite',
    MSSQL: 'mssql',
    ORACLE: 'oracle',
    REDIS: 'redis',
    DYNAMODB: 'dynamodb',
    CASSANDRA: 'cassandra',
    MARIADB: 'mariadb',
    COUCHDB: 'couchdb',
    NEO4J: 'neo4j'
};

const DATABASE_CATEGORIES = {
    RELATIONAL: 'relational',
    NOSQL: 'nosql',
    DOCUMENT: 'document',
    KEY_VALUE: 'key_value',
    GRAPH: 'graph',
    COLUMNAR: 'columnar',
    TIME_SERIES: 'time_series'
};

const DATABASE_PORTS = {
    [DATABASE_TYPES.MONGODB]: 27017,
    [DATABASE_TYPES.MYSQL]: 3306,
    [DATABASE_TYPES.POSTGRESQL]: 5432,
    [DATABASE_TYPES.SQLITE]: null,
    [DATABASE_TYPES.MSSQL]: 1433,
    [DATABASE_TYPES.ORACLE]: 1521,
    [DATABASE_TYPES.REDIS]: 6379,
    [DATABASE_TYPES.DYNAMODB]: null,
    [DATABASE_TYPES.CASSANDRA]: 9042,
    [DATABASE_TYPES.MARIADB]: 3306,
    [DATABASE_TYPES.COUCHDB]: 5984,
    [DATABASE_TYPES.NEO4J]: 7687
};

const DATABASE_DRIVERS = {
    [DATABASE_TYPES.MONGODB]: {
        npm: 'mongodb',
        maven: 'org.mongodb:mongodb-driver-sync',
        pip: 'pymongo'
    },
    [DATABASE_TYPES.MYSQL]: {
        npm: 'mysql2',
        maven: 'mysql:mysql-connector-java',
        pip: 'mysql-connector-python'
    },
    [DATABASE_TYPES.POSTGRESQL]: {
        npm: 'pg',
        maven: 'org.postgresql:postgresql',
        pip: 'psycopg2'
    },
    [DATABASE_TYPES.MSSQL]: {
        npm: 'mssql',
        maven: 'com.microsoft.sqlserver:mssql-jdbc',
        pip: 'pymssql'
    },
    [DATABASE_TYPES.REDIS]: {
        npm: 'redis',
        maven: 'redis.clients:jedis',
        pip: 'redis'
    },
    [DATABASE_TYPES.ORACLE]: {
        npm: 'oracledb',
        maven: 'com.oracle.database.jdbc:ojdbc8',
        pip: 'cx_Oracle'
    },
    [DATABASE_TYPES.MARIADB]: {
        npm: 'mariadb',
        maven: 'org.mariadb.jdbc:mariadb-java-client',
        pip: 'mariadb'
    }
};

const ORM_TYPES = {
    MONGOOSE: 'mongoose',
    SEQUELIZE: 'sequelize',
    TYPEORM: 'typeorm',
    PRISMA: 'prisma',
    HIBERNATE: 'hibernate',
    SQLALCHEMY: 'sqlalchemy',
    ENTITY_FRAMEWORK: 'entity-framework',
    KNEX: 'knex',
    OBJECTION: 'objection'
};

const DATABASE_ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production',
    TEST: 'test',
    LOCAL: 'local'
};

const CONNECTION_STATUS = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    ERROR: 'error',
    TIMEOUT: 'timeout',
    TESTING: 'testing'
};

const QUERY_TYPES = {
    SELECT: 'select',
    INSERT: 'insert',
    UPDATE: 'update',
    DELETE: 'delete',
    CREATE: 'create',
    DROP: 'drop',
    ALTER: 'alter',
    TRUNCATE: 'truncate'
};

const getDatabaseCategory = (dbType) => {
    console.log(`Getting category for database type: ${dbType}`);
    const categories = {
        [DATABASE_TYPES.MONGODB]: DATABASE_CATEGORIES.DOCUMENT,
        [DATABASE_TYPES.MYSQL]: DATABASE_CATEGORIES.RELATIONAL,
        [DATABASE_TYPES.POSTGRESQL]: DATABASE_CATEGORIES.RELATIONAL,
        [DATABASE_TYPES.SQLITE]: DATABASE_CATEGORIES.RELATIONAL,
        [DATABASE_TYPES.MSSQL]: DATABASE_CATEGORIES.RELATIONAL,
        [DATABASE_TYPES.ORACLE]: DATABASE_CATEGORIES.RELATIONAL,
        [DATABASE_TYPES.REDIS]: DATABASE_CATEGORIES.KEY_VALUE,
        [DATABASE_TYPES.DYNAMODB]: DATABASE_CATEGORIES.DOCUMENT,
        [DATABASE_TYPES.CASSANDRA]: DATABASE_CATEGORIES.COLUMNAR,
        [DATABASE_TYPES.MARIADB]: DATABASE_CATEGORIES.RELATIONAL,
        [DATABASE_TYPES.COUCHDB]: DATABASE_CATEGORIES.DOCUMENT,
        [DATABASE_TYPES.NEO4J]: DATABASE_CATEGORIES.GRAPH
    };
    const category = categories[dbType] || DATABASE_CATEGORIES.RELATIONAL;
    console.log(`Database category: ${category}`);
    return category;
};

const getDefaultPort = (dbType) => {
    console.log(`Getting default port for database type: ${dbType}`);
    const port = DATABASE_PORTS[dbType] || null;
    console.log(`Default port: ${port}`);
    return port;
};

const getDriver = (dbType, buildTool) => {
    console.log(`Getting driver for ${dbType} with build tool ${buildTool}`);
    const drivers = DATABASE_DRIVERS[dbType];
    if (!drivers) {
        console.log(`No driver found for database type: ${dbType}`);
        return null;
    }
    const driver = drivers[buildTool] || null;
    console.log(`Driver: ${driver}`);
    return driver;
};

const isRelationalDatabase = (dbType) => {
    console.log(`Checking if ${dbType} is relational database`);
    const category = getDatabaseCategory(dbType);
    const result = category === DATABASE_CATEGORIES.RELATIONAL;
    console.log(`Relational database check: ${result}`);
    return result;
};

const isNoSQLDatabase = (dbType) => {
    console.log(`Checking if ${dbType} is NoSQL database`);
    const category = getDatabaseCategory(dbType);
    const result = [
        DATABASE_CATEGORIES.DOCUMENT,
        DATABASE_CATEGORIES.KEY_VALUE,
        DATABASE_CATEGORIES.GRAPH,
        DATABASE_CATEGORIES.COLUMNAR
    ].includes(category);
    console.log(`NoSQL database check: ${result}`);
    return result;
};

const isDocumentDatabase = (dbType) => {
    console.log(`Checking if ${dbType} is document database`);
    const category = getDatabaseCategory(dbType);
    const result = category === DATABASE_CATEGORIES.DOCUMENT;
    console.log(`Document database check: ${result}`);
    return result;
};

const getConnectionString = (config) => {
    console.log(`Building connection string for ${config.type}`);
    const { type, host, port, database, username, password } = config;

    let connectionString = '';

    switch (type) {
        case DATABASE_TYPES.MONGODB:
            connectionString = `mongodb://${username}:${password}@${host}:${port}/${database}`;
            break;
        case DATABASE_TYPES.MYSQL:
        case DATABASE_TYPES.MARIADB:
            connectionString = `mysql://${username}:${password}@${host}:${port}/${database}`;
            break;
        case DATABASE_TYPES.POSTGRESQL:
            connectionString = `postgresql://${username}:${password}@${host}:${port}/${database}`;
            break;
        case DATABASE_TYPES.MSSQL:
            connectionString = `mssql://${username}:${password}@${host}:${port}/${database}`;
            break;
        case DATABASE_TYPES.REDIS:
            connectionString = `redis://${username}:${password}@${host}:${port}`;
            break;
        default:
            connectionString = null;
    }

    console.log(`Connection string built: ${connectionString ? 'success' : 'failed'}`);
    return connectionString;
};

const validateDatabaseConfig = (config) => {
    console.log(`Validating database configuration`);
    console.log(`Config type: ${config.type}`);

    const required = ['type', 'host', 'database'];
    const missing = required.filter(field => !config[field]);

    if (missing.length > 0) {
        console.log(`Missing required fields: ${missing.join(', ')}`);
        return { valid: false, missing };
    }

    if (!Object.values(DATABASE_TYPES).includes(config.type)) {
        console.log(`Invalid database type: ${config.type}`);
        return { valid: false, error: 'Invalid database type' };
    }

    console.log(`Database configuration is valid`);
    return { valid: true };
};

const getCompatibleORMs = (dbType) => {
    console.log(`Getting compatible ORMs for ${dbType}`);
    const ormMap = {
        [DATABASE_TYPES.MONGODB]: [ORM_TYPES.MONGOOSE],
        [DATABASE_TYPES.MYSQL]: [ORM_TYPES.SEQUELIZE, ORM_TYPES.TYPEORM, ORM_TYPES.PRISMA, ORM_TYPES.KNEX],
        [DATABASE_TYPES.POSTGRESQL]: [ORM_TYPES.SEQUELIZE, ORM_TYPES.TYPEORM, ORM_TYPES.PRISMA, ORM_TYPES.KNEX],
        [DATABASE_TYPES.SQLITE]: [ORM_TYPES.SEQUELIZE, ORM_TYPES.TYPEORM, ORM_TYPES.PRISMA, ORM_TYPES.KNEX],
        [DATABASE_TYPES.MSSQL]: [ORM_TYPES.SEQUELIZE, ORM_TYPES.TYPEORM],
        [DATABASE_TYPES.MARIADB]: [ORM_TYPES.SEQUELIZE, ORM_TYPES.TYPEORM, ORM_TYPES.PRISMA]
    };
    const orms = ormMap[dbType] || [];
    console.log(`Compatible ORMs: ${orms.join(', ')}`);
    return orms;
};

module.exports = {
    DATABASE_TYPES,
    DATABASE_CATEGORIES,
    DATABASE_PORTS,
    DATABASE_DRIVERS,
    ORM_TYPES,
    DATABASE_ENVIRONMENTS,
    CONNECTION_STATUS,
    QUERY_TYPES,
    getDatabaseCategory,
    getDefaultPort,
    getDriver,
    isRelationalDatabase,
    isNoSQLDatabase,
    isDocumentDatabase,
    getConnectionString,
    validateDatabaseConfig,
    getCompatibleORMs
};