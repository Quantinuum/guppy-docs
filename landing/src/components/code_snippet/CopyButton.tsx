'use client'

import { cn } from '@quantinuum/quantinuum-ui'
import { Check, Copy } from 'lucide-react'
import React from 'react'
import { useClipboard } from './useClipboard'

export const CopyButton = (props: {
    textToCopy: string
    className?: string
    children?: React.ReactNode
    title?: string
}) => {
    const copy = useClipboard(props.textToCopy)
    return (
        <button
            onClick={() => copy.copyToClipboard()}
            className="contents"
            title={props.title}
            type="button"
        >
            {copy.hasCopied ? (
                <span>
                    <div
                        aria-atomic="true"
                        aria-live="polite"
                        className="sr-only"
                        role="status"
                    >
                        Copied!
                    </div>
                    <Check
                        className={cn(
                            `ml-1 inline-block text-green-700 dark:text-green-300 w-3.5 h-3.5 m-px`,
                            props.className
                        )}
                    />
                </span>
            ) : (
                <Copy
                    className={cn(
                        `hover:cursor-pointer mb-0.5 inline-block w-3.5 h-3.5 ml-1 m-px text-muted-foreground`,
                        props.className
                    )}
                />
            )}
            {props.children}
        </button>
    )
}
