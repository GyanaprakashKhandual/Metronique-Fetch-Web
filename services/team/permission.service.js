const TeamMember = require('../../models/team.member.model');
const AuditLog = require('../../models/audit.model');

class PermissionService {
    constructor() {
        this.rolePermissions = {
            owner: [
                'canManageTeam',
                'canManageProjects',
                'canCreateProjects',
                'canDeleteProjects',
                'canManageMembers',
                'canInviteMembers',
                'canRemoveMembers',
                'canRunTests',
                'canViewTests',
                'canEditTests',
                'canDeleteTests',
                'canViewReports',
                'canExportReports',
                'canManageBilling',
                'canManageIntegrations'
            ],
            admin: [
                'canManageProjects',
                'canCreateProjects',
                'canDeleteProjects',
                'canManageMembers',
                'canInviteMembers',
                'canRemoveMembers',
                'canRunTests',
                'canViewTests',
                'canEditTests',
                'canDeleteTests',
                'canViewReports',
                'canExportReports',
                'canManageIntegrations'
            ],
            member: [
                'canCreateProjects',
                'canRunTests',
                'canViewTests',
                'canEditTests',
                'canViewReports'
            ],
            viewer: [
                'canViewTests',
                'canViewReports'
            ]
        };
    }

    async checkPermission(userId, teamId, permission) {
        console.log(`[PermissionService] Checking permission ${permission} for user ${userId} in team ${teamId}`);

        try {
            const member = await TeamMember.findOne({ user: userId, team: teamId });

            if (!member) {
                console.warn(`[PermissionService] User ${userId} is not a member of team ${teamId}`);
                return false;
            }

            const hasPermission = member.hasPermission(permission);
            console.log(`[PermissionService] Permission ${permission}: ${hasPermission}`);

            return hasPermission;
        } catch (error) {
            console.error(`[PermissionService] Error checking permission:`, error);
            throw error;
        }
    }

    async hasAllPermissions(userId, teamId, permissions) {
        console.log(`[PermissionService] Checking multiple permissions for user ${userId}`);

        try {
            const member = await TeamMember.findOne({ user: userId, team: teamId });

            if (!member) {
                return false;
            }

            return permissions.every(permission => member.hasPermission(permission));
        } catch (error) {
            console.error(`[PermissionService] Error checking multiple permissions:`, error);
            throw error;
        }
    }

    async hasAnyPermission(userId, teamId, permissions) {
        console.log(`[PermissionService] Checking any permission for user ${userId}`);

        try {
            const member = await TeamMember.findOne({ user: userId, team: teamId });

            if (!member) {
                return false;
            }

            return permissions.some(permission => member.hasPermission(permission));
        } catch (error) {
            console.error(`[PermissionService] Error checking any permission:`, error);
            throw error;
        }
    }

    async getRolePermissions(role) {
        console.log(`[PermissionService] Fetching permissions for role ${role}`);

        const permissions = this.rolePermissions[role] || [];
        console.log(`[PermissionService] Role ${role} has ${permissions.length} permissions`);

        return permissions;
    }

    async setCustomPermissions(userId, teamId, customPermissions, authorizedById, metadata = {}) {
        console.log(`[PermissionService] Setting custom permissions for user ${userId}`);

        try {
            const member = await TeamMember.findOne({ user: userId, team: teamId });

            if (!member) {
                throw new Error('Team member not found');
            }

            const authorizedMember = await TeamMember.findOne({ user: authorizedById, team: teamId });

            if (!authorizedMember || !authorizedMember.hasPermission('canManageMembers')) {
                throw new Error('Unauthorized to set custom permissions');
            }

            const before = { ...member.customPermissions };

            Object.keys(customPermissions).forEach(key => {
                if (key in member.customPermissions) {
                    member.customPermissions[key] = customPermissions[key];
                }
            });

            await member.save();

            await AuditLog.create({
                user: authorizedById,
                action: 'permission_changed',
                actionCategory: 'authorization',
                entityType: 'team',
                entityId: teamId,
                status: 'success',
                severity: 'info',
                changes: { before, after: customPermissions },
                affectedUsers: [userId],
                ...metadata
            });

            console.log(`[PermissionService] Custom permissions set successfully`);
            return member;
        } catch (error) {
            console.error(`[PermissionService] Error setting custom permissions:`, error);
            throw error;
        }
    }

    async grantPermission(userId, teamId, permission, grantedById, metadata = {}) {
        console.log(`[PermissionService] Granting permission ${permission} to user ${userId}`);

        try {
            const member = await TeamMember.findOne({ user: userId, team: teamId });

            if (!member) {
                throw new Error('Team member not found');
            }

            const granter = await TeamMember.findOne({ user: grantedById, team: teamId });

            if (!granter || !granter.hasPermission('canManageMembers')) {
                throw new Error('Unauthorized to grant permissions');
            }

            const before = { ...member.customPermissions };

            if (permission in member.customPermissions) {
                member.customPermissions[permission] = true;
                await member.save();

                await AuditLog.create({
                    user: grantedById,
                    action: 'access_granted',
                    actionCategory: 'authorization',
                    entityType: 'team',
                    entityId: teamId,
                    status: 'success',
                    severity: 'info',
                    changes: { before, after: member.customPermissions },
                    details: { permission },
                    affectedUsers: [userId],
                    ...metadata
                });

                console.log(`[PermissionService] Permission ${permission} granted successfully`);
            }

            return member;
        } catch (error) {
            console.error(`[PermissionService] Error granting permission:`, error);
            throw error;
        }
    }

