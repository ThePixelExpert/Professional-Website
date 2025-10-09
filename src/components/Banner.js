import React from "react";
import "../App.css";

const defaultSections = [
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "contact", label: "Contact" },
  { id: "references", label: "References" },
];

function Banner({ sections = defaultSections, showBack = false, backHref = "#/", categoryButtons = [] }) {
  const handleCategoryClick = (category, e) => {
    e.preventDefault();
    const element = document.getElementById(`group-${category}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="banner-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div className="banner-logo-text">
          <span className="logo-edwards">EDWARDS</span>
          <span className="logo-engineering">TECH</span>
          <span className="logo-engineering">SOLUTIONS</span>

        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2.2rem' }}>
        {categoryButtons && categoryButtons.length > 0 && (
          <ul className="banner-links banner-categories">
            {categoryButtons.map((c) => (
              <li key={c}>
                <a 
                  href={`#group-${c}`} 
                  onClick={(e) => handleCategoryClick(c, e)}
                >
                  {c}
                </a>
              </li>
            ))}
          </ul>
        )}

        <ul className="banner-links">
          {sections.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`}>{section.label}</a>
            </li>
          ))}
        </ul>

        {showBack && (
          <a className="banner-back-link" href={backHref}>Back</a>
        )}
      </div>
    </nav>
  );
}

export default Banner;
