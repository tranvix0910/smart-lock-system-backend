import device from '../config/awsIoT/index.js';
import { notifyAll } from '../config/websocket/index.js';
import { updateDeviceState } from '../app/services/deviceStateService.js';
import Fingerprint from '../app/models/Fingerprint.js';
import FaceID from '../app/models/FaceID.js';

let isMessageHandlerRegistered = false;
const subscribedTopics = new Set();
// Store fingerprint request data
const fingerprintRequests = new Map();

export const connectToAWSIoT = () => {
    device.on('connect', function() {
        console.log('Connected to AWS IoT Core');
    });

    device.on('error', function(error) {
        console.error('AWS IoT Error:', error);
    });

    device.on('offline', function() {
        console.log('AWS IoT device went offline');
    });

    device.on('reconnect', function() {
        console.log('AWS IoT device is reconnecting');
    });
    
    if (!isMessageHandlerRegistered) {
        device.on('message', handleMessage);
        isMessageHandlerRegistered = true;
        console.log('Message handler registered');
    }
};

export const subscribeToTopic = (topic) => {
    if (!subscribedTopics.has(topic)) {
        device.subscribe(topic);
        subscribedTopics.add(topic);
        console.log('Subscribed to new topic:', topic);
    } else {
        console.log('Topic already subscribed:', topic);
    }
};

export const publishMessage = (topic, message) => {
    console.log('Publishing message:', { topic, message });
    device.publish(topic, JSON.stringify(message));
};

export const handleMessage = async (topic, payload) => {
    try {
        const message = JSON.parse(payload.toString());
        console.log('Received message:', {
            topic,
            message
        });

        if (topic.startsWith('smartlock/')) {
            const { deviceId, userId, lockState, timestamp } = message;
            
            const updatedDevice = await updateDeviceState(deviceId, lockState, timestamp);
            
            if (updatedDevice) {
                const notificationData = {
                    deviceId,
                    userId,
                    lockState,
                    timestamp,
                    type: 'STATE_CHANGE'
                };

                notifyAll('deviceStateChange', notificationData);
                console.log(`Updated device state and sent notification for device: ${deviceId}`);
            } else {
                console.error(`Device not found: ${deviceId}`);
            }
        }
        
        if (topic.startsWith('smartlock-delete/')) {
            const { userId, deviceId, mode, timestamp } = message;
            console.log(`Received delete device message for device: ${deviceId} from user: ${userId}`);
            
            if (mode === 'DELETE REQUEST APPCEPT FROM CLIENT') {
                console.log(`Client accepted device deletion request: ${JSON.stringify(message)}`);
                notifyAll('deviceDeleteConfirmFromClient', {
                    userId: userId,
                    deviceId: deviceId,
                    status: 'DELETE ACCEPTED FROM CLIENT',
                    timestamp: timestamp
                });
            }
        }

        if (topic.startsWith('addFingerprint-smartlock/')) {
            const { userId, deviceId, faceId, mode, timestamp } = message;
            
            // Extract userId and deviceId from topic if not in message
            const topicParts = topic.split('/');
            const topicUserId = topicParts[1];
            const topicDeviceId = topicParts[2];
            
            // Use values from message or from topic
            const effectiveUserId = userId || topicUserId;
            const effectiveDeviceId = deviceId || topicDeviceId;
            
            console.log(`Processing message for userId: ${effectiveUserId}, deviceId: ${effectiveDeviceId}, mode: ${mode}`);
            
            if (mode === 'ADD FINGERPRINT REQUEST ACCEPTED') {
                console.log(`Client accepted add fingerprint request: ${JSON.stringify(message)}`);
                // Store the entire message
                const requestKey = `${effectiveUserId}-${effectiveDeviceId}`;
                console.log(`Stored fingerprint request for userId: ${effectiveUserId}, deviceId: ${effectiveDeviceId}`);
                fingerprintRequests.set(requestKey, {...message, userId: effectiveUserId, deviceId: effectiveDeviceId});
                console.log('fingerprintRequests:', fingerprintRequests);
                
                notifyAll('addFingerprintConfirmFromClient', {
                    userId: effectiveUserId,
                    deviceId: effectiveDeviceId,
                    faceId,
                    status: 'ADD FINGERPRINT ACCEPTED FROM CLIENT',
                    timestamp
                });
            }
            
            if (mode === 'ADD FINGERPRINT SUCCESS') {
                try {
                    const { fingerprintId, fingerprintTemplate } = message;
                    
                    // Retrieve stored request data using topic parts instead of message
                    const requestKey = `${effectiveUserId}-${effectiveDeviceId}`;
                    console.log(`Looking for fingerprint request with key: ${requestKey}`);
                    console.log('Current fingerprint requests:', fingerprintRequests);
                    
                    const originalMessage = fingerprintRequests.get(requestKey);
                    console.log('originalMessage:', originalMessage);
                    
                    if (!originalMessage) {
                        console.error(`No fingerprint request found for userId: ${effectiveUserId}, deviceId: ${effectiveDeviceId}`);
                        return;
                    }
                    
                    // Get user name from FaceID
                    const faceData = await FaceID.findOne({ faceId: originalMessage.faceId });
                    if (!faceData) {
                        console.error(`FaceID not found for faceId: ${originalMessage.faceId}`);
                        return;
                    }
                    
                    // Create and save fingerprint data
                    const newFingerprint = new Fingerprint({
                        userId: originalMessage.userId,
                        deviceId: originalMessage.deviceId,
                        faceId: originalMessage.faceId,
                        userName: faceData.userName,
                        fingerprintId,
                        fingerprintTemplate
                    });
                    
                    await newFingerprint.save();
                    console.log(`Fingerprint saved to database for user: ${faceData.userName}`);
                    
                    notifyAll('fingerprintSaved', {
                        userId: originalMessage.userId,
                        deviceId: originalMessage.deviceId,
                        faceId: originalMessage.faceId,
                        userName: faceData.userName,
                        fingerprintId,
                        fingerprintTemplate,
                        status: 'SUCCESS'
                    });
                    
                    // Clean up the stored request
                    fingerprintRequests.delete(requestKey);
                } catch (error) {
                    console.error('Error saving fingerprint data:', error);
                    
                    // Notify frontend of error
                    notifyAll('fingerprintSaved', {
                        userId: effectiveUserId,
                        deviceId: effectiveDeviceId,
                        faceId: originalMessage?.faceId,
                        status: 'ERROR',
                        error: error.message
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }
};