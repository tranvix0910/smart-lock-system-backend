import device from '../config/awsIoT/index.js';
import { notifyAll } from '../config/websocket/index.js';
import { updateDeviceState } from '../app/services/aws/IoTCore/deviceStateService.js';
import Fingerprint from '../app/models/Fingerprint.js';
import FaceID from '../app/models/FaceID.js';
import RFIDCard from '../app/models/RFID.js';
import Device from '../app/models/Device.js';
import RecentAccessLog from '../app/models/RecentAccessLogs.js';

let isMessageHandlerRegistered = false;
const subscribedTopics = new Set();
const fingerprintRequests = new Map();
const rfidRequests = new Map();

const subscribeDefaultTopics = async () => {
    try {
        const devices = await Device.find({});
        
        for (const device of devices) {
            const recentAccessTopic = `recentAccess-smartlock/${device.userId}/${device.deviceId}`;
            subscribeToTopic(recentAccessTopic);
            console.log(`Subscribed to default topics for device: ${device.deviceId}, user: ${device.userId}`);
        }
    } catch (error) {
        console.error('Error subscribing to default topics:', error);
    }
};

export const connectToAWSIoT = () => {
    device.on('connect', async function() {
        console.log('Connected to AWS IoT Core');
        
        // Subscribe các topic mặc định
        await subscribeDefaultTopics();
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

        if (topic.startsWith('deleteFingerprint-smartlock/')) {
            const { fingerprintId, faceId, mode } = message;
            
            // Extract userId and deviceId from topic if not in message
            const topicParts = topic.split('/');
            const topicUserId = topicParts[1];
            const topicDeviceId = topicParts[2];
            
            // Use values from message or from topic
            const effectiveUserId = topicUserId;
            const effectiveDeviceId = topicDeviceId;
            
            // Store request data for later use
            const requestKey = `delete-${effectiveUserId}-${effectiveDeviceId}-${fingerprintId}`;
            
            if (mode === 'DELETE FINGERPRINT ACCEPTED') {
                console.log(`Client accepted delete fingerprint request: ${JSON.stringify(message)}`);
                
                // Store the fingerprint ID and faceId for later
                fingerprintRequests.set(requestKey, {
                    userId: effectiveUserId,
                    deviceId: effectiveDeviceId,
                    fingerprintId,
                    faceId
                });
                
                // Notify frontend that client accepted fingerprint deletion
                notifyAll('deleteFingerprintConfirmFromClient', {
                    userId: effectiveUserId,
                    deviceId: effectiveDeviceId,
                    fingerprintId,
                    faceId,
                    status: 'DELETE FINGERPRINT ACCEPTED FROM CLIENT'
                });
            }
            
            if (mode === 'DELETE FINGERPRINT SUCCESS') {
                try {
                    console.log(`Fingerprint deletion success: ${JSON.stringify(message)}`);
                    
                    // Retrieve stored request data using requestKey
                    let requestData = fingerprintRequests.get(requestKey);
                    
                    if (!requestData) {
                        console.error(`No fingerprint delete request found for requestKey: ${requestKey}`);
                        // Use current message data if stored data not found
                        requestData = { 
                            userId: effectiveUserId, 
                            deviceId: effectiveDeviceId,
                            fingerprintId,
                            faceId
                        };
                    }
                    
                    // Delete fingerprint from database
                    const deletedFingerprint = await Fingerprint.findOneAndDelete({
                        userId: requestData.userId,
                        deviceId: requestData.deviceId,
                        fingerprintId: requestData.fingerprintId
                    });
                    
                    if (!deletedFingerprint) {
                        console.error(`No fingerprint found to delete with fingerprintId: ${requestData.fingerprintId}`);
                    } else {
                        console.log(`Fingerprint deleted from database: ${deletedFingerprint._id}`);
                    }
                    
                    // Notify frontend that fingerprint was deleted
                    notifyAll('fingerprintDeleted', {
                        userId: requestData.userId,
                        deviceId: requestData.deviceId,
                        fingerprintId: requestData.fingerprintId,
                        faceId: requestData.faceId,
                        status: 'SUCCESS'
                    });
                    
                    // Clean up the stored request
                    fingerprintRequests.delete(requestKey);
                    
                } catch (error) {
                    console.error('Error deleting fingerprint:', error);
                    
                    // Notify frontend of error
                    notifyAll('fingerprintDeleted', {
                        userId: effectiveUserId,
                        deviceId: effectiveDeviceId,
                        fingerprintId,
                        faceId,
                        status: 'ERROR',
                        error: error.message
                    });
                }
            }
        }

        if (topic.startsWith('addRFIDCard-smartlock/')) {
            const { faceId, mode, uidLength, cardUID } = message;
            
            const topicParts = topic.split('/');
            const topicUserId = topicParts[1];
            const topicDeviceId = topicParts[2];
            
            const effectiveUserId = topicUserId;
            const effectiveDeviceId = topicDeviceId;
            
            console.log(`Processing RFID message for userId: ${effectiveUserId}, deviceId: ${effectiveDeviceId}, mode: ${mode}`);
            
            const requestKey = `rfid-${effectiveUserId}-${effectiveDeviceId}`;
            
            if (mode === 'ADD RFID CARD REQUEST ACCEPTED') {
                console.log(`Client accepted add RFID card request: ${JSON.stringify(message)}`);
                
                rfidRequests.set(requestKey, {
                    ...message,
                    userId: effectiveUserId,
                    deviceId: effectiveDeviceId,
                    faceId: faceId
                });
                
                console.log(`Stored RFID card request with key: ${requestKey}`);
                console.log('rfidRequests:', rfidRequests);
                
                notifyAll('addRFIDCardConfirmFromClient', {
                    userId: effectiveUserId,
                    deviceId: effectiveDeviceId,
                    faceId,
                    status: 'ADD RFID CARD ACCEPTED FROM CLIENT'
                });
            }

            if (mode === 'ADD RFID CARD SUCCESS') {
                try {
                    console.log(`RFID Card success message received: ${JSON.stringify(message)}`);
                    
                    const currentRfidIdValue = cardUID || message.cardUID;
                    const currentRfidIdLength = uidLength || message.uidLength;
                    
                    if (!currentRfidIdValue) {
                        console.error('No RFID ID value found in message');
                        return;
                    }
                    
                    const originalMessage = rfidRequests.get(requestKey);
                    
                    if (!originalMessage) {
                        console.error(`No RFID card request found for key: ${requestKey}`);
                        return;
                    }
                    
                    const faceData = await FaceID.findOne({ faceId: originalMessage.faceId });
                    const userName = faceData ? faceData.userName : 'Unknown User';

                    const newRFIDCard = new RFIDCard({
                        userId: originalMessage.userId,
                        deviceId: originalMessage.deviceId,
                        faceId: originalMessage.faceId,
                        userName,
                        rfidId: currentRfidIdValue,
                        rfidIdLength: currentRfidIdLength,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    
                    await newRFIDCard.save();
                    console.log(`RFID card saved to database: ${currentRfidIdValue} for user: ${userName}`);

                    // Send websocket notification to frontend
                    notifyAll('rfidCardSaved', {
                        userId: originalMessage.userId,
                        deviceId: originalMessage.deviceId,
                        faceId: originalMessage.faceId,
                        userName,
                        rfidId: currentRfidIdValue,
                        rfidIdLength: currentRfidIdLength,
                        status: 'SUCCESS'
                    });

                    // Clean up the stored request
                    rfidRequests.delete(requestKey);
    
                } catch (error) {
                    console.error('Error saving RFID card data:', error);
                    
                    // Notify frontend of error
                    notifyAll('rfidCardSaved', {
                        userId: effectiveUserId,
                        deviceId: effectiveDeviceId,
                        faceId,
                        status: 'ERROR',
                        error: error.message
                    });
                }
            }

            if(mode === 'ADD RFID CARD FAILED: CARD ALREADY EXISTS'){
                console.log(`RFID Card already exists: ${JSON.stringify(message)}`);
                
                // Lấy thông tin từ tin nhắn
                const { cardUID, uidLength } = message;
                
                // Tìm thông tin yêu cầu ban đầu
                const requestKey = `rfid-${effectiveUserId}-${effectiveDeviceId}`;
                const originalMessage = rfidRequests.get(requestKey);
                
                // Gửi thông báo lỗi đến frontend
                notifyAll('rfidCardSaved', {
                    userId: effectiveUserId,
                    deviceId: effectiveDeviceId,
                    faceId: originalMessage?.faceId,
                    rfidId: 'N/A',
                    rfidIdLength: 'N/A',
                    status: 'ERROR',
                    error: 'RFID_CARD_ALREADY_EXISTS',
                });
                
                // Xóa request đã lưu
                rfidRequests.delete(requestKey);
                
                console.log(`RFID card already exists error sent to frontend for card: ${cardUID}`);
            }
        }

        if (topic.startsWith('recentAccess-smartlock/')) {
            const { userId, deviceId, userName: originalUserName, method, status, notes } = message;
            
            console.log(`Received recent access message for userId: ${userId}, deviceId: ${deviceId}, method: ${method}, status: ${status}, notes: ${notes}`);

            let accessType;
            switch(method) {
                case 'FACEID':
                    accessType = 'FACE_ID';
                    break;
                case 'FINGERPRINT':
                    accessType = 'FINGERPRINT';
                    break;
                case 'RFID':
                    accessType = 'RFID';
                    break;
                case 'WEB_APP':
                    accessType = 'WEB_APP';
                    break;
                default:
                    accessType = 'Unknown';
            }

            // Xử lý userName
            let logUserName = originalUserName;
            if (logUserName === null) {
                logUserName = 'Unknown User';
            } else if (logUserName === "ACCOUNT USER") {
                const device = await Device.findOne({ deviceId });
                if (device) {
                    logUserName = device.userName || 'Account';
                }
            }
            
            const recentAccessLog = new RecentAccessLog({
                userId,
                deviceId,
                userName: logUserName,
                accessType,
                status: status,
                notes: notes || 'No notes provided'
            });

            await recentAccessLog.save();
            console.log(`Recent access log saved to database for userId: ${userId}, deviceId: ${deviceId}`);
        }
    } catch (error) {
        console.error('Error processing message:', error);
    }   
}