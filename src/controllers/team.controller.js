const Team = require('../models/team.model');
const TeamMember = require('../models/team.member.model');
const AuditLog = require('../models/audit.model');
const { catchAsync } = require('../utils/error.util');
const teamService = require('../services/team/team.service');
const memberService = require('../services/team/member.service');
const invitationService = require('../services/team/invitation.service');
const permissionService = require('../services/team/permission.service');

const createTeam = catchAsync(async (req, res) => {
    const { name, description, settings } = req.body;
    console.log(`[TEAM_CONTROLLER] Creating team: ${name} for user: ${req.user._id}`);

    if (!name) {
        console.warn(`[TEAM_CONTROLLER] Team creation failed: Name missing`);
        return res.status(400).json({
            success: false,
            message: 'Team name is required',
            code: 'NAME_REQUIRED'
        });
    }

    const team = await teamService.createTeam(
        { name, description, settings },
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Team created successfully: ${team._id}`);

    return res.status(201).json({
        success: true,
        message: 'Team created successfully',
        data: { team }
    });
});

const getTeamById = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    console.log(`[TEAM_CONTROLLER] Fetching team: ${teamId}`);

    const team = await teamService.getTeamById(teamId, req.user._id);

    if (!team) {
        console.warn(`[TEAM_CONTROLLER] Team not found or unauthorized: ${teamId}`);
        return res.status(404).json({
            success: false,
            message: 'Team not found or you do not have access',
            code: 'TEAM_NOT_FOUND'
        });
    }

    console.log(`[TEAM_CONTROLLER] Team fetched: ${team.name}`);

    return res.json({
        success: true,
        data: { team }
    });
});

const getUserTeams = catchAsync(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    console.log(`[TEAM_CONTROLLER] Fetching teams for user: ${req.user._id}`);

    const { teams, total } = await teamService.getUserTeams(req.user._id, {
        skip: (page - 1) * limit,
        limit: parseInt(limit)
    });

    console.log(`[TEAM_CONTROLLER] Teams fetched: ${teams.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            teams,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

const updateTeam = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { name, description, avatar, settings } = req.body;
    console.log(`[TEAM_CONTROLLER] Updating team: ${teamId}`);

    const team = await teamService.updateTeam(
        teamId,
        { name, description, avatar, settings },
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Team updated successfully: ${teamId}`);

    return res.json({
        success: true,
        message: 'Team updated successfully',
        data: { team }
    });
});

const deleteTeam = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    console.log(`[TEAM_CONTROLLER] Deleting team: ${teamId}`);

    const result = await teamService.deleteTeam(
        teamId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Team deleted successfully: ${teamId}`);

    return res.json({
        success: true,
        message: 'Team deleted successfully',
        data: result
    });
});

const archiveTeam = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    console.log(`[TEAM_CONTROLLER] Archiving team: ${teamId}`);

    const team = await teamService.archiveTeam(
        teamId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Team archived successfully: ${teamId}`);

    return res.json({
        success: true,
        message: 'Team archived successfully',
        data: { team }
    });
});

const getTeamStats = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    console.log(`[TEAM_CONTROLLER] Fetching stats for team: ${teamId}`);

    const stats = await teamService.getTeamStats(teamId);

    console.log(`[TEAM_CONTROLLER] Team stats fetched: ${teamId}`);

    return res.json({
        success: true,
        data: { stats }
    });
});

const addTeamMember = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { userId, role } = req.body;
    console.log(`[TEAM_CONTROLLER] Adding member ${userId} to team ${teamId} with role ${role}`);

    if (!userId) {
        console.warn(`[TEAM_CONTROLLER] Add member failed: User ID missing`);
        return res.status(400).json({
            success: false,
            message: 'User ID is required',
            code: 'USER_ID_REQUIRED'
        });
    }

    const member = await memberService.addMember(
        teamId,
        userId,
        role || 'member',
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Member added successfully: ${userId}`);

    return res.status(201).json({
        success: true,
        message: 'Member added successfully',
        data: { member }
    });
});

const getTeamMembers = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { page = 1, limit = 20, search, role, status } = req.query;
    console.log(`[TEAM_CONTROLLER] Fetching members for team: ${teamId}`);

    const query = { team: teamId };

    if (status) {
        query.status = status;
    }

    if (role) {
        query.role = role;
    }

    const skip = (page - 1) * limit;

    let members = await TeamMember.find(query)
        .populate('user', 'firstName lastName email avatar')
        .populate('invitedBy', 'firstName lastName email')
        .sort({ joinedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

    if (search) {
        members = members.filter(m => {
            const userFullName = `${m.user.firstName || ''} ${m.user.lastName || ''}`.toLowerCase();
            const userEmail = m.user.email.toLowerCase();
            const searchLower = search.toLowerCase();
            return userFullName.includes(searchLower) || userEmail.includes(searchLower);
        });
    }

    const total = await TeamMember.countDocuments(query);

    console.log(`[TEAM_CONTROLLER] Members fetched: ${members.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            members,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

const removeMember = catchAsync(async (req, res) => {
    const { teamId, memberId } = req.params;
    console.log(`[TEAM_CONTROLLER] Removing member ${memberId} from team ${teamId}`);

    const result = await memberService.removeMember(
        teamId,
        memberId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Member removed successfully: ${memberId}`);

    return res.json({
        success: true,
        message: 'Member removed successfully',
        data: result
    });
});

