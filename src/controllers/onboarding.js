const db = require('../db');

// Get the onboarding form page
async function getOnboardingForm(req, res) {
  try {
    res.render('onboarding', { 
      title: 'Project Onboarding'
    });
  } catch (error) {
    console.error('Error rendering onboarding form:', error);
    res.status(500).send('An error occurred while loading the onboarding form.');
  }
}

// Process the onboarding form submission
async function processOnboardingForm(req, res) {
  const {
    project_name,
    repository_url,
    main_branch,
    node_version,
    docker_file_path,
    build_command,
    test_command,
    port_number,
    staging_server_address, // This will be used for STAGING_HOST secret
    sonar_project_key,
    sonar_organization,
    notification_endpoint,
    custom_secrets
  } = req.body;

  // Input Validation
  const errors = [];
  if (!project_name || project_name.trim() === '') {
    errors.push('Project name is required.');
  }
  if (!repository_url || repository_url.trim() === '') {
    errors.push('GitHub Repository URL is required.');
  } else {
    try {
      new URL(repository_url); // Basic URL validation
    } catch (_) {
      errors.push('Invalid GitHub Repository URL format.');
    }
  }
  if (!staging_server_address || staging_server_address.trim() === '') {
    errors.push('Staging server address is required.');
  }
  
  const numPort = Number(port_number); // Use the already destructured port_number
  if (isNaN(numPort) || numPort < 1 || numPort > 65535) {
    errors.push('Application Port must be a number between 1 and 65535.');
  }

  if (main_branch && main_branch.trim() === '') { // Check if main_branch is provided and then if it's empty
    errors.push('Main branch cannot be empty if provided.');
  }
  // Add more validation for other fields as necessary, e.g., regex for project_name, sonar_project_key

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed. Please check the provided data.',
      errors: errors
    });
  }

  try {
    // Insert the project into the database using SQLite-friendly method
    const result = await db.run(
      `INSERT INTO onboarded_projects (
        project_name,
        repository_url,
        main_branch,
        node_version,
        docker_file_path,
        build_command,
        test_command,
        port_number,
        staging_server_address,
        sonar_project_key,
        sonar_organization,
        notification_endpoint
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, // 12 placeholders
      [
        project_name,
        repository_url,
        main_branch || 'main',
        node_version || '18.17.1',
        docker_file_path || 'Dockerfile',
        build_command || 'npm run build',
        test_command || 'npm test',
        numPort, // Use validated and converted port number
        staging_server_address,
        sonar_project_key || `${project_name.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_')}_sonarkey`,
        sonar_organization || 'default-org',
        notification_endpoint
      ]
    );
    
    const projectId = result.id;
    
    await db.run('BEGIN TRANSACTION');
    try {
      const standardSecrets = [
        { 
          name: 'SONAR_TOKEN', 
          description: 'Token for SonarCloud authentication. Obtain from your SonarCloud account.', 
          is_required: true 
        },
        {
          name: 'STAGING_SSH_KEY',
          description: 'The content of your SSH private key file for accessing the staging server.',
          is_required: true
        },
        {
          name: 'STAGING_USER',
          description: 'Username for SSH access to the staging server.',
          is_required: true
        },
        {
          name: 'STAGING_HOST',
          description: `Hostname or IP address of your staging server (e.g., ${staging_server_address || 'your_staging_host_here'}).`,
          is_required: true
        },
        {
          name: 'NOTIFICATION_WEBHOOK',
          description: 'Webhook URL for sending pipeline notifications (e.g., Slack, Teams).',
          is_required: !!notification_endpoint
        },
      ];
      
      for (const secret of standardSecrets) {
        await db.run(
          `INSERT INTO project_secrets (
            project_id,
            secret_name,
            secret_description,
            is_required
          ) VALUES (?, ?, ?, ?)`,
          [projectId, secret.name, secret.description, secret.is_required]
        );
      }
      
      if (custom_secrets && Array.isArray(custom_secrets)) {
        for (const secret of custom_secrets) {
          if (secret.name && secret.name.trim() !== '') {
            await db.run(
              `INSERT INTO project_secrets (
                project_id,
                secret_name,
                secret_description,
                is_required
              ) VALUES (?, ?, ?, ?)`,
              [projectId, secret.name.trim(), secret.description || '', false]
            );
          }
        }
      }
      await db.run('COMMIT');
    } catch (transactionError) {
      await db.run('ROLLBACK');
      console.error('Transaction error processing secrets:', transactionError);
      throw transactionError; 
    }
    
    res.status(201).json({
      success: true,
      message: 'Project onboarded successfully and configuration generated.',
      projectId: projectId,
    });

  } catch (error) {
    console.error('Error processing onboarding form:', error.message);
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        success: false,
        message: 'A project with this name or repository URL might already exist, or a secret name is duplicated for this project.',
        error: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: 'An error occurred while processing the onboarding form.',
      error: error.message
    });
  }
}

async function getAllProjects(req, res) {
  try {
    const projects = await db.all('SELECT id, project_name, repository_url, created_at FROM onboarded_projects ORDER BY created_at DESC');
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Error fetching onboarded projects:', error.message);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching onboarded projects.',
      error: error.message
    });
  }
}

async function getProjectById(req, res) {
  try {
    const { id } = req.params;
    if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ success: false, message: 'Invalid project ID.' });
    }
    
    const project = await db.get('SELECT * FROM onboarded_projects WHERE id = ?', [id]);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }
    
    const secrets = await db.all('SELECT id, secret_name, secret_description, is_required FROM project_secrets WHERE project_id = ? ORDER BY secret_name', [id]);
    project.secrets = secrets; 
    
    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Error fetching project details:', error.message);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching project details.',
      error: error.message
    });
  }
}

module.exports = {
  getOnboardingForm,
  processOnboardingForm,
  getAllProjects,
  getProjectById
};
