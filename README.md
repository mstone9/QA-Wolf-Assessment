# 🐺 QA Wolf Take Home Assignment

This project is a solution to the QA Wolf take-home assignment. It uses **Playwright** to scrape the 100 most recent articles from Hacker News and validates that they are sorted correctly by date.

The solution includes two components:

* A **standalone Node.js script** that runs the validation directly from the command line, fulfilling the core requirements.
* A **full-stack web application** with an Express server and a client-side interface that provides a real-time, visual demonstration of the test.

-----

### Live Application

The web application has been deployed and is live for review. You can view the live demo here:

**[Live Demo on Railway](https://qa-wolf-assessment.up.railway.app/)**

-----

### How to Run the Project Locally

To get the project up and running on your local machine, follow these simple steps.

1.  **Clone the repository** to your local machine.

2.  **Install the dependencies** by navigating to the project directory and running:

    ```bash
    npm install
    ```

-----

### Running the Validation Test

You have two options for running the validation test locally.

#### Option 1: Standalone Script (Assignment Requirement)

This method runs the test from the command line and prints the results to your terminal. It directly addresses the main assignment question.

To run the script, use the following command:

```bash
node index.js
```

The script will open a browser, perform the validation, and then print a detailed report of the results.

#### Option 2: Web Application (Enhanced Solution)

This method starts a local web server and provides a user-friendly interface to run the test and view the results in real-time. This solution showcases a deeper understanding of full-stack development.

1.  **Start the server** with the command:

    ```bash
    node server.js
    ```

    The server will run at `http://localhost:3000`.

2.  **Open your browser** and navigate to the address above.

3.  On the web page, click the **"Start Validation Test"** button to initiate the scraping and validation process. You will see live progress updates and a final report displayed on the page.