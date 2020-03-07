import * as core from '@actions/core';
import {context, GitHub} from '@actions/github';
import {Inputs} from './interfaces';
import {getInputs} from './get-inputs';
import fs from 'fs';
import yaml from 'js-yaml';

async function closeIssue(
  githubClient: GitHub,
  issueNumber: number
): Promise<void> {
  await githubClient.issues.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber, // eslint-disable-line @typescript-eslint/camelcase
    state: 'closed'
  });
  return;
}

async function openIssue(
  githubClient: GitHub,
  issueNumber: number
): Promise<void> {
  await githubClient.issues.update({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issueNumber, // eslint-disable-line @typescript-eslint/camelcase
    state: 'open'
  });
  return;
}

export async function run(): Promise<void> {
  try {
    const inps: Inputs = getInputs();

    console.log(context);

    const event = context.payload.action;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labelName = (context.payload as any).label.name;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const issueNumber = (context.payload as any).issue.number;
    core.info(`\
[INFO] config_file: ${inps.ConfigFilePath}
[INFO] labelName: ${labelName}
[INFO] event: ${event}
[INFO] issueNumber: ${issueNumber}\
`);

    const configFilePath = inps.ConfigFilePath;
    const config = yaml.safeLoad(fs.readFileSync(configFilePath, 'utf8'));
    console.log(config);
    let commentBody = '';
    let finalAction = '';
    if (config[`${event}`] === void 0) {
      core.info(`no configuration for ${event} ${labelName}`);
      return;
    }
    Object.keys(config[`${event}`]).forEach(label => {
      if (config[`${event}`][label].name === labelName) {
        commentBody = config[`${event}`][label].body;
        finalAction = config[`${event}`][label].action;
      }
    });
    core.info(`\
[INFO] commentBody: ${commentBody}
[INFO] finalAction: ${finalAction}\
`);

    const githubToken = inps.GithubToken;
    const githubClient = new GitHub(githubToken);
    await githubClient.issues.createComment({
      // eslint-disable-next-line @typescript-eslint/camelcase
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body: commentBody
    });

    if (finalAction === 'close') {
      await closeIssue(githubClient, issueNumber);
    } else if (finalAction === 'open') {
      await openIssue(githubClient, issueNumber);
    }

    return;
  } catch (error) {
    throw new Error(error.message);
  }
}
