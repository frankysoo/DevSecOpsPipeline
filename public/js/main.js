// Main JavaScript file for the DevSecOps Pipeline Demo

document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations for elements with 'animate-in' class
    const animateElements = document.querySelectorAll('.animate-in');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 100);
    });

    // Add active class to current navigation item
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.parentElement.classList.add('active');
        }
    });

    // Handle pipeline stage clicks to show more details
    const pipelineStages = document.querySelectorAll('.pipeline-stage');
    pipelineStages.forEach(stage => {
        stage.addEventListener('click', function() {
            // Scroll to the corresponding section if on pipeline page
            const stageId = this.getAttribute('id');
            if (stageId) {
                const targetSection = document.querySelector(`section h2:contains('${stageId.charAt(0).toUpperCase() + stageId.slice(1)} Stage')`);
                if (targetSection) {
                    targetSection.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    });

    // Simulate a terminal typing effect for the last terminal element if found
    const terminalElements = document.querySelectorAll('.terminal pre');
    if (terminalElements.length > 0) {
        const lastTerminal = terminalElements[terminalElements.length - 1];
        const originalText = lastTerminal.textContent;
        
        // Only apply the effect to terminals with reasonable text length
        if (originalText.length < 500) {
            lastTerminal.textContent = '';
            let i = 0;
            
            function typeEffect() {
                if (i < originalText.length) {
                    lastTerminal.textContent += originalText.charAt(i);
                    i++;
                    setTimeout(typeEffect, 15);
                }
            }
            
            // Uncomment to enable typing effect (commented out for demo purposes)
            // typeEffect();
        }
    }

    // Add current year to footer copyright
    const footerYearElement = document.querySelector('.footer-bottom p');
    if (footerYearElement && footerYearElement.textContent.includes('{{currentYear}}')) {
        const currentYear = new Date().getFullYear();
        footerYearElement.textContent = footerYearElement.textContent.replace('{{currentYear}}', currentYear);
    }

    // Populate artifact information if available
    const artifactInfo = {
        name: 'devsecops-demo-app',
        version: 'demo-version-1.0',
        environment: 'staging',
        timestamp: new Date().toLocaleString()
    };

    document.querySelectorAll('*[data-artifact-info]').forEach(el => {
        const infoType = el.getAttribute('data-artifact-info');
        if (artifactInfo[infoType]) {
            el.textContent = artifactInfo[infoType];
        }
    });

    // Replace any date placeholder in the page
    document.querySelectorAll('*').forEach(el => {
        if (el.childNodes && el.childNodes.length === 1 && el.childNodes[0].nodeType === 3) {
            if (el.textContent.includes('{{artifact.timestamp}}')) {
                el.textContent = el.textContent.replace('{{artifact.timestamp}}', new Date().toLocaleString());
            }
        }
    });

    // Add interactivity to pipeline logs
    const pipelineLogs = document.querySelector('.pipeline-logs');
    if (pipelineLogs) {
        // Add a filter feature for logs
        const logFilterContainer = document.createElement('div');
        logFilterContainer.className = 'log-filter';
        logFilterContainer.innerHTML = `
            <div style="margin-bottom: 10px;">
                <span>Filter logs: </span>
                <button class="btn-filter-all" style="margin-right: 5px; padding: 3px 8px; background: #34495e; color: white; border: none; border-radius: 3px; cursor: pointer;">All</button>
                <button class="btn-filter-success" style="margin-right: 5px; padding: 3px 8px; background: #27ae60; color: white; border: none; border-radius: 3px; cursor: pointer;">Success</button>
                <button class="btn-filter-error" style="margin-right: 5px; padding: 3px 8px; background: #c0392b; color: white; border: none; border-radius: 3px; cursor: pointer;">Errors</button>
            </div>
        `;
        pipelineLogs.parentNode.insertBefore(logFilterContainer, pipelineLogs);

        // Add event listeners to filter buttons
        logFilterContainer.querySelector('.btn-filter-all').addEventListener('click', function() {
            document.querySelectorAll('.log-line').forEach(log => {
                log.style.display = 'block';
            });
        });

        logFilterContainer.querySelector('.btn-filter-success').addEventListener('click', function() {
            document.querySelectorAll('.log-line').forEach(log => {
                if (log.classList.contains('log-line-success')) {
                    log.style.display = 'block';
                } else {
                    log.style.display = 'none';
                }
            });
        });

        logFilterContainer.querySelector('.btn-filter-error').addEventListener('click', function() {
            document.querySelectorAll('.log-line').forEach(log => {
                if (log.classList.contains('log-line-error')) {
                    log.style.display = 'block';
                } else {
                    log.style.display = 'none';
                }
            });
        });
    }
});