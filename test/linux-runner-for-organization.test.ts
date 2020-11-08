import { AsgForGitHubActionsSelfHosted } from '../lib/asg-for-github-actions-self-hosted'
import { getLinuxOrganizationUserData } from '../lib/get-userdata/linux-organization'
import { expect as expectCDK, haveResource } from '@aws-cdk/assert'
import { App } from '@aws-cdk/core'

describe('linux runner for organization', () => {
  const app = new App()
  const userData = getLinuxOrganizationUserData({
    region: 'ap-northeast-1',
    runnerVersion: 'TestVersion',
    secretName: 'TestSecret',
    org: 'TestOrg',
  })
  const stack = new AsgForGitHubActionsSelfHosted(
    app,
    'TestLinuxRunnerForOrganization',
    {
      userData,
    }
  )
  test('🟢[Fine-grained test] stack has role for instance', () => {
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

  test('🟢[Fine-grained test] stack has role for asg', () => {
    expectCDK(stack).to(
      haveResource('AWS::AutoScaling::AutoScalingGroup', {
        MaxSize: '1',
        MinSize: '1',
        Tags: [
          {
            Key: 'Name',
            PropagateAtLaunch: true,
            Value: 'MyTestStack/GitHubActionsSelfHostedRunnerASG',
          },
        ],
      })
    )
  })

  test('🟢[Snapshot test] snapshot is match', () => {
    expect(stack).toMatchSnapshot()
  })
})
