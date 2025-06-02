import { APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent, StatementEffect } from 'aws-lambda';
import { fromBase64 } from '@aws-sdk/util-base64';

export async function main(event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> {
    console.log(`Request received in basicAuthorizer lambda function with event: ${JSON.stringify(event)}`);
    const token = event.authorizationToken;

    if (!token || !token.startsWith('Basic ')) {
        // This will trigger a 401 response
        console.log('Token is not present');
        throw new Error('Unauthorized');
    }

    try {
        const base64Credentials = token.replace('Basic ', '');
        const credentials = new TextDecoder().decode(fromBase64(base64Credentials));
        const [username, password] = credentials.split(':');

        const isValid = checkCredentials(username, password);

        if (!isValid) {
            // Trigger a 403 - Forbidden status response
            return generatePolicy('user', 'Deny', event.methodArn);
        }

        console.log('User is authorized to continue with request.');
        return generatePolicy(username, 'Allow', event.methodArn);
    } catch (error) {
        throw new Error('Something went wrong while authorizing user.');
    }
}

function checkCredentials(username: string, password: string): Boolean {
    return !!(process.env[username] && process.env[username] === password);
}

function generatePolicy(user: string, effect: StatementEffect, methodArn: string): APIGatewayAuthorizerResult {
    return {
        principalId: user,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: methodArn,
                },
            ],
        },
    };
}