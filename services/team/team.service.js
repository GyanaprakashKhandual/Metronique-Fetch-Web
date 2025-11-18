const mongoose = require('mongoose');
const Team = require('../../models/team.model');
const TeamMember = require('../../models/team.member.model');
const User = require('../../models/user.model');
const Project = require('../../models/project.model');
const AuditLog = require('../../models/audit.model');

class TeamService {
    async createTeam(teamData, userId, metadata = {}) {
        console.log(`[TeamService] Creating team: ${teamData.name} for user: ${userId}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const newTeam = new Team({
                name: teamData.name,
                description: teamData.description,
                owner: userId,
                settings: teamData.settings || {}
            });

            await newTeam.save({ session });

            const ownerMember = new TeamMember({
                team: newTeam._id,
                user: userId,
                role: 'owner',
                status: 'active',
                joinedAt: Date.now()
            });

            await ownerMember.save({ session });

            newTeam.members.push(ownerMember._id);
            newTeam.subscription.usedSeats = 1;
            newTeam.stats.totalMembers = 1;

            await newTeam.save({ session });

            await User.findByIdAndUpdate(userId, {
                $push: { ownedTeams: newTeam._id }
            }, { session });

            await AuditLog.create([{
                user: userId,
                action: 'team_created',
                actionCategory: 'team',
                entityType: 'team',
                entityId: newTeam._id,
                entityName: newTeam.name,
                status: 'success',
                severity: 'info',
                details: { description: `Team created: ${newTeam.name}` },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[TeamService] Team created successfully: ${newTeam._id}`);

            return newTeam;
        } catch (error) {
            await session.abortTransaction();
            console.error(`[TeamService] Error creating team:`, error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getTeamById(teamId, userId = null) {
        console.log(`[TeamService] Fetching team: ${teamId}`);

        try {
            const team = await Team.findById(teamId)
                .populate('owner', 'firstName lastName email avatar')
                .populate({
                    path: 'members',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName email avatar'
                    }
                })
                .populate('projects', 'name description');

            if (!team) {
                console.warn(`[TeamService] Team not found: ${teamId}`);
                return null;
            }

            if (userId) {
                const userMember = team.members.find(m => m.user._id.toString() === userId.toString());
                if (!userMember && team.owner._id.toString() !== userId.toString()) {
                    console.warn(`[TeamService] User ${userId} not authorized to access team ${teamId}`);
                    return null;
                }
            }

            return team;
        } catch (error) {
            console.error(`[TeamService] Error fetching team:`, error);
            throw error;
        }
    }

    async getUserTeams(userId, options = {}) {
        console.log(`[TeamService] Fetching teams for user: ${userId}`);

        try {
            const query = {
                $or: [
                    { owner: userId },
                    { 'members.user': userId }
                ],
                isDeleted: false
            };

            const teams = await Team.find(query)
                .populate('owner', 'firstName lastName email')
                .populate({
                    path: 'members',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName email avatar'
                    }
                })
                .sort({ createdAt: -1 })
                .skip(options.skip || 0)
                .limit(options.limit || 10);

            const total = await Team.countDocuments(query);

            console.log(`[TeamService] Found ${teams.length} teams for user: ${userId}`);
            return { teams, total };
        } catch (error) {
            console.error(`[TeamService] Error fetching user teams:`, error);
            throw error;
        }
    }

    async updateTeam(teamId, updates, userId, metadata = {}) {
        console.log(`[TeamService] Updating team: ${teamId}`);

        try {
            const team = await Team.findById(teamId);

            if (!team) {
                throw new Error('Team not found');
            }

            const userMember = await TeamMember.findOne({ team: teamId, user: userId });

            if (!userMember || (!userMember.hasPermission('canManageTeam') && team.owner.toString() !== userId.toString())) {
                throw new Error('Unauthorized to update team');
            }

            const allowedFields = ['name', 'description', 'avatar', 'settings'];
            const filteredUpdates = {};

            allowedFields.forEach(field => {
                if (field in updates) {
                    filteredUpdates[field] = updates[field];
                }
            });

            const before = { ...team.toObject() };
            const updatedTeam = await Team.findByIdAndUpdate(
                teamId,
                { $set: filteredUpdates },
                { new: true, runValidators: true }
            );

            await AuditLog.create({
                user: userId,
                action: 'team_updated',
                actionCategory: 'team',
                entityType: 'team',
                entityId: teamId,
                entityName: updatedTeam.name,
                status: 'success',
                severity: 'info',
                changes: { before, after: filteredUpdates },
                ...metadata
            });

            console.log(`[TeamService] Team updated successfully: ${teamId}`);
            return updatedTeam;
        } catch (error) {
            console.error(`[TeamService] Error updating team:`, error);
            throw error;
        }
    }

