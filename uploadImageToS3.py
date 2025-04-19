import json
import boto3
import base64
import datetime
from datetime import timedelta, timezone

s3_client = boto3.client('s3')
iot_client = boto3.client('iot-data')

BUCKET_NAME = "smart-door-system"

def publish_to_iot_topic(topic, message):
    try:
        response = iot_client.publish(
            topic=topic,
            qos=1,
            payload=json.dumps(message)
        )
        return response
    except Exception as e:
        print(f"Error publishing to IoT topic: {str(e)}")
        return None

def lambda_handler(event, context):
    try:
        if "body" not in event or not event["body"]:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "No image data received."})
            }
        
        body = event["body"]
        if isinstance(body, str):
            try:
                body = json.loads(body)
            except:
                pass

        query_params = event.get("queryStringParameters", {}) or {}
        
        userId = body.get("userId") if isinstance(body, dict) else None
        userId = userId or query_params.get("userId")
        
        deviceId = body.get("deviceId") if isinstance(body, dict) else None
        deviceId = deviceId or query_params.get("deviceId")
        
        now_utc = datetime.datetime.now(timezone.utc)
        vietnam_offset = timedelta(hours=7)
        now_vietnam = now_utc + vietnam_offset
        
        date_string = now_vietnam.strftime("%d-%m-%Y")
        
        if not userId or not deviceId:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "userId and deviceId are required."})
            }
        
        is_base64 = event.get("isBase64Encoded", False)
        image_data = None
        
        if is_base64:
            image_data = base64.b64decode(event["body"])
        elif isinstance(body, dict) and "image" in body:
            image_data = base64.b64decode(body["image"])
        else:
            image_data = event["body"].encode("utf-8") if isinstance(event["body"], str) else event["body"]
        
        timestamp = now_vietnam.strftime("%Y-%m-%d_%H-%M-%S")
        
        file_path = f"history/{userId}/{deviceId}/{date_string}/{timestamp}.jpg"
        
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=file_path,
            Body=image_data,
            ContentType="image/jpeg"
        )
        
        file_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{file_path}"
        topic = f"uploadImage-lambda/{userId}/{deviceId}"

        iot_message = {
            "userId": userId,
            "deviceId": deviceId,
            "fileUrl": file_url,
        }
        
        publish_to_iot_topic(topic, iot_message)
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "File uploaded successfully",
                "file_url": file_url,
                "metadata": {
                    "userId": userId,
                    "deviceId": deviceId,
                    "date": date_string,
                    "timestamp": timestamp,
                    "timezone": "Vietnam (GMT+7)"
                }
            })
        }
        
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "Error uploading file",
                "error": str(e)
            })
        }
