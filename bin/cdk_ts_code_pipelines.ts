#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelinesStack } from '../lib/pipelines-stack';
import { BillingStack } from '../lib/BillingStack';

const app = new cdk.App();
new PipelinesStack(app, 'Pipeline', {
  stackName: 'Pipeline-stack'

});
new BillingStack(app, 'CDKBillingStack', {
  threshold: 90,
  amount: 5,
  emailAddress: "andrew.c.downing@gmail.com"
});