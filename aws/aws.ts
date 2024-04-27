#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ComputeStack } from './synthetic.sftp.techbd.org/stack';

const app = new cdk.App();

new ComputeStack(app, 'synthetic-sftp-techbd-org', {});