import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

type CreateProductBody = {
    title: string;
    description: string;
    price: number;
    count: number;
}

type CreateProductEvent = {
    body: CreateProductBody;
}

class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
};

export async function main(event: CreateProductEvent) {
    console.log(`Incoming request to POST /products with params: ${JSON.stringify(event)}`);
    try {
        if (!event || !event.body.title || !event.body.price || !event.body.count) {
            throw new ValidationError('ValidationError: There is some missing data in payload.');
        }

        const productId = uuidv4();
        const commandProduct = new PutItemCommand({
            TableName: productTableName,
            Item: {
                id: { S: productId },
                title: { S: event.body.title },
                description: { S: event.body.description },
                price: { S: event.body.price.toString() },
            },
        });

        await dynamoDB.send(commandProduct);

        const commandStock = new PutItemCommand({
            TableName: stockTableName,
            Item: {
                id: { S: productId },
                count: { S: event.body.count.toString() },
            },
        });

        await dynamoDB.send(commandStock);

        return {
            id: productId,
        };
    } catch (error) {
        console.error('Error: ', error);

        if (error instanceof ValidationError) {
            throw new Error(error.message);
        } else {
            throw new Error('UnexpectedError: Something went wrong.');
        }
    }
}