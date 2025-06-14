import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import { Construct } from 'constructs';

const folder = 'uploaded';

export class ImportServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'ImportBucket', {
            versioned: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.HEAD,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                    ],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                }
            ],
        });

        const importProductsFileFunction = new lambda.Function(this, 'import-products-file-function', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'importProductsFile.main',
            code: lambda.Code.fromAsset(path.join(__dirname, '../dist/src/lambdas')),
            environment: {
                BUCKET_NAME: bucket.bucketName,
                FOLDER: folder,
            },
        });

        bucket.grantWrite(importProductsFileFunction, `${folder}/*`);

        const api = new apigateway.RestApi(this, 'import-api', {
            restApiName: 'Import Service',
            description: 'This service handles import products file by returned signed URL',
            defaultCorsPreflightOptions: {
                allowOrigins: ['https://d2h8spcnjjuho2.cloudfront.net/', 'http://localhost:3000'],
                allowMethods: ['GET', 'OPTIONS'],
            },
        });

        const importProductsFileIntegration = new apigateway.LambdaIntegration(importProductsFileFunction, {
            proxy: false,
            requestTemplates: {
                'application/json': JSON.stringify({
                    fileName: "$input.params('fileName')"
                }),
            },
            integrationResponses: [
                {
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({
                            url: "$input.path('$.url')"
                        }),
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'"
                    }
                },
                {
                    statusCode: '400',
                    selectionPattern: '.*[Ii]nvalid.*|.*[Rr]equired.*',
                    responseTemplates: {
                        'application/json': JSON.stringify({
                            error: "$input.path('$.errorMessage')"
                        }),
                    },
                },
                {
                    statusCode: '500',
                    selectionPattern: '.*[Ee]rror.*',
                    responseTemplates: {
                        'application/json': JSON.stringify({
                            error: 'Internal server error'
                        }),
                    },
                },
            ],
        });

        const importProductsResource = api.root.addResource('import');

        importProductsResource.addMethod('GET', importProductsFileIntegration, {
            methodResponses: [
                { 
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                    },
                },
                { statusCode: '400' },
                { statusCode: '500' },
            ],
        });

        const importFileParserFunction = new lambda.Function(this, 'import-file-parser-function', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(30),
            handler: 'importFileParser.main',
            code: lambda.Code.fromAsset(path.join(__dirname, '../dist/src/lambdas')),
            environment: {
                FOLDER: folder,
            },
        });

        bucket.grantReadWrite(importFileParserFunction);

        bucket.addEventNotification(
            s3.EventType.OBJECT_CREATED,
            new s3n.LambdaDestination(importFileParserFunction),
            {
                prefix: `${folder}/`,
            }
        );

        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: api.url,
            description: 'URL of the API Gateway',
        })

    }
}
