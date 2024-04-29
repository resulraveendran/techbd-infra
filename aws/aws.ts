#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SynSftpTBD } from './synthetic.sftp.techbd.org/stack';
import { SynSftpQE } from './synthetic.sftp.qualifiedentity.org/stack';
const app = new cdk.App();

new SynSftpTBD(app, 'synthetic-sftp-techbd-org', {});
new SynSftpQE(app, 'synthetic-sftp-qualifiedentity-org', {});