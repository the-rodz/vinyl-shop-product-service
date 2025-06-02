import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

export class AuthorizationServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const envPath = path.join(__dirname, '..', '.env');
        const envConfig = dotenv.parse(fs.readFileSync(envPath));

        const basicAuthorizer = new lambda.Function(this, 'basic-authorizer-function', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: cdk.Duration.seconds(5),
            handler: 'basicAuthorizer.main',
            code: lambda.Code.fromAsset(path.join(__dirname, '../dist/src/lambdas')),
            environment: {
                ...envConfig,
            }
        });

        basicAuthorizer.addPermission('AllowApiGatewayInvoke', {
            principal: new cdk.aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
            action: 'lambda:InvokeFunction',
            sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:*`,
        });

        new cdk.CfnOutput(this, 'basicAuthorizerArn', {
            value: basicAuthorizer.functionArn,
            description: 'Basic Authorizer Lambda Function ARN',
            exportName: 'basicAuthorizerFunctionArn',
        });
    }
}
