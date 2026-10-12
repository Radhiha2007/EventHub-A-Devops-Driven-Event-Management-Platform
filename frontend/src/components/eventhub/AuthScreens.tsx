import { useState, type ChangeEvent, type FormEvent } from "react";
import "./AuthScreens.css";
import {
  ArrowLeft, ArrowRight, Check, Eye, EyeOff, GraduationCap,
  ShieldCheck, Sparkles, UsersRound, CalendarDays, Ticket,
  Compass, LockKeyhole,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Starburst } from "./illustrations";

type SignupRole = "student" | "club-head";

const emailSchema = z.string().trim()
  .min(1, "Enter your university email.")
  .max(255, "Email is too long.")
  .email("Enter a valid email address.");

const signupSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your full name.").max(100),
  email: emailSchema,
  registrationNumber: z.string().trim()
    .min(1, "Enter your registration number.").max(50),
  clubName: z.string().trim().max(100, "Club name is too long."),
  password: z.string().min(8, "Use at least 8 characters.").max(128),
  confirmPassword: z.string().min(1, "Confirm your password."),
}).refine(v => v.password === v.confirmPassword, {
  message: "Those passwords don't match.",
  path: ["confirmPassword"],
});

type SignupValues = {
  fullName: string;
  email: string;
  registrationNumber: string;
  clubName: string;
  password: string;
  confirmPassword: string;
};

const emptyValues: SignupValues = {
  fullName: "",
  email: "",
  registrationNumber: "",
  clubName: "",
  password: "",
  confirmPassword: "",
};

function Brand() {
  return (
    <a className="auth-brand" href="/" aria-label="EventHub home">
      <Starburst />
      <span>EventHub</span><span className="auth-brand-dot">.</span>
    </a>
  );
}

function WelcomePanel({ signup = false }: { signup?: boolean }) {
  return (
    <aside className="auth-welcome">
      <Brand />
      <div className="auth-welcome-copy">
        <span className="auth-eyebrow">
          <Sparkles size={15} /> CAMPUS LIFE, CONNECTED
        </span>
        <h1>{signup ? "Your campus story starts here." : "Your people. Your campus. Your moments."}</h1>
        <p>
          {signup
            ? "Find your community, discover new interests, and make every campus day count."
            : "Discover what's happening around you and never miss a moment worth remembering."}
        </p>
      </div>

      <div className="auth-art" aria-label="Illustration of campus events">
        <div className="auth-orbit auth-orbit-one" />
        <div className="auth-orbit auth-orbit-two" />
        <span className="auth-art-spark spark-one">✳</span>
        <span className="auth-art-spark spark-two">✦</span>
        <div className="auth-art-card art-card-one">
          <span className="art-icon coral"><CalendarDays /></span>
          <span><b>Find your next</b><small>campus adventure</small></span>
        </div>
        <div className="auth-art-card art-card-two">
          <span className="art-icon blue"><UsersRound /></span>
          <span><b>Meet your people</b><small>make new memories</small></span>
        </div>
        <div className="auth-ticket">
          <Ticket size={28} />
          <span>GOOD TIMES</span>
          <b>START HERE!</b>
          <div className="ticket-dots" />
        </div>
        <span className="auth-floating-label">CREATE · CONNECT · CELEBRATE</span>
      </div>

      <div className="auth-welcome-footer">
        <span className="auth-footer-icon"><Compass size={19} /></span>
        <p>One campus. A thousand possibilities.</p>
        <span className="auth-footer-dots">● ● ●</span>
      </div>
    </aside>
  );
}

function AuthLayout({
  children, signup = false,
}: { children: React.ReactNode; signup?: boolean }) {
  return (
    <main className="eventhub auth-page">
      <div className="auth-layout">
        <WelcomePanel signup={signup} />
        <section className="auth-content"
          aria-label={signup ? "Create an account" : "Sign in"}>
          <div className="auth-mobile-brand"><Brand /></div>
          {children}
        </section>
      </div>
      <p className="auth-copyright">
        © 2026 EventHub · Made for campus life
      </p>
    </main>
  );
}

