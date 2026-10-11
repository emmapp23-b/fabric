"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { BottomNav, Logo, Screen } from "@/components/ui";
import { RequireAuth } from "@/components/require-auth";
import { useAuth } from "@/lib/auth";
import { uploadToCloudinary } from "@/lib/cloudinary";

/**
 * Edit profile — update display name and profile photo. The photo uploads to
 * Cloudinary and is saved to the Firebase Auth profile (photoURL), so it shows
 * everywhere the avatar renders.
 */
export default function EditProfilePage() {
  const { user, setProfilePhoto } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(user?.displayName ?? "");
  const [photo, setPhoto] = useState(user?.photoURL ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const initials =
    (name || "FV")
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "FV";

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const { secure_url } = await uploadToCloudinary(file, { folder: "fabricverse/avatars", resourceType: "image" });
      setPhoto(secure_url);
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      await setProfilePhoto(photo);
      router.push("/profile");
    } catch (err) {
      setError((err as Error).message || "Could not save.");
      setSaving(false);
    }
  }

  const inp =
    "w-full rounded-xl border border-fv-line bg-fv-panel px-3.5 py-3 text-sm text-white placeholder:text-fv-muted focus:border-fv-pink focus:outline-none";

  return (
    <RequireAuth>
      <Screen>
        <header className="flex items-center justify-between px-5 pt-2 pb-3">
          <Logo size="md" />
        </header>

        <form onSubmit={save} className="px-5 pb-6">
          <h1 className="text-2xl font-extrabold">Edit Profile</h1>
          <p className="mt-1 text-sm text-fv-muted">Update your name and photo.</p>

          {/* Avatar */}
          <div className="mt-6 flex flex-col items-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative h-28 w-28"
              aria-label="Change photo"
            >
              <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-fv-pink to-fv-purple p-[3px]">
                <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-fv-panel">
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-fv-pink" />
                  ) : photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-extrabold text-white/80">{initials}</span>
                  )}
                </span>
              </span>
              <span className="absolute right-0 bottom-0 flex h-9 w-9 items-center justify-center rounded-full bg-fv-pink ring-2 ring-fv-bg">
                <Camera className="h-4 w-4 text-white" />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            <button type="button" onClick={() => fileRef.current?.click()} className="mt-3 text-sm font-semibold text-fv-pink">
              {uploading ? "Uploading…" : "Change photo"}
            </button>
          </div>

          <div className="mt-6 flex flex-col gap-3.5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-fv-muted">Display name</label>
              <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-fv-muted">Email</label>
              <input className={`${inp} opacity-60`} value={user?.email ?? ""} disabled />
            </div>
          </div>

          {error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="mt-5 w-full rounded-full bg-fv-pink px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <BottomNav active="profile" />
      </Screen>
    </RequireAuth>
  );
}
