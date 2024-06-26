import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

interface VpcLookupStackProps extends cdk.StackProps {
  vpcId: string;
}

export class VpcLookupStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;

  constructor(scope: Construct, id: string, props: VpcLookupStackProps) {
    super(scope, id, props);

    // Lookup the existing VPC
    this.vpc = ec2.Vpc.fromLookup(this, 'ExistingVpc', {
      vpcId: props.vpcId,
    });
  }
}
