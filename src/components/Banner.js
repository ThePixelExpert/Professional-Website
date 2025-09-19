import React from "react";
import "../App.css";

const sections = [
  { id: "skills", label: "Skills" },
  { id: "projects", label: "Projects" },
  { id: "experience", label: "Experience" },
  { id: "references", label: "References" },
];

function Banner() {
  return (
    <nav className="banner-nav">
      <div className="banner-title">Edwards Engineering</div>
      <ul className="banner-links">
        {sections.map((section) => (
          <li key={section.id}>
            <a href={`#${section.id}`}>{section.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Banner;
