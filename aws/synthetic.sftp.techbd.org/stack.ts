import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as efs from "aws-cdk-lib/aws-efs";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecrAssets from "aws-cdk-lib/aws-ecr-assets";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import { ManagedPolicy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import * as dotenv from "dotenv";
import path = require("path");
import fs = require("fs");


export interface SynSftpTBDProps extends cdk.StackProps { 
  vpc: ec2.Vpc;
  cluster: ecs.Cluster;
}

export class SynSftpTBD extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SynSftpTBDProps) {
    super(scope, id, props);
    //
    //
    // Shared Services
    //
    //
    const envPath = path.resolve(__dirname, ".env");
    console.log(`Loading environment variables from: ${envPath}`);
    dotenv.config({ path: envPath });
    // Read and parse the .env file
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
        
    const containerBuildArgs = {
        DEPLOYMENT_DOMAIN: envConfig.DEPLOYMENT_DOMAIN || "",
        REPO_URL: envConfig.REPO_URL || "",
        TAG: envConfig.TAG || "",
        QE_NAMES: envConfig.QE_NAMES || "",
        ORCHCTL_CRON: envConfig.ORCHCTL_CRON || "",
        FHIR_ENDPOINT: envConfig.FHIR_ENDPOINT || "",
        DATE: new Date().toISOString(),
        SEMAPHORE: envConfig.SEMAPHORE || "",
        POSTGRES_DB: envConfig.POSTGRES_DB || "",
        POSTGRES_USER: envConfig.POSTGRES_USER || "",
        POSTGRES_HOST: envConfig.POSTGRES_HOST || "",
        POSTGRES_PASSWORD: envConfig.POSTGRES_PASSWORD || "",
        POSTGRES_PORT: envConfig.POSTGRES_PORT || "",
    }
    console.log(`sftp tbd containerBuildArgs: ${JSON.stringify(containerBuildArgs)}`)
    // Create the EFS filesystem
    const fileSystem = new efs.FileSystem(this, "SharedEfsFileSystem", {
      vpc: props.vpc,
      encrypted: true,
      lifecyclePolicy: efs.LifecyclePolicy.AFTER_14_DAYS, // Adjust according to your needs
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
    });

    const accessPoint = new efs.AccessPoint(this, "AccessPoint", {
      fileSystem: fileSystem,
      path: "/",
    });

    // Allow ECS tasks to connect to the EFS filesystem
    fileSystem.connections.allowDefaultPortFrom(props.cluster.connections);
    fileSystem.connections.allowDefaultPortTo(props.cluster.connections);

