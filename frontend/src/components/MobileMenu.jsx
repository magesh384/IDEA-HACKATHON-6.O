import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Logo from "./Logo";

const links = [
  "Vault",
  "Plans",
  "Install",
  "News",
  "Help",
];

export default function MobileMenu({ open, onClose }) {
  return (
    <AnimatePresence>

      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: .3 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{
              duration: .45,
              ease: [0.22,1,0.36,1]
            }}
            className="fixed right-0 top-0 z-50 h-screen w-[88vw] max-w-[360px] bg-[#CFC8C5] shadow-2xl"
          >

            <div className="flex justify-between items-center p-6">

              <Logo />

              <motion.button
                whileTap={{ scale: .9 }}
                onClick={onClose}
                className="h-10 w-10 rounded-full bg-black/10 flex items-center justify-center"
              >
                <X size={20}/>
              </motion.button>

            </div>

            <hr className="mx-6 border-black/10"/>

            <div className="p-6 space-y-3">

              {links.map((item,i)=>(
                <motion.a
                  key={item}
                  initial={{x:24,opacity:0}}
                  animate={{x:0,opacity:1}}
                  transition={{
                    delay:.18+i*.07
                  }}
                  href="#"
                  className="block rounded-xl px-4 py-3 text-lg hover:bg-black/10"
                >
                  {item}
                </motion.a>
              ))}

            </div>

            <div className="absolute bottom-8 left-6 right-6 space-y-3">

              <button className="w-full rounded-full py-3.5 bg-[#7342E2] text-white font-semibold">
                Start For Free
              </button>

              <button className="w-full rounded-full py-3.5 bg-[#F2F2EE] font-semibold">
                Sign In
              </button>

            </div>

          </motion.div>

        </>
      )}

    </AnimatePresence>
  );
}