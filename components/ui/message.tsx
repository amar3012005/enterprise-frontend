"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
    from: "user" | "assistant"
}

const Message = React.forwardRef<HTMLDivElement, MessageProps>(
    ({ className, from, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "flex w-full gap-3 py-2",
                    from === "user" ? "flex-row-reverse" : "flex-row",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        )
    }
)
Message.displayName = "Message"

interface MessageAvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    name?: string
}

const MessageAvatar = ({ src, name, className, ...props }: MessageAvatarProps) => {
    return (
        <div className={cn("flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-muted overflow-hidden border border-black/5", className)}>
            {src ? (
                <img src={src} alt={name} className="h-full w-full object-cover" />
            ) : (
                <span className="text-[10px] font-bold text-black/40">
                    {name?.slice(0, 2).toUpperCase() || "AI"}
                </span>
            )}
        </div>
    )
}

interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "contained" | "flat"
}

const MessageContent = React.forwardRef<HTMLDivElement, MessageContentProps>(
    ({ className, variant = "contained", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "text-sm leading-relaxed",
                    variant === "contained" && [
                        "rounded-2xl px-4 py-2",
                        "group-[[from=user]]:bg-black group-[[from=user]]:text-white",
                        "group-[[from=assistant]]:bg-[#f2f2f2] group-[[from=assistant]]:text-black group-[[from=assistant]]:border group-[[from=assistant]]:border-black/5"
                    ],
                    variant === "flat" && "py-1",
                    className
                )}
                {...props}
            />
        )
    }
)
MessageContent.displayName = "MessageContent"

export { Message, MessageAvatar, MessageContent }
