import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = 'ap-southeast-1';
const BUCKET_NAME = 'smart-door-system';

const s3Client = new S3Client({
    region: REGION
});

// [POST] /api/s3/upload-image
export const uploadImageToS3 = async ({ bucket, userName, type, userId, deviceId, imageKey, image, timestamp }) => {
    try {
        if (!image) {
            console.error('No image file received');
            throw new Error('No image file received');
        }

        if (!userId || !deviceId) {
            throw new Error('userId and deviceId are required');
        }

        if (!userName) {
            throw new Error('userName is required');
        }

        console.log('Uploading image:', {
            name: image.name,
            size: image.size,
            mimetype: image.mimetype,
            bucket,
            key: imageKey
        });

        if (!image.mimetype.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        const uploadCommand = new PutObjectCommand({
            Bucket: bucket,
            Key: imageKey,
            Body: image.data,
            ContentType: image.mimetype,
            Metadata: {
                "user-name": String(userName),
                "type": String(type),
                "timestamp": timestamp ? String(timestamp) : String(Date.now())
            }
        });

        await s3Client.send(uploadCommand);
        console.log(`Image uploaded successfully to ${bucket}/${imageKey}`);
        
        return {
            imageKey,
            bucket
        };
    } catch (error) {
        console.error('Error uploading image to S3:', error);
        throw error;
    }
};

// [POST] /api/s3/get-presigned-url
export const getPresignedUrl = async (req, res) => {
    try {
        console.log(req.body)
        const { key, expiresIn = 60 } = req.body;
        
        if (!key) {
            return res.status(400).json({
                success: false,
                message: 'Bucket and key are required'
            });
        }

        const command = new GetObjectCommand({ 
            Bucket: BUCKET_NAME, 
            Key: key
        });
        
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        
        return res.status(200).json({
            success: true,
            message: 'Successfully created presigned URL',
            data: {
                presignedUrl,
                key,
                expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
            }
        });
    } catch (error) {
        console.error('Error generating presigned URL:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating presigned URL',
            error: error.message
        });
    }
};