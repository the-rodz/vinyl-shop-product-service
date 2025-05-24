import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

const corsPreflightOptions = {
    allowOrigins: ['https://d2h8spcnjjuho2.cloudfront.net/', 'http://localhost:3000'],
    allowMethods: ['GET', 'OPTIONS'],
};

function generateLambdaFunctionProps(handlerName: string): lambda.FunctionProps {
    return {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: handlerName,
            code: lambda.Code.fromAsset(path.join(__dirname, '../dist/src/lambdas')),
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

export class ProductService extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);

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

        const api = new apigateway.RestApi(this, 'my-api', {
            restApiName: 'My API Gateway',
            description: 'This API serves the lambda functions.'
        });

        const getProductListIntegration = new apigateway.LambdaIntegration(getProductListFunction, {
            integrationResponses: getIntegrationResponses('Products not found'),
            proxy: false,
        });

        const productListResource = api.root.addResource('products');
        
        productListResource.addMethod('GET', getProductListIntegration, {
            methodResponses: [{ statusCode: '200' }]
        });
        productListResource.addCorsPreflight(corsPreflightOptions);

        const getProductByIdIntegration = new apigateway.LambdaIntegration(getProductByIdFunction, {
            requestTemplates: {
                "application/json": `{"productId": "$input.params('productId')"}`
            },
            integrationResponses: getIntegrationResponses('Product not found'),
            proxy: false,
        });
        
        const productByIdResource = productListResource.addResource('{productId}');
        
        productByIdResource.addMethod('GET', getProductByIdIntegration, {
            methodResponses: [{ statusCode: '200' }]
        });
        productByIdResource.addCorsPreflight(corsPreflightOptions);
    }
}