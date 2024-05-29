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
import fs = require("fs");


export interface SynFhirApiStageTBDProps extends cdk.StackProps {
    vpc: ec2.Vpc;
    cluster: ecs.Cluster;
    cert: acm.ICertificate;
    zone: route53.IHostedZone;
 }

export class SynFhirApiStageTBD extends cdk.Stack {
    constructor(scope: Construct, id: string, props: SynFhirApiStageTBDProps) {
        super(scope, id, props);
        // Load environment variables from .env file
        const envPath = path.resolve(__dirname, ".env");
        console.log(`Loading environment variables from: ${envPath}`);
        dotenv.config({ path: envPath });
        // Read and parse the .env file
        const envConfig = dotenv.parse(fs.readFileSync(envPath));
        
        const containerBuildArgs = {
            DEPLOYMENT_DOMAIN: envConfig.DEPLOYMENT_DOMAIN || "",
            REPO_URL: envConfig.REPO_URL || "",
            TAG: envConfig.TAG || "",
            DATE: new Date().toISOString(),
            SEMAPHORE: envConfig.SEMAPHORE || "",
        }
        console.log(`fhir tbd stage containerBuildArgs: ${JSON.stringify(containerBuildArgs)}`)
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
                directory: "./synthetic.fhir.api.stage.techbd.org/containers/fhir/", // Adjust this to the path of your Docker context
                file: "Dockerfile", // Specify the Dockerfile name
                buildArgs: containerBuildArgs,
                platform: ecrAssets.Platform.LINUX_AMD64,
                cacheDisabled: true,
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
                        environment: {
                            "JAVA_TOOL_OPTIONS": "-XX:InitialHeapSize=1g -XX:MaxHeapSize=3g"
                        }
                    },
                    publicLoadBalancer: true,
                    domainName: "synthetic.fhir.api.stage.techbd.org",
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
