import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const bucketName = "smart-door-system";
const bucketRegion = "ap-southeast-1";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const folderPath = path.join(__dirname, "images-smart-lock"); // Thư mục chứa ảnh đăng ký

const s3Client = new S3Client({
  region: bucketRegion,
});

// Hàm lấy user_name từ file (không có đuôi .jpg)
const parseUserNameFromFilename = (filename) => {
  const match = filename.match(/^(.+?)(?:\.[a-zA-Z0-9]+)?$/);
  return match ? match[1] : null;
};

// Xác định loại file (content type)
const getContentType = (file) => {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") {
    return "image/png";
  } else if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  return "application/octet-stream";
};

// Hàm upload ảnh đăng ký gương mặt
const uploadRegisteredFace = async (bucketName, folderPath) => {
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && file.match(/\.(jpg|jpeg|png)$/i)) {
      const userName = parseUserNameFromFilename(file);
      const contentType = getContentType(file);

      if (!userName) {
        console.warn(`⚠️ Không thể xác định user_name từ file: ${file}`);
        continue;
      }

      // Đặt tên file cố định `{user_name}-registered.jpg`
      const newFileName = `${userName}-registered${path.extname(file)}`;
      const s3Key = `users/${userName}/faces/${newFileName}`;

      // Thông tin upload
      const uploadParams = {
        Bucket: bucketName,
        Key: s3Key,
        Body: fs.createReadStream(filePath),
        Metadata: {
          "user-name": userName,
          "type": "registered-face",
        },
        ContentType: contentType,
      };

      try {
        const result = await s3Client.send(new PutObjectCommand(uploadParams));
        console.log(`✅ Đã đăng ký gương mặt: ${file} → ${s3Key}`, result);
      } catch (error) {
        console.error(`❌ Lỗi upload ${file}:`, error);
      }
    }
  }
};

// Chạy upload ảnh đăng ký
uploadRegisteredFace(bucketName, folderPath);
