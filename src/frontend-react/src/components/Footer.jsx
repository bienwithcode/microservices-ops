import { useSession } from '../context/SessionContext.jsx';

export default function Footer() {
  const { sessionId } = useSession();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-5">
      <div className="footer-top">
        <div className="container footer-social">
          <p className="footer-text">
            This website is hosted for demo purposes only. It is not an actual shop. This is not a Google product.
          </p>
          <p className="footer-text">
            &copy; 2020-{currentYear} Google LLC (<a href="https://github.com/GoogleCloudPlatform/microservices-demo">Source Code</a>)
          </p>
          <div className="footer-links">
            <a href="/privacy">Privacy Policy</a>
            <span className="footer-link-separator">|</span>
            <a href="/terms">Terms of Service</a>
            <span className="footer-link-separator">|</span>
            <a href="/contact">Contact Us</a>
          </div>
          <p className="footer-text footer-session-id">
            <small>
              {sessionId && <span>session-id: {sessionId}</span>}
            </small>
          </p>
        </div>
      </div>
    </footer>
  );
}
