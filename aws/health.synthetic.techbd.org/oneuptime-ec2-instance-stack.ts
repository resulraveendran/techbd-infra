import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53_targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as fs from 'fs';
import * as path from 'path';

interface OneUptimeEc2InstanceStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
}

export class OneUptimeEc2InstanceStack extends cdk.Stack {
  public readonly instance: ec2.Instance;

  constructor(scope: Construct, id: string, props: OneUptimeEc2InstanceStackProps) {
    super(scope, id, props);

    const { vpc } = props;

    // Find the first public subnet
    const publicSubnet = vpc.publicSubnets[0];

    // Create a security group
    const securityGroup = new ec2.SecurityGroup(this, 'OneUptimeSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      securityGroupName: 'OneUptimeSecurityGroup',
    });

    // Allow SSH access from anywhere
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'Allow SSH access from anywhere');

    // Allow HTTP access from the ALB to port 86
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(86), 'Allow HTTP access from ALB');

    // Lookup the latest Ubuntu 22.04 AMI
    const ami = ec2.MachineImage.lookup({
      name: 'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
      owners: ['099720109477'], // Canonical
    });

    // Read and base64-encode the config.env file
    const configEnvPath = path.join(__dirname, 'config.env');
    const configEnvBase64 = fs.readFileSync(configEnvPath).toString('base64');

    // User data script to install OneUptime
    const userDataScript = ec2.UserData.forLinux();
    userDataScript.addCommands(
      'exec > /var/log/user-data.log 2>&1',
      'set -x',
      'sudo apt-get update -y',
      'sudo apt-get upgrade -y',
      'sudo apt-get install -y git docker.io docker-compose',
      'sudo systemctl start docker',
      'sudo systemctl enable docker',
      'cd /home/ubuntu',
      'git clone https://github.com/OneUptime/oneuptime.git',
      'cd oneuptime',
      'git checkout release',
      `echo ${configEnvBase64} | base64 -d > config.env`,
      `bash -c "(export $(grep -v '^#' config.env | xargs) && docker-compose up --remove-orphans -d)"`
    );

    // Create the EC2 instance
    this.instance = new ec2.Instance(this, 'OneUptimeInstance', {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE2),
      machineImage: ami,
      securityGroup,
      vpcSubnets: {
        subnets: [publicSubnet],
      },
      keyName: 'ec2-instance-keypair', // Replace with your key pair name
      blockDevices: [
        {
          deviceName: '/dev/sda1',
          volume: ec2.BlockDeviceVolume.ebs(400, {
            encrypted: true,
            deleteOnTermination: true,
          }),
        },
      ],
      userData: userDataScript,
    });

    // Configure Route 53 to point to the ALB
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: 'techbd.org', // Replace with your domain name
    });

    // Request an ACM certificate
    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName: 'health.synthetic.techbd.org',
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Create an Application Load Balancer (ALB)
    const alb = new elbv2.ApplicationLoadBalancer(this, 'OneUptimeALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'OneUptimeALB',
      securityGroup,
    });

    // Add a listener to the ALB for HTTPS
    const listener = alb.addListener('Listener', {
      port: 443,
      open: true,
      certificates: [certificate],
    });

    // Create a target group for the listener
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'OneUptimeTargetGroup', {
      vpc,
      port: 86,
      protocol: elbv2.ApplicationProtocol.HTTP,
      healthCheck: {
        path: '/',
        port: '86',
      },
      targets: [new targets.InstanceIdTarget(this.instance.instanceId, 86)],
    });

    // Attach the target group to the listener
    listener.addTargetGroups('TargetGroup', {
      targetGroups: [targetGroup],
    });

    // Create an HTTP listener to redirect HTTP to HTTPS
    alb.addListener('HTTPListener', {
      port: 80,
      open: true,
      defaultAction: elbv2.ListenerAction.redirect({
        protocol: 'HTTPS',
        port: '443',
      }),
    });

    new route53.ARecord(this, 'OneUptimeAliasRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new route53_targets.LoadBalancerTarget(alb)),
      recordName: 'health.synthetic', // This will create health.synthetic.techbd.org
    });

    // Store the instance ID in SSM Parameter Store
    new ssm.StringParameter(this, 'InstanceIdParameter', {
      parameterName: '/oneuptime/instanceId',
      stringValue: this.instance.instanceId,
    });
  }
}
