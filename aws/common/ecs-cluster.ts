// This stack creates & exports the following resources:
// - a VPC
// - an ECS cluster

// other stacks can import these exported resources to use them

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import { Construct } from 'constructs';

export interface EcsClusterProps extends cdk.StackProps { }

export class EcsCluster extends cdk.Stack {
    vpc: ec2.Vpc;
    cluster: ecs.Cluster;
    constructor(scope: Construct, id: string, props: EcsClusterProps) {
        super(scope, id, props);


        // create the VPC
        this.vpc = new ec2.Vpc(this, "VPC", { maxAzs: 2 });

        // create the ECS cluster
        this.cluster = new ecs.Cluster(this, "Cluster", {
            vpc: this.vpc,
            containerInsights: true,
        });
    }
}