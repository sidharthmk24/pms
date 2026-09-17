"use client";

import { motion, type Variants } from "framer-motion";

interface StepItem {
  step: string;
  title: string;
  subtitle: string;
  desc: string;
}

interface PublishProcessStepsProps {
  steps: StepItem[];
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1, // Smooth, rapid staggered entrance
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 24,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1] as const, // Apple quintic easeOut for super smooth snappy feel
    },
  },
};

export default function PublishProcessSteps({ steps }: PublishProcessStepsProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2, margin: "0px 0px -50px 0px" }}
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      {steps.map((item) => (
        <motion.div
          key={item.step}
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2, ease: "easeOut" } }}
          className="relative flex flex-col justify-between rounded-sm border border-[#7e2562]/15 bg-white p-5 shadow-xs transition-colors hover:border-[#7e2562]/35 hover:shadow-plum-sm group"
        >
          <div>
            <span className="numeric flex h-10 w-10 items-center justify-center rounded-sm bg-[#7e2562] text-sm font-black text-white shadow-plum-sm group-hover:scale-105 transition-transform">
              {item.step}
            </span>
            <h3 className="mt-4 text-lg font-bold text-foreground leading-snug">
              {item.title}
            </h3>
            <span className="text-xs font-semibold text-primary block mt-0.5">
              {item.subtitle}
            </span>
            <p className="mt-2.5 text-xs text-muted-foreground leading-relaxed">
              {item.desc}
            </p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
