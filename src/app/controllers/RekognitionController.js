import { RekognitionClient, CreateCollectionCommand, IndexFacesCommand, SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import FaceID from '../models/FaceID.js';
const REGION = 'ap-southeast-1';

const SOURCE_BUCKET = 'smart-door-system';


const getS3Url = (bucket, region, key) => {
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
};

const formatExternalImageId = (userName) => {
    return userName
        .normalize('NFD') // Tách dấu tiếng Việt
        .replace(/[\u0300-\u036f]/g, '') // Loại bỏ dấu tiếng Việt
        .replace(/\s+/g, '') // Thay thế khoảng trắng bằng dấu gạch ngang
        .replace(/[^a-zA-Z0-9_.\-:]/g, '') // Chỉ giữ lại các ký tự hợp lệ
        .replace(/^-+|-+$/g, ''); // Xóa dấu gạch ngang ở đầu và cuối
};

const s3Client = new S3Client({
    region: REGION
});

const rekogClient = new RekognitionClient({
    region: REGION,
});

// [POST] /api/rekognition/index-face/:userId/:deviceId
export const uploadImageToS3AndIndexFace = async (req, res) => {
    try {
        const { userId, deviceId } = req.params;
        const { userName } = req.body;
        
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

        if (!userId || !deviceId) {
            return res.status(400).json({
                success: false,
                message: 'userId and deviceId are required'
            });
        }

        if (!userName) {
            return res.status(400).json({
                success: false,
                message: 'userName is required'
            });
        }

        console.log('Received image:', {
            name: image.name,
            size: image.size,
            mimetype: image.mimetype
        });

        // Kiểm tra định dạng file
        if (!image.mimetype.startsWith('image/')) {
            return res.status(400).json({
                success: false,
                message: 'File must be an image'
            });
        }

        const timestamp = Date.now();
        const imageKey = `faces/${userId}/${deviceId}/${timestamp}_${image.name}`;
        
        // Tạo S3 URL cho ảnh
        const s3Url = getS3Url(SOURCE_BUCKET, REGION, imageKey);
        console.log('Generated S3 URL:', s3Url);

        const uploadCommand = new PutObjectCommand({
            Bucket: SOURCE_BUCKET,
            Key: imageKey,
            Body: image.data,
            ContentType: image.mimetype,
            Metadata: {
                "user-name": userName,
                "type": "registered-face",
            }
        });

        await s3Client.send(uploadCommand);

        const collectionId = `smartlock-${userId}-${deviceId}`;
        const formattedUserName = formatExternalImageId(userName);
        console.log('Formatted userName:', formattedUserName);

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

        const indexCommand = new IndexFacesCommand(indexParams);
        const indexResponse = await rekogClient.send(indexCommand);
        console.log('Index response:', indexResponse);

        // Xử lý response để lấy faceId và thông tin khác
        const faceRecord = indexResponse.FaceRecords[0];
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

        const imageData = {
            imageKey,
            userName,
            userId,
            deviceId,
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
                    s3Url,     // Thêm s3Url vào response
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
    } catch (error) {
        console.error('Error in upload and index process:', error);
        return res.status(500).json({
            success: false,
            message: 'Error in upload and index process',
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