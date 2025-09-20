// Option 2: Frontend component for Express backend
// Replace your Contact.js handleSubmit function with this version:

const handleSubmitWithBackend = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  
  try {
    const response = await fetch('http://localhost:3001/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Thank you for your message! I\'ll get back to you within 24 hours.');
      setFormData({
        name: '',
        email: '',
        company: '',
        subject: '',
        message: ''
      });
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    alert('Sorry, there was an error sending your message. Please try again or email me directly.');
    console.error('Form submission error:', error);
  } finally {
    setIsSubmitting(false);
  }
};