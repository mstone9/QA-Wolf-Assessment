// EDIT THIS FILE TO COMPLETE ASSIGNMENT QUESTION 1
// Import the Chromium browser from the Playwright library.
// This is the core component for automating web browser interactions.
const { chromium } = require("playwright");

// Define the main asynchronous function to perform the task.
// Using 'async' allows us to use 'await' for browser operations.
async function sortHackerNewsArticles() {
  // Launch a new Chromium browser instance.
  // 'headless: false' makes the browser visible, which is great for debugging.
  // For production or automated environments, it should be 'true'.
  const browser = await chromium.launch({headless: false});
  // Create a new browser context. This is like a fresh, isolated browser session.
  const context = await browser.newContext();
  // Create a new page (tab) within the context.
  const page = await context.newPage();

  try {
    // Navigate to the "newest" articles page on Hacker News.
    await page.goto("https://news.ycombinator.com/newest");
    console.log("Hacker News page loaded");

    // Initialize an array to store the collected articles.
    const articles = [];
    // Keep track of the current page number for logging.
    let currentPage = 1;

    // A loop to continue scraping until 100 articles are collected.
    while (articles.length < 100) {
      console.log(`Loading page ${currentPage}`);

      // Wait for a key selector to ensure the page content has loaded.
      // '.athing' is the CSS class for each article's main container.
      await page.waitForSelector(".athing", {timeout: 10000});

      // Use `page.evaluate` to run a function directly in the browser's context.
      // This is where we extract the data from the HTML elements.
      const pageArticles = await page.evaluate(() => {
        // Select all elements with the class '.athing'.
        const articleElements = document.querySelectorAll(".athing");
        const articleData = [];

        // Iterate through each article element to pull out the required data.
        articleElements.forEach((article,) => {
          // Find the title element using its unique selector.
          const titleElement = article.querySelector('.titleline > a');
          // Find the score element, handling cases where it might not exist.
          const scoreElement = article.nextElementSibling?.querySelector('.score');
          // Find the age element, which contains the timestamp info.
          const ageElement = article.nextElementSibling?.querySelector('.age');

          // Ensure both the title and age elements exist before proceeding.
          if (titleElement && ageElement) {
            const title = titleElement.textContent.trim();
            // Get the precise timestamp from the 'title' attribute of the age element.
            const ageText = ageElement.getAttribute('title') || ageElement.textContent;
            const score = scoreElement ? scoreElement.textContent : 'No Score';

            // Push the extracted data into the `articleData` array.
            articleData.push({
              title,
              age: ageText,
              score,
              // Convert the age text into a numeric timestamp for easy sorting comparison.
              timeStamp: new Date(ageText).getTime() || 0
            });
          }
        });

        return articleData;
      });

      // Take the newly scraped articles and add them to our main collection.
      const articlesToAdd = pageArticles.slice(0, 100 - articles.length);
      articles.push(...articlesToAdd);

      console.log(`Collected ${articlesToAdd.length} articles`);

      // Check if we still need more articles and if a "More" link exists.
      if (articles.length < 100) {
        // Locate the "more" link element.
        const moreLink = await page.locator('.morelink').first();
        // If the link exists, click it and wait for the page to load new content.
        if (await moreLink.count() > 0) {
          await moreLink.click();
          // `networkidle` waits until there are no new network connections for 500ms.
          await page.waitForLoadState('networkidle');
          currentPage++;
        } else {
          // If no "more" link is found, we've reached the end of the articles.
          console.log("No more articles to load");
          break;
        }
      }
    }
    console.log(`\nCollected ${articles.length} articles`);
    console.log('\nValidating article sorting...');

    let isSorted = true;
    const sortingErrors = [];

    // Loop through the collected articles to check for correct sorting.
    for (let i = 0; i < articles.length - 1; i++) {
      const currentArticle = articles[i];
      const nextArticle = articles[i + 1];

      // Compare the timestamps. For "newest" articles, the current article's timestamp
      // should be greater than or equal to the next one's (meaning it's newer or the same age).
      if (currentArticle.timeStamp < nextArticle.timeStamp) {
        isSorted = false; // Flag that the sort order is incorrect.
        // Record the details of the sorting error for the report.
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
    // Report the final results of the validation.
    console.log("\n" + "=".repeat(80));
    console.log("Validation Results");
    console.log("=".repeat(80));
    console.log(`\n${isSorted ? "Articles are sorted correctly" : "Articles are not sorted correctly"}`);
    console.log(`\n${sortingErrors.length} sorting errors found`);

    // If sorting errors were found, display the details of each one.
    if (!isSorted) {
      sortingErrors.forEach((error, index) => {
        console.log(`\n${index + 1}. Position ${error.position}:`);
        console.log(`\tCurrent article: ${error.current.title} (${error.current.age})`);
        console.log(`\tNext article: ${error.next.title} (${error.next.age})`);
      });
    }


    // Display a sample of the articles for visual verification.
    console.log("\n First 5 articles:");
    articles.slice(0, 5).forEach((article, index) => {
      console.log(`${index + 1}. ${article.title.substring(0,60)}... (${article.age})`);
    });

    console.log("\n Last 5 articles:");
    articles.slice(-5).forEach((article, index) => {
      console.log(`${index + 1}. ${article.title.substring(0,60)}... (${article.age})`);
    });

    // Return the boolean result of the validation.
    return isSorted

  } catch (error) {
    console.error("Error during execution:", error.message);
    throw error // Re-throw the error to be caught by the outer block.
  } finally {
    // Ensure the browser is always closed, whether the test passes or fails.
    await browser.close();
    console.log("Browser closed");
  }
}


// Immediately-invoked function expression (IIFE) to run the main function.
// This structure is common for running async code from the top-level of a script.
(async () => {
  try {
    const result = await sortHackerNewsArticles();
    // Exit the process with status code 0 for success, 1 for failure.
    // This is useful for automated systems or CI/CD pipelines.
    process.exit(result ? 0 : 1);
  } catch (error) {
    console.error("Error during execution:", error.message);
    process.exit(1); // Exit with a failure code if an uncaught error occurs.
  }
})();