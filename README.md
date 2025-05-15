# DevSecOps Pipeline Demo Application

## 1. Overview

This project is a demonstration of a Node.js web application integrated with a DevSecOps pipeline. It showcases how modern software development practices can incorporate automated building, testing, security scanning, packaging, and deployment. The application itself provides an onboarding wizard to help users generate a similar DevSecOps pipeline configuration for their own Node.js projects.

**Key Features:**
*   **Web Application**: A Node.js Express application using Handlebars for templating and SQLite as its database.
*   **Onboarding Wizard**: A multi-step form that guides users through configuring pipeline parameters for their GitHub repository.
*   **Configuration Generation**: Generates GitHub Actions workflow YAML and SonarCloud properties files based on user input.
*   **DevSecOps Pipeline (for this demo app)**:
    *   Automated builds and tests.
    *   Software Composition Analysis (SCA) using OWASP Dependency Check.
    *   Static Application Security Testing (SAST) using SonarCloud.
    *   Docker image creation and push to GitHub Container Registry (GHCR).
    *   Automated deployment to a staging environment.
    *   Notifications for security findings and deployments.
*   **Security Best Practices**: Implements `helmet` for security headers, `compression` for response compression, API rate limiting, and runs the application as a non-root user in Docker.

## 2. Technologies Used

*   **Backend**: Node.js, Express.js
*   **Frontend**: HTML, CSS, JavaScript, Handlebars (View Engine)
*   **Database**: SQLite
*   **CI/CD & Automation**: GitHub Actions
*   **Containerization**: Docker
*   **Security Scanning**:
    *   OWASP Dependency Check (SCA)
    *   SonarCloud (SAST)
*   **Deployment Target (Example)**: Any server accessible via SSH with Docker installed.

## 3. Project Structure

```
.
├── .github/
│   └── workflows/
│       └── devsecops-pipeline.yml  # Main CI/CD pipeline for this demo app
├── .env                            # Local environment variables (Gitignored)
├── Dockerfile                      # Docker configuration for the application
├── MOCK_DATA.json                  # (If used for initial data, otherwise remove)
├── README.md                       # This file
├── dependency-check-suppressions.xml # Suppressions for OWASP Dependency Check
├── devsecops_database.sqlite       # SQLite database file (Gitignored by default)
├── package-lock.json
├── package.json
├── public/                         # Static assets
│   ├── css/
│   │   ├── onboarding.css
│   │   └── styles.css
│   ├── images/                     # (favicon.png would go here)
│   └── js/
│       ├── main.js
│       └── onboarding.js
├── scripts/                        # Utility and deployment scripts
│   ├── build.sh                    # (Example, if used)
│   ├── deploy.sh
│   └── test.sh                     # (Example, if used)
├── sonar-project.properties        # SonarCloud configuration for this demo app
├── src/                            # Source code
│   ├── controllers/
│   │   └── onboarding.js
│   ├── db.js                       # Database connection and initialization
│   └── server.js                   # Main Express server setup
└── views/                          # Handlebars views
    ├── dashboard.handlebars
    ├── docs.handlebars
    ├── error.handlebars
    ├── home.handlebars
    ├── onboarding.handlebars
    ├── pipeline.handlebars
    ├── layouts/
    │   └── main.handlebars
    └── partials/                   # (If any partials are used)
```

## 4. Setup and Installation (Local Development)

### Prerequisites
*   Node.js (version specified in `package.json` engines, e.g., >=18.0.0)
*   npm (comes with Node.js)
*   (Optional, for full pipeline testing) Docker, access to a GitHub repository, SonarCloud account.

### Steps
1.  **Clone the repository (if applicable):**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying `.env.example` (if provided) or creating it manually.
    The key variable is `DATABASE_URL`. For SQLite (current setup):
    ```env
    # .env
    DATABASE_URL="devsecops_database.sqlite" # Path to the SQLite file
    PORT=5001
    NODE_ENV=development
    ```
    The SQLite database file will be created automatically if it doesn't exist when the application starts.

4.  **Initialize the database (first time):**
    The application attempts to initialize the database (create tables) on startup.

5.  **Run the application:**
    ```bash
    npm start
    ```
    The application should now be running on `http://localhost:5001` (or the port specified in `.env`).

## 5. Using the Onboarding Wizard

