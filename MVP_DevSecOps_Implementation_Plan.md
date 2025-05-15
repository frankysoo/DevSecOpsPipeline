# MVP DevSecOps Pipeline Implementation Plan

This document outlines the detailed implementation plan for the MVP DevSecOps Pipeline as specified in the Product Requirements Document (PRD) V1.0.

## Prerequisites & Initial Tool Setup

Before implementing the pipeline, the following prerequisites must be established:

1. **GitHub Repository Setup**
   - Create a GitHub repository for the pilot application code
   - Enable GitHub Actions for CI/CD capabilities
   - Configure branch protection for the main branch

2. **Required Secrets Configuration**
   - Set up the following secrets in GitHub repository settings:
     - `SONAR_TOKEN`: For SonarCloud authentication
     - `STAGING_SSH_KEY`: SSH private key for staging deployment
     - `STAGING_HOST`: Hostname for staging environment
     - `STAGING_USER`: Username for SSH access to staging
     - `NOTIFICATION_WEBHOOK`: Webhook URL for notifications

3. **Tool Selection & Configuration**
   - **CI/CD Platform**: GitHub Actions
   - **SCA Tool**: OWASP Dependency Check
   - **SAST Tool**: SonarCloud
   - **Artifact Repository**: GitHub Packages
   - **Notification System**: Webhooks (for Slack/Teams integration)

## Implementation Plan for Functional Requirements

### FR-MVP-01: Code Integration and Automated Build

**Implementation Steps:**
1. Create `.github/workflows/devsecops-pipeline.yml` to define the pipeline workflow
2. Configure workflow trigger on commits to main branch:
   ```yaml
   on:
     push:
       branches: [ main ]
     pull_request:
       branches: [ main ]
   ```
3. Define the build job with steps to checkout code and build application:
   ```yaml
   jobs:
     build:
       name: Build Application
       runs-on: ubuntu-latest
       steps:
         - name: Checkout code
           uses: actions/checkout@v3
         - name: Execute build script
           run: ./scripts/build.sh
   ```
4. Create `scripts/build.sh` to detect application type and execute appropriate build commands
5. Implement caching for build artifacts to improve pipeline efficiency

**Acceptance Criteria Fulfillment:**
- Build success/failure will be clearly indicated in GitHub Actions UI
- Build logs are accessible in the GitHub Actions run history
- The build script supports multiple application types (Java, Node.js, Python)

**Supported Use Cases:**
- UC-MVP-001: Submit, Build, and Test Code

### FR-MVP-02: Automated Unit & Integration Testing

**Implementation Steps:**
1. Add test job to pipeline workflow that depends on successful build:
   ```yaml
   test:
     name: Run Tests
     needs: build
     runs-on: ubuntu-latest
     steps:
       - name: Checkout code
         uses: actions/checkout@v3
       - name: Restore cached build artifacts
         uses: actions/cache@v3
       - name: Execute test script
         run: ./scripts/test.sh
   ```
2. Create `scripts/test.sh` to detect application type and run appropriate unit and integration tests
3. Configure test result collection and artifact upload:
   ```yaml
   - name: Upload test results
     uses: actions/upload-artifact@v3
     with:
       name: test-results
       path: ./test-reports
   ```

**Acceptance Criteria Fulfillment:**
- Tests run automatically after successful build
- Test results (pass/fail, summary) are accessible as GitHub artifacts
- Pipeline fails when tests fail, providing clear indication

**Supported Use Cases:**
- UC-MVP-001: Submit, Build, and Test Code
- UC-MVP-005: Consult Basic Pipeline Reports & Notifications

### FR-MVP-03: Automated Software Composition Analysis (SCA)

**Implementation Steps:**
1. Add security scanning job to pipeline that includes SCA:
   ```yaml
   security_scan:
     name: Security Scanning
     needs: build
     runs-on: ubuntu-latest
     steps:
       - name: Run OWASP Dependency Check (SCA)
         uses: dependency-check/Dependency-Check_Action@main
         with:
           project: '${{ env.ARTIFACT_NAME }}'
           path: '.'
           format: 'HTML'
           out: 'reports/dependency-check'
           args: >
             --suppression dependency-check-suppressions.xml
             --failOnCVSS 7
   ```
