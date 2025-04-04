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
    deviceName: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    location: {
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
        required: true,
        enum: ['SUCCESS', 'FAILED']
    },
    imageUrl: {
        type: String,
        required: false,
        default: null
    }
}, {
    timestamps: true,
    collection: 'recent-access-logs'
});

const RecentAccessLogs = mongoose.model('RecentAccessLogs', recentAccessLogsSchema);

export default RecentAccessLogs;
