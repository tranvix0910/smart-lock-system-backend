import { RekognitionClient, CreateCollectionCommand, IndexFacesCommand, DeleteFacesCommand } from '@aws-sdk/client-rekognition';
import FaceID from '../models/FaceID.js';
import { uploadImageToS3 } from './S3Controller.js';
import Fingerprint from '../models/Fingerprint.js';
import RFIDCard from '../models/RFID.js';

const REGION = 'ap-southeast-1';
const SOURCE_BUCKET = 'smart-door-system';

const formatExternalImageId = (userName) => {
    return userName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9_.\-:]/g, '')
        .replace(/^-+|-+$/g, '');
};

const rekogClient = new RekognitionClient({
    region: REGION,
});

// [POST] /api/rekognition/index-face/:userId/:deviceId
export const IndexFace = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;
        const { userName, imageName } = req.body;
        
        console.log('Request Files:', req.files);
        console.log('Request Body:', req.body);
        console.log('Content-Type:', req.headers['content-type']);

        const image = req.files?.image;
        
        if (!image) {
            console.error('No image file received');
            return res.status(400).json({
                success: false,
                message: 'No image file received'
            });
        }

        const timestamp = Date.now();
        const imageKey = `users/${userId}/faces/${deviceId}/${image.name}`;
        
        try {
            const uploadResult = await uploadImageToS3({ 
                bucket: SOURCE_BUCKET, 
                userName, 
                type: 'registered-face', 
                userId, 
                deviceId, 
                imageKey, 
                image,
                timestamp: String(timestamp)
            });
            
            console.log('Upload result:', uploadResult);

            const collectionId = `smartlock-${userId}-${deviceId}`;
            const formattedUserName = formatExternalImageId(userName);
            console.log('Formatted userName:', formattedUserName);

            await new Promise(resolve => setTimeout(resolve, 500));

            const indexParams = {
                CollectionId: collectionId,
                Image: {
                    S3Object: {
                        Bucket: SOURCE_BUCKET,
                        Name: imageKey,
                    },
                },
                ExternalImageId: formattedUserName,
                DetectionAttributes: ['ALL'],
            };

            console.log('Index params:', indexParams);
            const indexCommand = new IndexFacesCommand(indexParams);
            const indexResponse = await rekogClient.send(indexCommand);
            console.log('Index response:', indexResponse);

            const faceRecord = indexResponse.FaceRecords?.[0];
            if (!faceRecord) {
                throw new Error('No face detected in the image');
            }

            const { 
                Face: { 
                    FaceId, 
                    BoundingBox, 
                    ImageId, 
                    Confidence 
                },
                FaceDetail 
            } = faceRecord;

            const s3Url = uploadResult.s3Url;

            const imageData = {
                imageKey,
                userName,
                userId,
                deviceId,
                imageName: imageName || image.name,
                s3Url,
                faceId: FaceId,
                boundingBox: BoundingBox,
                imageId: ImageId,
                confidence: Confidence,
                faceDetail: FaceDetail
            };

            console.log('Image data:', imageData);

            await FaceID.create(imageData);

            return res.status(200).json({
                success: true,
                message: 'Image uploaded and face indexed successfully',
                data: {
                    upload: {
                        imageKey,
                        userName,
                        userId,
                        deviceId,
                        s3Url,
                        timestamp
                    },
                    index: {
                        faceId: FaceId,
                        boundingBox: BoundingBox,
                        imageId: ImageId,
                        confidence: Confidence,
                        collectionId,
                        formattedUserName
                    }
                }
            });
        } catch (uploadError) {
            console.error('Error during upload or indexing:', uploadError);
            return res.status(500).json({
                success: false,
                message: 'Error during upload or indexing process',
                error: uploadError.message
            });
        }
    } catch (error) {
        console.error('Error in face registration process:', error);
        return res.status(500).json({
            success: false,
            message: 'Error in face registration process',
            error: error.message
        });
    }
}

// [POST] /api/rekognition/create-collection
export const createCollection = async (req, res) => {
    try {
        const { userId, deviceId } = req.body;

        if (!userId || !deviceId) {
            return res.status(400).json({
                success: false,
                message: 'userId and deviceId are required' 
            });
        }

        const collectionId = `smartlock-${userId}-${deviceId}`;
        const command = new CreateCollectionCommand({ CollectionId: collectionId });
        const response = await rekogClient.send(command);
        
        return res.status(200).json({
            success: true,
            message: 'Collection created successfully',
            data: {
                collectionId,
                collectionArn: response.CollectionArn
            }
        });
    } catch (error) {
        if (error.name === 'ResourceAlreadyExistsException') {
            return res.status(200).json({
                success: true,
                message: 'Collection already exists'
            });
        }
        
        console.error('Error creating collection:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating collection',
            error: error.message
        });
    }
};

// [DELETE] /api/rekognition/delete-face/:userId/:deviceId
export const deleteFace = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;
        const { faceId } = req.body;

        if (!userId || !deviceId || !faceId) {
            return res.status(400).json({
                success: false,
                message: 'userId, deviceId and faceId are required'
            });
        }

        const relatedFingerprints = await Fingerprint.find({ faceId });
        const relatedRFIDs = await RFIDCard.find({ faceId });
        const faceInfo = await FaceID.findOne({ faceId });

        if (relatedFingerprints.length > 0 || relatedRFIDs.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete face. There are dependent components.',
                data: {
                    faceInfo: faceInfo ? {
                        userName: faceInfo.userName,
                        userId: faceInfo.userId,
                        deviceId: faceInfo.deviceId,
                        faceId: faceInfo.faceId
                    } : null,
                    relatedComponents: {
                        fingerprints: {
                            count: relatedFingerprints.length,
                            items: relatedFingerprints.map(fp => ({
                                fingerprintId: fp.fingerprintId,
                                userName: fp.userName,
                                deviceId: fp.deviceId
                            }))
                        },
                        rfidCards: {
                            count: relatedRFIDs.length, 
                            items: relatedRFIDs.map(card => ({
                                rfidId: card.rfidId,
                                userName: card.userName,
                                deviceId: card.deviceId
                            }))
                        }
                    }
                }
            });
        }

        const collectionId = `smartlock-${userId}-${deviceId}`;
        const command = new DeleteFacesCommand({
            CollectionId: collectionId,
            FaceIds: [faceId]
        }); 
        const response = await rekogClient.send(command);
        
        await FaceID.deleteOne({ faceId });

        return res.status(200).json({
            success: true,
            message: 'Face deleted successfully. No related components found.',
            data: {
                deletedFace: response,
                faceInfo: faceInfo ? {
                    userName: faceInfo.userName,
                    userId: faceInfo.userId,
                    deviceId: faceInfo.deviceId,
                    faceId: faceInfo.faceId
                } : null
            }
        });
    } catch (error) {
        console.error('Error deleting face:', error);
        return res.status(500).json({
            success: false,
            message: 'Error deleting face',
            error: error.message
        });
    }
}