import { UserData } from '@aws-cdk/aws-ec2'

export const getLinuxRepositoryUserData = ({
  region,
  owner,
  repo,
  runnerVersion,
  secretName,
}: {
  region: string
  runnerVersion: string
  secretName: string
  owner: string
  repo: string
}): UserData => {
  const url = `https://github.com/${owner}/${repo}`
  const labels = ['linux', 'x64', 'aws', 'amd', 'amazonlinux2']
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
