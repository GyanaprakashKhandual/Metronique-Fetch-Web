const SUCCESS_MESSAGES = {
    AUTH: {
        LOGIN_SUCCESS: 'Login successful',
        LOGOUT_SUCCESS: 'Logout successful',
        REGISTER_SUCCESS: 'Registration successful',
        PASSWORD_RESET_SENT: 'Password reset link sent to your email',
        PASSWORD_CHANGED: 'Password changed successfully',
        EMAIL_VERIFIED: 'Email verified successfully',
        TOKEN_REFRESHED: 'Authentication token refreshed'
    },

    USER: {
        CREATED: 'User created successfully',
        UPDATED: 'User updated successfully',
        DELETED: 'User deleted successfully',
        PROFILE_UPDATED: 'Profile updated successfully',
        AVATAR_UPDATED: 'Avatar updated successfully',
        PREFERENCES_SAVED: 'Preferences saved successfully'
    },

    PROJECT: {
        CREATED: 'Project created successfully',
        UPDATED: 'Project updated successfully',
        DELETED: 'Project deleted successfully',
        ARCHIVED: 'Project archived successfully',
        RESTORED: 'Project restored successfully',
        STARRED: 'Project starred successfully',
        UNSTARRED: 'Project unstarred successfully'
    },

    REPOSITORY: {
        CONNECTED: 'Repository connected successfully',
        DISCONNECTED: 'Repository disconnected successfully',
        SYNCED: 'Repository synced successfully',
        ANALYZED: 'Repository analyzed successfully',
        BRANCH_SWITCHED: 'Branch switched successfully',
        WEBHOOK_CONFIGURED: 'Webhook configured successfully',
        WEBHOOK_REMOVED: 'Webhook removed successfully'
    },

    DATABASE: {
        CONNECTED: 'Database connected successfully',
        DISCONNECTED: 'Database disconnected successfully',
        TESTED: 'Database connection tested successfully',
        SCHEMA_ANALYZED: 'Database schema analyzed successfully',
        QUERY_EXECUTED: 'Query executed successfully',
        CREDENTIALS_UPDATED: 'Database credentials updated successfully'
    },

    TEST: {
        GENERATED: 'Test scripts generated successfully',
        EXECUTED: 'Tests executed successfully',
        STOPPED: 'Test execution stopped',
        SAVED: 'Test saved successfully',
        DELETED: 'Test deleted successfully',
        SCHEDULED: 'Test scheduled successfully',
        SUITE_CREATED: 'Test suite created successfully',
        CONFIG_UPDATED: 'Test configuration updated successfully'
    },

    FILE: {
        UPLOADED: 'File uploaded successfully',
        DOWNLOADED: 'File downloaded successfully',
        DELETED: 'File deleted successfully',
        RENAMED: 'File renamed successfully',
        MOVED: 'File moved successfully',
        SAVED: 'File saved successfully',
        LOCKED: 'File locked successfully',
        UNLOCKED: 'File unlocked successfully',
        VALIDATED: 'File validated successfully',
        COMPILED: 'File compiled successfully'
    },

    FOLDER: {
        CREATED: 'Folder created successfully',
        DELETED: 'Folder deleted successfully',
        RENAMED: 'Folder renamed successfully',
        MOVED: 'Folder moved successfully',
        GENERATED: 'Test folder structure generated successfully'
    },

    TEAM: {
        CREATED: 'Team created successfully',
        UPDATED: 'Team updated successfully',
        DELETED: 'Team deleted successfully',
        MEMBER_ADDED: 'Team member added successfully',
        MEMBER_REMOVED: 'Team member removed successfully',
        MEMBER_UPDATED: 'Team member updated successfully',
        ROLE_CHANGED: 'Member role changed successfully'
    },

    INVITATION: {
        SENT: 'Invitation sent successfully',
        ACCEPTED: 'Invitation accepted successfully',
        REJECTED: 'Invitation rejected successfully',
        CANCELLED: 'Invitation cancelled successfully',
        RESENT: 'Invitation resent successfully'
    },

    AI: {
        ANALYSIS_COMPLETE: 'AI analysis completed successfully',
        GENERATION_COMPLETE: 'Content generated successfully',
        OPTIMIZATION_COMPLETE: 'Optimization completed successfully'
    },

    EXECUTION: {
        STARTED: 'Execution started successfully',
        COMPLETED: 'Execution completed successfully',
        STOPPED: 'Execution stopped successfully',
        SCHEDULED: 'Execution scheduled successfully'
    },

    REPORT: {
        GENERATED: 'Report generated successfully',
        EXPORTED: 'Report exported successfully',
        DELETED: 'Report deleted successfully',
        SHARED: 'Report shared successfully'
    },

    NOTIFICATION: {
        SENT: 'Notification sent successfully',
        SETTINGS_UPDATED: 'Notification settings updated successfully',
        MARKED_READ: 'Notification marked as read',
        CLEARED: 'Notifications cleared successfully'
    },

    INTEGRATION: {
        CONNECTED: 'Integration connected successfully',
        DISCONNECTED: 'Integration disconnected successfully',
        CONFIGURED: 'Integration configured successfully',
        TESTED: 'Integration tested successfully'
    },

    CICD: {
        CONFIGURED: 'CI/CD configured successfully',
        PIPELINE_CREATED: 'Pipeline created successfully',
        WEBHOOK_CONFIGURED: 'Webhook configured successfully',
        TRIGGERED: 'CI/CD pipeline triggered successfully'
    },

    COLLABORATION: {
        SHARED: 'Shared successfully',
        ACCESS_GRANTED: 'Access granted successfully',
        ACCESS_REVOKED: 'Access revoked successfully',
        PERMISSIONS_UPDATED: 'Permissions updated successfully'
    },

    LOAD_TEST: {
        CONFIGURED: 'Load test configured successfully',
        STARTED: 'Load test started successfully',
        COMPLETED: 'Load test completed successfully',
        STOPPED: 'Load test stopped successfully'
    },

    GENERAL: {
        OPERATION_SUCCESS: 'Operation completed successfully',
        SAVED: 'Saved successfully',
        UPDATED: 'Updated successfully',
        DELETED: 'Deleted successfully',
        CREATED: 'Created successfully',
        RESTORED: 'Restored successfully',
        COPIED: 'Copied successfully'
    }
};

const getSuccessMessage = (category, key, customMessage) => {
    console.log(`Getting success message for category: ${category}, key: ${key}`);

    if (!SUCCESS_MESSAGES[category]) {
        console.log(`Success category not found: ${category}`);
        return customMessage || SUCCESS_MESSAGES.GENERAL.OPERATION_SUCCESS;
    }

    const message = SUCCESS_MESSAGES[category][key];
    console.log(`Success message retrieved: ${message}`);

    return customMessage || message || SUCCESS_MESSAGES.GENERAL.OPERATION_SUCCESS;
};

const formatSuccessResponse = (category, key, data = null) => {
    console.log(`Formatting success response - Category: ${category}, Key: ${key}`);
    const message = getSuccessMessage(category, key);

    const response = {
        success: true,
        message,
        timestamp: new Date().toISOString()
    };

    if (data) {
        response.data = data;
        console.log(`Success response data added`);
    }

    console.log(`Success response formatted`);
    return response;
};

module.exports = {
    SUCCESS_MESSAGES,
    getSuccessMessage,
    formatSuccessResponse
};