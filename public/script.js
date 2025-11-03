class MpesaPayment {
    constructor() {
        this.form = document.getElementById('paymentForm');
        this.messageDiv = document.getElementById('message');
        this.payButton = document.getElementById('payButton');
        this.originalButtonText = this.payButton.textContent;
        
        this.init();
    }
    
    init() {
        this.form.addEventListener('submit', (e) => this.handlePayment(e));
    }
    
    async handlePayment(e) {
        e.preventDefault();
        
        const phone = document.getElementById('phone').value;
        const amount = document.getElementById('amount').value;
        
        // Validate inputs
        if (!this.validateInputs(phone, amount)) {
            return;
        }
        
        this.showLoading();
        this.hideMessage();
        
        try {
            const response = await fetch('/api/initiate-payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: phone,
                    amount: amount
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage('STK Push sent to your phone. Please check your device and enter your M-Pesa PIN.', 'success');
                this.form.reset();
            } else {
                this.showMessage(data.error?.errorMessage || 'Payment initiation failed. Please try again.', 'error');
            }
            
        } catch (error) {
            console.error('Payment error:', error);
            this.showMessage('Network error. Please check your connection and try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }
    
    validateInputs(phone, amount) {
        // Basic phone validation for Kenya
        const phoneRegex = /^(07\d{8}|01\d{8}|2547\d{8}|2541\d{8}|\+2547\d{8}|\+2541\d{8})$/;
        if (!phoneRegex.test(phone)) {
            this.showMessage('Please enter a valid Kenyan phone number (e.g., 07..., 01..., +2541... OR +2547...)', 'error');
            return false;
        }
        
        // Amount validation
        if (amount < 1 || amount > 100000) {
            this.showMessage('Amount must be between KES 1 and KES 100,000', 'error');
            return false;
        }
        
        return true;
    }
    
    showLoading() {
        this.payButton.disabled = true;
        this.payButton.innerHTML = '<span class="loading"></span>Processing...';
    }
    
    hideLoading() {
        this.payButton.disabled = false;
        this.payButton.textContent = this.originalButtonText;
    }
    
    showMessage(message, type) {
        this.messageDiv.textContent = message;
        this.messageDiv.className = `message ${type}`;
        this.messageDiv.style.display = 'block';
        
        // Auto-hide success messages after 10 seconds
        if (type === 'success') {
            setTimeout(() => {
                this.hideMessage();
            }, 10000);
        }
    }
    
    hideMessage() {
        this.messageDiv.style.display = 'none';
    }
}

// Initialize the payment system when page loads
document.addEventListener('DOMContentLoaded', () => {
    new MpesaPayment();
});