import React from "react";
import {useMotionTemplate, useMotionValue, motion, MotionValue, HTMLMotionProps} from "framer-motion";
import {cn} from "@/lib/utils";

interface MatrxHoverWrapperProps extends Omit<HTMLMotionProps<"div">, "style"> {
    children: React.ReactNode;
    radius?: number;
    gradientColor?: string;
}

interface MouseMoveEvent {
    currentTarget: HTMLDivElement;
    clientX: number;
    clientY: number;
}

const MatrxHoverWrapper = React.forwardRef<HTMLDivElement, MatrxHoverWrapperProps>((
    {
        children,
        className,
        radius = 100,
        gradientColor = "var(--blue-500)",
        ...props
    }, ref) => {
    const [visible, setVisible] = React.useState<boolean>(false);
    const mouseX: MotionValue<number> = useMotionValue(0);
    const mouseY: MotionValue<number> = useMotionValue(0);

    const handleMouseMove = React.useCallback(({currentTarget, clientX, clientY}: MouseMoveEvent) => {
        const {left, top} = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }, [mouseX, mouseY]);

    return (
        <motion.div
            style={{
                background: useMotionTemplate`
          radial-gradient(
            ${visible ? radius + "px" : "0px"} circle at ${mouseX}px ${mouseY}px,
            ${gradientColor},
            transparent 80%
          )
        `
            }}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
            className={cn(
                "p-[2px] rounded-lg transition duration-300 group/input",
                className
            )}
            ref={ref}
            {...props}
        >
            {React.Children.map(children, (child) => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, {
                        className: cn(
                            'flex w-full border-none bg-gray-50 dark:bg-zinc-800 text-black dark:text-white shadow-input rounded-md px-3 py-2 text-sm',
                            'placeholder:text-neutral-400 dark:placeholder-text-neutral-600',
                            'focus-visible:outline-none focus-visible:ring-[2px] focus-visible:ring-neutral-400 dark:focus-visible:ring-neutral-600',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            'dark:shadow-[0px_0px_1px_1px_var(--neutral-700)]',
                            'group-hover/input:shadow-none transition duration-400',
                            (child.props as { className?: string }).className
                        )
                    });
                }
                return child;
            })}
        </motion.div>
    );
});

MatrxHoverWrapper.displayName = "MatrxHoverWrapper";

export default MatrxHoverWrapper;
