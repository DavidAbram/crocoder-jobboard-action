const core = require('@actions/core');
const { exec } = require('@actions/exec');

(async () => {
  try {
    await exec('ls');
    await exec('git', ['status']);
  } catch (error) {
    console.log(error.message);
    core.setFailed(error.message)
  }
})();