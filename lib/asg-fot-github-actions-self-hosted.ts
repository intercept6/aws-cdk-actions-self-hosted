import { AutoScalingGroup } from '@aws-cdk/aws-autoscaling'
import {
  Vpc,
  InstanceType,
  SubnetType,
  InstanceClass,
  InstanceSize,
  AmazonLinuxImage,
  UserData,
  AmazonLinuxGeneration,
} from '@aws-cdk/aws-ec2'
import { ManagedPolicy, Role, ServicePrincipal } from '@aws-cdk/aws-iam'
import { Stack, Construct, StackProps } from '@aws-cdk/core'

export class AsgForGitHubActionsSelfHosted extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props)

    const vpc = new Vpc(this, 'Vpc', {
      maxAzs: 3,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: SubnetType.PUBLIC,
        },
      ],
    })

    const role = new Role(this, 'InstanceRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'),
      ],
    })

    const region = this.region
    const runnerVersion = '2.273.6'
    const url = 'https://github.com/intercept6/bottom-up-ddd-ts-sample'
    const labels = ['linux', 'x64', 'aws', 'amazonlinux2']

    const userData = UserData.forLinux({ shebang: '#!/bin/bash -xe' })
    userData.addCommands(
      `exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1`,
      `export REGION=${region}`,
      `export RUNNER_VERSION=${runnerVersion}`,
      `export SECRET_NAME=dev/github-action/self-hosted-token`,
      `export RUNNER_TOKEN=$(aws --region $REGION secretsmanager get-secret-value --secret-id $SECRET_NAME --query SecretString --output text)`,
      `su ec2-user -c 'mkdir $HOME/actions-runner'`,
      `su ec2-user -c 'curl -L https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-linux-x64-$RUNNER_VERSION.tar.gz -o $HOME/actions-runner/actions-runner-linux-x64-$RUNNER_VERSION.tar.gz'`,
      `su ec2-user -c 'tar xzf $HOME/actions-runner/actions-runner-linux-x64-$RUNNER_VERSION.tar.gz -C $HOME/actions-runner'`,
      `su ec2-user -c '$HOME/actions-runner/config.sh --unattended --url ${url} --token $RUNNER_TOKEN --labels ${labels.join(
        ','
      )}'`,
      `su ec2-user -c '$HOME/actions-runner/run.sh &'`
    )

    new AutoScalingGroup(this, 'Linux-x64', {
      vpc,
      instanceType: InstanceType.of(
        InstanceClass.BURSTABLE3,
        InstanceSize.MICRO
      ),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      spotPrice: '0.014',
      role,
      userData,
      minCapacity: 3,
      maxCapacity: 3,
    })
  }
}
