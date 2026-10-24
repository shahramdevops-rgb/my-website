"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { setFlash } from "@/lib/admin/flash";
import { type LoginError, loginError } from "@/lib/admin/login-error";
import { browserApi } from "@/lib/api/browser";

type LoginState = { error: LoginError | null; email: string };

/** The API's own limits (LoginRequest in the API): checked there, repeated here only to stop typing early. */
const maxLength = 256;

/**
 * The sign-in form. It posts from the browser straight to `/api/auth/login` (same origin), so the API's
 * `Set-Cookie` lands in the browser — a Server Action would receive the cookie on the Next.js server instead.
 * useActionState gives the pending state and keeps the last error; React resets the fields after each attempt,
 * so the email is given back as defaultValue and the password is cleared, as it should be.
 */
export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("admin.login");
  const router = useRouter();

  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    async (_previous, formData) => {
      const email = String(formData.get("email") ?? "").trim();
      const password = String(formData.get("password") ?? "");

      try {
        const { response, error } = await browserApi.POST("/api/auth/login", {
          body: { email, password },
        });
        if (response.ok) {
          setFlash("signedIn");
          // `next` is already checked (safeNextPath): only a path inside the panel.
          router.replace(next);
          return { error: null, email };
        }

        const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
        return {
          error: loginError(response.status, code, response.headers.get("retry-after")),
          email,
        };
      } catch {
        return { error: { kind: "unavailable" }, email };
      }
    },
    { error: null, email: "" },
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <Alert variant="danger">
          {state.error.kind === "rateLimited"
            ? t("errors.rateLimited", { minutes: state.error.minutes })
            : t(`errors.${state.error.kind}`)}
        </Alert>
      )}
      <FormField
        label={t("email")}
        name="email"
        type="email"
        autoComplete="username"
        required
        maxLength={maxLength}
        defaultValue={state.email}
        dir="ltr"
      />
      <FormField
        label={t("password")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={maxLength}
        dir="ltr"
      />
      <Button type="submit" disabled={pending} className="mt-1 self-start">
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
