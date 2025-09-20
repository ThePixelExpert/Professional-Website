import React from "react";
import "../App.css";

import logoJpg from "../assets/Eengineering_logo.png";

const defaultSections = [
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "references", label: "References" },
];

function Banner({ sections = defaultSections, showBack = false, backHref = "#/", categoryButtons = [] }) {
  // Use the provided company logo (JPG). Replace with a transparent PNG later for no white background.
  const logo = logoJpg;

  return (
    <nav className="banner-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <img src={logo} alt="logo" className="banner-logo" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2.2rem' }}>
        {categoryButtons && categoryButtons.length > 0 && (
          <ul className="banner-links banner-categories">
            {categoryButtons.map((c) => (
              <li key={c}><a href={`#group-${c}`}>{c}</a></li>
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
