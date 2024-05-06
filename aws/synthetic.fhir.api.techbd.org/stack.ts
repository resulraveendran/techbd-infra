import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as efs from "aws-cdk-lib/aws-efs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import path = require("path");


export interface SynFhirApiTBDProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    cluster: ecs.Cluster;
    cert: acm.ICertificate;
    zone: route53.IHostedZone;
 }

export class SynFhirApiTBD extends cdk.Stack {
    constructor(scope: Construct, id: string, props: SynFhirApiTBDProps) {
        super(scope, id, props);
        // Load environment variables from .env file
        dotenv.config({ path: "./synthetic.fhir.api.techbd.org/.env" });
        const containerBuildArgs = {
            DEPLOYMENT_DOMAIN: process.env.DEPLOYMENT_DOMAIN || "",
            REPO_URL: process.env.REPO_URL || "",
            TAG: process.env.TAG || "",
            DATE: new Date().toISOString(),
            SEMAPHORE: process.env.SEMAPHORE || "",
        }
        
        // create a role for fhir tasks to access the EFS filesystem
        const fhirTaskRole = new iam.Role(this, "fhirTaskRole", {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            managedPolicies: [],
        });

        // create a security group for the fhir service
        const fhirSg = new ec2.SecurityGroup(
            this,
            "fhirServiceSecurityGroup",
            {
                vpc: props.vpc,
                allowAllOutbound: true,
            }
        );
        // allow inbound traffic to the fhir service from the EFS filesystem
        fhirSg.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(efs.FileSystem.DEFAULT_PORT),
            "Allow inbound traffic to the fhir service from the EFS filesystem"
        );

        // Define a Docker image asset for the fhir container
        const fhirDockerImage = new ecrAssets.DockerImageAsset(
            this,
            "fhirImage",
            {
                directory: "./synthetic.fhir.api.techbd.org/containers/fhir/", // Adjust this to the path of your Docker context
                file: "Dockerfile", // Specify the Dockerfile name
                buildArgs: containerBuildArgs,
                platform: ecrAssets.Platform.LINUX_AMD64,
            }
        );
       

        // Create a load-balanced Fargate service and make it public
        const fhirService =
            new ecsPatterns.ApplicationLoadBalancedFargateService(
                this,
                "fhirService",
                {
                    cluster:props.cluster,
                    desiredCount: 1,
                    cpu: 2048,
                    memoryLimitMiB: 4096,
                    taskImageOptions: {
                        image: ecs.ContainerImage.fromDockerImageAsset(fhirDockerImage),
                        enableLogging: true,
                        containerPort: 8080,
                        taskRole: fhirTaskRole,
                    },
                    publicLoadBalancer: true,
                    domainName: "synthetic.fhir.api.techbd.org",
                    domainZone: props.zone,
                    certificate: props.cert,
                    redirectHTTP: true,
                    healthCheckGracePeriod: cdk.Duration.seconds(300),
                    securityGroups: [fhirSg],
                    enableExecuteCommand: true,
                }
            );

        // add the health check endpoint to the fhir service
        fhirService.targetGroup.configureHealthCheck({
            path: "/metadata",
        });
    }
}