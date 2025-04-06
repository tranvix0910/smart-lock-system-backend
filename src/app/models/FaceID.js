import mongoose from 'mongoose';

const faceIDSchema = new mongoose.Schema({
    imageKey: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    deviceId: {
        type: String,
        required: true
    },
    imageName: {
        type: String,
        required: true
    },
    faceId: {
        type: String,
        required: true,
        unique: true
    },
    imageId: {
        type: String,
        required: true
    },
    confidence: {
        type: Number,
        required: true
    },
    boundingBox: {
        width: Number,
        height: Number,
        left: Number,
        top: Number
    },
    faceDetail: {
        type: Object,
        required: true
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
    collection: 'faceIDs'
});

const FaceID = mongoose.model('FaceID', faceIDSchema);

export default FaceID;