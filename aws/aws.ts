import * as cdk from 'aws-cdk-lib';
import { SynSftpTBD } from './synthetic.sftp.techbd.org/stack';
import { SynSftpQE } from './synthetic.sftp.qualifiedentity.org/stack';
import { SynFhirApiQE } from './synthetic.fhir.api.qualifiedentity.org/stack';
import { EcsCluster } from './common/ecs-cluster';


const app = new cdk.App();
new SynSftpTBD(app, 'synthetic-sftp-techbd-org', {});


const SynQECluster = new EcsCluster(app, 'synthetic-shared-qualifiedentity-org', {});
new SynSftpQE(app, 'synthetic-sftp-qualifiedentity-org', {
    vpc: SynQECluster.vpc,
    cluster: SynQECluster.cluster
});
new SynFhirApiQE(app, 'synthetic-fhir-api-qualifiedentity-org', {
    vpc: SynQECluster.vpc,
    cluster: SynQECluster.cluster
});