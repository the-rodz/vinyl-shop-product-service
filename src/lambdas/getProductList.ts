import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from '@aws-sdk/util-dynamodb';

import { Product } from "../models/Product";
import { Stock } from "../models/Stock";

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const productTableName = process.env.PRODUCT_TABLE_NAME as string;
const stockTableName = process.env.STOCK_TABLE_NAME as string;

function unmarshallData<T>(data: any[]) {
    return data.map((element) => unmarshall(element) as T);
}

export async function main(event: string) {
    console.log(`Incoming request to /products with params: ${JSON.stringify(event)}`);
    try {
        const commandProduct = new ScanCommand({
            TableName: productTableName,
        });

        const response = await dynamoDB.send(commandProduct);
        const products = response.Items && response.Items.length ? unmarshallData<Product>(response.Items) : [];
        if (products) {
            const commandStock = new ScanCommand({
                TableName: stockTableName,
            });
            const responseStock = await dynamoDB.send(commandStock);
            const stock = responseStock.Items && responseStock.Items.length ? unmarshallData<Stock>(responseStock.Items) : [];
            
            const map = new Map(stock.map(item => [item.id, item]));

            return products.map(product => {
                const stock = map.get(product.id);
                return stock ? { ...product, ...stock } : {};
            })
        }
        return products;
    } catch (error) {
        console.error('Error: ', error);
        throw new Error('Error getting all products from DynamoDB table');
    }
};
