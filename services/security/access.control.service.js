const TeamMember = require('../../models/team.member.model');
const Project = require('../../models/project.model');
const User = require('../../models/user.model');
const AuditLog = require('../../models/audit.model');

class AccessControlService {
    async checkUserPermission(userId, permission, resourceType, resourceId) {
        console.log(`[AccessControlService] Checking permission: ${permission} for user: ${userId}`);

        try {
            const user = await User.findById(userId);

            if (!user) {
                throw new Error('User not found');
            }

            if (user.role === 'super_admin') {
                console.log(`[AccessControlService] Super admin access granted`);
                return true;
            }

            switch (resourceType) {
                case 'team':
                    return await this.checkTeamPermission(userId, permission, resourceId);
                case 'project':
                    return await this.checkProjectPermission(userId, permission, resourceId);
                case 'system':
                    return await this.checkSystemPermission(userId, permission);
                default:
                    console.warn(`[AccessControlService] Unknown resource type: ${resourceType}`);
                    return false;
            }
        } catch (error) {
            console.error(`[AccessControlService] Error checking permission:`, error.message);
            return false;
        }
    }

    async checkTeamPermission(userId, permission, teamId) {
        console.log(`[AccessControlService] Checking team permission: ${permission} for team: ${teamId}`);

        try {
            const teamMember = await TeamMember.findOne({ team: teamId, user: userId });

            if (!teamMember) {
                console.warn(`[AccessControlService] User not a member of team: ${teamId}`);
                return false;
            }

            if (teamMember.status !== 'active') {
                console.warn(`[AccessControlService] Team member status is not active: ${teamMember.status}`);
                return false;
            }

            const hasPermission = teamMember.hasPermission(permission);
            console.log(`[AccessControlService] Team permission check: ${hasPermission ? 'GRANTED' : 'DENIED'}`);

            return hasPermission;
        } catch (error) {
            console.error(`[AccessControlService] Error checking team permission:`, error.message);
            return false;
        }
    }

