# AWS CDK Stack for Deploying OneUptime on AWS

## Prerequisites

Before you begin, ensure you have met the following requirements:
- You have installed Node.js (version 18.0.0 or later).
- You have installed AWS CLI.
- You have installed AWS CDK (version 2.0.0 or later).

## Getting Started

Follow these instructions to set up and deploy the CDK stack.

### Step 1: Clone the Repository

Clone this repository to your local machine:

```bash
git clone https://github.com/your-username/your-repository.git
cd ec2-instance
```
## Step 2: Install Dependencies
Install the required dependencies using npm:

```sh
npm install
```
## Step 3: Configure AWS CLI

Ensure your AWS CLI is configured with the necessary permissions:

```sh
aws configure
```

## Step 4: Bootstrap the CDK Environment

Bootstrap your CDK environment if you haven't done so already:

```bash
cdk bootstrap
```
## Step 5: Deploy the SMTP Stack
To create an SMTP user for OneUptime and securely store the credentials in the Secret Manager.

```bash
cdk deploy  SmtpStack
```

## Step 6: Deploy the Oneuptime and VPC lookup Stack
For creating an EC2 machine, deploy the OneUptime deployment script inside the user data. Ensure that the deployment occurs within the same VPC is used for production

```bash
cdk deploy VpcLookupStack OneUptimeEc2InstanceStack
```

- This will create an EC2 instance with OneUptime installed and accessible at the following URL "https://health.synthetic.techbd.org/
"


