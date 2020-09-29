const core = require('@actions/core');
const { exec } = require('@actions/exec');

(async () => {
  try {
    const workingDirectory = core.getInput('working-directory');
    await exec('ls');
    await exec('git', [ '-C', workingDirectory, 'status']);
    await exec('ls', ['-a']);
  } catch (error) {
    console.log(error.message);
    core.setFailed(error.message)
  }
})();