#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkTsCodePipelinesStack } from '../lib/cdk_ts_code_pipelines-stack';
import { BillingStack } from '../lib/BillingStack';

const app = new cdk.App();
new CdkTsCodePipelinesStack(app, 'CdkTsCodePipelinesStack', {

});
new BillingStack(app, 'CDKBillingStack', {
  threshold: 90,
  amount: 5,
  emailAddress: "andrew.c.downing@gmail.com"
});