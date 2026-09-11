"use client";

import React from "react";
import { motion } from "framer-motion";

type Tag = "section" | "div" | "footer" | "header" | "main" | "article";

export interface AnimatedSectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: Tag;
  delayMs?: number;
  threshold?: number;
  duration?: number;
  animation?: "fade-up" | "fade-down" | "fade-scale" | "fade-in";
  id?: string;
}

const VARIANTS = {
  "fade-up": {
    hidden: { opacity: 0, y: 32, scale: 0.99 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  "fade-down": {
    hidden: { opacity: 0, y: -24 },
    visible: { opacity: 1, y: 0 },
  },
  "fade-scale": {
    hidden: { opacity: 0, y: 24, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  "fade-in": {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
};

const MOTION_COMPONENTS = {
  section: motion.section,
  div: motion.div,
  footer: motion.footer,
  header: motion.header,
  main: motion.main,
  article: motion.article,
} as const;

export default function AnimatedSection({
  as = "section",
  children,
  className = "",
  delayMs = 0,
  threshold = 0.1,
  duration = 0.75,
  animation = "fade-up",
  style,
  id,
  ...props
}: AnimatedSectionProps) {
  const Comp = MOTION_COMPONENTS[as] || motion.section;
  const variant = VARIANTS[animation] || VARIANTS["fade-up"];

  return (
    <Comp
      id={id}
      className={className}
      style={style}
      variants={variant}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: threshold, margin: "0px 0px -40px 0px" }}
      transition={{
        duration,
        delay: delayMs / 1000,
        ease: [0.16, 1, 0.3, 1], // Smooth Apple quintic easing
      }}
      {...(props as any)}
    >
      {children}
    </Comp>
  );
}