    // Define the EFS volume for ECS tasks
    const efsVolume: ecs.Volume = {
      name: "efsVolume",
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        transitEncryption: "ENABLED",
        authorizationConfig: {
          accessPointId: accessPoint.accessPointId,
        },
      },
    };

    // efs access policy that we can add to our ECS task roles
    const efsAccessPolicy = new ManagedPolicy(this, "efsAccessPolicy", {
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ["elasticfilesystem:*"],
          resources: [fileSystem.fileSystemArn],
        }),
      ],
    });

    //
    //
    // Workflow Service
    //
    //

    // create a role for workflow tasks to access the EFS filesystem
    const workflowTaskRole = new iam.Role(this, "workflowTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [efsAccessPolicy],
    });

    // create a security group for the workflow service
    const workflowSg = new ec2.SecurityGroup(
      this,
      "workflowServiceSecurityGroup",
      {
        vpc:props.vpc,
        allowAllOutbound: true,
      }
    );
    // allow inbound traffic to the workflow service from the EFS filesystem
    workflowSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(efs.FileSystem.DEFAULT_PORT),
      "Allow inbound traffic to the workflow service from the EFS filesystem"
    );

    // Define a Docker image asset for the workflow container
    const workflowDockerImage = new ecrAssets.DockerImageAsset(
      this,
      "workflowImage",
      {
        directory: "./synthetic.sftp.techbd.org/containers/workflow/", // Adjust this to the path of your Docker context
        file: "Dockerfile", // Specify the Dockerfile name
        buildArgs: containerBuildArgs,
        platform: ecrAssets.Platform.LINUX_AMD64,
        cacheDisabled: true,
      }
    );

    // Create a load-balanced Fargate service and make it public
    const workflowService =
      new ecsPatterns.ApplicationLoadBalancedFargateService(
        this,
        "workflowService",
        {
          cluster:props.cluster,
          desiredCount: 1,
          cpu: 2048,
          memoryLimitMiB: 4096,
          taskImageOptions: {
            image: ecs.ContainerImage.fromDockerImageAsset(workflowDockerImage),
            enableLogging: true,
            containerPort: 8082,
            taskRole: workflowTaskRole,
            environment: containerBuildArgs,
          },
          publicLoadBalancer: false,
          listenerPort: 8082,
          healthCheckGracePeriod: cdk.Duration.seconds(300),
          securityGroups: [workflowSg],
          enableExecuteCommand: true,
        }
      );

    // allow inbound & outbound traffic between the workflow service & file system
    workflowService.service.connections.allowFrom(
      fileSystem,
      ec2.Port.tcp(efs.FileSystem.DEFAULT_PORT)
    );
    workflowService.service.connections.allowTo(
      fileSystem,
      ec2.Port.tcp(efs.FileSystem.DEFAULT_PORT)
    );
    fileSystem.connections.allowDefaultPortFrom(workflowService.service);
    fileSystem.connections.allowDefaultPortTo(workflowService.service);

    // add the EFS volume to the workflow service task definition
    workflowService.taskDefinition.addVolume({
      name: "efsVolume",
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        transitEncryption: "ENABLED",
        authorizationConfig: {
          accessPointId: accessPoint.accessPointId,
          iam: "ENABLED",
        },
      },
    });
    // add the mount point to the container definition
    workflowService.taskDefinition.defaultContainer!.addMountPoints({
      containerPath: "/SFTP",
      sourceVolume: "efsVolume",
      readOnly: false,
    });

    //
    //
    // SFTP Service
    //
    //
    // create a role for sftp tasks to access the EFS filesystem
    const sftpTaskRole = new iam.Role(this, "sftpTaskRole", {
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [efsAccessPolicy],
    });

    // create a security group for the sftp service
    const sftpSg = new ec2.SecurityGroup(this, "sftpServiceSecurityGroup", {
      vpc:props.vpc,
      allowAllOutbound: true,
    });

    // allow inbound traffic to the sftp service from the EFS filesystem
    sftpSg.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(efs.FileSystem.DEFAULT_PORT),
      "Allow inbound traffic to the sftp service from the EFS filesystem"
    );

    // create a load-balanced Fargate service for the sftp container
    const sftpDockerImage = new ecrAssets.DockerImageAsset(this, "sftpQualifiedEntityImage", {
      directory: "./synthetic.sftp.techbd.org/containers/sftp/", // Adjust this to the path of your Docker context
      file: "Dockerfile", // Specify the Dockerfile name
      platform: ecrAssets.Platform.LINUX_AMD64,
      buildArgs: containerBuildArgs,
      cacheDisabled: true,
    });

    const sftpService = new ecsPatterns.NetworkLoadBalancedFargateService(
      this,
      "sftpService",
      {
        cluster:props.cluster,
        desiredCount: 2,
        cpu: 256,
        memoryLimitMiB: 512,
        taskImageOptions: {
          image: ecs.ContainerImage.fromDockerImageAsset(sftpDockerImage),
          enableLogging: true,
          containerPort: 22,
          taskRole: sftpTaskRole,
        },
        publicLoadBalancer: true,
        healthCheckGracePeriod: cdk.Duration.seconds(300),
        listenerPort: 22,
      }
    );

    // allow inbound & outbound traffic between the workflow service & file system
    sftpService.service.connections.allowFrom(
      fileSystem,
      ec2.Port.tcp(efs.FileSystem.DEFAULT_PORT)
    );
    sftpService.service.connections.allowTo(
      fileSystem,
      ec2.Port.tcp(efs.FileSystem.DEFAULT_PORT)
    );
    fileSystem.connections.allowDefaultPortFrom(sftpService.service);
    fileSystem.connections.allowDefaultPortTo(sftpService.service);

    // allow inbound traffic to the sftp service
    sftpService.service.connections.allowFromAnyIpv4(ec2.Port.tcp(22));
    // allow inbound traffic to the load balancer
    sftpService.loadBalancer.connections.allowFromAnyIpv4(ec2.Port.tcp(22));

    // add the EFS volume to the workflow service task definition
    sftpService.taskDefinition.addVolume({
      name: "efsVolume",
      efsVolumeConfiguration: {
        fileSystemId: fileSystem.fileSystemId,
        transitEncryption: "ENABLED",
        authorizationConfig: {
          accessPointId: accessPoint.accessPointId,
          iam: "ENABLED",
        },
      },
    });
    // add the mount point to the container definition
    sftpService.taskDefinition.defaultContainer!.addMountPoints({
      containerPath: "/home",
      sourceVolume: "efsVolume",
      readOnly: false,
    });

    // setup AutoScaling policy
    const sftpServiceScaling = sftpService.service.autoScaleTaskCount({
      maxCapacity: 2,
    });
    sftpServiceScaling.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 50,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
  }
}


