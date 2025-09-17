// A class to manage the entire client-side logic for the Hacker News validator.
class HackerNewsValidator {
    constructor() {
        // Initialize WebSocket connection and articles array.
        this.ws = null;
        this.articles = [];
        // Call the initialization method to set everything up.
        this.init();
    }

    // The main initialization method.
    init() {
        // Connect to the WebSocket server.
        this.connectWebSocket();
        // Set up event listeners for the UI elements.
        this.setupEventListeners();
    }

    // Establishes a WebSocket connection to the server.
    connectWebSocket() {
        // Determine the correct protocol (wss for HTTPS, ws for HTTP).
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        // Create a new WebSocket instance using the same host as the page.
        this.ws = new WebSocket(`${protocol}://${window.location.host}`);

        // Define a function to handle incoming messages from the server.
        this.ws.onmessage = (event) => {
            // Parse the JSON data from the message.
            const data = JSON.parse(event.data);
            // Pass the data to a handler function based on its type.
            this.handleWebSocketMessage(data);
        };
    }

    // Sets up event listeners for user interactions.
    setupEventListeners() {
        // Get the "Start Test" button from the DOM.
        const startBtn = document.getElementById('startTest');
        // Add a 'click' event listener to the button.
        startBtn.addEventListener('click', () => {
            // When clicked, call the `startTest` method.
            this.startTest()
        });
    }

    // Asynchronously starts the validation test on the server.
    async startTest() {
        const startBtn = document.getElementById('startTest');
        // Disable the button to prevent multiple clicks.
        startBtn.disabled = true;
        // Update the button's text and icon to show a loading state.
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running Test...';

        // Make sections of the UI visible.
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('statsSection').style.display = 'grid';

        // Reset the UI to its initial state before starting a new test.
        this.resetUI();

        try {
            // Send a POST request to the server's '/start-test' endpoint.
            // This triggers the server-side scraping process.
            await fetch('/start-test', {method: 'POST'});
        } catch (error) {
            console.error('Error starting test: ', error);
        }
    }

    // Resets the user interface elements.
    resetUI() {
        this.articles = [];
        document.getElementById('totalArticles').textContent = '0';
        document.getElementById('sortingErrors').textContent = '-';
        document.getElementById('testStatus').textContent = '-';
    }

    // A central handler to route WebSocket messages to the correct function based on the message type.
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'status':
                // For status updates (e.g., "Page loaded").
                this.updateProgress(data.message, data.progress);
                break;
            case 'progress':
                // For progress updates (e.g., articles collected).
                this.updateArticles(data);
                break;
            case 'results':
                // For the final results of the test.
                this.showResults(data);
                break;
            case 'error':
                // For a server-side error.
                this.showError(data.message);
                break;
        }
    }

    // Updates the progress bar and text.
    updateProgress(message, progress) {
        document.getElementById('progressText').textContent = message;
        document.getElementById('progressFill').style.width = `${progress}%`;
    }

    // Handles progress updates, updating the article count and progress bar.
    updateArticles(data) {
        document.getElementById('totalArticles').textContent = data.collected;

        // If the message contains new articles, add them to the local array.
        if (data.articles) {
            this.articles.push(...data.articles);
        }

        // Update the progress text and bar with the new count.
        this.updateProgress(`Collected ${data.collected}/${data.total} articles`,
            5 + (data.collected / data.total) * 70);
    }

    // Shows the final test results to the user.
    showResults(data) {
        const startBtn = document.getElementById('startTest');
        // Re-enable the start button.
        startBtn.disabled = false;
        // Restore the button's original text and icon.
        startBtn.innerHTML = '<i class="fas fa-play"></i> Start Validation Test';

        // Update the statistics section with the final numbers.
        document.getElementById('totalArticles').textContent = data.totalArticles;
        document.getElementById('sortingErrors').textContent = data.sortingErrors;
        document.getElementById('testStatus').textContent = data.success ? 'PASS' : 'FAIL';

        // Update the visual badge to indicate pass or fail.
        const badge = document.getElementById('resultsBadge');
        if (data.success) {
            badge.className = 'results-badge success';
            badge.innerHTML = '<i class="fas fa-check-circle"></i> Test Passed';
        } else {
            badge.className = 'results-badge error';
            badge.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Test Failed';
        }

        // Render the articles and error details to the page.
        this.renderResults(data);
        // Set the progress bar to 100% and show a final message.
        this.updateProgress(
            data.success ? ' All articles correctly sorted!' : ' Sorting violations detected!',
            100
        );
    }


    // Renders the list of articles and any sorting errors to the UI.
    renderResults(data) {
        const container = document.getElementById('resultsContent');
        let html = '';

        // Generate the HTML for the articles list.
        html += '<h3 style="margin-bottom: 20px;">Articles</h3>';
        data.articles.forEach((article, index) => {
            // Use a helper function to get a user-friendly "time ago" string.
            const timeAgo = this.getTimeAgo(article.age);
            html += `
                        <div class="article-item">
                            <div class="article-number">#${index + 1}</div>
                            <div class="article-content">
                                <div class="article-title">
                                    <a href="${article.url || '#'}" target="_blank">${article.title}</a>
                                </div>
                                <div class="article-meta">
                                    <span><i class="fas fa-user"></i> ${article.author}</span>
                                    <span><i class="fas fa-arrow-up"></i> ${article.score}</span>
                                    <span><i class="fas fa-clock"></i> ${timeAgo}</span>
                                </div>
                            </div>
                        </div>
                    `;
        });

        // Generate the HTML for sorting errors if they exist.
        if (data.errors.length > 0) {
            html += `
                        <div class="error-section">
                            <div class="error-header">
                                <i class="fas fa-exclamation-triangle"></i>
                                Found ${data.errors.length} Sorting Violation${data.errors.length > 1 ? 's' : ''}
                            </div>
                    `;
            data.errors.forEach((error, index) => {
                html += `
                            <div class="error-item">
                                <strong>Violation #${index + 1} at position ${error.position}:</strong><br>
                                Current: "${error.current.title.substring(0, 60)}..." (${error.current.age})<br>
                                Next: "${error.next.title.substring(0, 60)}..." (${error.next.age})
                            </div>
                        `;
            });
            html += '</div>';
        }

        // Insert the generated HTML into the container element.
        container.innerHTML = html;
    }


    // A helper function to convert a date string into a "time ago" format.
    getTimeAgo(dateString) {
        const cleanDateString = dateString.split(' ')[0];

        // Parse as UTC to avoid timezone issues.
        const date = new Date(cleanDateString + 'Z'); // Add 'Z' to force UTC parsing
        const now = new Date();

        if (isNaN(date.getTime())) {
            return dateString;
        }

        const diffMs = now - date;
        const diffMinutes = Math.floor(Math.abs(diffMs) / (1000 * 60)); // Use absolute value
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    // Handles and displays a server-side error message.
    showError(message) {
        const startBtn = document.getElementById('startTest');
        // Re-enable the button.
        startBtn.disabled = false;
        // Restore the button's original text.
        startBtn.innerHTML = '<i class="fas fa-play"></i> Start Validation Test';

        // Update the progress text to show the error message and reset the progress bar.
        this.updateProgress(` ${message}`, 0);
    }
}

// Event listener that fires when the entire page (DOM) has loaded.
document.addEventListener('DOMContentLoaded', () => {
    // Creates a new instance of the HackerNewsValidator class, starting the app.
    new HackerNewsValidator();
});