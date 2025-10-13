import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function VanillaStripeCheckout({ 
  project, 
  customerInfo, 
  onPaymentSuccess, 
  onPaymentError,
  amount 
}) {
  const [stripe, setStripe] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);
  
  // Card information state
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardholderName, setCardholderName] = useState(customerInfo.name || '');

  // Initialize Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      const stripeInstance = await stripePromise;
      if (stripeInstance) {
        setStripe(stripeInstance);
        setStripeLoaded(true);
      }
    };
    
    initializeStripe();
  }, []);

  // Create payment intent when component mounts
  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/create-payment-intent`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount,
            currency: 'usd',
            customerInfo: customerInfo,
            orderId: `order_${Date.now()}`, // Temporary ID
          }),
        });
        
        const data = await response.json();
        if (data.clientSecret) {
          setClientSecret(data.clientSecret);
        } else {
          setError('Failed to initialize payment');
        }
      } catch (err) {
        setError('Payment setup failed: ' + err.message);
      }
    };

    if (amount > 0 && customerInfo.email && stripeLoaded) {
      createPaymentIntent();
    }
  }, [amount, customerInfo, stripeLoaded]);

  const validateCard = () => {
    // Clean card number
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    
    // Basic card number validation
    if (!cleanCardNumber || cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
      setError('Please enter a valid card number (13-19 digits)');
      return false;
    }
    
    // Check if card number contains only digits
    if (!/^\d+$/.test(cleanCardNumber)) {
      setError('Card number must contain only numbers');
      return false;
    }
    
    // Basic Luhn algorithm check for card number validity
    let sum = 0;
    let alternate = false;
    for (let i = cleanCardNumber.length - 1; i >= 0; i--) {
      let n = parseInt(cleanCardNumber.charAt(i), 10);
      if (alternate) {
        n *= 2;
        if (n > 9) n = (n % 10) + 1;
      }
      sum += n;
      alternate = !alternate;
    }
    if (sum % 10 !== 0) {
      setError('Please enter a valid card number');
      return false;
    }
    
    // Expiry date validation
    if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate)) {
      setError('Please enter a valid expiry date (MM/YY)');
      return false;
    }
    
    // Check if expiry date is in the future
    const [month, year] = expiryDate.split('/');
    const expiry = new Date(2000 + parseInt(year), parseInt(month) - 1);
    const now = new Date();
    now.setDate(1); // Set to first of month for comparison
    if (expiry < now) {
      setError('Card has expired');
      return false;
    }
    
    // Month validation
    if (parseInt(month) < 1 || parseInt(month) > 12) {
      setError('Please enter a valid month (01-12)');
      return false;
    }
    
    // CVC validation
    if (!cvc || cvc.length < 3 || cvc.length > 4) {
      setError('Please enter a valid CVC (3-4 digits)');
      return false;
    }
    
    if (!/^\d+$/.test(cvc)) {
      setError('CVC must contain only numbers');
      return false;
    }
    
    // Cardholder name validation
    if (!cardholderName.trim()) {
      setError('Please enter the cardholder name');
      return false;
    }
    
    if (cardholderName.trim().length < 2) {
      setError('Cardholder name must be at least 2 characters');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !clientSecret) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    if (!validateCard()) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Create payment method with card details
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: {
          number: cardNumber.replace(/\s/g, ''),
          exp_month: parseInt(expiryDate.split('/')[0]),
          exp_year: parseInt('20' + expiryDate.split('/')[1]),
          cvc: cvc,
        },
        billing_details: {
          name: cardholderName,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: {
            line1: customerInfo.billingAddress?.split(',')[0] || customerInfo.shippingAddress?.split(',')[0] || '',
          },
        },
      });

      if (pmError) {
        setError(pmError.message);
        setIsProcessing(false);
        onPaymentError && onPaymentError(pmError);
        return;
      }

      // Confirm payment with created payment method
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: paymentMethod.id,
      });

      if (error) {
        setError(error.message);
        setIsProcessing(false);
        onPaymentError && onPaymentError(error);
      } else {
        // Payment succeeded
        console.log('Payment succeeded:', paymentIntent);
        
        // Create order in database
        try {
          const orderResponse = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              buyerEmail: customerInfo.email,
              buyerName: customerInfo.name,
              buyerPhone: customerInfo.phone,
              shippingAddress: customerInfo.shippingAddress,
              billingAddress: customerInfo.billingAddress,
              items: [{ 
                projectId: project.id, 
                name: project.title, 
                price: amount 
              }],
              paymentIntentId: paymentIntent.id,
              requiresPayment: true,
            }),
          });

          if (orderResponse.ok) {
            onPaymentSuccess && onPaymentSuccess(paymentIntent);
          } else {
            throw new Error('Failed to create order');
          }
        } catch (orderError) {
          setError('Payment successful but order creation failed: ' + orderError.message);
        }
        
        setIsProcessing(false);
      }
    } catch (generalError) {
      setError('Payment failed: ' + generalError.message);
      setIsProcessing(false);
    }
  };

  if (!stripeLoaded) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>Loading payment form...</div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>Initializing payment...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ width: '100%' }}>
      {/* Card Information Section */}
      <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '2px solid #e3f2fd' }}>
        <h3 style={{ color: '#1976d2', marginBottom: 16, fontSize: '1.3rem' }}>Payment Information</h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#333' }}>
            Cardholder Name *
          </label>
          <input 
            type="text"
            value={cardholderName} 
            onChange={e => setCardholderName(e.target.value)} 
            required 
            placeholder="John Doe"
            style={{ width: '100%', padding: 12, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
          />
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#333' }}>
            Card Number *
          </label>
          <input 
            type="text"
            value={cardNumber} 
            onChange={e => setCardNumber(e.target.value.replace(/\s/g, '').replace(/(\d{4})(?=\d)/g, '$1 '))} 
            required 
            placeholder="4242 4242 4242 4242"
            maxLength="19"
            style={{ width: '100%', padding: 12, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#333' }}>
              Expiry Date *
            </label>
            <input 
              type="text"
              value={expiryDate} 
              onChange={e => {
                const value = e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2');
                if (value.length <= 5) setExpiryDate(value);
              }} 
              required 
              placeholder="MM/YY"
              maxLength="5"
              style={{ width: '100%', padding: 12, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#333' }}>
              CVC *
            </label>
            <input 
              type="text"
              value={cvc} 
              onChange={e => {
                const value = e.target.value.replace(/\D/g, '');
                if (value.length <= 4) setCvc(value);
              }} 
              required 
              placeholder="123"
              maxLength="4"
              style={{ width: '100%', padding: 12, borderRadius: 6, border: '1px solid #bcd0ee', fontSize: '1rem', background: '#f6f8fa' }} 
            />
          </div>
        </div>
        
        <div style={{
          fontSize: '12px',
          color: '#666',
          padding: '8px 12px',
          backgroundColor: '#e8f4f8',
          borderRadius: '4px',
          border: '1px solid #b3d9e6'
        }}>
          🔒 <strong>Test Mode:</strong> Use test card 4242 4242 4242 4242, any future expiry date, and any CVC.
        </div>
      </div>

      {error && (
        <div style={{
          color: '#d32f2f',
          marginBottom: 16,
          padding: '8px 12px',
          backgroundColor: '#ffebee',
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {error}
        </div>
      )}

      <div style={{ 
        marginBottom: 20, 
        padding: '12px 16px',
        backgroundColor: '#e3f2fd',
        borderRadius: '6px',
        border: '1px solid #90caf9'
      }}>
        <div style={{ fontSize: '14px', color: '#1565c0', marginBottom: 4 }}>
          Order Summary:
        </div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#0d47a1' }}>
          {project.title} - ${amount.toFixed(2)}
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing}
        style={{
          width: '100%',
          padding: '12px 0',
          background: isProcessing 
            ? 'linear-gradient(90deg, #9e9e9e 0%, #bdbdbd 100%)'
            : 'linear-gradient(90deg, #1976d2 0%, #64b5f6 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          boxShadow: '0 2px 8px rgba(25,118,210,0.07)',
          transition: 'all 0.2s ease'
        }}
      >
        {isProcessing ? 'Processing Payment...' : `Pay $${amount.toFixed(2)}`}
      </button>

      <div style={{
        fontSize: '12px',
        color: '#666',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: '1.4'
      }}>
        🔒 Your payment information is secure and encrypted.
        <br />
        Powered by Stripe - Industry-leading payment security.
      </div>
    </form>
  );
}

export default VanillaStripeCheckout;