import { IconGitHub, IconLinkedIn, IconMail } from "./icons";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-social">
        <a href="https://github.com/akhil-saxena" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
          <IconGitHub size={20} />
        </a>
        <a href="https://www.linkedin.com/in/akhil-saxena" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
          <IconLinkedIn size={20} />
        </a>
        <a href="mailto:saxena.akhil42@gmail.com" aria-label="Email">
          <IconMail size={20} />
        </a>
      </div>
      <p className="footer-copy">© {new Date().getFullYear()} Akhil Saxena</p>
    </footer>
  );
}
