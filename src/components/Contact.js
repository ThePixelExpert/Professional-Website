import React, { useState } from 'react';
import { FaEnvelope, FaMapMarkerAlt, FaClock, FaPaperPlane } from 'react-icons/fa';

function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/contact', {
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
        throw new Error(result.message || 'Failed to send message');
      }
    } catch (error) {
      alert('Sorry, there was an error sending your message. Please try again or email me directly.');
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="section" id="contact">
      <h2 className="main-section-title">Get In Touch</h2>
      
      <div className="contact-container">
        <div className="contact-info">
          <h3>Let's Work Together</h3>
          <p>Ready to bring your engineering project to life? I specialize in electrical engineering, circuit design, and innovative solutions for complex technical challenges.</p>
          
          <div className="contact-cta">
            <h4>Engineering Services</h4>
            <ul>
              <li>Circuit Design & PCB Development</li>
              <li>Prototype Development</li>
              <li>System Integration</li>
              <li>Technical Consultation</li>
            </ul>
            
            <div className="order-tracking-link" style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <h5 style={{ margin: '0 0 10px 0', color: '#333' }}>Have an existing order?</h5>
              <button 
                onClick={() => window.location.hash = '#/track'}
                style={{
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.3s ease'
                }}
                onMouseOver={(e) => e.target.style.background = '#0056b3'}
                onMouseOut={(e) => e.target.style.background = '#007bff'}
              >
                Track Your Order
              </button>
            </div>
          </div>
        </div>
        
        <div className="contact-form-container">
          <form className="contact-form" onSubmit={handleSubmit}>
            <h3>Send a Message</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Your name"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="company">Company</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your company (optional)"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Project inquiry"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="message">Message *</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="3"
                placeholder="Tell me about your project, timeline, and any specific requirements..."
              ></textarea>
            </div>
            
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Sending...</>
              ) : (
                <>
                  <FaPaperPlane />
                  Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      
      <div className="contact-details-horizontal">
        <div className="contact-item">
          <FaEnvelope className="contact-icon" />
          <div>
            <strong>Email</strong>
            <p>lmedwards.professional@gmail.com</p>
          </div>
        </div>
        
        <div className="contact-item">
          <FaMapMarkerAlt className="contact-icon" />
          <div>
            <strong>Location</strong>
            <p>New York, NY</p>
          </div>
        </div>
        
        <div className="contact-item">
          <FaClock className="contact-icon" />
          <div>
            <strong>Response Time</strong>
            <p>Within 24 hours</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contact;
