import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { SesSmtpCredentials } from "@pepperize/cdk-ses-smtp-credentials";

export class SmtpUserStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const domainName = 'techbd.org'; // Replace with your domain name

    // Lookup the hosted zone in Route 53
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });

    // Create an SES domain identity
    const domainIdentity = new ses.EmailIdentity(this, 'DomainIdentity', {
      identity: ses.Identity.domain(domainName),
    });

   

    // Add DKIM verification records to Route 53
    domainIdentity.dkimRecords.forEach((dkimRecord, index) => {
      new route53.CnameRecord(this, `DkimVerificationRecord${index}`, {
        zone: hostedZone,
        recordName: dkimRecord.name,
        domainName: dkimRecord.value,
        
      });
      
    });

// Create an IAM user for SES SMTP
const smtpUser = new iam.User(this, 'SmtpUser', {
  userName: 'ses-smtp-user',
});

// Create SMTP credentials for the user
const smtpCredentials = new SesSmtpCredentials(this, 'SmtpCredentials', {
  user: smtpUser,
});

// Store the SMTP credentials securely in Secrets Manager
new secretsmanager.Secret(this, 'SmtpCredentialsSecret', {
  secretName: 'SmtpCredentials',
  secretStringValue: smtpCredentials.secret.secretValue,
});
}
}

  