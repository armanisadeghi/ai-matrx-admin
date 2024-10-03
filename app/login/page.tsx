// app/login/page.tsx

import { login, signup, loginWithGoogle, loginWithGithub } from './actions'

export default function LoginPage() {
    return (
        <form>
            <label htmlFor="email">Email:</label>
            <input id="email" name="email" type="email" required />
            <label htmlFor="password">Password:</label>
            <input id="password" name="password" type="password" required />
            <button formAction={login}>Log in</button>
            <button formAction={signup}>Sign up</button>
            <button formAction={loginWithGoogle}>Log in with Google</button>
            <button formAction={loginWithGithub}>Log in with GitHub</button>
        </form>
    )
}