const updateMemberRole = catchAsync(async (req, res) => {
    const { teamId, memberId } = req.params;
    const { role } = req.body;
    console.log(`[TEAM_CONTROLLER] Updating member ${memberId} role to ${role}`);

    if (!role) {
        console.warn(`[TEAM_CONTROLLER] Update member role failed: Role missing`);
        return res.status(400).json({
            success: false,
            message: 'Role is required',
            code: 'ROLE_REQUIRED'
        });
    }

    const member = await memberService.updateMemberRole(
        teamId,
        memberId,
        role,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Member role updated successfully: ${memberId}`);

    return res.json({
        success: true,
        message: 'Member role updated successfully',
        data: { member }
    });
});

const updateMemberPermissions = catchAsync(async (req, res) => {
    const { teamId, memberId } = req.params;
    const { permissions } = req.body;
    console.log(`[TEAM_CONTROLLER] Updating permissions for member ${memberId}`);

    if (!permissions) {
        console.warn(`[TEAM_CONTROLLER] Update permissions failed: Permissions object missing`);
        return res.status(400).json({
            success: false,
            message: 'Permissions object is required',
            code: 'PERMISSIONS_REQUIRED'
        });
    }

    const member = await memberService.updateMemberPermissions(
        teamId,
        memberId,
        permissions,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Member permissions updated: ${memberId}`);

    return res.json({
        success: true,
        message: 'Member permissions updated successfully',
        data: { member }
    });
});

const suspendMember = catchAsync(async (req, res) => {
    const { teamId, memberId } = req.params;
    console.log(`[TEAM_CONTROLLER] Suspending member ${memberId}`);

    const member = await memberService.suspendMember(
        teamId,
        memberId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Member suspended: ${memberId}`);

    return res.json({
        success: true,
        message: 'Member suspended successfully',
        data: { member }
    });
});

const reactivateMember = catchAsync(async (req, res) => {
    const { teamId, memberId } = req.params;
    console.log(`[TEAM_CONTROLLER] Reactivating member ${memberId}`);

    const member = await memberService.reactivateMember(
        teamId,
        memberId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Member reactivated: ${memberId}`);

    return res.json({
        success: true,
        message: 'Member reactivated successfully',
        data: { member }
    });
});

const inviteMember = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { email, role, message } = req.body;
    console.log(`[TEAM_CONTROLLER] Inviting member to team: ${teamId} - ${email}`);

    if (!email) {
        console.warn(`[TEAM_CONTROLLER] Invite member failed: Email missing`);
        return res.status(400).json({
            success: false,
            message: 'Email is required',
            code: 'EMAIL_REQUIRED'
        });
    }

    const invitation = await invitationService.sendInvitation(
        teamId,
        email,
        role || 'member',
        req.user._id,
        message,
        [],
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Invitation sent successfully: ${email}`);

    return res.status(201).json({
        success: true,
        message: 'Invitation sent successfully',
        data: { invitation }
    });
});

const bulkInviteMembers = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { invitations } = req.body;
    console.log(`[TEAM_CONTROLLER] Bulk inviting ${invitations.length} members to team: ${teamId}`);

    if (!invitations || !Array.isArray(invitations) || invitations.length === 0) {
        console.warn(`[TEAM_CONTROLLER] Bulk invite failed: Invalid invitations array`);
        return res.status(400).json({
            success: false,
            message: 'Invitations array is required',
            code: 'INVITATIONS_REQUIRED'
        });
    }

    const results = [];

    for (const inv of invitations) {
        try {
            const invitation = await invitationService.sendInvitation(
                teamId,
                inv.email,
                inv.role || 'member',
                req.user._id,
                inv.message || '',
                [],
                {
                    ipAddress: req.ip,
                    userAgent: req.get('user-agent'),
                    requestId: req.id
                }
            );
            results.push({ email: inv.email, success: true, invitation });
        } catch (error) {
            console.warn(`[TEAM_CONTROLLER] Bulk invite failed for ${inv.email}: ${error.message}`);
            results.push({ email: inv.email, success: false, error: error.message });
        }
    }

    console.log(`[TEAM_CONTROLLER] Bulk invitations completed: ${results.filter(r => r.success).length} successful`);

    return res.json({
        success: true,
        message: 'Bulk invitations sent',
        data: { results }
    });
});

const getTeamInvitations = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { page = 1, limit = 20, status } = req.query;
    console.log(`[TEAM_CONTROLLER] Fetching invitations for team: ${teamId}`);

    const { invitations, total } = await invitationService.getTeamInvitations(teamId, {
        status,
        skip: (page - 1) * limit,
        limit: parseInt(limit)
    });

    console.log(`[TEAM_CONTROLLER] Invitations fetched: ${invitations.length} of ${total}`);

    return res.json({
        success: true,
        data: {
            invitations,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        }
    });
});

const resendInvitation = catchAsync(async (req, res) => {
    const { teamId, invitationId } = req.params;
    console.log(`[TEAM_CONTROLLER] Resending invitation: ${invitationId}`);

    const invitation = await invitationService.resendInvitation(
        invitationId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Invitation resent successfully: ${invitationId}`);

    return res.json({
        success: true,
        message: 'Invitation resent successfully',
        data: { invitation }
    });
});

