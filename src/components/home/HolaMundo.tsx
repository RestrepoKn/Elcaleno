"use client";

import { motion } from "framer-motion";

export function HolaMundo() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_15%_15%,#1f5269_0%,transparent_34%),radial-gradient(circle_at_85%_80%,#5b3d27_0%,transparent_30%),#09111f] px-6 py-16">
      <motion.div aria-hidden="true" className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:56px_56px]" initial={{ backgroundPosition: "0% 50%" }} animate={{ backgroundPosition: "100% 50%" }} transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }} />
      <div className="relative z-10 w-full max-w-5xl">
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.35em] text-cyan-300">ELCALENO / 001</p>
        <div className="overflow-hidden text-[clamp(4.5rem,15vw,11rem)] font-black leading-[0.82] tracking-[-0.08em]">
          <motion.h1 initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}>Hola</motion.h1>
          <motion.h1 className="text-amber-300" initial={{ opacity: 0, y: 30, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}>Mundo</motion.h1>
        </div>
        <motion.div className="my-10 h-px origin-left bg-white/30" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 1, ease: "easeInOut" }} />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <motion.p className="max-w-md text-lg font-light tracking-wide text-white/60 sm:text-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.3 }}>
            Una base limpia para construir herramientas útiles, rápidas y completamente tipadas.
          </motion.p>
          <motion.span className="w-fit rounded-full border border-white/20 px-4 py-2 font-mono text-sm text-white/80" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 1.6, stiffness: 260, damping: 20 }}>
            TypeScript / Next.js
          </motion.span>
        </div>
      </div>
    </div>
  );
}