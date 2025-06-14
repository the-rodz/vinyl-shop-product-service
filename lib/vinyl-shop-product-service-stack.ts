import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ProductService } from './product-service';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class VinylShopProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new ProductService(this, 'product-service');
  }
}
