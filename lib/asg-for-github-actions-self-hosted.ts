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
  instances?: number
  userData: UserData
}

export class AsgForGitHubActionsSelfHosted extends Stack {
  public readonly vpc: Vpc
  public readonly autoScalingGroup: AutoScalingGroup

  constructor(
    scope: Construct,
    id: string,
    props: AsgForGitHubActionsSelfHostedProps
  ) {
    super(scope, id, props)

    this.vpc = new Vpc(this, 'Vpc', {
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

    const capacity = props.instances ?? 1
    this.autoScalingGroup = new AutoScalingGroup(
      this,
      'GitHubActionsSelfHostedRunnerASG',
      {
        vpc: this.vpc,
        instanceType: InstanceType.of(
          InstanceClass.BURSTABLE3_AMD,
          InstanceSize.MICRO
        ),
        machineImage: new AmazonLinuxImage({
          generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        }),
        spotPrice: '0.013',
        role,
        userData: props.userData,
        minCapacity: capacity,
        maxCapacity: capacity,
      }
    )
  }
}
