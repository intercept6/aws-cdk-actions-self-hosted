import { AsgForGitHubActionsSelfHosted } from '../lib/asg-for-github-actions-self-hosted'
import { expect as expectCDK, haveResource } from '@aws-cdk/assert'
import { App } from '@aws-cdk/core'

describe('fine-grainded tests', () => {
  const app = new App()
  const stack = new AsgForGitHubActionsSelfHosted(app, 'MyTestStack', {
    owner: 'TestOwner',
    repo: 'TestRepo',
    runnerVersion: 'TestVersion',
    secretName: 'TestSecret',
  })
  test('🟢 stack has role for instance', () => {
    expectCDK(stack).to(
      haveResource('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: {
                Service: {
                  'Fn::Join': [
                    '',
                    [
                      'ec2.',
                      {
                        Ref: 'AWS::URLSuffix',
                      },
                    ],
                  ],
                },
              },
            },
          ],
          Version: '2012-10-17',
        },
        ManagedPolicyArns: [
          {
            'Fn::Join': [
              '',
              [
                'arn:',
                {
                  Ref: 'AWS::Partition',
                },
                ':iam::aws:policy/AdministratorAccess',
              ],
            ],
          },
        ],
      })
    )
  })

  test('🟢 stack has role for asg', () => {
    expectCDK(stack).to(
      haveResource('AWS::AutoScaling::AutoScalingGroup', {
        MaxSize: '1',
        MinSize: '1',
        LaunchConfigurationName: {
          Ref: 'LinuxAMDx64LaunchConfig499718F3',
        },
        Tags: [
          {
            Key: 'Name',
            PropagateAtLaunch: true,
            Value: 'MyTestStack/Linux-AMD-x64',
          },
        ],
        VPCZoneIdentifier: [
          {
            Ref: 'VpcpublicSubnet1Subnet2BB74ED7',
          },
          {
            Ref: 'VpcpublicSubnet2SubnetE34B022A',
          },
        ],
      })
    )
  })
})