2. Create `dependency-check-suppressions.xml` for managing false positives
3. Configure artifact upload for SCA reports:
   ```yaml
   - name: Upload SCA Results
     uses: actions/upload-artifact@v3
     with:
       name: dependency-check-report
       path: reports/dependency-check
   ```

**Acceptance Criteria Fulfillment:**
- SCA scan runs automatically after successful build
- SCA report is accessible as a GitHub artifact
- Pipeline fails on critical/high severity vulnerabilities (CVSS ≥7)

**Supported Use Cases:**
- UC-MVP-002: Execute Basic Security Scans (SCA & SAST)
- UC-MVP-005: Consult Basic Pipeline Reports & Notifications

### FR-MVP-04: Automated Static Application Security Testing (SAST)

**Implementation Steps:**
1. Add SAST scanning using SonarCloud to the security scan job:
   ```yaml
   - name: SonarCloud Scan
     uses: SonarSource/sonarcloud-github-action@master
     env:
       GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
       SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
   
   - name: Check SonarCloud Quality Gate
     uses: sonarsource/sonarqube-quality-gate-action@master
     timeout-minutes: 5
     env:
       SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
   ```
2. Create `config/sonar-project.properties` for SonarCloud configuration:
   ```properties
   sonar.projectKey=pilot_application
   sonar.organization=your-organization
   sonar.sources=src
   sonar.qualitygate.wait=true
   sonar.security.vulnerabilityProbabilityThreshold=medium
   ```

**Acceptance Criteria Fulfillment:**
- SAST scan runs automatically
- SAST report is accessible via SonarCloud link
- Pipeline fails when quality gate criteria aren't met (critical/high issues)

**Supported Use Cases:**
- UC-MVP-002: Execute Basic Security Scans (SCA & SAST)
- UC-MVP-005: Consult Basic Pipeline Reports & Notifications

### FR-MVP-05: Application Artifact Creation & Storage

**Implementation Steps:**
1. Add package job to pipeline that depends on successful tests and security scans:
   ```yaml
   package:
     name: Create and Store Artifact
     needs: [test, security_scan]
     runs-on: ubuntu-latest
     steps:
       - name: Package application
         run: |
           echo "Packaging application with version ${{ env.ARTIFACT_VERSION }}..."
           # Command to create final artifact
       
       - name: Login to GitHub Container Registry
         uses: docker/login-action@v2
         with:
           registry: ghcr.io
           username: ${{ github.actor }}
           password: ${{ secrets.GITHUB_TOKEN }}
       
       - name: Push to GitHub Packages
         run: |
           # Push artifact to repository
   ```
2. Configure artifact versioning using git commit hash

**Acceptance Criteria Fulfillment:**
- Artifact is built with proper versioning
- Artifact is stored in the configured repository (GitHub Packages)
- Artifact is only created after successful tests and security scans

**Supported Use Cases:**
- UC-MVP-003: Build and Store Application Artifact

### FR-MVP-06: Automated Deployment to Staging Environment

**Implementation Steps:**
1. Add deploy staging job to pipeline that depends on successful packaging:
   ```yaml
   deploy_staging:
     name: Deploy to Staging
     needs: package
     runs-on: ubuntu-latest
     environment: staging
     steps:
       - name: Deploy to staging
         run: |
           chmod +x ./scripts/deploy.sh
           ARTIFACT_FULL=$(cat artifact_info.txt)
           ./scripts/deploy.sh "$ARTIFACT_FULL" "${{ env.STAGING_ENV }}"
         env:
           STAGING_SSH_KEY: ${{ secrets.STAGING_SSH_KEY }}
           STAGING_HOST: ${{ secrets.STAGING_HOST }}
           STAGING_USER: ${{ secrets.STAGING_USER }}
   ```
