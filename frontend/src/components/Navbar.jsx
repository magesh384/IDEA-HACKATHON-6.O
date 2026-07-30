import { useState } from "react";
import { Menu } from "lucide-react";
import { motion } from "framer-motion";
import Logo from "./Logo";
import MobileMenu from "./MobileMenu";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const links = [
    "Vault",
    "Plans",
    "Install",
    "News",
    "Help",
  ];

  return (
    <>
      <nav className="relative z-10 max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5">

        {/* Logo */}
        <Logo />

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm font-medium hover:opacity-70 transition-opacity"
            >
              {link}
            </a>
          ))}
        </div>

        {/* Desktop Buttons */}
        <div className="hidden md:flex items-center gap-3">

          <Link to="/signup">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            className="bg-[#7342E2] text-white rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg"
          >
            Start For Free
          </motion.button>
          </Link>

          <Link to="/login">
  <motion.button
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.95 }}
    className="bg-[#F2F2EE] rounded-full px-5 py-2.5 text-sm font-semibold"
  >
    Sign In
  </motion.button>
</Link>

        </div>

        {/* Mobile */}
        <button
          className="md:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu size={24} />
        </button>

      </nav>

      <MobileMenu
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}