# OneUptime and SES Deployment Pipeline

This repository contains the pipeline for deploying OneUptime and SES in AWS.

## Prerequisites

Before running this pipeline, ensure you have set the following variables and secrets in the GitHub repository settings.

### Variables

- **ONEUPTIME_HOST**: The host for OneUptime.
- **VPC_ID**: The Production vpc id

### Secrets

- **ONEUPTIME_SECRET**: The secret key for OneUptime.
- **DATABASE_PASSWORD**: The password for the database.
- **REDIS_PASSWORD**: The password for Redis.
- **ENCRYPTION_SECRET**: The secret key for encryption.
- **GLOBAL_PROBE_1_KEY**: The key for global probe 1.
- **GLOBAL_PROBE_2_KEY**: The key for global probe 2.

## Deployment

When the deployment is completed, the following resources will be created:

- **EC2 Instance**: An EC2 instance where OneUptime is deployed.
- **SES Identity and SMTP User**: An SES identity and SMTP user for sending emails.

## Pipeline Steps

1. **Setup Environment**: Configures the environment variables and secrets required for the deployment.
2. **Deploy OneUptime**: Deploys the OneUptime application on an EC2 instance.
3. **Configure SES**: Sets up SES identity and SMTP user for email notifications.

## Usage

To run the pipeline, Manually trigger it from the GitHub Actions. Ensure all variables and secrets are correctly set before triggering the pipeline.

## Troubleshooting

If you encounter any issues during deployment, check the following:

- Ensure all required variables and secrets are set in the GitHub repository settings.
- Check the GitHub Actions logs for any error messages.
- Verify the AWS IAM roles and permissions are correctly configured for deploying EC2 instances and SES.

