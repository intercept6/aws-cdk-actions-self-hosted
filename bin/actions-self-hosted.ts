#!/usr/bin/env node
import { AsgForGitHubActionsSelfHosted } from '../lib/asg-for-github-actions-self-hosted'
import { App } from '@aws-cdk/core'
import 'source-map-support/register'

const getEnvironmentVariable = (key: string) => {
  const value = process.env[key]
  if (value == null) {
    throw new Error(`Environment Variable ${key} is undefined.`)
  }
  return value
}

const app = new App()
new AsgForGitHubActionsSelfHosted(app, 'SelfHostedMachines', {
  runnerVersion: getEnvironmentVariable('RUNNER_VERSION'),
  secretName: getEnvironmentVariable('SECRET_NAME'),
  owner: getEnvironmentVariable('GITHUB_OWNER'),
  repo: getEnvironmentVariable('GITHUB_REPO'),
})
