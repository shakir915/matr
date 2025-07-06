let currentUser = null;
let confirmationResult = null;
let googleAuthUser = null;
const ADMIN_NUMBER = "+1234567890";
const SECRET_HASH = "MTR" + Math.random().toString(36).substr(2, 8).toUpperCase();

document.addEventListener('DOMContentLoaded', function() {
    const loginRegisterBtn = document.getElementById('loginRegisterBtn');
    const authModal = document.getElementById('authModal');
    const passwordModal = document.getElementById('passwordModal');
    const activationModal = document.getElementById('activationModal');
    const closeBtns = document.querySelectorAll('.close');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    loginRegisterBtn.addEventListener('click', () => {
        authModal.style.display = 'block';
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabName + 'Tab').classList.add('active');
        });
    });

    document.getElementById('googleSignIn').addEventListener('click', signInWithGoogle);
    document.getElementById('googleSignUp').addEventListener('click', signUpWithGoogle);
    
    document.getElementById('emailLoginForm').addEventListener('submit', handleEmailLogin);
    document.getElementById('emailRegisterForm').addEventListener('submit', handleEmailRegister);
    document.getElementById('phoneLoginForm').addEventListener('submit', handlePhoneLogin);
    
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordForm);
    
    // Activation modal handlers
    document.getElementById('copyMessage').addEventListener('click', copyActivationMessage);
    document.getElementById('smsBtn').addEventListener('click', openSMS);
    document.getElementById('whatsappBtn').addEventListener('click', openWhatsApp);
    document.getElementById('activationDone').addEventListener('click', closeActivationModal);

    auth.onAuthStateChanged(function(user) {
        if (user) {
            currentUser = user;
            checkUserProfile(user);
        } else {
            currentUser = null;
        }
    });

    const features = document.querySelectorAll('.feature');
    features.forEach(feature => {
        feature.addEventListener('mouseenter', function() {
            this.style.background = 'linear-gradient(135deg, #e91e63 0%, #c2185b 100%)';
            this.style.color = 'white';
        });
        
        feature.addEventListener('mouseleave', function() {
            this.style.background = 'white';
            this.style.color = '#333';
        });
    });

    console.log('Free Matrimony app initialized and ready!');
});

async function signInWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        const user = result.user;
        authModal.style.display = 'none';
        await checkUserProfile(user);
    } catch (error) {
        console.error('Google sign-in error:', error);
        alert('Google sign-in failed. Please try again.');
    }
}

async function signUpWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        googleAuthUser = result.user;
        authModal.style.display = 'none';
        
        // Check if user already exists
        const userDoc = await db.collection('users').doc(googleAuthUser.uid).get();
        if (userDoc.exists) {
            currentUser = googleAuthUser;
            await checkUserProfile(googleAuthUser);
        } else {
            // New Google user - ask for password
            passwordModal.style.display = 'block';
        }
    } catch (error) {
        console.error('Google sign-up error:', error);
        alert('Google sign-up failed. Please try again.');
    }
}

async function handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const result = await auth.signInWithEmailAndPassword(email, password);
        authModal.style.display = 'none';
        await checkUserProfile(result.user);
    } catch (error) {
        console.error('Email login error:', error);
        alert('Login failed. Please check your credentials.');
    }
}

async function handleEmailRegister(e) {
    e.preventDefault();
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        const result = await auth.createUserWithEmailAndPassword(email, password);
        authModal.style.display = 'none';
        await checkUserProfile(result.user);
    } catch (error) {
        console.error('Email registration error:', error);
        alert('Registration failed: ' + error.message);
    }
}

async function handlePasswordForm(e) {
    e.preventDefault();
    const password = document.getElementById('googlePassword').value;
    const confirmPassword = document.getElementById('googleConfirmPassword').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    try {
        // Link password credential to Google account
        const credential = firebase.auth.EmailAuthProvider.credential(googleAuthUser.email, password);
        await googleAuthUser.linkWithCredential(credential);
        
        passwordModal.style.display = 'none';
        currentUser = googleAuthUser;
        await checkUserProfile(googleAuthUser);
    } catch (error) {
        console.error('Password linking error:', error);
        alert('Failed to set password: ' + error.message);
    }
}

async function handlePhoneLogin(e) {
    e.preventDefault();
    const phoneNumber = document.getElementById('phoneNumber').value;
    const password = document.getElementById('phonePassword').value;
    
    if (!phoneNumber || !password) {
        alert('Please enter both phone number and password');
        return;
    }

    try {
        // Find user by phone number
        const usersSnapshot = await db.collection('users')
            .where('phone', '==', phoneNumber)
            .get();
        
        if (usersSnapshot.empty) {
            alert('No account found with this phone number');
            return;
        }
        
        const userDoc = usersSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Try to sign in with email and password (since Firebase requires email for password auth)
        if (userData.email) {
            const result = await auth.signInWithEmailAndPassword(userData.email, password);
            authModal.style.display = 'none';
            await checkUserProfile(result.user);
        } else {
            alert('This account was created with a different method. Please use email login.');
        }
    } catch (error) {
        console.error('Phone login error:', error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            alert('Invalid password. Please try again.');
        } else {
            alert('Login failed. Please check your credentials.');
        }
    }
}




async function checkUserProfile(user) {
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            window.location.href = 'profile.html';
        } else {
            const userData = userDoc.data();
            if (!userData.isActive) {
                alert(`Your account is pending activation. Please send a message to ${ADMIN_NUMBER} with text: "ACTIVATE ${user.phoneNumber || user.email}"`);
                return;
            }
            
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('Error checking user profile:', error);
        window.location.href = 'profile.html';
    }
}


function showActivationModal() {
    document.getElementById('activationMessage').textContent = `ACTIVATE ${SECRET_HASH}`;
    activationModal.style.display = 'block';
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
    activationModal.style.display = 'none';
    alert('Thank you! Your account will be activated once we receive your message. You will be notified via email/SMS when activated.');
}