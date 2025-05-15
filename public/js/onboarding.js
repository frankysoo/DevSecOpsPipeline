document.addEventListener('DOMContentLoaded', function() {
  // Onboarding stepper functionality
  const steps = document.querySelectorAll('.step');
  const formSteps = document.querySelectorAll('.form-step');
  const nextButtons = document.querySelectorAll('.next-step');
  const prevButtons = document.querySelectorAll('.prev-step');
  const stepsCount = steps.length;
  let currentStep = 0;
  // Initialize stepper
  updateStepper(currentStep);
  // Step click event
  steps.forEach((step, index) => {
    step.addEventListener('click', () => {
      if (index < currentStep || validateStep(currentStep)) {
        goToStep(index);
      }
    });
  });
  // Next button click
  nextButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        goToStep(currentStep + 1);
      }
    });
  });
  // Previous button click
  prevButtons.forEach(button => {
    button.addEventListener('click', () => {
      goToStep(currentStep - 1);
    });
  });
  // Function to go to a specific step
  function goToStep(stepNumber) {
    // Validate boundaries
    if (stepNumber < 0 || stepNumber >= stepsCount) {
      return;
    }
    // Animate current step out
    formSteps[currentStep].classList.add('animate-fadeOut');
    
    setTimeout(() => {
      // Hide all form steps
      formSteps.forEach(step => {
        step.classList.remove('active', 'animate-fadeOut');
      });
      
      // Show the selected step
      if (formSteps[stepNumber]) {
        formSteps[stepNumber].classList.add('active');
      }
      
      // Update current step
      currentStep = stepNumber;
      
      // Update stepper UI
      updateStepper(currentStep);
      
      // Scroll to top of the form
      document.querySelector('.onboarding-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300); // Match the duration of the fadeOut animation
  }
  // Function to update the stepper UI
  function updateStepper(activeStep) {
    steps.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      
      if (index === activeStep) {
        step.classList.add('active');
      } else if (index < activeStep) {
        step.classList.add('completed');
      }
    });
  }
  // Function to validate the current step
  function validateStep(stepIndex) {
    const currentFormStep = formSteps[stepIndex];
    const requiredFields = currentFormStep.querySelectorAll('input[required], select[required]');
    let isValid = true;
    // Check if all required fields are filled
    requiredFields.forEach(field => {
      if (!field.value.trim()) {
        field.classList.add('is-invalid');
        isValid = false;
        // Add validation message if it doesn't exist
        let validationMessage = field.parentNode.querySelector('.validation-message');
        if (!validationMessage) {
          validationMessage = document.createElement('div');
          validationMessage.className = 'validation-message';
          validationMessage.innerHTML = '<i class="fas fa-exclamation-circle"></i> This field is required';
          field.parentNode.appendChild(validationMessage);
        }
        // Highlight the label
        const label = field.parentNode.querySelector('label');
        if (label) {
          label.style.color = 'var(--danger-color)';
        }
      } else {
        field.classList.remove('is-invalid');
        
        // Remove validation message if it exists
        const validationMessage = field.parentNode.querySelector('.validation-message');
        if (validationMessage) {
          validationMessage.remove();
        }
        
        // Reset label color
        const label = field.parentNode.querySelector('label');
        if (label) {
          label.style.color = '';
        }
      }
    });
    // If not valid, show a toast notification
    if (!isValid) {
      showToast('Please fill all required fields', 'error');
    }
    return isValid;
  }
  // Input validation on change
  const allFormInputs = document.querySelectorAll('.form-control');
  allFormInputs.forEach(input => {
    input.addEventListener('input', function() {
      if (this.hasAttribute('required') && this.value.trim()) {
        this.classList.remove('is-invalid');
        
        // Remove validation message if it exists
        const validationMessage = this.parentNode.querySelector('.validation-message');
        if (validationMessage) {
          validationMessage.remove();
        }
        
        // Reset label color
        const label = this.parentNode.querySelector('label');
        if (label) {
          label.style.color = '';
        }
      }
    });
  });
  // Form submission
  const onboardingForm = document.getElementById('onboarding-form');
  if (onboardingForm) {
    onboardingForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Validate the last step
      if (!validateStep(currentStep)) {
        return;
      }
      
      // Collect form data more directly
      const formData = new FormData(onboardingForm);
      const projectData = Object.fromEntries(formData.entries());
      
      // Handle custom secrets separately (as they are structured differently)
      const customSecrets = [];
      const customSecretContainers = document.querySelectorAll('.additional-secret');
      customSecretContainers.forEach(container => {
        const nameInput = container.querySelector('input[name^="custom_secrets"][name$="[name]"]');
        const descInput = container.querySelector('input[name^="custom_secrets"][name$="[description]"]');
        // Ensure both name and description inputs exist and name has a value
        if (nameInput && nameInput.value.trim() && descInput) {
          customSecrets.push({
            name: nameInput.value.trim(),
            description: descInput.value.trim()
          });
        }
      });
      projectData.custom_secrets = customSecrets; // Add to projectData for submission

      // Generate workflow YAML
      const generatedWorkflow = generateWorkflowYaml(projectData);
      const workflowYaml = document.getElementById('workflow-yaml');
      if (workflowYaml) {
        workflowYaml.textContent = generatedWorkflow;
      }
      
      // Generate SonarCloud config
      const generatedSonarConfig = generateSonarConfig(projectData);
      const sonarConfig = document.getElementById('sonar-config');
      if (sonarConfig) {
        sonarConfig.textContent = generatedSonarConfig;
      }
      
      // Generate secrets checklist
      const secretsChecklist = document.getElementById('secrets-checklist');
      if (secretsChecklist) {
        secretsChecklist.innerHTML = '';
        const baseSecrets = [
          { name: 'SONAR_TOKEN', description: 'From SonarCloud account settings' },
          { name: 'STAGING_SSH_KEY', description: 'Your SSH private key (entire file, including BEGIN/END markers)' },
          { name: 'STAGING_USER', description: `Username for ${projectData.staging_server_address}` },
          { name: 'STAGING_HOST', description: `Hostname: ${projectData.staging_server_address}` },
          { name: 'NOTIFICATION_WEBHOOK', description: 'Webhook URL for notifications' }
        ];
        
        // Add custom secrets
        const customSecrets = [];
        const customSecretContainers = document.querySelectorAll('.additional-secret');
        customSecretContainers.forEach(container => {
          const nameInput = container.querySelector('input[name^="custom_secrets"][name$="[name]"]');
          const descInput = container.querySelector('input[name^="custom_secrets"][name$="[description]"]');
          
          if (nameInput && descInput && nameInput.value) {
            customSecrets.push({
              name: nameInput.value,
              description: descInput.value
            });
          }
        });
        
        // Render all secrets in the checklist
        [...baseSecrets, ...customSecrets].forEach(secret => {
          const li = document.createElement('li');
          li.innerHTML = `<strong>${secret.name}</strong>: ${secret.description}`;
          secretsChecklist.appendChild(li);
        });
        
        // Show the generated config section
        document.querySelector('.generated-config').style.display = 'block';
        document.querySelector('.onboarding-form-container').style.display = 'none';
        
        // Show success message
        showToast('Configuration generated successfully!', 'success');
        
        // Scroll to the top of the generated config section
        document.querySelector('.generated-config').scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      // Submit the data to the server via fetch API
      fetch('/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send all data, including custom_secrets, which backend will handle
        body: JSON.stringify(projectData) 
      })
      .then(async response => {
        if (!response.ok) {
          // Try to parse error response from server
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            // If response is not JSON, use status text
            errorData = { message: response.statusText };
          }
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          console.log('Project onboarded successfully:', data);
          // The UI already shows success and generated config, so this is mostly for logging.
          // Optionally, update UI with projectId if needed: data.projectId
        } else {
          // This case should ideally be caught by the !response.ok check,
          // but handle it just in case the server responds 2xx with success:false
          console.error('Onboarding failed:', data.message);
          showToast(data.message || 'An unknown error occurred during onboarding.', 'error');
        }
      })
      .catch((error) => {
        console.error('Error submitting onboarding data:', error.message);
        showToast(`Error: ${error.message}`, 'error');
        // Potentially re-enable form if submission fails critically
        // document.querySelector('.generated-config').style.display = 'none';
        // document.querySelector('.onboarding-form-container').style.display = 'block';
      });
    });
  }
  // Add custom secret fields
  const addSecretBtn = document.getElementById('add-secret');
  const additionalSecretsContainer = document.getElementById('additional-secrets');
  let secretCount = 0;
  
  if (addSecretBtn && additionalSecretsContainer) {
    addSecretBtn.addEventListener('click', function() {
      secretCount++;
      const secretId = `custom-secret-${secretCount}`;
      const secretHtml = `
        <div class="additional-secret" id="${secretId}-container">
          <div class="form-group">
            <label for="${secretId}-name">Secret Name</label>
            <input type="text" id="${secretId}-name" name="custom_secrets[${secretCount}][name]" 
                   class="form-control" placeholder="e.g., API_KEY" required>
          </div>
          <div class="form-group">
            <label for="${secretId}-desc">Description</label>
            <input type="text" id="${secretId}-desc" name="custom_secrets[${secretCount}][description]" 
                   class="form-control" placeholder="What this secret is used for" required>
          </div>
          <button type="button" class="delete-secret-btn" onclick="removeSecret('${secretId}-container')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      additionalSecretsContainer.insertAdjacentHTML('beforeend', secretHtml);
      
      // Add toast notification
      showToast('New secret field added', 'info');
    });
  }
  
  // Remove custom secret field
  window.removeSecret = function(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.remove();
      showToast('Secret field removed', 'info');
    }
  };
  
  // Copy buttons
  const copyButtons = document.querySelectorAll('.copy-btn');
  
  copyButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetId = this.id.replace('copy-', ''); // e.g., workflow-yaml, dependency-suppressions, sonar-config
      const contentElement = document.getElementById(targetId);
      
      if (contentElement) {
        copyToClipboard(contentElement.textContent);
        const originalText = this.innerHTML;
        this.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
          this.innerHTML = originalText;
        }, 2000);
        // Make the toast message more user-friendly
        let toastMessage = targetId.replace(/-/g, ' ');
        toastMessage = toastMessage.charAt(0).toUpperCase() + toastMessage.slice(1);
        showToast(`${toastMessage} copied to clipboard`, 'success');
      }
    });
  });
  
  // Helper to copy text to clipboard
  function copyToClipboard(text) {
    // Create a temporary element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    
    // Select and copy
    const selected = document.getSelection().rangeCount > 0 ? 
      document.getSelection().getRangeAt(0) : false;
    
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    // Restore selection if any
    if (selected) {
      document.getSelection().removeAllRanges();
      document.getSelection().addRange(selected);
    }
  }
  
  // Toast notification system
  function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Get icon based on type
    let iconClass = 'fas fa-info-circle';
    switch(type) {
      case 'success':
        iconClass = 'fas fa-check-circle';
        break;
      case 'error':
        iconClass = 'fas fa-times-circle';
        break;
      case 'warning':
        iconClass = 'fas fa-exclamation-triangle';
        break;
    }
    
    // Toast content
    toast.innerHTML = `
      <div class="toast-icon">
        <i class="${iconClass}"></i>
      </div>
      <div class="toast-content">
        <p class="toast-message">${message}</p>
      </div>
      <button type="button" class="toast-close" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Close button
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      closeToast(toast);
    });
    
    // Auto close after 5s
    setTimeout(() => {
      closeToast(toast);
    }, 5000);
    
    function closeToast(toastEl) {
      toastEl.classList.add('slide-out');
      
      setTimeout(() => {
        toastEl.remove();
      }, 300);
    }
  }
  
  // Helper to generate workflow YAML
  function generateWorkflowYaml(data) {
    const branch = data.main_branch || 'main';
    const nodeVersion = data.node_version || '18.17.1';
    const buildCmd = data.build_command || 'npm run build';
    const testCmd = data.test_command || 'npm test';
    const dockerPath = data.docker_file_path || 'Dockerfile';
    const portNum = data.port_number || '5001'; // Changed default port
    const projectName = data.project_name;
    // STAGING_HOST is now taken from secrets, not form data directly for the workflow
    
    return `name: DevSecOps Pipeline
on:
  push:
    branches: [ ${branch} ]
  pull_request:
    branches: [ ${branch} ]
env:
  ARTIFACT_NAME: ${projectName}
  ARTIFACT_VERSION: \${{ github.sha }}
  STAGING_ENV: staging
  NODE_VERSION: '${nodeVersion}'
jobs:
  build:
    name: Build Application
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Fetch all history for SonarCloud analysis
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'  # Cache npm dependencies for faster builds
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: ${buildCmd}
      
      - name: Cache build artifacts
        uses: actions/cache@v3
        with:
          path: |
            ./node_modules
            ./build
            ./dist
          key: \${{ runner.os }}-build-\${{ github.sha }}
          restore-keys: |
            \${{ runner.os }}-build-
  test:
    name: Run Tests
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: \${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Restore cached build artifacts
        uses: actions/cache@v3
        with:
          path: |
            ./node_modules
            ./build
            ./dist
          key: \${{ runner.os }}-build-\${{ github.sha }}
      
      - name: Run tests
        run: ${testCmd}
      - name: Upload test results
        if: always()  # Upload test results even on test failure
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-reports/
          retention-days: 7
  security_scan:
    name: Security Scanning
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Run OWASP Dependency Check (SCA)
        uses: dependency-check/Dependency-Check_Action@main
        with:
          project: '\${{ env.ARTIFACT_NAME }}'
          path: '.'
          format: 'HTML'
          out: 'reports/dependency-check'
          args: >
            --failOnCVSS 7
            --suppression dependency-check-suppressions.xml
      
      - name: Upload Dependency Check results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: dependency-check-report
          path: reports/dependency-check/
          retention-days: 7
      
      - name: Set up JDK 17 for SonarCloud
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
          
      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: \${{ secrets.SONAR_TOKEN }}
      
      - name: Send notification on security findings
        if: failure()
        run: |
          curl -X POST -H "Content-Type: application/json" \\
            --data "{\\"text\\":\\"⚠️ Security scan found critical issues in \${{ env.ARTIFACT_NAME }}. See: https://github.com/\${{ github.repository }}/actions/runs/\${{ github.run_id }}\\"}" \\
            \${{ secrets.NOTIFICATION_WEBHOOK }}
  package:
    name: Create and Store Artifact
    needs: [test, security_scan]
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to GitHub Container Registry
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          file: ./${dockerPath} # Ensure path is relative to context
          push: true
          tags: |
            ghcr.io/\${{ github.repository_owner }}/\${{ env.ARTIFACT_NAME }}:\${{ env.ARTIFACT_VERSION }}
            ghcr.io/\${{ github.repository_owner }}/\${{ env.ARTIFACT_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            NODE_VERSION=\${{ env.NODE_VERSION }}
      
      - name: Create artifact info file
        run: |
          echo "ghcr.io/\${{ github.repository_owner }}/\${{ env.ARTIFACT_NAME }}:\${{ env.ARTIFACT_VERSION }}" > artifact_info.txt
      
      - name: Upload artifact info
        uses: actions/upload-artifact@v3
        with:
          name: artifact-info
          path: artifact_info.txt
  deploy_staging:
    name: Deploy to Staging
    needs: package
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Download artifact info
        uses: actions/download-artifact@v3
        with:
          name: artifact-info
      
      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.7.0
        with:
          ssh-private-key: \${{ secrets.STAGING_SSH_KEY }}
      
      - name: Disable strict host key checking
        run: |
          mkdir -p ~/.ssh
          echo "StrictHostKeyChecking no" >> ~/.ssh/config
          echo "UserKnownHostsFile /dev/null" >> ~/.ssh/config
      
      - name: Deploy to staging
        env:
          STAGING_HOST: \${{ secrets.STAGING_HOST }}
          STAGING_USER: \${{ secrets.STAGING_USER }}
          PORT_NUMBER: "${portNum}"
        run: |
          ARTIFACT_FULL=\$(cat artifact_info.txt)
          chmod +x ./scripts/deploy.sh
          ./scripts/deploy.sh "\$ARTIFACT_FULL" "\${{ env.STAGING_ENV }}" "\${{ env.STAGING_HOST }}" "\${{ env.STAGING_USER }}" "\$PORT_NUMBER"
      
      - name: Send deployment notification
        run: |
          curl -X POST -H "Content-Type: application/json" \\
            --data "{\\"text\\":\\"✅ \${{ env.ARTIFACT_NAME }} version \${{ env.ARTIFACT_VERSION }} has been deployed to staging environment. See: https://github.com/\${{ github.repository }}/actions/runs/\${{ github.run_id }}\\"}" \\
            \${{ secrets.NOTIFICATION_WEBHOOK }}`;
  }
  
  // Helper to generate SonarCloud config
  function generateSonarConfig(data) {
    const projectKey = data.sonar_project_key || `${data.project_name.toLowerCase().replace(/[^a-z0-9_.-]/g, '_')}`;
    const organization = data.sonar_organization || 'default-org'; // Replace with a more generic default if needed
    
    return `# Required metadata
sonar.projectKey=${projectKey}
sonar.organization=${organization}
# Project information
sonar.projectName=${data.project_name}
sonar.projectVersion=1.0 # Or use a dynamic version, e.g., from package.json or git describe
# Path to source directories (adjust if your source code is not in the root)
sonar.sources=./src
# Path to test directories (adjust as needed)
sonar.tests=./test,./tests
# Exclusions for source code, tests, and coverage
sonar.exclusions=node_modules/**/*,test/**/*,**/*.test.js,**/*.spec.js,dist/**/*,build/**/*,coverage/**/*,public/**/*,views/**/*,scripts/**/*
sonar.test.exclusions=node_modules/**/*,dist/**/*,build/**/*,public/**/*,views/**/*,scripts/**/*
sonar.coverage.exclusions=**/*.test.js,**/*.spec.js,test/**/*,tests/**/*,node_modules/**/*,dist/**/*,build/**/*,public/**/*,views/**/*,scripts/**/*
# Code coverage report path (ensure your test runner generates LCOV)
sonar.javascript.lcov.reportPaths=coverage/lcov.info
# Encoding of the source code
sonar.sourceEncoding=UTF-8
# Additional parameters for Node.js projects
sonar.javascript.node.maxspace=4096 # Adjust based on project size
# Disable detection of secrets in environment variables if they are handled securely elsewhere
# sonar.javascript.detectSecretsInEnvVars=false 
`;
  }
});
