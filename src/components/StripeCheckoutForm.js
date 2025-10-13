import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function StripeCheckoutForm({ 
  project, 
  customerInfo, 
  onPaymentSuccess, 
  onPaymentError,
  amount 
}) {
  const cardElementRef = useRef(null);
  const [stripe, setStripe] = useState(null);
  const [cardElement, setCardElement] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState(null);
  const [stripeLoaded, setStripeLoaded] = useState(false);

  // Initialize Stripe
  useEffect(() => {
    const initializeStripe = async () => {
      const stripeInstance = await stripePromise;
      if (stripeInstance) {
        setStripe(stripeInstance);
        const elementsInstance = stripeInstance.elements();
        
        // Create card element
        const cardElementInstance = elementsInstance.create('card', {
          style: {
            base: {
              color: '#424770',
              fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
              fontSmoothing: 'antialiased',
              fontSize: '16px',
              '::placeholder': {
                color: '#aab7c4',
              },
            },
            invalid: {
              color: '#9e2146',
              iconColor: '#9e2146',
            },
          },
        });
        
        setCardElement(cardElementInstance);
        setStripeLoaded(true);
      }
    };
    
    initializeStripe();
  }, []);

  // Mount card element when DOM ref is ready
  useEffect(() => {
    if (cardElement && cardElementRef.current && stripeLoaded) {
      cardElement.mount(cardElementRef.current);
      
      // Handle real-time validation errors from the card Element
      cardElement.on('change', ({ error }) => {
        setError(error ? error.message : null);
      });
    }
    
    // Cleanup
    return () => {
      if (cardElement) {
        cardElement.unmount();
      }
    };
  }, [cardElement, stripeLoaded]);

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

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !cardElement || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: customerInfo.name,
          email: customerInfo.email,
          phone: customerInfo.phone,
          address: {
            line1: customerInfo.billingAddress?.split(',')[0] || customerInfo.shippingAddress?.split(',')[0] || '',
          },
        },
      },
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
      <div style={{ marginBottom: 20 }}>
        <label style={{ 
          display: 'block', 
          fontWeight: 500, 
          marginBottom: 8,
          color: '#333'
        }}>
          Card Details
        </label>
        <div 
          ref={cardElementRef}
          style={{
            padding: '12px 16px',
            border: '1px solid #bcd0ee',
            borderRadius: '6px',
            backgroundColor: '#f6f8fa',
            minHeight: '40px'
          }}
        />
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
        disabled={!stripe || isProcessing || !cardElement}
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

export default StripeCheckoutForm;