import mongoose from 'mongoose';

const fingerprintSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    deviceId: { type: String, required: true },
    faceId: { type: String, required: true },
    userName: { type: String, required: true },
    fingerprintId: { type: String, required: true },
    fingerprintTemplate: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'fingerprints'
});

const Fingerprint = mongoose.model('Fingerprint', fingerprintSchema);

export default Fingerprint;
