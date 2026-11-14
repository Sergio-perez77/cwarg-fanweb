"use client";

import { Turnstile } from "@marsidev/react-turnstile";

type Props = {
  onVerify: (token: string) => void;
};

export default function TurnstileCaptcha({ onVerify }: Props) {
  return (
    <Turnstile
      siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
      onSuccess={onVerify}
      onExpire={() => onVerify("")}
      onError={() => onVerify("")}
      options={{
        theme: "dark",
      }}
    />
  );
}