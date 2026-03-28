'use client'

import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 18, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="min-h-full"
    >
      <motion.div
        initial={{ scaleX: 0, opacity: 0.8 }}
        animate={{ scaleX: 1, opacity: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="pointer-events-none fixed left-0 right-0 top-0 z-40 h-0.5 origin-left bg-gradient-to-r from-primary via-sky-400 to-emerald-400"
      />
      {children}
    </motion.div>
  )
}