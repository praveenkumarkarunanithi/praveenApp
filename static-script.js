// Global variables
let customers = [
  {
    "name": "Murugan Fish Mart",
    "balance": 1500,
    "phone": "+919876543210"
  },
  {
    "name": "Selva Seafoods",
    "balance": 2500,
    "phone": "+919876543211"
  },
  {
    "name": "Kannan Traders",
    "balance": 800,
    "phone": "+919876543212"
  },
  {
    "name": "Raja Fish Center",
    "balance": 3200,
    "phone": "+919876543213"
  },
  {
    "name": "Kumaran Exports",
    "balance": 0,
    "phone": "+919876543214"
  }
];

let currentBillData = null;
let generatedPdfBlob = null; // Store the PDF blob for sharing

// DOM elements
const customerSelect = document.getElementById('customerName');
const oldBalanceInput = document.getElementById('oldBalance');
const quantityInput = document.getElementById('quantity');
const rateInput = document.getElementById('rate');
const amountInput = document.getElementById('amount');
const paymentMadeInput = document.getElementById('paymentMade');
const remainingBalanceInput = document.getElementById('remainingBalance');
const dateInput = document.getElementById('date');
const ownerPhoneInput = document.getElementById('ownerPhone');
const ownerNameInput = document.getElementById('ownerName');
const billingForm = document.getElementById('billingForm');
const generateBillBtn = document.getElementById('generateBillBtn');
const whatsappBtn = document.getElementById('whatsappBtn');
const successMessage = document.getElementById('successMessage');
const loadingOverlay = document.getElementById('loadingOverlay');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Set current date
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    
    // Load customers (static data)
    loadCustomers();
    
    // Setup event listeners
    setupEventListeners();
}

function loadCustomers() {
    try {
        // Populate customer dropdown with static data
        customerSelect.innerHTML = '<option value="">Select Customer</option>';
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.name;
            option.textContent = customer.name;
            option.dataset.balance = customer.balance;
            option.dataset.phone = customer.phone;
            customerSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading customers:', error);
        showNotification('Error loading customers', 'error');
    }
}

function setupEventListeners() {
    // Customer selection
    customerSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption.dataset.balance) {
            oldBalanceInput.value = selectedOption.dataset.balance;
        } else {
            oldBalanceInput.value = '';
        }
        calculateBalances();
    });
    
    // Quantity and rate inputs for amount calculation
    quantityInput.addEventListener('input', calculateAmount);
    rateInput.addEventListener('input', calculateAmount);
    
    // Payment input for balance calculation
    paymentMadeInput.addEventListener('input', calculateBalances);
    
    // Owner phone number formatting
    ownerPhoneInput.addEventListener('input', function() {
        let value = this.value.replace(/\D/g, ''); // Remove non-digits
        if (value.length > 0 && !value.startsWith('91')) {
            if (value.startsWith('9')) {
                value = '91' + value;
            } else {
                value = '91' + value;
            }
        }
        if (value.length > 12) {
            value = value.substring(0, 12);
        }
        this.value = value ? '+' + value : '';
    });
    
    // Form submission
    billingForm.addEventListener('submit', handleFormSubmit);
    
    // WhatsApp button
    whatsappBtn.addEventListener('click', sendToWhatsApp);
}

function calculateAmount() {
    const quantity = parseFloat(quantityInput.value) || 0;
    const rate = parseFloat(rateInput.value) || 0;
    const amount = quantity * rate;
    
    amountInput.value = amount.toFixed(2);
    calculateBalances();
}

