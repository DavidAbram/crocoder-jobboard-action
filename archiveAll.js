const fetch = require("node-fetch");
const fs = require("fs");

module.exports = async (jobBoardApiUrl, jobBoardApiToken, workingDirectory, pathToContentFolder) => {


  let url = `${jobBoardApiUrl}/archive`;
    let options = {
      method: "GET",
      headers: { Authorization: jobBoardApiToken },
    };
    const response = await fetch(url, options);
    const data = await response.json();
    const markdownsToArchive = data.map((t) => {
      const strings = t.jobPostMarkdown.split("/");
      return {
        fileName: `${workingDirectory}/${pathToContentFolder}/${strings[strings.length - 1]}`,
        url: t.url,
      };
    });

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
      } catch (err) {}
    });

    console.log(archivedMarkdownUrls);
}