1.  Navigate to `http://localhost:5001/onboarding`.
2.  Fill out the multi-step form with details about your Node.js project and target deployment environment.
3.  On the final step, click "Generate Pipeline Configuration".
4.  The wizard will display:
    *   A GitHub Actions workflow YAML (`devsecops-pipeline.yml`).
    *   A SonarCloud properties file (`sonar-project.properties`).
    *   A `dependency-check-suppressions.xml` template.
    *   A checklist of manual steps required.
5.  **Manual Steps for Your Project:**
    *   Copy the generated `devsecops-pipeline.yml` to `.github/workflows/` in *your* target repository.
    *   Copy the generated `sonar-project.properties` to the root of *your* target repository.
    *   Copy the `dependency-check-suppressions.xml` to the root of *your* target repository (and customize as needed).
    *   Ensure *your* project has a `Dockerfile` (the one in this demo can be a template).
    *   Add the required secrets (e.g., `SONAR_TOKEN`, `STAGING_SSH_KEY`, `STAGING_USER`, `STAGING_HOST`, `NOTIFICATION_WEBHOOK`) to *your* GitHub repository's Actions secrets.
    *   Commit and push these changes to your repository's main branch to trigger the pipeline.

## 6. DevSecOps Pipeline (for this Demo Application)

The `.github/workflows/devsecops-pipeline.yml` in *this* repository defines the CI/CD pipeline for the demo application itself. It includes the following stages:

*   **Build**: Installs dependencies, runs build scripts (if any).
*   **Test**: Runs automated tests (currently a placeholder `npm test`).
*   **Security Scan**:
    *   **SCA**: OWASP Dependency Check scans for vulnerabilities in dependencies.
    *   **SAST**: SonarCloud analyzes static code for bugs, vulnerabilities, and code smells.
*   **Package**: Builds a Docker image of the application and pushes it to GitHub Container Registry (GHCR).
*   **Deploy (to Staging)**: Deploys the Docker image to a staging server using SSH. Requires secrets like `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_KEY`.

## 7. Key Code Files and Logic

*   **`src/server.js`**: Main application file. Sets up Express, middleware (helmet, compression, rate-limiting), Handlebars, routes, and error handling.
*   **`src/db.js`**: Handles SQLite database connection and schema initialization.
*   **`src/controllers/onboarding.js`**: Contains logic for rendering the onboarding form and processing submissions (saving data to the database).
*   **`public/js/onboarding.js`**: Frontend JavaScript for the onboarding wizard (stepper, form validation, dynamic generation of configuration previews).
*   **`views/onboarding.handlebars`**: The main view for the onboarding wizard UI.
*   **`views/layouts/main.handlebars`**: Main layout file for all pages, includes header and footer.
*   **`Dockerfile`**: Defines how to build the Docker image for the application, including using a non-root user and health checks.
*   **`scripts/deploy.sh`**: Shell script used by the GitHub Actions workflow to deploy the application to a server.

## 8. Potential Future Enhancements

*   **User Authentication**: Secure the onboarding data and dashboard.
*   **More Sophisticated Configuration**: Allow more granular control over generated pipeline configurations.
*   **Support for Other Languages/Frameworks**: Extend the wizard to generate pipelines for Python, Java, etc.
*   **Dynamic Secrets Management**: Integrate with tools like HashiCorp Vault.
*   **Production Deployment Stage**: Add a separate, more controlled deployment process for production.
*   **Comprehensive Test Suite**: Implement unit, integration, and end-to-end tests.
*   **Frontend Build Process**: Add minification and bundling for CSS/JS assets.
*   **Input Sanitization**: More robust sanitization for all user inputs on the backend.

## 9. Troubleshooting Local Development

*   **`EADDRINUSE` error**: Means the port (e.g., 5001) is already in use. Stop the existing process or change the `PORT` in `.env`.
*   **Database connection issues**: Ensure your `DATABASE_URL` in `.env` is correct for your SQLite file path.
*   **"Failed to lookup view" errors**: Make sure the `.handlebars` file exists in the `views` directory and subdirectories.
*   **Static assets not loading (404s)**: Check paths in `src/server.js` for `express.static` and ensure files exist in `public/`.

---
This README provides a comprehensive guide to understanding, setting up, and using the DevSecOps Pipeline Demo application.
