import mongoose from 'mongoose';

const recentAccessLogsSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        ref: 'User'
    },
    deviceId: {
        type: String,
        required: true,
        ref: 'Device'
    },
    userName: {
        type: String,
        required: true
    },
    accessType: {
        type: String,
        required: true,
        enum: ['FACE_ID', 'FINGERPRINT', 'RFID', 'WEB_APP']
    },
    status: {
        type: String,
        required: true
    },
    notes: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'recentAccessLogs'
});

const RecentAccessLogs = mongoose.model('RecentAccessLogs', recentAccessLogsSchema);

export default RecentAccessLogs;
