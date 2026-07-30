import { motion } from "framer-motion";

import { useNavigate } from "react-router-dom";
import {
  ArrowRightCircle,
  Zap,
  LockKeyhole,
  Fingerprint,
} from "lucide-react";

const fadeUp = {
  hidden: {
    opacity: 0,
    y: 28,
  },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.15,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
};

export default function Hero() {
      const navigate = useNavigate();
  return (
    <section className="relative z-10 flex justify-center pt-[clamp(40px,8vw,72px)] pb-12">

      <div className="max-w-[660px] text-center px-6">

        {/* Heading */}

        <motion.h1
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="text-[clamp(1.65rem,5vw,3rem)] leading-[1.05] tracking-[-0.01em]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          <span className="whitespace-nowrap">

            Lock

            <Zap
              size={24}
              style={{
                display: "inline",
                margin: "0 4px",
                position: "relative",
                top: "-2px",
              }}
            />

            Down Your

            <LockKeyhole
              size={24}
              style={{
                display: "inline",
                margin: "0 4px",
                position: "relative",
                top: "-2px",
              }}
            />

            Passwords

          </span>

          <br />

          with Ironclad Security

          <Fingerprint
            size={24}
            style={{
              display: "inline",
              marginLeft: 6,
              position: "relative",
              top: "-2px",
            }}
          />

        </motion.h1>

        {/* Paragraph */}

        <motion.p
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="mt-8 mx-auto max-w-[560px] text-[clamp(.9rem,2.5vw,1.1rem)] leading-[1.65] opacity-80"
        >
          Zero stress, total control. Unbreakable storage,
          one-tap access, and pro-grade tools for your
          non-stop world.
        </motion.p>

        {/* Button */}

        <motion.button
          
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          whileHover={{
            scale: 1.04,
            filter: "brightness(1.1)",
          }}
          whileTap={{
            scale: 0.96
          }}
          onClick={() => navigate("/signup")}
          className="mx-auto mt-10 flex items-center justify-between gap-8 rounded-full bg-[#7342E2] px-6 py-[17px] min-w-[210px] text-white shadow-[0_4px_24px_rgba(115,66,226,.28)]"
        >

          <span>Get It Free</span>

          <ArrowRightCircle size={20}/>

        </motion.button>

      </div>

    </section>
  );
}