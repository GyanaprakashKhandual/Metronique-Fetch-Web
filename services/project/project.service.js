const mongoose = require('mongoose');
const Project = require('../../models/project.model');
const User = require('../../models/user.model');
const Team = require('../../models/team.model');
const Repository = require('../../models/repository.model');
const DatabaseConnection = require('../../models/database.connection.model');
const AuditLog = require('../../models/audit.model');


class ProjectService {
    async createProject(projectData, userId, teamId = null, metadata = {}) {
        console.log(`[ProjectService] Creating project: ${projectData.name} for user: ${userId} in team: ${teamId}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            if (teamId) {
                const team = await Team.findById(teamId).session(session);
                if (!team) {
                    throw new Error('Team not found');
                }
            }

            const newProject = new Project({
                name: projectData.name,
                description: projectData.description,
                owner: userId,
                team: teamId,
                visibility: projectData.visibility || 'private',
                category: projectData.category || 'web-api',
                priority: projectData.priority || 'medium',
                status: 'draft',
                testConfig: {
                    framework: projectData.testConfig?.framework || 'rest-assured',
                    language: projectData.testConfig?.language || 'java',
                    buildTool: projectData.testConfig?.buildTool || 'maven',
                    baseUrl: projectData.testConfig?.baseUrl,
                    timeout: projectData.testConfig?.timeout || 30000,
                    retryCount: projectData.testConfig?.retryCount || 2
                },
                technology: projectData.technology || {}
            });

            await newProject.save({ session });

            const user = await User.findById(userId).session(session);
            if (user) {
                user.ownedProjects.push(newProject._id);
                await user.save({ session });
            }

            if (teamId) {
                const team = await Team.findById(teamId).session(session);
                if (team) {
                    team.projects.push(newProject._id);
                    team.stats.totalProjects++;
                    await team.save({ session });
                }
            }

            await AuditLog.create([{
                user: userId,
                action: 'project_created',
                actionCategory: 'project',
                entityType: 'project',
                entityId: newProject._id,
                entityName: newProject.name,
                status: 'success',
                severity: 'info',
                details: {
                    description: `Project created: ${newProject.name}`,
                    teamId,
                    visibility: newProject.visibility
                },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[ProjectService] Project created successfully: ${newProject._id}`);

            return newProject;
        } catch (error) {
            await session.abortTransaction();
            console.error(`[ProjectService] Error creating project:`, error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async getProjectById(projectId, userId = null) {
        console.log(`[ProjectService] Fetching project: ${projectId}`);

        try {
            const project = await Project.findById(projectId)
                .populate('owner', 'firstName lastName email avatar')
                .populate('team', 'name')
                .populate('databaseConnections', 'name type environment status')
                .populate('endpoints', 'method path summary')
                .populate('testScripts', 'name status')
                .populate('testSuites', 'name totalTests')
                .populate('executions', 'status totalTests')
                .populate('reports', 'name generatedAt');

            if (!project) {
                console.warn(`[ProjectService] Project not found: ${projectId}`);
                return null;
            }

            if (userId) {
                const hasAccess = await project.hasAccess(userId);
                if (!hasAccess) {
                    console.warn(`[ProjectService] User ${userId} not authorized to access project ${projectId}`);
                    return null;
                }
            }

            return project;
        } catch (error) {
            console.error(`[ProjectService] Error fetching project:`, error.message);
            throw error;
        }
    }

    async getUserProjects(userId, options = {}) {
        console.log(`[ProjectService] Fetching projects for user: ${userId}`);

        try {
            const query = {
                $or: [
                    { owner: userId },
                    { 'collaborators.user': userId }
                ],
                isDeleted: false
            };

            if (options.status) {
                query.status = options.status;
            }

            if (options.teamId) {
                query.team = options.teamId;
            }

            const projects = await Project.find(query)
                .populate('owner', 'firstName lastName email')
                .populate('team', 'name')
                .sort({ createdAt: -1 })
                .skip(options.skip || 0)
                .limit(options.limit || 20);

            const total = await Project.countDocuments(query);

            console.log(`[ProjectService] Found ${projects.length} projects for user: ${userId}`);
            return { projects, total };
        } catch (error) {
            console.error(`[ProjectService] Error fetching user projects:`, error.message);
            throw error;
        }
    }

    async getTeamProjects(teamId, options = {}) {
        console.log(`[ProjectService] Fetching projects for team: ${teamId}`);

        try {
            const query = { team: teamId, isDeleted: false };

            if (options.status) {
                query.status = options.status;
            }

            const projects = await Project.find(query)
                .populate('owner', 'firstName lastName email')
                .sort({ priority: -1, createdAt: -1 })
                .skip(options.skip || 0)
                .limit(options.limit || 20);

            const total = await Project.countDocuments(query);

            console.log(`[ProjectService] Found ${projects.length} projects for team: ${teamId}`);
            return { projects, total };
        } catch (error) {
            console.error(`[ProjectService] Error fetching team projects:`, error.message);
            throw error;
        }
    }

    async updateProject(projectId, updates, userId, metadata = {}) {
        console.log(`[ProjectService] Updating project: ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            const hasAccess = await project.hasAccess(userId);
            if (!hasAccess && project.owner.toString() !== userId.toString()) {
                throw new Error('Unauthorized to update project');
            }

            const allowedFields = [
                'name',
                'description',
                'visibility',
                'category',
                'priority',
                'status',
                'tags',
                'metadata'
            ];

            const filteredUpdates = {};
            allowedFields.forEach(field => {
                if (field in updates) {
                    filteredUpdates[field] = updates[field];
                }
            });

            const before = { ...project.toObject() };
            const updatedProject = await Project.findByIdAndUpdate(
                projectId,
                { $set: filteredUpdates },
                { new: true, runValidators: true }
            );

            await AuditLog.create({
                user: userId,
                action: 'project_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: updatedProject.name,
                status: 'success',
                severity: 'info',
                changes: { before, after: filteredUpdates },
                ...metadata
            });

            console.log(`[ProjectService] Project updated successfully: ${projectId}`);
            return updatedProject;
        } catch (error) {
            console.error(`[ProjectService] Error updating project:`, error.message);
            throw error;
        }
    }

    async deleteProject(projectId, userId, metadata = {}) {
        console.log(`[ProjectService] Deleting project: ${projectId}`);

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Only project owner can delete project');
            }

            project.isDeleted = true;
            project.deletedAt = Date.now();
            project.deletedBy = userId;

            await project.save({ session });

            await Repository.updateMany(
                { project: projectId },
                { $set: { isDeleted: true, deletedAt: Date.now() } },
                { session }
            );

            await DatabaseConnection.updateMany(
                { project: projectId },
                { $set: { isDeleted: true, deletedAt: Date.now() } },
                { session }
            );

            await User.findByIdAndUpdate(
                userId,
                { $pull: { ownedProjects: projectId } },
                { session }
            );

            if (project.team) {
                await Team.findByIdAndUpdate(
                    project.team,
                    {
                        $pull: { projects: projectId },
                        $inc: { 'stats.totalProjects': -1 }
                    },
                    { session }
                );
            }

            await AuditLog.create([{
                user: userId,
                action: 'project_deleted',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'warning',
                details: { description: `Project deleted: ${project.name}` },
                ...metadata
            }], { session });

            await session.commitTransaction();
            console.log(`[ProjectService] Project deleted successfully: ${projectId}`);

            return { success: true, message: 'Project deleted successfully' };
        } catch (error) {
            await session.abortTransaction();
            console.error(`[ProjectService] Error deleting project:`, error.message);
            throw error;
        } finally {
            session.endSession();
        }
    }

    async archiveProject(projectId, userId, metadata = {}) {
        console.log(`[ProjectService] Archiving project: ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== userId.toString()) {
                throw new Error('Only project owner can archive project');
            }

            project.status = 'archived';
            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'project_archived',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                ...metadata
            });

            console.log(`[ProjectService] Project archived successfully: ${projectId}`);
            return project;
        } catch (error) {
            console.error(`[ProjectService] Error archiving project:`, error.message);
            throw error;
        }
    }

    async getProjectStats(projectId) {
        console.log(`[ProjectService] Fetching stats for project: ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            const stats = {
                totalTests: project.stats.totalTests,
                passed: project.stats.totalTestsPassed,
                failed: project.stats.totalTestsFailed,
                skipped: project.stats.totalTestsSkipped,
                successRate: project.stats.successRate,
                averageExecutionTime: project.stats.averageExecutionTime,
                totalExecutions: project.stats.totalExecutions,
                lastTestRun: project.stats.lastTestRun,
                endpoints: project.endpoints.length,
                databaseConnections: project.databaseConnections.length,
                storageUsed: project.storage.used,
                storageLimit: project.storage.limit
            };

            console.log(`[ProjectService] Stats retrieved for project: ${projectId}`, stats);
            return stats;
        } catch (error) {
            console.error(`[ProjectService] Error fetching project stats:`, error.message);
            throw error;
        }
    }

    async addCollaborator(projectId, collaboratorId, addedById, metadata = {}) {
        console.log(`[ProjectService] Adding collaborator ${collaboratorId} to project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== addedById.toString()) {
                throw new Error('Only project owner can add collaborators');
            }

            const exists = project.collaborators.some(c => c.user.toString() === collaboratorId.toString());
            if (exists) {
                throw new Error('User is already a collaborator');
            }

            project.collaborators.push({
                user: collaboratorId,
                addedBy: addedById,
                addedAt: Date.now()
            });

            await project.save();

            await AuditLog.create({
                user: addedById,
                action: 'project_collaborator_added',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: { collaboratorId },
                affectedUsers: [collaboratorId],
                ...metadata
            });

            console.log(`[ProjectService] Collaborator added successfully to project ${projectId}`);
            return project;
        } catch (error) {
            console.error(`[ProjectService] Error adding collaborator:`, error.message);
            throw error;
        }
    }

    async removeCollaborator(projectId, collaboratorId, removedById, metadata = {}) {
        console.log(`[ProjectService] Removing collaborator ${collaboratorId} from project ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            if (project.owner.toString() !== removedById.toString()) {
                throw new Error('Only project owner can remove collaborators');
            }

            project.collaborators = project.collaborators.filter(
                c => c.user.toString() !== collaboratorId.toString()
            );

            await project.save();

            await AuditLog.create({
                user: removedById,
                action: 'project_collaborator_removed',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                details: { collaboratorId },
                affectedUsers: [collaboratorId],
                ...metadata
            });

            console.log(`[ProjectService] Collaborator removed successfully from project ${projectId}`);
            return project;
        } catch (error) {
            console.error(`[ProjectService] Error removing collaborator:`, error.message);
            throw error;
        }
    }

    async updateProjectStats(projectId, executionResult) {
        console.log(`[ProjectService] Updating stats for project: ${projectId}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            await project.updateStats(executionResult);
            console.log(`[ProjectService] Stats updated successfully for project ${projectId}`);

            return project;
        } catch (error) {
            console.error(`[ProjectService] Error updating project stats:`, error.message);
            throw error;
        }
    }

    async updateProjectStatus(projectId, newStatus, userId, metadata = {}) {
        console.log(`[ProjectService] Updating status for project ${projectId} to ${newStatus}`);

        try {
            const project = await Project.findById(projectId);

            if (!project) {
                throw new Error('Project not found');
            }

            const validStatuses = ['draft', 'active', 'inactive', 'archived', 'maintenance'];
            if (!validStatuses.includes(newStatus)) {
                throw new Error('Invalid project status');
            }

            const before = project.status;
            project.status = newStatus;
            await project.save();

            await AuditLog.create({
                user: userId,
                action: 'project_status_updated',
                actionCategory: 'project',
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                status: 'success',
                severity: 'info',
                changes: { before, after: newStatus },
                ...metadata
            });

            console.log(`[ProjectService] Project status updated successfully to ${newStatus}`);
            return project;
        } catch (error) {
            console.error(`[ProjectService] Error updating project status:`, error.message);
            throw error;
        }
    }

    async searchProjects(query, userId, options = {}) {
        console.log(`[ProjectService] Searching projects with query: ${query}`);

        try {
            const searchQuery = {
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { tags: { $in: [query] } }
                ],
                $and: [
                    {
                        $or: [
                            { owner: userId },
                            { 'collaborators.user': userId },
                            { visibility: 'public' }
                        ]
                    }
                ],
                isDeleted: false
            };

            const projects = await Project.find(searchQuery)
                .sort({ createdAt: -1 })
                .skip(options.skip || 0)
                .limit(options.limit || 20);

            const total = await Project.countDocuments(searchQuery);

            console.log(`[ProjectService] Found ${projects.length} projects matching query`);
            return { projects, total };
        } catch (error) {
            console.error(`[ProjectService] Error searching projects:`, error.message);
            throw error;
        }
    }

    async getProjectsByTags(tags, userId, options = {}) {
        console.log(`[ProjectService] Fetching projects with tags: ${tags.join(', ')}`);

        try {
            const projects = await Project.find({
                tags: { $in: tags },
                $or: [
                    { owner: userId },
                    { visibility: 'public' },
                    { 'collaborators.user': userId }
                ],
                isDeleted: false
            })
                .sort({ createdAt: -1 })
                .skip(options.skip || 0)
                .limit(options.limit || 20);

            const total = await Project.countDocuments({
                tags: { $in: tags },
                isDeleted: false
            });

            console.log(`[ProjectService] Found ${projects.length} projects with specified tags`);
            return { projects, total };
        } catch (error) {
            console.error(`[ProjectService] Error fetching projects by tags:`, error.message);
            throw error;
        }
    }
}

module.exports = new ProjectService();