function calculateBalances() {
    const oldBalance = parseFloat(oldBalanceInput.value) || 0;
    const amount = parseFloat(amountInput.value) || 0;
    const paymentMade = parseFloat(paymentMadeInput.value) || 0;
    
    const remainingBalance = oldBalance + amount - paymentMade;
    remainingBalanceInput.value = remainingBalance.toFixed(2);
    
    // Update styling based on balance
    if (remainingBalance > 0) {
        remainingBalanceInput.className = remainingBalanceInput.className.replace('bg-green-50 text-green-700', 'bg-red-50 text-red-700');
    } else {
        remainingBalanceInput.className = remainingBalanceInput.className.replace('bg-red-50 text-red-700', 'bg-green-50 text-green-700');
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Prepare bill data
    currentBillData = {
        customerName: customerSelect.value,
        fishType: document.getElementById('fishType').value,
        quantity: parseFloat(quantityInput.value),
        rate: parseFloat(rateInput.value),
        amount: parseFloat(amountInput.value),
        paymentMade: parseFloat(paymentMadeInput.value),
        oldBalance: parseFloat(oldBalanceInput.value),
        remainingBalance: parseFloat(remainingBalanceInput.value),
        date: dateInput.value,
        ownerPhone: ownerPhoneInput.value.trim(),
        ownerName: ownerNameInput.value.trim() || 'Business Owner'
    };
    
    // Generate PDF (static version)
    generateStaticPDF();
}

function validateForm() {
    const requiredFields = [
        { element: customerSelect, name: 'Customer Name' },
        { element: document.getElementById('fishType'), name: 'Fish Type' },
        { element: quantityInput, name: 'Quantity' },
        { element: rateInput, name: 'Rate' },
        { element: paymentMadeInput, name: 'Payment Made' },
        { element: ownerPhoneInput, name: 'Owner Phone Number' }
    ];
    
    for (const field of requiredFields) {
        if (!field.element.value.trim()) {
            showNotification(`Please fill in ${field.name}`, 'error');
            field.element.focus();
            return false;
        }
    }
    
    if (parseFloat(quantityInput.value) <= 0) {
        showNotification('Quantity must be greater than 0', 'error');
        quantityInput.focus();
        return false;
    }
    
    if (parseFloat(rateInput.value) <= 0) {
        showNotification('Rate must be greater than 0', 'error');
        rateInput.focus();
        return false;
    }

    // Validate phone number format
    const phoneRegex = /^\+91[0-9]{10}$/;
    if (!phoneRegex.test(ownerPhoneInput.value.trim())) {
        showNotification('Owner phone number must be in format +91XXXXXXXXXX', 'error');
        ownerPhoneInput.focus();
        return false;
    }
    
    return true;
}

function generateStaticPDF() {
    showLoading(true);
    
    try {
        // Using jsPDF for client-side PDF generation
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.setTextColor(37, 99, 235); // Blue color
        doc.text('THANJAVUR FISH SALES', 20, 30);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Gray color
        doc.text('Contact: +91-9876543210 | Email: info@thanjavurfish.com', 20, 40);
        
        // Line separator
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(1);
        doc.line(20, 50, 190, 50);
        
        // Bill header
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59); // Dark color
        doc.text('FISH PURCHASE BILL', 20, 65);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`Date: ${currentBillData.date}`, 150, 65);
        
        // Customer details
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('CUSTOMER DETAILS', 20, 85);
        
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        doc.text(`Customer Name: ${currentBillData.customerName}`, 20, 95);
        
        // Transaction table
        const tableY = 110;
        
        // Table header
        doc.setFillColor(248, 250, 252);
        doc.rect(20, tableY, 170, 10, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('ITEM', 25, tableY + 7);
        doc.text('QTY (KG)', 70, tableY + 7);
        doc.text('RATE (₹/KG)', 100, tableY + 7);
        doc.text('AMOUNT (₹)', 140, tableY + 7);
        
        // Table border
        doc.setDrawColor(226, 232, 240);
        doc.rect(20, tableY, 170, 10);
        
        // Transaction row
        const rowY = tableY + 10;
        doc.setTextColor(55, 65, 81);
        doc.text(currentBillData.fishType, 25, rowY + 7);
        doc.text(currentBillData.quantity.toString(), 70, rowY + 7);
        doc.text(`₹${currentBillData.rate}`, 100, rowY + 7);
        doc.text(`₹${currentBillData.amount}`, 140, rowY + 7);
        
        doc.rect(20, rowY, 170, 10);
        
        // Payment summary
        const summaryY = rowY + 30;
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('PAYMENT SUMMARY', 20, summaryY);
        
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        doc.text(`Total Amount: ₹${currentBillData.amount}`, 20, summaryY + 15);
        doc.text(`Old Balance: ₹${currentBillData.oldBalance}`, 20, summaryY + 25);
        doc.text(`Payment Made: ₹${currentBillData.paymentMade}`, 20, summaryY + 35);
        
        // Remaining balance (highlighted)
        doc.setTextColor(220, 38, 38); // Red color
        doc.setFont(undefined, 'bold');
        doc.text(`Remaining Balance: ₹${currentBillData.remainingBalance}`, 20, summaryY + 45);
        
        // Footer
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.setFont(undefined, 'normal');
        doc.text('Thank you for your business! Fresh fish, honest prices.', 20, 250);
        doc.text('For any queries, contact us at +91-9876543210', 20, 260);
        
        // Generate PDF blob for sharing
        generatedPdfBlob = doc.output('blob');
        
        // Save the PDF for download
        const filename = `bill_${currentBillData.customerName}_${currentBillData.date}.pdf`;
        doc.save(filename);
        
        // Show success and enable WhatsApp
        showSuccess();
        whatsappBtn.disabled = false;
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Error generating PDF. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

function sendToWhatsApp() {
    if (!currentBillData || !generatedPdfBlob) {
        showNotification('Please generate a bill first', 'error');
        return;
    }
    
    // Create a simple text message with bill summary
    const summaryMessage = createBillSummaryMessage(currentBillData);
    
    // Copy summary message to clipboard
    copyToClipboard(summaryMessage);
    
    // Detect if on mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let whatsappUrl;
    if (isMobile) {
        // On mobile: Use whatsapp:// to open WhatsApp app directly
        whatsappUrl = 'whatsapp://send?text=' + encodeURIComponent(summaryMessage);
    } else {
        // On desktop: Open WhatsApp Web with message
        whatsappUrl = 'https://web.whatsapp.com/send?text=' + encodeURIComponent(summaryMessage);
    }
    
    // Try to open WhatsApp
    window.open(whatsappUrl, '_blank');
    
    // Fallback for mobile if whatsapp:// doesn't work
    if (isMobile) {
        setTimeout(() => {
            // If still on same page after 2 seconds, try alternative
            const fallbackUrl = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(summaryMessage);
            window.open(fallbackUrl, '_blank');
        }, 2000);
    }
    
    // Show instructions for demo with file sharing
    showFileShareInstructions(summaryMessage);
}

function createBillSummaryMessage(data) {
    return `🐟 Fish Bill - ${data.date}

Customer: ${data.customerName}
Fish: ${data.fishType} (${data.quantity} kg @ ₹${data.rate}/kg)
Amount: ₹${data.amount}
Paid: ₹${data.paymentMade}
Balance: ₹${data.remainingBalance}

📎 Detailed PDF bill attached

Thanjavur Fish Sales
+91-9876543210`;
}

function createCustomerWhatsAppMessage(data) {
    return `🐟 *Fish Bill - ${data.date}*

Dear ${data.customerName},

Thank you for your purchase! Here are your bill details:

*Fish Details:*
🐠 Fish Type: ${data.fishType}
⚖️ Quantity: ${data.quantity} kg
💰 Rate: ₹${data.rate}/kg
💳 Total Amount: ₹${data.amount}

*Payment Summary:*
💸 Paid Today: ₹${data.paymentMade}
🏦 Previous Balance: ₹${data.oldBalance}
🔢 Remaining Balance: ₹${data.remainingBalance}

📞 Thank you for your business!
*Thanjavur Fish Sales*
Contact: +91-9876543210

_Fresh fish, honest prices._`;
}

function createOwnerWhatsAppMessage(data) {
    return `📊 *FISH SALE REPORT - ${data.date}*

*Transaction Details:*
👤 Customer: ${data.customerName}
🐠 Fish: ${data.fishType}
⚖️ Quantity: ${data.quantity} kg
💰 Rate: ₹${data.rate}/kg

*Financial Summary:*
💳 Sale Amount: ₹${data.amount}
💸 Payment Received: ₹${data.paymentMade}
🏦 Previous Balance: ₹${data.oldBalance}
🔢 New Balance: ₹${data.remainingBalance}

${data.remainingBalance > 0 ? '⚠️ *PENDING BALANCE: ₹' + data.remainingBalance + '*' : '✅ *ACCOUNT CLEARED*'}

*Thanjavur Fish Sales - Owner Copy*`;
}

function copyToClipboard(text) {
    // Try to use the modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Message copied to clipboard');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        document.execCommand('copy');
        console.log('Fallback: Message copied to clipboard');
    } catch (err) {
        console.error('Fallback: Unable to copy', err);
    }
    
    document.body.removeChild(textArea);
}

function showFileShareInstructions(summaryMessage) {
    // Remove any existing demo modal
    const existingModal = document.getElementById('demoModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Detect device type for instructions
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const deviceInstructions = isMobile ? 
        'WhatsApp app is opening on your mobile device' : 
        'WhatsApp Web is opening in new tab';
    
    // Create demo instructions modal
    const modal = document.createElement('div');
    modal.id = 'demoModal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
    
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex items-center gap-3 mb-6">
                    <div class="bg-green-500 text-white p-3 rounded-full">
                        <i class="fab fa-whatsapp text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">WhatsApp PDF Sharing Demo</h3>
                        <p class="text-gray-600">Bill summary copied & PDF ready to share!</p>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <div class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <h4 class="font-semibold text-blue-800 mb-2">� PDF Sharing Steps (${isMobile ? 'Mobile' : 'Desktop'}):</h4>
                        <ol class="text-blue-700 space-y-2 text-sm">
                            <li><strong>1.</strong> ${deviceInstructions}</li>
                            <li><strong>2.</strong> Search and select any contact</li>
                            <li><strong>3.</strong> Paste the bill summary (${isMobile ? 'Long press & paste' : 'Ctrl+V / Cmd+V'})</li>
                            <li><strong>4.</strong> Click attachment button (📎) in WhatsApp</li>
                            <li><strong>5.</strong> Select "Document" and choose the downloaded PDF</li>
                            <li><strong>6.</strong> Send both message and PDF file!</li>
                        </ol>
                    </div>
                    
                    <div class="bg-orange-50 p-4 rounded-lg border-l-4 border-orange-500">
                        <h4 class="font-semibold text-orange-800 mb-2">� PDF File Location:</h4>
                        <p class="text-orange-700 text-sm">
                            The PDF bill was downloaded to your Downloads folder:<br>
                            <code class="bg-white px-2 py-1 rounded text-xs">bill_${currentBillData.customerName}_${currentBillData.date}.pdf</code>
                        </p>
                    </div>
                    
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-3">� Bill Summary (Already Copied):</h4>
                        <div class="bg-white p-3 rounded border text-sm font-mono text-gray-700 max-h-40 overflow-y-auto">
                            ${summaryMessage.replace(/\n/g, '<br>')}
                        </div>
                        <button onclick="copyToClipboard(\`${summaryMessage.replace(/`/g, '\\`')}\`)" 
                                class="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                            📋 Copy Message Again
                        </button>
                    </div>
                </div>
                
                <div class="flex gap-3 mt-6 pt-4 border-t">
                    <button onclick="window.open('${isMobile ? 'whatsapp://' : 'https://web.whatsapp.com/'}', '_blank')" 
                            class="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg font-semibold">
                        🔗 Open WhatsApp Again
                    </button>
                    <button onclick="downloadPdfAgain()" 
                            class="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-semibold">
                        📥 Download PDF Again
                    </button>
                    <button onclick="document.getElementById('demoModal').remove()" 
                            class="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg font-semibold">
                        ✅ Close
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function downloadPdfAgain() {
    if (generatedPdfBlob && currentBillData) {
        const url = window.URL.createObjectURL(generatedPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bill_${currentBillData.customerName}_${currentBillData.date}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        showNotification('PDF downloaded again!', 'success');
    }
}

function openWhatsAppAgain() {
    if (!currentBillData) return;
    
    const summaryMessage = createBillSummaryMessage(currentBillData);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    let whatsappUrl;
    if (isMobile) {
        // On mobile: Use whatsapp:// to open WhatsApp app with message
        whatsappUrl = 'whatsapp://send?text=' + encodeURIComponent(summaryMessage);
    } else {
        // On desktop: Open WhatsApp Web with message
        whatsappUrl = 'https://web.whatsapp.com/send?text=' + encodeURIComponent(summaryMessage);
    }
    
    window.open(whatsappUrl, '_blank');
}

function showSuccess() {
    successMessage.classList.remove('hidden');
    setTimeout(() => {
        successMessage.classList.add('hidden');
    }, 5000);
}

function showLoading(show) {
    if (show) {
        loadingOverlay.classList.remove('hidden');
    } else {
        loadingOverlay.classList.add('hidden');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
    
    // Set colors based on type
    const colors = {
        success: 'bg-green-500 text-white',
        error: 'bg-red-500 text-white',
        info: 'bg-blue-500 text-white'
    };
    
    notification.className += ` ${colors[type] || colors.info}`;
    notification.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}
