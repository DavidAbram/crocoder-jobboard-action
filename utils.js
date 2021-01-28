const shuffleArray = (array) => {
  const arrayCopy = array.slice(0);
  return arrayCopy.sort(() => Math.random() - 0.5);
}

const createAsigneeList = (usernames, prCount) => {
  const jobsPerUsername = split(prCount, usernames.length);
  console.log(jobsPerUsername);
  return shuffleArray(shuffleArray(usernames).flatMap((username, i) => Array(jobsPerUsername[i]).fill(username)));
}

const split = (number, parts) => {
  if(number % parts === 0) {
    return Array(parts).fill(number / parts);
  } else {
    const a =  number % parts;
    const b = (number - (number % parts)) / parts;
    return [...Array(a).fill(b+1), ...Array(parts-a).fill(b)];
  }
}

const wait = (ms) => {
  return new Promise((resolve) => {
      setTimeout(resolve, ms)
  })
}

module.exports = {
  shuffleArray,
  createAsigneeList,
  wait,
}