import { FaGithub, FaLinkedin, FaEnvelope, FaFilePdf } from "react-icons/fa";
import profilePic from "../assets/ProfilePic.JPG"

function Header() {
  return (
    <header className="section">
      <img
        src={profilePic}
        alt="Profile"
        className="profile-pic"
      />
      <div className="profile-bio">
        <h1>Logan Edwards</h1>
        <p>Undergraduate student at NYIT majoring in Electrical and Computer Engineering. Project Manager at Entrepreneurship and Technology Innovation Center, NYIT.</p>
        <div className="links">
          <a href="mailto:lmedwards.professional@gmail.com"><FaEnvelope /></a>
          <a href="https://www.linkedin.com/in/logan-edwards-76bb91282/" target="_blank" rel="noreferrer"><FaLinkedin /></a>
          <a href="https://github.com/ThePixelExpert" target="_blank" rel="noreferrer"><FaGithub /></a>
          <a href="/resume.pdf" target="_blank" rel="noopener noreferrer"><FaFilePdf /></a>
        </div>
      </div>
      
    </header>
  );
}

export default Header;
