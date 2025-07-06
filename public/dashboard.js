let currentUser = null;
let selectedProfile = null;

document.addEventListener('DOMContentLoaded', function() {
    const navLinks = document.querySelectorAll('.nav-link');
    const dashboardSections = document.querySelectorAll('.dashboard-section');
    const searchBtn = document.getElementById('searchBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const profileModal = document.getElementById('profileModal');
    const closeBtns = document.querySelectorAll('.close');
    const sendRequestBtn = document.getElementById('sendRequestBtn');
    const cancelRequestBtn = document.getElementById('cancelRequestBtn');
    const requestTabs = document.querySelectorAll('.requests-tabs .tab-btn');

    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            checkUserAccess();
        } else {
            window.location.href = 'index.html';
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.id.replace('Tab', 'Section');
            
            if (link.id === 'logoutBtn') {
                logout();
                return;
            }
            
            navLinks.forEach(l => l.classList.remove('active'));
            dashboardSections.forEach(s => s.classList.remove('active'));
            
            link.classList.add('active');
            document.getElementById(targetId).classList.add('active');
            
            if (link.id === 'profileTab') {
                loadUserProfile();
            } else if (link.id === 'requestsTab') {
                loadRequests();
            }
        });
    });

    searchBtn.addEventListener('click', performSearch);
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        clearSearchPreferences();
        performSearch();
    });
    
    // Add religion change confirmation
    document.getElementById('searchReligion').addEventListener('change', handleReligionChange);
    
    // Add edit profile functionality
    document.getElementById('editProfileBtn').addEventListener('click', openEditProfile);
    document.getElementById('editProfileForm').addEventListener('submit', handleEditProfileSubmit);
    document.getElementById('editSameAddress').addEventListener('change', toggleEditCurrentAddressFields);
    
    logoutBtn.addEventListener('click', logout);

    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    sendRequestBtn.addEventListener('click', sendPhoneRequest);
    cancelRequestBtn.addEventListener('click', () => {
        profileModal.style.display = 'none';
    });

    requestTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            
            requestTabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.requests-list').forEach(list => list.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(tabName + 'Requests').classList.add('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
});

async function checkUserAccess() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (!userDoc.exists) {
            alert('Please complete your profile first.');
            window.location.href = 'index.html';
            return;
        }
        
        const userData = userDoc.data();
        if (!userData.isActive) {
            alert('Your account is not yet activated. Please contact admin.');
            logout();
            return;
        }
        
        loadInitialData();
    } catch (error) {
        console.error('Error checking user access:', error);
        alert('Error loading user data. Please try again.');
    }
}

async function loadInitialData() {
    await loadUserProfile();
    loadSearchPreferences();
    await performSearch();
    
    // Initialize requests containers
    document.getElementById('sentRequests').innerHTML = '<div class="no-results">Click on "Requests" tab to load your phone number requests.</div>';
    document.getElementById('receivedRequests').innerHTML = '<div class="no-results">Click on "Requests" tab to load your phone number requests.</div>';
}

