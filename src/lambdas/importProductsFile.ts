import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client();
const bucketName = process.env.BUCKET_NAME as string;
const folder = process.env.FOLDER as string;

type ImportProductEvent = {
    fileName: string;
}

export async function main(event: ImportProductEvent) {
    console.log(`Incoming request to GET /import with params: ${JSON.stringify(event)}`);

    try {
        const fileName = event.fileName;

        if (!fileName) {
            throw new Error('fileName is required for importing products');
        }

        const s3Key = `${folder}/${fileName}`;

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

        return {
            url: signedUrl,
        }
    } catch (error) {
        console.error(`Error generating signed URL: ${error}`);

        throw error;
    }
}
