import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { mockClient } from 'aws-sdk-client-mock';

const mockSNSArn = 'arn:aws:sns:us-east-1:123456789012:test-topic';
process.env.AWS_REGION = 'us-east-1';
process.env.PRODUCT_TABLE_NAME = 'test-product-table';
process.env.STOCK_TABLE_NAME = 'test-stock-table';
process.env.CREATE_PRODUCT_TOPIC_ARN = mockSNSArn;

import { main } from '../../src/lambdas/catalogBatchProcess';

jest.mock('uuid', () => ({
    v4: jest.fn(() => 'mocked-uuid-123'),
}));

describe('Catalog Batch Process Lambda Test', () => {
    const dynamoDBMock = mockClient(DynamoDBClient);
    const snsMock = mockClient(SNSClient);

    const mockSQSArn = 'arn:aws:sqs:us-east-1:123456789012:test-queue';

    beforeEach(() => {
        dynamoDBMock.reset();
        snsMock.reset();
    });

    it('should process SQS records and create product and stock entries', async () => {
        const mockSQSEvent: SQSEvent = {
            Records: [
                {
                    messageId: 'test-message-id',
                    receiptHandle: 'test-receipt-handle',
                    body: JSON.stringify({
                        data: {
                            title: 'Test Product',
                            description: 'Test Description',
                            price: '99.99',
                            count: '10',
                        },
                    }),
                    attributes: {
                        ApproximateReceiveCount: '1',
                        SentTimestamp: '',
                        SenderId : '123',
                        ApproximateFirstReceiveTimestamp: '',
                    },
                    md5OfBody: 'test-md5',
                    messageAttributes: {},
                    eventSource: 'aws:sqs',
                    eventSourceARN: mockSQSArn,
                    awsRegion: 'us-east-1',
                }
            ],
        };

        dynamoDBMock.on(PutItemCommand).resolves({});
        snsMock.on(PublishCommand).resolves({
            MessageId: 'test-message-id-123',
        });

        await main(mockSQSEvent);

        // Check dynamoDB was called twice (Product Table and Stock Table)
        expect(dynamoDBMock.calls()).toHaveLength(2);

        const productCall = dynamoDBMock.call(0);

        expect(productCall.args[0].input).toEqual({
            TableName: 'test-product-table',
            Item: {
                id: { S: 'mocked-uuid-123' },
                title: { S: 'Test Product' },
                description: { S: 'Test Description' },
                price: { S: '99.99' }
            },
        });

        const stockCall = dynamoDBMock.call(1);
        expect(stockCall.args[0].input).toEqual({
            TableName: 'test-stock-table',
            Item: {
                id: { S: 'mocked-uuid-123' },
                count: { S: '10' },
            },
        });

        // Verify SNS publish was called
        expect(snsMock.calls()).toHaveLength(1);

        const snsCall = snsMock.call(0);
        expect(snsCall.args[0].input).toEqual({
            TopicArn: mockSNSArn,
            Message: 'Products from CSV file successfully imported in DynamoDB',
            Subject: 'Create Product Event Notification',
        });
    });

    it('should throw an error when DynamoDB product insertion fails', async () => {
        const mockSQSEvent: SQSEvent = {
            Records: [
                {
                    messageId: 'test-message-id',
                    receiptHandle: 'test-receipt-handle',
                    body: JSON.stringify({
                        data: {
                            title: 'Test Product',
                            description: 'Test Description',
                            price: '99.99',
                            count: '10',
                        },
                    }),
                    attributes: {
                        ApproximateReceiveCount: '1',
                        SentTimestamp: '',
                        SenderId : '123',
                        ApproximateFirstReceiveTimestamp: '',
                    },
                    messageAttributes: {},
                    md5OfBody: 'test-md5',
                    eventSource: 'aws:sqs',
                    eventSourceARN: mockSQSArn,
                    awsRegion: 'us-east-1',
                },
            ],
        };

        dynamoDBMock.on(PutItemCommand).rejects(new Error('Table not found'));

        await expect(main(mockSQSEvent)).rejects.toThrow('Table not found');

        // Verify that SNS was not called due to earlier error.
        expect(snsMock.calls()).toHaveLength(0);
    });

    it('should throw error when SNS publish fails', async () => {
        const mockSQSEvent: SQSEvent = {
            Records: [
                {
                    messageId: 'test-message-id',
                    receiptHandle: 'test-receipt-handle',
                    body: JSON.stringify({
                        data: {
                            title: 'Test Product',
                            description: 'Test Description',
                            price: '99.99',
                            count: '10',
                        },
                    }),
                    attributes: {
                        ApproximateReceiveCount: '1',
                        SentTimestamp: '',
                        SenderId : '123',
                        ApproximateFirstReceiveTimestamp: '',
                    },
                    messageAttributes: {},
                    md5OfBody: 'test-md5',
                    eventSource: 'aws:sqs',
                    eventSourceARN: mockSQSArn,
                    awsRegion: 'us-east-1',
                },
            ],
        };

        dynamoDBMock.on(PutItemCommand).resolves({});

        snsMock.on(PublishCommand).rejects(new Error('SNS topic not found'));

        await (expect(main(mockSQSEvent))).rejects.toThrow('SNS topic not found');

        // Verify DynamoDB calls were made
        expect(dynamoDBMock.calls()).toHaveLength(2);
    });
});