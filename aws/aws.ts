import * as cdk from 'aws-cdk-lib';
import { SynSftpTBD } from './synthetic.sftp.techbd.org/stack';
import { SynSftpQE } from './synthetic.sftp.qualifiedentity.org/stack';
import { SynFhirApiQE } from './synthetic.fhir.api.qualifiedentity.org/stack';
import { SynFhirApiTBD } from './synthetic.fhir.api.techbd.org/stack';
import { SynFhirApiStageTBD } from './synthetic.fhir.api.stage.techbd.org/stack';
import { EcsCluster } from './common/ecs-cluster';

const app = new cdk.App();
const region = "us-east-1";
const account= "339712786701";

// techbd.org
const SynTBDCluster = new EcsCluster(app, 'synthetic-shared-prod-techbd-org', {
    env: {
        account,
        region
    }
});
new SynSftpTBD(app, 'synthetic-sftp-prod-techbd-org', {
    env: {
        account,
        region
    },
    vpc: SynTBDCluster.vpc,
    cluster: SynTBDCluster.cluster
});
new SynFhirApiTBD(app, 'synthetic-fhir-api-prod-techbd-org', {
    env: {
        account,
        region
    },
    vpc: SynTBDCluster.vpc,
    cluster: SynTBDCluster.cluster,
    cert: SynTBDCluster.certificate,
    zone: SynTBDCluster.zone
});

// devl.techbd.org
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

// stage.techbd.org
const SynStageTBDCluster = new EcsCluster(app, 'synthetic-shared-stage-techbd-org', {
    env: {
        account,
        region
    }
});
new SynFhirApiStageTBD(app, 'synthetic-fhir-api-stage-techbd-org', {
    env: {
        account,
        region
    },
    vpc: SynStageTBDCluster.vpc,
    cluster: SynStageTBDCluster.cluster,
    cert: SynStageTBDCluster.certificate,
    zone: SynStageTBDCluster.zone
});