async function performSearch() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultsGrid = document.getElementById('resultsGrid');
    
    loadingSpinner.style.display = 'block';
    resultsGrid.innerHTML = '';

    try {
        // Get current user's gender to search for opposite
        const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
        const currentUserData = currentUserDoc.data();
        const oppositeGender = currentUserData.gender === 'male' ? 'female' : 'male';

        const searchParams = {
            gender: oppositeGender,
            religion: document.getElementById('searchReligion').value,
            subGroup: document.getElementById('searchSubGroup').value.toLowerCase(),
            minAge: parseInt(document.getElementById('minAge').value) || 18,
            maxAge: parseInt(document.getElementById('maxAge').value) || 80,
            place: document.getElementById('searchPlace').value.toLowerCase(),
            district: document.getElementById('searchDistrict').value.toLowerCase(),
            state: document.getElementById('searchState').value.toLowerCase(),
            education: document.getElementById('searchEducation').value.toLowerCase(),
            profession: document.getElementById('searchProfession').value.toLowerCase(),
            maritalStatus: document.getElementById('searchMaritalStatus').value
        };

        let query = db.collection('users')
            .where('isActive', '==', true)
            .where('gender', '==', searchParams.gender);
        
        if (searchParams.maritalStatus) {
            query = query.where('maritalStatus', '==', searchParams.maritalStatus);
        }
        
        if (searchParams.religion) {
            query = query.where('religion', '==', searchParams.religion);
        }

        const snapshot = await query.get();
        const results = [];

        snapshot.forEach(doc => {
            const userData = doc.data();
            
            if (userData.uid === currentUser.uid) return;
            
            if (userData.age < searchParams.minAge || userData.age > searchParams.maxAge) return;
            
            if (searchParams.subGroup && !userData.subGroup.toLowerCase().includes(searchParams.subGroup)) return;
            if (searchParams.place && !userData.place.toLowerCase().includes(searchParams.place)) return;
            if (searchParams.district && !userData.district.toLowerCase().includes(searchParams.district)) return;
            if (searchParams.state && !userData.state.toLowerCase().includes(searchParams.state)) return;
            if (searchParams.education && !userData.education.toLowerCase().includes(searchParams.education)) return;
            if (searchParams.profession && !userData.profession.toLowerCase().includes(searchParams.profession)) return;
            
            results.push({ id: doc.id, ...userData });
        });

        displaySearchResults(results);
        saveSearchPreferences(searchParams);
        
    } catch (error) {
        console.error('Error performing search:', error);
        alert('Error searching profiles. Please try again.');
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

function displaySearchResults(results) {
    const resultsGrid = document.getElementById('resultsGrid');
    
    if (results.length === 0) {
        resultsGrid.innerHTML = '<div class="no-results">No profiles found matching your criteria.</div>';
        return;
    }

    resultsGrid.innerHTML = results.map(profile => `
        <div class="profile-card">
            <h4>${profile.fullName}</h4>
            <div class="profile-details">
                <div class="profile-detail">
                    <span><strong>Age:</strong></span>
                    <span>${profile.age}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>Gender:</strong></span>
                    <span>${profile.gender}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>Place:</strong></span>
                    <span>${profile.place}, ${profile.district}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>Education:</strong></span>
                    <span>${profile.education}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>Profession:</strong></span>
                    <span>${profile.profession}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>Height:</strong></span>
                    <span>${profile.height}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>Marital Status:</strong></span>
                    <span>${profile.maritalStatus}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>Father's Details:</strong></span>
                    <span>${profile.fatherDetails}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>Mother's Details:</strong></span>
                    <span>${profile.motherDetails}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>Siblings Details:</strong></span>
                    <span>${profile.siblingsDetails}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>Religion:</strong></span>
                    <span>${profile.religion} - ${profile.subGroup}</span>
                </div>
                <div class="profile-detail">
                    <span><strong>About:</strong></span>
                    <span>${profile.bio ? profile.bio.substring(0, 100) + (profile.bio.length > 100 ? '...' : '') : 'No bio available'}</span>
                </div>
            </div>
            <button class="btn" onclick="requestPhone('${profile.id}', '${profile.fullName}')">
                Request Phone Number
            </button>
        </div>
    `).join('');
}

async function requestPhone(profileId, profileName) {
    selectedProfile = { id: profileId, name: profileName };
    
    try {
        const existingRequest = await db.collection('phoneRequests')
            .where('fromUserId', '==', currentUser.uid)
            .where('toUserId', '==', profileId)
            .where('status', '==', 'pending')
            .get();
        
        if (!existingRequest.empty) {
            alert('You have already sent a request to this profile.');
            return;
        }
        
        document.getElementById('profileModal').style.display = 'block';
    } catch (error) {
        console.error('Error checking existing request:', error);
        alert('Error processing request. Please try again.');
    }
}

async function sendPhoneRequest() {
    if (!selectedProfile) return;
    
    const message = document.getElementById('requestMessage').value;
    
    try {
        await db.collection('phoneRequests').add({
            fromUserId: currentUser.uid,
            toUserId: selectedProfile.id,
            fromUserName: currentUser.displayName || currentUser.email,
            toUserName: selectedProfile.name,
            message: message,
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('profileModal').style.display = 'none';
        document.getElementById('requestMessage').value = '';
        alert('Phone number request sent successfully!');
        
    } catch (error) {
        console.error('Error sending request:', error);
        alert('Error sending request. Please try again.');
    }
}

async function loadUserProfile() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (!userDoc.exists) {
            alert('Profile not found.');
            return;
        }
        
        const userData = userDoc.data();
        const profileInfo = document.getElementById('profileInfo');
        
        profileInfo.innerHTML = `
            <div class="info-section">
                <h5>Personal Information</h5>
                <div class="profile-details">
                    <div class="profile-detail">
                        <span><strong>Name:</strong></span>
                        <span>${userData.fullName}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Phone:</strong></span>
                        <span>${userData.phone}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Gender:</strong></span>
                        <span>${userData.gender}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Age:</strong></span>
                        <span>${userData.age}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Place:</strong></span>
                        <span>${userData.place}, ${userData.district}, ${userData.state}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h5>Current Address</h5>
                <div class="profile-details">
                    <div class="profile-detail">
                        <span><strong>Current Location:</strong></span>
                        <span>${userData.currentPlace}, ${userData.currentDistrict}, ${userData.currentState}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h5>Personal Details</h5>
                <div class="profile-details">
                    <div class="profile-detail">
                        <span><strong>Education:</strong></span>
                        <span>${userData.education}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Profession:</strong></span>
                        <span>${userData.profession}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Height:</strong></span>
                        <span>${userData.height}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Complexion:</strong></span>
                        <span>${userData.complexion}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Marital Status:</strong></span>
                        <span>${userData.maritalStatus}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h5>Religious Details</h5>
                <div class="profile-details">
                    <div class="profile-detail">
                        <span><strong>Religion:</strong></span>
                        <span>${userData.religion}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Sub Group:</strong></span>
                        <span>${userData.subGroup}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Religious Details:</strong></span>
                        <span>${userData.religiousDetails || 'No religious details provided'}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h5>Family Information</h5>
                <div class="profile-details">
                    <div class="profile-detail">
                        <span><strong>Father's Details:</strong></span>
                        <span>${userData.fatherDetails}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Mother's Details:</strong></span>
                        <span>${userData.motherDetails}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Siblings Details:</strong></span>
                        <span>${userData.siblingsDetails}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h5>About Me</h5>
                <div class="profile-details">
                    <div class="profile-detail">
                        <span><strong>Bio:</strong></span>
                        <span>${userData.bio || 'No bio available'}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h5>Partner Preferences</h5>
                <div class="profile-details">
                    <div class="profile-detail">
                        <span><strong>Preferred Age:</strong></span>
                        <span>${userData.preferredAge}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Preferred Place:</strong></span>
                        <span>${userData.preferredPlace}</span>
                    </div>
                    <div class="profile-detail">
                        <span><strong>Preferred Profession:</strong></span>
                        <span>${userData.preferredProfession}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-section">
                <h5>Partner Expectations</h5>
                <div class="profile-details">
                    <div class="profile-detail">
                        <span><strong>Expectations:</strong></span>
                        <span>${userData.expectations || 'No expectations specified'}</span>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading profile:', error);
        alert('Error loading profile. Please try again.');
    }
}

async function loadRequests() {
    try {
        // Get sent requests
        const sentRequests = await db.collection('phoneRequests')
            .where('fromUserId', '==', currentUser.uid)
            .get();
        
        // Get received requests
        const receivedRequests = await db.collection('phoneRequests')
            .where('toUserId', '==', currentUser.uid)
            .get();
        
        displayRequests(sentRequests, 'sentRequests');
        displayRequests(receivedRequests, 'receivedRequests');
        
    } catch (error) {
        console.error('Error loading requests:', error);
        
        // Show empty state instead of error for better UX
        document.getElementById('sentRequests').innerHTML = '<div class="no-results">No requests found.</div>';
        document.getElementById('receivedRequests').innerHTML = '<div class="no-results">No requests found.</div>';
    }
}

function displayRequests(snapshot, containerId) {
    const container = document.getElementById(containerId);
    
    if (snapshot.empty) {
        container.innerHTML = '<div class="no-results">No requests found.</div>';
        return;
    }
    
    const isSent = containerId === 'sentRequests';
    
    // Convert to array and sort by created date (newest first)
    const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        data: doc.data()
    })).sort((a, b) => {
        const aTime = a.data.createdAt ? a.data.createdAt.seconds : 0;
        const bTime = b.data.createdAt ? b.data.createdAt.seconds : 0;
        return bTime - aTime; // Newest first
    });
    
    container.innerHTML = requests.map(item => {
        const request = item.data;
        const statusColor = request.status === 'approved' ? '#4caf50' : request.status === 'rejected' ? '#f44336' : '#ff9800';
        
        return `
            <div class="request-item">
                <h5>${isSent ? 'To: ' + (request.toUserName || 'Unknown') : 'From: ' + (request.fromUserName || 'Unknown')}</h5>
                <p><strong>Message:</strong> ${request.message || 'No message'}</p>
                <p><strong>Status:</strong> <span style="color: ${statusColor}">${request.status || 'pending'}</span></p>
                <p><strong>Date:</strong> ${request.createdAt ? new Date(request.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}</p>
                ${!isSent && request.status === 'pending' ? `
                    <div class="request-actions">
                        <button class="btn btn-approve" onclick="updateRequestStatus('${item.id}', 'approved')">Approve</button>
                        <button class="btn btn-reject" onclick="updateRequestStatus('${item.id}', 'rejected')">Reject</button>
                    </div>
                ` : ''}
                ${request.status === 'approved' ? `
                    <div class="phone-info">
                        <p><strong>Phone Number:</strong> <span id="phone-${item.id}">Loading...</span></p>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
    
    // Load phone numbers for approved requests
    requests.forEach(async (item) => {
        const request = item.data;
        if (request.status === 'approved') {
            try {
                // For sent requests, show the recipient's phone number
                // For received requests, show the sender's phone number
                const userIdToFetch = isSent ? request.toUserId : request.fromUserId;
                const userDoc = await db.collection('users').doc(userIdToFetch).get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    const phoneElement = document.getElementById(`phone-${item.id}`);
                    if (phoneElement) {
                        phoneElement.textContent = userData.phone || 'Phone not available';
                    }
                } else {
                    const phoneElement = document.getElementById(`phone-${item.id}`);
                    if (phoneElement) {
                        phoneElement.textContent = 'User not found';
                    }
                }
            } catch (error) {
                console.error('Error loading phone number:', error);
                const phoneElement = document.getElementById(`phone-${item.id}`);
                if (phoneElement) {
                    phoneElement.textContent = 'Error loading phone';
                }
            }
        }
    });
}

async function updateRequestStatus(requestId, status) {
    try {
        const updateData = { status: status };
        
        await db.collection('phoneRequests').doc(requestId).update(updateData);
        
        alert(`Request ${status} successfully!`);
        loadRequests();
        
    } catch (error) {
        console.error('Error updating request status:', error);
        alert('Error updating request. Please try again.');
    }
}

function saveSearchPreferences(searchParams) {
    try {
        const prefsToSave = {
            religion: searchParams.religion,
            subGroup: document.getElementById('searchSubGroup').value,
            minAge: searchParams.minAge,
            maxAge: searchParams.maxAge,
            place: document.getElementById('searchPlace').value,
            district: document.getElementById('searchDistrict').value,
            state: document.getElementById('searchState').value,
            education: document.getElementById('searchEducation').value,
            profession: document.getElementById('searchProfession').value,
            maritalStatus: searchParams.maritalStatus
        };
        
        localStorage.setItem('matrimonySearchPrefs', JSON.stringify(prefsToSave));
    } catch (error) {
        console.error('Error saving search preferences:', error);
    }
}

function loadSearchPreferences() {
    try {
        const savedPrefs = localStorage.getItem('matrimonySearchPrefs');
        if (savedPrefs) {
            const prefs = JSON.parse(savedPrefs);
            
            // Restore form values
            if (prefs.religion) document.getElementById('searchReligion').value = prefs.religion;
            if (prefs.subGroup) document.getElementById('searchSubGroup').value = prefs.subGroup;
            if (prefs.minAge) document.getElementById('minAge').value = prefs.minAge;
            if (prefs.maxAge) document.getElementById('maxAge').value = prefs.maxAge;
            if (prefs.place) document.getElementById('searchPlace').value = prefs.place;
            if (prefs.district) document.getElementById('searchDistrict').value = prefs.district;
            if (prefs.state) document.getElementById('searchState').value = prefs.state;
            if (prefs.education) document.getElementById('searchEducation').value = prefs.education;
            if (prefs.profession) document.getElementById('searchProfession').value = prefs.profession;
            if (prefs.maritalStatus) document.getElementById('searchMaritalStatus').value = prefs.maritalStatus;
        }
    } catch (error) {
        console.error('Error loading search preferences:', error);
    }
}

function clearSearchPreferences() {
    try {
        localStorage.removeItem('matrimonySearchPrefs');
        
        // Clear form values
        document.getElementById('searchReligion').value = '';
        document.getElementById('searchSubGroup').value = '';
        document.getElementById('minAge').value = '';
        document.getElementById('maxAge').value = '';
        document.getElementById('searchPlace').value = '';
        document.getElementById('searchDistrict').value = '';
        document.getElementById('searchState').value = '';
        document.getElementById('searchEducation').value = '';
        document.getElementById('searchProfession').value = '';
        document.getElementById('searchMaritalStatus').value = '';
    } catch (error) {
        console.error('Error clearing search preferences:', error);
    }
}

let previousReligion = '';

function handleReligionChange(e) {
    const currentReligion = e.target.value;
    const savedPrefs = localStorage.getItem('matrimonySearchPrefs');
    
    // If there are saved preferences and religion is being changed from a saved value
    if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        if (prefs.religion && prefs.religion !== currentReligion && currentReligion !== '') {
            const confirmed = confirm(`Are you sure you want to change religion filter from "${getReligionDisplayName(prefs.religion)}" to "${getReligionDisplayName(currentReligion)}"? This will clear your current search results.`);
            
            if (!confirmed) {
                // Revert to previous value
                e.target.value = prefs.religion;
                return;
            }
        }
    }
    
    // If changing from a previously set religion
    if (previousReligion && previousReligion !== currentReligion && currentReligion !== '') {
        const confirmed = confirm(`Are you sure you want to change religion filter? This will update your search results.`);
        
        if (!confirmed) {
            e.target.value = previousReligion;
            return;
        }
    }
    
    previousReligion = currentReligion;
    
    // Auto-search when religion changes (after confirmation)
    if (currentReligion !== '') {
        performSearch();
    }
}

function getReligionDisplayName(religionValue) {
    const religionNames = {
        'hinduism': 'Hinduism',
        'islam': 'Islam', 
        'christianity': 'Christianity',
        'sikhism': 'Sikhism',
        'buddhism': 'Buddhism',
        'jainism': 'Jainism',
        'judaism': 'Judaism',
        'zoroastrianism': 'Zoroastrianism',
        'other': 'Other'
    };
    return religionNames[religionValue] || religionValue;
}

async function openEditProfile() {
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        
        if (!userDoc.exists) {
            alert('Profile not found.');
            return;
        }
        
        const userData = userDoc.data();
        
        // Populate form fields with current data
        document.getElementById('editFullName').value = userData.fullName || '';
        document.getElementById('editPhoneNumber').value = userData.phone || '';
        document.getElementById('editGender').value = userData.gender || '';
        document.getElementById('editAge').value = userData.age || '';
        document.getElementById('editPlace').value = userData.place || '';
        document.getElementById('editDistrict').value = userData.district || '';
        document.getElementById('editState').value = userData.state || '';
        document.getElementById('editCountry').value = userData.country || '';
        
        document.getElementById('editCurrentPlace').value = userData.currentPlace || '';
        document.getElementById('editCurrentDistrict').value = userData.currentDistrict || '';
        document.getElementById('editCurrentState').value = userData.currentState || '';
        document.getElementById('editCurrentCountry').value = userData.currentCountry || '';
        
        document.getElementById('editReligion').value = userData.religion || '';
        document.getElementById('editSubGroup').value = userData.subGroup || '';
        document.getElementById('editReligiousDetails').value = userData.religiousDetails || '';
        
        document.getElementById('editEducation').value = userData.education || '';
        document.getElementById('editProfession').value = userData.profession || '';
        document.getElementById('editComplexion').value = userData.complexion || '';
        document.getElementById('editHeight').value = userData.height || '';
        document.getElementById('editMaritalStatus').value = userData.maritalStatus || '';
        document.getElementById('editNumChildren').value = userData.numChildren || '';
        
        document.getElementById('editFatherDetails').value = userData.fatherDetails || '';
        document.getElementById('editMotherDetails').value = userData.motherDetails || '';
        document.getElementById('editSiblingsDetails').value = userData.siblingsDetails || '';
        
        document.getElementById('editBio').value = userData.bio || '';
        document.getElementById('editPreferredAge').value = userData.preferredAge || '';
        document.getElementById('editPreferredPlace').value = userData.preferredPlace || '';
        document.getElementById('editPreferredProfession').value = userData.preferredProfession || '';
        document.getElementById('editExpectations').value = userData.expectations || '';
        
        // Check if current address is same as personal address
        const sameAddress = userData.currentPlace === userData.place && 
                          userData.currentDistrict === userData.district &&
                          userData.currentState === userData.state &&
                          userData.currentCountry === userData.country;
        
        document.getElementById('editSameAddress').checked = sameAddress;
        toggleEditCurrentAddressFields();
        
        document.getElementById('editProfileModal').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading profile for editing:', error);
        alert('Error loading profile. Please try again.');
    }
}

function toggleEditCurrentAddressFields() {
    const sameAddressCheckbox = document.getElementById('editSameAddress');
    const currentAddressFields = document.getElementById('editCurrentAddressFields');
    const currentInputs = currentAddressFields.querySelectorAll('input');
    
    if (sameAddressCheckbox.checked) {
        currentAddressFields.style.display = 'none';
        currentInputs.forEach(input => {
            input.removeAttribute('required');
        });
        
        // Copy values from personal information
        document.getElementById('editCurrentPlace').value = document.getElementById('editPlace').value;
        document.getElementById('editCurrentDistrict').value = document.getElementById('editDistrict').value;
        document.getElementById('editCurrentState').value = document.getElementById('editState').value;
        document.getElementById('editCurrentCountry').value = document.getElementById('editCountry').value;
    } else {
        currentAddressFields.style.display = 'block';
        currentInputs.forEach(input => {
            input.setAttribute('required', 'required');
        });
    }
}

async function handleEditProfileSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please log in first');
        return;
    }

    const formData = {
        fullName: document.getElementById('editFullName').value,
        phone: document.getElementById('editPhoneNumber').value,
        gender: document.getElementById('editGender').value,
        age: parseInt(document.getElementById('editAge').value),
        place: document.getElementById('editPlace').value,
        district: document.getElementById('editDistrict').value,
        state: document.getElementById('editState').value,
        country: document.getElementById('editCountry').value,
        currentPlace: document.getElementById('editCurrentPlace').value,
        currentDistrict: document.getElementById('editCurrentDistrict').value,
        currentState: document.getElementById('editCurrentState').value,
        currentCountry: document.getElementById('editCurrentCountry').value,
        religion: document.getElementById('editReligion').value,
        subGroup: document.getElementById('editSubGroup').value,
        religiousDetails: document.getElementById('editReligiousDetails').value,
        education: document.getElementById('editEducation').value,
        profession: document.getElementById('editProfession').value,
        complexion: document.getElementById('editComplexion').value,
        height: document.getElementById('editHeight').value,
        maritalStatus: document.getElementById('editMaritalStatus').value,
        numChildren: parseInt(document.getElementById('editNumChildren').value) || 0,
        fatherDetails: document.getElementById('editFatherDetails').value,
        motherDetails: document.getElementById('editMotherDetails').value,
        siblingsDetails: document.getElementById('editSiblingsDetails').value,
        bio: document.getElementById('editBio').value,
        preferredAge: document.getElementById('editPreferredAge').value,
        preferredPlace: document.getElementById('editPreferredPlace').value,
        preferredProfession: document.getElementById('editPreferredProfession').value,
        expectations: document.getElementById('editExpectations').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('users').doc(currentUser.uid).update(formData);
        document.getElementById('editProfileModal').style.display = 'none';
        alert('Profile updated successfully!');
        
        // Reload the profile section
        await loadUserProfile();
        
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
    }
}

async function logout() {
    try {
        await auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out. Please try again.');
    }
}