"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

type Me = { name: string; email: string };

export default function ProfilePage() {
  const router = useRouter();
  const { status } = useSession();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => {
        const me: Me | null = d.user;
        if (me) {
          setName(me.name);
          setEmail(me.email);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [status]);

  if (status === "loading" || (status === "authenticated" && !loaded)) {
    return <p className="pt-10 text-sm text-slate-400">Loading…</p>;
  }
  if (status !== "authenticated") return null;

  return (
    <div className="mx-auto max-w-md space-y-10 pt-10">
      <div>
        <h1 className="text-2xl font-extrabold">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          Signed in as <span className="font-semibold text-slate-200">{email}</span>
        </p>
      </div>

      <ProfileForm
        name={name}
        onSaved={(newName) => {
          setName(newName);
          // refresh the navbar (it re-fetches /api/me on this event)
          window.dispatchEvent(new Event("balance-updated"));
        }}
      />

      <PasswordForm />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-surface-border bg-surface-raised p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const inputClass =
  "w-full rounded-lg border border-surface-border bg-surface px-3 py-2.5 outline-none focus:border-accent";
const buttonClass =
  "w-full rounded-lg bg-accent py-2.5 font-bold text-white hover:bg-accent-hover disabled:opacity-50";

function ProfileForm({
  name: initialName,
  onSaved,
}: {
  name: string;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setDone(false);
    const res = await fetch("/api/account/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not save profile");
      return;
    }
    setDone(true);
    onSaved(data.user?.name ?? name);
  }

  return (
    <Section title="Display name">
      <form onSubmit={submit} className="space-y-4">
        <input
          required
          minLength={2}
          maxLength={50}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDone(false);
          }}
          className={inputClass}
          placeholder="Your display name"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {done && <p className="text-sm text-emerald-600">Profile updated.</p>}
        <button disabled={busy || name.trim().length < 2} className={buttonClass}>
          {busy ? "Saving…" : "Save name"}
        </button>
      </form>
    </Section>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    if (newPassword !== confirm) {
      setError("New passwords do not match");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Could not change password");
      return;
    }
    setDone(true);
    setCurrent("");
    setNew("");
    setConfirm("");
  }

  return (
    <Section title="Change password">
      <form onSubmit={submit} className="space-y-4">
        <input
          type="password"
          required
          autoComplete="current-password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrent(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="New password (8+ characters)"
          value={newPassword}
          onChange={(e) => setNew(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {done && <p className="text-sm text-emerald-600">Password changed.</p>}
        <button disabled={busy} className={buttonClass}>
          {busy ? "Changing…" : "Change password"}
        </button>
      </form>
    </Section>
  );
}
