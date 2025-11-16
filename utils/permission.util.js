const PERMISSIONS = {
    PROJECT: {
        VIEW: 'project:view',
        CREATE: 'project:create',
        EDIT: 'project:edit',
        DELETE: 'project:delete',
        ARCHIVE: 'project:archive',
        RESTORE: 'project:restore',
        MANAGE_ACCESS: 'project:manage_access'
    },

    REPOSITORY: {
        VIEW: 'repository:view',
        CONNECT: 'repository:connect',
        DISCONNECT: 'repository:disconnect',
        SYNC: 'repository:sync',
        ANALYZE: 'repository:analyze',
        MANAGE_WEBHOOK: 'repository:manage_webhook',
        SWITCH_BRANCH: 'repository:switch_branch'
    },

    DATABASE: {
        VIEW: 'database:view',
        CONNECT: 'database:connect',
        DISCONNECT: 'database:disconnect',
        TEST: 'database:test',
        EXECUTE_QUERY: 'database:execute_query',
        MANAGE_CREDENTIALS: 'database:manage_credentials',
        ANALYZE_SCHEMA: 'database:analyze_schema'
    },

    TEST: {
        VIEW: 'test:view',
        CREATE: 'test:create',
        EDIT: 'test:edit',
        DELETE: 'test:delete',
        EXECUTE: 'test:execute',
        STOP: 'test:stop',
        SCHEDULE: 'test:schedule',
        CONFIGURE: 'test:configure',
        GENERATE: 'test:generate'
    },

    FILE: {
        VIEW: 'file:view',
        CREATE: 'file:create',
        EDIT: 'file:edit',
        DELETE: 'file:delete',
        UPLOAD: 'file:upload',
        DOWNLOAD: 'file:download',
        LOCK: 'file:lock',
        UNLOCK: 'file:unlock',
        VALIDATE: 'file:validate',
        COMPILE: 'file:compile'
    },

    FOLDER: {
        VIEW: 'folder:view',
        CREATE: 'folder:create',
        EDIT: 'folder:edit',
        DELETE: 'folder:delete',
        MOVE: 'folder:move',
        GENERATE: 'folder:generate'
    },

    TEAM: {
        VIEW: 'team:view',
        CREATE: 'team:create',
        EDIT: 'team:edit',
        DELETE: 'team:delete',
        MANAGE_MEMBERS: 'team:manage_members',
        INVITE: 'team:invite',
        REMOVE_MEMBER: 'team:remove_member'
    },

    USER: {
        VIEW: 'user:view',
        CREATE: 'user:create',
        EDIT: 'user:edit',
        DELETE: 'user:delete',
        MANAGE_ROLES: 'user:manage_roles',
        VIEW_PROFILE: 'user:view_profile',
        EDIT_PROFILE: 'user:edit_profile'
    },

    EXECUTION: {
        VIEW: 'execution:view',
        START: 'execution:start',
        STOP: 'execution:stop',
        SCHEDULE: 'execution:schedule',
        VIEW_LOGS: 'execution:view_logs',
        DOWNLOAD_LOGS: 'execution:download_logs'
    },

    REPORT: {
        VIEW: 'report:view',
        GENERATE: 'report:generate',
        EXPORT: 'report:export',
        DELETE: 'report:delete',
        SHARE: 'report:share'
    },

    LOAD_TEST: {
        VIEW: 'load_test:view',
        CREATE: 'load_test:create',
        CONFIGURE: 'load_test:configure',
        EXECUTE: 'load_test:execute',
        STOP: 'load_test:stop',
        VIEW_RESULTS: 'load_test:view_results'
    },

    INTEGRATION: {
        VIEW: 'integration:view',
        CONFIGURE: 'integration:configure',
        CONNECT: 'integration:connect',
        DISCONNECT: 'integration:disconnect',
        TEST: 'integration:test'
    },

    NOTIFICATION: {
        VIEW: 'notification:view',
        CONFIGURE: 'notification:configure',
        SEND: 'notification:send',
        DELETE: 'notification:delete'
    },

    ADMIN: {
        MANAGE_USERS: 'admin:manage_users',
        MANAGE_TEAMS: 'admin:manage_teams',
        MANAGE_PROJECTS: 'admin:manage_projects',
        VIEW_AUDIT_LOGS: 'admin:view_audit_logs',
        MANAGE_SYSTEM: 'admin:manage_system',
        MANAGE_BILLING: 'admin:manage_billing'
    }
};

