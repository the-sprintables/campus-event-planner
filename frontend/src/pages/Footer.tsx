import logo from "../assets/logo.png";

const Footer = () => {
  return (
    <div>
      <footer 
        className="footer sm:footer-horizontal p-10"
        style={{
          backgroundColor: 'var(--footer-bg)',
          color: 'var(--footer-text)'
        }}
      >
        <aside className="flex items-start gap-4 max-w-sm">
          <img
            src={logo}
            alt="Logo"
            style={{ height: "90px", width: "90px", borderRadius: "12px" }}
          />
          <p>
            <span className="font-bold text-xl">The Sprintables™</span>
            <br />
            Campus Event Planner · Est. 2025
            <br />
            © 2025 The Sprintables. All Rights Reserved.
            <br />
            Athlone, Ireland
          </p>
        </aside>

        <aside>
          <p className="font-semibold text-lg mb-2">Project</p>
          <p>Agile Build & Delivery Group Project</p>
          <p>Technological University of the Shannon</p>
        </aside>

        <aside>
          <p className="font-semibold text-lg mb-2">Contact</p>
          <p>📞 +353 899 XXX 946</p>
          <p>📧 admin@sprintables.com</p>
          <p>🛠 support@sprintables.com</p>
        </aside>
      </footer>
    </div>
  );
};

export default Footer;
