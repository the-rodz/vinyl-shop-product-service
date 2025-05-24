import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { Product } from '../models/Product';
import { Stock } from '../models/Stock';

type ProductEvent = {
    productId: string;
}

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const stockTableName = process.env.STOCK_TABLE_NAME as string;
const productTableName = process.env.PRODUCT_TABLE_NAME as string;

export async function main(event: ProductEvent) {
    console.log(`Incoming request to /products/{:id} with params: ${JSON.stringify(event)}`);
    try {
        const commandProduct = new GetItemCommand({
            TableName: productTableName,
            Key: {
                id: { S: event.productId },
            },
        });

        const responseProduct = await dynamoDB.send(commandProduct);
        const product = responseProduct.Item ? unmarshall(responseProduct.Item) as Product : null;

        if (product) {
            const commandStock = new GetItemCommand({
                TableName: stockTableName,
                    Key: {
                    id: { S: product.id },
                }
            });
            const responseStock = await dynamoDB.send(commandStock);
            const stock = responseStock.Item ? unmarshall(responseStock.Item) as Stock : null;

            return {
                ...product,
                ...stock,
            }
        }

        return product;
        
    } catch (error) {
        console.error('Error: ', error);
        throw new Error(`vError getting product from DynamoDB table with id: ${event.productId}`);
    }
}