const ROLE_PERMISSIONS = {
    super_admin: Object.values(PERMISSIONS).flatMap(category => Object.values(category)),

    admin: [
        ...Object.values(PERMISSIONS.PROJECT),
        ...Object.values(PERMISSIONS.REPOSITORY),
        ...Object.values(PERMISSIONS.DATABASE),
        ...Object.values(PERMISSIONS.TEST),
        ...Object.values(PERMISSIONS.FILE),
        ...Object.values(PERMISSIONS.FOLDER),
        ...Object.values(PERMISSIONS.TEAM),
        ...Object.values(PERMISSIONS.EXECUTION),
        ...Object.values(PERMISSIONS.REPORT),
        ...Object.values(PERMISSIONS.LOAD_TEST),
        ...Object.values(PERMISSIONS.INTEGRATION),
        ...Object.values(PERMISSIONS.NOTIFICATION),
        PERMISSIONS.USER.VIEW,
        PERMISSIONS.USER.VIEW_PROFILE,
        PERMISSIONS.ADMIN.VIEW_AUDIT_LOGS
    ],

    project_manager: [
        ...Object.values(PERMISSIONS.PROJECT),
        ...Object.values(PERMISSIONS.REPOSITORY),
        ...Object.values(PERMISSIONS.DATABASE),
        ...Object.values(PERMISSIONS.TEST),
        ...Object.values(PERMISSIONS.FILE),
        ...Object.values(PERMISSIONS.FOLDER),
        PERMISSIONS.TEAM.VIEW,
        PERMISSIONS.TEAM.INVITE,
        ...Object.values(PERMISSIONS.EXECUTION),
        ...Object.values(PERMISSIONS.REPORT),
        ...Object.values(PERMISSIONS.LOAD_TEST),
        ...Object.values(PERMISSIONS.INTEGRATION),
        PERMISSIONS.NOTIFICATION.VIEW,
        PERMISSIONS.NOTIFICATION.CONFIGURE
    ],

    developer: [
        PERMISSIONS.PROJECT.VIEW,
        PERMISSIONS.PROJECT.EDIT,
        ...Object.values(PERMISSIONS.REPOSITORY),
        PERMISSIONS.DATABASE.VIEW,
        PERMISSIONS.DATABASE.TEST,
        ...Object.values(PERMISSIONS.TEST),
        ...Object.values(PERMISSIONS.FILE),
        ...Object.values(PERMISSIONS.FOLDER),
        PERMISSIONS.TEAM.VIEW,
        ...Object.values(PERMISSIONS.EXECUTION),
        ...Object.values(PERMISSIONS.REPORT),
        PERMISSIONS.LOAD_TEST.VIEW,
        PERMISSIONS.LOAD_TEST.EXECUTE,
        PERMISSIONS.INTEGRATION.VIEW
    ],

    tester: [
        PERMISSIONS.PROJECT.VIEW,
        PERMISSIONS.REPOSITORY.VIEW,
        PERMISSIONS.DATABASE.VIEW,
        PERMISSIONS.TEST.VIEW,
        PERMISSIONS.TEST.EXECUTE,
        PERMISSIONS.TEST.STOP,
        PERMISSIONS.FILE.VIEW,
        PERMISSIONS.FILE.DOWNLOAD,
        PERMISSIONS.FOLDER.VIEW,
        PERMISSIONS.TEAM.VIEW,
        PERMISSIONS.EXECUTION.VIEW,
        PERMISSIONS.EXECUTION.START,
        PERMISSIONS.EXECUTION.STOP,
        PERMISSIONS.EXECUTION.VIEW_LOGS,
        ...Object.values(PERMISSIONS.REPORT)
    ],

    viewer: [
        PERMISSIONS.PROJECT.VIEW,
        PERMISSIONS.REPOSITORY.VIEW,
        PERMISSIONS.DATABASE.VIEW,
        PERMISSIONS.TEST.VIEW,
        PERMISSIONS.FILE.VIEW,
        PERMISSIONS.FILE.DOWNLOAD,
        PERMISSIONS.FOLDER.VIEW,
        PERMISSIONS.TEAM.VIEW,
        PERMISSIONS.EXECUTION.VIEW,
        PERMISSIONS.EXECUTION.VIEW_LOGS,
        PERMISSIONS.REPORT.VIEW,
        PERMISSIONS.REPORT.EXPORT
    ],

    guest: [
        PERMISSIONS.PROJECT.VIEW,
        PERMISSIONS.TEST.VIEW,
        PERMISSIONS.FILE.VIEW,
        PERMISSIONS.REPORT.VIEW
    ]
};

const hasPermission = (userRole, requiredPermission) => {
    console.log(`Checking permission '${requiredPermission}' for role '${userRole}'`);

    if (!ROLE_PERMISSIONS[userRole]) {
        console.log(`Role not found: ${userRole}`);
        return false;
    }

    const hasAccess = ROLE_PERMISSIONS[userRole].includes(requiredPermission);
    console.log(`Permission check result: ${hasAccess}`);
    return hasAccess;
};

const hasAnyPermission = (userRole, requiredPermissions) => {
    console.log(`Checking any of permissions ${JSON.stringify(requiredPermissions)} for role '${userRole}'`);

    if (!ROLE_PERMISSIONS[userRole]) {
        console.log(`Role not found: ${userRole}`);
        return false;
    }

    const hasAccess = requiredPermissions.some(permission =>
        ROLE_PERMISSIONS[userRole].includes(permission)
    );
    console.log(`Any permission check result: ${hasAccess}`);
    return hasAccess;
};

const hasAllPermissions = (userRole, requiredPermissions) => {
    console.log(`Checking all permissions ${JSON.stringify(requiredPermissions)} for role '${userRole}'`);

    if (!ROLE_PERMISSIONS[userRole]) {
        console.log(`Role not found: ${userRole}`);
        return false;
    }

    const hasAccess = requiredPermissions.every(permission =>
        ROLE_PERMISSIONS[userRole].includes(permission)
    );
    console.log(`All permissions check result: ${hasAccess}`);
    return hasAccess;
};

const getRolePermissions = (role) => {
    console.log(`Getting permissions for role: ${role}`);
    const permissions = ROLE_PERMISSIONS[role] || [];
    console.log(`Found ${permissions.length} permissions for role '${role}'`);
    return permissions;
};

const canAccessResource = (userRole, resourceType, action) => {
    console.log(`Checking access for role '${userRole}' to ${resourceType}:${action}`);

    const permission = `${resourceType}:${action}`;
    const hasAccess = hasPermission(userRole, permission);

    console.log(`Resource access check result: ${hasAccess}`);
    return hasAccess;
};

module.exports = {
    PERMISSIONS,
    ROLE_PERMISSIONS,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    getRolePermissions,
    canAccessResource
};