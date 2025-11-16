import React, { useState } from 'react';
import { useEffect } from 'react';
import Banner from './components/Banner';
import projects from './data/projects';

function PurchasePage({ projectId }) {
  // Removed unused hooks
  const [mainImg, setMainImg] = useState();
  const [selectedOptions, setSelectedOptions] = useState({});

  const project = projects.find(p => p.id === projectId);
  // Images: support array or single image
  // Always show 3 blank images if none provided
  const images = React.useMemo(() => {
    if (!project) return [null, null, null];
    if (Array.isArray(project.images) && project.images.length > 0) return project.images;
    if (project.img) return [project.img, null, null];
    return [null, null, null];
  }, [project]);
  const options = project ? (project.options || []) : [];
  const features = project ? (project.features || []) : [];
  const price = project ? (project.price || '$499.00') : '';
  const shipping = project ? (project.shipping || 'Ships in 3-5 business days via UPS Ground.') : '';
  const summary = project ? (project.summary || 'High-quality, professionally engineered product. Satisfaction guaranteed.') : '';

  // Set main image when images change
  useEffect(() => {
    setMainImg(images[0]);
  }, [images]);
  // Define handleCheckout
  const handleCheckout = () => {
    if (project) {
      window.location.hash = `#/checkout/${project.id}`;
    }
  };

  if (!project) return <div>Project not found.</div>;

  return (
    <>
      <Banner />
  <div style={{ height: 48 }} />
  <div style={{ maxWidth: 1100, margin: '5.5rem auto 2rem auto', background: 'linear-gradient(135deg, #f8fafc 0%, #e3eafc 100%)', padding: 48, borderRadius: 18, boxShadow: '0 8px 32px rgba(25, 118, 210, 0.10)' }}>
        <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Image gallery */}
          <div style={{ flex: '0 0 380px', textAlign: 'center', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(25,118,210,0.07)', padding: 24 }}>
            <img src={mainImg || 'https://via.placeholder.com/360x240?text=No+Image'} alt={project.title} style={{ maxWidth: '100%', borderRadius: 8, boxShadow: '0 2px 8px rgba(25,118,210,0.07)', marginBottom: 16 }} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              {images.map((img, idx) => (
                <img
                  key={idx}
                  src={img || 'https://via.placeholder.com/56x56?text=+'}
                  alt={`Thumbnail ${idx+1}`}
                  style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 6, border: mainImg === img ? '2px solid #1976d2' : '2px solid #eee', cursor: 'pointer', boxShadow: mainImg === img ? '0 2px 8px #1976d2' : 'none' }}
                  onClick={() => setMainImg(img)}
                />
              ))}
            </div>
          </div>
          {/* Product info */}
          <div style={{ flex: 1 }}>
            <h1 style={{ color: '#1976d2', fontSize: '2.4rem', marginBottom: 12, fontWeight: 700 }}>{project.title}</h1>
            <div style={{ fontSize: '1.15rem', color: '#333', marginBottom: 16 }}>{summary}</div>
            <div style={{ fontSize: '1.5rem', color: '#1976d2', fontWeight: 700, marginBottom: 8 }}>{price}</div>
            <div style={{ color: '#388e3c', fontWeight: 500, marginBottom: 16 }}>{shipping}</div>
            {/* Options section */}
            {options.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Options</h3>
                {options.map(opt => (
                  <div key={opt.name} style={{ marginBottom: 8 }}>
                    <label style={{ marginRight: 8 }}>{opt.name}:</label>
                    <select
                      value={selectedOptions[opt.name] || ''}
                      onChange={e => setSelectedOptions({ ...selectedOptions, [opt.name]: e.target.value })}
                      style={{ padding: 6, borderRadius: 4, border: '1px solid #bcd0ee' }}
                    >
                      <option value="">Select</option>
                      {opt.values.map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
            {/* Product features section */}
            {features.length > 0 && (
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Product Features</h3>
                <ul style={{ color: '#444', fontSize: '1.08rem', paddingLeft: 20 }}>
                  {features.map((f, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Highlights section */}
            {project.highlights && (
              <div style={{ marginBottom: 18 }}>
                <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Highlights</h3>
                <ul style={{ color: '#444', fontSize: '1.08rem', paddingLeft: 20 }}>
                  {project.highlights.map((h, i) => (
                    <li key={i} style={{ marginBottom: 8 }}>{h}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Links section */}
            {project.links && (
              <div style={{ marginBottom: 18 }}>
                {project.links.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" style={{ marginRight: 16, color: '#1976d2', fontWeight: 500 }}>{l.label}</a>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Order details section */}
        <div style={{ marginTop: 48, padding: 32, background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(25,118,210,0.07)', textAlign: 'center' }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Order Details</h3>
          <div style={{ fontSize: '1.1rem', color: '#333', marginBottom: 8 }}><strong>Product:</strong> {project.title}</div>
          <div style={{ fontSize: '1.1rem', color: '#333', marginBottom: 8 }}><strong>Price:</strong> {price}</div>
          <div style={{ fontSize: '1.1rem', color: '#333', marginBottom: 8 }}><strong>Shipping:</strong> {shipping}</div>
          {options.length > 0 && (
            <div style={{ fontSize: '1.1rem', color: '#333', marginBottom: 8 }}>
              <strong>Selected Options:</strong> {Object.entries(selectedOptions).map(([k, v]) => v ? `${k}: ${v}` : null).filter(Boolean).join(', ') || 'None'}
            </div>
          )}
          <button
            style={{ marginTop: 24, padding: '16px 48px', background: 'linear-gradient(90deg, #1976d2 0%, #64b5f6 100%)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 'bold', fontSize: '1.25rem', boxShadow: '0 2px 8px rgba(25,118,210,0.07)' }}
            onClick={handleCheckout}
          >
            Checkout
          </button>
        </div>
      </div>
    </>
  );
}

export default PurchasePage;
