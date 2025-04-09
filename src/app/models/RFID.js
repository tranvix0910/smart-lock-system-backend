import mongoose from 'mongoose';

const rfidSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    deviceId: { type: String, required: true },
    faceId: { type: String, required: true },
    userName: { type: String, required: true },
    rfidId: { type: String, required: true },
    rfidIdLength: { type: Number },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true,
    collection: 'rfidCards'
});

const RFIDCard = mongoose.model('RFIDCard', rfidSchema);

export default RFIDCard;