function FormField({
  id, label, value, onChange, type = "text", autoComplete, maxLength, error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  autoComplete?: string;
  maxLength?: number;
  error?: string;
}) {
  return (
    <div className="auth-field">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        type={type}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className="auth-input"
      />
      {error && <p className="auth-field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

function PasswordField({
  id, label, value, onChange, error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-field">
      <Label htmlFor={id}>{label}</Label>
      <div className="auth-password-wrap">
        <Input
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="auth-input"
        />
        <button
          type="button"
          className="auth-password-toggle"
          aria-label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible(v => !v)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="auth-field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

function issueMessages(issues: z.core.$ZodIssue[]) {
  return Object.fromEntries(issues.map(i => [String(i.path[0]), i.message]));
}

export function LoginScreen() {
  const [status, setStatus] = useState("");

  return (
    <AuthLayout>
      <div className="auth-form-wrap auth-login-wrap">
        <div className="auth-heading">
          <span className="auth-heading-icon"><LockKeyhole /></span>
          <p className="auth-kicker">WELCOME BACK</p>
          <h2>Let's get you in.</h2>
          <p className="auth-subtitle">
            Sign in with your university Microsoft account.
          </p>
        </div>

        <div className="auth-login-highlight">
          <span className="auth-login-highlight-icon"><ShieldCheck /></span>
          <span>
            <b>One campus account</b>
            <small>Use your university Microsoft credentials.</small>
          </span>
        </div>

        <Button
          type="button"
          className="auth-microsoft"
          onClick={() => setStatus(
            "Microsoft sign-in isn't connected yet. No sign-in request was sent."
          )}
        >
          <span className="microsoft-mark" aria-hidden="true">
            <i /><i /><i /><i />
          </span>
          Continue with Microsoft
          <ArrowRight size={18} />
        </Button>

        <p className="auth-microsoft-note">
          Secure campus sign-in · No separate EventHub password
        </p>
        <p className="auth-status" role="status" aria-live="polite">{status}</p>
        <div className="auth-login-bottom">
          <p>New to EventHub? <a href="/signup">Create an account</a></p>
          <a href="/" className="auth-back-home">
            <ArrowLeft size={16} /> Back to home
          </a>
        </div>
      </div>
    </AuthLayout>
  );
}

const roleDetails: {
  role: SignupRole;
  title: string;
  description: string;
}[] = [
  {
    role: "student",
    title: "I'm a Student",
    description: "Explore events, join activities, track participation and collect certificates.",
  },
  {
    role: "club-head",
    title: "I'm a Club Head",
    description: "Organise events, manage activities and bring your campus community together.",
  },
];

function RoleSelection({
  role, onSelect, onContinue,
}: {
  role: SignupRole | null;
  onSelect: (r: SignupRole) => void;
  onContinue: () => void;
}) {
  return (
    <div className="auth-form-wrap auth-role-stage">
      <div className="auth-heading">
        <span className="auth-heading-icon auth-heading-icon-blue"><UsersRound /></span>
        <p className="auth-kicker">YOUR NEXT CHAPTER</p>
        <h2>Find your people.</h2>
        <p className="auth-subtitle">First, how will you use EventHub?</p>
      </div>

      <div className="auth-role-grid" role="group" aria-label="Choose account type">
        {roleDetails.map(item => {
          const selected = role === item.role;
          const Icon = item.role === "student" ? GraduationCap : UsersRound;
          return (
            <button
              type="button"
              key={item.role}
              aria-pressed={selected}
              className={`auth-role-card${selected ? " is-selected" : ""}`}
              onClick={() => onSelect(item.role)}
            >
              <span className={`auth-role-icon ${item.role}`}><Icon /></span>
              {selected && <span className="auth-role-check"><Check size={15} /></span>}
              <b className="auth-role-title">{item.title}</b>
              <span className="auth-role-description">{item.description}</span>
              <span className="auth-role-action">Choose this role <ArrowRight size={16} /></span>
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        className="auth-submit"
        disabled={!role}
        onClick={onContinue}
      >
        Continue <ArrowRight size={18} />
      </Button>

      <p className="auth-role-note">
        <ShieldCheck size={16} /> Club Head access requires campus verification.
      </p>
      <p className="auth-switch">Already have an account? <a href="/login">Sign in</a></p>
    </div>
  );
}

function SignupForm({
  role, onBack,
}: { role: SignupRole; onBack: () => void }) {
  const [values, setValues] = useState(emptyValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("");
  const clubHead = role === "club-head";

  const update = (key: keyof SignupValues) =>
    (e: ChangeEvent<HTMLInputElement>) => {
      setValues(v => ({ ...v, [key]: e.target.value }));
    };

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("");

    const result = signupSchema.safeParse(values);
    if (!result.success) {
      setErrors(issueMessages(result.error.issues));
      return;
    }

    if (clubHead && !values.clubName.trim()) {
      setErrors({ clubName: "Enter your club name." });
      return;
    }

    setErrors({});
    setStatus(
      clubHead
        ? "Club Head signup isn't connected yet. Campus verification will be required; no details were sent or saved."
        : "Signup isn't connected yet. No account was created, and no details were sent or saved."
    );
  };

  return (
    <div className="auth-form-wrap auth-signup-form-wrap">
      <button type="button" className="auth-back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Change account type
      </button>

      <div className="auth-heading auth-heading-compact">
        <span className={`auth-role-icon auth-selected-role ${role}`}>
          {clubHead ? <UsersRound /> : <GraduationCap />}
        </span>
        <p className="auth-kicker">{clubHead ? "LEAD YOUR COMMUNITY" : "MAKE CAMPUS YOURS"}</p>
        <h2>Create your account.</h2>
        <p className="auth-subtitle">
          {clubHead ? "Club Head · Verification required" : "Student account"}
        </p>
      </div>

      <form className="auth-form auth-signup-form" noValidate onSubmit={submit}>
        <FormField id="signup-name" label="Full name" value={values.fullName}
          onChange={update("fullName")} autoComplete="name" maxLength={100}
          error={errors.fullName} />
        <FormField id="signup-email" label="University email" value={values.email}
          onChange={update("email")} type="email" autoComplete="email"
          maxLength={255} error={errors.email} />
        <FormField id="signup-registration" label="Student registration number"
          value={values.registrationNumber} onChange={update("registrationNumber")}
          maxLength={50} error={errors.registrationNumber} />

        {clubHead && (
          <FormField id="signup-club" label="Club name" value={values.clubName}
            onChange={update("clubName")} maxLength={100} error={errors.clubName} />
        )}

        <PasswordField id="signup-password" label="Password"
          value={values.password} onChange={update("password")} error={errors.password} />
        <PasswordField id="signup-confirm-password" label="Confirm password"
          value={values.confirmPassword} onChange={update("confirmPassword")}
          error={errors.confirmPassword} />

        <Button type="submit" className="auth-submit">
          Create account <ArrowRight size={18} />
        </Button>
      </form>

      <p className="auth-status" role="status" aria-live="polite">{status}</p>
      <p className="auth-switch">Already have an account? <a href="/login">Sign in</a></p>
    </div>
  );
}

export function SignupScreen() {
  const [role, setRole] = useState<SignupRole | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <AuthLayout signup>
      {showForm && role ? (
        <SignupForm role={role} onBack={() => setShowForm(false)} />
      ) : (
        <RoleSelection
          role={role}
          onSelect={setRole}
          onContinue={() => { if (role) setShowForm(true); }}
        />
      )}
    </AuthLayout>
  );
}
