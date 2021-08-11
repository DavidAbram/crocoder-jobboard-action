const fetch = require("node-fetch");
const fs = require("fs");
const { exec } = require('@actions/exec');
const { Octokit } = require("@octokit/rest");
const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet(
  "ModuleSymbhasOwnPrABCDEFGHNRVfgctiUvzKqYTJkLxpZXIjQW",
  5
);
const { wait, createAsigneeList } = require('./utils');

const archiveJobs = async (data, octokit, owner, repo, workingDirectory, pathToContentFolder, archiveBranchPrefix, archiveCommitMessage, asigneeUsernames, startingBranch) => {
  const markdownsToArchive = data.map((t) => {
    const strings = t.jobPostMarkdown.split("/");
    return {
      fileName: `${workingDirectory}/${pathToContentFolder}/${strings[strings.length - 1]}`,
      url: t.url,
    };
  });

  const asignees = createAsigneeList(asigneeUsernames.split(','), 1);

  const branch = `${archiveBranchPrefix}/${new Date().toISOString().split('T')[0]}-${nanoid()}`;
  const fullCommitMessage = `${archiveCommitMessage}`;

  await exec('git', ['-C', workingDirectory, 'branch', branch]);
  await wait(200);
  await exec('git', ['-C', workingDirectory, 'checkout', branch]);
  await wait(200);

  const archivedMarkdownUrls = [];
  markdownsToArchive.forEach(({ fileName, url }) => {
    try {
      const content = fs.readFileSync(fileName, "utf8");
      const match = content.match(/archived: "true"/g);
      if (!match) {
        const [, firstPart, secondPart] = content.match(/(---.*)(---.*)/s);
        fs.writeFileSync(
          fileName,
          `${firstPart}archived: "true"\n${secondPart}`,
          { encoding: "utf8", flag: "w" }
        );
        archivedMarkdownUrls.push(url);
      }
    } catch (err) { }
  });

  await wait(200);
  await exec('git', ['-C', workingDirectory, 'add', '-A']);
  await wait(200);
  await exec('git', ['-C', workingDirectory, 'commit', '--no-verify', '-m', fullCommitMessage]);
  await wait(200);
  await exec('git', ['-C', workingDirectory, 'push', '--set-upstream', 'origin', branch]);
  await wait(200);


  const prResponse = await octokit.pulls.create({
    owner,
    repo,
    title: `${archiveCommitMessage} ${new Date().toLocaleDateString()}`,
    head: branch,
    base: startingBranch,
    body: `
# ${archiveCommitMessage} ${new Date().toLocaleDateString()}
    
Dear CroCoder devs please merge this to archive jobs.
    `,
    draft: true,
    maintainer_can_modify: true,
  });
  await wait(200);

  const { number } = prResponse.data;

  await octokit.pulls.requestReviewers({
    owner,
    repo,
    pull_number: number,
    reviewers: [asignees[0]]
  });
  await wait(200);
}


const archiveAllJobs = async (owner, repo, jobBoardApiUrl, jobBoardApiToken, workingDirectory, pathToContentFolder, archiveBranchPrefix, archiveCommitMessage, asigneeUsernames, startingBranch, githubToken) => {

  const octokit = new Octokit({
    auth: githubToken,
  });

  await fetch(`${jobBoardApiUrl}/archive`, {
    method: "POST",
    headers: { Authorization: jobBoardApiToken },
  });

  let url = `${jobBoardApiUrl}/archive`;
  let options = {
    method: "GET",
    headers: { Authorization: jobBoardApiToken },
  };
  const response = await fetch(url, options);
  const data = await response.json();
  await archiveJobs(data, octokit, owner, repo, workingDirectory, pathToContentFolder, archiveBranchPrefix, archiveCommitMessage, asigneeUsernames, startingBranch);
}



module.exports = {
  archiveAllJobs,
  archiveJobs,
};