2. Create `scripts/deploy.sh` to handle deployment based on artifact type
3. Implement error handling and verification of deployment

**Acceptance Criteria Fulfillment:**
- Application is automatically deployed to staging after successful packaging
- Deployment success/failure status is clearly reported
- Deployment uses the versioned artifact created in the package step

**Supported Use Cases:**
- UC-MVP-004: Deploy Application to Staging

### FR-MVP-07: Basic Pipeline Notifications

**Implementation Steps:**
1. Add notification steps to relevant pipeline jobs:
   ```yaml
   - name: Notify on Security Issues
     if: failure()
     run: |
       chmod +x ./scripts/notify.sh
       ./scripts/notify.sh "Critical security issues found in ${{ env.ARTIFACT_NAME }}."
     env:
       NOTIFICATION_WEBHOOK: ${{ secrets.NOTIFICATION_WEBHOOK }}
   
   - name: Notify Deployment Success
     if: success()
     run: |
       chmod +x ./scripts/notify.sh
       ./scripts/notify.sh "${{ env.ARTIFACT_NAME }} deployed to ${{ env.STAGING_ENV }}."
   ```
2. Create `scripts/notify.sh` to send notifications via webhook

**Acceptance Criteria Fulfillment:**
- Developers are notified of pipeline failures related to their commits
- Security team is notified of critical security findings
- Notifications include relevant context about the event

**Supported Use Cases:**
- UC-MVP-005: Consult Basic Pipeline Reports & Notifications

### FR-MVP-08: Pipeline as Code for Pilot Application

**Implementation Steps:**
1. Create `.github/workflows/devsecops-pipeline.yml` as the main pipeline definition
2. Document pipeline structure and configuration in README.md
3. Ensure all scripts are version-controlled in the repository

**Acceptance Criteria Fulfillment:**
- Pipeline execution is driven by version-controlled script
- Changes to pipeline are tracked in git history
- Pipeline configuration is transparent and auditable

**Supported Use Cases:**
- UC-MVP-006: Define Pilot App Pipeline Configuration as Code

## Implementation Plan for Non-Functional Requirements

### NFR-MVP-01: Performance

**Implementation Approach:**
1. Implement caching of dependencies and build artifacts to reduce pipeline execution time
2. Configure parallel execution where possible (e.g., running test and security scan jobs simultaneously)
3. Use lightweight Docker images for pipeline runners
4. Monitor and optimize the slowest pipeline steps

**Validation Method:**
- Measure pipeline execution time in GitHub Actions
- Set a baseline and track improvements
- Target completion time: 15-20 minutes or less for the full pipeline

### NFR-MVP-02: Usability (for Developers)

**Implementation Approach:**
1. Ensure clear naming of pipeline stages and steps
2. Include descriptive error messages in scripts
3. Add links to artifacts and reports in GitHub Actions summary
4. Document common failure scenarios and resolutions in README.md

**Validation Method:**
- Get feedback from developers on clarity of pipeline output
- Verify ease of accessing logs and reports
- Confirm that failure messages are actionable

### NFR-MVP-03: Security (of the Pipeline itself)

**Implementation Approach:**
1. Store all credentials as GitHub repository secrets
2. Use least privilege principle for service accounts
3. Implement timeout for pipeline jobs to prevent resource exhaustion
4. Validate inputs in pipeline scripts to prevent injection attacks

**Validation Method:**
- Review security settings of GitHub Actions
- Verify that secrets aren't exposed in logs
- Confirm proper handling of sensitive credentials

### NFR-MVP-04: Reliability

**Implementation Approach:**
1. Add robust error handling in all scripts
2. Implement retry logic for network-dependent operations
3. Use fixed versions for actions and tools to ensure consistency
4. Add validation steps before critical operations (deployment, etc.)

**Validation Method:**
- Monitor pipeline success rate
- Test recovery from common failure scenarios
- Verify consistent behavior across multiple runs

## User Story Realization

