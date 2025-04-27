# Vinyl Shop Product Service

This project contains the infrastructure as a code of AWS components to generate Product Service to be used by shop-react-redux-cloudfront client project.

## Assignment Task 3
- URL to `getProductList` endpoint: [https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products](https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products)
- URL to `getProductById` endpoint: [https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products/{:productId}](https://ew7p4ug5wl.execute-api.us-west-1.amazonaws.com/prod/products/2). Where `productId` is a string between 1-6.
- [Swagger file](docs/swagger-documentation.json)

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
* `npm run cdk:bootstrap` bootstraps the project by running `cdk bootstrap`
* `npm run cdk:deploy` deploys CDK project to AWS
