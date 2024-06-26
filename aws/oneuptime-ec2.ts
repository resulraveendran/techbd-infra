#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { VpcLookupStack } from '../aws/health.synthetic.techbd.org/vpc-lookup-stack';
import { OneUptimeEc2InstanceStack } from '../aws/health.synthetic.techbd.org/oneuptime-ec2-instance-stack';
import { SmtpUserStack } from '../aws/health.synthetic.techbd.org/smtp-user-stack';

const app = new cdk.App();
const region = "us-west-1";
const account = "339712786701"; // Replace with your account ID


// Assume you already have a VPC created and you have its ID
const vpcId = process.env.VPC_ID;

if (!vpcId) {
    throw new Error('VPC_ID environment variable is not defined');
  }
  

// Create the base stack to look up the VPC
const vpcLookupStack = new VpcLookupStack(app, 'VpcLookupStack', {
  env: {
    account,
    region,
  },
  vpcId,
});

// Create the SMTP user stack
new SmtpUserStack(app, 'SmtpStack', {
  env: {
    account,
    region,
  },
});

// Create the EC2 instance stack and deploy OneUptime
new OneUptimeEc2InstanceStack(app, 'OneUptimeEc2InstanceStack', {
  env: {
    account,
    region,
  },
  vpc: vpcLookupStack.vpc,
});

app.synth();
