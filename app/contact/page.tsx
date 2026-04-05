"use client";

import Link from "next/link";
import { useState } from "react";

type FormState = "idle" | "submitting" | "success" | "error";

export default function ContactPage() {
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setErrorMessage("");

    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot check on client side too
    if (data.get("website")) {
      setState("idle");
      return;
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          subject: data.get("subject"),
          message: data.get("message"),
          website: data.get("website"),
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setState("success");
        form.reset();
      } else {
        const json = await res.json().catch(() => ({}));
        setErrorMessage(json.error ?? "送信に失敗しました。もう一度お試しください。");
        setState("error");
      }
    } catch {
      setErrorMessage("ネットワークエラーが発生しました。");
      setState("error");
    }
  }

  return (
    <main className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="font-mono text-lg font-semibold tracking-tight text-white hover:text-sky-400 transition-colors"
          >
            NoviqLab
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            ← Back
          </Link>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-16 sm:py-24 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          お問い合わせ
        </h1>
        <p className="text-slate-400 text-sm mb-10">
          ご質問・ご相談など、お気軽にご連絡ください。
        </p>

        {state === "success" ? (
          <div className="rounded-lg border border-sky-800 bg-sky-950/40 px-6 py-8 text-center">
            <div className="text-sky-400 text-3xl mb-3">✓</div>
            <p className="text-white font-medium mb-1">送信が完了しました</p>
            <p className="text-slate-400 text-sm">
              お問い合わせありがとうございます。後ほどご連絡いたします。
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Honeypot */}
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Website</label>
              <input
                type="text"
                id="website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor="name"
                className="block text-sm text-slate-300 mb-1.5"
              >
                お名前 <span className="text-sky-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="山田 太郎"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm text-slate-300 mb-1.5"
              >
                メールアドレス <span className="text-sky-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                placeholder="example@email.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="subject"
                className="block text-sm text-slate-300 mb-1.5"
              >
                件名 <span className="text-sky-400">*</span>
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                required
                placeholder="ご相談内容の件名"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm text-slate-300 mb-1.5"
              >
                本文 <span className="text-sky-400">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={6}
                placeholder="お問い合わせ内容をご記入ください"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-colors resize-none"
              />
            </div>

            {state === "error" && (
              <p className="text-red-400 text-sm">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={state === "submitting"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 disabled:text-sky-600 text-white text-sm font-medium px-8 py-3 rounded-lg transition-colors"
            >
              {state === "submitting" ? "送信中..." : "送信する"}
            </button>
          </form>
        )}
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <p className="font-mono text-xs text-slate-600">
            © {new Date().getFullYear()} NoviqLab
          </p>
        </div>
      </footer>
    </main>
  );
}
