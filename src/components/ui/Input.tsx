import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  trailingSlot?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, trailingSlot, id, ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-300"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          {trailingSlot && (
            <div className="absolute right-1.5 top-1/2 z-[1] -translate-y-1/2 flex items-center">
              {trailingSlot}
            </div>
          )}
          <input
            ref={ref}
            id={id}
            className={cn(
              "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all",
              error && "border-red-500 focus:ring-red-500",
              icon && "pl-10",
              trailingSlot && "pr-11",
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
