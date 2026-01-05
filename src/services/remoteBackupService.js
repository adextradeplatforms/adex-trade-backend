import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import logger from '../config/logger.js';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

const BUCKET_NAME = process.env.AWS_S3_BACKUP_BUCKET;

// Upload backup to S3
export const uploadToS3 = async (localFilePath, remoteFileName = null) => {
  try {
    if (!BUCKET_NAME) throw new Error('AWS S3 bucket not configured');

    const fileName = remoteFileName || path.basename(localFilePath);
    const fileContent = fs.readFileSync(localFilePath);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `backups/${fileName}`,
      Body: fileContent,
      ContentType: 'application/x-gzip',
      ServerSideEncryption: 'AES256'
    });

    await s3Client.send(command);

    logger.info(`Backup uploaded to S3: ${fileName}`);

    return {
      success: true,
      bucket: BUCKET_NAME,
      key: `backups/${fileName}`,
      url: `https://${BUCKET_NAME}.s3.amazonaws.com/backups/${fileName}`
    };
  } catch (error) {
    logger.error('S3 upload failed:', error);
    throw error;
  }
};

// List S3 backups
export const listS3Backups = async () => {
  try {
    if (!BUCKET_NAME) throw new Error('AWS S3 bucket not configured');

    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'backups/'
    });

    const response = await s3Client.send(command);

    const backups = (response.Contents || []).map(item => ({
      key: item.Key,
      size: item.Size,
      lastModified: item.LastModified,
      fileName: path.basename(item.Key)
    }));

    return backups;
  } catch (error) {
    logger.error('Failed to list S3 backups:', error);
    throw error;
  }
};

// Download backup from S3
export const downloadFromS3 = async (key, localPath) => {
  try {
    if (!BUCKET_NAME) throw new Error('AWS S3 bucket not configured');

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const response = await s3Client.send(command);
    const writeStream = fs.createWriteStream(localPath);

    return new Promise((resolve, reject) => {
      response.Body.pipe(writeStream)
        .on('error', reject)
        .on('finish', () => {
          logger.info(`Backup downloaded from S3: ${key}`);
          resolve(localPath);
        });
    });
  } catch (error) {
    logger.error('S3 download failed:', error);
    throw error;
  }
};

// Delete backup from S3
export const deleteFromS3 = async (key) => {
  try {
    if (!BUCKET_NAME) throw new Error('AWS S3 bucket not configured');

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);

    logger.info(`Backup deleted from S3: ${key}`);

    return { success: true };
  } catch (error) {
    logger.error('S3 deletion failed:', error);
    throw error;
  }
};
