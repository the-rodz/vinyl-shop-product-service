import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn()
}));

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Setup env variables used in lambda function
process.env.BUCKET_NAME = 'test-bucket';
process.env.FOLDER = 'uploaded';

import { main } from '../../src/lambdas/importProductsFile';

describe('Import Product Lambda Tests', () => {
    const s3Mock = mockClient(S3Client);
    
    const mockUrl = 'https://test-bucket.s3.amazonaws.com/uploaded/test-file.csv';

    beforeEach(() => {
        // Reset all mocks before each test
        s3Mock.reset();
        jest.clearAllMocks();

        // Setup env variables used in lambda function
        process.env.BUCKET_NAME = 'test-bucket';
        process.env.FOLDER = 'uploaded';

        (getSignedUrl as jest.Mock).mockResolvedValue(mockUrl);
    });

    afterEach(() => {
        jest.clearAllMocks();
    })

    it ('should return a signed URL when received a valid fileName', async () => {
        const fileName = 'test-file.csv';
        const expectedUrl = mockUrl;

        const eventPayload = {
            fileName,
        };

        // Call the lambda handler
        const result = await main(eventPayload);

        expect(result).toEqual({ url: expectedUrl });

        expect(getSignedUrl).toHaveBeenCalledTimes(1);

        // Verify command has the correct params
        const commandArg = (getSignedUrl as jest.Mock).mock.calls[0][1] as PutObjectCommand;
        expect(commandArg instanceof PutObjectCommand).toBeTruthy();
        expect(commandArg.input.Bucket).toEqual('test-bucket');
        expect(commandArg.input.Key).toEqual('uploaded/test-file.csv');

        const options = (getSignedUrl as jest.Mock).mock.calls[0][2];
        expect(options).toEqual({ expiresIn: 300 });
    });

    it('should throw an error when fileName is not present', async () => {
        const eventPayload = {
            fileName: '',
        };

        await expect(main(eventPayload)).rejects.toThrow('fileName is required for importing products');

        // Verify getSignedUrl was not called
        expect(getSignedUrl).not.toHaveBeenCalled();
    });

    it('should propagate errors from S3 operations', async () => {
        const fileName = 'test-file.csv';

        const s3Error = new Error('S3 operation failed');
        (getSignedUrl as jest.Mock).mockRejectedValueOnce(s3Error);

        const eventPayload = {
            fileName,
        };

        await expect(main(eventPayload)).rejects.toThrow(s3Error);

        // Verify getSignedUrl was called
        expect(getSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('should construct the S3 key with the folder and fileName', async () => {
        const fileName = 'test-file.csv';

        const eventPayload = {
            fileName,
        };

        await main(eventPayload);

        // Verify the command has the correct key with custom folder
        const commonArgs = (getSignedUrl as jest.Mock).mock.calls[0][1] as PutObjectCommand;
        expect(commonArgs.input.Key).toEqual('uploaded/test-file.csv');
    });
});