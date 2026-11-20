"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp, stagger } from "@/lib/motion";

interface StaggerProps extends HTMLMotionProps<"div"> {
  step?: number;
  delay?: number;
}

/** Container that reveals its <StaggerItem> children one after another, once. */
export function Stagger({ step, delay, children, ...props }: StaggerProps) {
  return (
    <motion.div variants={stagger(step, delay)} initial="hidden" animate="show" {...props}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div variants={fadeUp} {...props}>
      {children}
    </motion.div>
  );
}
