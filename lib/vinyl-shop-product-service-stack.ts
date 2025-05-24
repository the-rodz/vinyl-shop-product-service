import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as path from 'path';

const EMAIL_ADDRESS = 'Mario_Rodriguez@epam.com';

function generateLambdaFunctionProps(handlerName: string, customEnv = {}): lambda.FunctionProps {
    return {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: handlerName,
            code: lambda.Code.fromAsset(path.join(__dirname, '../dist/src/lambdas')),
            environment: {
                STOCK_TABLE_NAME: 'stock',
                PRODUCT_TABLE_NAME: 'products',
                ...customEnv,
            },
        };
}

function getIntegrationResponses(errorMessage: string) {
    return [
        {
            statusCode: '200',
        },
        {
            statusCode: '400',
            selectionPattern: '4\\d{2}',
            responseTemplates: {
                'application/json': JSON.stringify({
                    message: errorMessage,
                })
            }
        },
    ];
}

export class VinylShopProductServiceStack extends cdk.Stack {
  public readonly catalogItemsQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = dynamodb.Table.fromTableName(this, 'Products', 'products');
            const stockTable = dynamodb.Table.fromTableName(this, 'Stock', 'stock');
    
            const getProductListFunction = new lambda.Function(
                this,
                'get-product-list-function', 
                generateLambdaFunctionProps('getProductList.main'),
            );
    
            const getProductByIdFunction = new lambda.Function(
                this,
                'get-product-by-id-function',
                generateLambdaFunctionProps('getProductById.main'),
            );
    
            const createProductFunction = new lambda.Function(
                this,
                'create-product',
                generateLambdaFunctionProps('createProduct.main'),
            );
    
            productsTable.grantReadData(getProductListFunction);
            productsTable.grantReadData(getProductByIdFunction);
            productsTable.grantWriteData(createProductFunction);
    
            stockTable.grantReadData(getProductListFunction);
            stockTable.grantReadData(getProductByIdFunction);
            stockTable.grantWriteData(createProductFunction);
    
            const api = new apigateway.RestApi(this, 'my-api', {
                restApiName: 'My API Gateway',
                description: 'This API serves the lambda functions.',
                defaultCorsPreflightOptions: {
                   allowOrigins: ['https://d2h8spcnjjuho2.cloudfront.net/', 'http://localhost:3000'],
                  allowMethods: ['GET', 'OPTIONS', 'POST'],
                },
            });
    
            const getProductListIntegration = new apigateway.LambdaIntegration(getProductListFunction, {
                integrationResponses: getIntegrationResponses('Products not found'),
                proxy: false,
            });
    
            const productsResource = api.root.addResource('products');
            
            productsResource.addMethod('GET', getProductListIntegration, {
                methodResponses: [{ statusCode: '200' }]
            });
    
            const getProductByIdIntegration = new apigateway.LambdaIntegration(getProductByIdFunction, {
                requestTemplates: {
                    "application/json": `{"productId": "$input.params('productId')"}`
                },
                integrationResponses: getIntegrationResponses('Product not found'),
                proxy: false,
            });
            
            const productByIdResource = productsResource.addResource('{productId}');
            
            productByIdResource.addMethod('GET', getProductByIdIntegration, {
                methodResponses: [{ statusCode: '200' }]
            });
    
            const createProductIntegration = new apigateway.LambdaIntegration(createProductFunction, {
                requestTemplates: {
                    "application/json": `{"body": $input.json('$')}`
                },
                integrationResponses:  [
                    {
                        statusCode: '400',
                        selectionPattern: 'ValidationError.*',
                        responseTemplates: {
                            'application/json': '$input.json("$")'
                        },
                    },
                    {
                        statusCode: '500',
                        selectionPattern: 'UnexpectedError.*',
                        responseTemplates: {
                            'application/json': '$input.json("$")'
                        },
                    },
                    {
                        statusCode: '201',
                        responseTemplates: {
                            'application/json': '$input.json("$")',
                        }
                    },
                ],
                proxy: false,
            });
    
            productsResource.addMethod('POST', createProductIntegration, {
                methodResponses: [{ statusCode: '201' }, { statusCode: '400' }]
            });

            const createProductTopic = new sns.Topic(this, 'create-product-topic', {
              topicName: 'create-product-topic',
              displayName: 'Create Product Topic',
            });

            createProductTopic.addSubscription(
              new snsSubscriptions.EmailSubscription(EMAIL_ADDRESS),
            );
    
            const catalogBatchProcessFunction = new lambda.Function(
                this,
                'catalog-batch-process',
                generateLambdaFunctionProps('catalogBatchProcess.main', {
                  CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
                }),
            );
    
            this.catalogItemsQueue = new sqs.Queue(this, 'catalog-items-queue', {
              queueName: 'catalogItemsQueue',
            });
    
            catalogBatchProcessFunction.addEventSource(new SqsEventSource(this.catalogItemsQueue, { batchSize: 5 }));

            // Grant catalogBatchProcess lambda permissions to publish to SNS topic
            createProductTopic.grantPublish(catalogBatchProcessFunction);

            productsTable.grantWriteData(catalogBatchProcessFunction);
            stockTable.grantWriteData(catalogBatchProcessFunction);

            new cdk.CfnOutput(this, 'CatalogItemsQueueUrl', {
              value: this.catalogItemsQueue.queueUrl,
              description: 'Catalog Items Queue URL for Importing Vinyls',
            })
  }
}
