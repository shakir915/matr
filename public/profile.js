let currentUser = null;
const ADMIN_NUMBER = "+1234567890";
const SECRET_HASH = "MTR" + Math.random().toString(36).substr(2, 8).toUpperCase();

document.addEventListener('DOMContentLoaded', function() {
    const profileForm = document.getElementById('profileForm');
    const activationModal = document.getElementById('activationModal');
    const backToLoginBtn = document.getElementById('backToLogin');
    const sameAddressCheckbox = document.getElementById('sameAddress');
    const currentAddressFields = document.getElementById('currentAddressFields');
    const closeBtns = document.querySelectorAll('.close');

    // Check if user is authenticated
    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            // Check if user already has a profile
            checkExistingProfile(user);
        } else {
            // Redirect to login if not authenticated
            window.location.href = 'index.html';
        }
    });

    // Handle same address checkbox
    sameAddressCheckbox.addEventListener('change', function() {
        if (this.checked) {
            currentAddressFields.style.display = 'none';
            // Copy values from personal information
            document.getElementById('currentPlace').value = document.getElementById('place').value;
            document.getElementById('currentDistrict').value = document.getElementById('district').value;
            document.getElementById('currentState').value = document.getElementById('state').value;
            document.getElementById('currentCountry').value = document.getElementById('country').value;
        } else {
            currentAddressFields.style.display = 'block';
        }
    });

    // Update current address when personal info changes
    ['place', 'district', 'state', 'country'].forEach(fieldId => {
        document.getElementById(fieldId).addEventListener('input', function() {
            if (sameAddressCheckbox.checked) {
                const currentFieldId = 'current' + fieldId.charAt(0).toUpperCase() + fieldId.slice(1);
                document.getElementById(currentFieldId).value = this.value;
            }
        });
    });

    // Handle form submission
    profileForm.addEventListener('submit', handleProfileSubmit);

    // Handle back to login
    backToLoginBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to go back? Your form data will be lost.')) {
            window.location.href = 'index.html';
        }
    });

    // Handle modal close
    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    // Handle activation modal buttons
    document.getElementById('copyMessage').addEventListener('click', copyActivationMessage);
    document.getElementById('smsBtn').addEventListener('click', openSMS);
    document.getElementById('whatsappBtn').addEventListener('click', openWhatsApp);
    document.getElementById('activationDone').addEventListener('click', closeActivationModal);

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
});

async function checkExistingProfile(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.isActive) {
                // User already has an active profile, redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                // Profile exists but not activated
                alert(`Your account is pending activation. Please send a message to ${ADMIN_NUMBER} with text: "ACTIVATE ${user.phoneNumber || user.email}"`);
            }
        }
        // If no profile exists, stay on this page to create one
    } catch (error) {
        console.error('Error checking user profile:', error);
        // Stay on profile page if there's an error
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        alert('Please log in first');
        window.location.href = 'index.html';
        return;
    }

    // Validate required fields
    const requiredFields = [
        'fullName', 'profilePhoneNumber', 'gender', 'age', 'place', 'district', 'state', 'country',
        'religion', 'subGroup', 'religiousDetails', 'education', 'profession', 'complexion', 
        'height', 'maritalStatus', 'fatherDetails', 'motherDetails', 'siblingsDetails', 
        'bio', 'preferredAge', 'preferredPlace', 'preferredProfession', 'expectations'
    ];

    for (let fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            alert(`Please fill in the ${field.previousElementSibling.textContent} field`);
            field.focus();
            return;
        }
    }

    const formData = {
        uid: currentUser.uid,
        email: currentUser.email,
        phone: document.getElementById('profilePhoneNumber').value,
        fullName: document.getElementById('fullName').value,
        gender: document.getElementById('gender').value,
        age: parseInt(document.getElementById('age').value),
        place: document.getElementById('place').value,
        district: document.getElementById('district').value,
        state: document.getElementById('state').value,
        country: document.getElementById('country').value,
        currentPlace: document.getElementById('currentPlace').value || document.getElementById('place').value,
        currentDistrict: document.getElementById('currentDistrict').value || document.getElementById('district').value,
        currentState: document.getElementById('currentState').value || document.getElementById('state').value,
        currentCountry: document.getElementById('currentCountry').value || document.getElementById('country').value,
        religion: document.getElementById('religion').value,
        subGroup: document.getElementById('subGroup').value,
        religiousDetails: document.getElementById('religiousDetails').value,
        education: document.getElementById('education').value,
        profession: document.getElementById('profession').value,
        complexion: document.getElementById('complexion').value,
        height: document.getElementById('height').value,
        maritalStatus: document.getElementById('maritalStatus').value,
        numChildren: parseInt(document.getElementById('numChildren').value) || 0,
        fatherDetails: document.getElementById('fatherDetails').value,
        motherDetails: document.getElementById('motherDetails').value,
        siblingsDetails: document.getElementById('siblingsDetails').value,
        bio: document.getElementById('bio').value,
        preferredAge: document.getElementById('preferredAge').value,
        preferredPlace: document.getElementById('preferredPlace').value,
        preferredProfession: document.getElementById('preferredProfession').value,
        expectations: document.getElementById('expectations').value,
        isActive: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('users').doc(currentUser.uid).set(formData);
        showActivationModal();
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Error saving profile. Please try again.');
    }
}

function showActivationModal() {
    document.getElementById('activationMessage').textContent = `ACTIVATE ${SECRET_HASH}`;
    document.getElementById('activationModal').style.display = 'block';
}

function copyActivationMessage() {
    const message = document.getElementById('activationMessage').textContent;
    navigator.clipboard.writeText(message).then(() => {
        const btn = document.getElementById('copyMessage');
        const originalText = btn.textContent;
        btn.textContent = '✓';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(() => {
        alert('Could not copy to clipboard. Please copy manually: ' + message);
    });
}

function openSMS() {
    const message = document.getElementById('activationMessage').textContent;
    const adminNumber = ADMIN_NUMBER.replace('+', '');
    window.open(`sms:${adminNumber}?body=${encodeURIComponent(message)}`, '_blank');
}

function openWhatsApp() {
    const message = document.getElementById('activationMessage').textContent;
    const adminNumber = ADMIN_NUMBER.replace('+', '');
    window.open(`https://wa.me/${adminNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

function closeActivationModal() {
    document.getElementById('activationModal').style.display = 'none';
    alert('Thank you! Your account will be activated once we receive your message. You will be notified via email/SMS when activated.');
    window.location.href = 'index.html';
}