const cancelInvitation = catchAsync(async (req, res) => {
    const { teamId, invitationId } = req.params;
    console.log(`[TEAM_CONTROLLER] Cancelling invitation: ${invitationId}`);

    const invitation = await invitationService.cancelInvitation(
        invitationId,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Invitation cancelled: ${invitationId}`);

    return res.json({
        success: true,
        message: 'Invitation cancelled successfully',
        data: { invitation }
    });
});

const upgradeSubscription = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { plan, seats } = req.body;
    console.log(`[TEAM_CONTROLLER] Upgrading subscription for team: ${teamId} to plan: ${plan}`);

    if (!plan || !seats) {
        console.warn(`[TEAM_CONTROLLER] Subscription upgrade failed: Missing fields`);
        return res.status(400).json({
            success: false,
            message: 'Plan and seats are required',
            code: 'MISSING_FIELDS'
        });
    }

    const team = await teamService.upgradeSubscription(
        teamId,
        plan,
        seats,
        req.user._id,
        {
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            requestId: req.id
        }
    );

    console.log(`[TEAM_CONTROLLER] Subscription upgraded: ${teamId}`);

    return res.json({
        success: true,
        message: 'Subscription upgraded successfully',
        data: { team }
    });
});

const checkPermission = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { permission } = req.query;
    console.log(`[TEAM_CONTROLLER] Checking permission ${permission} for user in team ${teamId}`);

    if (!permission) {
        console.warn(`[TEAM_CONTROLLER] Permission check failed: Permission missing`);
        return res.status(400).json({
            success: false,
            message: 'Permission is required',
            code: 'PERMISSION_REQUIRED'
        });
    }

    const hasPermission = await permissionService.checkPermission(
        req.user._id,
        teamId,
        permission
    );

    console.log(`[TEAM_CONTROLLER] Permission check result: ${permission} - ${hasPermission}`);

    return res.json({
        success: true,
        data: { hasPermission }
    });
});

const getMemberPermissions = catchAsync(async (req, res) => {
    const { teamId, memberId } = req.params;
    console.log(`[TEAM_CONTROLLER] Fetching permissions for member: ${memberId}`);

    const permissions = await permissionService.getMemberPermissions(memberId, teamId);

    console.log(`[TEAM_CONTROLLER] Permissions fetched for member: ${memberId}`);

    return res.json({
        success: true,
        data: { permissions }
    });
});

const getTeamRoleStats = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    console.log(`[TEAM_CONTROLLER] Fetching role stats for team: ${teamId}`);

    const stats = await permissionService.getTeamRoleStats(teamId);

    console.log(`[TEAM_CONTROLLER] Role stats fetched: ${teamId}`);

    return res.json({
        success: true,
        data: { stats }
    });
});

const updateTeamSettings = catchAsync(async (req, res) => {
    const { teamId } = req.params;
    const { settings } = req.body;
    console.log(`[TEAM_CONTROLLER] Updating settings for team: ${teamId}`);

    if (!settings) {
        console.warn(`[TEAM_CONTROLLER] Settings update failed: Settings missing`);
        return res.status(400).json({
            success: false,
            message: 'Settings object is required',
            code: 'SETTINGS_REQUIRED'
        });
    }

    const team = await Team.findByIdAndUpdate(
        teamId,
        { settings },
        { new: true, runValidators: true }
    );

    if (!team) {
        console.warn(`[TEAM_CONTROLLER] Settings update failed: Team not found - ${teamId}`);
        return res.status(404).json({
            success: false,
            message: 'Team not found',
            code: 'TEAM_NOT_FOUND'
        });
    }

    await AuditLog.create({
        user: req.user._id,
        action: 'team_settings_updated',
        actionCategory: 'team',
        entityType: 'team',
        entityId: team._id,
        status: 'success',
        severity: 'info',
        details: { description: 'Team settings updated' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId: req.id
    });

    console.log(`[TEAM_CONTROLLER] Team settings updated: ${teamId}`);

    return res.json({
        success: true,
        message: 'Team settings updated successfully',
        data: { team }
    });
});

module.exports = {
    createTeam,
    getTeamById,
    getUserTeams,
    updateTeam,
    deleteTeam,
    archiveTeam,
    getTeamStats,
    addTeamMember,
    getTeamMembers,
    removeMember,
    updateMemberRole,
    updateMemberPermissions,
    suspendMember,
    reactivateMember,
    inviteMember,
    bulkInviteMembers,
    getTeamInvitations,
    resendInvitation,
    cancelInvitation,
    upgradeSubscription,
    checkPermission,
    getMemberPermissions,
    getTeamRoleStats,
    updateTeamSettings
};