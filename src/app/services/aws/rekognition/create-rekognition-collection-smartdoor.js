import { RekognitionClient, CreateCollectionCommand, IndexFacesCommand } from '@aws-sdk/client-rekognition';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const REGION = 'ap-southeast-1';

const s3Client = new S3Client({
    region: REGION
});

const rekogClient = new RekognitionClient({
    region: REGION,
});

const collectionId = 'smart-door-system-collection';
const sourceBucket = 'smart-door-system';

async function createCollection() {
    try {
        const command = new CreateCollectionCommand({ CollectionId: collectionId });
        const response = await rekogClient.send(command);
        console.log('Collection created:', response.CollectionArn);
    } catch (error) {
        if (error.name === 'ResourceAlreadyExistsException') {
            console.log('Collection already exists');
        } else {
            console.error('Error creating collection:', error.message);
        }
    }
}

async function listRegisteredFaces(bucket) {
    try {
        const command = new ListObjectsV2Command({ Bucket: bucket, Prefix: 'users/' });
        const response = await s3Client.send(command);

        // Filter only registered faces with the format : users/{user_name}/faces/{user_name}-registered.jpg
        return response.Contents
            ? response.Contents
                  .map((item) => item.Key)
                  .filter((key) => key.includes('/faces/') && key.endsWith('-registered.jpg'))
            : [];
    } catch (error) {
        console.error('Error listing images from S3:', error.message);
        return [];
    }
}

async function indexFace(imageKey) {
    try {
        // Extract user_name from the path `users/{user_name}/faces/{user_name}-registered.jpg`
        const parts = imageKey.split('/');
        const userName = parts[1]; // `{user_name}` is at position 2

        const params = {
            CollectionId: collectionId,
            Image: {
                S3Object: {
                    Bucket: sourceBucket,
                    Name: imageKey,
                },
            },
            ExternalImageId: userName, // Set user_name as ID for comparison later
            DetectionAttributes: ['ALL'],
        };

        const command = new IndexFacesCommand(params);
        const response = await rekogClient.send(command);

        console.log(`Indexed face for ${userName}:`, response.FaceRecords.map((record) => record.Face.FaceId));
    } catch (error) {
        console.error(`Error indexing face for ${imageKey}:`, error.message);
    }
}

async function main() {
    await createCollection();
    
    const registeredFaces = await listRegisteredFaces(sourceBucket);
    console.log('Found registered face images:', registeredFaces);

    for (const imageKey of registeredFaces) {
        await indexFace(imageKey);
    }
}

main().catch((error) => console.error('Error in main function:', error.message));
