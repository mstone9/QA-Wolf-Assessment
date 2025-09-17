// Import necessary modules
const express = require('express'); // Web framework for creating the server
const { chromium } = require('playwright'); // Playwright for browser automation (scraping)
const path = require('path'); // Node.js utility for handling and transforming file paths
const WebSocket = require('ws'); // WebSocket library for real-time, two-way communication

// Initialize the Express application and define the port
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
// This allows the browser to access HTML, CSS, and JavaScript files
app.use(express.static(path.join(__dirname, 'public')));

// Create an HTTP server using the Express app
// This is necessary to attach the WebSocket server to the same port
const server = require('http').createServer(app);

// Create a WebSocket server attached to the HTTP server
const wss = new WebSocket.Server({ server });

// Use a Set to store all connected WebSocket clients
// A Set is used here for its efficiency in adding and deleting unique items
const clients = new Set();

// Event listener for a new WebSocket connection
wss.on('connection', (ws) => {
    // Add the new client to the set of connected clients
    clients.add(ws);
    console.log('Client connected');

    // Event listener for when a client closes the connection
    ws.on('close', () => {
        // Remove the client from the set
        clients.delete(ws);
        console.log('Client disconnected');
    });

    // Event listener for any WebSocket errors
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

// Function to broadcast a message to all connected clients
// It checks if each client is ready before sending the data
function broadcast(data) {
    console.log('Broadcasting:', data.type, data.message || ''); // Debug log
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

// Route to serve the main HTML file
// When a user visits the root URL ('/'), they get the index.html page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to start the Hacker News validation test
app.post('/start-test', async (req, res) => {
    // Immediately respond to the client to let them know the test has started
    res.json({message: 'Test started'});

    try {
        // Call the main function that handles the scraping and validation logic
        await runHackerNewsValidation();
    } catch (error) {
        // If an error occurs, log it and broadcast an error message to the client
        console.error('Error in validation:', error);
        broadcast({type: 'error', message: error.message});
    }
});

// Main function to scrape and validate Hacker News articles
async function runHackerNewsValidation() {
    // Send a real-time status update to the client
    broadcast({type: 'status', message: 'Starting Hacker News validation...', progress: 0});

    // Launch a new Chromium browser instance
    // `headless: true` means the browser runs in the background without a visible window
    const browser = await chromium.launch({headless: true});
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        // Navigate to the "newest" articles page on Hacker News
        await page.goto('https://news.ycombinator.com/newest');
        broadcast({type: 'status', message: 'Hacker News page loaded', progress: 5});

        const articles = [];
        let currentPage = 1;

        // Loop until 100 articles have been collected
        while (articles.length < 100) {
            // Update the client with progress and current page
            broadcast({
                type: 'status',
                message: `Loading page ${currentPage}...`,
                // Calculate progress as a percentage
                progress: 5 + (articles.length / 100) * 70
            });

            // Wait for the main article selector to be visible on the page
            await page.waitForSelector('.athing', {timeout: 10000});

            // Use `page.evaluate` to execute a function directly in the browser's context
            const pageArticles = await page.evaluate(() => {
                // Select all article elements
                const articleElements = document.querySelectorAll('.athing');
                const articleData = [];

                // Loop through each article element to extract data
                articleElements.forEach((article) => {
                    // Use selectors to find the title, score, age, and author
                    const titleElement = article.querySelector('.titleline > a');
                    const scoreElement = article.nextElementSibling?.querySelector('.score');
                    const ageElement = article.nextElementSibling?.querySelector('.age');
                    const authorElement = article.nextElementSibling?.querySelector('.hnuser');

                    // If a title and age are found, extract the data
                    if (titleElement && ageElement) {
                        const title = titleElement.textContent.trim();
                        const url = titleElement.href;
                        // Use the `title` attribute for a more accurate timestamp
                        const ageText = ageElement.getAttribute('title') || ageElement.textContent;
                        const score = scoreElement ? scoreElement.textContent : 'No Score';
                        const author = authorElement ? authorElement.textContent : 'Unknown';

                        articleData.push({
                            title,
                            url,
                            age: ageText,
                            score,
                            author,
                            // Convert the age string into a timestamp for easy sorting comparison
                            timeStamp: new Date(ageText).getTime() || 0
                        });
                    }
                });

                return articleData;
            });

            // Add the newly scraped articles to the main list
            const articlesToAdd = pageArticles.slice(0, 100 - articles.length);
            articles.push(...articlesToAdd);

            // Send a progress update to the client with the articles that were just collected
            broadcast({
                type: 'progress',
                collected: articles.length,
                total: 100,
                articles: articlesToAdd
            });

            // If we still need more articles, find and click the "more" link
            if (articles.length < 100) {
                const moreLink = await page.locator('.morelink').first();
                if (await moreLink.count() > 0) {
                    await moreLink.click();
                    // Wait for the new content to load
                    await page.waitForLoadState('networkidle');
                    currentPage++;
                } else {
                    // If no more pages are available, exit the loop
                    console.log('No more pages available');
                    break;
                }
            }
        }

        // Final step: Validate that the collected articles are sorted correctly by time
        broadcast({type: 'status', message: 'Validating article sorting...', progress: 80});

        let isSorted = true;
        const sortingErrors = [];

        // Loop through the articles and compare each article's timestamp with the next
        for (let i = 0; i < articles.length - 1; i++) {
            const currentArticle = articles[i];
            const nextArticle = articles[i + 1];

            // If the current article's timestamp is less than the next one, it's out of order
            if (currentArticle.timeStamp < nextArticle.timeStamp) {
                isSorted = false;
                sortingErrors.push({
                    position: i + 1,
                    current: currentArticle,
                    next: nextArticle
                });
            }
        }

        // Broadcast the final results to the client, including success status and any errors
        broadcast({
            type: 'results',
            success: isSorted,
            totalArticles: articles.length,
            sortingErrors: sortingErrors.length,
            articles: articles,
            errors: sortingErrors,
            progress: 100
        });

        console.log(`Validation complete: ${isSorted ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        // If any error occurs during the scraping process, log and broadcast it
        console.error('Error during validation:', error);
        broadcast({type: 'error', message: error.message});
    } finally {
        // Ensure the browser is always closed, regardless of success or failure
        await browser.close();
    }
}

// Start the server and listen on the specified port
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Press CTRL+C to quit.');
});