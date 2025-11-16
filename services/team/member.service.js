const mongoose = require('mongoose');
const TeamMember = require('../models/team.member.model');
const Team = require('../models/team.model');
const User = require('../models/user.model');
const AuditLog = require('../models/audit.log.model');

class MemberService {
    async addMember(teamId, userId, role = 'member', invitedById, metadata = {}) {
        console.log(`[MemberService] Adding member ${userId} to team ${teamId} with role ${role}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const team = await Team.findById(teamId).session(session);

            if (!team) {
                throw new Error('Team not found');
            }

            if (!team.hasAvailableSeats()) {
                throw new Error('No available seats in team subscription');
            }

            const existingMember = await TeamMember.findOne({ team: teamId, user: userId }).session(session);

            if (existingMember) {
                throw new Error('User is already a member of this team');
            }

            const newMember = new TeamMember({
                team: teamId,
                user: userId,
                role,
                status: 'active',
                invitedBy: invitedById,
                invitedAt: Date.now(),
                joinedAt: Date.now()
            });

            await newMember.save({ session });

            team.members.push(newMember._id);
            team.subscription.usedSeats++;
            team.stats.totalMembers++;

            await team.save({ session });

            await User.findByIdAndUpdate(
                userId,
                { $push: { teamMemberships: newMember._id } },
                { session }
            );

            await AuditLog.create([{
                user: invitedById,
                action: 'team_member_added',
                actionCategory: 'team',
                entityType: 'team',
                entityId: teamId,
                entityName: team.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Member ${userId} added to team with role ${role}`,
                    memberId: userId,
                    role
                },
                affectedUsers: [userId],
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[MemberService] Member added successfully to team ${teamId}`);

            return newMember;
        } catch (error) {
            await session.abortTransaction();
            console.error(`[MemberService] Error adding member:`, error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getMembersByTeam(teamId, options = {}) {
        console.log(`[MemberService] Fetching members for team ${teamId}`);

        try {
            const query = { team: teamId, status: 'active' };

            const members = await TeamMember.find(query)
                .populate('user', 'firstName lastName email avatar')
                .populate('invitedBy', 'firstName lastName email')
                .sort({ joinedAt: -1 })
                .skip(options.skip || 0)
                .limit(options.limit || 50);

            const total = await TeamMember.countDocuments(query);

            console.log(`[MemberService] Found ${members.length} members for team ${teamId}`);
            return { members, total };
        } catch (error) {
            console.error(`[MemberService] Error fetching team members:`, error);
            throw error;
        }
    }

    async getMemberById(memberId) {
        console.log(`[MemberService] Fetching member ${memberId}`);

        try {
            const member = await TeamMember.findById(memberId)
                .populate('user', 'firstName lastName email avatar')
                .populate('team', 'name');

            if (!member) {
                console.warn(`[MemberService] Member not found ${memberId}`);
                return null;
            }

            return member;
        } catch (error) {
            console.error(`[MemberService] Error fetching member:`, error);
            throw error;
        }
    }

    async updateMemberRole(teamId, memberId, newRole, updatedById, metadata = {}) {
        console.log(`[MemberService] Updating member ${memberId} role to ${newRole}`);

        try {
            const member = await TeamMember.findOne({ _id: memberId, team: teamId });

            if (!member) {
                throw new Error('Member not found in this team');
            }

            const updater = await TeamMember.findOne({ team: teamId, user: updatedById });

            if (!updater || (!updater.hasPermission('canManageMembers') && member.role !== 'owner')) {
                throw new Error('Unauthorized to update member role');
            }

            const before = { role: member.role };
            const allowedRoles = ['member', 'admin', 'viewer'];

            if (!allowedRoles.includes(newRole)) {
                throw new Error('Invalid role');
            }

            member.role = newRole;
            await member.save();

            await AuditLog.create({
                user: updatedById,
                action: 'team_member_role_changed',
                actionCategory: 'team',
                entityType: 'team',
                entityId: teamId,
                entityName: member.team,
                status: 'success',
                severity: 'info',
                changes: { before, after: { role: newRole } },
                affectedUsers: [member.user],
                ...metadata
            });

            console.log(`[MemberService] Member role updated successfully`);
            return member;
        } catch (error) {
            console.error(`[MemberService] Error updating member role:`, error);
            throw error;
        }
    }

    async removeMember(teamId, memberId, removedById, metadata = {}) {
        console.log(`[MemberService] Removing member ${memberId} from team ${teamId}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const team = await Team.findById(teamId).session(session);
            const member = await TeamMember.findOne({ _id: memberId, team: teamId }).session(session);

            if (!team || !member) {
                throw new Error('Team or member not found');
            }

            if (member.role === 'owner') {
                throw new Error('Cannot remove team owner');
            }

            const remover = await TeamMember.findOne({ team: teamId, user: removedById }).session(session);

            if (!remover || (!remover.hasPermission('canRemoveMembers') && member.user.toString() !== removedById.toString())) {
                throw new Error('Unauthorized to remove member');
            }

            team.members = team.members.filter(m => m.toString() !== memberId.toString());
            team.subscription.usedSeats--;
            team.stats.totalMembers--;

            await team.save({ session });

            await TeamMember.findByIdAndDelete(memberId, { session });

            await User.findByIdAndUpdate(
                member.user,
                { $pull: { teamMemberships: memberId } },
                { session }
            );

            await AuditLog.create([{
                user: removedById,
                action: 'team_member_removed',
                actionCategory: 'team',
                entityType: 'team',
                entityId: teamId,
                entityName: team.name,
                status: 'success',
                severity: 'info',
                details: { description: `Member removed from team`, memberId: member.user },
                affectedUsers: [member.user],
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[MemberService] Member removed successfully from team ${teamId}`);

            return { success: true, message: 'Member removed successfully' };
        } catch (error) {
            await session.abortTransaction();
            console.error(`[MemberService] Error removing member:`, error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async updateMemberPermissions(teamId, memberId, permissions, updatedById, metadata = {}) {
        console.log(`[MemberService] Updating permissions for member ${memberId}`);

        try {
            const member = await TeamMember.findOne({ _id: memberId, team: teamId });

            if (!member) {
                throw new Error('Member not found');
            }

            const updater = await TeamMember.findOne({ team: teamId, user: updatedById });

            if (!updater || !updater.hasPermission('canManageMembers')) {
                throw new Error('Unauthorized to update member permissions');
            }

            const before = { ...member.customPermissions };

            Object.keys(permissions).forEach(key => {
                if (key in member.customPermissions) {
                    member.customPermissions[key] = permissions[key];
                }
            });

            await member.save();

            await AuditLog.create({
                user: updatedById,
                action: 'permission_changed',
                actionCategory: 'authorization',
                entityType: 'team',
                entityId: teamId,
                entityName: member.team,
                status: 'success',
                severity: 'info',
                changes: { before, after: member.customPermissions },
                affectedUsers: [member.user],
                ...metadata
            });

            console.log(`[MemberService] Member permissions updated successfully`);
            return member;
        } catch (error) {
            console.error(`[MemberService] Error updating member permissions:`, error);
            throw error;
        }
    }

    async getMemberActivity(memberId, options = {}) {
        console.log(`[MemberService] Fetching activity for member ${memberId}`);

        try {
            const member = await TeamMember.findById(memberId);

            if (!member) {
                throw new Error('Member not found');
            }

            const activity = await AuditLog.find({
                user: member.user,
                createdAt: {
                    $gte: new Date(Date.now() - (options.days || 30) * 24 * 60 * 60 * 1000)
                }
            })
                .sort({ createdAt: -1 })
                .skip(options.skip || 0)
                .limit(options.limit || 50);

            const total = await AuditLog.countDocuments({
                user: member.user,
                createdAt: {
                    $gte: new Date(Date.now() - (options.days || 30) * 24 * 60 * 60 * 1000)
                }
            });

            console.log(`[MemberService] Found ${activity.length} activity records for member ${memberId}`);
            return { activity, total };
        } catch (error) {
            console.error(`[MemberService] Error fetching member activity:`, error);
            throw error;
        }
    }

    async suspendMember(teamId, memberId, suspendedById, metadata = {}) {
        console.log(`[MemberService] Suspending member ${memberId}`);

        try {
            const member = await TeamMember.findOne({ _id: memberId, team: teamId });

            if (!member) {
                throw new Error('Member not found');
            }

            member.status = 'suspended';
            await member.save();

            await AuditLog.create({
                user: suspendedById,
                action: 'team_member_suspended',
                actionCategory: 'team',
                entityType: 'team',
                entityId: teamId,
                status: 'success',
                severity: 'warning',
                affectedUsers: [member.user],
                ...metadata
            });

            console.log(`[MemberService] Member suspended successfully`);
            return member;
        } catch (error) {
            console.error(`[MemberService] Error suspending member:`, error);
            throw error;
        }
    }

    async reactivateMember(teamId, memberId, reactivatedById, metadata = {}) {
        console.log(`[MemberService] Reactivating member ${memberId}`);

        try {
            const member = await TeamMember.findOne({ _id: memberId, team: teamId });

            if (!member) {
                throw new Error('Member not found');
            }

            member.status = 'active';
            member.lastActiveAt = Date.now();
            await member.save();

            await AuditLog.create({
                user: reactivatedById,
                action: 'team_member_reactivated',
                actionCategory: 'team',
                entityType: 'team',
                entityId: teamId,
                status: 'success',
                severity: 'info',
                affectedUsers: [member.user],
                ...metadata
            });

            console.log(`[MemberService] Member reactivated successfully`);
            return member;
        } catch (error) {
            console.error(`[MemberService] Error reactivating member:`, error);
            throw error;
        }
    }

    async updateMemberLastActive(memberId) {
        console.log(`[MemberService] Updating last active time for member ${memberId}`);

        try {
            const member = await TeamMember.findByIdAndUpdate(
                memberId,
                { lastActiveAt: Date.now() },
                { new: true }
            );

            return member;
        } catch (error) {
            console.error(`[MemberService] Error updating member last active:`, error);
            throw error;
        }
    }

    async bulkUpdateRoles(teamId, memberUpdates, updatedById, metadata = {}) {
        console.log(`[MemberService] Bulk updating ${memberUpdates.length} members roles`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const updater = await TeamMember.findOne({ team: teamId, user: updatedById }).session(session);

            if (!updater || !updater.hasPermission('canManageMembers')) {
                throw new Error('Unauthorized to bulk update roles');
            }

            for (const update of memberUpdates) {
                const member = await TeamMember.findOne({ _id: update.memberId, team: teamId }).session(session);

                if (member && update.role && ['member', 'admin', 'viewer'].includes(update.role)) {
                    member.role = update.role;
                    await member.save({ session });
                }
            }

            await AuditLog.create([{
                user: updatedById,
                action: 'team_member_role_changed',
                actionCategory: 'team',
                entityType: 'team',
                entityId: teamId,
                status: 'success',
                severity: 'info',
                details: { description: `Bulk role update for ${memberUpdates.length} members` },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[MemberService] Bulk role update completed successfully`);

            return { success: true, message: 'Bulk role update completed' };
        } catch (error) {
            await session.abortTransaction();
            console.error(`[MemberService] Error in bulk role update:`, error);
            throw error;
        } finally {
            session.endSession();
        }
    }
}

module.exports = new MemberService();