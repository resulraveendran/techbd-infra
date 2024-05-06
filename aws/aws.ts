import * as cdk from 'aws-cdk-lib';
import { SynSftpTBD } from './synthetic.sftp.techbd.org/stack';
import { SynSftpQE } from './synthetic.sftp.qualifiedentity.org/stack';
import { SynFhirApiQE } from './synthetic.fhir.api.qualifiedentity.org/stack';
import { EcsCluster, ecsCluster } from './common/ecs-cluster';


const app = new cdk.App();


const region = "us-east-1";
const account= "339712786701";


new SynSftpTBD(app, 'synthetic-sftp-techbd-org', {
});


const SynQECluster = new EcsCluster(app, 'synthetic-shared-qualifiedentity-org', {
    env: {
        account,
        region
    }
});
new SynSftpQE(app, 'synthetic-sftp-qualifiedentity-org', {
    env: {
        account,
        region
    },
    vpc: SynQECluster.vpc,
    cluster: SynQECluster.cluster
});
new SynFhirApiQE(app, 'synthetic-fhir-api-qualifiedentity-org', {
    env: {
        account,
        region
    },
    vpc: SynQECluster.vpc,
    cluster: SynQECluster.cluster,
    cert: SynQECluster.certificate,
    zone: SynQECluster.zone
});