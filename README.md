# Vinyl Shop Product Service

This project contains the infrastructure as a code of AWS components to generate Product Service to be used by shop-react-redux-cloudfront client project.

## Assignment Task 3
- URL to `getProductList` endpoint: [https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products](https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products)
- URL to `getProductById` endpoint: [https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products/{:productId}](https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products/2). Where `productId` is a string between 1-6.
- [Swagger file](docs/swagger-documentation.json)

## Assignment Task 4 (Current)
- URL to `getProductList` endpoint with dynamoDB items: https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products (GET request)
- URL to `getProductById` endpoint with dynamoDB integration: https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products/41502b4b-2d06-4e85-8526-d2a92e23e087 (GET request)
  - Other possible IDs:
    - `43819ecf-65f0-4548-b7af-f8b92ee43319`
    - `7cb9e5e5-3a1d-4241-9085-0bf7fd0bac87`
- URL to `createProduct` endpoint with dynamoDB integration: https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products (POST request)

Payload format:
```
{
    "title": "My Vinyl",
    "description": "Standard Edition",
    "price": "89",
    "count": "1"
}
``` 
- URL to frontend project which displays Products from dynamoDB: https://d2h8spcnjjuho2.cloudfront.net/.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
* `npm run cdk:bootstrap` bootstraps the project by running `cdk bootstrap`
* `npm run cdk:deploy` builds and deploys CDK project to AWS
* `npm run seed:db` runs script to fill dynamodb tables 
