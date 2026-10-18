import { authClient } from "@/api/authClient";
import { buttonClass } from "./styles";

type Props = {
  redirectTo: string;
  disabled: boolean;
  onError: (message: string) => void;
};

export function GithubButton({ redirectTo, disabled, onError }: Props) {
  const handleLoginGithub = async () => {
    onError("");
    const { error } = await authClient.signIn.social({
      provider: "github",
      // Must be absolute: a relative URL resolves against the API host, not
      // this app. Safe to read window here — this only runs on click.
      callbackURL: `${window.location.origin}${redirectTo}`,
      errorCallbackURL: `${window.location.origin}/login`,
    });
    if (error) {
      onError(error.message ?? "Login failed.");
      return;
    }
  };

  return (
    <button
      type="button"
      onClick={handleLoginGithub}
      disabled={disabled}
      className={`${buttonClass} border border-neutral-300 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-900`}
    >
      Continue with GitHub
    </button>
  );
}
