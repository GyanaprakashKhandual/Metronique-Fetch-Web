const Team = require('../models/team.model');
const TeamMember = require('../models/team.member.model');
const { AuthorizationError, NotFoundError } = require('../utils/error.util');
const { catchAsync } = require('../utils/error.util');

const checkTeamMembership = catchAsync(async (req, res, next) => {
    const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
    const userId = req.user._id;

    if (!teamId) {
        throw new AuthorizationError('Team ID is required');
    }

    const membership = await TeamMember.findOne({
        team: teamId,
        user: userId,
        status: 'active'
    }).populate('team');

    if (!membership) {
        throw new AuthorizationError('You are not a member of this team');
    }

    if (membership.team.isDeleted || !membership.team.isActive) {
        throw new NotFoundError('Team');
    }

    req.teamMembership = membership;
    req.team = membership.team;

    next();
});

const requireTeamRole = (...allowedRoles) => {
    return catchAsync(async (req, res, next) => {
        if (!req.teamMembership) {
            const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
            const userId = req.user._id;

            const membership = await TeamMember.findOne({
                team: teamId,
                user: userId,
                status: 'active'
            }).populate('team');

            if (!membership) {
                throw new AuthorizationError('You are not a member of this team');
            }

            req.teamMembership = membership;
            req.team = membership.team;
        }

        if (!allowedRoles.includes(req.teamMembership.role)) {
            throw new AuthorizationError(`This action requires one of the following roles: ${allowedRoles.join(', ')}`);
        }

        next();
    });
};

const requireTeamPermission = (permission) => {
    return catchAsync(async (req, res, next) => {
        if (!req.teamMembership) {
            const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
            const userId = req.user._id;

            const membership = await TeamMember.findOne({
                team: teamId,
                user: userId,
                status: 'active'
            }).populate('team');

            if (!membership) {
                throw new AuthorizationError('You are not a member of this team');
            }

            req.teamMembership = membership;
            req.team = membership.team;
        }

        if (!req.teamMembership.hasPermission(permission)) {
            throw new AuthorizationError(`You do not have permission to ${permission}`);
        }

        next();
    });
};

const checkTeamOwnership = catchAsync(async (req, res, next) => {
    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
    const userId = req.user._id;

    const team = await Team.findById(teamId);

    if (!team) {
        throw new NotFoundError('Team');
    }

    if (team.owner.toString() !== userId.toString()) {
        throw new AuthorizationError('Only the team owner can perform this action');
    }

    req.team = team;
    next();
});

const isTeamOwnerOrAdmin = catchAsync(async (req, res, next) => {
    if (!req.teamMembership) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const userId = req.user._id;

        const membership = await TeamMember.findOne({
            team: teamId,
            user: userId,
            status: 'active'
        }).populate('team');

        if (!membership) {
            throw new AuthorizationError('You are not a member of this team');
        }

        req.teamMembership = membership;
        req.team = membership.team;
    }

    if (!['owner', 'admin'].includes(req.teamMembership.role)) {
        throw new AuthorizationError('This action requires owner or admin role');
    }

    next();
});

const canManageTeamMembers = catchAsync(async (req, res, next) => {
    if (!req.teamMembership) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const userId = req.user._id;

        const membership = await TeamMember.findOne({
            team: teamId,
            user: userId,
            status: 'active'
        }).populate('team');

        if (!membership) {
            throw new AuthorizationError('You are not a member of this team');
        }

        req.teamMembership = membership;
        req.team = membership.team;
    }

    const hasPermission = ['owner', 'admin'].includes(req.teamMembership.role) ||
        req.teamMembership.hasPermission('canManageMembers');

    if (!hasPermission) {
        throw new AuthorizationError('You do not have permission to manage team members');
    }

    next();
});

const canInviteMembers = catchAsync(async (req, res, next) => {
    if (!req.teamMembership) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const userId = req.user._id;

        const membership = await TeamMember.findOne({
            team: teamId,
            user: userId,
            status: 'active'
        }).populate('team');

        if (!membership) {
            throw new AuthorizationError('You are not a member of this team');
        }

        req.teamMembership = membership;
        req.team = membership.team;
    }

    const hasPermission = ['owner', 'admin'].includes(req.teamMembership.role) ||
        req.teamMembership.hasPermission('canInviteMembers') ||
        req.team.settings.allowMemberInvites;

    if (!hasPermission) {
        throw new AuthorizationError('You do not have permission to invite team members');
    }

    next();
});

const canRemoveMembers = catchAsync(async (req, res, next) => {
    if (!req.teamMembership) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const userId = req.user._id;

        const membership = await TeamMember.findOne({
            team: teamId,
            user: userId,
            status: 'active'
        }).populate('team');

        if (!membership) {
            throw new AuthorizationError('You are not a member of this team');
        }

        req.teamMembership = membership;
        req.team = membership.team;
    }

    const hasPermission = ['owner', 'admin'].includes(req.teamMembership.role) ||
        req.teamMembership.hasPermission('canRemoveMembers');

    if (!hasPermission) {
        throw new AuthorizationError('You do not have permission to remove team members');
    }

    next();
});

