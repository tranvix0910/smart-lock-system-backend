import device from '../config/awsIoT/index.js';
import { notifyAll } from '../config/websocket/index.js';
import { updateDeviceState } from '../app/services/deviceStateService.js';

let isMessageHandlerRegistered = false;
const subscribedTopics = new Set();

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
    } catch (error) {
        console.error('Error processing message:', error);
    }
};