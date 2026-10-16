"use client";

/**
 * Sign-up welcome — the door at the top of /welcome (SIGNUP-WELCOME.md; smart-add VISION Part 29). It reads the
 * signed-in auth user (identities and the confirmed email: what the login proves) and hosts Smart Add's
 * `door="welcome"` on the stable subject `signup_welcome:<user id>`. "Looks right" ends here: the onboarding flag
 * flips, the paid cards run when the confirmed site qualifies, and the welcome page's own content takes over.
 *
 * Admin test login: a super admin with debug mode on gets a small field set (email, name, provider, Workspace
 * domain, GitHub login) that replaces the real seed for this session on a test subject. Nobody else sees it.
 */

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { FlaskConical } from "lucide-react";
import { Button, Field, Select, type SelectOption } from "@ai-matrx/design-system/controls";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import { selectIsSuperAdminDebugger } from "@/lib/redux/selectors/userSelectors";
import { supabase } from "@/utils/supabase/client";
import { ONBOARDING_METADATA_KEY } from "@/utils/onboarding";
import { toast } from "@/lib/toast";
import { extractErrorMessage } from "@/utils/errors";
import { SmartAddBrand } from "../SmartAddBrand";
import {
  EMPTY_TEST_LOGIN,
  ownNames,
  testLoginUsable,
  testLoginUser,
  testSubject,
  welcomeSubject,
  type TestLogin,
  type TestProvider,
  type WelcomeDone,
  type WelcomeLogin,
} from "./welcomeSession";
import { WelcomeSearchCards } from "./WelcomeSearchCards";
import { resumeWelcomeProfiles } from "./saveWelcomeProfile";

const PROVIDERS: SelectOption<TestProvider>[] = [
  { value: "google", label: "Google" },
  { value: "github", label: "GitHub" },
  { value: "apple", label: "Apple" },
  { value: "email", label: "Email" },
];

function TestLoginFields({ onUse }: { onUse: (t: TestLogin) => void }) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState<TestLogin>(EMPTY_TEST_LOGIN);
  const set = (k: keyof TestLogin) => (e: React.ChangeEvent<HTMLInputElement>) => setT((cur) => ({ ...cur, [k]: e.target.value }));
  return (
    <div className="flex flex-col gap-2" data-testid="welcome-test-login">
      <Button variant="quiet" className="self-start" icon={<FlaskConical aria-hidden />} pressed={open} onClick={() => setOpen((v) => !v)}>
        Test login
      </Button>
      {open ? (
        <form
          className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_8rem_1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            if (testLoginUsable(t)) onUse(t);
          }}
        >
          {/* ui-exception: raw test values (an address, a domain, a login), never prose */}
          <Field value={t.email} onChange={set("email")} placeholder="Email" aria-label="Email" data-testid="welcome-test-email" />
          {/* ui-exception: raw test value */}
          <Field value={t.name} onChange={set("name")} placeholder="Name" aria-label="Name" data-testid="welcome-test-name" />
          <Select aria-label="Provider" value={t.provider} options={PROVIDERS} onValueChange={(v) => setT((cur) => ({ ...cur, provider: v }))} />
          {/* ui-exception: raw test value */}
          <Field value={t.workspaceDomain} onChange={set("workspaceDomain")} placeholder="Workspace domain" aria-label="Workspace domain" data-testid="welcome-test-domain" />
          {/* ui-exception: raw test value */}
          <Field value={t.githubLogin} onChange={set("githubLogin")} placeholder="GitHub login" aria-label="GitHub login" data-testid="welcome-test-github" />
          <Button type="submit" variant="primary" disabled={!testLoginUsable(t)} data-testid="welcome-test-use">
            Use
          </Button>
        </form>
      ) : null}
    </div>
  );
}

export function WelcomeDoor({ showDoor, children }: { showDoor: boolean; children: React.ReactNode }) {
  const testable = useAppSelector(selectIsSuperAdminDebugger) && Boolean(useAppSelector(selectIsDebugMode));
  const [user, setUser] = useState<User | null>(null);
  const [test, setTest] = useState<TestLogin | null>(null);
  const [done, setDone] = useState<WelcomeDone | null>(null);

  // A "Looks right" whose profile write never finished (the page went away mid-way) is written now, door or not.
  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id;
      if (!id) return;
      try {
        await resumeWelcomeProfiles(id);
      } catch (error) {
        toast.error(`Your profile was not updated: ${extractErrorMessage(error)}`);
      }
    });
  }, []);

  useEffect(() => {
    if (!showDoor) return;
    let live = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (live) setUser(data.user ?? null);
    });
    return () => {
      live = false;
    };
  }, [showDoor]);

  const login: WelcomeLogin | null = test
    ? { user: testLoginUser(test), subject: testSubject(test), test: true }
    : showDoor && user
      ? { user, subject: welcomeSubject(user.id), test: false }
      : null;

  /** Their brand exists: the welcome is done for this account (never for an admin's test login). */
  const completeOnboarding = async () => {
    if (login?.test) return;
    const { error } = await supabase.auth.updateUser({ data: { [ONBOARDING_METADATA_KEY]: true } });
    if (error) toast.error(`Could not save your progress: ${extractErrorMessage(error)}`);
  };

  const doorOpen = Boolean(login) && !done;
  return (
    <div className="flex flex-col gap-8">
      {testable ? <TestLoginFields onUse={(t) => {
        setDone(null);
        setTest(t);
      }} /> : null}
      {doorOpen && login ? (
        <SmartAddBrand
          key={login.subject}
          door="welcome"
          loginSeed={login}
          onCreated={() => void completeOnboarding()}
          onWelcomeDone={setDone}
        />
      ) : null}
      {done?.paidHost ? <WelcomeSearchCards host={done.paidHost} names={ownNames(done.brand, done.paidHost)} /> : null}
      {children}
    </div>
  );
}