    async deleteTeam(teamId, userId, metadata = {}) {
        console.log(`[TeamService] Deleting team: ${teamId}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const team = await Team.findById(teamId);

            if (!team) {
                throw new Error('Team not found');
            }

            if (team.owner.toString() !== userId.toString()) {
                throw new Error('Only team owner can delete team');
            }

            team.isDeleted = true;
            team.deletedAt = Date.now();
            team.deletedBy = userId;

            await team.save({ session });

            await TeamMember.deleteMany({ team: teamId }, { session });
            await Project.updateMany(
                { team: teamId },
                { $set: { isDeleted: true, deletedAt: Date.now() } },
                { session }
            );

            await User.findByIdAndUpdate(
                userId,
                { $pull: { ownedTeams: teamId } },
                { session }
            );

            await AuditLog.create([{
                user: userId,
                action: 'team_deleted',
                actionCategory: 'team',
                entityType: 'team',
                entityId: teamId,
                entityName: team.name,
                status: 'success',
                severity: 'warning',
                details: { description: `Team deleted: ${team.name}` },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[TeamService] Team deleted successfully: ${teamId}`);

            return { success: true, message: 'Team deleted successfully' };
        } catch (error) {
            await session.abortTransaction();
            console.error(`[TeamService] Error deleting team:`, error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getTeamStats(teamId) {
        console.log(`[TeamService] Fetching stats for team: ${teamId}`);

        try {
            const team = await Team.findById(teamId);

            if (!team) {
                throw new Error('Team not found');
            }

            const memberCount = await TeamMember.countDocuments({
                team: teamId,
                status: 'active'
            });

            const projectCount = await Project.countDocuments({
                team: teamId,
                isDeleted: false
            });

            const stats = {
                totalMembers: memberCount,
                totalProjects: projectCount,
                usedSeats: team.subscription.usedSeats,
                availableSeats: team.subscription.seats - team.subscription.usedSeats,
                subscriptionPlan: team.subscription.plan,
                subscriptionStatus: team.subscription.status
            };

            console.log(`[TeamService] Stats retrieved for team: ${teamId}`, stats);
            return stats;
        } catch (error) {
            console.error(`[TeamService] Error fetching team stats:`, error);
            throw error;
        }
    }

    async archiveTeam(teamId, userId, metadata = {}) {
        console.log(`[TeamService] Archiving team: ${teamId}`);

        try {
            const team = await Team.findById(teamId);

            if (!team) {
                throw new Error('Team not found');
            }

            if (team.owner.toString() !== userId.toString()) {
                throw new Error('Only team owner can archive team');
            }

            team.isActive = false;
            await team.save();

            await AuditLog.create({
                user: userId,
                action: 'team_archived',
                actionCategory: 'team',
                entityType: 'team',
                entityId: teamId,
                entityName: team.name,
                status: 'success',
                severity: 'info',
                ...metadata
            });

            console.log(`[TeamService] Team archived successfully: ${teamId}`);
            return team;
        } catch (error) {
            console.error(`[TeamService] Error archiving team:`, error);
            throw error;
        }
    }

    async upgradeSubscription(teamId, newPlan, seats, userId, metadata = {}) {
        console.log(`[TeamService] Upgrading subscription for team: ${teamId} to plan: ${newPlan}`);

        try {
            const team = await Team.findById(teamId);

            if (!team) {
                throw new Error('Team not found');
            }

            const userMember = await TeamMember.findOne({ team: teamId, user: userId });

            if (!userMember || !userMember.hasPermission('canManageBilling')) {
                throw new Error('Unauthorized to upgrade subscription');
            }

            const before = { ...team.subscription };

            team.subscription.plan = newPlan;
            team.subscription.seats = seats;
            team.subscription.status = 'active';

            await team.save();

            await AuditLog.create({
                user: userId,
                action: 'subscription_updated',
                actionCategory: 'billing',
                entityType: 'team',
                entityId: teamId,
                entityName: team.name,
                status: 'success',
                severity: 'info',
                changes: { before, after: team.subscription },
                ...metadata
            });

            console.log(`[TeamService] Subscription upgraded for team: ${teamId}`);
            return team;
        } catch (error) {
            console.error(`[TeamService] Error upgrading subscription:`, error);
            throw error;
        }
    }
}

module.exports = new TeamService();