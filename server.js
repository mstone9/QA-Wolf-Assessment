const express = require('express');
const { chromium } = require('playwright');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const PORT = 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

const server = require('http').createServer(app);

const wss = new WebSocket.Server({ server });

const clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected');

    ws.on('close', () => {
        clients.delete(ws);
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});



// Broadcast to all connected clients
function broadcast(data) {
    console.log('Broadcasting:', data.type, data.message || ''); // Debug log
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to start the test
app.post('/start-test', async (req, res) => {
    res.json({message: 'Test started'});

    try {
        await runHackerNewsValidation(); // Fixed: Added parentheses!
    } catch (error) {
        console.error('Error in validation:', error);
        broadcast({type: 'error', message: error.message});
    }
});

async function runHackerNewsValidation() {
    broadcast({type: 'status', message: 'Starting Hacker News validation...', progress: 0});

    const browser = await chromium.launch({headless: true});
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://news.ycombinator.com/newest');
        broadcast({type: 'status', message: '📄 Hacker News page loaded', progress: 5});

        const articles = [];
        let currentPage = 1;

        while (articles.length < 100) {
            broadcast({
                type: 'status',
                message: `Loading page ${currentPage}...`,
                progress: 5 + (articles.length / 100) * 70
            });

            await page.waitForSelector('.athing', {timeout: 10000});

            const pageArticles = await page.evaluate(() => {
                const articleElements = document.querySelectorAll('.athing');
                const articleData = [];

                articleElements.forEach((article, index) => {
                    const titleElement = article.querySelector('.titleline > a');
                    const scoreElement = article.nextElementSibling?.querySelector('.score');
                    const ageElement = article.nextElementSibling?.querySelector('.age');
                    const authorElement = article.nextElementSibling?.querySelector('.hnuser');

                    if (titleElement && ageElement) {
                        const title = titleElement.textContent.trim();
                        const url = titleElement.href; // Added URL
                        const ageText = ageElement.getAttribute('title') || ageElement.textContent;
                        const score = scoreElement ? scoreElement.textContent : 'No Score';
                        const author = authorElement ? authorElement.textContent : 'Unknown';

                        articleData.push({
                            title,
                            url, // Added URL property
                            age: ageText,
                            score,
                            author,
                            timeStamp: new Date(ageText).getTime() || 0 // Fixed: Use actual timestamp from age
                        });
                    }
                });

                return articleData;
            });

            const articlesToAdd = pageArticles.slice(0, 100 - articles.length);
            articles.push(...articlesToAdd);

            // Send progress update with newly collected articles
            broadcast({
                type: 'progress',
                collected: articles.length,
                total: 100,
                articles: articlesToAdd
            });

            if (articles.length < 100) {
                const moreLink = await page.locator('.morelink').first();
                if (await moreLink.count() > 0) {
                    await moreLink.click();
                    await page.waitForLoadState('networkidle');
                    currentPage++;
                } else {
                    console.log('No more pages available');
                    break;
                }
            }
        }

        broadcast({type: 'status', message: '🔍 Validating article sorting...', progress: 80});

        let isSorted = true;
        const sortingErrors = [];

        for (let i = 0; i < articles.length - 1; i++) {
            const currentArticle = articles[i];
            const nextArticle = articles[i + 1];

            if (currentArticle.timeStamp < nextArticle.timeStamp) {
                isSorted = false;
                sortingErrors.push({
                    position: i + 1,
                    current: currentArticle,
                    next: nextArticle
                });
            }
        }

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
        console.error('Error during validation:', error);
        broadcast({type: 'error', message: error.message});
    } finally {
        await browser.close();
    }
}

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Press CTRL+C to quit.');
});