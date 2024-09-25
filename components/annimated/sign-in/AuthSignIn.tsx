'use client';

import Link from "next/link";
import {cn} from "@/lib/utils";
import {IconBrandGithub, IconBrandGoogle} from "@tabler/icons-react";
import MatrixLogo from "@/public/MatrixLogo";


function AuthSignInForm() {
    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        console.log("submitted form", e);
    }

    return (
        <form className="bg-gray-50 dark:bg-neutral-950" onSubmit={onSubmit}>
            <div className="flex items-center w-full justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
                <div className="mx-auto w-full max-w-md">
                    <div>
                        <div className="flex">
                            <MatrixLogo size="lg"/>
                        </div>
                        <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-black dark:text-white">
                            Sign up for an account
                        </h2>
                    </div>

                    <div className="mt-10">
                        <div>
                            <form onSubmit={onSubmit} className="space-y-6">
                                <div>
                                    <label
                                        htmlFor="name"
                                        className="block text-sm font-medium leading-6 text-neutral-700 dark:text-neutral-400"
                                    >
                                        Full name
                                    </label>
                                    <div className="mt-2">
                                        <input
                                            id="name"
                                            type="name"
                                            placeholder="Your Full Name"
                                            className="block w-full bg-white dark:bg-neutral-900 px-4 rounded-md border-0 py-1.5  shadow-input text-black placeholder:text-gray-400 focus:ring-2 focus:ring-neutral-400 focus:outline-none sm:text-sm sm:leading-6 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="email"
                                        className="block text-sm font-medium leading-6 text-neutral-700 dark:text-neutral-400"
                                    >
                                        Email address
                                    </label>

                                    <div className="mt-2">
                                        <input
                                            id="email"
                                            type="email"
                                            placeholder="email@youremail.com"
                                            className="block w-full bg-white dark:bg-neutral-900 px-4 rounded-md border-0 py-1.5  shadow-input text-black placeholder:text-gray-400 focus:ring-2 focus:ring-neutral-400 focus:outline-none sm:text-sm sm:leading-6 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="password"
                                        className="block text-sm font-medium leading-6 text-neutral-700 dark:text-neutral-400"
                                    >
                                        Password
                                    </label>

                                    <div className="mt-2">
                                        <input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            className="block w-full bg-white dark:bg-neutral-900 px-4 rounded-md border-0 py-1.5  shadow-input text-black placeholder:text-gray-400 focus:ring-2 focus:ring-neutral-400 focus:outline-none sm:text-sm sm:leading-6 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <button
                                        className="bg-black relative z-10 hover:bg-black/90  text-white text-sm md:text-sm transition font-medium duration-200  rounded-full px-4 py-2  flex items-center justify-center w-full dark:text-black dark:bg-white dark:hover:bg-neutral-100 dark:hover:shadow-xl">
                                        Sign Up
                                    </button>
                                    <p
                                        className={cn(
                                            "text-sm text-neutral-600 text-center mt-4  dark:text-neutral-400"
                                        )}
                                    >
                                        Already have an account?{" "}
                                        <Link href="#" className="text-black dark:text-white">
                                            Sign in
                                        </Link>
                                    </p>
                                </div>
                            </form>
                        </div>

                        <div className="mt-10">
                            <div className="relative">
                                <div
                                    className="absolute inset-0 flex items-center"
                                    aria-hidden="true"
                                >
                                    <div className="w-full border-t border-neutral-300 dark:border-neutral-700"/>
                                </div>
                                <div className="relative flex justify-center text-sm font-medium leading-6">
                  <span className="bg-gray-50 px-6 text-neutral-400 dark:text-neutral-500 dark:bg-neutral-950">
                    Or continue with
                  </span>
                                </div>
                            </div>

                            <div className="mt-6 w-full flex flex-col items-center justify-center space-y-4"> {/* This was changed so need to make sure it looks ok */}
                                <button
                                    onClick={() => {
                                    }}
                                    className="bg-red-500 relative z-10 hover:bg-red-600 text-white text-sm md:text-sm transition font-medium duration-200 rounded-full px-4 py-1.5 flex items-center justify-center w-full dark:text-white dark:hover:bg-red-700"
                                >
                                    <IconBrandGoogle className="h-5 w-5 mr-2"/>   {/* didn't have mr-2 in the original */}
                                    <span className="text-sm font-semibold leading-6">
                                        Google
                                    </span>
                                </button>

                                <button
                                    onClick={() => {
                                    }}
                                    className="bg-black relative z-10 hover:bg-black/90  text-white text-sm md:text-sm transition font-medium duration-200  rounded-full px-4 py-1.5  flex items-center justify-center w-full dark:text-black dark:bg-white dark:hover:bg-neutral-100 dark:hover:shadow-xl"
                                >
                                    <IconBrandGithub className="h-5 w-5 mr-2"/>  {/* didn't have mr-2 in the original */}
                                    <span className="text-sm font-semibold leading-6">
                                        GitHub
                  </span>
                                </button>
                            </div>

                            <p className="text-neutral-600 dark:text-neutral-400 text-sm text-center mt-8">
                                By clicking on sign up, you agree to our{" "}
                                <Link
                                    href="#"
                                    className="text-neutral-500 dark:text-neutral-300"
                                >
                                    Terms of Service
                                </Link>{" "}
                                and{" "}
                                <Link
                                    href="#"
                                    className="text-neutral-500 dark:text-neutral-300"
                                >
                                    Privacy Policy
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}

export default AuthSignInForm;
