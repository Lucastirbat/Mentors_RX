// Sheetson Configuration
const SHEETSON_API_KEY = "5JpEUrbee6a4LX-E7y65Q_7TbRCYrBP0LXoRwKU8gJeKEcOGaOWbzKaR4bo";
const SPREADSHEET_ID = "1efDT8_KOfiWDyP_rv8Js2Sp7JGplBCcaEYg8QMQqxps";
const SHEET_NAME = 'Startups';
const SHEET_MENTORS = 'Mentors';

// API endpoints
const STARTUPS_URL = `https://api.sheetson.com/v2/sheets/${SHEET_NAME}`;
const MENTORS_URL = `https://api.sheetson.com/v2/sheets/${SHEET_MENTORS}`;

// Move all DOM-related code inside DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    // Global state
    let currentMentor = null;

    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const loginContainer = document.getElementById('loginContainer');
    const startupsContainer = document.getElementById('startupsContainer');
    const dataList = document.getElementById('dataList');
    const lockButton = document.getElementById('lockButton');

    // Login functionality
    async function attemptLogin(mentorName, password) {
        try {
            const response = await fetch(`${MENTORS_URL}?limit=100&skip&fields=Password,Mentor Name,Short Name,Email,Linkedin,Status Reviewed,Credentials,Preferred Startups`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${SHEETSON_API_KEY}`,
                    'X-Spreadsheet-Id': SPREADSHEET_ID,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            const data = await response.json();
            
            // Find the mentor
            const foundMentor = data.results.find(m => 
                m['Mentor Name'] === mentorName && 
                m.Password === password
            );

            if (!foundMentor) {
                throw new Error('Invalid credentials. Please check your mentor name and password.');
            }

            // Debug: Log the mentor's status
            console.log('Mentor found:', foundMentor);
            console.log('Status Reviewed value:', foundMentor['Status Reviewed']);
            
            // Check if Status Reviewed exists and is specifically 'Reviewed'
            if (foundMentor['Status Reviewed'] && 
                foundMentor['Status Reviewed'].trim() === 'Reviewed') {
                throw new Error('You have already submitted your startup selections.');
            }

            // If we get here, the mentor can log in
            currentMentor = foundMentor;
            loginContainer.style.display = 'none';
            startupsContainer.style.display = 'block';
            fetchEntries();

        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed: ' + error.message);
        }
    }

    // Add this function to create and manage the spinner
    function showSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'spinner-overlay';
        spinner.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(spinner);
    }

    function hideSpinner() {
        const spinner = document.querySelector('.spinner-overlay');
        if (spinner) {
            spinner.remove();
        }
    }

    // Update the fetchEntries function to use the spinner
    async function fetchEntries() {
        try {
            showSpinner(); // Show spinner before fetching
            let allResults = [];
            let currentPage = 1;
            let hasMoreData = true;

            while (hasMoreData) {
                const response = await fetch(`${STARTUPS_URL}?limit=100&skip=${(currentPage - 1) * 100}`, {
                    headers: {
                        'Authorization': `Bearer ${SHEETSON_API_KEY}`,
                        'X-Spreadsheet-Id': SPREADSHEET_ID,
                        'Content-Type': 'application/json'
                    }
                });
                
                const data = await response.json();
                if (!data.results || data.results.length === 0) {
                    hasMoreData = false;
                } else {
                    allResults = allResults.concat(data.results);
                    currentPage++;
                }
            }

            if (allResults.length === 0) {
                throw new Error('No results found');
            }
            
            displayEntries(allResults);
        } catch (error) {
            console.error('Error details:', error);
            alert(`Failed to fetch entries: ${error.message}`);
        } finally {
            hideSpinner(); // Hide spinner after everything is done
        }
    }

    // Display entries with selection functionality
    function displayEntries(entries) {
        dataList.innerHTML = '';
        entries.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'entry';
            
            const getLocation = () => {
                const parts = [];
                if (entry.city) parts.push(entry.city);
                if (entry.country) parts.push(entry.country);
                return parts.join(', ');
            };

            const location = getLocation();
            
            entryDiv.innerHTML = `
                <div class="heart-button" data-name="${entry.name}">
                    ❤
                    <span>Mark as<br>favorite</span>
                </div>
                <div class="entry-content">
                    <h3>${entry['Name of your startup'] || entry.name}</h3>
                    <div class="startup-details">
                        ${location ? `<p><strong>Location:</strong> ${location}</p>` : ''}
                        ${entry.website ? `<p><strong>Website:</strong> <a href="${entry.website}" target="_blank">${entry.website}</a></p>` : ''}
                        ${entry.sectors ? `<p><strong>Sectors:</strong> ${entry.sectors}</p>` : ''}
                        ${entry.stage ? `<p><strong>Stage:</strong> ${entry.stage}</p>` : ''}
                    </div>
                    ${(entry.deck || entry['Link to your deck if it\'s a link format (optional)'] || entry.Video) ? `
                        <div class="startup-materials">
                            ${entry.deck ? `
                                <a href="${entry.deck}" target="_blank" class="material-button deck">
                                    📄 View Full Pitch Deck
                                </a>` : ''}
                            ${entry['Link to your deck if it\'s a link format (optional)'] ? `
                                <a href="${entry['Link to your deck if it\'s a link format (optional)']}" 
                                   target="_blank" class="material-button deck">
                                    📄 View Deck Link
                                </a>` : ''}
                            ${entry.Video ? `
                                <a href="${entry.Video}" target="_blank" class="material-button video">
                                    🎥 Watch Pitch Video
                                </a>` : ''}
                        </div>
                    ` : ''}
                </div>
            `;
            dataList.appendChild(entryDiv);

            // Add heart button functionality with animation
            const heartButton = entryDiv.querySelector('.heart-button');
            heartButton.addEventListener('click', function() {
                this.classList.toggle('active');
                if (this.classList.contains('active')) {
                    this.style.transform = 'scale(1.2)';
                    setTimeout(() => this.style.transform = 'scale(1.1)', 200);
                } else {
                    this.style.transform = 'scale(1)';
                }
            });
        });
    }

    // Lock in selections
    async function lockSelections() {
        // Add confirmation dialog
        const confirmed = confirm("Once you've selected your favorites, you can't review other startups anymore. Are you sure you want to continue?");
        
        if (!confirmed) {
            return; // Exit if user cancels
        }

        try {
            const selectedStartups = Array.from(document.querySelectorAll('.heart-button.active'))
                .map(button => button.dataset.name)
                .join(', ');

            const response = await fetch(`${MENTORS_URL}/${currentMentor.rowIndex}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${SHEETSON_API_KEY}`,
                    'X-Spreadsheet-Id': SPREADSHEET_ID,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    'Status Reviewed': 'Reviewed',  // Updated field name
                    'Preferred Startups': selectedStartups
                })
            });

            if (response.ok) {
                alert('Thank you for your selections!');
                window.location.reload(); // Reload page to show login screen
            } else {
                throw new Error('Failed to update selections');
            }
        } catch (error) {
            console.error('Error locking selections:', error);
            alert('Failed to lock selections: ' + error.message);
        }
    }

    // Update the addFloatingButton function
    function addFloatingButton() {
        const floatingButton = document.createElement('button');
        floatingButton.className = 'floating-button';
        floatingButton.innerHTML = 'Lock in my favorites';
        floatingButton.title = 'Click to finalize your startup selections';
        floatingButton.addEventListener('click', lockSelections);
        document.body.appendChild(floatingButton);
    }

    // Event Listeners
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mentorName = document.getElementById('mentorName').value;
        const password = document.getElementById('password').value;
        await attemptLogin(mentorName, password);
    });

    // Add floating button instead of the regular button
    addFloatingButton();

    // Initial state
    startupsContainer.style.display = 'none';
});
