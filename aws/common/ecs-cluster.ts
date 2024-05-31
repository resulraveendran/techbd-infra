// This stack creates & exports the following resources:
// - a VPC
// - an ECS cluster
// - hosted zone
// - an ACM certificate

// other stacks can import these exported resources to use them

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';

export interface EcsClusterProps extends cdk.StackProps { }

export function ecsCluster(stack: cdk.Stack, props: EcsClusterProps): EcsCluster {
    return new EcsCluster(stack, 'EcsCluster', props);
}

export class EcsCluster extends cdk.Stack {
    vpc: ec2.Vpc;
    cluster: ecs.Cluster;
    zone: route53.IHostedZone;
    certificate: acm.ICertificate;
    constructor(scope: Construct, id: string, props: EcsClusterProps) {
        super(scope, id, props);

        // create the VPC
        this.vpc = new ec2.Vpc(this, "VPC", { maxAzs: 2 });

        // create the ECS cluster
        this.cluster = new ecs.Cluster(this, "Cluster", {
            vpc: this.vpc,
            containerInsights: true,
            
        });

        // create a hosted zone
        this.zone = route53.HostedZone.fromLookup(this, "HostedZone", {
            domainName: "techbd.org",
        });

        // create an ACM certificate
        this.certificate = new Certificate(this, "domainCert", {
            domainName: "techbd.org",
            subjectAlternativeNames: [
              `synthetic.fhir.api.stage.techbd.org`,
            ],
            validation: CertificateValidation.fromDns(),
          });
    }
}