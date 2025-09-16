// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
const { chromium } = require("playwright");

async function sortHackerNewsArticles() {
  // launch browser
  const browser = await chromium.launch({headless: false});
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // go to Hacker News
    await page.goto("https://news.ycombinator.com/newest");
    console.log("Hacker News page loaded");

    const articles = [];
    let currentPage = 1;

    while (articles.length < 100) {
      console.log(`Loading page ${currentPage}`);

      await page.waitForSelector(".athing", {timeout: 10000});

      const pageArticles = await page.evaluate(() => {
        const articleElements = document.querySelectorAll(".athing");
        const articleData = [];

        articleElements.forEach((article, index) => {
          const titleElement = article.querySelector('.titleline > a');
          const scoreElement = article.nextElementSibling?.querySelector('.score');
          const ageElement = article.nextElementSibling?.querySelector('.age');

          if (titleElement && ageElement) {
            const title = titleElement.textContent.trim();
            const ageText = ageElement.getAttribute('title') || ageElement.textContent;
            const score = scoreElement ? scoreElement.textContent : 'No Score';

            articleData.push({
              title,
              age: ageText,
              score,
              timeStamp: new Date(ageText).getTime() || 0
            });
          }
        });

        return articleData;
      });

      // Add articles to the collection
      const articlesToAdd = pageArticles.slice(0, 100 - articles.length);
      articles.push(...articlesToAdd);

      console.log(`Collected ${articlesToAdd.length} articles`);

      //If more is needed, go to the next page
      if (articles.length < 100) {
        const moreLink = await page.locator('.morelink').first();
        if (await moreLink.count() > 0) {
          await moreLink.click();
          await page.waitForLoadState('networkidle');
          currentPage++;
        } else {
          console.log("No more articles to load");
          break;
        }
      }
    }
    console.log(`\nCollected ${articles.length} articles`);
    console.log('\nValidating article sorting...');

    let isSorted = true;
    const sortingErrors = [];

    for (let i = 0; i < articles.length - 1; i++) {
      const currentArticle = articles[i];
      const nextArticle = articles[i + 1];

      //Compare timestamps - current should be >= next (newer or same age)
      if (currentArticle.timeStamp < nextArticle.timeStamp) {
        isSorted = false;
        sortingErrors.push({
          position: i + 1,
          current: {
            title: currentArticle.title.substring(0, 50) + '...',
            age: currentArticle.age,
          },
          next: {
            title: nextArticle.title.substring(0, 50) + '...',
            age: nextArticle.age,
          }
        });
      }
    }
    //Report results
    console.log("\n" + "=".repeat(80));
    console.log("Validation Results");
    console.log("=".repeat(80));
    console.log(`\n${isSorted ? "Articles are sorted correctly" : "Articles are not sorted correctly"}`);
    console.log(`\n${sortingErrors.length} sorting errors found`);

    if (!isSorted) {
      sortingErrors.forEach((error, index) => {
        console.log(`\n${index + 1}. Position ${error.position}:`);
        console.log(`\tCurrent article: ${error.current.title} (${error.current.age})`);
        console.log(`\tNext article: ${error.next.title} (${error.next.age})`);
      });
    }


    // Display first few and last few articles to verify
    console.log("\n First 5 articles:");
    articles.slice(0, 5).forEach((article, index) => {
      console.log(`${index + 1}. ${article.title.substring(0,60)}... (${article.age})`);
    });

    console.log("\n Last 5 articles:");
    articles.slice(-5).forEach((article, index) => {
      console.log(`${index + 1}. ${article.title.substring(0,60)}... (${article.age})`);
    });

    return isSorted

  } catch (error) {
    console.error("Error during execution:", error.message);
    throw error
  } finally {
    await browser.close();
    console.log("Browser closed");
  }
}


(async () => {
  try {
    const result = await sortHackerNewsArticles();
    process.exit(result ? 0 : 1);
  } catch (error) {
    console.error("Error during execution:", error.message);
    process.exit(1);
  }
})();
