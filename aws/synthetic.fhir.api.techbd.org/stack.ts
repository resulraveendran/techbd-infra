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
        const envPath = path.resolve(__dirname, ".env");
        console.log(`Loading environment variables from: ${envPath}`);
        dotenv.config({ path: envPath });
        // Read and parse the .env file
        const envConfig = dotenv.parse(fs.readFileSync(envPath));

        // dotenv.config({ path: path.resolve(__dirname,".env") });
        const containerBuildArgs = {
            DEPLOYMENT_DOMAIN: envConfig.DEPLOYMENT_DOMAIN || "",
            REPO_URL: envConfig.REPO_URL || "",
            TAG: envConfig.TAG || "",
            DATE: new Date().toISOString(),
            SEMAPHORE: envConfig.SEMAPHORE || "",
            TECHBD_UDI_DS_PRIME_JDBC_URL: envConfig.TECHBD_UDI_DS_PRIME_JDBC_URL || "",
            TECHBD_UDI_DS_PRIME_JDBC_USERNAME: envConfig.TECHBD_UDI_DS_PRIME_JDBC_USERNAME || "",
            TECHBD_UDI_DS_PRIME_JDBC_PASSWORD: envConfig.TECHBD_UDI_DS_PRIME_JDBC_PASSWORD || "",
            SPRING_PROFILES_ACTIVE: envConfig.SPRING_PROFILES_ACTIVE || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_0_TENANTID: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_0_TENANTID || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_0_SERVER: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_0_SERVER || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_0_PORT: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_0_PORT || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_0_USERNAME: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_0_USERNAME || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_0_PASSWORD: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_0_PASSWORD || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_1_TENANTID: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_1_TENANTID || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_1_SERVER: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_1_SERVER || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_1_PORT: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_1_PORT || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_1_USERNAME: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_1_USERNAME || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_1_PASSWORD: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_1_PASSWORD || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_2_TENANTID: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_2_TENANTID || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_2_SERVER: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_2_SERVER || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_2_PORT: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_2_PORT || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_2_USERNAME: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_2_USERNAME || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_2_PASSWORD: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_2_PASSWORD || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_3_TENANTID: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_3_TENANTID || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_3_SERVER: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_3_SERVER || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_3_PORT: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_3_PORT || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_3_USERNAME: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_3_USERNAME || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_3_PASSWORD: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_3_PASSWORD || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_4_TENANTID: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_4_TENANTID || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_4_SERVER: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_4_SERVER || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_4_PORT: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_4_PORT || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_4_USERNAME: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_4_USERNAME || "",
            ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_4_PASSWORD: envConfig.ORG_TECHBD_ORCHESTRATE_SFTP_ACCOUNT_ORCHCTLTS_4_PASSWORD || "",
            SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GITHUB_CLIENT_ID: envConfig.SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GITHUB_CLIENT_ID || "",
            SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GITHUB_CLIENT_SECRET: envConfig.SPRING_SECURITY_OAUTH2_CLIENT_REGISTRATION_GITHUB_CLIENT_SECRET || "",
            ORG_TECHBD_SERVICE_HTTP_FILTER_SENSITIVE_REPO_URL: envConfig.ORG_TECHBD_SERVICE_HTTP_FILTER_SENSITIVE_REPO_URL || "",
            ORG_TECHBD_SERVICE_HTTP_FILTER_SENSITIVE_TOKEN: envConfig.ORG_TECHBD_SERVICE_HTTP_FILTER_SENSITIVE_TOKEN || "",
        }
        console.log(`fhir tbd prod containerBuildArgs: ${JSON.stringify(containerBuildArgs)}`)
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
                directory: "./synthetic.fhir.api.techbd.org/containers/hub-prime/", // Adjust this to the path of your Docker context
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
