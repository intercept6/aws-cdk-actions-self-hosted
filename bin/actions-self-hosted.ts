#!/usr/bin/env node
import { AsgForGitHubActionsSelfHosted } from '../lib/asg-fot-github-actions-self-hosted'
import { App } from '@aws-cdk/core'
import 'source-map-support/register'

const app = new App()
new AsgForGitHubActionsSelfHosted(app, 'SelfHostedMachines')
