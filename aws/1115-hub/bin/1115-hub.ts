#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { 1115HubStack } from '../lib/1115-hub-stack';

const app = new cdk.App();
new 1115HubStack(app, '1115HubStack');
