"use client";

import { useState } from "react";
import { m as motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp, stagger } from "@/lib/motion";
import { isBootScreen } from "@/lib/boot";

interface StaggerProps extends HTMLMotionProps<"div"> {
  step?: number;
  delay?: number;
}

/** Container that reveals its <StaggerItem> children one after another, once. */
export function Stagger({ step, delay, children, ...props }: StaggerProps) {
  // First screen of a launch: content shows at once, the cascade is for navigations.
  const [reveal] = useState(() => !isBootScreen());
  return (
    <motion.div variants={stagger(step, delay)} initial={reveal ? "hidden" : false} animate="show" {...props}>
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
