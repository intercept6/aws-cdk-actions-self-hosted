#!/usr/bin/env node
import { AsgForGitHubActionsSelfHosted } from '../lib/asg-for-github-actions-self-hosted'
import { getLinuxRepositoryUserData } from '../lib/get-userdata/linux-repository'
import { App } from '@aws-cdk/core'
import 'source-map-support/register'

const getEnvironmentVariable = (key: string) => {
  const value = process.env[key]
  if (value == null) {
    throw new Error(`Environment Variable ${key} is undefined.`)
  }
  return value
}

const getRegion = (app: App) => {
  const region = app.region
  if (region == null || region === '') {
    throw new Error(`Environment Variable region is undefined.`)
  }
  return region
}

const app = new App()
const region = getRegion(app)

const userData = getLinuxRepositoryUserData({
  region,
  runnerVersion: getEnvironmentVariable('RUNNER_VERSION'),
  secretName: getEnvironmentVariable('SECRET_NAME'),
  owner: getEnvironmentVariable('GITHUB_OWNER'),
  repo: getEnvironmentVariable('GITHUB_REPO'),
})

new AsgForGitHubActionsSelfHosted(app, 'SelfHostedMachines', {
  userData,
})
