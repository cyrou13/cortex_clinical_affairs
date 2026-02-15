export interface MinioConfig {
  endpoint: string;
  port: number;
  accessKey: string;
  secretKey: string;
  bucket: string;
  useSSL: boolean;
}

export interface StorageService {
  uploadPdf(key: string, buffer: Buffer, metadata?: Record<string, string>): Promise<void>;
  getPdfUrl(key: string): Promise<string>;
  deletePdf(key: string): Promise<void>;
  pdfExists(key: string): Promise<boolean>;
}

export class MinioStorageService implements StorageService {
  constructor(private readonly config: MinioConfig) {}

  static buildKey(projectId: string, sessionId: string, articleId: string): string {
    return `projects/${projectId}/sessions/${sessionId}/articles/${articleId}/fulltext.pdf`;
  }

  async uploadPdf(key: string, buffer: Buffer, metadata?: Record<string, string>): Promise<void> {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

    const client = this.createClient(S3Client);
    await client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'application/pdf',
        Metadata: metadata,
      }),
    );
  }

  async getPdfUrl(key: string): Promise<string> {
    const { S3Client } = await import('@aws-sdk/client-s3');
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');

    const client = this.createClient(S3Client);
    return getSignedUrl(client, new GetObjectCommand({ Bucket: this.config.bucket, Key: key }), {
      expiresIn: 3600,
    });
  }

  async deletePdf(key: string): Promise<void> {
    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    const client = this.createClient(S3Client);
    await client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }

  async pdfExists(key: string): Promise<boolean> {
    const { S3Client, HeadObjectCommand } = await import('@aws-sdk/client-s3');

    const client = this.createClient(S3Client);
    try {
      await client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private createClient(S3ClientClass: any) {
    return new S3ClientClass({
      endpoint: `${this.config.useSSL ? 'https' : 'http'}://${this.config.endpoint}:${this.config.port}`,
      region: 'us-east-1',
      credentials: {
        accessKeyId: this.config.accessKey,
        secretAccessKey: this.config.secretKey,
      },
      forcePathStyle: true,
    });
  }
}
