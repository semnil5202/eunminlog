import { createReadStream } from 'node:fs';
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

/** 대상 버킷에 한정된 S3 스토리지 작업을 생성한다.
 * @param {object} options 대상 버킷과 선택적 SDK 클라이언트
 */
export function createS3Store({ bucket, client = new S3Client({}) }) {
  return {
    async readJson(key) {
      let result;
      try {
        result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      } catch (error) {
        if (error.name === 'NoSuchKey') return null;
        throw error;
      }
      return JSON.parse(await result.Body.transformToString());
    },
    async listKeys() {
      const keys = [];
      const tokens = new Set();
      let token;
      do {
        const result = await client.send(
          new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }),
        );
        keys.push(...(result.Contents ?? []).map(({ Key }) => Key));
        if (!result.IsTruncated) break;
        token = result.NextContinuationToken;
        if (!token || tokens.has(token)) throw new Error('Invalid S3 list continuation token');
        tokens.add(token);
      } while (true);
      return keys;
    },
    async writeJson(key, value) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: Buffer.from(JSON.stringify(value)),
          ContentType: 'application/json',
          CacheControl: 'no-store',
        }),
      );
    },
    async uploadFile(key, filePath, metadata) {
      const body = createReadStream(filePath);
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentLength: metadata.size,
            ContentType: metadata.contentType,
            CacheControl: metadata.cacheControl,
            ...(metadata.contentEncoding ? { ContentEncoding: metadata.contentEncoding } : {}),
            ChecksumSHA256: Buffer.from(metadata.sha256, 'hex').toString('base64'),
          }),
        );
      } finally {
        body.destroy();
      }
    },
    async deleteKeys(keys) {
      const result = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
        }),
      );
      if (result.Errors?.length) {
        throw new Error(
          `S3 deletion failed: ${result.Errors.map(({ Key, Code }) => `${Key}: ${Code}`).join(', ')}`,
        );
      }
    },
    async deleteControl(key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
