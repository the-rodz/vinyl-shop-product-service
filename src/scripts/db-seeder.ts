import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

import { Product } from '../models/Product';
import { Stock } from '../models/Stock';

const client = new DynamoDBClient({
    region: 'us-west-1',
});

const documentClient = DynamoDBDocumentClient.from(client);

const generateProducts = (count: number): Product[] => {
  const titles = [
    'Abbey Road',
    'Dark Side of the Moon',
    'Led Zeppelin II',
    'Nevermind',
    'Rumours',
    'The Rise and Fall of Ziggy Stardust and the Spiders from Mars',
    'Back in Black',
    'Wish you Were Here',
    'Graceland',
    'Highway 61 Revisited',
    'In the Court of the Crimson King',
    'OK Computer',
    'Paranoid',
    "Sgt. Pepper's Lonely Hearts Club Band",
    'Are you Experienced',
    'Blonde on Blonde',
    'London Calling',
    'Pet Sounds',
    'Animals',
    'Remain in Light',
  ];

  const descriptions = [
    'Double Vinyl',
    'Standard Edition',
    '2LP Color',
    'Deluxe Edition',
    'Anniversary Edition',
  ];

  return Array.from({ length: count }, (_, index) => ({
    id: uuidv4(),
    title: titles[index],
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    price: Math.floor(Math.random() * (150 - 65 + 1)) + 65,
  }));
};

const generateStock = (products: Product[]): Stock[] => {
    return products.map(product => ({
        id: product.id,
        count: Math.floor(Math.random() * (10 - 1 + 1)) + 1,
    }));
};

const putItem = async(tableName: string, item: Product | Stock): Promise<void> => {
    const command = new PutCommand({
        TableName: tableName,
        Item: item,
    })

    try {
        await documentClient.send(command);
    } catch (error) {
        console.log(`Error adding item to ${tableName}: `, error);
        throw error;
    }
};

const populateTables = async (): Promise<void> => {
    try {
        const products = generateProducts(20);
        const stock = generateStock(products);

        console.log('Inserting items...');
        for (const product of products) {
            await putItem('products', product);
        }

        console.log('Inserting stock...');
        for (const stockProduct of stock) {
            await putItem('stock', stockProduct);
        }

        console.log('Test data population complete!');
    } catch (error) {
        console.error('Error during test data population: ', error);
    }
};

populateTables().then(() => {
    console.log('Finished executing the seeder');
}).catch((error) => {
    console.error('Unhandled error: ', error);
})
