// app/login/page.tsx

// app/login/page.tsx

import { login, signup } from './actions'

export default function LoginPage() {
    return (
        <div>
            <h1>Login</h1>
            <form action={login}>
                <input type="hidden" name="loginMethod" value="email" />
                <label htmlFor="email">Email:</label>
                <input id="email" name="email" type="email" required />
                <label htmlFor="password">Password:</label>
                <input id="password" name="password" type="password" required />
                <button type="submit">Log in</button>
            </form>

            <h2>Or login with:</h2>
            <form action={login}>
                <input type="hidden" name="loginMethod" value="google" />
                <button type="submit">Login with Google</button>
            </form>
            <form action={login}>
                <input type="hidden" name="loginMethod" value="github" />
                <button type="submit">Login with GitHub</button>
            </form>

            <h2>Don't have an account?</h2>
            <form action={signup}>
                <input type="hidden" name="loginMethod" value="email" />
                <label htmlFor="signupEmail">Email:</label>
                <input id="signupEmail" name="email" type="email" required />
                <label htmlFor="signupPassword">Password:</label>
                <input id="signupPassword" name="password" type="password" required />
                <button type="submit">Sign up</button>
            </form>
        </div>
    )
}
