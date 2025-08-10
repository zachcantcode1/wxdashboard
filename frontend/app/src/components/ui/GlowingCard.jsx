import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import GetStartedButton from '@/components/shsfui/button/GetStartedButton'

/**
 * GlowingCard
 * A simple reusable card with a glowing, animated border and a CTA button.
 */
export function GlowingCard({
  title = 'Current Conditions',
  description = 'Check live weather now',
  to = '/current-weather',
  ctaText = "Let's Go!",
  hero = false,
  className = '',
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('relative isolate rounded-2xl p-[1px]', className)}
    >
      {/* Glowing border */}
      <div className="absolute -inset-6 rounded-2xl bg-[conic-gradient(at_50%_50%,theme(colors.blue.500),theme(colors.cyan.400),theme(colors.indigo.500),theme(colors.blue.500))] opacity-50 blur-xl" />
      {/* Subtle animated light sweep */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-16 rounded-full bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-blue-600/20 blur-3xl"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: 'linear' }}
      />

      {/* Card body */}
      <div className={cn(
        'relative z-10 rounded-2xl bg-neutral-950 border border-neutral-800 text-center overflow-hidden',
        hero ? 'px-8 py-10 md:px-12 md:py-14' : 'px-6 py-8'
      )}>

        <div className="relative z-10">
          {title ? (
            <h3 className={cn(
              'text-white tracking-tight',
              hero ? 'text-4xl md:text-5xl lg:text-6xl font-extrabold' : 'text-2xl font-semibold'
            )}>{title}</h3>
          ) : null}
          {description ? (
            <p className={cn('mt-2 text-slate-300', hero ? 'text-base md:text-lg' : '')}>{description}</p>
          ) : null}

          <div className="mt-6">
            <GetStartedButton to={to} size="lg">
              {ctaText}
            </GetStartedButton>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default GlowingCard