    async revokePermission(userId, teamId, permission, revokedById, metadata = {}) {
        console.log(`[PermissionService] Revoking permission ${permission} from user ${userId}`);

        try {
            const member = await TeamMember.findOne({ user: userId, team: teamId });

            if (!member) {
                throw new Error('Team member not found');
            }

            const revoker = await TeamMember.findOne({ user: revokedById, team: teamId });

            if (!revoker || !revoker.hasPermission('canManageMembers')) {
                throw new Error('Unauthorized to revoke permissions');
            }

            const before = { ...member.customPermissions };

            if (permission in member.customPermissions) {
                member.customPermissions[permission] = false;
                await member.save();

                await AuditLog.create({
                    user: revokedById,
                    action: 'access_revoked',
                    actionCategory: 'authorization',
                    entityType: 'team',
                    entityId: teamId,
                    status: 'success',
                    severity: 'warning',
                    changes: { before, after: member.customPermissions },
                    details: { permission },
                    affectedUsers: [userId],
                    ...metadata
                });

                console.log(`[PermissionService] Permission ${permission} revoked successfully`);
            }

            return member;
        } catch (error) {
            console.error(`[PermissionService] Error revoking permission:`, error);
            throw error;
        }
    }

    async bulkGrantPermissions(teamId, userIds, permissions, grantedById, metadata = {}) {
        console.log(`[PermissionService] Bulk granting permissions to ${userIds.length} users`);

        try {
            const granter = await TeamMember.findOne({ user: grantedById, team: teamId });

            if (!granter || !granter.hasPermission('canManageMembers')) {
                throw new Error('Unauthorized to grant permissions');
            }

            const members = await TeamMember.find({
                team: teamId,
                user: { $in: userIds }
            });

            for (const member of members) {
                permissions.forEach(permission => {
                    if (permission in member.customPermissions) {
                        member.customPermissions[permission] = true;
                    }
                });
                await member.save();
            }

            await AuditLog.create({
                user: grantedById,
                action: 'access_granted',
                actionCategory: 'authorization',
                entityType: 'team',
                entityId: teamId,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Bulk granted permissions to ${userIds.length} users`,
                    permissions
                },
                affectedUsers: userIds,
                ...metadata
            });

            console.log(`[PermissionService] Bulk permissions granted successfully`);
            return members;
        } catch (error) {
            console.error(`[PermissionService] Error in bulk grant permissions:`, error);
            throw error;
        }
    }

    async getTeamRoleStats(teamId) {
        console.log(`[PermissionService] Fetching role statistics for team ${teamId}`);

        try {
            const stats = await TeamMember.aggregate([
                { $match: { team: require('mongoose').Types.ObjectId(teamId) } },
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const result = {
                owner: 0,
                admin: 0,
                member: 0,
                viewer: 0
            };

            stats.forEach(stat => {
                if (stat._id in result) {
                    result[stat._id] = stat.count;
                }
            });

            console.log(`[PermissionService] Role statistics retrieved for team ${teamId}`);
            return result;
        } catch (error) {
            console.error(`[PermissionService] Error fetching role statistics:`, error);
            throw error;
        }
    }

    async getMemberPermissions(userId, teamId) {
        console.log(`[PermissionService] Fetching all permissions for user ${userId} in team ${teamId}`);

        try {
            const member = await TeamMember.findOne({ user: userId, team: teamId });

            if (!member) {
                throw new Error('Team member not found');
            }

            const permissions = {};

            Object.keys(member.customPermissions).forEach(perm => {
                permissions[perm] = member.customPermissions[perm];
            });

            console.log(`[PermissionService] Permissions retrieved for user ${userId}`);
            return {
                role: member.role,
                permissions,
                status: member.status
            };
        } catch (error) {
            console.error(`[PermissionService] Error fetching member permissions:`, error);
            throw error;
        }
    }

    async validatePermissionsList(permissions) {
        console.log(`[PermissionService] Validating permission list`);

        const validPermissions = new Set();

        Object.values(this.rolePermissions).forEach(perms => {
            perms.forEach(p => validPermissions.add(p));
        });

        const isValid = permissions.every(p => validPermissions.has(p));
        console.log(`[PermissionService] Permission validation result: ${isValid}`);

        return isValid;
    }

    async canAccessResource(userId, teamId, resourceType, resourceId) {
        console.log(`[PermissionService] Checking resource access for user ${userId}`);

        try {
            const member = await TeamMember.findOne({ user: userId, team: teamId });

            if (!member) {
                return false;
            }

            const permissionMap = {
                'test': 'canViewTests',
                'report': 'canViewReports',
                'project': 'canViewTests',
                'file': 'canViewTests'
            };

            const requiredPermission = permissionMap[resourceType];

            if (!requiredPermission) {
                return true;
            }

            return member.hasPermission(requiredPermission);
        } catch (error) {
            console.error(`[PermissionService] Error checking resource access:`, error);
            throw error;
        }
    }

    async getEffectivePermissions(userId, teamId) {
        console.log(`[PermissionService] Computing effective permissions for user ${userId}`);

        try {
            const member = await TeamMember.findOne({ user: userId, team: teamId });

            if (!member) {
                return {};
            }

            const effective = {};

            const rolePerms = this.rolePermissions[member.role] || [];
            rolePerms.forEach(perm => {
                effective[perm] = true;
            });

            Object.keys(member.customPermissions).forEach(perm => {
                if (member.customPermissions[perm]) {
                    effective[perm] = true;
                }
            });

            console.log(`[PermissionService] Effective permissions computed for user ${userId}`);
            return effective;
        } catch (error) {
            console.error(`[PermissionService] Error computing effective permissions:`, error);
            throw error;
        }
    }
}

module.exports = new PermissionService();