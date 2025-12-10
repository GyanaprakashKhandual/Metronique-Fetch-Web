require('dotenv').config();
const mongoose = require('mongoose');

try {
    // Try to replicate the exact schema structure from database.connection.model
    const testSchema = new mongoose.Schema({
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Project',
            required: true
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['mongodb', 'mysql', 'postgresql', 'sqlite', 'mssql', 'oracle', 'redis', 'dynamodb', 'cassandra', 'mariadb'],
            required: true
        },
        connection: {
            host: {
                type: String,
                required: true
            },
            port: {
                type: Number,
                required: true
            }
        }
    }, {
        timestamps: true
    });

    console.log('Test schema created successfully');
    const model = mongoose.model('TestConnection' + Date.now(), testSchema);
    console.log('Test model created:', !!model);
} catch (err) {
    console.error('Error:', err.message);
    console.error('Stack:', err.stack.split('\n').slice(0, 10).join('\n'));
}
