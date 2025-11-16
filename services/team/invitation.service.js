const mongoose = require('mongoose');
const Invitation = require('../models/invitation.model');
const Team = require('../models/team.model');
const User = require('../models/user.model');
const TeamMember = require('../models/team.member.model');
const AuditLog = require('../models/audit.log.model');
const emailService = require('./notification/email.service');

class InvitationService {
    async sendInvitation(teamId, email, role = 'member', invitedById, message = '', projectsAccess = [], metadata = {}) {
        console.log(`[InvitationService] Sending invitation to ${email} for team ${teamId} with role ${role}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const team = await Team.findById(teamId).session(session);
            const inviter = await User.findById(invitedById).session(session);

            if (!team || !inviter) {
                throw new Error('Team or inviter not found');
            }

            const inviterMember = await TeamMember.findOne({ team: teamId, user: invitedById }).session(session);

            if (!inviterMember || !inviterMember.hasPermission('canInviteMembers')) {
                throw new Error('Unauthorized to send invitations');
            }

            const existingUser = await User.findOne({ email: email.toLowerCase() }).session(session);
            const existingInvitation = await Invitation.findOne({
                team: teamId,
                email: email.toLowerCase(),
                status: 'pending'
            }).session(session);

            if (existingInvitation) {
                throw new Error('Pending invitation already exists for this email');
            }

            if (existingUser) {
                const isMember = await TeamMember.findOne({ team: teamId, user: existingUser._id }).session(session);
                if (isMember) {
                    throw new Error('User is already a team member');
                }
            }

            const invitation = new Invitation({
                team: teamId,
                email: email.toLowerCase(),
                invitedBy: invitedById,
                invitedUser: existingUser ? existingUser._id : null,
                role,
                message,
                projectsAccess,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                metadata: {
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent
                }
            });

            await invitation.save({ session });

            await AuditLog.create([{
                user: invitedById,
                action: 'invitation_sent',
                actionCategory: 'team',
                entityType: 'invitation',
                entityId: invitation._id,
                entityName: `Invitation to ${email}`,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Invitation sent to ${email}`,
                    email,
                    role,
                    teamId
                },
                ...metadata
            }], { session });

            await session.commitTransaction();

            await emailService.sendInvitationEmail(invitation, team, inviter);

            console.log(`[InvitationService] Invitation sent successfully to ${email}`);
            return invitation;
        } catch (error) {
            await session.abortTransaction();
            console.error(`[InvitationService] Error sending invitation:`, error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async acceptInvitation(token, userId, metadata = {}) {
        console.log(`[InvitationService] Accepting invitation with token ${token.substring(0, 10)}...`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const invitation = await Invitation.findOne({ token }).session(session);

            if (!invitation) {
                throw new Error('Invalid invitation token');
            }

            if (invitation.isExpired()) {
                invitation.status = 'expired';
                await invitation.save({ session });
                throw new Error('Invitation has expired');
            }

            if (invitation.status !== 'pending') {
                throw new Error(`Invitation is ${invitation.status}`);
            }

            const user = await User.findById(userId).session(session);

            if (!user) {
                throw new Error('User not found');
            }

            const team = await Team.findById(invitation.team).session(session);

            if (!team) {
                throw new Error('Team not found');
            }

            if (!team.hasAvailableSeats()) {
                throw new Error('No available seats in team subscription');
            }

            await invitation.accept(userId);

            const teamMember = new TeamMember({
                team: invitation.team,
                user: userId,
                role: invitation.role,
                status: 'active',
                invitedBy: invitation.invitedBy,
                invitedAt: invitation.createdAt,
                joinedAt: Date.now()
            });

            await teamMember.save({ session });

            team.members.push(teamMember._id);
            team.subscription.usedSeats++;
            team.stats.totalMembers++;

            await team.save({ session });

            await User.findByIdAndUpdate(
                userId,
                { $push: { teamMemberships: teamMember._id } },
                { session }
            );

            await AuditLog.create([{
                user: userId,
                action: 'invitation_accepted',
                actionCategory: 'team',
                entityType: 'invitation',
                entityId: invitation._id,
                entityName: `Accepted invitation to ${team.name}`,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Invitation accepted`,
                    teamId: invitation.team,
                    role: invitation.role
                },
                metadata: {
                    ipAddress: metadata.ipAddress,
                    userAgent: metadata.userAgent,
                    acceptedFrom: metadata
                },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[InvitationService] Invitation accepted successfully by user ${userId}`);

            return { invitation, teamMember, team };
        } catch (error) {
            await session.abortTransaction();
            console.error(`[InvitationService] Error accepting invitation:`, error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async declineInvitation(token, reason = '', metadata = {}) {
        console.log(`[InvitationService] Declining invitation with token ${token.substring(0, 10)}...`);

        try {
            const invitation = await Invitation.findOne({ token });

            if (!invitation) {
                throw new Error('Invalid invitation token');
            }

            if (invitation.status !== 'pending') {
                throw new Error(`Invitation is ${invitation.status}`);
            }

            await invitation.decline(reason);

            await AuditLog.create({
                user: invitation.invitedUser || null,
                action: 'invitation_declined',
                actionCategory: 'team',
                entityType: 'invitation',
                entityId: invitation._id,
                entityName: `Declined invitation to ${invitation.team}`,
                status: 'success',
                severity: 'info',
                details: {
                    description: 'Invitation declined',
                    reason
                },
                ...metadata
            });

            console.log(`[InvitationService] Invitation declined successfully`);
            return invitation;
        } catch (error) {
            console.error(`[InvitationService] Error declining invitation:`, error);
            throw error;
        }
    }

    async resendInvitation(invitationId, sentById, metadata = {}) {
        console.log(`[InvitationService] Resending invitation ${invitationId}`);

        try {
            const invitation = await Invitation.findById(invitationId);

            if (!invitation) {
                throw new Error('Invitation not found');
            }

            if (invitation.status !== 'pending') {
                throw new Error(`Cannot resend ${invitation.status} invitation`);
            }

            const sender = await User.findById(sentById);
            const team = await Team.findById(invitation.team);

            if (!sender || !team) {
                throw new Error('User or team not found');
            }

            await invitation.resend();

            await emailService.sendInvitationEmail(invitation, team, sender);

            await AuditLog.create({
                user: sentById,
                action: 'invitation_sent',
                actionCategory: 'team',
                entityType: 'invitation',
                entityId: invitation._id,
                entityName: `Resent invitation to ${invitation.email}`,
                status: 'success',
                severity: 'info',
                details: { description: 'Invitation resent' },
                ...metadata
            });

            console.log(`[InvitationService] Invitation resent successfully`);
            return invitation;
        } catch (error) {
            console.error(`[InvitationService] Error resending invitation:`, error);
            throw error;
        }
    }

    async cancelInvitation(invitationId, cancelledById, metadata = {}) {
        console.log(`[InvitationService] Cancelling invitation ${invitationId}`);

        try {
            const invitation = await Invitation.findById(invitationId);

            if (!invitation) {
                throw new Error('Invitation not found');
            }

            const canceller = await TeamMember.findOne({ team: invitation.team, user: cancelledById });

            if (!canceller || (!canceller.hasPermission('canManageMembers') && canceller.role !== 'owner')) {
                throw new Error('Unauthorized to cancel invitation');
            }

            await invitation.cancel();

            await AuditLog.create({
                user: cancelledById,
                action: 'invitation_cancelled',
                actionCategory: 'team',
                entityType: 'invitation',
                entityId: invitation._id,
                entityName: `Cancelled invitation to ${invitation.email}`,
                status: 'success',
                severity: 'info',
                details: { description: 'Invitation cancelled' },
                ...metadata
            });

            console.log(`[InvitationService] Invitation cancelled successfully`);
            return invitation;
        } catch (error) {
            console.error(`[InvitationService] Error cancelling invitation:`, error);
            throw error;
        }
    }

    async getTeamInvitations(teamId, options = {}) {
        console.log(`[InvitationService] Fetching invitations for team ${teamId}`);

        try {
            const query = { team: teamId };

            if (options.status) {
                query.status = options.status;
            }

            const invitations = await Invitation.find(query)
                .populate('invitedBy', 'firstName lastName email')
                .populate('invitedUser', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(options.skip || 0)
                .limit(options.limit || 50);

            const total = await Invitation.countDocuments(query);

            console.log(`[InvitationService] Found ${invitations.length} invitations for team ${teamId}`);
            return { invitations, total };
        } catch (error) {
            console.error(`[InvitationService] Error fetching team invitations:`, error);
            throw error;
        }
    }

    async getUserInvitations(email, options = {}) {
        console.log(`[InvitationService] Fetching invitations for email ${email}`);

        try {
            const query = { email: email.toLowerCase(), status: 'pending' };

            const invitations = await Invitation.find(query)
                .populate('team', 'name description avatar')
                .populate('invitedBy', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip(options.skip || 0)
                .limit(options.limit || 50);

            const total = await Invitation.countDocuments(query);

            console.log(`[InvitationService] Found ${invitations.length} pending invitations for ${email}`);
            return { invitations, total };
        } catch (error) {
            console.error(`[InvitationService] Error fetching user invitations:`, error);
            throw error;
        }
    }

    async expireOldInvitations() {
        console.log(`[InvitationService] Running invitation expiration job`);

        try {
            const result = await Invitation.updateMany(
                { status: 'pending', expiresAt: { $lt: Date.now() } },
                { $set: { status: 'expired' } }
            );

            console.log(`[InvitationService] Expired ${result.modifiedCount} old invitations`);
            return result;
        } catch (error) {
            console.error(`[InvitationService] Error expiring old invitations:`, error);
            throw error;
        }
    }

    async getInvitationStats(teamId) {
        console.log(`[InvitationService] Fetching invitation stats for team ${teamId}`);

        try {
            const stats = await Invitation.aggregate([
                { $match: { team: mongoose.Types.ObjectId(teamId) } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const result = {
                pending: 0,
                accepted: 0,
                declined: 0,
                expired: 0,
                cancelled: 0
            };

            stats.forEach(stat => {
                result[stat._id] = stat.count;
            });

            console.log(`[InvitationService] Invitation stats retrieved for team ${teamId}`);
            return result;
        } catch (error) {
            console.error(`[InvitationService] Error fetching invitation stats:`, error);
            throw error;
        }
    }
}

module.exports = new InvitationService();