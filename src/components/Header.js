import { FaGithub, FaLinkedin, FaEnvelope, FaFilePdf } from "react-icons/fa";

function Header() {
  return (
    <header className="section">
      <img
        src="https://via.placeholder.com/150"
        alt="Profile"
        className="profile-pic"
      />
      <h1>Your Name</h1>
      <p>Short bio about you. Something like "Electrical Engineer | Software Dev".</p>
      <div className="links">
        <a href="mailto:youremail@example.com"><FaEnvelope /></a>
        <a href="https://linkedin.com/in/yourprofile" target="_blank" rel="noreferrer"><FaLinkedin /></a>
        <a href="https://github.com/yourusername" target="_blank" rel="noreferrer"><FaGithub /></a>
        <a href="/resume.pdf" target="_blank" rel="noreferrer"><FaFilePdf /></a>
      </div>
    </header>
  );
}

export default Header;
