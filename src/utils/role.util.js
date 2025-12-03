const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    PROJECT_MANAGER: 'project_manager',
    DEVELOPER: 'developer',
    TESTER: 'tester',
    VIEWER: 'viewer',
    GUEST: 'guest'
};

const ROLE_HIERARCHY = {
    [ROLES.SUPER_ADMIN]: 7,
    [ROLES.ADMIN]: 6,
    [ROLES.PROJECT_MANAGER]: 5,
    [ROLES.DEVELOPER]: 4,
    [ROLES.TESTER]: 3,
    [ROLES.VIEWER]: 2,
    [ROLES.GUEST]: 1
};

const ROLE_DESCRIPTIONS = {
    [ROLES.SUPER_ADMIN]: 'Full system access with all permissions',
    [ROLES.ADMIN]: 'Administrative access to all projects and teams',
    [ROLES.PROJECT_MANAGER]: 'Manage projects, teams, and configurations',
    [ROLES.DEVELOPER]: 'Create, edit, and execute tests',
    [ROLES.TESTER]: 'Execute tests and view results',
    [ROLES.VIEWER]: 'Read-only access to projects and reports',
    [ROLES.GUEST]: 'Limited read-only access'
};

const TEAM_ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    MEMBER: 'member',
    CONTRIBUTOR: 'contributor',
    VIEWER: 'viewer'
};

const TEAM_ROLE_HIERARCHY = {
    [TEAM_ROLES.OWNER]: 5,
    [TEAM_ROLES.ADMIN]: 4,
    [TEAM_ROLES.MEMBER]: 3,
    [TEAM_ROLES.CONTRIBUTOR]: 2,
    [TEAM_ROLES.VIEWER]: 1
};

const PROJECT_ROLES = {
    OWNER: 'owner',
    ADMIN: 'admin',
    EDITOR: 'editor',
    CONTRIBUTOR: 'contributor',
    VIEWER: 'viewer'
};

const PROJECT_ROLE_HIERARCHY = {
    [PROJECT_ROLES.OWNER]: 5,
    [PROJECT_ROLES.ADMIN]: 4,
    [PROJECT_ROLES.EDITOR]: 3,
    [PROJECT_ROLES.CONTRIBUTOR]: 2,
    [PROJECT_ROLES.VIEWER]: 1
};

const hasRole = (userRole, requiredRole) => {
    console.log(`Checking if user role '${userRole}' has required role '${requiredRole}'`);

    if (!ROLE_HIERARCHY[userRole] || !ROLE_HIERARCHY[requiredRole]) {
        console.log(`Invalid role comparison: ${userRole} vs ${requiredRole}`);
        return false;
    }

    const hasAccess = ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
    console.log(`Role check result: ${hasAccess}`);
    return hasAccess;
};

const hasTeamRole = (userRole, requiredRole) => {
    console.log(`Checking team role '${userRole}' against required '${requiredRole}'`);

    if (!TEAM_ROLE_HIERARCHY[userRole] || !TEAM_ROLE_HIERARCHY[requiredRole]) {
        console.log(`Invalid team role comparison: ${userRole} vs ${requiredRole}`);
        return false;
    }

    const hasAccess = TEAM_ROLE_HIERARCHY[userRole] >= TEAM_ROLE_HIERARCHY[requiredRole];
    console.log(`Team role check result: ${hasAccess}`);
    return hasAccess;
};

const hasProjectRole = (userRole, requiredRole) => {
    console.log(`Checking project role '${userRole}' against required '${requiredRole}'`);

    if (!PROJECT_ROLE_HIERARCHY[userRole] || !PROJECT_ROLE_HIERARCHY[requiredRole]) {
        console.log(`Invalid project role comparison: ${userRole} vs ${requiredRole}`);
        return false;
    }

    const hasAccess = PROJECT_ROLE_HIERARCHY[userRole] >= PROJECT_ROLE_HIERARCHY[requiredRole];
    console.log(`Project role check result: ${hasAccess}`);
    return hasAccess;
};

const isAdmin = (role) => {
    console.log(`Checking if role '${role}' is admin`);
    const result = [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(role);
    console.log(`Admin check result: ${result}`);
    return result;
};

const isSuperAdmin = (role) => {
    console.log(`Checking if role '${role}' is super admin`);
    const result = role === ROLES.SUPER_ADMIN;
    console.log(`Super admin check result: ${result}`);
    return result;
};

const isTeamOwner = (role) => {
    console.log(`Checking if team role '${role}' is owner`);
    const result = role === TEAM_ROLES.OWNER;
    console.log(`Team owner check result: ${result}`);
    return result;
};

const isProjectOwner = (role) => {
    console.log(`Checking if project role '${role}' is owner`);
    const result = role === PROJECT_ROLES.OWNER;
    console.log(`Project owner check result: ${result}`);
    return result;
};

const getAllRoles = () => {
    console.log('Getting all system roles');
    return Object.values(ROLES);
};

const getAllTeamRoles = () => {
    console.log('Getting all team roles');
    return Object.values(TEAM_ROLES);
};

const getAllProjectRoles = () => {
    console.log('Getting all project roles');
    return Object.values(PROJECT_ROLES);
};

const getRoleLevel = (role) => {
    console.log(`Getting level for role: ${role}`);
    const level = ROLE_HIERARCHY[role] || 0;
    console.log(`Role level: ${level}`);
    return level;
};

const getTeamRoleLevel = (role) => {
    console.log(`Getting level for team role: ${role}`);
    const level = TEAM_ROLE_HIERARCHY[role] || 0;
    console.log(`Team role level: ${level}`);
    return level;
};

const getProjectRoleLevel = (role) => {
    console.log(`Getting level for project role: ${role}`);
    const level = PROJECT_ROLE_HIERARCHY[role] || 0;
    console.log(`Project role level: ${level}`);
    return level;
};

module.exports = {
    ROLES,
    ROLE_HIERARCHY,
    ROLE_DESCRIPTIONS,
    TEAM_ROLES,
    TEAM_ROLE_HIERARCHY,
    PROJECT_ROLES,
    PROJECT_ROLE_HIERARCHY,
    hasRole,
    hasTeamRole,
    hasProjectRole,
    isAdmin,
    isSuperAdmin,
    isTeamOwner,
    isProjectOwner,
    getAllRoles,
    getAllTeamRoles,
    getAllProjectRoles,
    getRoleLevel,
    getTeamRoleLevel,
    getProjectRoleLevel
};