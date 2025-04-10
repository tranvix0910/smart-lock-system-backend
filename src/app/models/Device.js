import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    deviceId: {
        type: String,
        required: true,
        unique: true
    },
    macAddress: {
        type: String,
        required: true,
        unique: true
    },
    secretKey: {
        type: String,
        required: true
    },
    deviceName: {
        type: String,
        default: 'Smart Lock'
    },
    userName: {
        type: String,
        default: 'N/A'
    },
    location: {
        type: String,
        default: 'Home'
    },
    status: {
        type: String,
        enum: ['ONLINE', 'OFFLINE'],
        default: 'ONLINE'
    },
    lockState: {
        type: String,
        enum: ['LOCK', 'UNLOCK'],
        default: 'LOCK'
    },
    batteryLevel: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'devices'
});

deviceSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const Device = mongoose.model('Device', deviceSchema);

export default Device;