    async checkProjectPermission(userId, permission, projectId) {
        console.log(`[AccessControlService] Checking project permission: ${permission} for project: ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                console.warn(`[AccessControlService] Project not found: ${projectId}`);
                return false;
            }

            if (project.owner.toString() === userId.toString()) {
                console.log(`[AccessControlService] Project owner access granted`);
                return true;
            }

            const isCollaborator = project.collaborators.some(c => c.user.toString() === userId.toString());

            if (!isCollaborator && project.visibility === 'private') {
                console.warn(`[AccessControlService] User not a collaborator and project is private`);
                return false;
            }

            if (project.visibility === 'public') {
                console.log(`[AccessControlService] Project is public - read access granted`);
                return permission === 'view';
            }

            if (project.team) {
                const hasTeamAccess = await this.checkTeamPermission(userId, 'canViewTests', project.team);
                console.log(`[AccessControlService] Team-based project access: ${hasTeamAccess ? 'GRANTED' : 'DENIED'}`);
                return hasTeamAccess;
            }

            console.log(`[AccessControlService] Project permission check: ${isCollaborator ? 'GRANTED' : 'DENIED'}`);
            return isCollaborator;
        } catch (error) {
            console.error(`[AccessControlService] Error checking project permission:`, error.message);
            return false;
        }
    }

    async checkSystemPermission(userId, permission) {
        console.log(`[AccessControlService] Checking system permission: ${permission} for user: ${userId}`);

        try {
            const user = await User.findById(userId);

            if (!user) {
                return false;
            }

            const systemPermissions = {
                'manage_users': ['super_admin', 'admin'],
                'manage_settings': ['super_admin', 'admin'],
                'view_audit_logs': ['super_admin', 'admin'],
                'manage_billing': ['super_admin'],
                'view_reports': ['super_admin', 'admin', 'user']
            };

            const allowedRoles = systemPermissions[permission] || [];
            const isAllowed = allowedRoles.includes(user.role);

            console.log(`[AccessControlService] System permission check: ${isAllowed ? 'GRANTED' : 'DENIED'}`);
            return isAllowed;
        } catch (error) {
            console.error(`[AccessControlService] Error checking system permission:`, error.message);
            return false;
        }
    }

    async enforceResourceOwnership(userId, resourceId, resourceType) {
        console.log(`[AccessControlService] Enforcing resource ownership for user: ${userId}`);

        try {
            if (resourceType === 'project') {
                const project = await Project.findById(resourceId);

                if (!project) {
                    throw new Error('Resource not found');
                }

                if (project.owner.toString() !== userId.toString()) {
                    throw new Error('Unauthorized: You are not the owner of this resource');
                }

                return true;
            }

            throw new Error(`Unknown resource type: ${resourceType}`);
        } catch (error) {
            console.error(`[AccessControlService] Error enforcing resource ownership:`, error.message);
            throw error;
        }
    }

    async detectSuspiciousActivity(userId, action, metadata = {}) {
        console.log(`[AccessControlService] Analyzing activity for suspicious patterns: user ${userId}`);

        try {
            const suspiciousPatterns = [];

            const recentLogs = await AuditLog.find({
                user: userId,
                createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
            }).limit(100);

            const failedLogins = recentLogs.filter(log => log.action === 'user_login' && log.status === 'failure');

            if (failedLogins.length > 5) {
                suspiciousPatterns.push({
                    type: 'brute_force_attempt',
                    severity: 'high',
                    description: `${failedLogins.length} failed login attempts in the last hour`
                });
            }

            const actions = recentLogs.map(log => log.action);
            const uniqueIPs = new Set(recentLogs.map(log => log.ipAddress).filter(Boolean));

            if (uniqueIPs.size > 5) {
                suspiciousPatterns.push({
                    type: 'multiple_locations',
                    severity: 'medium',
                    description: `Access from ${uniqueIPs.size} different IP addresses`
                });
            }

            const dataAccess = recentLogs.filter(log => log.action.includes('accessed'));
            if (dataAccess.length > 50) {
                suspiciousPatterns.push({
                    type: 'excessive_data_access',
                    severity: 'medium',
                    description: `${dataAccess.length} data access operations in the last hour`
                });
            }

            if (suspiciousPatterns.length > 0) {
                console.warn(`[AccessControlService] Suspicious activity detected: ${suspiciousPatterns.length} patterns`);

                await AuditLog.create({
                    user: userId,
                    action: 'suspicious_activity_detected',
                    actionCategory: 'security',
                    entityType: 'user',
                    entityId: userId,
                    status: 'warning',
                    severity: 'warning',
                    details: {
                        description: 'Suspicious activity detected',
                        patterns: suspiciousPatterns
                    }
                });
            }

            return suspiciousPatterns;
        } catch (error) {
            console.error(`[AccessControlService] Error detecting suspicious activity:`, error.message);
            return [];
        }
    }

    async denyAccessBasedOnActivity(userId) {
        console.log(`[AccessControlService] Evaluating access denial based on suspicious activity`);

        try {
            const suspiciousPatterns = await this.detectSuspiciousActivity(userId, 'access_check');

            const criticalPatterns = suspiciousPatterns.filter(p => p.severity === 'critical');

            if (criticalPatterns.length > 0) {
                console.warn(`[AccessControlService] Access denied due to critical suspicious activity`);

                await AuditLog.create({
                    user: userId,
                    action: 'access_denied_suspicious_activity',
                    actionCategory: 'security',
                    entityType: 'user',
                    entityId: userId,
                    status: 'failure',
                    severity: 'critical',
                    details: {
                        description: 'Access denied due to suspicious activity',
                        reason: 'Critical security patterns detected'
                    }
                });

                return { denied: true, reason: 'Suspicious activity detected' };
            }

            return { denied: false };
        } catch (error) {
            console.error(`[AccessControlService] Error evaluating access denial:`, error.message);
            return { denied: false };
        }
    }

    async createAccessPolicy(policyName, rules, createdBy) {
        console.log(`[AccessControlService] Creating access policy: ${policyName}`);

        try {
            const policy = {
                id: `policy-${Date.now()}`,
                name: policyName,
                rules: rules,
                createdBy: createdBy,
                createdAt: new Date(),
                isActive: true
            };

            await AuditLog.create({
                user: createdBy,
                action: 'access_policy_created',
                actionCategory: 'security',
                entityType: 'access_policy',
                status: 'success',
                severity: 'info',
                details: {
                    description: `Access policy created: ${policyName}`,
                    policyId: policy.id
                }
            });

            console.log(`[AccessControlService] Access policy created: ${policyName}`);
            return policy;
        } catch (error) {
            console.error(`[AccessControlService] Error creating access policy:`, error.message);
            throw error;
        }
    }

    async enforceAccessPolicy(userId, action, resource, policy) {
        console.log(`[AccessControlService] Enforcing access policy for user: ${userId}`);

        try {
            if (!policy || !policy.isActive) {
                return { allowed: true };
            }

            for (const rule of policy.rules) {
                if (rule.action === action && rule.resource === resource) {
                    const isAllowed = rule.roles.includes('*') || rule.roles.some(role => {
                        return role;
                    });

                    console.log(`[AccessControlService] Policy enforcement result: ${isAllowed ? 'ALLOWED' : 'DENIED'}`);
                    return { allowed: isAllowed, reason: rule.reason };
                }
            }

            return { allowed: true };
        } catch (error) {
            console.error(`[AccessControlService] Error enforcing access policy:`, error.message);
            return { allowed: false, reason: 'Policy enforcement error' };
        }
    }

    async auditAccessAttempt(userId, resource, permission, granted, metadata = {}) {
        console.log(`[AccessControlService] Auditing access attempt: user ${userId}, resource ${resource}, permission ${permission}`);

        try {
            await AuditLog.create({
                user: userId,
                action: granted ? 'access_granted' : 'access_denied',
                actionCategory: 'security',
                entityType: 'resource_access',
                status: granted ? 'success' : 'failure',
                severity: granted ? 'info' : 'warning',
                details: {
                    description: `Access ${granted ? 'granted' : 'denied'}`,
                    resource: resource,
                    permission: permission
                },
                ...metadata
            });

            console.log(`[AccessControlService] Access attempt audited`);
        } catch (error) {
            console.error(`[AccessControlService] Error auditing access attempt:`, error.message);
        }
    }

    async getAccessReport(userId) {
        console.log(`[AccessControlService] Generating access report for user: ${userId}`);

        try {
            const user = await User.findById(userId);
            const teamMemberships = await TeamMember.find({ user: userId }).populate('team');
            const ownedProjects = await Project.find({ owner: userId });
            const collaborativeProjects = await Project.find({ 'collaborators.user': userId });

            const report = {
                userId: userId,
                userRole: user?.role,
                teams: teamMemberships.map(tm => ({
                    teamId: tm.team._id,
                    teamName: tm.team.name,
                    role: tm.role,
                    permissions: tm.customPermissions
                })),
                ownedProjects: ownedProjects.map(p => ({
                    projectId: p._id,
                    projectName: p.name,
                    access: 'owner'
                })),
                collaborativeProjects: collaborativeProjects.map(p => ({
                    projectId: p._id,
                    projectName: p.name,
                    access: 'collaborator'
                }))
            };

            console.log(`[AccessControlService] Access report generated`);
            return report;
        } catch (error) {
            console.error(`[AccessControlService] Error generating access report:`, error.message);
            throw error;
        }
    }

    async revokeAccess(userId, resourceType, resourceId, revokedBy) {
        console.log(`[AccessControlService] Revoking access for user: ${userId}`);

        try {
            if (resourceType === 'project') {
                const project = await Project.findById(resourceId);

                if (!project) {
                    throw new Error('Project not found');
                }

                project.collaborators = project.collaborators.filter(c => c.user.toString() !== userId.toString());
                await project.save();
            } else if (resourceType === 'team') {
                const teamMember = await TeamMember.findOneAndDelete({ team: resourceId, user: userId });

                if (!teamMember) {
                    throw new Error('Team member not found');
                }
            }

            await AuditLog.create({
                user: revokedBy,
                action: 'access_revoked',
                actionCategory: 'security',
                entityType: 'resource_access',
                status: 'success',
                severity: 'warning',
                details: {
                    description: `Access revoked for user: ${userId}`,
                    resourceType: resourceType,
                    resourceId: resourceId
                }
            });

            console.log(`[AccessControlService] Access revoked successfully for user: ${userId}`);
            return { success: true, message: 'Access revoked successfully' };
        } catch (error) {
            console.error(`[AccessControlService] Error revoking access:`, error.message);
            throw error;
        }
    }
}

module.exports = new AccessControlService();