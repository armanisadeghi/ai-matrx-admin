// components/auth/AuthSignUp.tsx

"use client";

import React from "react";
import {Button, Input, Checkbox, Link, Divider} from "@heroui/react";
import {Icon} from "@iconify/react";

export default function Component() {
    const [isVisible, setIsVisible] = React.useState(false);
    const [isConfirmVisible, setIsConfirmVisible] = React.useState(false);

    const toggleVisibility = () => setIsVisible(!isVisible);
    const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible);

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-500 p-2 sm:p-4 lg:p-8">
            <div className="flex w-full max-w-sm flex-col gap-4 rounded-large bg-content1 px-8 pb-10 pt-6 shadow-small">
                <p className="pb-2 text-xl font-medium">Sign Up</p>
                <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
                    <Input
                        isRequired
                        label="Username"
                        name="username"
                        placeholder="Enter your username"
                        type="text"
                        variant="bordered"
                    />
                    <Input
                        isRequired
                        label="Email Address"
                        name="email"
                        placeholder="Enter your email"
                        type="email"
                        variant="bordered"
                    />
                    <Input
                        isRequired
                        endContent={
                            <button type="button" onClick={toggleVisibility}>
                                {isVisible ? (
                                    <Icon
                                        className="pointer-events-none text-2xl text-default-400"
                                        icon="solar:eye-closed-linear"
                                    />
                                ) : (
                                    <Icon
                                        className="pointer-events-none text-2xl text-default-400"
                                        icon="solar:eye-bold"
                                    />
                                )}
                            </button>
                        }
                        label="Password"
                        name="password"
                        placeholder="Enter your password"
                        type={isVisible ? "text" : "password"}
                        variant="bordered"
                    />
                    <Input
                        isRequired
                        endContent={
                            <button type="button" onClick={toggleConfirmVisibility}>
                                {isConfirmVisible ? (
                                    <Icon
                                        className="pointer-events-none text-2xl text-default-400"
                                        icon="solar:eye-closed-linear"
                                    />
                                ) : (
                                    <Icon
                                        className="pointer-events-none text-2xl text-default-400"
                                        icon="solar:eye-bold"
                                    />
                                )}
                            </button>
                        }
                        label="Confirm Password"
                        name="confirmPassword"
                        placeholder="Confirm your password"
                        type={isConfirmVisible ? "text" : "password"}
                        variant="bordered"
                    />
                    <Checkbox isRequired className="py-4" size="sm">
                        I agree with the&nbsp;
                        <Link href="#" size="sm">
                            Terms
                        </Link>
                        &nbsp; and&nbsp;
                        <Link href="#" size="sm">
                            Privacy Policy
                        </Link>
                    </Checkbox>
                    <Button color="primary" type="submit">
                        Sign Up
                    </Button>
                </form>
                <div className="flex items-center gap-4 py-2">
                    <Divider className="flex-1" />
                    <p className="shrink-0 text-tiny text-default-500">OR</p>
                    <Divider className="flex-1" />
                </div>
                <div className="flex flex-col gap-2">
                    <Button
                        startContent={<Icon icon="flat-color-icons:google" width={24} />}
                        variant="bordered"
                    >
                        Continue with Google
                    </Button>
                    <Button
                        startContent={<Icon className="text-default-500" icon="fe:github" width={24} />}
                        variant="bordered"
                    >
                        Continue with Github
                    </Button>
                </div>
                <p className="text-center text-small">
                    Already have an account?&nbsp;
                    <Link href="#" size="sm">
                        Log In
                    </Link>
                </p>
            </div>
        </div>
    );
}
