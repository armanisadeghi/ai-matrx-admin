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

import { useEffect, useEffectEvent, useRef, useState } from "react";
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
import { readTestLogin, writeTestLogin } from "./testLoginStore";

const PROVIDERS: SelectOption<TestProvider>[] = [
  { value: "google", label: "Google" },
  { value: "github", label: "GitHub" },
  { value: "apple", label: "Apple" },
  { value: "email", label: "Email" },
];

function TestLoginFields({ initial, onUse }: { initial: TestLogin | null; onUse: (t: TestLogin) => void }) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState<TestLogin>(initial ?? EMPTY_TEST_LOGIN);
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

export function WelcomeDoor({ showDoor, onFinished }: { showDoor: boolean; onFinished: () => void }) {
  const testable = useAppSelector(selectIsSuperAdminDebugger) && Boolean(useAppSelector(selectIsDebugMode));
  const [user, setUser] = useState<User | null>(null);
  const [test, setTest] = useState<TestLogin | null>(null);
  // A reload keeps the admin's test login (this tab only): restored once debug mode confirms who may use it.
  const restored = useRef(false);
  useEffect(() => {
    if (!testable || restored.current) return;
    restored.current = true;
    const saved = readTestLogin();
    if (saved && testLoginUsable(saved)) setTest(saved);
  }, [testable]);
  const [done, setDone] = useState<WelcomeDone | null>(null);
  // Skip (no name to search by, or nothing found): the welcome page's own content, this visit.
  const [skipped, setSkipped] = useState(false);
  // Their brand was made. "Looks right" then reports `done` at once and the sequence moves on by itself; the
  // structured "something's off" path never does, so after a moment it offers its own Continue (never a dead end).
  const [created, setCreated] = useState(false);
  const [stuckOpen, setStuckOpen] = useState(false);
  useEffect(() => {
    if (!created || done) return;
    const t = window.setTimeout(() => setStuckOpen(true), 1500);
    return () => window.clearTimeout(t);
  }, [created, done]);
  const [moved, setMoved] = useState(false);

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
    setCreated(true);
    const { error } = await supabase.auth.updateUser({ data: { [ONBOARDING_METADATA_KEY]: true } });
    if (error) toast.error(`Could not save your progress: ${extractErrorMessage(error)}`);
  };

  const doorOpen = Boolean(login) && !done && !skipped && !moved;
  // The door is this step's only content: when it is over (Skip, a structured Create, or "Looks right" with no
  // paid cards to show) the sequence moves on. The paid cards, when there are any, end with a Continue.
  const finished = useEffectEvent(onFinished);
  const cardsHost = done?.paidHost ?? null;
  const over = skipped || moved || (Boolean(done) && !cardsHost);
  useEffect(() => {
    if (over) finished();
  }, [over]);
  return (
    <div className="flex flex-col gap-8">
      {testable ? (
        <TestLoginFields
          key={test ? "restored" : "empty"}
          initial={test}
          onUse={(t) => {
            writeTestLogin(t);
            setDone(null);
            setSkipped(false);
            setTest(t);
          }}
        />
      ) : null}
      {doorOpen && login ? (
        // The door's frames that ask something (name, "couldn't find you") carry their own Skip; every other stage
        // (searching, the found grid) gets this one, so the step always has a way out.
        <div className="group/door flex flex-col gap-4">
        <SmartAddBrand
          key={login.subject}
          door="welcome"
          loginSeed={login}
          onCreated={() => void completeOnboarding()}
          onWelcomeDone={setDone}
          onWelcomeSkip={() => setSkipped(true)}
        />
          <Button
            variant="quiet"
            className="self-center group-has-[[data-testid=welcome-skip]]/door:hidden"
            onClick={() => setSkipped(true)}
            data-testid="welcome-door-skip"
          >
            Skip
          </Button>
        </div>
      ) : null}
      {stuckOpen && !done && !moved ? (
        <div className="flex justify-center">
          <Button variant="quiet" onClick={() => setMoved(true)} data-testid="welcome-created-continue">
            Continue
          </Button>
        </div>
      ) : null}
      {!login && !over ? <div aria-busy className="min-h-[24rem]" data-testid="welcome-door-pending" /> : null}
      {done && cardsHost ? (
        <>
          <WelcomeSearchCards host={cardsHost} names={ownNames(done.brand, cardsHost)} />
          <div className="flex justify-center">
            <Button variant="primary" hero onClick={onFinished} data-testid="welcome-continue">
              Continue
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
