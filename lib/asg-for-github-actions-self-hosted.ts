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

interface AsgForGitHubActionsSelfHostedProps extends StackProps {
  runnerVersion: string
  secretName: string
  owner: string
  repo: string
  instances?: number
}

export class AsgForGitHubActionsSelfHosted extends Stack {
  constructor(
    scope: Construct,
    id: string,
    props: AsgForGitHubActionsSelfHostedProps
  ) {
    super(scope, id, props)

    const region = this.region
    const { runnerVersion, secretName, owner, repo, instances } = props
    const labels = ['linux', 'x64', 'aws', 'amd', 'amazonlinux2']
    const url = `https://github.com/${owner}/${repo}`

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

    const userData = this.getLinuxUserData(
      region,
      runnerVersion,
      secretName,
      owner,
      repo,
      url,
      labels
    )

    new AutoScalingGroup(this, 'Linux-AMD-x64', {
      vpc,
      instanceType: InstanceType.of(
        InstanceClass.BURSTABLE3_AMD,
        InstanceSize.MICRO
      ),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      spotPrice: '0.013',
      role,
      userData,
      minCapacity: instances ?? 1,
      maxCapacity: instances ?? 1,
    })
  }

  private getLinuxUserData(
    region: string,
    runnerVersion: string,
    secretName: string,
    owner: string,
    repo: string,
    url: string,
    labels: string[]
  ) {
    const userData = UserData.forLinux({ shebang: '#!/bin/bash -xe' })
    userData.addCommands(
      `exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1`,
      `yum -y install jq`,
      `export REGION=${region}`,
      `export RUNNER_VERSION=${runnerVersion}`,
      `export SECRET_NAME=${secretName}`,
      `export ACCESS_TOKEN=$(aws --region $REGION secretsmanager get-secret-value --secret-id $SECRET_NAME --query SecretString --output text)`,
      `export RUNNER_TOKEN=$(curl -XPOST -fsSL -H "Accept: application/vnd.github.v3+json" -H "Authorization: token $ACCESS_TOKEN" https://api.github.com/repos/${owner}/${repo}/actions/runners/registration-token | jq -r .token)`,
      `su ec2-user -c 'mkdir $HOME/actions-runner'`,
      `su ec2-user -c 'curl -L https://github.com/actions/runner/releases/download/v$RUNNER_VERSION/actions-runner-linux-x64-$RUNNER_VERSION.tar.gz -o $HOME/actions-runner/actions-runner-linux-x64-$RUNNER_VERSION.tar.gz'`,
      `su ec2-user -c 'tar xzf $HOME/actions-runner/actions-runner-linux-x64-$RUNNER_VERSION.tar.gz -C $HOME/actions-runner'`,
      `su ec2-user -c '$HOME/actions-runner/config.sh --unattended --url ${url} --token $RUNNER_TOKEN --labels ${labels.join(
        ','
      )}'`,
      `su ec2-user -c '$HOME/actions-runner/run.sh &'`
    )
    return userData
  }
}
