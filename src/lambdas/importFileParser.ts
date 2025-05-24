import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import csv from 'csv-parser';
import { Readable } from 'stream';

type ImportFileEvent = {
    Records: Record[];
};

type Record = {
    eventSource: string;
    eventName: string;
    s3: any;
};

const s3Client = new S3Client();
const sqsClient = new SQSClient();
const uploadedFolder = process.env.FOLDER as string;
const catalogItemsQueueUrl = process.env.CATALOG_ITEMS_QUEUE_URL as string;
const parsedFolder = 'parsed';

export async function main(event: ImportFileEvent) {
    console.log(`Processing uploaded file to S3 with event: ${JSON.stringify(event)}`);

    if (!catalogItemsQueueUrl) {
        throw new Error('CATALOG_ITEMS_QUEUE_URL environment variable is not set');
    }

    try {
        for (const record of event.Records) {
            if (record.eventSource === 'aws:s3' && record.eventName.startsWith('ObjectCreated:')) {
                const bucket = record.s3.bucket.name;
                const key = record.s3.bucket.key || record.s3.object.key;

                if (!key.startsWith(`${uploadedFolder}/`)) {
                    console.log(`Skipping file not containing ${uploadedFolder}/: ${key}`);
                    continue;
                }

                if (key.toLowerCase().endsWith('.csv')) {
                    const products = await processCsv(bucket, key);
                    console.log('File successfully processed.');

                    const sendMessagesPromises = products.map(async (product, index) => {
                        try {
                            const messageBody = JSON.stringify({
                                data: product,
                                processedAt: new Date().toISOString(),
                                productIndex: index,
                            });

                            const command = new SendMessageCommand({
                                QueueUrl: catalogItemsQueueUrl,
                                MessageBody: messageBody,
                            });

                            const result = await sqsClient.send(command);
                            console.log(`Sent product ${index} to SQS. MessageId ${result.MessageId}`);

                            return result;
                        } catch (error) {
                            console.error(`Failed to send product ${index} to SQS: ${error}`);
                            throw error;
                        }
                    });

                    await Promise.all(sendMessagesPromises);

                    console.log(`Successfully processed and sent ${products.length} products to SQS`);

                    // move processed file to /parsed folder
                    await moveParsedFile(bucket, key);
                }
            }
        }
    } catch (error) {
        console.error(`Error processing s3 event: ${error}`);
        throw error;
    }
}

async function processCsv(bucket: string, key: string): Promise<any[]> {
    console.log( `Getting file content for bucket: ${bucket}/${key}`);
    try {
        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });

        const response = await s3Client.send(command);

        if (!response.Body) {
            throw new Error('Empty file');
        }

        const results: any[] = [];

        return new Promise((resolve, reject) => {
            const stream = response.Body as Readable;

            stream
                .pipe(csv())
                .on('data', (data) => {
                    results.push(data);
                })
                .on('error', (error) => {
                    console.log(`Error parsing CSV file: ${error}`)
                    reject(error);
                })
                .on('end', () => {
                    console.log(`Successfully parsed CSV file.`);
                    resolve(results);
                })
        });
    } catch (error) {
        console.error(`Error getting file content: ${error}`);
        throw error;
    }
}

async function moveParsedFile(bucket: string, sourceKey: string): Promise<any> {
    try {
        const destinationKey = sourceKey.replace(uploadedFolder, parsedFolder);
        console.log(`Copying ${sourceKey} to ${destinationKey}`);
        
        const copyCommand = new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${sourceKey}`,
            Key: destinationKey,
        });
        await s3Client.send(copyCommand);

        console.log(`Successfully copied to ${destinationKey}`);

        const deleteCommand = new DeleteObjectCommand({
            Bucket: bucket,
            Key: sourceKey,
        });
        await s3Client.send(deleteCommand);

        console.log(`Successfully deleted ${sourceKey}`);
    } catch (error) {
        console.error(`Error moving file in S3: ${error}`);
        throw error;
    }
}
