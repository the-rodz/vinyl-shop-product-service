import { SQSEvent, SQSRecord } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { v4 as uuidv4 } from 'uuid';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;
const createProductTopicArn = process.env.CREATE_PRODUCT_TOPIC_ARN as string;

export async function main(event: SQSEvent) {
    console.log(`Incoming request to catalog batch process lambda with params: ${JSON.stringify(event)}`);
    try {
        for (const record of event.Records ) {
            const messageBody = JSON.parse(record.body);
            const productId = uuidv4();

            const commandProduct = new PutItemCommand({
                TableName: productTableName,
                Item: {
                    id: { S: productId },
                    title: { S: messageBody.data.title },
                    description: { S: messageBody.data.description },
                    price: { S: messageBody.data.price },
                },
            });

            await dynamoDB.send(commandProduct);

            const commandStock = new PutItemCommand({
                TableName: stockTableName,
                Item: {
                    id: { S: productId },
                    count: { S: messageBody.data.count },
                },
            });

            await dynamoDB.send(commandStock);

            console.log(`Inserted product and stock for productId: ${productId}`);
        }

        await publishCreateProductMessage();
    } catch (error) {
        console.error(`Error processing sqs event: ${error}`);
        throw error;
    }
}

async function publishCreateProductMessage(): Promise<void> {
    const command = new PublishCommand({
        TopicArn: createProductTopicArn,
        Message: 'Products from CSV file successfully imported in DynamoDB',
        Subject: 'Create Product Event Notification',
    });

    const result = await snsClient.send(command);
    console.log(`Successfully published to SNS: ${result.MessageId}`);
}