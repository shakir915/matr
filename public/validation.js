document.addEventListener('DOMContentLoaded', function() {
    const sameAddressCheckbox = document.getElementById('sameAddress');
    
    if (sameAddressCheckbox) {
        // Initialize on page load
        toggleCurrentAddressFields();
        
        sameAddressCheckbox.addEventListener('change', function() {
            toggleCurrentAddressFields();
        });
    }
});

function toggleCurrentAddressFields() {
    const sameAddressCheckbox = document.getElementById('sameAddress');
    const currentAddressFields = document.getElementById('currentAddressFields');
    const currentInputs = currentAddressFields.querySelectorAll('input');
    
    if (sameAddressCheckbox.checked) {
        // Hide fields and copy values from personal address
        currentAddressFields.style.display = 'none';
        
        // Remove required attribute when hidden
        currentInputs.forEach(input => {
            input.removeAttribute('required');
        });
        
        // Copy values from personal information
        copyPersonalToCurrentAddress();
    } else {
        // Show fields and clear values
        currentAddressFields.style.display = 'block';
        
        // Add required attribute when visible
        currentInputs.forEach(input => {
            input.setAttribute('required', 'required');
        });
        
        // Clear the fields
        clearCurrentAddress();
    }
}

function copyPersonalToCurrentAddress() {
    const place = document.getElementById('place').value;
    const district = document.getElementById('district').value;
    const state = document.getElementById('state').value;
    const country = document.getElementById('country').value;
    
    document.getElementById('currentPlace').value = place;
    document.getElementById('currentDistrict').value = district;
    document.getElementById('currentState').value = state;
    document.getElementById('currentCountry').value = country;
}

function clearCurrentAddress() {
    document.getElementById('currentPlace').value = '';
    document.getElementById('currentDistrict').value = '';
    document.getElementById('currentState').value = '';
    document.getElementById('currentCountry').value = '';
}