### US-MVP-001: Automated Build and Testing
**Fulfilled by:** FR-MVP-01, FR-MVP-02
- Pipeline automatically triggers on code commit
- Build and test results are immediately available to developers

### US-MVP-002: Automated Security Scanning
**Fulfilled by:** FR-MVP-03, FR-MVP-04
- SCA and SAST scans run automatically on committed code
- Critical security issues block the pipeline

### US-MVP-003: Clear Pipeline Failures
**Fulfilled by:** FR-MVP-01, FR-MVP-02, FR-MVP-03, FR-MVP-04, FR-MVP-07
- Failed steps are clearly indicated in GitHub Actions UI
- Error messages are specific and actionable
- Logs are easily accessible

### US-MVP-004: Automated Artifact Creation
**Fulfilled by:** FR-MVP-05
- Application artifact is automatically built after successful tests and scans
- Artifact is versioned and stored in GitHub Packages

### US-MVP-005: Automated Staging Deployment
**Fulfilled by:** FR-MVP-06
- Successful artifacts are automatically deployed to staging
- Deployment status is reported through notifications

### US-MVP-006: Security Findings Notification
**Fulfilled by:** FR-MVP-07
- Security team is notified of critical findings
- Reports are accessible for detailed review

### US-MVP-007: Pipeline as Code
**Fulfilled by:** FR-MVP-08
- Pipeline configuration is stored as code in the repository
- Changes to pipeline are tracked through version control

## Scope Adherence

### In Scope Confirmation
- All functional requirements (FR-MVP-01 to FR-MVP-08) are addressed in the implementation plan
- All use cases (UC-MVP-001 to UC-MVP-006) are supported
- Implementation is for one pilot application
- One SCA tool (OWASP Dependency Check) is integrated
- One SAST tool (SonarCloud) is integrated
- Deployment is automated to a single staging environment
- Notifications use GitHub Actions' native capabilities
- Secrets are managed by GitHub's built-in mechanism

### Out of Scope Confirmation
The implementation plan explicitly excludes:
- DAST (Dynamic Application Security Testing)
- Advanced Image Scanning
- Infrastructure Security Scanning
- Automated deployment to Production environments
- Complex deployment strategies
- Full-fledged Infrastructure as Code

## Risk Mitigation

### Risk: Pipeline Performance
**Mitigation Actions:**
- Implement caching for dependencies and artifacts
- Configure parallel job execution where possible
- Monitor and optimize slow steps

### Risk: False Positives in Security Scanning
**Mitigation Actions:**
- Create suppressions file for known false positives
- Configure appropriate thresholds for vulnerability severity
- Document process for reviewing and managing findings

### Risk: Deployment Failures
**Mitigation Actions:**
- Implement validation steps before deployment
- Add rollback capability in deployment script
- Include post-deployment verification

### Risk: Pipeline Script Maintenance
**Mitigation Actions:**
- Document pipeline components thoroughly
- Use modular script design for easier maintenance
- Comment complex logic in pipeline scripts

## Definition of Done Verification

### Release Criteria Verification
1. **Functional Completeness:**
   - All functional requirements implemented and tested
   - All scripts execute successfully in test environment
   - Pipeline runs end-to-end without manual intervention

2. **Security Compliance:**
   - SCA tool successfully identifies vulnerabilities
   - SAST tool successfully analyzes code quality and security
   - Pipeline fails on critical security issues

3. **Performance Targets:**
   - Full pipeline execution completes within target timeframe (15-20 minutes)
   - Feedback loop meets developer expectations

4. **Documentation:**
   - README.md provides clear usage instructions
   - Pipeline scripts are well-commented
   - Common issues and resolutions are documented

5. **Deployment Validation:**
   - Artifacts are correctly deployed to staging
   - Application functions correctly after deployment
   - Deployment verification steps are included

This implementation plan provides a comprehensive blueprint for delivering the MVP DevSecOps Pipeline as specified in the PRD. Each requirement is addressed with concrete implementation steps, and verification methods are defined to ensure all acceptance criteria and release requirements are met.