import { motion } from 'framer-motion'

export type AddGameActionsProps = {
    disabled: boolean
    isSubmitting: boolean
}

export function AddGameActions({ disabled, isSubmitting }: AddGameActionsProps) {
    return (
        <div className="pt-2">
            <motion.button
                type="submit"
                disabled={disabled}
                className="
              w-full py-3
              bg-crimson-600 hover:bg-crimson-500 disabled:bg-crimson-900/50 disabled:cursor-not-allowed
              text-white font-medium
              rounded-lg shadow-crimson-glow
              transition-all duration-200
            "
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
            >
                {isSubmitting ? 'Adding...' : 'Add to Library'}
            </motion.button>
        </div>
    )
}
