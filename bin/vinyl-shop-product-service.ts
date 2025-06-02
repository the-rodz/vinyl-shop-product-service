#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VinylShopProductServiceStack } from '../lib/vinyl-shop-product-service-stack';
import { ImportServiceStack } from '../lib/import-service-stack';
import { AuthorizationServiceStack } from '../lib/authorization-service-stack';

const app = new cdk.App();
const productStack = new VinylShopProductServiceStack(app, 'VinylShopProductServiceStack', {});
const authorizationStack = new AuthorizationServiceStack(app, 'AuthorizationServiceStack', {});

const importStack = new ImportServiceStack(app, 'ImportServiceStack', {
  catalogItemsQueue: productStack.catalogItemsQueue,
});

importStack.addDependency(productStack);