const canManageProjects = catchAsync(async (req, res, next) => {
    if (!req.teamMembership) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const userId = req.user._id;

        const membership = await TeamMember.findOne({
            team: teamId,
            user: userId,
            status: 'active'
        }).populate('team');

        if (!membership) {
            throw new AuthorizationError('You are not a member of this team');
        }

        req.teamMembership = membership;
        req.team = membership.team;
    }

    const hasPermission = ['owner', 'admin'].includes(req.teamMembership.role) ||
        req.teamMembership.hasPermission('canManageProjects');

    if (!hasPermission) {
        throw new AuthorizationError('You do not have permission to manage projects');
    }

    next();
});

const canCreateProjects = catchAsync(async (req, res, next) => {
    if (!req.teamMembership) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const userId = req.user._id;

        const membership = await TeamMember.findOne({
            team: teamId,
            user: userId,
            status: 'active'
        }).populate('team');

        if (!membership) {
            throw new AuthorizationError('You are not a member of this team');
        }

        req.teamMembership = membership;
        req.team = membership.team;
    }

    const hasPermission = ['owner', 'admin', 'member'].includes(req.teamMembership.role) ||
        req.teamMembership.hasPermission('canCreateProjects');

    if (!hasPermission) {
        throw new AuthorizationError('You do not have permission to create projects');
    }

    next();
});

const canDeleteProjects = catchAsync(async (req, res, next) => {
    if (!req.teamMembership) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const userId = req.user._id;

        const membership = await TeamMember.findOne({
            team: teamId,
            user: userId,
            status: 'active'
        }).populate('team');

        if (!membership) {
            throw new AuthorizationError('You are not a member of this team');
        }

        req.teamMembership = membership;
        req.team = membership.team;
    }

    const hasPermission = ['owner', 'admin'].includes(req.teamMembership.role) ||
        req.teamMembership.hasPermission('canDeleteProjects');

    if (!hasPermission) {
        throw new AuthorizationError('You do not have permission to delete projects');
    }

    next();
});

const canRunTests = catchAsync(async (req, res, next) => {
    if (!req.teamMembership) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const userId = req.user._id;

        const membership = await TeamMember.findOne({
            team: teamId,
            user: userId,
            status: 'active'
        }).populate('team');

        if (!membership) {
            throw new AuthorizationError('You are not a member of this team');
        }

        req.teamMembership = membership;
        req.team = membership.team;
    }

    const hasPermission = req.teamMembership.hasPermission('canRunTests');

    if (!hasPermission) {
        throw new AuthorizationError('You do not have permission to run tests');
    }

    next();
});

const canViewReports = catchAsync(async (req, res, next) => {
    if (!req.teamMembership) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const userId = req.user._id;

        const membership = await TeamMember.findOne({
            team: teamId,
            user: userId,
            status: 'active'
        }).populate('team');

        if (!membership) {
            throw new AuthorizationError('You are not a member of this team');
        }

        req.teamMembership = membership;
        req.team = membership.team;
    }

    const hasPermission = req.teamMembership.hasPermission('canViewReports');

    if (!hasPermission) {
        throw new AuthorizationError('You do not have permission to view reports');
    }

    next();
});

const canManageBilling = catchAsync(async (req, res, next) => {
    if (!req.teamMembership) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const userId = req.user._id;

        const membership = await TeamMember.findOne({
            team: teamId,
            user: userId,
            status: 'active'
        }).populate('team');

        if (!membership) {
            throw new AuthorizationError('You are not a member of this team');
        }

        req.teamMembership = membership;
        req.team = membership.team;
    }

    const hasPermission = req.teamMembership.role === 'owner' ||
        req.teamMembership.hasPermission('canManageBilling');

    if (!hasPermission) {
        throw new AuthorizationError('You do not have permission to manage billing');
    }

    next();
});

const checkTeamSubscription = catchAsync(async (req, res, next) => {
    if (!req.team) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const team = await Team.findById(teamId);

        if (!team) {
            throw new NotFoundError('Team');
        }

        req.team = team;
    }

    const subscription = req.team.subscription;

    if (!subscription || subscription.status !== 'active') {
        throw new AuthorizationError('Team subscription is not active');
    }

    next();
});

const checkTeamSeats = catchAsync(async (req, res, next) => {
    if (!req.team) {
        const teamId = req.params.teamId || req.body.teamId || req.query.teamId || req.headers['x-team-id'];
        const team = await Team.findById(teamId);

        if (!team) {
            throw new NotFoundError('Team');
        }

        req.team = team;
    }

    if (!req.team.hasAvailableSeats()) {
        throw new AuthorizationError('No available seats in team subscription. Please upgrade your plan.');
    }

    next();
});

module.exports = {
    checkTeamMembership,
    requireTeamRole,
    requireTeamPermission,
    checkTeamOwnership,
    isTeamOwnerOrAdmin,
    canManageTeamMembers,
    canInviteMembers,
    canRemoveMembers,
    canManageProjects,
    canCreateProjects,
    canDeleteProjects,
    canRunTests,
    canViewReports,
    canManageBilling,
    checkTeamSubscription,
    checkTeamSeats
};